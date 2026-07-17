import type {
  ClubId,
  JournalEntrySnapshot,
  LedgerAccountSnapshot,
  LedgerRepository,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter do razão de C9 (R-178/R-191).
 *
 * `TransactionClient` no construtor: um lançamento é a linha `JournalEntry` mais
 * N `JournalLine`, e meio lançamento gravado é um razão desbalanceado — o pior
 * estado possível de uma contabilidade. Quem chama tem de estar em transação.
 *
 * `sumClubCashMinor` NÃO lê uma coluna de saldo: soma os débitos e créditos das
 * linhas postadas na conta de caixa do clube (R-178). O saldo é projeção.
 */
export class PrismaLedgerRepository implements LedgerRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findAccount(
    gameWorldId: GameWorldId,
    ownerScope: LedgerAccountSnapshot["ownerScope"],
    accountCode: string,
  ): Promise<LedgerAccountSnapshot | null> {
    const row = await this.client.financialAccount.findUnique({
      where: {
        gameWorldId_ownerScope_accountCode: {
          gameWorldId,
          ownerScope,
          accountCode,
        },
      },
    });
    return row === null ? null : toAccount(row);
  }

  public async saveAccount(
    snapshot: LedgerAccountSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    if (expectedVersion === null) {
      await this.client.financialAccount.create({
        data: {
          id: snapshot.id,
          gameWorldId: snapshot.gameWorldId,
          ownerScope: snapshot.ownerScope,
          clubId: snapshot.clubId,
          systemAccount: snapshot.systemAccount,
          accountCode: snapshot.accountCode,
          accountType: snapshot.accountType,
          normalSide: snapshot.normalSide,
          currencyId: snapshot.currencyId,
          version: snapshot.version,
        },
      });
      return;
    }
    const { count } = await this.client.financialAccount.updateMany({
      where: { id: snapshot.id, version: expectedVersion },
      data: { status: "ACTIVE", version: snapshot.version },
    });
    if (count === 0) {
      throw new Error(
        `AGGREGATE_VERSION_CONFLICT: conta ${snapshot.id} mudou por baixo.`,
      );
    }
  }

  public async appendJournalEntry(
    snapshot: JournalEntrySnapshot,
  ): Promise<boolean> {
    // Idempotência por evento (R-191): um evento, um lançamento. Reprocessar não
    // credita dinheiro de novo.
    if (snapshot.sourceEventId !== null) {
      const existing = await this.client.journalEntry.findFirst({
        where: {
          gameWorldId: snapshot.gameWorldId,
          sourceEventId: snapshot.sourceEventId,
        },
        select: { id: true },
      });
      if (existing !== null) return false;
    }

    await this.client.journalEntry.create({
      data: {
        id: snapshot.id,
        gameWorldId: snapshot.gameWorldId,
        clubId: snapshot.clubId,
        currencyId: snapshot.currencyId,
        flowClass: snapshot.flowClass,
        status: snapshot.status,
        description: snapshot.description,
        reversalOfJournalEntryId: snapshot.reversalOfJournalEntryId,
        sourceEventId: snapshot.sourceEventId,
        seasonNumber: snapshot.seasonNumber,
        occurredAt: new Date(`${snapshot.occurredOn}T00:00:00.000Z`),
        postedAt:
          snapshot.postedOn === null
            ? null
            : new Date(`${snapshot.postedOn}T00:00:00.000Z`),
        version: snapshot.version,
        lines: {
          create: snapshot.lines.map((line) => ({
            gameWorldId: snapshot.gameWorldId,
            lineNumber: line.lineNumber,
            financialAccountId: line.financialAccountId,
            direction: line.direction,
            amountMinor: line.amountMinor,
            currencyId: line.currencyId,
          })),
        },
      },
    });
    return true;
  }

  public async sumClubCashMinor(
    gameWorldId: GameWorldId,
    clubId: ClubId,
  ): Promise<bigint> {
    // O caixa é a conta ASSET/DEBIT do clube: Σ débitos − Σ créditos das linhas
    // POSTADAS nela. Um GROUP BY por direção, somado com o sinal do lado normal.
    const rows = await this.client.journalLine.groupBy({
      by: ["direction"],
      where: {
        gameWorldId,
        account: { clubId, accountType: "ASSET", ownerScope: "CLUB" },
        entry: { status: "POSTED" },
      },
      _sum: { amountMinor: true },
    });
    let debit = 0n;
    let credit = 0n;
    for (const row of rows) {
      const sum = row._sum.amountMinor ?? 0n;
      if (row.direction === "DEBIT") debit += sum;
      else credit += sum;
    }
    return debit - credit;
  }
}

function toAccount(
  row: Prisma.FinancialAccountGetPayload<object>,
): LedgerAccountSnapshot {
  return {
    id: row.id,
    gameWorldId: row.gameWorldId as GameWorldId,
    ownerScope: row.ownerScope,
    clubId: (row.clubId ?? null) as ClubId | null,
    systemAccount: row.systemAccount,
    accountCode: row.accountCode,
    accountType: row.accountType,
    normalSide: row.normalSide,
    currencyId: row.currencyId,
    version: row.version,
  };
}
