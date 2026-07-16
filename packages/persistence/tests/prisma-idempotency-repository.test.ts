import { commandFingerprint, type IdempotencyOutcome } from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaIdempotencyRepository } from "../src/prisma-idempotency-repository.js";
import { WORLD_ID, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

const ACTOR = "019b76da-a800-7787-9462-49c009be2222";

function claim(over: Record<string, unknown> = {}) {
  return {
    actorId: ACTOR,
    idempotencyKey: "cadastro-1",
    gameWorldId: WORLD_ID,
    commandType: "identity:join-world",
    requestFingerprint: commandFingerprint({ accountId: ACTOR, worldId: WORLD_ID }),
    ...over,
  };
}

/** Estreita a união: o teste só chega aqui quando a chave NÃO foi reservada. */
function taken(outcome: IdempotencyOutcome) {
  if (outcome.claimed) throw new Error("Esperava a chave já reservada.");
  return outcome;
}

describe.skipIf(!hasDatabase)(
  `PrismaIdempotencyRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let repository: PrismaIdempotencyRepository;

    beforeAll(() => {
      client = connect();
      repository = new PrismaIdempotencyRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, ["GameWorld", "IdempotencyKey"]);
      await seedWorld(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("a primeira tentativa reserva a chave", async () => {
      const outcome = await repository.tryClaim(claim());
      expect(outcome.claimed).toBe(true);
    });

    /**
     * O ponto: a segunda tentativa NÃO reserva — devolve o que já existe. É o
     * que impede o mesmo comando de rodar duas vezes quando o cliente reenvia
     * por timeout. Antes, isto era varredura O(n) num array dentro do blob
     * (`world-eventing.ts:133`).
     */
    it("a segunda tentativa não reserva e devolve o registro existente", async () => {
      await repository.tryClaim(claim());
      const outcome = await repository.tryClaim(claim());
      expect(outcome.claimed).toBe(false);
      expect(taken(outcome).existing.commandType).toBe("identity:join-world");
      expect(taken(outcome).existing.status).toBe("PENDING");
    });

    it("chaves diferentes do mesmo ator convivem", async () => {
      await repository.tryClaim(claim());
      expect((await repository.tryClaim(claim({ idempotencyKey: "cadastro-2" }))).claimed).toBe(
        true,
      );
    });

    it("a mesma chave de atores diferentes convive — a chave é por ator", async () => {
      await repository.tryClaim(claim());
      expect(
        (await repository.tryClaim(claim({ actorId: "019b76da-a800-7787-9462-49c009be7777" })))
          .claimed,
      ).toBe(true);
    });

    /**
     * O furo do schema. `@@unique([actorId, idempotencyKey])` com `actorId`
     * NULLABLE não protege comando de sistema: no Postgres `NULL != NULL`, e as
     * duas linhas passariam. Consertado com `NULLS NOT DISTINCT` (PG 15+), em
     * SQL cru — o Prisma não expressa.
     */
    it("comando de sistema (sem ator) também é protegido", async () => {
      const sistema = claim({ actorId: null, commandType: "scheduler:advance-day" });
      expect((await repository.tryClaim(sistema)).claimed).toBe(true);
      expect((await repository.tryClaim(sistema)).claimed).toBe(false);
    });

    describe("desfecho", () => {
      it("completar guarda o hash do resultado", async () => {
        await repository.tryClaim(claim());
        await repository.complete(ACTOR, "cadastro-1", "abc123");
        const record = await repository.find(ACTOR, "cadastro-1");
        expect(record?.status).toBe("COMPLETED");
        expect(record?.resultHash).toBe("abc123");
      });

      // Reenviar um comando que já deu certo devolve o mesmo resultado, não
      // reexecuta. Sem o hash, não haveria o que devolver.
      it("depois de completo, a tentativa devolve o desfecho", async () => {
        await repository.tryClaim(claim());
        await repository.complete(ACTOR, "cadastro-1", "abc123");
        const outcome = await repository.tryClaim(claim());
        expect(outcome.claimed).toBe(false);
        expect(taken(outcome).existing.status).toBe("COMPLETED");
        expect(taken(outcome).existing.resultHash).toBe("abc123");
      });

      it("falhar guarda o errorCode", async () => {
        await repository.tryClaim(claim());
        await repository.fail(ACTOR, "cadastro-1", "CLUB_SLOT_UNAVAILABLE");
        const record = await repository.find(ACTOR, "cadastro-1");
        expect(record?.status).toBe("FAILED");
        expect(record?.errorCode).toBe("CLUB_SLOT_UNAVAILABLE");
      });

      /**
       * Falha NÃO trava a chave: o jogador tem de poder tentar de novo depois
       * de "clube já tomado". Travar transformaria erro recuperável em bloqueio
       * permanente.
       */
      it("falha libera a chave para nova tentativa", async () => {
        await repository.tryClaim(claim());
        await repository.fail(ACTOR, "cadastro-1", "CLUB_SLOT_UNAVAILABLE");
        expect((await repository.tryClaim(claim())).claimed).toBe(true);
        expect((await repository.find(ACTOR, "cadastro-1"))?.status).toBe("PENDING");
      });
    });

    it("devolve null para chave que não existe", async () => {
      expect(await repository.find(ACTOR, "nao-existe")).toBeNull();
    });

    /**
     * `IDEMPOTENCY_KEY_REUSED` — errorCode COMUM de toda mutação no catálogo
     * canônico (`10-catalogo-de-commands.md:61`): "mesma `idempotencyKey` com
     * payload divergente". Não existia em lugar nenhum do código, e a tabela não
     * tinha como detectá-lo: sem o fingerprint do PEDIDO, a chave só sabia que
     * já fora usada, não com o quê.
     *
     * Isto é o oposto do replay: reenviar o MESMO comando devolve o mesmo
     * resultado; reenviar OUTRO comando com a mesma chave é erro do cliente, e
     * atendê-lo silenciosamente devolveria o resultado de um comando que o
     * cliente não pediu.
     */
    describe("payload divergente na mesma chave", () => {
      it("mesma chave + mesmo pedido = replay, não reúso", async () => {
        await repository.tryClaim(claim());
        const outcome = await repository.tryClaim(claim());
        expect(outcome.claimed).toBe(false);
        expect(taken(outcome).reused).toBe(false);
      });

      it("mesma chave + pedido divergente = IDEMPOTENCY_KEY_REUSED", async () => {
        await repository.tryClaim(claim());
        const outcome = await repository.tryClaim(
          claim({ requestFingerprint: commandFingerprint({ accountId: "outro" }) }),
        );
        expect(outcome.claimed).toBe(false);
        expect(taken(outcome).reused).toBe(true);
      });

      /**
       * Reúso vence FAILED. Sem esta ordem, um comando divergente reabriria a
       * chave de um comando que falhou e rodaria no lugar dele.
       */
      it("pedido divergente não reabre chave que falhou", async () => {
        await repository.tryClaim(claim());
        await repository.fail(ACTOR, "cadastro-1", "CLUB_SLOT_UNAVAILABLE");
        const outcome = await repository.tryClaim(
          claim({ requestFingerprint: commandFingerprint({ accountId: "outro" }) }),
        );
        expect(outcome.claimed).toBe(false);
        expect(taken(outcome).reused).toBe(true);
      });

      /**
       * A razão de o fingerprint ser serialização CANÔNICA e não
       * `JSON.stringify` — que é o que `world-club-portfolio.ts:78` usava. O
       * `stringify` preserva ordem de inserção: o mesmo comando montado com as
       * chaves em outra ordem produziria outro fingerprint, e um replay legítimo
       * seria recusado como reúso.
       */
      it("a ordem das chaves do payload não muda o fingerprint", async () => {
        await repository.tryClaim(
          claim({ requestFingerprint: commandFingerprint({ a: 1, b: 2 }) }),
        );
        const outcome = await repository.tryClaim(
          claim({ requestFingerprint: commandFingerprint({ b: 2, a: 1 }) }),
        );
        expect(taken(outcome).reused).toBe(false);
      });
    });

    /**
     * O teste que faltava, e que esconderia um defeito real.
     *
     * Solto, cada `tryClaim` é sua própria transação implícita, e capturar a
     * violação de unicidade funciona. DENTRO de uma transação explícita — que é
     * onde ele vai rodar, porque a Decisão 19.10 exige agregado + evento no
     * mesmo commit — qualquer erro ABORTA a transação inteira no Postgres:
     * `current transaction is aborted, commands ignored until end of
     * transaction block`. Capturar não adianta; os comandos seguintes falham.
     *
     * Por isso o `tryClaim` usa ON CONFLICT DO NOTHING (contando linhas) em vez
     * de inserir-e-capturar.
     */
    it("a colisão não derruba a transação em volta", async () => {
      await client.$transaction(async (tx) => {
        const dentro = new PrismaIdempotencyRepository(tx);
        expect((await dentro.tryClaim(claim())).claimed).toBe(true);
        expect((await dentro.tryClaim(claim())).claimed).toBe(false);
        // Se a transação tivesse abortado, ISTO explodiria.
        expect(await tx.idempotencyKey.count()).toBe(1);
      });
      expect(await repository.find(ACTOR, "cadastro-1")).not.toBeNull();
    });

    // Duas requisições simultâneas com a mesma chave: exatamente uma reserva.
    it("tentativas concorrentes: só uma reserva", async () => {
      const outcomes = await Promise.all(
        Array.from({ length: 6 }, () => repository.tryClaim(claim())),
      );
      expect(outcomes.filter((outcome) => outcome.claimed)).toHaveLength(1);
    });
  },
);
