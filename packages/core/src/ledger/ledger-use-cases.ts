import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GameWorldSnapshot } from "../world/world-types.js";
import type { LedgerRepository } from "./ledger-repository.js";
import type {
  EntryDirection,
  LedgerAccountSnapshot,
  LedgerAccountType,
  LedgerReservationSnapshot,
  LedgerSummary,
  LedgerTransactionSnapshot,
  MoneySupplySnapshot,
  WorldLedgerSnapshot,
} from "./ledger-types.js";
import { WorldLedger } from "./world-ledger.js";

async function loadLedger(
  repository: LedgerRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldLedger, DomainError>> {
  const snapshot = await repository.findLedgerByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "LEDGER_NOT_FOUND",
        "O ledger do mundo ainda não foi inicializado.",
        { gameWorldId },
      ),
    );
  }
  return WorldLedger.fromSnapshot(snapshot);
}

async function mutate<T>(
  repository: LedgerRepository,
  gameWorldId: GameWorldId,
  apply: (ledger: WorldLedger) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadLedger(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.saveLedger(loaded.value.snapshot(), expectedRevision);
  }
  return result;
}

export class InitializeLedger {
  public constructor(private readonly repository: LedgerRepository) {}

  public async execute(
    world: GameWorldSnapshot,
    baseCurrency?: string,
  ): Promise<Result<WorldLedgerSnapshot, DomainError>> {
    const existing = await this.repository.findLedgerByWorldId(world.id);
    if (existing !== null) {
      const validated = WorldLedger.fromSnapshot(existing);
      return validated.ok ? succeed(validated.value.snapshot()) : validated;
    }
    const created =
      baseCurrency === undefined
        ? WorldLedger.initialize(world)
        : WorldLedger.initialize(world, baseCurrency);
    if (!created.ok) return created;
    await this.repository.saveLedger(created.value.snapshot(), null);
    return succeed(created.value.snapshot());
  }
}

export class OpenLedgerAccount {
  public constructor(private readonly repository: LedgerRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      name: string;
      type: LedgerAccountType;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LedgerAccountSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (ledger) =>
      ledger.openLedgerAccount(input),
    );
  }
}

export class PostTransaction {
  public constructor(private readonly repository: LedgerRepository) {}

  public execute(
    gameWorldId: GameWorldId,
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
  ): Promise<Result<LedgerTransactionSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (ledger) =>
      ledger.postTransaction(input),
    );
  }
}

export class ReserveFunds {
  public constructor(private readonly repository: LedgerRepository) {}

  public execute(
    gameWorldId: GameWorldId,
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
  ): Promise<Result<LedgerReservationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (ledger) =>
      ledger.reserveFunds(input),
    );
  }
}

export class SettleReservation {
  public constructor(private readonly repository: LedgerRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      reservationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LedgerReservationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (ledger) =>
      ledger.settleReservation(input),
    );
  }
}

export class ReleaseReservation {
  public constructor(private readonly repository: LedgerRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      reservationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LedgerReservationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (ledger) =>
      ledger.releaseReservation(input),
    );
  }
}

export class ReconcileWorldLedger {
  public constructor(private readonly repository: LedgerRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      asOf: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<MoneySupplySnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (ledger) =>
      ledger.reconcileWorldLedger(input),
    );
  }
}

export class InspectLedger {
  public constructor(private readonly repository: LedgerRepository) {}

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<LedgerSummary, DomainError>> {
    const loaded = await loadLedger(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }
}
