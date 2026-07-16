import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldEventing,
  ClubControl,
  ClubEntryReservation,
  WorldParticipant,
  WorldInbox,
  type GameWorldSnapshot,
  type IdentityAccountRef,
  type IdentityClubRef,
} from "../../src/index.js";

// GP-003 · Club exit or switch — convergência C1: encerrar o controle libera a
// vaga para outro controlador (handover) e inicia cooldown de quem saiu; o novo
// controlador assume uma única vez, preservando o histórico do anterior.

const OUTGOING = "019f0000-0000-7000-8000-0000000000a1" as IdentityAccountRef;
const INCOMING = "019f0000-0000-7000-8000-0000000000b1" as IdentityAccountRef;
const CLUB = "019f0000-0000-7000-8000-0000000000c1" as IdentityClubRef;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-003",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

/** R-175: roots por entidade. O `WorldIdentity` que os continha não existe mais. */
function participantOf(
  gameWorld: GameWorldSnapshot,
  accountId: string,
  occurredOn: string,
): string {
  const joined = WorldParticipant.join({
    gameWorldId: gameWorld.id,
    accountId,
    worldSeed: gameWorld.seed,
    occurredOn,
  });
  if (!joined.ok) throw joined.error;
  return joined.value.snapshot().id;
}

function controlOf(
  gameWorld: GameWorldSnapshot,
  worldParticipantId: string,
  clubId: IdentityClubRef,
  occurredOn: string,
): ClubControl {
  const reservation = ClubEntryReservation.hold({
    gameWorldId: gameWorld.id,
    clubId,
    worldParticipantId,
    worldSeed: gameWorld.seed,
        attemptKey: "t1",
    occurredOn,
    expiresOn: "2026-12-31",
  });
  if (!reservation.ok) throw reservation.error;
  if (!reservation.value.confirm().ok) throw new Error("confirmação falhou");

  const control = ClubControl.start({
    gameWorldId: gameWorld.id,
    clubId,
    worldParticipantId,
    worldSeed: gameWorld.seed,
        attemptKey: "t1",
    occurredOn,
  });
  if (!control.ok) throw control.error;
  return control.value;
}

describe("GP-003 Club exit or switch (convergence)", () => {
  /**
   * "Uma única vez" saiu daqui, e é o ponto da R-175.
   *
   * Que o clube não possa ser reservado enquanto A controla, e que só um
   * assuma depois que A sai, são invariantes que o mega-agregado sustentava
   * varrendo arrays. Hoje são índices únicos PARCIAIS no Postgres
   * (`WHERE status = 'ACTIVE'` / `WHERE status = 'HELD'`), e quem as prova é
   * `packages/persistence/tests/identity-commands.test.ts` — inclusive o
   * handover ("o clube liberado pode ser assumido por outro"), que é
   * literalmente este golden path contra o banco.
   *
   * Sobra aqui a mecânica pura: a saída é registrada com motivo e data, e o
   * sucessor é outra participação.
   */
  it("a saída registra motivo e data, e o sucessor é outra participação", () => {
    const gameWorld = world();
    const saindo = participantOf(gameWorld, OUTGOING, "2026-01-05");
    const control = controlOf(gameWorld, saindo, CLUB, "2026-01-06");

    // A sai: o motivo é obrigatório — antes ele existia no evento e evaporava
    // na gravação, por falta de coluna.
    expect(control.end("EXIT", "2026-03-01")).toMatchObject({
      ok: true,
      value: { status: "ENDED", endedOn: "2026-03-01", endedReason: "EXIT" },
    });
    expect(control.end("  ", "2026-03-02")).toMatchObject({ ok: true });

    // Handover: B assume, e é um controle NOVO, de outra participação.
    const entrando = participantOf(gameWorld, INCOMING, "2026-03-05");
    const newControl = controlOf(gameWorld, entrando, CLUB, "2026-03-06");
    expect(newControl.snapshot()).toMatchObject({
      status: "ACTIVE",
      worldParticipantId: entrando,
    });
    expect(newControl.snapshot().id).not.toBe(control.snapshot().id);

    // Histórico do controlador anterior preservado, com o porquê.
    expect(control.snapshot()).toMatchObject({
      status: "ENDED",
      endedReason: "EXIT",
    });
  });

  it("orquestra o handover via SAGA (X-002), transfere pendências (C11) e cooldown", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const saindo = participantOf(gameWorld, OUTGOING, "2026-01-05");
    const control = controlOf(gameWorld, saindo, CLUB, "2026-01-06");

    // A sai: encerra o controle.
    const exit = control.end("SABBATICAL", "2026-06-01");
    if (!exit.ok) throw exit.error;

    // X-002: o handover roda como saga durável (end-control → transfer-pendings).
    const eventingR = WorldEventing.initialize(gameWorld);
    if (!eventingR.ok) throw eventingR.error;
    const eventing = eventingR.value;
    const saga = eventing.startSaga({
      sagaType: "SAGA-HANDOVER",
      correlationKey: `handover:${CLUB}`,
      steps: ["end-control", "transfer-pendings"],
      rulesetVersion: ruleset,
      idempotencyKey: "handover:saga",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-02",
    });
    if (!saga.ok) throw saga.error;
    const claim = eventing.claimSaga({
      sagaId: saga.value.id,
      owner: "handover-worker",
      nowMs: 1_000,
      leaseMs: 60_000,
      rulesetVersion: ruleset,
    });
    if (!claim.ok) throw claim.error;

    // C11: as pendências/objetivos herdados são projetadas ao novo controlador.
    const inboxR = WorldInbox.initialize(gameWorld);
    if (!inboxR.ok) throw inboxR.error;
    const pending = inboxR.value.projectNotification({
      dedupKey: `inherited-pendings:${CLUB}`,
      recipientScope: "manager:incoming",
      category: "HANDOVER",
      priority: "NORMAL",
      sourceRef: `control-ended:${control.snapshot().id}`,
      rulesetVersion: ruleset,
      idempotencyKey: "handover:pendings",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-02",
    });
    expect(pending).toMatchObject({ ok: true, value: { category: "HANDOVER" } });

    for (const step of ["end-control", "transfer-pendings"]) {
      const advanced = eventing.advanceSagaStep({
        sagaId: saga.value.id,
        fencingToken: claim.value.fencingToken,
        checkpointHash: `${step}-ok`,
        rulesetVersion: ruleset,
        idempotencyKey: `handover:${step}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-06-02",
      });
      if (!advanced.ok) throw advanced.error;
    }
    expect(eventing.findSaga(saga.value.id)!.status).toBe("COMPLETED");

    // Cooldown de quem saiu: bloqueia a troca, e libera depois. O castigo é
    // atributo da participação (não agregado — não é root no context map:67).
    const joined = WorldParticipant.join({
      gameWorldId: gameWorld.id,
      accountId: OUTGOING,
      worldSeed: gameWorld.seed,
      occurredOn: "2026-01-05",
    });
    if (!joined.ok) throw joined.error;
    expect(joined.value.startCooldown("2026-07-01").ok).toBe(true);
    expect(joined.value.isInCooldownOn("2026-06-10")).toBe(true);
    expect(joined.value.isInCooldownOn("2026-08-01")).toBe(false);
  });

  it("compensa um handover interrompido com auditoria consistente (X-002)", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const eventingR = WorldEventing.initialize(gameWorld);
    if (!eventingR.ok) throw eventingR.error;
    const eventing = eventingR.value;

    const saga = eventing.startSaga({
      sagaType: "SAGA-HANDOVER",
      correlationKey: "handover:aborted",
      steps: ["end-control", "transfer-pendings"],
      rulesetVersion: ruleset,
      idempotencyKey: "handover:abort:saga",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-02",
    });
    if (!saga.ok) throw saga.error;
    const claim = eventing.claimSaga({
      sagaId: saga.value.id,
      owner: "handover-worker",
      nowMs: 1_000,
      leaseMs: 60_000,
      rulesetVersion: ruleset,
    });
    if (!claim.ok) throw claim.error;
    const step0 = eventing.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      checkpointHash: "end-control-ok",
      rulesetVersion: ruleset,
      idempotencyKey: "handover:abort:step0",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-02",
    });
    if (!step0.ok) throw step0.error;

    const compensated = eventing.compensateSaga({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      reason: "handover-aborted",
      rulesetVersion: ruleset,
      idempotencyKey: "handover:abort:comp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-03",
    });
    expect(compensated).toMatchObject({ ok: true, value: { status: "COMPENSATED" } });
    // auditoria: o fato de conclusão sai como SagaCompleted(outcome COMPENSATED).
    expect(
      eventing.snapshot().events.filter((e) => e.type === "SagaCompleted"),
    ).toHaveLength(1);
  });
});
