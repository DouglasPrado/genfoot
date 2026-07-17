import {
  GenerateWorldGenesis,
  INITIAL_ENDOWMENT_MINOR,
  SQUAD_SIZE,
  derivePlayerOverall,
} from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaGenesisUnitOfWork } from "../src/prisma-genesis-unit-of-work.js";
import { PrismaWorldRepository } from "../src/prisma-world-repository.js";
import { WORLD_ID, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

/** A gênese toca todas estas tabelas — TRUNCATE em cascata resolve as FKs. */
const GENESIS_TABLES = [
  "GameWorld",
  "Club",
  "ClubIdentityPeriod",
  "Stadium",
  "ClubDepartment",
  "TicketPricePolicy",
  "CommercialAgreement",
  "BoardDecision",
  "Person",
  "Player",
  "PlayerAttributes",
  "Squad",
  "SquadMembership",
  "FinancialAccount",
  "JournalEntry",
  "JournalLine",
  "Competition",
  "Season",
  "CompetitionSeason",
  "CompetitionClub",
  "Match",
];

describe.skipIf(!hasDatabase)(
  `GenerateWorldGenesis sobre Postgres ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let generate: GenerateWorldGenesis;

    beforeAll(() => {
      client = connect();
      generate = new GenerateWorldGenesis(
        new PrismaWorldRepository(client),
        new PrismaGenesisUnitOfWork(client),
      );
    });

    beforeEach(async () => {
      await truncate(client, GENESIS_TABLES);
      await seedWorld(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("materializa 16 clubes, 368 jogadores e 16 elencos", async () => {
      const result = await generate.execute(WORLD_ID as never);
      expect(result.ok).toBe(true);

      expect(await client.club.count({ where: { gameWorldId: WORLD_ID } })).toBe(16);
      expect(await client.person.count({ where: { gameWorldId: WORLD_ID } })).toBe(368);
      expect(await client.player.count({ where: { gameWorldId: WORLD_ID } })).toBe(368);
      expect(await client.playerAttributes.count()).toBe(368);
      expect(await client.squad.count({ where: { gameWorldId: WORLD_ID } })).toBe(16);
    });

    it("cada elenco tem os 23 jogadores com camisa única", async () => {
      await generate.execute(WORLD_ID as never);
      const squads = await client.squad.findMany({
        where: { gameWorldId: WORLD_ID },
        include: { memberships: true },
      });
      for (const squad of squads) {
        expect(squad.memberships).toHaveLength(SQUAD_SIZE);
        const shirts = new Set(squad.memberships.map((m) => m.shirtNumber));
        expect(shirts.size).toBe(SQUAD_SIZE);
      }
    });

    /** O grid de 39 sobrevive à gravação — o overall bate com o derivado. */
    it("os atributos gravados derivam o overall que a coluna guarda", async () => {
      await generate.execute(WORLD_ID as never);
      const player = await client.player.findFirstOrThrow({
        where: { gameWorldId: WORLD_ID },
        include: { attributes: true },
      });
      const attrs = player.attributes!;
      const grid = Object.fromEntries(
        Object.entries(attrs).filter(([k]) => k !== "playerId"),
      ) as never;
      expect(player.currentAbility).toBe(
        derivePlayerOverall(player.primaryPosition, grid),
      );
    });

    /** R-189: o dinheiro do jogador nasce nulo, não zerado. */
    it("o dinheiro do jogador nasce nulo (espera C9)", async () => {
      await generate.execute(WORLD_ID as never);
      const player = await client.player.findFirstOrThrow({
        where: { gameWorldId: WORLD_ID },
      });
      expect(player.marketValueMinor).toBeNull();
      expect(player.wageExpectationMinor).toBeNull();
    });

    /** Idempotente: reexecutar não duplica nem explode. */
    it("reexecutar a gênese não duplica ninguém", async () => {
      await generate.execute(WORLD_ID as never);
      const second = await generate.execute(WORLD_ID as never);
      expect(second.ok).toBe(true);
      if (second.ok) expect(second.value.created).toBe(false);

      expect(await client.player.count({ where: { gameWorldId: WORLD_ID } })).toBe(368);
      expect(await client.squad.count({ where: { gameWorldId: WORLD_ID } })).toBe(16);
    });

    /**
     * ECO-001: cada clube nasce com R$ 5.000.000 no razão — e é PROJEÇÃO, não
     * coluna: a soma dos lançamentos postados na conta de caixa dele (R-178).
     */
    it("cada clube nasce com a dotação de R$ 5.000.000 no razão", async () => {
      await generate.execute(WORLD_ID as never);

      // O caixa é ASSET/DEBIT: Σ débitos − Σ créditos das linhas postadas.
      const clubs = await client.club.findMany({ where: { gameWorldId: WORLD_ID } });
      for (const club of clubs) {
        const lines = await client.journalLine.findMany({
          where: {
            gameWorldId: WORLD_ID,
            account: { clubId: club.id, accountType: "ASSET" },
            entry: { status: "POSTED" },
          },
        });
        const balance = lines.reduce(
          (sum, l) => sum + (l.direction === "DEBIT" ? l.amountMinor : -l.amountMinor),
          0n,
        );
        expect(balance).toBe(INITIAL_ENDOWMENT_MINOR);
      }
    });

    /**
     * Economia fechada (ECO-003): a torneira criou exatamente o que os clubes
     * têm. A oferta monetária do mundo é auditável.
     */
    it("a torneira criou exatamente o que os 16 clubes têm", async () => {
      await generate.execute(WORLD_ID as never);

      const faucetLines = await client.journalLine.findMany({
        where: {
          gameWorldId: WORLD_ID,
          account: { systemAccount: "SYS_INITIAL_ENDOWMENT" },
          entry: { status: "POSTED" },
        },
      });
      const created = faucetLines.reduce(
        (sum, l) => sum + (l.direction === "CREDIT" ? l.amountMinor : -l.amountMinor),
        0n,
      );
      expect(created).toBe(INITIAL_ENDOWMENT_MINOR * 16n);
    });

    /** Idempotente: reexecutar a gênese não credita a dotação duas vezes. */
    it("reexecutar não duplica a dotação", async () => {
      await generate.execute(WORLD_ID as never);
      await generate.execute(WORLD_ID as never);
      expect(
        await client.journalEntry.count({ where: { gameWorldId: WORLD_ID } }),
      ).toBe(16);
    });

    it("materializa a liga com 240 partidas agendadas", async () => {
      await generate.execute(WORLD_ID as never);
      expect(
        await client.competition.count({ where: { gameWorldId: WORLD_ID } }),
      ).toBe(1);
      expect(
        await client.competitionClub.count(),
      ).toBe(16);
      expect(await client.match.count({ where: { gameWorldId: WORLD_ID } })).toBe(240);
      // Nasce tudo SCHEDULED/PENDING: ninguém jogou.
      expect(
        await client.match.count({
          where: { gameWorldId: WORLD_ID, runtimeStatus: "SCHEDULED" },
        }),
      ).toBe(240);
    });

    it("cada clube joga 30 partidas (ida e volta contra 15)", async () => {
      await generate.execute(WORLD_ID as never);
      const clubs = await client.club.findMany({
        where: { gameWorldId: WORLD_ID },
        select: { id: true },
      });
      for (const club of clubs) {
        const games = await client.match.count({
          where: {
            gameWorldId: WORLD_ID,
            OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
          },
        });
        expect(games).toBe(30);
      }
    });

    /** A soma dos overalls de cada elenco é o teto comum de 1.380 (R-57). */
    it("cada elenco soma o teto de 1.380", async () => {
      await generate.execute(WORLD_ID as never);
      const squads = await client.squad.findMany({
        where: { gameWorldId: WORLD_ID },
        include: { memberships: { include: { player: true } } },
      });
      for (const squad of squads) {
        const total = squad.memberships.reduce(
          (sum, m) => sum + m.player.currentAbility,
          0,
        );
        expect(total).toBe(1380);
      }
    });
  },
);
