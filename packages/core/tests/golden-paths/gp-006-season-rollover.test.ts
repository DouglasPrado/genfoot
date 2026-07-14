import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldCompetitions,
  type CompetitionClubRef,
  type CompetitionSeasonRef,
  type GameWorldSnapshot,
} from "../../src/index.js";

// GP-006 · Season rollover — convergência C7/C2: a virada de temporada cria uma
// nova edição/calendário sem apagar a temporada anterior (fatos append-only). As
// duas edições coexistem e a nova gera fixtures determinísticas próprias.

const SEASON_1 = "019f0000-0000-7000-8000-000000000a01" as CompetitionSeasonRef;
const SEASON_2 = "019f0000-0000-7000-8000-000000000a02" as CompetitionSeasonRef;
const CLUBS = [
  "019f0000-0000-7000-8000-0000000000c1",
  "019f0000-0000-7000-8000-0000000000c2",
  "019f0000-0000-7000-8000-0000000000c3",
  "019f0000-0000-7000-8000-0000000000c4",
].map((id) => id as CompetitionClubRef);

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-006",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function runSeason(
  competitions: WorldCompetitions,
  gameWorld: GameWorldSnapshot,
  seasonRef: CompetitionSeasonRef,
  label: string,
  startOn: string,
) {
  const edition = competitions.createCompetitionEdition({
    seasonRef,
    name: `Liga ${label}`,
    formatVersion: "league-double-rr@1",
    maxParticipants: 4,
    startOn,
    roundIntervalDays: 7,
    worldDate: startOn,
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: `edition:${label}`,
    worldSeed: gameWorld.seed,
  });
  if (!edition.ok) throw edition.error;
  CLUBS.forEach((clubId, index) => {
    const registered = competitions.registerParticipant({
      editionId: edition.value.id,
      clubId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `reg:${label}:${index}`,
      worldSeed: gameWorld.seed,
      worldDate: startOn,
    });
    if (!registered.ok) throw registered.error;
  });
  const fixtures = competitions.generateFixtures({
    editionId: edition.value.id,
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: `fixtures:${label}`,
    worldSeed: gameWorld.seed,
    worldDate: startOn,
  });
  if (!fixtures.ok) throw fixtures.error;
  return { editionId: edition.value.id, fixtures: fixtures.value };
}

describe("GP-006 Season rollover (convergence)", () => {
  it("abre a nova temporada sem apagar a anterior", () => {
    const gameWorld = world();
    const competitionsR = WorldCompetitions.initialize(gameWorld);
    if (!competitionsR.ok) throw competitionsR.error;
    const competitions = competitionsR.value;

    const first = runSeason(competitions, gameWorld, SEASON_1, "2026", "2026-02-01");
    const second = runSeason(competitions, gameWorld, SEASON_2, "2027", "2027-02-01");

    // Ambas as edições coexistem (temporada anterior preservada).
    expect(competitions.snapshot().editions).toHaveLength(2);
    expect(first.fixtures).toHaveLength(12);
    expect(second.fixtures).toHaveLength(12);

    // As fixtures de cada temporada ficam no seu próprio calendário e edição.
    expect(first.fixtures.every((f) => f.editionId === first.editionId)).toBe(true);
    expect(second.fixtures.every((f) => f.kickoffOn >= "2027-02-01")).toBe(true);

    // Fatos append-only: a edição da temporada 1 continua registrada.
    expect(competitions.findEdition(first.editionId)!.status).toBe("SCHEDULED");
  });
});
