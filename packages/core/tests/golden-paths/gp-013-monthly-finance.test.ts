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

// GP-013 · Monthly finance — convergência C9 (ledger) + C11 (relatório). O mês
// fecha com receitas e folha lançadas em dobro (conservação), a reconciliação
// mede residual zero e um relatório financeiro reconstruível é gerado.

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-013",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-013 Monthly finance (convergence)", () => {
  it("fecha o mês com conservação e gera um relatório reconstruível", () => {
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
    const revenue = ledger.openLedgerAccount({
      name: "Receita",
      type: "REVENUE",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:rev",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    const payroll = ledger.openLedgerAccount({
      name: "Folha",
      type: "EXPENSE",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:exp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!cash.ok || !revenue.ok || !payroll.ok) throw new Error("contas");

    // Receita de bilheteria: debita caixa, credita receita.
    const income = ledger.postTransaction({
      transactionClass: "MATCHDAY_REVENUE",
      occurredOn: "2026-01-31",
      entries: [
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 3000 },
        { accountId: revenue.value.id, direction: "CREDIT", amountMinor: 3000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:income",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-31",
    });
    // Folha: debita despesa, credita caixa.
    const wages = ledger.postTransaction({
      transactionClass: "PAYROLL",
      occurredOn: "2026-01-31",
      entries: [
        { accountId: payroll.value.id, direction: "DEBIT", amountMinor: 1800 },
        { accountId: cash.value.id, direction: "CREDIT", amountMinor: 1800 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:payroll",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-31",
    });
    if (!income.ok || !wages.ok) throw new Error("lançamentos");

    // Caixa líquido do mês = 3000 - 1800.
    expect(ledger.accountBalance(cash.value.id)).toBe(1200);

    // Reconciliação: residual global zero.
    const reconciled = ledger.reconcileWorldLedger({
      asOf: "2026-01-31",
      rulesetVersion: ruleset,
      idempotencyKey: "recon:jan",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-31",
    });
    expect(reconciled).toMatchObject({ ok: true, value: { residualMinor: 0 } });

    // C11: relatório financeiro reconstruível (mesmo hash para as mesmas fontes).
    const inboxR = WorldInbox.initialize(gameWorld);
    if (!inboxR.ok) throw inboxR.error;
    const inbox = inboxR.value;
    const reportInput = (key: string) => ({
      definitionId: "monthly-finance",
      version: "1.0.0",
      asOf: "2026-01-31",
      sourceVersions: [`ledger@${ledger.snapshot().revision}`],
      rulesetVersion: ruleset,
      idempotencyKey: key,
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    const report = inbox.generateReport(reportInput("rep:1"));
    const rebuilt = inbox.generateReport(reportInput("rep:2"));
    if (!report.ok || !rebuilt.ok) throw new Error("relatório");
    expect(report.value.reportHash).toBe(rebuilt.value.reportHash);
  });
});
