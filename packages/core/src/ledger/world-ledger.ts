import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import {
  EntryDirection,
  LedgerAccountType,
  NormalBalance,
  ReservationStatus,
  type FundsReservedEvent,
  type LedgerAccountSnapshot,
  type LedgerDomainEvent,
  type LedgerEntrySnapshot,
  type LedgerReconciledEvent,
  type LedgerReservationSnapshot,
  type LedgerSummary,
  type LedgerTransactionSnapshot,
  type MoneySupplySnapshot,
  type ReservationSettledEvent,
  type TransactionPostedEvent,
  type WorldLedgerSnapshot,
} from "./ledger-types.js";

const DEFAULT_CURRENCY = "COIN";

export class WorldLedger {
  private constructor(private state: WorldLedgerSnapshot) {}

  public static initialize(
    world: GameWorldSnapshot,
    baseCurrency: string = DEFAULT_CURRENCY,
  ): Result<WorldLedger, DomainError> {
    return WorldLedger.fromSnapshot({
      gameWorldId: world.id,
      baseCurrency,
      rulesetVersion: world.rulesetVersion,
      accounts: [],
      transactions: [],
      reservations: [],
      events: [],
      revision: 1,
    });
  }

  public static fromSnapshot(
    snapshot: WorldLedgerSnapshot,
  ): Result<WorldLedger, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidLedger("A revisão do ledger é inválida."));
    }
    if (snapshot.baseCurrency.trim() === "") {
      return fail(invalidLedger("A moeda-base é obrigatória."));
    }
    const accountIds = new Set<string>();
    for (const account of snapshot.accounts) {
      if (
        account.gameWorldId !== snapshot.gameWorldId ||
        account.name.trim() === "" ||
        account.currency !== snapshot.baseCurrency ||
        !Number.isSafeInteger(account.balanceMinor) ||
        accountIds.has(account.id) ||
        !Number.isSafeInteger(account.version) ||
        account.version < 1
      ) {
        return fail(invalidLedger("Conta contábil inválida."));
      }
      accountIds.add(account.id);
    }
    let residual = 0;
    for (const account of snapshot.accounts) {
      residual += account.balanceMinor;
    }
    if (residual !== 0) {
      return fail(
        new DomainError(
          "LEDGER_IMBALANCED",
          "A conservação monetária foi violada (residual != 0).",
          { residualMinor: residual },
        ),
      );
    }
    for (const transaction of snapshot.transactions) {
      if (
        transaction.gameWorldId !== snapshot.gameWorldId ||
        transaction.entries.length < 2 ||
        !entriesBalance(transaction.entries)
      ) {
        return fail(invalidLedger("Transação desbalanceada."));
      }
    }
    for (const reservation of snapshot.reservations) {
      if (
        reservation.gameWorldId !== snapshot.gameWorldId ||
        !accountIds.has(reservation.accountId) ||
        reservation.amountMinor <= 0
      ) {
        return fail(invalidLedger("Reserva inválida."));
      }
    }
    for (const event of snapshot.events) {
      if (event.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidLedger("Evento de ledger inválido."));
      }
    }
    return succeed(new WorldLedger(snapshot));
  }

  public openLedgerAccount(
    input: Readonly<{
      name: string;
      type: LedgerAccountType;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<LedgerAccountSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.accounts.find(
      (account) => account.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (input.name.trim() === "" || !isAccountType(input.type)) {
      return fail(
        new DomainError(
          "INVALID_LEDGER_ACCOUNT",
          "Nome e tipo da conta devem ser válidos.",
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const accountId = deterministicUuidV7<"LedgerAccount">({
      worldSeed: input.worldSeed,
      context: `ledger-account:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const account: LedgerAccountSnapshot = {
      id: accountId,
      gameWorldId: this.state.gameWorldId,
      name: input.name.trim(),
      type: input.type,
      currency: this.state.baseCurrency,
      normalBalance: normalFor(input.type),
      balanceMinor: 0,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    this.state = {
      ...this.state,
      accounts: [...this.state.accounts, account],
      revision: this.state.revision + 1,
    };
    return succeed(account);
  }

  public postTransaction(
    input: Readonly<{
      transactionClass: string;
      occurredOn: string;
      entries: readonly Readonly<{
        accountId: string;
        direction: EntryDirection;
        amountMinor: number;
      }>[];
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<LedgerTransactionSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("TransactionPosted", input.idempotencyKey);
    if (replay !== undefined) {
      const transaction = this.state.transactions.find(
        ({ id }) => id === replay.transactionId,
      );
      if (transaction !== undefined) return succeed(transaction);
    }
    if (input.entries.length < 2 || input.transactionClass.trim() === "") {
      return fail(
        new DomainError(
          "INVALID_TRANSACTION",
          "Uma transação exige classe e ao menos duas partidas.",
        ),
      );
    }
    const occurredOn = WorldDate.parse(input.occurredOn);
    if (!occurredOn.ok) return occurredOn;
    let debitTotal = 0;
    let creditTotal = 0;
    const accountsIndex = new Map<string, number>(
      this.state.accounts.map((account, index) => [account.id, index]),
    );
    for (const entry of input.entries) {
      if (
        !Number.isSafeInteger(entry.amountMinor) ||
        entry.amountMinor <= 0 ||
        (entry.direction !== EntryDirection.DEBIT &&
          entry.direction !== EntryDirection.CREDIT)
      ) {
        return fail(
          new DomainError(
            "INVALID_TRANSACTION",
            "Cada partida exige direção válida e valor inteiro positivo.",
          ),
        );
      }
      if (!accountsIndex.has(entry.accountId)) {
        return fail(
          new DomainError("LEDGER_ACCOUNT_NOT_FOUND", "Conta inexistente.", {
            accountId: entry.accountId,
          }),
        );
      }
      if (entry.direction === EntryDirection.DEBIT) debitTotal += entry.amountMinor;
      else creditTotal += entry.amountMinor;
    }
    if (debitTotal !== creditTotal) {
      return fail(
        new DomainError(
          "TRANSACTION_UNBALANCED",
          "A soma algébrica das partidas deve ser zero.",
          { debitTotal, creditTotal },
        ),
      );
    }
    const accounts = [...this.state.accounts];
    const entries: LedgerEntrySnapshot[] = input.entries.map((entry, index) => {
      const accountIndex = accountsIndex.get(entry.accountId)!;
      const current = accounts[accountIndex]!;
      accounts[accountIndex] = {
        ...current,
        balanceMinor: current.balanceMinor + signedDelta(entry.direction, entry.amountMinor),
        version: current.version + 1,
      };
      return {
        accountId: current.id,
        direction: entry.direction,
        amountMinor: entry.amountMinor,
        sequence: index + 1,
      };
    });
    const timestampMilliseconds = timestampOf(occurredOn.value.toString());
    const transactionId = deterministicUuidV7<"LedgerTransaction">({
      worldSeed: input.worldSeed,
      context: `ledger-transaction:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const transaction: LedgerTransactionSnapshot = {
      id: transactionId,
      gameWorldId: this.state.gameWorldId,
      transactionClass: input.transactionClass.trim(),
      currency: this.state.baseCurrency,
      occurredOn: occurredOn.value.toString(),
      entries,
      idempotencyKey: input.idempotencyKey,
    };
    const event: TransactionPostedEvent = {
      id: deterministicUuidV7<"LedgerEvent">({
        worldSeed: input.worldSeed,
        context: `transaction-posted:${input.idempotencyKey}`,
        timestampMilliseconds,
      }),
      type: "TransactionPosted",
      gameWorldId: this.state.gameWorldId,
      transactionId,
      currency: this.state.baseCurrency,
      amountMinor: debitTotal,
      worldDate: occurredOn.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      accounts,
      transactions: [...this.state.transactions, transaction],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(transaction);
  }

  public reserveFunds(
    input: Readonly<{
      accountId: string;
      purpose: string;
      amountMinor: number;
      expiresOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<LedgerReservationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("FundsReserved", input.idempotencyKey);
    if (replay !== undefined) {
      const reservation = this.state.reservations.find(
        ({ id }) => id === replay.reservationId,
      );
      if (reservation !== undefined) return succeed(reservation);
    }
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      return fail(
        new DomainError("INVALID_RESERVATION", "Valor da reserva inválido."),
      );
    }
    const account = this.state.accounts.find(({ id }) => id === input.accountId);
    if (account === undefined) {
      return fail(
        new DomainError("LEDGER_ACCOUNT_NOT_FOUND", "Conta inexistente.", {
          accountId: input.accountId,
        }),
      );
    }
    const expiresOn = WorldDate.parse(input.expiresOn);
    if (!expiresOn.ok) return expiresOn;
    const available = this.availableBalance(account.id);
    if (available < input.amountMinor) {
      return fail(
        new DomainError(
          "INSUFFICIENT_FUNDS",
          "Não há saldo disponível para a reserva.",
          { accountId: account.id, available, requested: input.amountMinor },
        ),
      );
    }
    const timestampMilliseconds = timestampOf(expiresOn.value.toString());
    const reservationId = deterministicUuidV7<"LedgerReservation">({
      worldSeed: input.worldSeed,
      context: `ledger-reservation:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const reservation: LedgerReservationSnapshot = {
      id: reservationId,
      gameWorldId: this.state.gameWorldId,
      accountId: account.id,
      purpose: input.purpose.trim(),
      amountMinor: input.amountMinor,
      status: ReservationStatus.ACTIVE,
      expiresOn: expiresOn.value.toString(),
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: FundsReservedEvent = {
      id: deterministicUuidV7<"LedgerEvent">({
        worldSeed: input.worldSeed,
        context: `funds-reserved:${input.idempotencyKey}`,
        timestampMilliseconds,
      }),
      type: "FundsReserved",
      gameWorldId: this.state.gameWorldId,
      reservationId,
      accountId: account.id,
      amountMinor: input.amountMinor,
      worldDate: expiresOn.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      reservations: [...this.state.reservations, reservation],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(reservation);
  }

  public settleReservation(
    input: Readonly<{
      reservationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<LedgerReservationSnapshot, DomainError> {
    return this.closeReservation(input, ReservationStatus.SETTLED);
  }

  public releaseReservation(
    input: Readonly<{
      reservationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<LedgerReservationSnapshot, DomainError> {
    return this.closeReservation(input, ReservationStatus.RELEASED);
  }

  public reconcileWorldLedger(
    input: Readonly<{
      asOf: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<MoneySupplySnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const asOf = WorldDate.parse(input.asOf);
    if (!asOf.ok) return asOf;
    const residual = this.state.accounts.reduce(
      (sum, account) => sum + account.balanceMinor,
      0,
    );
    if (residual !== 0) {
      return fail(
        new DomainError(
          "LEDGER_IMBALANCED",
          "A reconciliação detectou residual diferente de zero.",
          { residualMinor: residual },
        ),
      );
    }
    const supplyMinor = this.state.accounts
      .filter((account) => account.type === LedgerAccountType.ASSET)
      .reduce((sum, account) => sum + this.displayedBalance(account), 0);
    const snapshot: MoneySupplySnapshot = {
      asOf: asOf.value.toString(),
      supplyMinor,
      residualMinor: residual,
      accountCount: this.state.accounts.length,
    };
    const replay = this.findEvent("LedgerReconciled", input.idempotencyKey);
    if (replay === undefined) {
      const event: LedgerReconciledEvent = {
        id: deterministicUuidV7<"LedgerEvent">({
          worldSeed: input.worldSeed,
          context: `ledger-reconciled:${input.idempotencyKey}`,
          timestampMilliseconds: timestampOf(asOf.value.toString()),
        }),
        type: "LedgerReconciled",
        gameWorldId: this.state.gameWorldId,
        residualMinor: residual,
        supplyMinor,
        worldDate: asOf.value.toString(),
        rulesetVersion: input.rulesetVersion,
        idempotencyKey: input.idempotencyKey,
      };
      this.state = {
        ...this.state,
        events: [...this.state.events, event],
        revision: this.state.revision + 1,
      };
    }
    return succeed(snapshot);
  }

  public accountBalance(accountId: string): number | null {
    const account = this.state.accounts.find(({ id }) => id === accountId);
    return account === undefined ? null : this.displayedBalance(account);
  }

  public availableBalance(accountId: string): number {
    const account = this.state.accounts.find(({ id }) => id === accountId);
    if (account === undefined) return 0;
    const reserved = this.state.reservations
      .filter(
        (reservation) =>
          reservation.accountId === accountId &&
          reservation.status === ReservationStatus.ACTIVE,
      )
      .reduce((sum, reservation) => sum + reservation.amountMinor, 0);
    return this.displayedBalance(account) - reserved;
  }

  public summary(): LedgerSummary {
    return {
      accountCount: this.state.accounts.length,
      transactionCount: this.state.transactions.length,
      activeReservationCount: this.state.reservations.filter(
        ({ status }) => status === ReservationStatus.ACTIVE,
      ).length,
      residualMinor: this.state.accounts.reduce(
        (sum, account) => sum + account.balanceMinor,
        0,
      ),
    };
  }

  public snapshot(): WorldLedgerSnapshot {
    return this.state;
  }

  private closeReservation(
    input: Readonly<{
      reservationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
    outcome: typeof ReservationStatus.SETTLED | typeof ReservationStatus.RELEASED,
  ): Result<LedgerReservationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    // O replay só vale para a MESMA reserva: settle e release compartilham o
    // evento ReservationSettled, então a chave sozinha não distingue a operação
    // nem o alvo. Casar por reservationId evita retornar a reserva errada quando
    // uma chave é reutilizada para outra reserva.
    const replay = this.findEvent("ReservationSettled", input.idempotencyKey);
    if (replay !== undefined && replay.reservationId === input.reservationId) {
      const reservation = this.state.reservations.find(
        ({ id }) => id === replay.reservationId,
      );
      if (reservation !== undefined) return succeed(reservation);
    }
    const index = this.state.reservations.findIndex(
      ({ id }) => id === input.reservationId,
    );
    if (index < 0) {
      return fail(
        new DomainError("RESERVATION_NOT_FOUND", "Reserva não encontrada.", {
          reservationId: input.reservationId,
        }),
      );
    }
    const reservation = this.state.reservations[index]!;
    if (reservation.status !== ReservationStatus.ACTIVE) {
      return fail(
        new DomainError(
          "RESERVATION_TERMINAL",
          "A reserva já foi liquidada ou liberada.",
          { reservationId: reservation.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const closed: LedgerReservationSnapshot = {
      ...reservation,
      status: outcome,
      version: reservation.version + 1,
    };
    const reservations = [...this.state.reservations];
    reservations[index] = closed;
    const event: ReservationSettledEvent = {
      id: deterministicUuidV7<"LedgerEvent">({
        worldSeed: input.worldSeed,
        context: `reservation-settled:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(date.value.toString()),
      }),
      type: "ReservationSettled",
      gameWorldId: this.state.gameWorldId,
      reservationId: reservation.id,
      outcome: outcome === ReservationStatus.SETTLED ? "SETTLED" : "RELEASED",
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      reservations,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(closed);
  }

  private displayedBalance(account: LedgerAccountSnapshot): number {
    return account.normalBalance === NormalBalance.DEBIT
      ? account.balanceMinor
      : -account.balanceMinor;
  }

  private findEvent<T extends LedgerDomainEvent["type"]>(
    type: T,
    idempotencyKey: string,
  ): Extract<LedgerDomainEvent, { type: T }> | undefined {
    return this.state.events.find(
      (event): event is Extract<LedgerDomainEvent, { type: T }> =>
        event.type === type && event.idempotencyKey === idempotencyKey,
    );
  }
}

function entriesBalance(entries: readonly LedgerEntrySnapshot[]): boolean {
  let debit = 0;
  let credit = 0;
  for (const entry of entries) {
    if (entry.direction === EntryDirection.DEBIT) debit += entry.amountMinor;
    else credit += entry.amountMinor;
  }
  return debit === credit;
}

function signedDelta(direction: EntryDirection, amountMinor: number): number {
  return direction === EntryDirection.DEBIT ? amountMinor : -amountMinor;
}

function normalFor(type: LedgerAccountType): NormalBalance {
  switch (type) {
    case LedgerAccountType.ASSET:
    case LedgerAccountType.EXPENSE:
    case LedgerAccountType.SINK:
      return NormalBalance.DEBIT;
    default:
      return NormalBalance.CREDIT;
  }
}

function isAccountType(value: string): value is LedgerAccountType {
  return (Object.values(LedgerAccountType) as string[]).includes(value);
}

function invalidLedger(message: string): DomainError {
  return new DomainError("INVALID_LEDGER_STATE", message);
}

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente do ledger.",
  );
}

function timestampOf(worldDate: string): number {
  return Date.parse(`${worldDate}T00:00:00.000Z`);
}
