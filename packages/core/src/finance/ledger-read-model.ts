import type { GameWorldId } from "@grinta/shared";

/**
 * A visão financeira do mundo para a tela do clube (M-02) — R-191.
 *
 * `balanceMinor` é `number`, não `bigint`, de propósito: é projeção de EXIBIÇÃO,
 * e o valor cabe com folga em número seguro (R$ 5.000.000 = 500000000, muito
 * abaixo de 2^53). A fonte da verdade é o razão em `bigint`; isto é o que a tela
 * mostra. Um saldo que estourasse 2^53 seria bug de economia, não de exibição.
 */
export interface ClubBalanceView {
  readonly clubId: string;
  readonly balanceMinor: number;
}

export interface LedgerSummaryView {
  readonly accountCount: number;
  readonly transactionCount: number;
  /** Contextos ainda inexistentes — 0 honesto, não número inventado. */
  readonly activeReservationCount: number;
  readonly activeDebtCount: number;
  readonly closedPeriodCount: number;
  /**
   * Resíduo da oferta monetária: `Σ faucets − Σ sinks − Σ caixas`. Deve ser 0
   * num razão balanceado — é a auditoria da economia fechada (ECO-003).
   */
  readonly residualMinor: number;
  readonly clubBalances: readonly ClubBalanceView[];
}

export interface LedgerReadModel {
  /** O resumo financeiro do mundo: contas, lançamentos e o caixa de cada clube. */
  summary(gameWorldId: GameWorldId): Promise<LedgerSummaryView>;
}
