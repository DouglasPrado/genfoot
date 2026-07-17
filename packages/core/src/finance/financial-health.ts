/**
 * Índice de saúde financeira (`financialHealth`, 0–100) — R-42.
 *
 * A fórmula ratificada é `clamp(Σ wᵢ·subᵢ, 0, 100)` com 8 sub-índices que somam
 * peso 1.00. **Hoje só há dado real para poucos deles** (caixa via razão; folha
 * via modelo de custo; dívida = 0 na economia fechada; receita mensal quando
 * informada). Os demais — resultado esportivo, previsibilidade de receita,
 * compromissos futuros, pressão da torcida, confiança da diretoria — não têm
 * fonte materializada.
 *
 * **Honestidade sobre a lacuna:** só se computa o sub-índice cujo insumo real
 * existe. Se o peso coberto não alcança um limiar mínimo, o índice é `null` (a
 * UI mostra "indisponível") — nunca se fabrica receita para completar a conta.
 * Sem histerese/estágios de crise (R-45) nesta passada — isso fica amarelo.
 */

/** Pesos de 1ª passada da R-42 (somam 1.00). */
const WEIGHTS = {
  liquidity: 0.22,
  indebtedness: 0.2,
  wageToRevenue: 0.18,
  recurringRevenue: 0.12,
  sportingResult: 0.1,
  futureCommitments: 0.08,
  fanPressure: 0.05,
  boardConfidence: 0.05,
} as const;

type SubIndexKey = keyof typeof WEIGHTS;

/** Peso mínimo coberto para o índice ser confiável o bastante para exibir. */
const MIN_COVERED_WEIGHT = 0.5;

export interface FinancialHealthInput {
  readonly cashMinor: bigint;
  /** Custo total da temporada (folha + manutenção), do modelo de custo. */
  readonly seasonCostMinor: bigint;
  /** Receita mensal real, ou `null` enquanto não houver faucet de receita. */
  readonly monthlyRevenueMinor: bigint | null;
  /** Dívida total, ou `null`. Na economia fechada de hoje é 0 (sem C-dívida). */
  readonly debtMinor: bigint | null;
}

export interface FinancialHealthResult {
  /** 0–100, ou `null` quando o peso coberto é insuficiente. */
  readonly value: number | null;
  readonly computedSubIndices: Readonly<Partial<Record<SubIndexKey, number>>>;
  readonly missingSubIndices: readonly SubIndexKey[];
}

function clamp01to100(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function computeFinancialHealth(
  input: FinancialHealthInput,
): FinancialHealthResult {
  const computed: Partial<Record<SubIndexKey, number>> = {};

  // Liquidez: meses de fôlego = caixa ÷ despesa mensal (custo/12). 6+ meses = 100.
  const monthlyExpense = Number(input.seasonCostMinor) / 12;
  if (monthlyExpense > 0) {
    const months = Number(input.cashMinor) / monthlyExpense;
    computed.liquidity = clamp01to100((months / 6) * 100);
  } else if (input.cashMinor >= 0n) {
    // Sem custo: sem despesa a cobrir — liquidez plena.
    computed.liquidity = 100;
  }

  if (input.monthlyRevenueMinor !== null && input.monthlyRevenueMinor > 0n) {
    const revenue = Number(input.monthlyRevenueMinor);
    // Folha ÷ receita: quanto menor, mais saudável. ≤0.5 → 100, ≥1.5 → 0.
    const wageRatio = monthlyExpense / revenue;
    computed.wageToRevenue = clamp01to100((1.5 - wageRatio) * 100);

    if (input.debtMinor !== null) {
      // Endividamento: dívida ÷ receita anual. 0 → 100, ≥2 → 0.
      const debtRatio = Number(input.debtMinor) / (revenue * 12);
      computed.indebtedness = clamp01to100((1 - debtRatio / 2) * 100);
    }
  }

  const computedKeys = Object.keys(computed) as SubIndexKey[];
  const coveredWeight = computedKeys.reduce((acc, key) => acc + WEIGHTS[key], 0);
  const missing = (Object.keys(WEIGHTS) as SubIndexKey[]).filter(
    (key) => !(key in computed),
  );

  if (coveredWeight < MIN_COVERED_WEIGHT) {
    return { value: null, computedSubIndices: computed, missingSubIndices: missing };
  }

  // Média ponderada pelos pesos DISPONÍVEIS (renormalizada) — não se completa o
  // que falta com zero, que puniria injustamente por dado ausente.
  const weightedSum = computedKeys.reduce(
    (acc, key) => acc + WEIGHTS[key] * (computed[key] ?? 0),
    0,
  );
  return {
    value: clamp01to100(weightedSum / coveredWeight),
    computedSubIndices: computed,
    missingSubIndices: missing,
  };
}
