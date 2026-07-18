import type { LedgerReadModel, LedgerSummaryView } from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Read model financeiro (M-02) — R-191.
 *
 * O caixa de cada clube é PROJEÇÃO: a soma das linhas postadas na conta ASSET
 * dele (R-178). Uma consulta agregada resolve os 16 saldos de uma vez, sem
 * reidratar razão nenhum.
 */
export class PrismaLedgerReadModel implements LedgerReadModel {
  public constructor(private readonly client: PrismaClient) {}

  public async summary(gameWorldId: GameWorldId): Promise<LedgerSummaryView> {
    const [accountCount, transactionCount, cashRows, faucetSum, sinkSum] =
      await Promise.all([
        this.client.financialAccount.count({ where: { gameWorldId } }),
        this.client.journalEntry.count({
          where: { gameWorldId, status: "POSTED" },
        }),
        // Saldo por clube: agrupa as linhas ASSET postadas por conta e direção.
        this.client.journalLine.groupBy({
          by: ["financialAccountId", "direction"],
          where: {
            gameWorldId,
            account: { accountType: "ASSET", ownerScope: "CLUB" },
            entry: { status: "POSTED" },
          },
          _sum: { amountMinor: true },
        }),
        this.sumByType(gameWorldId, "SYSTEM_FAUCET"),
        this.sumByType(gameWorldId, "SYSTEM_SINK"),
      ]);

    // Mapeia conta ASSET → clube, e soma o caixa de cada clube (débito − crédito).
    const accounts = await this.client.financialAccount.findMany({
      where: { gameWorldId, accountType: "ASSET", ownerScope: "CLUB" },
      select: { id: true, clubId: true },
    });
    const accountToClub = new Map(accounts.map((a) => [a.id, a.clubId]));
    const byClub = new Map<string, bigint>();
    for (const row of cashRows) {
      const clubId = accountToClub.get(row.financialAccountId);
      if (clubId == null) continue;
      const amount = row._sum.amountMinor ?? 0n;
      const signed = row.direction === "DEBIT" ? amount : -amount;
      byClub.set(clubId, (byClub.get(clubId) ?? 0n) + signed);
    }

    const clubBalances = [...byClub.entries()].map(([clubId, balance]) => ({
      clubId,
      balanceMinor: Number(balance),
    }));

    // Resíduo da economia fechada: faucets − sinks − caixas dos clubes. 0 = ok.
    const cashTotal = [...byClub.values()].reduce((s, b) => s + b, 0n);
    const residual = faucetSum - sinkSum - cashTotal;

    return {
      accountCount,
      transactionCount,
      // Contextos ainda inexistentes: 0 honesto (reserva de mercado é C6, dívida
      // é o crédito de C9 que ainda não veio, período fechado é fim de temporada).
      activeReservationCount: 0,
      activeDebtCount: 0,
      closedPeriodCount: 0,
      residualMinor: Number(residual),
      clubBalances,
    };
  }

  /** Σ do lado normal (crédito) de todas as contas de um tipo de sistema. */
  private async sumByType(
    gameWorldId: GameWorldId,
    accountType: "SYSTEM_FAUCET" | "SYSTEM_SINK",
  ): Promise<bigint> {
    const rows = await this.client.journalLine.groupBy({
      by: ["direction"],
      where: {
        gameWorldId,
        account: { accountType },
        entry: { status: "POSTED" },
      },
      _sum: { amountMinor: true },
    });
    let credit = 0n;
    let debit = 0n;
    for (const row of rows) {
      const sum = row._sum.amountMinor ?? 0n;
      if (row.direction === "CREDIT") credit += sum;
      else debit += sum;
    }
    // Faucet e sink têm lados normais opostos; o saldo "criado/destruído" é
    // sempre o quanto o lado normal acumulou.
    return accountType === "SYSTEM_FAUCET" ? credit - debit : debit - credit;
  }
}
