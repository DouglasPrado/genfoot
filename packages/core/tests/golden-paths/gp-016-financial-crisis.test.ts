import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldLedger,
  WorldNarrative,
  type GameWorldSnapshot,
  type NarrativeClubRef,
} from "../../src/index.js";

// GP-016 · Financial crisis — convergência C9 (ledger) → C10 (narrativa). O clube
// entra em aperto financeiro: uma reserva além do disponível é recusada
// (INSUFFICIENT_FUNDS), a crise financeira é aberta e resolvida por um plano de
// austeridade — sem criar dinheiro (conservação preservada).

const CLUB = "019f0000-0000-7000-8000-0000000000c1" as NarrativeClubRef;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-016",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-016 Financial crisis (convergence)", () => {
  it("detecta o aperto financeiro, abre e resolve a crise sem criar dinheiro", () => {
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
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 500 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 500 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!funded.ok) throw funded.error;

    // C9: reservar mais do que há disponível é recusado (aperto financeiro).
    expect(
      ledger.reserveFunds({
        accountId: cash.value.id,
        purpose: "PAYROLL",
        amountMinor: 1500,
        expiresOn: "2026-02-01",
        rulesetVersion: ruleset,
        idempotencyKey: "res:payroll",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-31",
      }),
    ).toMatchObject({ ok: false, error: { code: "INSUFFICIENT_FUNDS" } });
    // A oferta monetária não muda por uma reserva recusada.
    expect(ledger.summary().residualMinor).toBe(0);

    // C10: abre e resolve a crise financeira por austeridade.
    const narrativeR = WorldNarrative.initialize(gameWorld);
    if (!narrativeR.ok) throw narrativeR.error;
    const narrative = narrativeR.value;
    const crisis = narrative.openCrisis({
      clubId: CLUB,
      cause: "CASH_SHORTFALL",
      severity: 90,
      rulesetVersion: ruleset,
      idempotencyKey: "crisis:fin",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    expect(crisis).toMatchObject({ ok: true, value: { status: "OPEN" } });
    if (!crisis.ok) throw crisis.error;
    const recovery = narrative.submitRecoveryPlan({
      crisisId: crisis.value.id,
      plan: "reduzir folha e renegociar dívidas",
      rulesetVersion: ruleset,
      idempotencyKey: "plan:fin",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-10",
    });
    expect(recovery).toMatchObject({ ok: true, value: { status: "RECOVERY" } });
    const resolved = narrative.resolveCrisis({
      crisisId: crisis.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "resolve:fin",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-01",
    });
    expect(resolved).toMatchObject({ ok: true, value: { status: "RESOLVED" } });

    // Depois da austeridade, uma reserva dentro do disponível passa.
    expect(
      ledger.reserveFunds({
        accountId: cash.value.id,
        purpose: "PAYROLL_REDUCED",
        amountMinor: 400,
        expiresOn: "2026-05-01",
        rulesetVersion: ruleset,
        idempotencyKey: "res:reduced",
        worldSeed: gameWorld.seed,
        worldDate: "2026-04-15",
      }),
    ).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(ledger.summary().residualMinor).toBe(0);
  });
});
