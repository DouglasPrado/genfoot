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
} from "../../src/index.js";

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "integration"): GameWorldSnapshot {
  const rulesetVersion = parseRulesetVersion("1.0.0");
  if (!rulesetVersion.ok) throw rulesetVersion.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed,
    startDate: date("2026-01-01"),
    rulesetVersion: rulesetVersion.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

/**
 * T019 — handoff de contrato C8 → C7: o resultado oficial de uma partida (MatchResultOfficial /
 * MatchFinished) alimenta RecordOfficialResult do owner de competições, sem escrita cruzada.
 * Prova que o evento carrega exatamente o que C7 precisa (fixtureRef + placar) e que o consumo
 * é idempotente por chave. O transporte automático (barramento) é escopo de X-002.
 */
describe("Integração C8 → C7 (resultado oficial alimenta standings)", () => {
  function setup(seed: string) {
    const gameWorld = world(seed);
    const competitions = WorldCompetitions.initialize(gameWorld);
    const matches = WorldMatches.initialize(gameWorld);
    if (!competitions.ok) throw competitions.error;
    if (!matches.ok) throw matches.error;

    const season = "019f0000-0000-7000-8000-0000000000aa" as CompetitionSeasonRef;
    const clubs = [
      "019f0000-0000-7000-8000-0000000000c1",
      "019f0000-0000-7000-8000-0000000000c2",
    ].map((id) => id as CompetitionClubRef);
    const edition = competitions.value.createCompetitionEdition({
      seasonRef: season,
      name: "Liga",
      formatVersion: "league@1",
      maxParticipants: 2,
      startOn: "2026-02-01",
      roundIntervalDays: 7,
      worldDate: "2026-01-15",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "edition:1",
      worldSeed: gameWorld.seed,
    });
    if (!edition.ok) throw edition.error;
    clubs.forEach((clubId, index) => {
      const registered = competitions.value.registerParticipant({
        editionId: edition.value.id,
        clubId,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: `reg:${index}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-16",
      });
      if (!registered.ok) throw registered.error;
    });
    const fixtures = competitions.value.generateFixtures({
      editionId: edition.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "fixtures:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    if (!fixtures.ok) throw fixtures.error;

    return { gameWorld, competitions: competitions.value, matches: matches.value, fixtures: fixtures.value };
  }

  it("finaliza a partida em C8 e projeta o resultado nos standings de C7", () => {
    const { gameWorld, competitions, matches, fixtures } = setup("handoff");
    const fixture = fixtures[0]!;

    // C8 é dono da simulação: cria manifest ligado à fixture de C7 e finaliza.
    const manifest = matches.createMatchManifest({
      fixtureRef: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      kickoffOn: fixture.kickoffOn,
      seed: gameWorld.seed,
      engineBuild: "kernel@1",
      timestepChances: 40,
      homeStrength: 78,
      awayStrength: 44,
      worldDate: fixture.kickoffOn,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "m:handoff",
      worldSeed: gameWorld.seed,
    });
    if (!manifest.ok) throw manifest.error;
    const start = matches.startMatch({
      matchId: manifest.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "start:handoff",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!start.ok) throw start.error;
    const finalized = matches.finalizeMatch({
      matchId: manifest.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "final:handoff",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!finalized.ok) throw finalized.error;

    const official = matches
      .snapshot()
      .events.find((event) => event.type === "MatchResultOfficial");
    expect(official).toBeDefined();

    // C7 é dono das projeções: consome o placar oficial via RecordOfficialResult.
    const result = finalized.value.result!;
    const record = competitions.recordOfficialResult({
      fixtureId: fixture.id,
      matchRef: finalized.value.id,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `official:${finalized.value.id}`,
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!record.ok) throw record.error;
    expect(record.value.status).toBe("FINAL");

    const standings = competitions.standingsFor(fixture.editionId);
    const totalPlayed = standings.reduce((sum, entry) => sum + entry.played, 0);
    expect(totalPlayed).toBe(2);
    const totalPoints = standings.reduce((sum, entry) => sum + entry.points, 0);
    // Um jogo decidido distribui 3 pontos (vitória) ou 2 (empate 1+1).
    expect(totalPoints === 3 || totalPoints === 2).toBe(true);

    // Retry do mesmo resultado oficial (resposta perdida) = efeito único.
    const revision = competitions.snapshot().revision;
    const retry = competitions.recordOfficialResult({
      fixtureId: fixture.id,
      matchRef: finalized.value.id,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `official:${finalized.value.id}`,
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    expect(retry).toMatchObject({ ok: true });
    expect(competitions.snapshot().revision).toBe(revision);
  });
});
