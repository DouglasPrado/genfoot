import { describe, expect, it } from "vitest";

import { Budget } from "./budget.js";
import { BudgetAreaKind, type BudgetSnapshot } from "./budget-types.js";

const base = {
  id: "budget-1",
  gameWorldId: "world-1" as never,
  clubId: "club-1" as never,
  currencyId: "cur-1",
};

describe("Budget.open", () => {
  it("abre um orçamento v1 com tudo não comprometido", () => {
    const opened = Budget.open({
      ...base,
      authorizedTotalMinor: 100_000_000n,
      allocations: [
        { area: BudgetAreaKind.WAGES, authorizedMinor: 60_000_000n },
        { area: BudgetAreaKind.TRANSFERS, authorizedMinor: 40_000_000n },
      ],
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const snapshot = opened.value.snapshot();
    expect(snapshot.version).toBe(1);
    expect(snapshot.allocations.every((a) => a.committedMinor === 0n)).toBe(true);
    expect(opened.value.availableForArea(BudgetAreaKind.WAGES)).toBe(60_000_000n);
  });

  it("recusa quando a soma das áreas ultrapassa o teto (BUDGET_OVERALLOCATED)", () => {
    const opened = Budget.open({
      ...base,
      authorizedTotalMinor: 100_000_000n,
      allocations: [
        { area: BudgetAreaKind.WAGES, authorizedMinor: 70_000_000n },
        { area: BudgetAreaKind.TRANSFERS, authorizedMinor: 40_000_000n },
      ],
    });
    expect(opened.ok).toBe(false);
    if (!opened.ok) expect(opened.error.code).toBe("BUDGET_OVERALLOCATED");
  });
});

describe("Budget.revise", () => {
  const withCommitment: BudgetSnapshot = {
    ...base,
    authorizedTotalMinor: 100_000_000n,
    allocations: [
      { area: BudgetAreaKind.WAGES, authorizedMinor: 60_000_000n, committedMinor: 50_000_000n },
      { area: BudgetAreaKind.TRANSFERS, authorizedMinor: 40_000_000n, committedMinor: 0n },
    ],
    version: 3,
  };

  it("preserva o comprometido e sobe a versão", () => {
    const loaded = Budget.fromSnapshot(withCommitment);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const revised = loaded.value.revise({
      authorizedTotalMinor: 100_000_000n,
      allocations: [
        { area: BudgetAreaKind.WAGES, authorizedMinor: 55_000_000n },
        { area: BudgetAreaKind.TRANSFERS, authorizedMinor: 45_000_000n },
      ],
    });
    expect(revised.ok).toBe(true);
    if (!revised.ok) return;
    const snapshot = revised.value.snapshot();
    expect(snapshot.version).toBe(4);
    const wages = snapshot.allocations.find((a) => a.area === BudgetAreaKind.WAGES);
    expect(wages?.committedMinor).toBe(50_000_000n);
  });

  it("recusa rebaixar a autorização abaixo do comprometido (BUDGET_BELOW_COMMITTED)", () => {
    const loaded = Budget.fromSnapshot(withCommitment);
    if (!loaded.ok) return;
    const revised = loaded.value.revise({
      authorizedTotalMinor: 100_000_000n,
      allocations: [
        { area: BudgetAreaKind.WAGES, authorizedMinor: 40_000_000n }, // < 50M comprometido
        { area: BudgetAreaKind.TRANSFERS, authorizedMinor: 40_000_000n },
      ],
    });
    expect(revised.ok).toBe(false);
    if (!revised.ok) expect(revised.error.code).toBe("BUDGET_BELOW_COMMITTED");
  });
});
