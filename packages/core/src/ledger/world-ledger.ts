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
  AccountingPeriodStatus,
  DebtStatus,
  EntryDirection,
  LedgerAccountType,
  NormalBalance,
  ReservationStatus,
  type AccountingPeriodClosedEvent,
  type AccountingPeriodSnapshot,
  type DebtAccruedEvent,
  type FundsReservedEvent,
  type LedgerAccountSnapshot,
  type LedgerDebtSnapshot,
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
      debts: [],
      accountingPeriods: [],
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
    const debtIds = new Set<string>();
    for (const debt of snapshot.debts ?? []) {
      if (
        debt.gameWorldId !== snapshot.gameWorldId ||
        debt.currency !== snapshot.baseCurrency ||
        debt.principalMinor <= 0 ||
        debt.outstandingMinor < 0 ||
        debt.scheduleMonths < 1 ||
        debt.interestRateBps < 0 ||
        debtIds.has(debt.id)
      ) {
        return fail(invalidLedger("Dívida inválida."));
      }
      debtIds.add(debt.id);
    }
    const periodIds = new Set<string>();
    for (const period of snapshot.accountingPeriods ?? []) {
      if (
        period.gameWorldId !== snapshot.gameWorldId ||
        period.opensOn > period.closesOn ||
        periodIds.has(period.id)
      ) {
        return fail(invalidLedger("Período contábil inválido."));
      }
      periodIds.add(period.id);
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
    const closedPeriod = (this.state.accountingPeriods ?? []).find(
      (period) =>
        period.status === AccountingPeriodStatus.CLOSED &&
        occurredOn.value.toString() >= period.opensOn &&
        occurredOn.value.toString() <= period.closesOn,
    );
    if (closedPeriod !== undefined) {
      return fail(
        new DomainError(
          "ACCOUNTING_PERIOD_CLOSED",
          "Não é possível lançar em um período contábil já fechado.",
          { periodId: closedPeriod.id, occurredOn: occurredOn.value.toString() },
        ),
      );
    }
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

  public accrueDebt(
    input: Readonly<{
      creditorRef: string;
      debtorRef: string;
      principalMinor: number;
      scheduleMonths: number;
      interestRateBps: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<LedgerDebtSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("DebtAccrued", input.idempotencyKey);
    if (replay !== undefined) {
      const debt = (this.state.debts ?? []).find(({ id }) => id === replay.debtId);
      if (debt !== undefined) return succeed(debt);
    }
    if (
      input.creditorRef.trim() === "" ||
      input.debtorRef.trim() === "" ||
      input.creditorRef === input.debtorRef ||
      !Number.isSafeInteger(input.principalMinor) ||
      input.principalMinor <= 0 ||
      !Number.isSafeInteger(input.scheduleMonths) ||
      input.scheduleMonths < 1 ||
      !Number.isSafeInteger(input.interestRateBps) ||
      input.interestRateBps < 0
    ) {
      return fail(new DomainError("INVALID_DEBT", "Dados de dívida inválidos."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const timestampMilliseconds = timestampOf(date.value.toString());
    const debtId = deterministicUuidV7<"LedgerDebt">({
      worldSeed: input.worldSeed,
      context: `ledger-debt:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    // Juros totais previstos = principal × (bps/10000) × (meses/12), inteiro.
    const interest = Math.round(
      (input.principalMinor * input.interestRateBps * input.scheduleMonths) /
        (10000 * 12),
    );
    const debt: LedgerDebtSnapshot = {
      id: debtId,
      gameWorldId: this.state.gameWorldId,
      creditorRef: input.creditorRef,
      debtorRef: input.debtorRef,
      currency: this.state.baseCurrency,
      principalMinor: input.principalMinor,
      outstandingMinor: input.principalMinor + interest,
      scheduleMonths: input.scheduleMonths,
      interestRateBps: input.interestRateBps,
      status: DebtStatus.ACTIVE,
      accruedOn: date.value.toString(),
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: DebtAccruedEvent = {
      id: deterministicUuidV7<"LedgerEvent">({
        worldSeed: input.worldSeed,
        context: `debt-accrued:${input.idempotencyKey}`,
        timestampMilliseconds,
      }),
      type: "DebtAccrued",
      gameWorldId: this.state.gameWorldId,
      debtId,
      debtorRef: input.debtorRef,
      creditorRef: input.creditorRef,
      principalMinor: input.principalMinor,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      debts: [...(this.state.debts ?? []), debt],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(debt);
  }

  public closeAccountingPeriod(
    input: Readonly<{
      label: string;
      opensOn: string;
      closesOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<AccountingPeriodSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("AccountingPeriodClosed", input.idempotencyKey);
    if (replay !== undefined) {
      const period = (this.state.accountingPeriods ?? []).find(
        ({ id }) => id === replay.periodId,
      );
      if (period !== undefined) return succeed(period);
    }
    const opensOn = WorldDate.parse(input.opensOn);
    if (!opensOn.ok) return opensOn;
    const closesOn = WorldDate.parse(input.closesOn);
    if (!closesOn.ok) return closesOn;
    if (
      input.label.trim() === "" ||
      opensOn.value.toString() > closesOn.value.toString()
    ) {
      return fail(
        new DomainError(
          "INVALID_ACCOUNTING_PERIOD",
          "Rótulo e vigência do período devem ser válidos.",
        ),
      );
    }
    const overlap = (this.state.accountingPeriods ?? []).some(
      (period) =>
        period.status === AccountingPeriodStatus.CLOSED &&
        period.opensOn <= closesOn.value.toString() &&
        opensOn.value.toString() <= period.closesOn,
    );
    if (overlap) {
      return fail(
        new DomainError(
          "ACCOUNTING_PERIOD_OVERLAP",
          "Já existe um período fechado sobreposto.",
        ),
      );
    }
    const residual = this.state.accounts.reduce(
      (sum, account) => sum + account.balanceMinor,
      0,
    );
    if (residual !== 0) {
      return fail(
        new DomainError(
          "LEDGER_IMBALANCED",
          "Não é possível fechar um período com residual diferente de zero.",
          { residualMinor: residual },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const supplyMinor = this.state.accounts
      .filter((account) => account.type === LedgerAccountType.ASSET)
      .reduce((sum, account) => sum + this.displayedBalance(account), 0);
    const periodId = deterministicUuidV7<"LedgerAccountingPeriod">({
      worldSeed: input.worldSeed,
      context: `accounting-period:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(closesOn.value.toString()),
    });
    const period: AccountingPeriodSnapshot = {
      id: periodId,
      gameWorldId: this.state.gameWorldId,
      label: input.label.trim(),
      opensOn: opensOn.value.toString(),
      closesOn: closesOn.value.toString(),
      status: AccountingPeriodStatus.CLOSED,
      closingResidualMinor: residual,
      closingSupplyMinor: supplyMinor,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: AccountingPeriodClosedEvent = {
      id: deterministicUuidV7<"LedgerEvent">({
        worldSeed: input.worldSeed,
        context: `period-closed:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(closesOn.value.toString()),
      }),
      type: "AccountingPeriodClosed",
      gameWorldId: this.state.gameWorldId,
      periodId,
      closesOn: closesOn.value.toString(),
      residualMinor: residual,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      accountingPeriods: [...(this.state.accountingPeriods ?? []), period],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(period);
  }

  /**
   * Expira, na data lógica `asOf`, toda reserva ACTIVE já vencida. Naturalmente
   * idempotente: reservas já EXPIRED não são reprocessadas. Não altera a razão.
   */
  public expireReservations(
    input: Readonly<{
      asOf: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<readonly LedgerReservationSnapshot[], DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const asOf = WorldDate.parse(input.asOf);
    if (!asOf.ok) return asOf;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const expiring = this.state.reservations.filter(
      (reservation) =>
        reservation.status === ReservationStatus.ACTIVE &&
        reservation.expiresOn < asOf.value.toString(),
    );
    if (expiring.length === 0) return succeed([]);
    const expiredIds = new Set(expiring.map((reservation) => reservation.id));
    const reservations = this.state.reservations.map((reservation) =>
      expiredIds.has(reservation.id)
        ? {
            ...reservation,
            status: ReservationStatus.EXPIRED,
            version: reservation.version + 1,
          }
        : reservation,
    );
    const timestampMilliseconds = timestampOf(date.value.toString());
    const events: ReservationSettledEvent[] = expiring.map((reservation) => ({
      id: deterministicUuidV7<"LedgerEvent">({
        worldSeed: input.worldSeed,
        context: `reservation-expired:${input.idempotencyKey}:${reservation.id}`,
        timestampMilliseconds,
      }),
      type: "ReservationSettled",
      gameWorldId: this.state.gameWorldId,
      reservationId: reservation.id,
      outcome: "EXPIRED",
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: `${input.idempotencyKey}:${reservation.id}`,
    }));
    this.state = {
      ...this.state,
      reservations,
      events: [...this.state.events, ...events],
      revision: this.state.revision + 1,
    };
    return succeed(
      reservations.filter((reservation) => expiredIds.has(reservation.id)),
    );
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
      activeDebtCount: (this.state.debts ?? []).filter(
        ({ status }) => status === DebtStatus.ACTIVE,
      ).length,
      closedPeriodCount: (this.state.accountingPeriods ?? []).filter(
        ({ status }) => status === AccountingPeriodStatus.CLOSED,
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
