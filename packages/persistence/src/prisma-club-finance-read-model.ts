import {
  BASE_CURRENCY_ID,
  computeFinancialHealth,
  computeSeasonCost,
  toSeasonCostBreakdownView,
  type ClubFinanceReadModel,
  type ClubFinanceSnapshotView,
  type SeasonCostModelInput,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Read model da tela de Finanças (M-FINANCE / M-ACCOUNTING) — a query
 * `finance-snapshot` (doc 23 linha 33).
 *
 * COMPÕE dado real que já existe: o caixa do razão (INV-8, saldo derivado), o
 * elenco (overall/idade) com o salário do contrato ACTIVE quando há, e a
 * estrutura física (departamentos + estádio). O custo é o modelo puro do core; a
 * saúde financeira, a fórmula R-42 — nenhum número inventado. O que não tem
 * fonte (receita mensal, dívida) vai como `null`/omitido, não como R$ 0.
 */
export class PrismaClubFinanceReadModel implements ClubFinanceReadModel {
  public constructor(private readonly client: PrismaClient) {}

  public async snapshot(
    gameWorldId: GameWorldId,
    clubId: string,
  ): Promise<ClubFinanceSnapshotView | null> {
    const [players, structure, cashMinor] = await Promise.all([
      this.loadPlayers(gameWorldId, clubId),
      this.loadStructure(gameWorldId, clubId),
      this.sumClubCashMinor(gameWorldId, clubId),
    ]);
    if (structure === null) return null;

    const input: SeasonCostModelInput = {
      currencyId: BASE_CURRENCY_ID,
      players,
      departments: structure.departments,
      stadium: structure.stadium,
    };
    const breakdown = computeSeasonCost(input);
    const financialHealth = computeFinancialHealth({
      cashMinor,
      seasonCostMinor: breakdown.totalMinor,
      // Receita mensal e dívida ainda não têm fonte materializada: null honesto.
      monthlyRevenueMinor: null,
      debtMinor: null,
    });

    const provenanceNotes: string[] = [];
    if (breakdown.estimatedPlayerCount > 0) {
      provenanceNotes.push(
        `Folha de ${breakdown.estimatedPlayerCount} jogador(es) sem contrato é estimada (R-189).`,
      );
    }
    if (breakdown.contractedPlayerCount > 0) {
      provenanceNotes.push(
        `Folha de ${breakdown.contractedPlayerCount} jogador(es) vem do contrato.`,
      );
    }
    provenanceNotes.push(
      "Manutenção de infra/estádio é estimativa de 1ª passada (sem coeficiente ratificado).",
    );

    return {
      clubId,
      currencyId: BASE_CURRENCY_ID,
      cashMinor: Number(cashMinor),
      seasonCost: toSeasonCostBreakdownView(breakdown),
      financialHealth,
      provenanceNotes,
    };
  }

  /** O elenco da primeira equipe, com o salário do contrato ACTIVE (ou null). */
  private async loadPlayers(gameWorldId: GameWorldId, clubId: string) {
    const squad = await this.client.squad.findFirst({
      where: { gameWorldId, clubId, category: "FIRST_TEAM" },
      include: {
        memberships: { include: { player: { include: { person: true } } } },
      },
    });
    if (squad === null) return [];

    const world = await this.client.gameWorld.findUnique({
      where: { id: gameWorldId },
      select: { currentDate: true },
    });
    const asOf = world?.currentDate ?? new Date();

    const playerIds = squad.memberships.map((m) => m.player.id);
    const contracts = await this.client.playerContract.findMany({
      where: { gameWorldId, playerId: { in: playerIds }, status: "ACTIVE" },
      select: { playerId: true, salaryPerSeasonMinor: true },
    });
    const salaryByPlayer = new Map(
      contracts.map((c) => [c.playerId, c.salaryPerSeasonMinor]),
    );

    return squad.memberships.map((m) => ({
      playerId: m.player.id,
      overall: m.player.currentAbility,
      age: ageOn(m.player.person.birthDate, asOf),
      salaryPerSeasonMinor: salaryByPlayer.get(m.player.id) ?? null,
    }));
  }

  private async loadStructure(gameWorldId: GameWorldId, clubId: string) {
    const [departments, stadium] = await Promise.all([
      this.client.clubDepartment.findMany({
        where: { gameWorldId, clubId },
        select: { type: true, level: true, capacity: true, condition: true },
      }),
      this.client.stadium.findUnique({
        where: { gameWorldId_clubId: { gameWorldId, clubId } },
        select: { capacity: true, condition: true },
      }),
    ]);
    if (stadium === null) return null;
    return {
      departments: departments.map((d) => ({
        kind: d.type,
        level: d.level,
        capacity: d.capacity,
        condition: d.condition,
      })),
      stadium: { capacity: stadium.capacity, condition: stadium.condition },
    };
  }

  /** Caixa do clube: Σ das linhas ASSET postadas (débito − crédito). */
  private async sumClubCashMinor(
    gameWorldId: GameWorldId,
    clubId: string,
  ): Promise<bigint> {
    const rows = await this.client.journalLine.groupBy({
      by: ["direction"],
      where: {
        gameWorldId,
        account: { accountType: "ASSET", ownerScope: "CLUB", clubId },
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

/** Idade em anos completos na data do mundo. */
function ageOn(birthDate: Date, asOf: Date): number {
  let age = asOf.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    asOf.getUTCMonth() < birthDate.getUTCMonth() ||
    (asOf.getUTCMonth() === birthDate.getUTCMonth() &&
      asOf.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
