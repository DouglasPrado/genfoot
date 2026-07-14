import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  classifyRealtimeEvent,
  GameWorld,
  WorldIdentity,
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
  it("retoma após o cooldown e recupera o realtime sem duplicar", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const identityR = WorldIdentity.initialize(gameWorld, 30);
    if (!identityR.ok) throw identityR.error;
    const identity = identityR.value;

    const reservation = identity.reserveClub({
      clubId: CLUB,
      accountId: ACCOUNT,
      expiresOn: "2026-01-10",
      rulesetVersion: ruleset,
      idempotencyKey: "reserve:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!reservation.ok) throw reservation.error;
    const control = identity.confirmOnboarding({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "onboard:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    if (!control.ok) throw control.error;

    // O gestor se ausenta: encerra o controle e entra em cooldown.
    const ended = identity.endClubControl({
      controlId: control.value.id,
      reason: "SABBATICAL",
      endedOn: "2026-06-01",
      rulesetVersion: ruleset,
      idempotencyKey: "end:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-01",
    });
    expect(ended).toMatchObject({ ok: true, value: { status: "ENDED" } });

    // Tenta retornar durante o cooldown → bloqueado sem escrita parcial.
    expect(
      identity.requestClubSwitch({
        accountId: ACCOUNT,
        targetClubId: CLUB2,
        expiresOn: "2026-06-20",
        rulesetVersion: ruleset,
        idempotencyKey: "return:early",
        worldSeed: gameWorld.seed,
        worldDate: "2026-06-10",
      }),
    ).toMatchObject({ ok: false, error: { code: "COOLDOWN_ACTIVE" } });

    // Retorna após o cooldown → nova reserva íntegra (fatos anteriores preservados).
    const returned = identity.requestClubSwitch({
      accountId: ACCOUNT,
      targetClubId: CLUB2,
      expiresOn: "2026-08-15",
      rulesetVersion: ruleset,
      idempotencyKey: "return:ok",
      worldSeed: gameWorld.seed,
      worldDate: "2026-08-01",
    });
    expect(returned).toMatchObject({ ok: true, value: { status: "HELD" } });
    // O controle anterior encerrado permanece no histórico.
    expect(
      identity.snapshot().controls.some((c) => c.status === "ENDED"),
    ).toBe(true);

    // Reconexão do cliente: aplica o próximo evento, ignora duplicata, detecta gap.
    expect(classifyRealtimeEvent(41, 42).result).toBe("APPLIED");
    expect(classifyRealtimeEvent(42, 42).result).toBe("DUPLICATE");
    expect(classifyRealtimeEvent(42, 50).result).toBe("GAP");
  });
});
