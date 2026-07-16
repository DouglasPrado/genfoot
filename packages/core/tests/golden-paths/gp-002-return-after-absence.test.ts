import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  classifyRealtimeEvent,
  ClubControl,
  ClubEntryReservation,
  GameWorld,
  WorldEventing,
  WorldInbox,
  WorldParticipant,
  type GameWorldSnapshot,
  type IdentityAccountRef,
  type IdentityClubRef,
} from "../../src/index.js";

// GP-002 · Return after absence — convergência C1 (controle/cooldown/troca) +
// X-003 (reconexão realtime sem duplicar). Quem saiu retoma do estado oficial:
// a troca é bloqueada no cooldown e liberada depois; o realtime recupera gaps
// e ignora duplicatas ao voltar.

const ACCOUNT = "019f0000-0000-7000-8000-0000000000a1" as IdentityAccountRef;
const CLUB = "019f0000-0000-7000-8000-0000000000c1" as IdentityClubRef;
const CLUB2 = "019f0000-0000-7000-8000-0000000000c2" as IdentityClubRef;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-002",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-002 Return after absence (convergence)", () => {
  /**
   * R-175: os agregados são por entidade, e o mega-agregado `WorldIdentity`
   * não existe mais. Este teste segue puro — exercita a REGRA de cada root.
   *
   * O que ele deixou de cobrir, de propósito: as invariantes que cruzam
   * agregados (clube já tomado, cooldown barrando a reserva) saíram do domínio
   * para o caso de uso, e valem contra o Postgres — quem as prova agora é
   * `packages/persistence/tests/identity-commands.test.ts`, onde os índices
   * únicos parciais existem de verdade. Aqui, um `.some()` num array em memória
   * só provaria que o array em memória concorda consigo mesmo.
   */
  it("retoma após o cooldown e recupera o realtime sem duplicar", () => {
    const gameWorld = world();
    const participantR = WorldParticipant.join({
      gameWorldId: gameWorld.id,
      accountId: ACCOUNT,
      worldSeed: gameWorld.seed,
      occurredOn: "2026-01-05",
    });
    if (!participantR.ok) throw participantR.error;
    const participant = participantR.value;

    const reservation = ClubEntryReservation.hold({
      gameWorldId: gameWorld.id,
      clubId: CLUB,
      worldParticipantId: participant.snapshot().id,
      worldSeed: gameWorld.seed,
        attemptKey: "t1",
      occurredOn: "2026-01-05",
      expiresOn: "2026-01-10",
    });
    if (!reservation.ok) throw reservation.error;
    expect(reservation.value.confirm().ok).toBe(true);

    const controlR = ClubControl.start({
      gameWorldId: gameWorld.id,
      clubId: CLUB,
      worldParticipantId: participant.snapshot().id,
      worldSeed: gameWorld.seed,
        attemptKey: "t1",
      occurredOn: "2026-01-06",
    });
    if (!controlR.ok) throw controlR.error;
    const control = controlR.value;

    // O gestor se ausenta: encerra o controle e entra em cooldown de 30 dias.
    expect(control.end("SABBATICAL", "2026-06-01")).toMatchObject({
      ok: true,
      value: { status: "ENDED", endedReason: "SABBATICAL" },
    });
    expect(participant.startCooldown("2026-07-01").ok).toBe(true);

    // Durante o cooldown, a volta é barrada; depois dele, liberada.
    expect(participant.isInCooldownOn("2026-06-10")).toBe(true);
    expect(participant.isInCooldownOn("2026-08-01")).toBe(false);

    const returned = ClubEntryReservation.hold({
      gameWorldId: gameWorld.id,
      clubId: CLUB2,
      worldParticipantId: participant.snapshot().id,
      worldSeed: gameWorld.seed,
        attemptKey: "t1",
      occurredOn: "2026-08-01",
      expiresOn: "2026-08-15",
    });
    expect(returned).toMatchObject({ ok: true });
    // O controle anterior permanece encerrado, com o motivo — que antes existia
    // no evento e evaporava na gravação, por falta de coluna.
    expect(control.snapshot()).toMatchObject({
      status: "ENDED",
      endedOn: "2026-06-01",
      endedReason: "SABBATICAL",
    });

    // Reconexão do cliente: aplica o próximo evento, ignora duplicata, detecta gap.
    expect(classifyRealtimeEvent(41, 42).result).toBe("APPLIED");
    expect(classifyRealtimeEvent(42, 42).result).toBe("DUPLICATE");
    expect(classifyRealtimeEvent(42, 50).result).toBe("GAP");
  });

  it("retoma o realtime por resume token (X-002) e reconcilia pendências (C11)", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;

    // X-002: enquanto ausente, fatos entraram no stream do gestor.
    const eventingR = WorldEventing.initialize(gameWorld);
    if (!eventingR.ok) throw eventingR.error;
    const eventing = eventingR.value;
    const published = eventing.publishOutboxBatch({
      stream: "manager:club-1",
      messages: [
        { eventType: "MatchFinished", payloadHash: "m1", occurredOn: "2026-06-10" },
        { eventType: "PromiseBroken", payloadHash: "p1", occurredOn: "2026-06-12" },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "absence:batch",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-12",
    });
    if (!published.ok) throw published.error;

    // No retorno, o cliente retoma por sequence/resume token (recupera o gap).
    const resume = eventing.resumeRealtimeStream({
      audience: "manager:1",
      stream: "manager:club-1",
      fromSequence: 1,
      expiresOn: "2026-09-01",
      rulesetVersion: ruleset,
    });
    if (!resume.ok) throw resume.error;
    expect(resume.value.resumeToken).toMatch(/^[0-9a-f]{16}$/);
    // retomada idempotente devolve o mesmo cursor/token.
    const again = eventing.resumeRealtimeStream({
      audience: "manager:1",
      stream: "manager:club-1",
      fromSequence: 1,
      expiresOn: "2026-09-01",
      rulesetVersion: ruleset,
    });
    expect(again).toEqual(resume);
    // retomar além do publicado é rejeitado (gap).
    expect(
      eventing.resumeRealtimeStream({
        audience: "manager:1",
        stream: "manager:club-1",
        fromSequence: 9,
        expiresOn: "2026-09-01",
        rulesetVersion: ruleset,
      }),
    ).toMatchObject({ ok: false, error: { code: "SEQUENCE_GAP" } });

    // C11: as pendências herdadas são reconciliadas sem duplicar (dedup por chave).
    const inboxR = WorldInbox.initialize(gameWorld);
    if (!inboxR.ok) throw inboxR.error;
    const inbox = inboxR.value;
    const first = inbox.projectNotification({
      dedupKey: "inherited:promise-broken",
      recipientScope: "manager:club-1",
      category: "RETURN",
      priority: "HIGH",
      sourceRef: "p1",
      rulesetVersion: ruleset,
      idempotencyKey: "return:notif",
      worldSeed: gameWorld.seed,
      worldDate: "2026-08-01",
    });
    if (!first.ok) throw first.error;
    const revision = inbox.snapshot().revision;
    const duplicate = inbox.projectNotification({
      dedupKey: "inherited:promise-broken",
      recipientScope: "manager:club-1",
      category: "RETURN",
      priority: "HIGH",
      sourceRef: "p1",
      rulesetVersion: ruleset,
      idempotencyKey: "return:notif:dup",
      worldSeed: gameWorld.seed,
      worldDate: "2026-08-01",
    });
    expect(duplicate).toMatchObject({ ok: true, value: { id: first.value.id } });
    expect(inbox.snapshot().revision).toBe(revision);
  });
});
