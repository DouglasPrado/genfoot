import { describe, expect, it } from "vitest";

import { Budget } from "./budget.js";
import { BudgetAreaKind } from "./budget-types.js";
import type { LedgerRepository } from "./ledger-repository.js";
import { assertBudgetAvailable, assertCashAvailable } from "./spend-guard.js";

function ledgerWithCash(cashMinor: bigint): LedgerRepository {
  return {
    findAccount: () => Promise.resolve(null),
    saveAccount: () => Promise.resolve(),
    appendJournalEntry: () => Promise.resolve(true),
    sumClubCashMinor: () => Promise.resolve(cashMinor),
  };
}

const budget = (() => {
  const opened = Budget.open({
    id: "b",
    gameWorldId: "w" as never,
    clubId: "c" as never,
    currencyId: "cur",
    authorizedTotalMinor: 100_000_000n,
    allocations: [
      { area: BudgetAreaKind.WAGES, authorizedMinor: 60_000_000n },
      { area: BudgetAreaKind.TRANSFERS, authorizedMinor: 40_000_000n },
    ],
  });
  if (!opened.ok) throw opened.error;
  return opened.value;
})();

describe("assertCashAvailable", () => {
  it("aprova e devolve o caixa quando cobre o gasto", async () => {
    const result = await assertCashAvailable(
      ledgerWithCash(500_000_000n),
      "w" as never,
      "c" as never,
      100_000_000n,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(500_000_000n);
  });

  it("recusa com CASH_INSUFFICIENT quando o caixa não cobre", async () => {
    const result = await assertCashAvailable(
      ledgerWithCash(50_000_000n),
      "w" as never,
      "c" as never,
      100_000_000n,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CASH_INSUFFICIENT");
  });
});

describe("assertBudgetAvailable", () => {
  it("aprova quando a área tem autorização disponível", () => {
    expect(assertBudgetAvailable(budget, BudgetAreaKind.TRANSFERS, 40_000_000n).ok).toBe(true);
  });

  it("folha estourada recusa com WAGE_BUDGET_EXCEEDED", () => {
    const result = assertBudgetAvailable(budget, BudgetAreaKind.WAGES, 61_000_000n);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WAGE_BUDGET_EXCEEDED");
  });

  it("outras áreas estouradas recusam com BUDGET_INSUFFICIENT", () => {
    const result = assertBudgetAvailable(budget, BudgetAreaKind.TRANSFERS, 41_000_000n);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("BUDGET_INSUFFICIENT");
  });
});
