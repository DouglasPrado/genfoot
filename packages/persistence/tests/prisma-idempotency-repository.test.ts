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
    ...over,
  };
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
      expect(outcome.existing?.commandType).toBe("identity:join-world");
      expect(outcome.existing?.status).toBe("PENDING");
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
        expect(outcome.existing?.status).toBe("COMPLETED");
        expect(outcome.existing?.resultHash).toBe("abc123");
      });

      it("falhar guarda o errorCode", async () => {
        await repository.tryClaim(claim());
        await repository.fail(ACTOR, "cadastro-1", "CLUB_TAKEN");
        const record = await repository.find(ACTOR, "cadastro-1");
        expect(record?.status).toBe("FAILED");
        expect(record?.errorCode).toBe("CLUB_TAKEN");
      });

      /**
       * Falha NÃO trava a chave: o jogador tem de poder tentar de novo depois
       * de "clube já tomado". Travar transformaria erro recuperável em bloqueio
       * permanente.
       */
      it("falha libera a chave para nova tentativa", async () => {
        await repository.tryClaim(claim());
        await repository.fail(ACTOR, "cadastro-1", "CLUB_TAKEN");
        expect((await repository.tryClaim(claim())).claimed).toBe(true);
        expect((await repository.find(ACTOR, "cadastro-1"))?.status).toBe("PENDING");
      });
    });

    it("devolve null para chave que não existe", async () => {
      expect(await repository.find(ACTOR, "nao-existe")).toBeNull();
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
