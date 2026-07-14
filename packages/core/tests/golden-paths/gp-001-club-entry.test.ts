import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type RulesetVersion,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldAdmin,
  WorldEventing,
  WorldIdentity,
  type GameWorldSnapshot,
  type IdentityAccountRef,
  type IdentityClubRef,
} from "../../src/index.js";

// GP-001 · Club entry — convergência C1 (identidade/controle) + C12 (risco).
// Uma conta elegível reserva UMA vaga, ativa o controle UMA vez; a disputa da
// última vaga é resolvida por um único vencedor; repetir a intenção não duplica.

const ACCOUNT_A = "019f0000-0000-7000-8000-0000000000a1" as IdentityAccountRef;
const ACCOUNT_B = "019f0000-0000-7000-8000-0000000000b1" as IdentityAccountRef;
const CLUB = "019f0000-0000-7000-8000-0000000000c1" as IdentityClubRef;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-001",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function eligibilityOf(
  admin: WorldAdmin,
  gameWorld: GameWorldSnapshot,
  account: string,
  weight: number,
): boolean {
  const assessment = admin.recordRiskSignal({
    dedupKey: `risk:${account}`,
    subject: account,
    kind: "SIGNUP",
    weight,
    source: "onboarding",
    observedOn: "2026-01-04",
    actor: "system",
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: `risk:${account}`,
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-04",
  });
  if (!assessment.ok) throw assessment.error;
  return !assessment.value.flagged;
}

describe("GP-001 Club entry (convergence)", () => {
  it("uma conta elegível reserva e assume o controle uma única vez", () => {
    const gameWorld = world();
    const ruleset: RulesetVersion = gameWorld.rulesetVersion;
    const identityR = WorldIdentity.initialize(gameWorld, 30);
    const adminR = WorldAdmin.initialize(gameWorld);
    if (!identityR.ok) throw identityR.error;
    if (!adminR.ok) throw adminR.error;
    const identity = identityR.value;
    const admin = adminR.value;

    // C12: conta A é elegível (risco baixo); conta B seria elegível também.
    expect(eligibilityOf(admin, gameWorld, ACCOUNT_A, 10)).toBe(true);

    // C1: A reserva a vaga.
    const reservation = identity.reserveClub({
      clubId: CLUB,
      accountId: ACCOUNT_A,
      expiresOn: "2026-01-10",
      rulesetVersion: ruleset,
      idempotencyKey: "reserve:A",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    expect(reservation).toMatchObject({ ok: true, value: { status: "HELD" } });
    if (!reservation.ok) throw reservation.error;

    // Disputa: B tenta a mesma (última) vaga e perde de forma estável.
    expect(
      identity.reserveClub({
        clubId: CLUB,
        accountId: ACCOUNT_B,
        expiresOn: "2026-01-10",
        rulesetVersion: ruleset,
        idempotencyKey: "reserve:B",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-05",
      }),
    ).toMatchObject({ ok: false, error: { code: "CLUB_ALREADY_RESERVED" } });

    // C1: A conclui o onboarding e ativa o controle (único).
    const control = identity.confirmOnboarding({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "onboard:A",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    expect(control).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(identity.activeControlForClub(CLUB)!.accountId).toBe(ACCOUNT_A);
    expect(identity.summary().activeControlCount).toBe(1);

    // Idempotência: repetir o onboarding com a mesma chave não duplica efeito.
    const revision = identity.snapshot().revision;
    const repeated = identity.confirmOnboarding({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "onboard:A",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    expect(repeated).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(identity.snapshot().revision).toBe(revision);
    expect(identity.summary().activeControlCount).toBe(1);
  });

  it("orquestra a entrada via SAGA-03 (C1 + C12 risco + X-002) com compensação e clube novo", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const identityR = WorldIdentity.initialize(gameWorld, 30);
    const eventingR = WorldEventing.initialize(gameWorld);
    const adminR = WorldAdmin.initialize(gameWorld);
    if (!identityR.ok) throw identityR.error;
    if (!eventingR.ok) throw eventingR.error;
    if (!adminR.ok) throw adminR.error;
    const identity = identityR.value;
    const eventing = eventingR.value;
    const admin = adminR.value;

    // Estados que a tela do cliente (X-003) renderiza ao longo da jornada.
    const journey: string[] = [];

    // C1: conta registrada ingressa no mundo e reserva a vaga.
    const account = identity.registerAccount({
      locale: "pt-BR",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:entry",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!account.ok) throw account.error;
    const joined = identity.joinWorld({
      accountId: account.value.id,
      gameWorldId: gameWorld.id,
      rulesetVersion: ruleset,
      idempotencyKey: "join:entry",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    });
    if (!joined.ok) throw joined.error;
    const reservation = identity.reserveClub({
      clubId: CLUB,
      accountId: account.value.id,
      expiresOn: "2026-02-01",
      rulesetVersion: ruleset,
      idempotencyKey: "reserve:entry",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-04",
    });
    if (!reservation.ok) throw reservation.error;
    journey.push("RESERVED");

    // X-002: a jornada roda como saga durável arrendada (lease/fencing).
    const saga = eventing.startSaga({
      sagaType: "SAGA-03",
      correlationKey: `onboarding:${account.value.id}`,
      steps: ["risk-check", "confirm"],
      rulesetVersion: ruleset,
      idempotencyKey: "saga:entry",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-04",
    });
    if (!saga.ok) throw saga.error;
    const claim = eventing.claimSaga({
      sagaId: saga.value.id,
      owner: "onboarding-worker",
      nowMs: 1_000,
      leaseMs: 60_000,
      rulesetVersion: ruleset,
    });
    if (!claim.ok) throw claim.error;

    // Passo risk-check: C12 abre e decide um caso (audit hash-chain verificável).
    const riskCase = admin.openCase({
      subjects: [account.value.id],
      severity: 10,
      evidenceRefs: ["signup:ok"],
      openedBy: "risk-officer",
      rulesetVersion: ruleset,
      idempotencyKey: "case:entry",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-04",
    });
    expect(riskCase).toMatchObject({ ok: true });
    const riskStep = eventing.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      checkpointHash: "risk-approved",
      rulesetVersion: ruleset,
      idempotencyKey: "saga:entry:risk",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!riskStep.ok) throw riskStep.error;
    journey.push("RISK_OK");

    // Passo confirm: C1 ativa o controle único e a saga conclui.
    const control = identity.confirmOnboarding({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "onboard:entry",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!control.ok) throw control.error;
    const confirmStep = eventing.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      checkpointHash: "confirmed",
      rulesetVersion: ruleset,
      idempotencyKey: "saga:entry:confirm",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!confirmStep.ok) throw confirmStep.error;
    journey.push("CONTROL_ACTIVE");

    expect(identity.activeControlForClub(CLUB)!.accountId).toBe(account.value.id);
    expect(eventing.findSaga(saga.value.id)!.status).toBe("COMPLETED");
    expect(admin.verifyAuditChain()).toBe(true);
    // Screen contract (X-003): a sequência de estados da jornada é determinística.
    expect(journey).toEqual(["RESERVED", "RISK_OK", "CONTROL_ACTIVE"]);

    // Compensação: outra entrada com risco rejeitado libera a vaga e compensa a saga.
    const CLUB2 = "019f0000-0000-7000-8000-0000000000c9" as IdentityClubRef;
    const account2 = identity.registerAccount({
      locale: "pt-BR",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:reject",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!account2.ok) throw account2.error;
    const reservation2 = identity.reserveClub({
      clubId: CLUB2,
      accountId: account2.value.id,
      expiresOn: "2026-02-01",
      rulesetVersion: ruleset,
      idempotencyKey: "reserve:reject",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-04",
    });
    if (!reservation2.ok) throw reservation2.error;
    const saga2 = eventing.startSaga({
      sagaType: "SAGA-03",
      correlationKey: `onboarding:${account2.value.id}`,
      steps: ["risk-check", "confirm"],
      rulesetVersion: ruleset,
      idempotencyKey: "saga:reject",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-04",
    });
    if (!saga2.ok) throw saga2.error;
    const claim2 = eventing.claimSaga({
      sagaId: saga2.value.id,
      owner: "onboarding-worker",
      nowMs: 2_000,
      leaseMs: 60_000,
      rulesetVersion: ruleset,
    });
    if (!claim2.ok) throw claim2.error;
    const released = identity.releaseReservation({
      reservationId: reservation2.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "release:reject",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    expect(released).toMatchObject({ ok: true, value: { status: "RELEASED" } });
    const compensated = eventing.compensateSaga({
      sagaId: saga2.value.id,
      fencingToken: claim2.value.fencingToken,
      reason: "risk-rejected",
      rulesetVersion: ruleset,
      idempotencyKey: "saga:reject:comp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    expect(compensated).toMatchObject({ ok: true, value: { status: "COMPENSATED" } });
    expect(identity.activeControlForClub(CLUB2)).toBeNull();

    // Programa de Clube Novo (T004): uma terceira conta assume um clube distinto
    // sem conflitar com os anteriores.
    const CLUB_NEW = "019f0000-0000-7000-8000-0000000000ca" as IdentityClubRef;
    const account3 = identity.registerAccount({
      locale: "pt-BR",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:newclub",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!account3.ok) throw account3.error;
    const reservation3 = identity.reserveClub({
      clubId: CLUB_NEW,
      accountId: account3.value.id,
      expiresOn: "2026-02-01",
      rulesetVersion: ruleset,
      idempotencyKey: "reserve:newclub",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    if (!reservation3.ok) throw reservation3.error;
    const controlNew = identity.confirmOnboarding({
      reservationId: reservation3.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "onboard:newclub",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-07",
    });
    expect(controlNew).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(identity.activeControlForClub(CLUB_NEW)!.accountId).toBe(account3.value.id);
  });
});
