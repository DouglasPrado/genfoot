import {
  CHAIN_GENESIS_HASH,
  verifyEventChain,
  type ChainableEvent,
  type NewDomainEvent,
} from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaDomainEventLogRepository, sha256 } from "../src/prisma-domain-event-log-repository.js";
import { PrismaIdentityUnitOfWork } from "../src/prisma-identity-unit-of-work.js";
import { IDENTITY_TABLES, WORLD_ID, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

function event(over: Partial<NewDomainEvent> = {}): NewDomainEvent {
  return {
    eventId: "019b76da-a800-7787-9462-49c009be0001",
    gameWorldId: WORLD_ID,
    aggregateType: "WorldParticipant",
    aggregateId: "019b76da-a800-7787-9462-49c009be2222",
    aggregateVersion: 1n,
    eventType: "WorldParticipationActivated",
    eventVersion: 1,
    payload: { accountId: "019b76da-a800-7787-9462-49c009be3333" },
    actorType: "USER",
    actorId: null,
    correlationId: null,
    causationId: null,
    occurredOn: "2026-01-02",
    ...over,
  };
}

/** Ids distintos por índice: `@@unique(gameWorldId, aggregateType, aggregateId, aggregateVersion)`. */
function events(count: number): readonly NewDomainEvent[] {
  return Array.from({ length: count }, (_, index) =>
    event({
      eventId: `019b76da-a800-7787-9462-49c009be${String(index).padStart(4, "0")}`,
      aggregateVersion: BigInt(index + 1),
    }),
  );
}

describe.skipIf(!hasDatabase)(
  `PrismaDomainEventLogRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let unitOfWork: PrismaIdentityUnitOfWork;
    /** Só leitura: o append exige transação, e quem a abre é o UnitOfWork. */
    let reader: PrismaDomainEventLogRepository;

    /**
     * O append tem de rodar DENTRO de uma transação: ele incrementa o contador
     * do mundo, lê o último hash e insere — e os três precisam do mesmo lock.
     * O tipo já impede o adapter de abrir transação sozinho, então o teste
     * exercita o caminho real, que é o UnitOfWork.
     */
    const append = (events: readonly NewDomainEvent[]): Promise<readonly ChainableEvent[]> =>
      unitOfWork.run((repositories) => repositories.events.append(events));

    beforeAll(() => {
      client = connect();
      unitOfWork = new PrismaIdentityUnitOfWork(client);
      reader = new PrismaDomainEventLogRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, [...IDENTITY_TABLES, "DomainEventLog"]);
      await seedWorld(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("grava e devolve o evento com sequência e hash preenchidos", async () => {
      const [appended] = await append([event()]);
      expect(appended?.sequence).toBe(1n);
      expect(appended?.prevEventHash).toBe(CHAIN_GENESIS_HASH);
      expect(appended?.eventHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("round-trip: o que volta do banco é o que foi gravado", async () => {
      const [appended] = await append([event()]);
      const [loaded] = await reader.readWorldChain(WORLD_ID);
      expect(loaded).toEqual(appended);
    });

    // CA-REG-01: monotônico, sem gap nem duplicata.
    it("a sequência do mundo é monotônica e sem buraco, entre lotes", async () => {
      await append(events(2));
      await append([event({ eventId: "019b76da-a800-7787-9462-49c009be0009", aggregateVersion: 9n })]);
      const chain = await reader.readWorldChain(WORLD_ID);
      expect(chain.map((link) => link.sequence)).toEqual([1n, 2n, 3n]);
    });

    it("cada elo aponta para o hash do anterior", async () => {
      await append(events(3));
      const chain = await reader.readWorldChain(WORLD_ID);
      expect(chain[0]!.prevEventHash).toBe(CHAIN_GENESIS_HASH);
      expect(chain[1]!.prevEventHash).toBe(chain[0]!.eventHash);
      expect(chain[2]!.prevEventHash).toBe(chain[1]!.eventHash);
    });

    it("a cadeia gravada passa no verificador que R-133 exige", async () => {
      await append(events(3));
      const chain = await reader.readWorldChain(WORLD_ID);
      expect(verifyEventChain(chain, sha256).ok).toBe(true);
    });

    /**
     * O teste que dá sentido a tudo. Adultera a linha DIRETO no banco — por
     * fora do repositório, como faria quem tem acesso ao Postgres — e o
     * verificador tem de acusar.
     *
     * A implementação anterior (`world-admin.ts:1048`) hasheava
     * `sequence|actor|action|target|prevHash`: trocar o CONTEÚDO não quebrava
     * nada, e este teste passaria mesmo com a cadeia inútil.
     */
    it("acusa payload adulterado direto no banco", async () => {
      const [appended] = await append([event()]);
      await client.$executeRawUnsafe(
        `UPDATE "DomainEventLog" SET "payloadJson" = '{"accountId":"invasor"}'::jsonb WHERE id = $1::uuid`,
        appended!.eventId,
      );
      const result = verifyEventChain(await reader.readWorldChain(WORLD_ID), sha256);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("CADEIA_ADULTERADA");
    });

    it("acusa tipo de evento adulterado — não só o payload", async () => {
      const [appended] = await append([event()]);
      await client.$executeRawUnsafe(
        `UPDATE "DomainEventLog" SET "eventType" = 'ClubControlEnded' WHERE id = $1::uuid`,
        appended!.eventId,
      );
      expect(verifyEventChain(await reader.readWorldChain(WORLD_ID), sha256).ok).toBe(
        false,
      );
    });

    it("acusa elo removido do meio", async () => {
      const appended = await append(events(3));
      await client.$executeRawUnsafe(
        `DELETE FROM "DomainEventLog" WHERE id = $1::uuid`,
        appended[1]!.eventId,
      );
      expect(verifyEventChain(await reader.readWorldChain(WORLD_ID), sha256).ok).toBe(
        false,
      );
    });

    /**
     * A invariante que sustenta o replay por agregado:
     * `@@unique([gameWorldId, aggregateType, aggregateId, aggregateVersion])`.
     * Dois eventos na mesma versão do mesmo agregado é bifurcação de história.
     */
    it("o banco recusa dois eventos na mesma versão do mesmo agregado", async () => {
      await append([event()]);
      await expect(
        append([event({ eventId: "019b76da-a800-7787-9462-49c009be0099" })]),
      ).rejects.toThrow();
    });

    // Se o lote falha, nada entra — senão a sequência ficaria com buraco.
    it("lote é tudo ou nada: a sequência não avança quando o append falha", async () => {
      await append([event()]);
      await expect(
        append([
          event({ eventId: "019b76da-a800-7787-9462-49c009be0088", aggregateVersion: 2n }),
          event({ eventId: "019b76da-a800-7787-9462-49c009be0077" }), // versão 1 repetida
        ]),
      ).rejects.toThrow();

      const chain = await reader.readWorldChain(WORLD_ID);
      expect(chain).toHaveLength(1);
      const world = await client.gameWorld.findUnique({ where: { id: WORLD_ID } });
      expect(world?.worldSequence).toBe(1n);
    });

    it("recusa lote de mundos diferentes — a sequência é POR mundo", async () => {
      await expect(
        append([
          event(),
          event({
            eventId: "019b76da-a800-7787-9462-49c009be0066",
            gameWorldId: "019b76da-a800-7787-9462-49c009be5555",
          }),
        ]),
      ).rejects.toThrow();
    });

    it("append vazio não avança a sequência", async () => {
      expect(await append([])).toEqual([]);
      const world = await client.gameWorld.findUnique({ where: { id: WORLD_ID } });
      expect(world?.worldSequence).toBe(0n);
    });

    it("readAggregateChain devolve só os eventos daquele agregado, em ordem", async () => {
      await append([
        event({ aggregateVersion: 1n }),
        event({
          eventId: "019b76da-a800-7787-9462-49c009be0055",
          aggregateType: "ClubControl",
          aggregateId: "019b76da-a800-7787-9462-49c009be4444",
          aggregateVersion: 1n,
        }),
        event({ eventId: "019b76da-a800-7787-9462-49c009be0044", aggregateVersion: 2n }),
      ]);

      const chain = await reader.readAggregateChain(
        WORLD_ID,
        "WorldParticipant",
        "019b76da-a800-7787-9462-49c009be2222",
      );
      expect(chain.map((link) => link.aggregateVersion)).toEqual([1n, 2n]);
    });

    /**
     * O ponto de serialização por mundo. Dois appends concorrentes NÃO podem
     * produzir a mesma sequência — é o lock da linha do GameWorld que garante,
     * e é o custo que R-175 aceita para ter ordem total.
     */
    it("appends concorrentes não duplicam sequência", async () => {
      await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          append([
            event({
              eventId: `019b76da-a800-7787-9462-49c009be1${String(index).padStart(3, "0")}`,
              aggregateId: `019b76da-a800-7787-9462-49c009be9${String(index).padStart(3, "0")}`,
            }),
          ]),
        ),
      );
      const chain = await reader.readWorldChain(WORLD_ID);
      expect(chain.map((link) => link.sequence)).toEqual([1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n]);
      expect(verifyEventChain(chain, sha256).ok).toBe(true);
    });
  },
);
