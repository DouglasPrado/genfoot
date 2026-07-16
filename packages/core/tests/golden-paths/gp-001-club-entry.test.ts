import { newGameWorldId, parseRulesetVersion, WorldDate } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldAdmin,
  WorldEventing,
  ClubControl,
  ClubEntryReservation,
  WorldParticipant,
  UserAccount,
  type GameWorldSnapshot,
  type IdentityAccountRef,
  type IdentityClubRef,
} from "../../src/index.js";

// GP-001 · Club entry — convergência C1 (identidade/controle) + C12 (risco).
// Uma conta elegível reserva UMA vaga, ativa o controle UMA vez; a disputa da
// última vaga é resolvida por um único vencedor; repetir a intenção não duplica.

const ACCOUNT_A = "019f0000-0000-7000-8000-0000000000a1" as IdentityAccountRef;
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

/**
 * Reserva + confirma + ativa controle, com os agregados por entidade (R-175).
 * O que era `identity.reserveClub`/`confirmOnboarding` sobre um mega-agregado
 * agora são três roots independentes — e quem os costura numa transação é o
 * caso de uso, provado contra Postgres em `identity-commands.test.ts`.
 */
function assumeClub(
  gameWorld: GameWorldSnapshot,
  accountId: string,
  clubId: IdentityClubRef,
  occurredOn: string,
) {
  const participant = WorldParticipant.join({
    gameWorldId: gameWorld.id,
    accountId,
    worldSeed: gameWorld.seed,
    occurredOn,
  });
  if (!participant.ok) throw participant.error;
  const participantId = participant.value.snapshot().id;

  const reservation = ClubEntryReservation.hold({
    gameWorldId: gameWorld.id,
    clubId,
    worldParticipantId: participantId,
    worldSeed: gameWorld.seed,
        attemptKey: "t1",
    occurredOn,
    expiresOn: "2026-02-01",
  });
  if (!reservation.ok) throw reservation.error;

  return { participantId, reservation: reservation.value };
}

function activateControl(
  gameWorld: GameWorldSnapshot,
  participantId: string,
  clubId: IdentityClubRef,
  occurredOn: string,
) {
  const control = ClubControl.start({
    gameWorldId: gameWorld.id,
    clubId,
    worldParticipantId: participantId,
    worldSeed: gameWorld.seed,
        attemptKey: "t1",
    occurredOn,
  });
  if (!control.ok) throw control.error;
  return control.value;
}

describe("GP-001 Club entry (convergence)", () => {
  /**
   * R-175 mudou onde este golden path mora, e é uma mudança de fundo.
   *
   * As asserções de "UMA única vez" — B perde a disputa, o controle é único,
   * repetir o onboarding não duplica — eram sobre invariantes que o
   * mega-agregado sustentava varrendo arrays em memória. Elas agora são do
   * Postgres: índices únicos PARCIAIS (`ClubControl_um_ativo_por_clube`,
   * `ClubEntryReservation_uma_retida_por_clube`), e são provadas em
   * `packages/persistence/tests/identity-commands.test.ts`, contra o banco.
   *
   * Afirmá-las aqui provaria só que um array em memória concorda consigo mesmo
   * — que era exatamente a fragilidade que o JSON escondia. O que sobra neste
   * teste é o que É puro: elegibilidade (C12) e a regra de cada agregado.
   */
  it("uma conta elegível reserva e assume o controle", () => {
    const gameWorld = world();
    const adminR = WorldAdmin.initialize(gameWorld);
    if (!adminR.ok) throw adminR.error;
    const admin = adminR.value;

    // C12: conta A é elegível (risco baixo).
    expect(eligibilityOf(admin, gameWorld, ACCOUNT_A, 10)).toBe(true);

    const participantR = WorldParticipant.join({
      gameWorldId: gameWorld.id,
      accountId: ACCOUNT_A,
      worldSeed: gameWorld.seed,
      occurredOn: "2026-01-05",
    });
    if (!participantR.ok) throw participantR.error;
    const participantId = participantR.value.snapshot().id;

    // C1: A reserva a vaga, com prazo (R-25).
    const reservation = ClubEntryReservation.hold({
      gameWorldId: gameWorld.id,
      clubId: CLUB,
      worldParticipantId: participantId,
      worldSeed: gameWorld.seed,
        attemptKey: "t1",
      occurredOn: "2026-01-05",
      expiresOn: "2026-01-10",
    });
    expect(reservation).toMatchObject({ ok: true, value: {} });
    if (!reservation.ok) throw reservation.error;
    expect(reservation.value.snapshot().status).toBe("HELD");

    // C1: A conclui o onboarding e ativa o controle.
    expect(reservation.value.confirm()).toMatchObject({
      ok: true,
      value: { status: "CONFIRMED" },
    });
    const control = ClubControl.start({
      gameWorldId: gameWorld.id,
      clubId: CLUB,
      worldParticipantId: participantId,
      worldSeed: gameWorld.seed,
        attemptKey: "t1",
      occurredOn: "2026-01-06",
    });
    expect(control).toMatchObject({ ok: true, value: {} });
    if (!control.ok) throw control.error;
    expect(control.value.snapshot()).toMatchObject({
      status: "ACTIVE",
      clubId: CLUB,
      // Aponta para a participação, não para a conta: a conta é global (R-172)
      // e não sabe de mundo.
      worldParticipantId: participantId,
    });

    // Terminal é terminal: a reserva confirmada não volta a ser liberada, senão
    // a vaga que já foi para A seria dada de novo.
    expect(reservation.value.release()).toMatchObject({
      ok: false,
      error: { code: "RESERVA_TERMINAL" },
    });
  });

  it("orquestra a entrada via SAGA-03 (C1 + C12 risco + X-002) com compensação e clube novo", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const eventingR = WorldEventing.initialize(gameWorld);
    const adminR = WorldAdmin.initialize(gameWorld);
    if (!eventingR.ok) throw eventingR.error;
    if (!adminR.ok) throw adminR.error;
    const eventing = eventingR.value;
    const admin = adminR.value;

    // Estados que a tela do cliente (X-003) renderiza ao longo da jornada.
    const journey: string[] = [];

    // C1: conta registrada ingressa no mundo e reserva a vaga.
    const account = UserAccount.register({
      // R-172: a conta é de plataforma, não do mundo.
      email: "acc-entry@exemplo.com",
      name: "Gestor",
      occurredOn: "2026-01-02",
      idempotencySeed: gameWorld.seed,
    });
    if (!account.ok) throw account.error;
    const entry = assumeClub(gameWorld, account.value.snapshot().id, CLUB, "2026-01-04");
    journey.push("RESERVED");

    // X-002: a jornada roda como saga durável arrendada (lease/fencing).
    const saga = eventing.startSaga({
      sagaType: "SAGA-03",
      correlationKey: `onboarding:${account.value.snapshot().id}`,
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
      subjects: [account.value.snapshot().id],
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

    // Passo confirm: C1 ativa o controle e a saga conclui.
    if (!entry.reservation.confirm().ok) throw new Error("confirmação falhou");
    const control = activateControl(gameWorld, entry.participantId, CLUB, "2026-01-05");
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

    expect(control.snapshot().worldParticipantId).toBe(entry.participantId);
    expect(eventing.findSaga(saga.value.id)!.status).toBe("COMPLETED");
    expect(admin.verifyAuditChain()).toBe(true);
    // Screen contract (X-003): a sequência de estados da jornada é determinística.
    expect(journey).toEqual(["RESERVED", "RISK_OK", "CONTROL_ACTIVE"]);

    // Compensação: outra entrada com risco rejeitado libera a vaga e compensa a saga.
    const CLUB2 = "019f0000-0000-7000-8000-0000000000c9" as IdentityClubRef;
    const account2 = UserAccount.register({
      // R-172: a conta é de plataforma, não do mundo.
      email: "acc-reject@exemplo.com",
      name: "Gestor",
      occurredOn: "2026-01-02",
      idempotencySeed: gameWorld.seed,
    });
    if (!account2.ok) throw account2.error;
    const rejected = assumeClub(gameWorld, account2.value.snapshot().id, CLUB2, "2026-01-04");
    const saga2 = eventing.startSaga({
      sagaType: "SAGA-03",
      correlationKey: `onboarding:${account2.value.snapshot().id}`,
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
    // Risco rejeitado: a vaga volta ao pool sem nunca ter virado controle.
    expect(rejected.reservation.release()).toMatchObject({
      ok: true,
      value: { status: "RELEASED" },
    });
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
    // Nenhum controle nasceu para CLUB2 — a compensação é justamente isso.
    expect(rejected.reservation.snapshot().status).toBe("RELEASED");

    // Programa de Clube Novo (T004): uma terceira conta assume um clube distinto
    // sem conflitar com os anteriores.
    const CLUB_NEW = "019f0000-0000-7000-8000-0000000000ca" as IdentityClubRef;
    const account3 = UserAccount.register({
      // R-172: a conta é de plataforma, não do mundo.
      email: "acc-newclub@exemplo.com",
      name: "Gestor",
      occurredOn: "2026-01-02",
      idempotencySeed: gameWorld.seed,
    });
    if (!account3.ok) throw account3.error;
    const newClub = assumeClub(
      gameWorld,
      account3.value.snapshot().id,
      CLUB_NEW,
      "2026-01-06",
    );
    expect(newClub.reservation.confirm().ok).toBe(true);
    const controlNew = activateControl(
      gameWorld,
      newClub.participantId,
      CLUB_NEW,
      "2026-01-07",
    );
    expect(controlNew.snapshot()).toMatchObject({
      status: "ACTIVE",
      clubId: CLUB_NEW,
      worldParticipantId: newClub.participantId,
    });
  });
});
