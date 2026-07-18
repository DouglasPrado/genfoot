import { describe, expect, it } from "vitest";

import { ClubDepartmentKind } from "../clubs/club-types.js";

import {
  CloseSeasonFinances,
  type SeasonFinancePlayer,
  type SeasonFinanceReader,
  type SeasonFinanceRepositories,
  type SeasonFinanceStructure,
  type SeasonFinanceUnitOfWork,
} from "./close-season-finances.js";
import { accountBalanceMinor } from "./journal-entry.js";
import { JournalEntry } from "./journal-entry.js";
import { BASE_CURRENCY_ID, INITIAL_ENDOWMENT_MINOR } from "./ledger-bootstrap.js";
import type { LedgerRepository } from "./ledger-repository.js";
import {
  AccountNormalSide,
  AccountOwnerScope,
  FinancialAccountType,
  JournalLineDirection,
  MoneyFlowClass,
  SystemAccount,
  type JournalEntrySnapshot,
  type LedgerAccountSnapshot,
} from "./ledger-types.js";

const WORLD = "world-1";
const CLUB = "club-1";

function account(
  overrides: Partial<LedgerAccountSnapshot> & Pick<LedgerAccountSnapshot, "id" | "accountCode">,
): LedgerAccountSnapshot {
  return {
    gameWorldId: WORLD as never,
    ownerScope: AccountOwnerScope.WORLD,
    clubId: null,
    systemAccount: null,
    accountType: FinancialAccountType.SYSTEM_SINK,
    normalSide: AccountNormalSide.DEBIT,
    currencyId: BASE_CURRENCY_ID,
    version: 1,
    ...overrides,
  };
}

/** Razão in-memory: contas fixas + lançamentos, com dedup por sourceEventId. */
class FakeLedger implements LedgerRepository {
  public readonly accounts: LedgerAccountSnapshot[];
  public readonly entries: JournalEntrySnapshot[] = [];

  public constructor() {
    this.accounts = [
      account({
        id: "acc-cash",
        accountCode: `CASH:${CLUB}`,
        ownerScope: AccountOwnerScope.CLUB,
        clubId: CLUB as never,
        accountType: FinancialAccountType.ASSET,
        normalSide: AccountNormalSide.DEBIT,
      }),
      account({
        id: "acc-faucet",
        accountCode: "SYS:INITIAL_ENDOWMENT",
        systemAccount: SystemAccount.SYS_INITIAL_ENDOWMENT,
        accountType: FinancialAccountType.SYSTEM_FAUCET,
        normalSide: AccountNormalSide.CREDIT,
      }),
      account({
        id: "acc-wage-sink",
        accountCode: "SYS:WAGE_SINK",
        systemAccount: SystemAccount.SYS_WAGE_SINK,
      }),
      account({
        id: "acc-operating-sink",
        accountCode: "SYS:OPERATING_SINK",
        systemAccount: SystemAccount.SYS_OPERATING_SINK,
      }),
    ];

    // Dotação inicial: debita caixa, credita a torneira.
    const endowment = JournalEntry.post({
      id: "endowment",
      gameWorldId: WORLD as never,
      clubId: CLUB as never,
      currencyId: BASE_CURRENCY_ID,
      flowClass: MoneyFlowClass.FAUCET,
      sourceEventId: "endowment-event",
      seasonNumber: 1,
      occurredOn: "2026-01-01",
      lines: [
        {
          financialAccountId: "acc-cash",
          direction: JournalLineDirection.DEBIT,
          amountMinor: INITIAL_ENDOWMENT_MINOR,
          currencyId: BASE_CURRENCY_ID,
        },
        {
          financialAccountId: "acc-faucet",
          direction: JournalLineDirection.CREDIT,
          amountMinor: INITIAL_ENDOWMENT_MINOR,
          currencyId: BASE_CURRENCY_ID,
        },
      ],
    });
    if (!endowment.ok) throw endowment.error;
    this.entries.push(endowment.value.snapshot());
  }

  public findAccount(
    _worldId: never,
    scope: LedgerAccountSnapshot["ownerScope"],
    code: string,
  ): Promise<LedgerAccountSnapshot | null> {
    return Promise.resolve(
      this.accounts.find((a) => a.ownerScope === scope && a.accountCode === code) ??
        null,
    );
  }

  public saveAccount(): Promise<void> {
    return Promise.resolve();
  }

  public appendJournalEntry(snapshot: JournalEntrySnapshot): Promise<boolean> {
    if (
      snapshot.sourceEventId !== null &&
      this.entries.some((e) => e.sourceEventId === snapshot.sourceEventId)
    ) {
      return Promise.resolve(false);
    }
    this.entries.push(snapshot);
    return Promise.resolve(true);
  }

  public sumClubCashMinor(): Promise<bigint> {
    const cash = this.accounts.find((a) => a.id === "acc-cash")!;
    return Promise.resolve(accountBalanceMinor(cash, this.allLines()));
  }

  public allLines() {
    return this.entries.flatMap((e) => e.lines);
  }

  /** Resíduo da economia fechada: Σfaucets − Σsinks − Σcaixas (ECO-003). */
  public residualMinor(): bigint {
    const lines = this.allLines();
    let faucet = 0n;
    let sink = 0n;
    let cash = 0n;
    for (const acc of this.accounts) {
      const balance = accountBalanceMinor(acc, lines);
      if (acc.accountType === FinancialAccountType.SYSTEM_FAUCET) faucet += balance;
      else if (acc.accountType === FinancialAccountType.SYSTEM_SINK) sink += balance;
      else if (acc.accountType === FinancialAccountType.ASSET) cash += balance;
    }
    return faucet - sink - cash;
  }
}

function reader(
  players: readonly SeasonFinancePlayer[],
  structure: SeasonFinanceStructure | null,
): SeasonFinanceReader {
  return {
    loadSquadForCost: () => Promise.resolve(players),
    loadStructure: () => Promise.resolve(structure),
  };
}

function unitOfWork(ledger: FakeLedger, rdr: SeasonFinanceReader): SeasonFinanceUnitOfWork {
  return {
    async run(work) {
      const repos: SeasonFinanceRepositories = { ledger, reader: rdr };
      return work(repos);
    },
  };
}

const structure: SeasonFinanceStructure = {
  departments: Object.values(ClubDepartmentKind).map((kind) => ({
    kind,
    level: 1,
    capacity: 10,
    condition: 100,
  })),
  stadium: { capacity: 10_000, condition: 100 },
};

const genesisSquad: readonly SeasonFinancePlayer[] = Array.from(
  { length: 23 },
  (_, index) => ({
    playerId: `player-${index}`,
    overall: 60,
    age: 25,
    salaryPerSeasonMinor: null,
  }),
);

const input = {
  gameWorldId: WORLD,
  clubId: CLUB,
  seasonNumber: 1,
  worldSeed: "seed-1",
  occurredOn: "2026-12-31",
};

describe("CloseSeasonFinances", () => {
  it("debita exatamente o custo da temporada do caixa do clube", async () => {
    const ledger = new FakeLedger();
    const useCase = new CloseSeasonFinances(unitOfWork(ledger, reader(genesisSquad, structure)));

    const result = await useCase.execute(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const debited = BigInt(result.value.debitedMinor);
    expect(debited).toBe(result.value.breakdown.totalMinor);
    expect(debited).toBeGreaterThan(0n);
    expect(await ledger.sumClubCashMinor()).toBe(INITIAL_ENDOWMENT_MINOR - debited);
  });

  it("preserva a conservação: resíduo continua 0 após o débito", async () => {
    const ledger = new FakeLedger();
    const useCase = new CloseSeasonFinances(unitOfWork(ledger, reader(genesisSquad, structure)));
    await useCase.execute(input);
    expect(ledger.residualMinor()).toBe(0n);
  });

  it("é idempotente: reprocessar a mesma virada não debita duas vezes", async () => {
    const ledger = new FakeLedger();
    const useCase = new CloseSeasonFinances(unitOfWork(ledger, reader(genesisSquad, structure)));

    const first = await useCase.execute(input);
    const cashAfterFirst = await ledger.sumClubCashMinor();
    const second = await useCase.execute(input);

    expect(first.ok && first.value.posted).toBe(true);
    expect(second.ok && second.value.posted).toBe(false);
    expect(await ledger.sumClubCashMinor()).toBe(cashAfterFirst);
  });

  it("o débito é incondicional: pode levar o caixa a negativo sem erro", async () => {
    const ledger = new FakeLedger();
    // Elenco caríssimo: uma folha muito acima do caixa de R$5M.
    const richSquad: SeasonFinancePlayer[] = Array.from({ length: 30 }, (_, i) => ({
      playerId: `star-${i}`,
      overall: 90,
      age: 25,
      salaryPerSeasonMinor: 30_000_000n,
    }));
    const useCase = new CloseSeasonFinances(unitOfWork(ledger, reader(richSquad, structure)));

    const result = await useCase.execute(input);
    expect(result.ok).toBe(true);
    expect(await ledger.sumClubCashMinor()).toBeLessThan(0n);
    expect(ledger.residualMinor()).toBe(0n);
  });

  it("recusa clube sem estrutura", async () => {
    const ledger = new FakeLedger();
    const useCase = new CloseSeasonFinances(unitOfWork(ledger, reader(genesisSquad, null)));
    const result = await useCase.execute(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CLUB_NOT_FOUND");
  });
});
