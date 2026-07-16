import { describe, expect, it } from "vitest";

import { ClubControl } from "../../src/identity/club-control.js";
import { ControlStatus } from "../../src/identity/identity-types.js";

const base: {
  gameWorldId: string;
  clubId: string;
  worldParticipantId: string;
  worldSeed: string;
  occurredOn: string;
} = {
  gameWorldId: "019b76da-a800-7787-9462-49c009be1111",
  clubId: "019b76da-a800-7787-9462-49c009be3333",
  worldParticipantId: "019b76da-a800-7787-9462-49c009be2222",
  worldSeed: "grinta-demo",
  occurredOn: "2026-01-05",
};

function start(over: Partial<typeof base> = {}) {
  const result = ClubControl.start({ ...base, ...over });
  if (!result.ok) throw new Error(`esperava sucesso: ${result.error.code}`);
  return result.value;
}

describe("ClubControl.start", () => {
  it("começa ativo, na data do mundo, sem fim nem motivo", () => {
    const snapshot = start().snapshot();
    expect(snapshot.status).toBe(ControlStatus.ACTIVE);
    expect(snapshot.startsOn).toBe("2026-01-05");
    expect(snapshot.endedOn).toBeNull();
    expect(snapshot.endedReason).toBeNull();
    expect(snapshot.version).toBe(1);
  });

  /**
   * A divergência central que a task fecha. O `ClubControlSnapshot` antigo
   * apontava para `accountId`; o schema aponta para `worldParticipantId`
   * (schema.prisma:895). Não era renomeio: são entidades diferentes —
   * controle→conta vs controle→participação-no-mundo. A conta é global (R-172)
   * e não sabe de mundo; quem sabe é a participação.
   */
  it("aponta para a participação no mundo, não para a conta", () => {
    expect(start().snapshot().worldParticipantId).toBe(base.worldParticipantId);
  });

  it("o id é determinístico", () => {
    expect(start().snapshot().id).toBe(start().snapshot().id);
  });

  it("clubes diferentes têm controles com ids diferentes", () => {
    expect(start().snapshot().id).not.toBe(
      start({ clubId: "019b76da-a800-7787-9462-49c009be9999" }).snapshot().id,
    );
  });

  it("recusa data do mundo inválida", () => {
    expect(ClubControl.start({ ...base, occurredOn: "05/01/2026" }).ok).toBe(false);
  });
});

describe("ClubControl.end", () => {
  it("encerra registrando quando E por quê", () => {
    const control = start();
    const result = control.end("SWITCH_REQUESTED", "2026-06-01");
    expect(result.ok).toBe(true);
    expect(control.snapshot().status).toBe(ControlStatus.ENDED);
    expect(control.snapshot().endedOn).toBe("2026-06-01");
    expect(control.snapshot().endedReason).toBe("SWITCH_REQUESTED");
    expect(control.snapshot().version).toBe(2);
  });

  /**
   * `ClubControlEndedEvent.reason` é OBRIGATÓRIO (identity-types.ts:119) e o
   * schema não tinha coluna para ele: o motivo existia no evento e evaporava na
   * gravação. Encerrar sem motivo deixaria a auditoria sem responder "por quê" —
   * que é a única pergunta que interessa quando um gestor perde o clube.
   */
  it("recusa encerrar sem motivo", () => {
    const result = start().end("  ", "2026-06-01");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CONTROLE_INVALIDO");
  });

  it("encerrar de novo é idempotente e mantém o primeiro motivo", () => {
    const control = start();
    control.end("SWITCH_REQUESTED", "2026-06-01");
    control.end("ADMIN_FORCED", "2026-07-01");
    expect(control.snapshot().version).toBe(2);
    expect(control.snapshot().endedReason).toBe("SWITCH_REQUESTED");
    expect(control.snapshot().endedOn).toBe("2026-06-01");
  });

  it("recusa encerrar antes de ter começado", () => {
    expect(start().end("SWITCH_REQUESTED", "2026-01-04").ok).toBe(false);
  });

  it("aceita encerrar no mesmo dia em que começou", () => {
    expect(start().end("SWITCH_REQUESTED", "2026-01-05").ok).toBe(true);
  });
});

describe("ClubControl.fromSnapshot", () => {
  it("aceita snapshot válido", () => {
    expect(ClubControl.fromSnapshot(start().snapshot()).ok).toBe(true);
  });

  // Estado, data e motivo têm de contar a mesma história.
  it("recusa ativo com data de fim", () => {
    const snapshot = { ...start().snapshot(), endedOn: "2026-06-01" };
    expect(ClubControl.fromSnapshot(snapshot).ok).toBe(false);
  });

  it("recusa ativo com motivo de fim", () => {
    const snapshot = { ...start().snapshot(), endedReason: "SWITCH_REQUESTED" };
    expect(ClubControl.fromSnapshot(snapshot).ok).toBe(false);
  });

  it("recusa encerrado sem data", () => {
    const snapshot = {
      ...start().snapshot(),
      status: ControlStatus.ENDED,
      endedReason: "SWITCH_REQUESTED",
    };
    expect(ClubControl.fromSnapshot(snapshot).ok).toBe(false);
  });

  it("recusa encerrado sem motivo", () => {
    const snapshot = {
      ...start().snapshot(),
      status: ControlStatus.ENDED,
      endedOn: "2026-06-01",
    };
    expect(ClubControl.fromSnapshot(snapshot).ok).toBe(false);
  });

  it("recusa fim anterior ao início", () => {
    const snapshot = {
      ...start().snapshot(),
      status: ControlStatus.ENDED,
      endedOn: "2026-01-04",
      endedReason: "SWITCH_REQUESTED",
    };
    expect(ClubControl.fromSnapshot(snapshot).ok).toBe(false);
  });

  it("recusa versão inválida", () => {
    expect(ClubControl.fromSnapshot({ ...start().snapshot(), version: 0 }).ok).toBe(
      false,
    );
  });
});
