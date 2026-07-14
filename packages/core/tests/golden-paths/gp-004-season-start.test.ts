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

// GP-004 · Season start — convergência C7 (competição/calendário): a temporada
// inicia com uma edição criada, participantes inscritos e fixtures publicadas
// deterministicamente dentro do calendário; o command é idempotente por chave.

const SEASON = "019f0000-0000-7000-8000-0000000000aa" as CompetitionSeasonRef;
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
    seed: "gp-004",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-004 Season start (convergence)", () => {
  it("inicia a temporada com edição, inscrições e fixtures no calendário", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const competitionsR = WorldCompetitions.initialize(gameWorld);
    if (!competitionsR.ok) throw competitionsR.error;
    const competitions = competitionsR.value;

    const edition = competitions.createCompetitionEdition({
      seasonRef: SEASON,
      name: "Liga 2026",
      formatVersion: "league-double-rr@1",
      maxParticipants: 4,
      startOn: "2026-02-01",
      roundIntervalDays: 7,
      worldDate: "2026-01-15",
      rulesetVersion: ruleset,
      idempotencyKey: "edition:season",
      worldSeed: gameWorld.seed,
    });
    if (!edition.ok) throw edition.error;

    CLUBS.forEach((clubId, index) => {
      const registered = competitions.registerParticipant({
        editionId: edition.value.id,
        clubId,
        rulesetVersion: ruleset,
        idempotencyKey: `reg:${index}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-16",
      });
      if (!registered.ok) throw registered.error;
    });

    const fixtures = competitions.generateFixtures({
      editionId: edition.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "fixtures:season",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    if (!fixtures.ok) throw fixtures.error;

    // 4 clubes em turno-returno → 12 partidas, calendário a partir de 2026-02-01.
    expect(fixtures.value).toHaveLength(12);
    expect(competitions.findEdition(edition.value.id)!.status).toBe("SCHEDULED");
    expect(fixtures.value.every((f) => f.kickoffOn >= "2026-02-01")).toBe(true);

    // Idempotência do arranque: repetir com a mesma chave devolve as mesmas fixtures.
    const revision = competitions.snapshot().revision;
    const repeated = competitions.generateFixtures({
      editionId: edition.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "fixtures:season",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    expect(repeated).toEqual(fixtures);
    expect(competitions.snapshot().revision).toBe(revision);
  });
});
