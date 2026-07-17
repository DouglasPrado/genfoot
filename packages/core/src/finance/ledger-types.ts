import type { GameWorldId } from "@grinta/shared";

import type { ClubId } from "../genesis/genesis-types.js";

/**
 * O razão de partidas dobradas de C9 (R-178/R-191).
 *
 * O saldo NUNCA é coluna: é a soma dos lançamentos POSTADOS numa conta —
 * projeção reconstruível. Uma coluna `balanceMinor` no agregado voltaria a
 * permitir duas verdades (a coluna e o razão) divergindo. O físico já está certo;
 * o domínio o cumpre.
 */

/** Quem é dono da conta: um clube, ou o próprio mundo (contas de sistema). */
export const AccountOwnerScope = {
  CLUB: "CLUB",
  WORLD: "WORLD",
} as const;

export type AccountOwnerScope =
  (typeof AccountOwnerScope)[keyof typeof AccountOwnerScope];

/** O tipo contábil da conta — decide o lado normal e como o saldo é lido. */
export const FinancialAccountType = {
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  REVENUE: "REVENUE",
  EXPENSE: "EXPENSE",
  SYSTEM_FAUCET: "SYSTEM_FAUCET",
  SYSTEM_SINK: "SYSTEM_SINK",
} as const;

export type FinancialAccountType =
  (typeof FinancialAccountType)[keyof typeof FinancialAccountType];

/**
 * O lado normal da conta: onde o saldo dela CRESCE.
 *
 * Ativo e despesa crescem no débito; passivo, patrimônio e receita, no crédito.
 * É o que faz o saldo de uma conta de caixa (ativo) ser `Σ débitos − Σ créditos`.
 */
export const AccountNormalSide = {
  DEBIT: "DEBIT",
  CREDIT: "CREDIT",
} as const;

export type AccountNormalSide =
  (typeof AccountNormalSide)[keyof typeof AccountNormalSide];

/**
 * As contas de sistema — as torneiras (faucet) e ralos (sink) da economia
 * fechada. O dinheiro NASCE numa faucet e MORRE num sink; a oferta monetária do
 * mundo é `Σ faucets − Σ sinks` (ECO-003), auditável.
 */
export const SystemAccount = {
  SYS_INITIAL_ENDOWMENT: "SYS_INITIAL_ENDOWMENT",
  SYS_MATCHDAY_FAUCET: "SYS_MATCHDAY_FAUCET",
  SYS_SPONSOR_FAUCET: "SYS_SPONSOR_FAUCET",
  SYS_BROADCAST_FAUCET: "SYS_BROADCAST_FAUCET",
  SYS_PRIZE_FAUCET: "SYS_PRIZE_FAUCET",
  SYS_OWNER_INJECTION_FAUCET: "SYS_OWNER_INJECTION_FAUCET",
  SYS_TAX_SINK: "SYS_TAX_SINK",
  SYS_WAGE_SINK: "SYS_WAGE_SINK",
  SYS_OPERATING_SINK: "SYS_OPERATING_SINK",
  SYS_CREDIT_SINK: "SYS_CREDIT_SINK",
  SYS_PENALTY_SINK: "SYS_PENALTY_SINK",
  SYS_AGENT_SINK: "SYS_AGENT_SINK",
} as const;

export type SystemAccount =
  (typeof SystemAccount)[keyof typeof SystemAccount];

/** A classe do fluxo: entra na economia, sai, ou só troca de mãos. */
export const MoneyFlowClass = {
  TRANSFER: "TRANSFER",
  FAUCET: "FAUCET",
  SINK: "SINK",
} as const;

export type MoneyFlowClass =
  (typeof MoneyFlowClass)[keyof typeof MoneyFlowClass];

export const JournalEntryStatus = {
  DRAFT: "DRAFT",
  POSTING: "POSTING",
  POSTED: "POSTED",
  REVERSED: "REVERSED",
} as const;

export type JournalEntryStatus =
  (typeof JournalEntryStatus)[keyof typeof JournalEntryStatus];

export const JournalLineDirection = {
  DEBIT: "DEBIT",
  CREDIT: "CREDIT",
} as const;

export type JournalLineDirection =
  (typeof JournalLineDirection)[keyof typeof JournalLineDirection];

/**
 * Uma conta do plano de contas. Root por entidade (R-175): tem `version`.
 *
 * `systemAccount` é preenchido só nas contas de sistema (scope WORLD); `clubId`,
 * só nas de clube. O par `(scope, accountCode)` é único por mundo.
 */
export interface LedgerAccountSnapshot {
  readonly id: string;
  readonly gameWorldId: GameWorldId;
  readonly ownerScope: AccountOwnerScope;
  readonly clubId: ClubId | null;
  readonly systemAccount: SystemAccount | null;
  readonly accountCode: string;
  readonly accountType: FinancialAccountType;
  readonly normalSide: AccountNormalSide;
  readonly currencyId: string;
  readonly version: number;
}

export interface JournalLineSnapshot {
  readonly lineNumber: number;
  readonly financialAccountId: string;
  readonly direction: JournalLineDirection;
  /** Sempre > 0. O sinal vem da `direction`, não do valor. */
  readonly amountMinor: bigint;
  readonly currencyId: string;
}

/**
 * Um lançamento no razão. Root por entidade (R-175): tem `version`.
 *
 * Escrito uma vez e nunca editado: reversão cria um lançamento NOVO
 * (`reversalOfJournalEntryId`), o publicado é imutável. `sourceEventId` dá
 * idempotência de projeção — um evento gera um lançamento, e reprocessá-lo não
 * duplica dinheiro.
 */
export interface JournalEntrySnapshot {
  readonly id: string;
  readonly gameWorldId: GameWorldId;
  readonly clubId: ClubId | null;
  readonly currencyId: string;
  readonly flowClass: MoneyFlowClass;
  readonly status: JournalEntryStatus;
  readonly description: string | null;
  readonly reversalOfJournalEntryId: string | null;
  readonly sourceEventId: string | null;
  readonly seasonNumber: number | null;
  readonly occurredOn: string;
  readonly postedOn: string | null;
  readonly lines: readonly JournalLineSnapshot[];
  readonly version: number;
}
