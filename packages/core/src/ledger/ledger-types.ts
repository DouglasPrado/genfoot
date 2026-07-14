import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type LedgerAccountId = EntityId<"LedgerAccount">;
export type LedgerTransactionId = EntityId<"LedgerTransaction">;
export type LedgerReservationId = EntityId<"LedgerReservation">;
export type LedgerEventId = EntityId<"LedgerEvent">;

export const LedgerAccountType = {
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  REVENUE: "REVENUE",
  EXPENSE: "EXPENSE",
  FAUCET: "FAUCET",
  SINK: "SINK",
} as const;

export type LedgerAccountType =
  (typeof LedgerAccountType)[keyof typeof LedgerAccountType];

export const NormalBalance = {
  DEBIT: "DEBIT",
  CREDIT: "CREDIT",
} as const;

export type NormalBalance = (typeof NormalBalance)[keyof typeof NormalBalance];

export const EntryDirection = {
  DEBIT: "DEBIT",
  CREDIT: "CREDIT",
} as const;

export type EntryDirection =
  (typeof EntryDirection)[keyof typeof EntryDirection];

export const ReservationStatus = {
  ACTIVE: "ACTIVE",
  SETTLED: "SETTLED",
  RELEASED: "RELEASED",
} as const;

export type ReservationStatus =
  (typeof ReservationStatus)[keyof typeof ReservationStatus];

export interface LedgerAccountSnapshot {
  readonly id: LedgerAccountId;
  readonly gameWorldId: GameWorldId;
  readonly name: string;
  readonly type: LedgerAccountType;
  readonly currency: string;
  readonly normalBalance: NormalBalance;
  readonly balanceMinor: number;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface LedgerEntrySnapshot {
  readonly accountId: LedgerAccountId;
  readonly direction: EntryDirection;
  readonly amountMinor: number;
  readonly sequence: number;
}

export interface LedgerTransactionSnapshot {
  readonly id: LedgerTransactionId;
  readonly gameWorldId: GameWorldId;
  readonly transactionClass: string;
  readonly currency: string;
  readonly occurredOn: string;
  readonly entries: readonly LedgerEntrySnapshot[];
  readonly idempotencyKey: string;
}

export interface LedgerReservationSnapshot {
  readonly id: LedgerReservationId;
  readonly gameWorldId: GameWorldId;
  readonly accountId: LedgerAccountId;
  readonly purpose: string;
  readonly amountMinor: number;
  readonly status: ReservationStatus;
  readonly expiresOn: string;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface MoneySupplySnapshot {
  readonly asOf: string;
  readonly supplyMinor: number;
  readonly residualMinor: number;
  readonly accountCount: number;
}

export interface TransactionPostedEvent {
  readonly id: LedgerEventId;
  readonly type: "TransactionPosted";
  readonly gameWorldId: GameWorldId;
  readonly transactionId: LedgerTransactionId;
  readonly currency: string;
  readonly amountMinor: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface FundsReservedEvent {
  readonly id: LedgerEventId;
  readonly type: "FundsReserved";
  readonly gameWorldId: GameWorldId;
  readonly reservationId: LedgerReservationId;
  readonly accountId: LedgerAccountId;
  readonly amountMinor: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface ReservationSettledEvent {
  readonly id: LedgerEventId;
  readonly type: "ReservationSettled";
  readonly gameWorldId: GameWorldId;
  readonly reservationId: LedgerReservationId;
  readonly outcome: "SETTLED" | "RELEASED";
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface LedgerReconciledEvent {
  readonly id: LedgerEventId;
  readonly type: "LedgerReconciled";
  readonly gameWorldId: GameWorldId;
  readonly residualMinor: number;
  readonly supplyMinor: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type LedgerDomainEvent =
  | TransactionPostedEvent
  | FundsReservedEvent
  | ReservationSettledEvent
  | LedgerReconciledEvent;

export interface WorldLedgerSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly baseCurrency: string;
  readonly rulesetVersion: RulesetVersion;
  readonly accounts: readonly LedgerAccountSnapshot[];
  readonly transactions: readonly LedgerTransactionSnapshot[];
  readonly reservations: readonly LedgerReservationSnapshot[];
  readonly events: readonly LedgerDomainEvent[];
  readonly revision: number;
}

export interface LedgerSummary {
  readonly accountCount: number;
  readonly transactionCount: number;
  readonly activeReservationCount: number;
  readonly residualMinor: number;
}
