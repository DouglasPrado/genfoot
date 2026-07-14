import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldEventing,
  WorldIdentity,
  WorldMatches,
  WorldNarrative,
  type GameWorldSnapshot,
  type IdentityAccountRef,
  type IdentityClubRef,
  type MatchClubRef,
  type MatchFixtureRef,
  type NarrativeClubRef,
} from "../../src/index.js";

// GP-015 · Sporting crisis — convergência C8 (resultados) → C10 (narrativa). Uma
// sequência de derrotas frustra a torcida, abre uma crise esportiva e o clube
// percorre um arco recuperável (WATCH/OPEN → RECOVERY → RESOLVED) determinístico.

const CLUB = "019f0000-0000-7000-8000-0000000000c1" as NarrativeClubRef;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-015",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-015 Sporting crisis (convergence)", () => {
  it("derrotas frustram a torcida, abrem e resolvem a crise", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const narrativeR = WorldNarrative.initialize(gameWorld);
    if (!narrativeR.ok) throw narrativeR.error;
    const narrative = narrativeR.value;

    const baseline = narrative.fanbaseFor(CLUB).overall;

    // C8 → C10: derrotas contra a expectativa derrubam a satisfação.
    for (let round = 1; round <= 4; round += 1) {
      const applied = narrative.applyMatchFact({
        factId: `loss:${round}`,
        clubId: CLUB,
        outcome: "LOSS",
        expected: "WIN",
        rulesetVersion: ruleset,
        idempotencyKey: `sat:${round}`,
        worldSeed: gameWorld.seed,
        worldDate: `2026-0${round}-10`,
      });
      if (!applied.ok) throw applied.error;
    }
    expect(narrative.fanbaseFor(CLUB).overall).toBeLessThan(baseline);

    // C10: abre a crise esportiva.
    const crisis = narrative.openCrisis({
      clubId: CLUB,
      cause: "LOSING_STREAK",
      severity: 75,
      rulesetVersion: ruleset,
      idempotencyKey: "crisis:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-15",
    });
    expect(crisis).toMatchObject({ ok: true, value: { status: "OPEN" } });
    if (!crisis.ok) throw crisis.error;

    // Arco recuperável: plano de recuperação → resolução.
    const recovery = narrative.submitRecoveryPlan({
      crisisId: crisis.value.id,
      plan: "trocar comissão técnica e reforçar o meio-campo",
      rulesetVersion: ruleset,
      idempotencyKey: "plan:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-20",
    });
    expect(recovery).toMatchObject({ ok: true, value: { status: "RECOVERY" } });
    const resolved = narrative.resolveCrisis({
      crisisId: crisis.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "resolve:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-05-30",
    });
    expect(resolved).toMatchObject({ ok: true, value: { status: "RESOLVED" } });

    // Transição inválida após resolver é rejeitada (arco íntegro).
    expect(
      narrative.resolveCrisis({
        crisisId: crisis.value.id,
        rulesetVersion: ruleset,
        idempotencyKey: "resolve:again",
        worldSeed: gameWorld.seed,
        worldDate: "2026-06-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "CRISIS_NOT_OPEN" } });
  });

  it("abre crise por severidade agregada, pressiona a diretoria (C1) e consome C8 via X-002", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const account = "019f0000-0000-7000-8000-0000000000a1" as IdentityAccountRef;
    const identityClub = "019f0000-0000-7000-8000-0000000000c1" as IdentityClubRef;

    // C1: um gestor assume o controle do clube antes da crise.
    const identityR = WorldIdentity.initialize(gameWorld, 30);
    if (!identityR.ok) throw identityR.error;
    const identity = identityR.value;
    const reservation = identity.reserveClub({
      clubId: identityClub,
      accountId: account,
      expiresOn: "2026-01-20",
      rulesetVersion: ruleset,
      idempotencyKey: "reserve:crisis",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    if (!reservation.ok) throw reservation.error;
    const control = identity.confirmOnboarding({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "onboard:crisis",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-11",
    });
    if (!control.ok) throw control.error;

    // X-002: os MatchResultOfficial (C8) entram no outbox e alimentam a narrativa.
    const eventingR = WorldEventing.initialize(gameWorld);
    if (!eventingR.ok) throw eventingR.error;
    const eventing = eventingR.value;
    const published = eventing.publishOutboxBatch({
      stream: "matches",
      messages: [
        { eventType: "MatchResultOfficial", payloadHash: "loss:1", occurredOn: "2026-03-10" },
        { eventType: "MatchResultOfficial", payloadHash: "loss:2", occurredOn: "2026-03-17" },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "matches:batch",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-17",
    });
    if (!published.ok) throw published.error;
    const projection = eventing.rebuildProjection({
      projectionId: "sporting-form",
      stream: "matches",
      rulesetVersion: ruleset,
      idempotencyKey: "proj:form",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-17",
    });
    expect(projection).toMatchObject({ ok: true, value: { cursor: 2 } });

    // C10: a torcida some com a satisfação; a severidade da crise é agregada dela.
    const narrativeR = WorldNarrative.initialize(gameWorld);
    if (!narrativeR.ok) throw narrativeR.error;
    const narrative = narrativeR.value;
    const club = "019f0000-0000-7000-8000-0000000000c1" as NarrativeClubRef;
    for (let round = 1; round <= 5; round += 1) {
      const applied = narrative.applyMatchFact({
        factId: `agg-loss:${round}`,
        clubId: club,
        outcome: "LOSS",
        expected: "WIN",
        rulesetVersion: ruleset,
        idempotencyKey: `agg:${round}`,
        worldSeed: gameWorld.seed,
        worldDate: `2026-0${round}-25`,
      });
      if (!applied.ok) throw applied.error;
    }
    const overall = narrative.fanbaseFor(club).overall;
    // severidade agregada = quão insatisfeita está a torcida (protestos/apoio/imprensa).
    const aggregatedSeverity = 100 - overall;
    expect(aggregatedSeverity).toBeGreaterThan(0);
    const crisis = narrative.openCrisis({
      clubId: club,
      cause: "AGGREGATED_UNREST",
      severity: aggregatedSeverity,
      rulesetVersion: ruleset,
      idempotencyKey: "crisis:agg",
      worldSeed: gameWorld.seed,
      worldDate: "2026-05-30",
    });
    expect(crisis).toMatchObject({ ok: true, value: { status: "OPEN" } });

    // C1: sob a crise, a diretoria encerra o controle → cooldown (risco de fim de controle).
    const ended = identity.endClubControl({
      controlId: control.value.id,
      reason: "BOARD_PRESSURE",
      endedOn: "2026-06-01",
      rulesetVersion: ruleset,
      idempotencyKey: "end:crisis",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-01",
    });
    expect(ended).toMatchObject({ ok: true, value: { status: "ENDED" } });
    expect(identity.activeControlForClub(identityClub)).toBeNull();
    expect(
      identity.snapshot().events.some((e) => e.type === "CooldownStarted"),
    ).toBe(true);
  });

  it("consome MatchResultOfficial (C8) via X-002 alimentando a narrativa (C10)", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;

    // C8: uma partida real é jogada e finalizada (fato oficial).
    const matchesR = WorldMatches.initialize(gameWorld);
    if (!matchesR.ok) throw matchesR.error;
    const matches = matchesR.value;
    const manifest = matches.createMatchManifest({
      fixtureRef: "019f0000-0000-7000-8000-0000000000f1" as MatchFixtureRef,
      homeClubId: "019f0000-0000-7000-8000-0000000000c1" as MatchClubRef,
      awayClubId: "019f0000-0000-7000-8000-0000000000c2" as MatchClubRef,
      kickoffOn: "2026-05-10",
      seed: gameWorld.seed,
      engineBuild: "kernel@1",
      timestepChances: 30,
      homeStrength: 40,
      awayStrength: 80,
      worldDate: "2026-05-10",
      rulesetVersion: ruleset,
      idempotencyKey: "gp015:manifest",
      worldSeed: gameWorld.seed,
    });
    if (!manifest.ok) throw manifest.error;
    const started = matches.startMatch({
      matchId: manifest.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "gp015:start",
      worldSeed: gameWorld.seed,
      worldDate: "2026-05-10",
    });
    if (!started.ok) throw started.error;
    const finalized = matches.finalizeMatch({
      matchId: manifest.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "gp015:final",
      worldSeed: gameWorld.seed,
      worldDate: "2026-05-10",
    });
    if (!finalized.ok) throw finalized.error;
    const official = matches
      .snapshot()
      .events.find((e) => e.type === "MatchResultOfficial")!;

    // X-002: o MatchResultOfficial é transportado no outbox.
    const eventingR = WorldEventing.initialize(gameWorld);
    if (!eventingR.ok) throw eventingR.error;
    const eventing = eventingR.value;
    const published = eventing.publishOutboxBatch({
      stream: "matches",
      messages: [
        { eventType: "MatchResultOfficial", payloadHash: official.resultHash, occurredOn: "2026-05-10" },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "gp015:official-batch",
      worldSeed: gameWorld.seed,
      worldDate: "2026-05-10",
    });
    if (!published.ok) throw published.error;

    // C10: a narrativa consome o resultado (derrota) e a satisfação cai.
    const narrativeR = WorldNarrative.initialize(gameWorld);
    if (!narrativeR.ok) throw narrativeR.error;
    const narrative = narrativeR.value;
    const baseline = narrative.fanbaseFor(CLUB).overall;
    const reacted = narrative.applyMatchFact({
      factId: official.id,
      clubId: CLUB,
      outcome: "LOSS",
      expected: "WIN",
      rulesetVersion: ruleset,
      idempotencyKey: "gp015:react",
      worldSeed: gameWorld.seed,
      worldDate: "2026-05-11",
    });
    if (!reacted.ok) throw reacted.error;
    expect(narrative.fanbaseFor(CLUB).overall).toBeLessThan(baseline);
  });
});
