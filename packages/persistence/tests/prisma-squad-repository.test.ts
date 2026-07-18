import {
  SQUAD_SIZE,
  Squad,
  SquadCategory,
  generateSquadAttributes,
  type SquadSnapshot,
} from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaPlayerRepository } from "../src/prisma-player-repository.js";
import { PrismaSquadRepository } from "../src/prisma-squad-repository.js";
import { CLUB_ID, WORLD_ID, WORLD_SEED, seedClub, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";
import { playerAggregate } from "./player-fixture.js";

const SQUAD_ID = "019b76da-a800-7999-9462-49c009be0001";

const TABLES = [
  "GameWorld",
  "Club",
  "ClubIdentityPeriod",
  "Stadium",
  "Person",
  "Player",
  "PlayerAttributes",
  "Squad",
  "SquadMembership",
];

/** Um elenco de 3 jogadores reais, com camisas distintas. */
function squadOf(playerIds: readonly string[]): SquadSnapshot {
  return {
    id: SQUAD_ID as never,
    gameWorldId: WORLD_ID as never,
    clubId: CLUB_ID as never,
    name: "Elenco principal",
    category: SquadCategory.FIRST_TEAM,
    seasonNumber: 1,
    version: 1,
    memberships: playerIds.map((playerId, index) => ({
      playerId: playerId as never,
      shirtNumber: index + 1,
      role: index === 0 ? "capitão" : null,
      effectiveFrom: "2026-01-02",
    })),
  };
}

describe.skipIf(!hasDatabase)(
  `PrismaSquadRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let squads: PrismaSquadRepository;
    let players: PrismaPlayerRepository;

    const playerIds = [
      "019b76da-a800-7d01-9462-49c009be0001",
      "019b76da-a800-7d02-9462-49c009be0002",
      "019b76da-a800-7d03-9462-49c009be0003",
    ];

    beforeAll(() => {
      client = connect();
      squads = new PrismaSquadRepository(client);
      players = new PrismaPlayerRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, TABLES);
      await seedWorld(client);
      await seedClub(client);
      // Os membros do elenco precisam existir como jogadores — a FK é real.
      const generated = generateSquadAttributes({ worldSeed: WORLD_SEED, clubIndex: 0 });
      for (let i = 0; i < playerIds.length; i += 1) {
        await players.savePlayer(
          playerAggregate(playerIds[i]!, generated[i]!),
          null,
        );
      }
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("grava o elenco e reidrata os membros com a camisa", async () => {
      await squads.saveSquad(squadOf(playerIds), null);

      const loaded = await squads.findFirstTeamSquad(
        WORLD_ID as never,
        CLUB_ID as never,
      );
      expect(loaded?.memberships).toHaveLength(3);
      expect(loaded?.memberships.map((m) => m.shirtNumber)).toEqual([1, 2, 3]);
      expect(loaded?.memberships[0]?.role).toBe("capitão");
    });

    /** Reidrata como agregado válido — se vier torto, o `fromSnapshot` recusa. */
    it("o que volta reidrata como Squad válido", async () => {
      await squads.saveSquad(squadOf(playerIds), null);
      const loaded = await squads.findFirstTeamSquad(
        WORLD_ID as never,
        CLUB_ID as never,
      );
      expect(Squad.fromSnapshot(loaded!).ok).toBe(true);
    });

    /**
     * Os membros são REESCRITOS, não somados: salvar o mesmo elenco duas vezes
     * não duplica ninguém. É o bug que o adapter de clube já teve.
     */
    it("salvar duas vezes não duplica membros", async () => {
      await squads.saveSquad(squadOf(playerIds), null);
      const first = await squads.findFirstTeamSquad(WORLD_ID as never, CLUB_ID as never);

      await squads.saveSquad(
        { ...squadOf(playerIds.slice(0, 2)), version: 2 },
        first!.version,
      );
      const second = await squads.findFirstTeamSquad(WORLD_ID as never, CLUB_ID as never);
      expect(second?.memberships).toHaveLength(2);
    });

    it("recusa a escrita quando a versão mudou por baixo", async () => {
      await squads.saveSquad(squadOf(playerIds), null);
      await expect(
        squads.saveSquad({ ...squadOf(playerIds), version: 9 }, 42),
      ).rejects.toThrow(/AGGREGATE_VERSION_CONFLICT/u);
    });

    it("a data de entrada volta como data de mundo (R-190)", async () => {
      await squads.saveSquad(squadOf(playerIds), null);
      const loaded = await squads.findFirstTeamSquad(WORLD_ID as never, CLUB_ID as never);
      expect(loaded?.memberships[0]?.effectiveFrom).toBe("2026-01-02");
    });

    it("o teto de 23 é constante, não coluna", () => {
      expect(SQUAD_SIZE).toBe(23);
    });
  },
);
