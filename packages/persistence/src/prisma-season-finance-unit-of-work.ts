import type {
  SeasonFinancePlayer,
  SeasonFinanceReader,
  SeasonFinanceRepositories,
  SeasonFinanceStructure,
  SeasonFinanceUnitOfWork,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaLedgerRepository } from "./prisma-ledger-repository.js";

/**
 * A transação do encerramento de temporada: o débito de custos de UM clube num
 * commit (razão + leitura na mesma transação). Espelha `PrismaTransferUnitOfWork`
 * — o adapter do razão e o reader recebem o MESMO `TransactionClient`.
 *
 * O débito por clube é idempotente por `sourceEventId` (a virada + o clube +
 * a temporada), então rodar a virada de novo não debita duas vezes.
 */
export class PrismaSeasonFinanceUnitOfWork implements SeasonFinanceUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repositories: SeasonFinanceRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 20_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): SeasonFinanceRepositories {
  return {
    ledger: new PrismaLedgerRepository(tx),
    reader: new PrismaSeasonFinanceReader(tx),
  };
}

/**
 * Lê o elenco (overall/idade + salário do contrato ACTIVE) e a estrutura física
 * do clube — o insumo do modelo de custo de temporada. Mesma composição do read
 * model de finanças, aqui dentro da transação do débito.
 */
export class PrismaSeasonFinanceReader implements SeasonFinanceReader {
  public constructor(
    private readonly client: PrismaClient | Prisma.TransactionClient,
  ) {}

  public async loadSquadForCost(
    gameWorldId: string,
    clubId: string,
    occurredOn: string,
  ): Promise<readonly SeasonFinancePlayer[]> {
    const squad = await this.client.squad.findFirst({
      where: { gameWorldId, clubId, category: "FIRST_TEAM" },
      include: {
        memberships: { include: { player: { include: { person: true } } } },
      },
    });
    if (squad === null) return [];

    const asOf = new Date(`${occurredOn}T00:00:00.000Z`);
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

  public async loadStructure(
    gameWorldId: string,
    clubId: string,
  ): Promise<SeasonFinanceStructure | null> {
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
}

/** Idade em anos completos numa data. */
function ageOn(birthDate: Date, asOf: Date): number {
  let age = asOf.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    asOf.getUTCMonth() < birthDate.getUTCMonth() ||
    (asOf.getUTCMonth() === birthDate.getUTCMonth() &&
      asOf.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
