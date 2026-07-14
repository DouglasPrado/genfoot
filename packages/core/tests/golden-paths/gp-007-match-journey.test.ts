import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldCompetitions,
  WorldMatches,
  type CompetitionClubRef,
  type CompetitionSeasonRef,
  type GameWorldSnapshot,
  type MatchClubRef,
  type MatchFixtureRef,
} from "../../src/index.js";

// GP-007 · Match journey — convergência C7 (fixture) + C8 (runtime). Uma fixture
// agendada vira um manifesto de partida, é jogada pelo kernel determinístico e
// produz um resultado oficial finalizado uma única vez; o replay confirma
// online ≡ offline ≡ replay.

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
    seed: "gp-007",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-007 Match journey (convergence)", () => {
  it("joga uma fixture agendada e finaliza um resultado oficial único", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;

    // C7: gera as fixtures da edição.
    const competitionsR = WorldCompetitions.initialize(gameWorld);
    if (!competitionsR.ok) throw competitionsR.error;
    const competitions = competitionsR.value;
    const edition = competitions.createCompetitionEdition({
      seasonRef: SEASON,
      name: "Liga",
      formatVersion: "league@1",
      maxParticipants: 4,
      startOn: "2026-02-01",
      roundIntervalDays: 7,
      worldDate: "2026-01-15",
      rulesetVersion: ruleset,
      idempotencyKey: "edition:1",
      worldSeed: gameWorld.seed,
    });
    if (!edition.ok) throw edition.error;
    CLUBS.forEach((clubId, index) => {
      const r = competitions.registerParticipant({
        editionId: edition.value.id,
        clubId,
        rulesetVersion: ruleset,
        idempotencyKey: `reg:${index}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-16",
      });
      if (!r.ok) throw r.error;
    });
    const fixtures = competitions.generateFixtures({
      editionId: edition.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "fixtures:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    if (!fixtures.ok) throw fixtures.error;
    const fixture = fixtures.value[0]!;

    // C8: cria o manifesto a partir da fixture e joga a partida.
    const matchesR = WorldMatches.initialize(gameWorld);
    if (!matchesR.ok) throw matchesR.error;
    const matches = matchesR.value;
    const manifest = matches.createMatchManifest({
      fixtureRef: fixture.id as unknown as MatchFixtureRef,
      homeClubId: fixture.homeClubId as unknown as MatchClubRef,
      awayClubId: fixture.awayClubId as unknown as MatchClubRef,
      kickoffOn: fixture.kickoffOn,
      seed: gameWorld.seed,
      engineBuild: "kernel@1",
      timestepChances: 30,
      homeStrength: 70,
      awayStrength: 55,
      worldDate: fixture.kickoffOn,
      rulesetVersion: ruleset,
      idempotencyKey: `match:${fixture.id}`,
      worldSeed: gameWorld.seed,
    });
    if (!manifest.ok) throw manifest.error;

    const started = matches.startMatch({
      matchId: manifest.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: `start:${fixture.id}`,
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!started.ok) throw started.error;
    const finalized = matches.finalizeMatch({
      matchId: manifest.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: `final:${fixture.id}`,
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!finalized.ok) throw finalized.error;
    expect(finalized.value.status).toBe("FINAL");
    expect(finalized.value.result!.resultHash).toMatch(/^[0-9a-f]{16}$/);

    // Finalize-once: repetir devolve o mesmo resultado, sem novo efeito.
    const revision = matches.snapshot().revision;
    const again = matches.finalizeMatch({
      matchId: manifest.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: `final:${fixture.id}:again`,
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    expect(again).toEqual(finalized);
    expect(matches.snapshot().revision).toBe(revision);

    // Replay confirma o determinismo (online ≡ offline ≡ replay).
    expect(matches.replayMatch(manifest.value.id)).toMatchObject({
      ok: true,
      value: { deterministic: true },
    });
  });
});
