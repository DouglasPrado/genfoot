import {
  JournalEntry,
  MoneyFlowClass,
  JournalLineDirection,
  AccountOwnerScope,
  AccountNormalSide,
  FinancialAccountType,
  SystemAccount,
  INITIAL_ENDOWMENT_MINOR,
  type LedgerAccountSnapshot,
} from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaLedgerRepository } from "../src/prisma-ledger-repository.js";
import { CLUB_ID, WORLD_ID, seedClub, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

const CURRENCY = "019b76da-a800-7787-9462-49c009becccc";
const CASH_ID = "019b76da-a800-7f01-9462-49c009be0001";
const FAUCET_ID = "019b76da-a800-7f02-9462-49c009be0002";

const TABLES = [
  "GameWorld",
  "Club",
  "ClubIdentityPeriod",
  "Stadium",
  "FinancialAccount",
  "JournalEntry",
  "JournalLine",
];

const cashAccount: LedgerAccountSnapshot = {
  id: CASH_ID,
  gameWorldId: WORLD_ID as never,
  ownerScope: AccountOwnerScope.CLUB,
  clubId: CLUB_ID as never,
  systemAccount: null,
  accountCode: `CASH:${CLUB_ID}`,
  accountType: FinancialAccountType.ASSET,
  normalSide: AccountNormalSide.DEBIT,
  currencyId: CURRENCY,
  version: 1,
};

const faucetAccount: LedgerAccountSnapshot = {
  id: FAUCET_ID,
  gameWorldId: WORLD_ID as never,
  ownerScope: AccountOwnerScope.WORLD,
  clubId: null,
  systemAccount: SystemAccount.SYS_INITIAL_ENDOWMENT,
  accountCode: "SYS:INITIAL_ENDOWMENT",
  accountType: FinancialAccountType.SYSTEM_FAUCET,
  normalSide: AccountNormalSide.CREDIT,
  currencyId: CURRENCY,
  version: 1,
};

function endowment(id: string, sourceEventId: string) {
  const posted = JournalEntry.post({
    id,
    gameWorldId: WORLD_ID as never,
    clubId: CLUB_ID as never,
    currencyId: CURRENCY,
    flowClass: MoneyFlowClass.FAUCET,
    sourceEventId,
    occurredOn: "2026-01-01",
    lines: [
      {
        financialAccountId: CASH_ID,
        direction: JournalLineDirection.DEBIT,
        amountMinor: INITIAL_ENDOWMENT_MINOR,
        currencyId: CURRENCY,
      },
      {
        financialAccountId: FAUCET_ID,
        direction: JournalLineDirection.CREDIT,
        amountMinor: INITIAL_ENDOWMENT_MINOR,
        currencyId: CURRENCY,
      },
    ],
  });
  if (!posted.ok) throw posted.error;
  return posted.value.snapshot();
}

describe.skipIf(!hasDatabase)(
  `PrismaLedgerRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let ledger: PrismaLedgerRepository;

    beforeAll(() => {
      client = connect();
      ledger = new PrismaLedgerRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, TABLES);
      await seedWorld(client);
      await seedClub(client);
      await ledger.saveAccount(faucetAccount, null);
      await ledger.saveAccount(cashAccount, null);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("grava o lançamento e o caixa do clube vira a dotação", async () => {
      await ledger.appendJournalEntry(endowment("019b76da-a800-7e01-9462-49c009be0001", "019b76da-a800-7e11-9462-49c009be0001"));
      const cash = await ledger.sumClubCashMinor(
        WORLD_ID as never,
        CLUB_ID as never,
      );
      expect(cash).toBe(INITIAL_ENDOWMENT_MINOR);
    });

    /** R-178: o saldo é projeção — dois créditos e um débito somam certo. */
    it("um segundo lançamento move o saldo", async () => {
      await ledger.appendJournalEntry(endowment("019b76da-a800-7e01-9462-49c009be0001", "019b76da-a800-7e11-9462-49c009be0001"));
      // Gasta metade: credita o caixa, debita um sink (aqui a própria faucet
      // serve de contrapartida para o teste do saldo).
      const spend = JournalEntry.post({
        id: "019b76da-a800-7e03-9462-49c009be0003",
        gameWorldId: WORLD_ID as never,
        clubId: CLUB_ID as never,
        currencyId: CURRENCY,
        flowClass: MoneyFlowClass.SINK,
        sourceEventId: "019b76da-a800-7e12-9462-49c009be0002",
        occurredOn: "2026-01-02",
        lines: [
          {
            financialAccountId: FAUCET_ID,
            direction: JournalLineDirection.DEBIT,
            amountMinor: 200_000_000n,
            currencyId: CURRENCY,
          },
          {
            financialAccountId: CASH_ID,
            direction: JournalLineDirection.CREDIT,
            amountMinor: 200_000_000n,
            currencyId: CURRENCY,
          },
        ],
      });
      if (!spend.ok) throw spend.error;
      await ledger.appendJournalEntry(spend.value.snapshot());

      const cash = await ledger.sumClubCashMinor(
        WORLD_ID as never,
        CLUB_ID as never,
      );
      expect(cash).toBe(INITIAL_ENDOWMENT_MINOR - 200_000_000n);
    });

    /** Um evento, um lançamento (R-191): reprocessar não credita duas vezes. */
    it("o mesmo sourceEventId não credita duas vezes", async () => {
      const first = await ledger.appendJournalEntry(endowment("019b76da-a800-7e01-9462-49c009be0001", "019b76da-a800-7e11-9462-49c009be0001"));
      const second = await ledger.appendJournalEntry(endowment("019b76da-a800-7e02-9462-49c009be0002", "019b76da-a800-7e11-9462-49c009be0001"));
      expect(first).toBe(true);
      expect(second).toBe(false);

      const cash = await ledger.sumClubCashMinor(
        WORLD_ID as never,
        CLUB_ID as never,
      );
      expect(cash).toBe(INITIAL_ENDOWMENT_MINOR);
    });

    it("clube sem lançamento tem caixa zero, não erro", async () => {
      const cash = await ledger.sumClubCashMinor(
        WORLD_ID as never,
        CLUB_ID as never,
      );
      expect(cash).toBe(0n);
    });
  },
);
