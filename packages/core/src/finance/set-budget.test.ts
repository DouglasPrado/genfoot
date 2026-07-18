import { describe, expect, it } from "vitest";

import { BudgetAreaKind, type BudgetRepository, type BudgetSnapshot } from "./budget-types.js";
import { SetBudget } from "./set-budget.js";

class FakeBudgetRepo implements BudgetRepository {
  public stored: BudgetSnapshot | null = null;
  public savedWithExpected: number | null | undefined;

  public findByClub(): Promise<BudgetSnapshot | null> {
    return Promise.resolve(this.stored);
  }

  public save(snapshot: BudgetSnapshot, expectedVersion: number | null): Promise<void> {
    this.savedWithExpected = expectedVersion;
    this.stored = snapshot;
    return Promise.resolve();
  }
}

const input = {
  gameWorldId: "world-1",
  clubId: "club-1",
  worldSeed: "seed-1",
  occurredOn: "2026-01-01",
  currencyId: "cur-1",
  authorizedTotalMinor: 100_000_000n,
  allocations: [
    { area: BudgetAreaKind.WAGES, authorizedMinor: 60_000_000n },
    { area: BudgetAreaKind.TRANSFERS, authorizedMinor: 40_000_000n },
  ],
};

describe("SetBudget", () => {
  it("abre o orçamento na primeira vez (expectedVersion null → v1)", async () => {
    const repo = new FakeBudgetRepo();
    const result = await new SetBudget(repo).execute({ ...input, expectedVersion: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.version).toBe(1);
    expect(repo.savedWithExpected).toBe(null);
  });

  it("recusa versão divergente (BUDGET_VERSION_CONFLICT)", async () => {
    const repo = new FakeBudgetRepo();
    await new SetBudget(repo).execute({ ...input, expectedVersion: null });
    const result = await new SetBudget(repo).execute({ ...input, expectedVersion: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("BUDGET_VERSION_CONFLICT");
  });

  it("revisa com a versão certa e sobe para v2", async () => {
    const repo = new FakeBudgetRepo();
    await new SetBudget(repo).execute({ ...input, expectedVersion: null });
    const result = await new SetBudget(repo).execute({ ...input, expectedVersion: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.version).toBe(2);
  });

  it("propaga a recusa de sobre-alocação do agregado", async () => {
    const repo = new FakeBudgetRepo();
    const result = await new SetBudget(repo).execute({
      ...input,
      expectedVersion: null,
      authorizedTotalMinor: 80_000_000n, // < 100M da soma das áreas
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("BUDGET_OVERALLOCATED");
  });
});
