import type { GameWorldId } from "@grinta/shared";

import type { FinancialHealthResult } from "./financial-health.js";
import type {
  CostProvenance,
  SeasonCostBreakdown,
  SeasonCostCategory,
} from "./season-cost-model.js";

/**
 * A visão financeira do clube que a query `GetFinanceSnapshot` serve (M-FINANCE
 * / M-ACCOUNTING, doc 23 linha 33). É PROJEÇÃO de exibição: valores em `number`
 * (cabem com folga em número seguro, como `ClubBalanceView`); a verdade é o
 * razão em `bigint`.
 *
 * `provenanceNotes` carrega, em texto, o que é estimado vs. contratado e o que
 * está omitido — a UI mostra isso em vez de fingir que tudo é exato.
 */
export interface SeasonCostLineView {
  readonly category: SeasonCostCategory;
  readonly amountMinor: number;
  readonly provenance: CostProvenance;
}

export interface SeasonCostBreakdownView {
  readonly currencyId: string;
  readonly totalMinor: number;
  readonly lines: readonly SeasonCostLineView[];
  readonly contractedPlayerCount: number;
  readonly estimatedPlayerCount: number;
  readonly omitted: readonly SeasonCostCategory[];
}

export interface ClubFinanceSnapshotView {
  readonly clubId: string;
  readonly currencyId: string;
  readonly cashMinor: number;
  readonly seasonCost: SeasonCostBreakdownView;
  readonly financialHealth: FinancialHealthResult;
  readonly provenanceNotes: readonly string[];
}

export interface ClubFinanceReadModel {
  snapshot(
    gameWorldId: GameWorldId,
    clubId: string,
  ): Promise<ClubFinanceSnapshotView | null>;
}

/**
 * Converte o breakdown do domínio (`bigint`) para a view de exibição (`number`).
 * Puro: a mesma composição da tela e da persistência passa por aqui, sem
 * duplicar a regra de projeção.
 */
export function toSeasonCostBreakdownView(
  breakdown: SeasonCostBreakdown,
): SeasonCostBreakdownView {
  return {
    currencyId: breakdown.currencyId,
    totalMinor: Number(breakdown.totalMinor),
    lines: breakdown.lines.map((line) => ({
      category: line.category,
      amountMinor: Number(line.amountMinor),
      provenance: line.provenance,
    })),
    contractedPlayerCount: breakdown.contractedPlayerCount,
    estimatedPlayerCount: breakdown.estimatedPlayerCount,
    omitted: breakdown.omitted,
  };
}
