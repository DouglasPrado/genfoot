import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GameWorldSnapshot } from "../world/world-types.js";
import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";
import type { LedgerRepository } from "./ledger-repository.js";
import type {
  AccountingPeriodSnapshot,
  EntryDirection,
  LedgerAccountSnapshot,
  LedgerAccountType,
  LedgerDebtSnapshot,
  LedgerReservationSnapshot,
  LedgerSummary,
  LedgerTransactionSnapshot,
  MoneySupplySnapshot,
  WorldLedgerSnapshot,
} from "./ledger-types.js";
import { WorldLedger } from "./world-ledger.js";

export const INITIAL_CLUB_CASH_MINOR = 500_000_000;

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
    genesis?: WorldGenesisSnapshot,
  ): Promise<Result<WorldLedgerSnapshot, DomainError>> {
    const existing = await this.repository.findLedgerByWorldId(world.id);
    const loaded =
      existing === null
        ? baseCurrency === undefined
          ? WorldLedger.initialize(world)
          : WorldLedger.initialize(world, baseCurrency)
        : WorldLedger.fromSnapshot(existing);
    if (!loaded.ok) return loaded;

    const ledger = loaded.value;
    const expectedRevision = existing?.revision ?? null;
    if (genesis !== undefined) {
      if (genesis.gameWorldId !== world.id) {
        return fail(
          new DomainError(
            "LEDGER_GENESIS_WORLD_MISMATCH",
            "O ledger e a gênese pertencem a mundos diferentes.",
          ),
        );
      }
      const faucet = ledger.openLedgerAccount({
        name: "Emissão monetária da gênese",
        type: "FAUCET",
        rulesetVersion: world.rulesetVersion,
        idempotencyKey: "genesis:money-supply",
        worldSeed: world.seed,
        worldDate: world.startDate,
      });
      if (!faucet.ok) return faucet;
      for (const club of genesis.clubs) {
        const cash = ledger.openLedgerAccount({
          name: `Caixa · ${club.name} · ${club.id}`,
          type: "ASSET",
          rulesetVersion: world.rulesetVersion,
          idempotencyKey: `genesis:club-cash:${club.id}`,
          worldSeed: world.seed,
          worldDate: world.startDate,
        });
        if (!cash.ok) return cash;
        const funded = ledger.postTransaction({
          transactionClass: "INITIAL_CLUB_CASH",
          occurredOn: world.startDate,
          entries: [
            {
              accountId: cash.value.id,
              direction: "DEBIT",
              amountMinor: INITIAL_CLUB_CASH_MINOR,
            },
            {
              accountId: faucet.value.id,
              direction: "CREDIT",
              amountMinor: INITIAL_CLUB_CASH_MINOR,
            },
          ],
          rulesetVersion: world.rulesetVersion,
          idempotencyKey: `genesis:fund-club:${club.id}`,
          worldSeed: world.seed,
          worldDate: world.startDate,
        });
        if (!funded.ok) return funded;
      }
    }
    if (
      expectedRevision === null ||
      ledger.snapshot().revision !== expectedRevision
    ) {
      await this.repository.saveLedger(ledger.snapshot(), expectedRevision);
    }
    return succeed(ledger.snapshot());
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

export class AccrueDebt {
  public constructor(private readonly repository: LedgerRepository) {}

  public execute(
    gameWorldId: GameWorldId,
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
  ): Promise<Result<LedgerDebtSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (ledger) =>
      ledger.accrueDebt(input),
    );
  }
}

export class CloseAccountingPeriod {
  public constructor(private readonly repository: LedgerRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      label: string;
      opensOn: string;
      closesOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<AccountingPeriodSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (ledger) =>
      ledger.closeAccountingPeriod(input),
    );
  }
}

export class ExpireReservations {
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
  ): Promise<Result<readonly LedgerReservationSnapshot[], DomainError>> {
    return mutate(this.repository, gameWorldId, (ledger) =>
      ledger.expireReservations(input),
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

  public async world(
    gameWorldId: GameWorldId,
  ): Promise<Result<WorldLedgerSnapshot, DomainError>> {
    const loaded = await loadLedger(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.snapshot()) : loaded;
  }
}
