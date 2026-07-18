/**
 * Lógica pura do Mercado (M-06) — os termos do negócio para EXIBIÇÃO no modal de
 * contratação. NÃO é autoritativa (R-192): o servidor decide de verdade. Isto só
 * mostra ao técnico, antes de fechar, os mesmos números que o domínio vai aplicar.
 */

/** Duração do contrato de uma transferência, em temporadas (espelha o domínio, R-192). */
export const CONTRACT_SEASONS = 3;

export interface DealPreview {
  readonly feeMinor: bigint;
  readonly salaryPerSeasonMinor: bigint;
  readonly seasons: number;
  readonly cashAfterMinor: bigint | null;
  readonly affordable: boolean;
}

/**
 * A oferta é 100% do valor estimado; o salário é valor/20 (a mesma calibração de
 * primeira passada do domínio) e o saldo após é caixa − taxa. `cashMinor === null`
 * (razão ainda não carregou) mantém a compra habilitada — quem barra é o servidor.
 */
export function previewDeal(
  valueMinor: string,
  cashMinor: number | null,
): DealPreview {
  const feeMinor = BigInt(valueMinor);
  const cash = cashMinor === null ? null : BigInt(cashMinor);
  return {
    feeMinor,
    salaryPerSeasonMinor: feeMinor / 20n,
    seasons: CONTRACT_SEASONS,
    cashAfterMinor: cash === null ? null : cash - feeMinor,
    affordable: cash === null ? true : cash >= feeMinor,
  };
}
