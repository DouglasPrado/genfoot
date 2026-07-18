import { describe, expect, it } from "vitest";

import { toSeasonCostBreakdownView } from "./club-finance-read-model.js";
import { computeFinancialHealth } from "./financial-health.js";
import {
  CostProvenance,
  SeasonCostCategory,
  type SeasonCostBreakdown,
} from "./season-cost-model.js";

describe("computeFinancialHealth", () => {
  it("com só caixa e custo: peso coberto insuficiente → value null, mas liquidez computada", () => {
    const result = computeFinancialHealth({
      cashMinor: 500_000_000n,
      seasonCostMinor: 60_000_000n,
      monthlyRevenueMinor: null,
      debtMinor: null,
    });
    expect(result.value).toBeNull();
    expect(result.computedSubIndices.liquidity).toBeGreaterThan(0);
    expect(result.missingSubIndices).toContain("indebtedness");
    expect(result.missingSubIndices).toContain("wageToRevenue");
  });

  it("mais caixa = mais fôlego = liquidez maior", () => {
    const poor = computeFinancialHealth({
      cashMinor: 10_000_000n,
      seasonCostMinor: 120_000_000n,
      monthlyRevenueMinor: null,
      debtMinor: null,
    });
    const rich = computeFinancialHealth({
      cashMinor: 500_000_000n,
      seasonCostMinor: 120_000_000n,
      monthlyRevenueMinor: null,
      debtMinor: null,
    });
    expect(rich.computedSubIndices.liquidity!).toBeGreaterThan(
      poor.computedSubIndices.liquidity!,
    );
  });

  it("com receita e dívida o peso cruza o limiar → índice numérico 0–100", () => {
    const result = computeFinancialHealth({
      cashMinor: 500_000_000n,
      seasonCostMinor: 60_000_000n,
      monthlyRevenueMinor: 20_000_000n,
      debtMinor: 0n,
    });
    expect(result.value).not.toBeNull();
    expect(result.value!).toBeGreaterThanOrEqual(0);
    expect(result.value!).toBeLessThanOrEqual(100);
  });

  it("caixa negativo zera a liquidez", () => {
    const result = computeFinancialHealth({
      cashMinor: -100_000_000n,
      seasonCostMinor: 60_000_000n,
      monthlyRevenueMinor: null,
      debtMinor: null,
    });
    expect(result.computedSubIndices.liquidity).toBe(0);
  });
});

describe("toSeasonCostBreakdownView", () => {
  it("converte bigint → number preservando total e linhas", () => {
    const breakdown: SeasonCostBreakdown = {
      currencyId: "cur",
      totalMinor: 123_000_000n,
      lines: [
        {
          category: SeasonCostCategory.PLAYER_WAGES,
          amountMinor: 123_000_000n,
          provenance: CostProvenance.ESTIMATED,
        },
      ],
      contractedPlayerCount: 0,
      estimatedPlayerCount: 23,
      omitted: [SeasonCostCategory.TRAVEL],
    };
    const view = toSeasonCostBreakdownView(breakdown);
    expect(view.totalMinor).toBe(123_000_000);
    expect(view.lines[0]?.amountMinor).toBe(123_000_000);
    expect(view.estimatedPlayerCount).toBe(23);
  });
});
