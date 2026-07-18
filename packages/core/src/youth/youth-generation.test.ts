import { describe, expect, it } from "vitest";

import { SquadCategory } from "../clubs/club-types.js";
import { derivePlayerOverall } from "../players/player-attributes.js";

import { deriveClubYouth } from "./youth-generation.js";

const INPUT = {
  worldSeed: "grinta-demo",
  gameWorldId: "019f0000-0000-7000-8000-000000000001",
  clubId: "019f0000-0000-7000-8000-0000000000b2",
  clubName: "Real do Vale",
  clubIndex: 0,
  worldStartDate: "2026-01-01",
};

describe("deriveClubYouth — a base do clube (C8, R-182)", () => {
  it("forma um elenco YOUTH_ACADEMY de jovens", () => {
    const { players, squad } = deriveClubYouth(INPUT);
    expect(players).toHaveLength(12);
    expect(squad.category).toBe(SquadCategory.YOUTH_ACADEMY);
    expect(squad.memberships).toHaveLength(12);
    expect(squad.clubId).toBe(INPUT.clubId);
  });

  it("são prospectos jovens: youthProspect e nascidos há 16–19 anos", () => {
    for (const { player, person } of deriveClubYouth(INPUT).players) {
      expect(player.youthProspect).toBe(true);
      const birthYear = Number(person.birthDate.slice(0, 4));
      const age = 2026 - birthYear;
      expect(age).toBeGreaterThanOrEqual(16);
      expect(age).toBeLessThanOrEqual(19);
    }
  });

  it("habilidade atual BAIXA e potencial ALTO — matéria-prima", () => {
    for (const { player } of deriveClubYouth(INPUT).players) {
      const overall = derivePlayerOverall(
        player.primaryPosition,
        player.attributes,
      );
      expect(overall).toBeLessThan(player.potentialAbility);
      expect(player.potentialAbility).toBeGreaterThanOrEqual(58);
    }
  });

  it("é determinística: mesmo mundo/clube ⇒ mesma base", () => {
    const a = deriveClubYouth(INPUT);
    const b = deriveClubYouth(INPUT);
    expect(a.players.map((p) => p.player.id)).toEqual(
      b.players.map((p) => p.player.id),
    );
    expect(a.squad.id).toBe(b.squad.id);
  });

  it("clubes diferentes têm bases diferentes", () => {
    const c1 = deriveClubYouth({
      ...INPUT,
      clubIndex: 1,
      clubId: "019f0000-0000-7000-8000-0000000000c3",
    });
    expect(deriveClubYouth(INPUT).squad.id).not.toBe(c1.squad.id);
  });

  it("camisas e jogadores são únicos no elenco (invariante do Squad)", () => {
    const { squad } = deriveClubYouth(INPUT);
    const shirts = new Set(squad.memberships.map((m) => m.shirtNumber));
    const ids = new Set(squad.memberships.map((m) => m.playerId));
    expect(shirts.size).toBe(squad.memberships.length);
    expect(ids.size).toBe(squad.memberships.length);
  });
});
