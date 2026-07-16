import { describe, expect, it } from "vitest";

import { ClubEntryReservation } from "../../src/identity/club-entry-reservation.js";
import { ClubReservationStatus } from "../../src/identity/identity-types.js";

const base: {
  gameWorldId: string;
  clubId: string;
  worldParticipantId: string;
  worldSeed: string;
  occurredOn: string;
  expiresOn: string;
} = {
  gameWorldId: "019b76da-a800-7787-9462-49c009be1111",
  clubId: "019b76da-a800-7787-9462-49c009be3333",
  worldParticipantId: "019b76da-a800-7787-9462-49c009be2222",
  worldSeed: "grinta-demo",
  occurredOn: "2026-01-05",
  expiresOn: "2026-01-07",
};

function hold(over: Partial<typeof base> = {}) {
  const result = ClubEntryReservation.hold({ ...base, ...over });
  if (!result.ok) throw new Error(`esperava sucesso: ${result.error.code}`);
  return result.value;
}

describe("ClubEntryReservation.hold", () => {
  it("retém a vaga com prazo (R-25)", () => {
    const snapshot = hold().snapshot();
    expect(snapshot.status).toBe(ClubReservationStatus.HELD);
    expect(snapshot.heldOn).toBe("2026-01-05");
    expect(snapshot.expiresOn).toBe("2026-01-07");
    expect(snapshot.version).toBe(1);
  });

  /**
   * Aponta para a participação, não para a conta — mesma razão do ClubControl:
   * a conta é global (R-172) e não sabe de mundo. E o fluxo é entrar no mundo →
   * reservar → confirmar, então a participação já existe. Como a confirmação
   * vira controle, e o controle precisa da participação, guardá-la aqui torna a
   * conversão direta.
   */
  it("aponta para a participação no mundo", () => {
    expect(hold().snapshot().worldParticipantId).toBe(base.worldParticipantId);
  });

  // Prazo que vence antes de começar não é prazo.
  it("recusa prazo anterior à retenção", () => {
    expect(ClubEntryReservation.hold({ ...base, expiresOn: "2026-01-04" }).ok).toBe(
      false,
    );
  });

  it("aceita prazo no mesmo dia da retenção", () => {
    expect(ClubEntryReservation.hold({ ...base, expiresOn: "2026-01-05" }).ok).toBe(
      true,
    );
  });

  it("o id é determinístico", () => {
    expect(hold().snapshot().id).toBe(hold().snapshot().id);
  });

  it("recusa datas inválidas", () => {
    expect(ClubEntryReservation.hold({ ...base, occurredOn: "05/01/2026" }).ok).toBe(
      false,
    );
    expect(ClubEntryReservation.hold({ ...base, expiresOn: "07/01/2026" }).ok).toBe(
      false,
    );
  });
});

describe("ClubEntryReservation.confirm", () => {
  it("confirma a reserva retida", () => {
    const reservation = hold();
    expect(reservation.confirm().ok).toBe(true);
    expect(reservation.snapshot().status).toBe(ClubReservationStatus.CONFIRMED);
    expect(reservation.snapshot().version).toBe(2);
  });

  it("confirmar de novo é idempotente", () => {
    const reservation = hold();
    reservation.confirm();
    reservation.confirm();
    expect(reservation.snapshot().version).toBe(2);
  });

  // Terminal é terminal: uma reserva liberada não volta a valer, senão a vaga
  // que já foi para outro seria dada duas vezes.
  it.each([
    ["liberada", (r: ClubEntryReservation) => r.release()],
    ["expirada", (r: ClubEntryReservation) => r.expire("2026-01-08")],
  ])("recusa confirmar reserva %s", (_, terminate) => {
    const reservation = hold();
    terminate(reservation);
    const result = reservation.confirm();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("RESERVA_TERMINAL");
  });
});

describe("ClubEntryReservation.release", () => {
  it("libera a vaga", () => {
    const reservation = hold();
    expect(reservation.release().ok).toBe(true);
    expect(reservation.snapshot().status).toBe(ClubReservationStatus.RELEASED);
  });

  it("liberar de novo é idempotente", () => {
    const reservation = hold();
    reservation.release();
    reservation.release();
    expect(reservation.snapshot().version).toBe(2);
  });

  it("recusa liberar reserva já confirmada", () => {
    const reservation = hold();
    reservation.confirm();
    expect(reservation.release().ok).toBe(false);
  });
});

describe("ClubEntryReservation.expire", () => {
  it("expira depois do prazo", () => {
    const reservation = hold();
    expect(reservation.expire("2026-01-08").ok).toBe(true);
    expect(reservation.snapshot().status).toBe(ClubReservationStatus.EXPIRED);
  });

  // Expirar antes da hora tiraria a vaga de quem ainda tem prazo.
  it("recusa expirar antes do prazo", () => {
    const result = hold().expire("2026-01-06");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("RESERVA_INVALIDA");
  });

  it("recusa expirar no próprio dia do prazo — o prazo é até o fim dele", () => {
    expect(hold().expire("2026-01-07").ok).toBe(false);
  });

  it("expirar de novo é idempotente", () => {
    const reservation = hold();
    reservation.expire("2026-01-08");
    reservation.expire("2026-01-09");
    expect(reservation.snapshot().version).toBe(2);
  });

  it("recusa expirar reserva já confirmada", () => {
    const reservation = hold();
    reservation.confirm();
    expect(reservation.expire("2026-01-08").ok).toBe(false);
  });
});

describe("ClubEntryReservation.fromSnapshot", () => {
  it("aceita snapshot válido", () => {
    expect(ClubEntryReservation.fromSnapshot(hold().snapshot()).ok).toBe(true);
  });

  it("recusa prazo anterior à retenção", () => {
    const snapshot = { ...hold().snapshot(), expiresOn: "2026-01-04" };
    expect(ClubEntryReservation.fromSnapshot(snapshot).ok).toBe(false);
  });

  it("recusa versão inválida", () => {
    expect(
      ClubEntryReservation.fromSnapshot({ ...hold().snapshot(), version: 0 }).ok,
    ).toBe(false);
  });
});
