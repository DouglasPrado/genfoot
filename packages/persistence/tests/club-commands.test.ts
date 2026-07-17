import { ApplyClubIdentity, type VisualIdentitySnapshot } from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaClubUnitOfWork } from "../src/prisma-club-unit-of-work.js";
import { CLUB_ID, CLUB_TABLES, WORLD_ID, WORLD_SEED, seedClub, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

const OTHER_CLUB = "019b76da-a800-7787-9462-49c009be4444";

const VISUAL: VisualIdentitySnapshot = {
  primaryColor: "#E11D2E",
  secondaryColor: "#0A0B0D",
  tertiaryColor: null,
  homeKitTemplateId: "kit-stripes",
  awayKitTemplateId: "kit-solid",
  crestTemplateId: "crest-shield",
};

describe.skipIf(!hasDatabase)(
  `ApplyClubIdentity sobre Postgres ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let unitOfWork: PrismaClubUnitOfWork;

    const base = {
      gameWorldId: WORLD_ID,
      clubId: CLUB_ID,
      expectedVersion: 1,
      worldSeed: WORLD_SEED,
      occurredOn: "2026-01-02",
      actorId: "019f6d00-0000-7000-8000-000000000001",
    };

    beforeAll(() => {
      client = connect();
      unitOfWork = new PrismaClubUnitOfWork(client);
    });

    beforeEach(async () => {
      await truncate(client, [...CLUB_TABLES, "DomainEventLog", "IdempotencyKey"]);
      await seedWorld(client);
      await seedClub(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("renomeia o clube e o período vigente passa a ser o novo", async () => {
      const result = await new ApplyClubIdentity(unitOfWork).execute({
        ...base,
        name: "Grinta United",
        shortCode: "GRU",
      });
      expect(result.ok).toBe(true);

      const vigente = await client.clubIdentityPeriod.findFirst({
        where: { clubId: CLUB_ID, effectiveThrough: null },
      });
      expect(vigente?.name).toBe("Grinta United");
    });

    /** O histórico NUNCA é reescrito: o período anterior fecha na véspera. */
    it("o período anterior fecha em vez de sumir", async () => {
      await new ApplyClubIdentity(unitOfWork).execute({
        ...base,
        occurredOn: "2026-06-01",
        name: "Grinta United",
        shortCode: "GRU",
      });
      const periodos = await client.clubIdentityPeriod.findMany({
        where: { clubId: CLUB_ID },
        orderBy: { effectiveFrom: "asc" },
      });
      expect(periodos).toHaveLength(2);
      expect(periodos[0]?.effectiveThrough?.toISOString().slice(0, 10)).toBe("2026-05-31");
      expect(periodos[1]?.effectiveThrough).toBeNull();
    });

    it("recusa quando a versão mudou por baixo", async () => {
      const result = await new ApplyClubIdentity(unitOfWork).execute({
        ...base,
        expectedVersion: 99,
        name: "Grinta United",
        shortCode: "GRU",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("AGGREGATE_VERSION_CONFLICT");
    });

    /**
     * Quem arbitra o nome é o índice único PARCIAL, não uma varredura em
     * memória — que é o que `world-club-portfolio.ts:157` fazia. Entre um SELECT
     * e um INSERT cabe outro rebranding; o índice não tem essa janela.
     */
    it("recusa nome já usado por outro clube VIGENTE", async () => {
      await seedClub(client, OTHER_CLUB);
      const outro = await client.clubIdentityPeriod.findFirst({
        where: { clubId: OTHER_CLUB, effectiveThrough: null },
      });

      const result = await new ApplyClubIdentity(unitOfWork).execute({
        ...base,
        name: outro!.name,
        shortCode: "XXX",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("CLUB_NAME_ALREADY_TAKEN");
    });

    /** A recusa desfaz TUDO: nada de clube meio gravado. */
    it("nome recusado não deixa escrita parcial", async () => {
      await seedClub(client, OTHER_CLUB);
      const outro = await client.clubIdentityPeriod.findFirst({
        where: { clubId: OTHER_CLUB, effectiveThrough: null },
      });
      await new ApplyClubIdentity(unitOfWork).execute({
        ...base,
        name: outro!.name,
        shortCode: "XXX",
      });

      const clube = await client.club.findUnique({
        where: { gameWorldId_id: { gameWorldId: WORLD_ID, id: CLUB_ID } },
      });
      expect(clube?.version).toBe(1);
      expect(
        await client.stadium.count({ where: { clubId: CLUB_ID } }),
      ).toBe(1);
      expect(
        await client.clubIdentityPeriod.count({ where: { clubId: CLUB_ID } }),
      ).toBe(1);
    });

    describe("eventos (Decisão 19.10: mesmo commit do agregado)", () => {
      it("mudar o nome abre período E aplica identidade", async () => {
        await new ApplyClubIdentity(unitOfWork).execute({
          ...base,
          name: "Grinta United",
          shortCode: "GRU",
          visualIdentity: VISUAL,
        });
        const eventos = await client.domainEventLog.findMany({
          where: { gameWorldId: WORLD_ID },
          orderBy: { sequence: "asc" },
        });
        // UM evento por comando: o log aceita um por versão de agregado, e o
        // período de identidade não é agregado (não tem `version`, ninguém o
        // disputa). `periodOpened` carrega a distinção que o catálogo queria.
        expect(eventos.map((e) => e.eventType)).toEqual(["ClubIdentityApplied"]);
        expect((eventos[0]?.payloadJson as Record<string, unknown>).periodOpened).toBe(true);
      });

      /**
       * Trocar SÓ o escudo não abre período: é cosmético, "sem efeito
       * esportivo" (`10-catalogo-de-commands.md:387`). Emitir
       * `ClubIdentityPeriodOpened` aqui diria à torcida que o clube mudou de
       * nome.
       */
      it("trocar só o visual NÃO abre período", async () => {
        const atual = await client.clubIdentityPeriod.findFirst({
          where: { clubId: CLUB_ID, effectiveThrough: null },
        });
        await new ApplyClubIdentity(unitOfWork).execute({
          ...base,
          name: atual!.name,
          shortCode: atual!.shortCode,
          visualIdentity: VISUAL,
        });
        const eventos = await client.domainEventLog.findMany({
          where: { gameWorldId: WORLD_ID },
        });
        expect(eventos).toHaveLength(1);
        // Cosmético: a identidade OFICIAL não mudou, então não abre período — é
        // o "sem efeito esportivo" do catálogo (:387). Dizer o contrário
        // avisaria a torcida de uma troca de nome que não houve.
        expect((eventos[0]?.payloadJson as Record<string, unknown>).periodOpened).toBe(false);
      });

      it("o evento carrega DE QUE nome o clube veio", async () => {
        const atual = await client.clubIdentityPeriod.findFirst({
          where: { clubId: CLUB_ID, effectiveThrough: null },
        });
        await new ApplyClubIdentity(unitOfWork).execute({
          ...base,
          name: "Grinta United",
          shortCode: "GRU",
        });
        const evento = await client.domainEventLog.findFirst({
          where: { eventType: "ClubIdentityApplied" },
        });
        const payload = evento?.payloadJson as Record<string, unknown>;
        expect(payload.previousName).toBe(atual!.name);
        expect(payload.name).toBe("Grinta United");
      });

      it("a cadeia de hash liga os eventos", async () => {
        const um = await new ApplyClubIdentity(unitOfWork).execute({
          ...base,
          name: "Grinta United",
          shortCode: "GRU",
        });
        if (!um.ok) throw um.error;
        await new ApplyClubIdentity(unitOfWork).execute({
          ...base,
          expectedVersion: um.value.version,
          name: "Grinta City",
          shortCode: "GRC",
        });
        const eventos = await client.domainEventLog.findMany({
          where: { gameWorldId: WORLD_ID },
          orderBy: { sequence: "asc" },
        });
        expect(eventos[1]?.prevEventHash).toBe(eventos[0]?.eventHash);
      });

      /**
       * O caso que o TESTE não pegou e o HTTP pegou — por isso ele existe.
       *
       * Rebranding no mesmo dia lógico SUBSTITUI o período (5f1c654): mesmo
       * `identityId`, mesma "versão 1" do período. O eventId derivava só disso e
       * colidia — `Unique constraint failed on (id)` no segundo rebranding do
       * dia. Dois fatos diferentes com o mesmo id.
       *
       * A versão do CLUBE sempre anda, mesmo quando a do período não anda: é ela
       * que separa "o mesmo comando reenviado" de "outro comando".
       */
      it("dois rebrandings no MESMO dia não colidem no eventId", async () => {
        const primeiro = await new ApplyClubIdentity(unitOfWork).execute({
          ...base,
          name: "Primeiro Nome",
          shortCode: "PRI",
        });
        expect(primeiro.ok).toBe(true);
        if (!primeiro.ok) return;

        const segundo = await new ApplyClubIdentity(unitOfWork).execute({
          ...base,
          expectedVersion: primeiro.value.version,
          name: "Segundo Nome",
          shortCode: "SEG",
        });
        expect(segundo.ok).toBe(true);

        const eventos = await client.domainEventLog.findMany({
          where: { eventType: "ClubIdentityApplied" },
          orderBy: { sequence: "asc" },
        });
        expect(eventos).toHaveLength(2);
        // Mesmo período (o dia substitui), versões do CLUBE diferentes — é ela
        // que separa "reenvio" de "outro comando".
        expect(
          (eventos[0]?.payloadJson as Record<string, unknown>).identityPeriodId,
        ).toBe((eventos[1]?.payloadJson as Record<string, unknown>).identityPeriodId);
        expect(eventos[0]?.aggregateVersion).not.toBe(eventos[1]?.aggregateVersion);
      });
    });

    it("clube inexistente é recusado, não criado", async () => {
      const result = await new ApplyClubIdentity(unitOfWork).execute({
        ...base,
        clubId: "019b76da-a800-7787-9462-49c009be9999",
        name: "Fantasma",
        shortCode: "FAN",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("CLUB_NOT_FOUND");
    });
  },
);
