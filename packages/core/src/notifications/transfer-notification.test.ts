import { describe, expect, it } from "vitest";

import { NotificationType } from "./notification-types.js";
import { buildTransferNotification } from "./transfer-notification.js";

const BASE = {
  gameWorldId: "019f0000-0000-7000-8000-000000000001",
  worldSeed: "grinta-demo",
  buyingClubId: "019f0000-0000-7000-8000-0000000000b2",
  playerId: "019f0000-0000-7000-8000-0000000000c3",
  playerName: "João Silva",
  feeMinor: 108_900_653n,
  occurredOn: "2026-01-01",
};

describe("buildTransferNotification — a caixa de entrada do clube (C12)", () => {
  it("é club-scoped: pertence ao clube comprador, sem usuário-alvo", () => {
    const n = buildTransferNotification(BASE);
    expect(n.clubId).toBe(BASE.buyingClubId);
    expect(n.userId).toBeNull();
    expect(n.type).toBe(NotificationType.TRANSFER_OFFER);
  });

  it("relata o jogador e o valor", () => {
    const n = buildTransferNotification(BASE);
    expect(n.message).toContain("João Silva");
    expect(n.message).toContain("1.089.006,53");
  });

  it("é determinística pelo fato: mesmo mundo/jogador/data ⇒ mesmo id", () => {
    expect(buildTransferNotification(BASE).id).toBe(
      buildTransferNotification(BASE).id,
    );
  });

  it("fatos diferentes ⇒ notificações diferentes", () => {
    expect(
      buildTransferNotification({ ...BASE, playerId: "019f0000-0000-7000-8000-0000000000d4" }).id,
    ).not.toBe(buildTransferNotification(BASE).id);
  });
});
