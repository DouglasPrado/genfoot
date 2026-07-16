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
  UserAccount,
  type GameWorldSnapshot,
  type IdentityClubRef,
} from "../../src/index.js";

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "saga-03"): GameWorldSnapshot {
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

const CLUB = "019f0000-0000-7000-8000-0000000000c1" as IdentityClubRef;

/**
 * T012 — golden path SAGA-03 de onboarding: a máquina durável de X-002 coordena o registro/
 * ingresso de C1 com os passos de risco (C12) e revalidação de automação (X-001), aqui
 * representados como passos da saga. Prova onboarding único, fencing e compensação (release).
 */
describe("SAGA-03 onboarding (C1 + X-002)", () => {
  function setup(seed: string) {
    const gameWorld = world(seed);
    const identityInit = WorldIdentity.initialize(gameWorld);
    const eventingInit = WorldEventing.initialize(gameWorld);
    if (!identityInit.ok) throw identityInit.error;
    if (!eventingInit.ok) throw eventingInit.error;
    const identity = identityInit.value;
    const eventing = eventingInit.value;

    const account = UserAccount.register({
      // R-172: a conta é de plataforma, não do mundo.
      email: "acc-1@exemplo.com",
      name: "Gestor",
      locale: "pt-BR",
      occurredOn: "2026-01-02",
      idempotencySeed: gameWorld.seed,
    });
    if (!account.ok) throw account.error;
    const joined = identity.joinWorld({
      accountId: account.value.snapshot().id,
      gameWorldId: gameWorld.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "join:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    });
    if (!joined.ok) throw joined.error;
    const reservation = identity.reserveClub({
      clubId: CLUB,
      accountId: account.value.snapshot().id,
      expiresOn: "2026-02-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "res:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-04",
    });
    if (!reservation.ok) throw reservation.error;

    const saga = eventing.startSaga({
      sagaType: "SAGA-03",
      correlationKey: `onboarding:${account.value.snapshot().id}`,
      steps: ["risk-check", "confirm"],
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "saga:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-04",
    });
    if (!saga.ok) throw saga.error;
    const claim = eventing.claimSaga({
      sagaId: saga.value.id,
      owner: "onboarding-worker",
      nowMs: 1_000,
      leaseMs: 60_000,
      rulesetVersion: gameWorld.rulesetVersion,
    });
    if (!claim.ok) throw claim.error;

    return {
      gameWorld,
      identity,
      eventing,
      account: account.value,
      reservation: reservation.value,
      saga: saga.value,
      fencingToken: claim.value.fencingToken,
    };
  }

  it("conclui o onboarding: risk-check → confirm com controle único ativo", () => {
    const ctx = setup("happy");
    const ruleset = ctx.gameWorld.rulesetVersion;
    const seed = ctx.gameWorld.seed;

    // Passo risk-check aprovado (C12) → avança a saga.
    const riskStep = ctx.eventing.advanceSagaStep({
      sagaId: ctx.saga.id,
      fencingToken: ctx.fencingToken,
      checkpointHash: "risk-approved",
      rulesetVersion: ruleset,
      idempotencyKey: "saga:1:risk",
      worldSeed: seed,
      worldDate: "2026-01-05",
    });
    if (!riskStep.ok) throw riskStep.error;

    // Passo confirm: C1 ativa o controle e a saga conclui.
    const control = ctx.identity.confirmOnboarding({
      reservationId: ctx.reservation.id,
      rulesetVersion: ruleset,
      idempotencyKey: "onb:1",
      worldSeed: seed,
      worldDate: "2026-01-05",
    });
    const confirmStep = ctx.eventing.advanceSagaStep({
      sagaId: ctx.saga.id,
      fencingToken: ctx.fencingToken,
      checkpointHash: "confirmed",
      rulesetVersion: ruleset,
      idempotencyKey: "saga:1:confirm",
      worldSeed: seed,
      worldDate: "2026-01-05",
    });

    expect(control).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(confirmStep).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
    expect(ctx.identity.activeControlForClub(CLUB)!.accountId).toBe(ctx.account.snapshot().id);
    expect(ctx.identity.summary().activeParticipationCount).toBe(1);
  });

  it("compensa o onboarding rejeitado liberando a reserva", () => {
    const ctx = setup("reject");
    const ruleset = ctx.gameWorld.rulesetVersion;
    const seed = ctx.gameWorld.seed;

    // Risco rejeitado → libera reserva e compensa a saga; nenhum controle criado.
    const released = ctx.identity.releaseReservation({
      reservationId: ctx.reservation.id,
      rulesetVersion: ruleset,
      idempotencyKey: "rel:1",
      worldSeed: seed,
      worldDate: "2026-01-05",
    });
    const compSaga = ctx.eventing.compensateSaga({
      sagaId: ctx.saga.id,
      fencingToken: ctx.fencingToken,
      reason: "risk-rejected",
      rulesetVersion: ruleset,
      idempotencyKey: "saga:1:comp",
      worldSeed: seed,
      worldDate: "2026-01-05",
    });

    expect(released).toMatchObject({ ok: true, value: { status: "RELEASED" } });
    expect(compSaga).toMatchObject({ ok: true, value: { status: "COMPENSATED" } });
    expect(ctx.identity.activeControlForClub(CLUB)).toBeNull();
  });
});
