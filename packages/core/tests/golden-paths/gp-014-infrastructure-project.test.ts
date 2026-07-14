import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldInbox,
  WorldLedger,
  type GameWorldSnapshot,
} from "../../src/index.js";

// GP-014 · Infrastructure project — convergência C9 (financiamento por fases) +
// C11 (registro de conclusão). A obra (SAGA-04 é owner em C3) é financiada em
// parcelas: cada fase reserva e liquida fundos; a conservação é preservada e a
// conclusão vira um record histórico. A saga de obra em si é do C3.

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-014",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-014 Infrastructure project (convergence)", () => {
  it("financia a obra em parcelas com conservação e registra a conclusão", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const ledgerR = WorldLedger.initialize(gameWorld);
    if (!ledgerR.ok) throw ledgerR.error;
    const ledger = ledgerR.value;

    const cash = ledger.openLedgerAccount({
      name: "Caixa",
      type: "ASSET",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:cash",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    const faucet = ledger.openLedgerAccount({
      name: "Injeção",
      type: "FAUCET",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:faucet",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!cash.ok || !faucet.ok) throw new Error("contas");
    const funded = ledger.postTransaction({
      transactionClass: "SEASON_INJECTION",
      occurredOn: "2026-01-02",
      entries: [
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 6000 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 6000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!funded.ok) throw funded.error;

    // Três parcelas da obra: reservar e liquidar cada fase.
    const phases = [
      { key: "foundation", amount: 2000, on: "2026-02-01" },
      { key: "structure", amount: 2000, on: "2026-03-01" },
      { key: "finishing", amount: 1000, on: "2026-04-01" },
    ];
    for (const phase of phases) {
      const reservation = ledger.reserveFunds({
        accountId: cash.value.id,
        purpose: `PROJECT:${phase.key}`,
        amountMinor: phase.amount,
        expiresOn: phase.on,
        rulesetVersion: ruleset,
        idempotencyKey: `res:${phase.key}`,
        worldSeed: gameWorld.seed,
        worldDate: phase.on,
      });
      if (!reservation.ok) throw reservation.error;
      const settled = ledger.settleReservation({
        reservationId: reservation.value.id,
        rulesetVersion: ruleset,
        idempotencyKey: `settle:${phase.key}`,
        worldSeed: gameWorld.seed,
        worldDate: phase.on,
      });
      expect(settled).toMatchObject({ ok: true, value: { status: "SETTLED" } });
    }

    // Todas as reservas liquidadas; disponível volta ao saldo pleno; conservação.
    expect(ledger.availableBalance(cash.value.id)).toBe(6000);
    expect(ledger.summary().activeReservationCount).toBe(0);
    expect(ledger.summary().residualMinor).toBe(0);

    // C11: conclusão da obra registrada na memória (idempotente).
    const inboxR = WorldInbox.initialize(gameWorld);
    if (!inboxR.ok) throw inboxR.error;
    const inbox = inboxR.value;
    const record = inbox.establishRecord({
      category: "INFRASTRUCTURE_COMPLETED",
      holder: "club-1:stadium-expansion",
      value: 5000,
      achievedOn: "2026-04-01",
      factRef: "project:stadium-expansion",
      rulesetVersion: ruleset,
      idempotencyKey: "record:project",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-01",
    });
    expect(record).toMatchObject({
      ok: true,
      value: { category: "INFRASTRUCTURE_COMPLETED" },
    });
  });
});
