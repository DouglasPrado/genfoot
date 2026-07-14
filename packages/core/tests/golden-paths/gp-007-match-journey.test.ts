import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldCompetitions,
  WorldLedger,
  WorldMatches,
  WorldNarrative,
  type CompetitionClubRef,
  type CompetitionSeasonRef,
  type GameWorldSnapshot,
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
      fixtureRef: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
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

  it("joga ao vivo (C8 US2) e propaga o resultado em standings, torcida e bilheteria", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const twoClubs = [
      "019f0000-0000-7000-8000-0000000000c1",
      "019f0000-0000-7000-8000-0000000000c2",
    ].map((id) => id as CompetitionClubRef);

    // C7: edição com 2 clubes → 2 fixtures.
    const competitionsR = WorldCompetitions.initialize(gameWorld);
    if (!competitionsR.ok) throw competitionsR.error;
    const competitions = competitionsR.value;
    const edition = competitions.createCompetitionEdition({
      seasonRef: SEASON,
      name: "Liga",
      formatVersion: "league@1",
      maxParticipants: 2,
      startOn: "2026-02-01",
      roundIntervalDays: 7,
      worldDate: "2026-01-15",
      rulesetVersion: ruleset,
      idempotencyKey: "live:edition",
      worldSeed: gameWorld.seed,
    });
    if (!edition.ok) throw edition.error;
    twoClubs.forEach((clubId, index) => {
      const r = competitions.registerParticipant({
        editionId: edition.value.id,
        clubId,
        rulesetVersion: ruleset,
        idempotencyKey: `live:reg:${index}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-16",
      });
      if (!r.ok) throw r.error;
    });
    const fixtures = competitions.generateFixtures({
      editionId: edition.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "live:fixtures",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    if (!fixtures.ok) throw fixtures.error;
    const fixture = fixtures.value[0]!;

    // C8 US2: partida ao vivo — command + ticks + checkpoint + finalize.
    const matchesR = WorldMatches.initialize(gameWorld);
    if (!matchesR.ok) throw matchesR.error;
    const matches = matchesR.value;
    const manifest = matches.createMatchManifest({
      fixtureRef: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      kickoffOn: fixture.kickoffOn,
      seed: gameWorld.seed,
      engineBuild: "kernel@1",
      timestepChances: 30,
      homeStrength: 74,
      awayStrength: 50,
      worldDate: fixture.kickoffOn,
      rulesetVersion: ruleset,
      idempotencyKey: "live:manifest",
      worldSeed: gameWorld.seed,
    });
    if (!manifest.ok) throw manifest.error;
    const matchId = manifest.value.id;
    const started = matches.startMatch({
      matchId,
      rulesetVersion: ruleset,
      idempotencyKey: "live:start",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!started.ok) throw started.error;
    const command = matches.submitMatchCommand({
      matchId,
      actor: "coach-home",
      commandType: "TACTIC_SHIFT",
      side: "HOME",
      delta: 8,
      payloadHash: "attack",
      expectedSequence: 1,
      rulesetVersion: ruleset,
      commandId: "c1",
      idempotencyKey: "live:cmd",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!command.ok) throw command.error;
    const half = matches.advanceMatchTicks({ matchId, ticks: 15, rulesetVersion: ruleset });
    if (!half.ok) throw half.error;
    const checkpoint = matches.checkpointMatch({
      matchId,
      rulesetVersion: ruleset,
      idempotencyKey: "live:cp",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!checkpoint.ok) throw checkpoint.error;
    const rest = matches.advanceMatchTicks({ matchId, ticks: 15, rulesetVersion: ruleset });
    if (!rest.ok) throw rest.error;
    const finalized = matches.finalizeMatch({
      matchId,
      rulesetVersion: ruleset,
      idempotencyKey: "live:final",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!finalized.ok) throw finalized.error;
    expect(finalized.value.status).toBe("FINAL");
    expect(matches.findMatch(matchId)!.checkpoints).toHaveLength(1);

    // C7 ← C8: o resultado oficial atualiza os standings.
    const recorded = competitions.recordOfficialResult({
      fixtureId: fixture.id,
      matchRef: finalized.value.id,
      homeGoals: finalized.value.result!.homeGoals,
      awayGoals: finalized.value.result!.awayGoals,
      rulesetVersion: ruleset,
      idempotencyKey: "live:official",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    expect(recorded).toMatchObject({ ok: true, value: { status: "FINAL" } });
    const standings = competitions.standingsFor(fixture.editionId);
    expect(standings.reduce((sum, e) => sum + e.played, 0)).toBe(2);

    // C10: a torcida do mandante reage ao resultado (satisfação muda de 50).
    const narrativeR = WorldNarrative.initialize(gameWorld);
    if (!narrativeR.ok) throw narrativeR.error;
    const homeWon = finalized.value.result!.homeGoals > finalized.value.result!.awayGoals;
    const fan = narrativeR.value.applyMatchFact({
      factId: `match:${finalized.value.id}`,
      clubId: fixture.homeClubId,
      outcome: homeWon ? "WIN" : "LOSS",
      expected: "DRAW",
      rulesetVersion: ruleset,
      idempotencyKey: "live:fan",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!fan.ok) throw fan.error;
    expect(fan.value.overall).not.toBe(50);

    // C9: a bilheteria entra no ledger com conservação (soma algébrica zero).
    const ledgerR = WorldLedger.initialize(gameWorld);
    if (!ledgerR.ok) throw ledgerR.error;
    const ledger = ledgerR.value;
    const gate = ledger.openLedgerAccount({
      name: "Caixa",
      type: "ASSET",
      rulesetVersion: ruleset,
      idempotencyKey: "live:gate",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    const supporters = ledger.openLedgerAccount({
      name: "Bilheteria",
      type: "REVENUE",
      rulesetVersion: ruleset,
      idempotencyKey: "live:rev",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!gate.ok || !supporters.ok) throw new Error("contas");
    const receipt = ledger.postTransaction({
      transactionClass: "GATE_RECEIPT",
      occurredOn: fixture.kickoffOn,
      entries: [
        { accountId: gate.value.id, direction: "DEBIT", amountMinor: 300 },
        { accountId: supporters.value.id, direction: "CREDIT", amountMinor: 300 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "live:receipt",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!receipt.ok) throw receipt.error;
    const residual = ledger
      .snapshot()
      .accounts.reduce((sum, account) => sum + account.balanceMinor, 0);
    expect(residual).toBe(0);
  });
});
