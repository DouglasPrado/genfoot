import type {
  WorldClockRepository,
  WorldClockState,
} from "@grinta/core";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Adapter do relógio do mundo (MUNDO-V1). Repo FOCADO: escreve só as colunas de
 * agendamento do `GameWorld` (como o `MatchPlayRepository` escreve `Match`),
 * sem carregar o agregado. `nextTickAt` é `TIMESTAMP` (relógio de parede);
 * `currentDate` é `DATE` (o tempo do mundo, R-177).
 */
export class PrismaWorldClockRepository implements WorldClockRepository {
  public constructor(private readonly client: PrismaClient) {}

  public async getClock(
    gameWorldId: string,
  ): Promise<WorldClockState | null> {
    const row = await this.client.gameWorld.findUnique({
      where: { id: gameWorldId },
      select: {
        id: true,
        realSecondsPerDay: true,
        clockRunning: true,
        nextTickAt: true,
        currentDate: true,
        version: true,
      },
    });
    return row === null ? null : toSnapshot(row);
  }

  public async saveClock(
    gameWorldId: string,
    patch: {
      realSecondsPerDay: number;
      clockRunning: boolean;
      nextTickAtIso: string | null;
    },
    expectedVersion: number,
  ): Promise<void> {
    const { count } = await this.client.gameWorld.updateMany({
      where: { id: gameWorldId, version: expectedVersion },
      data: {
        realSecondsPerDay: patch.realSecondsPerDay,
        clockRunning: patch.clockRunning,
        nextTickAt:
          patch.nextTickAtIso === null ? null : new Date(patch.nextTickAtIso),
        version: expectedVersion + 1,
      },
    });
    if (count === 0) {
      throw new Error(
        `AGGREGATE_VERSION_CONFLICT: relógio do mundo ${gameWorldId} mudou por baixo.`,
      );
    }
  }

  public async dueWorlds(
    nowIso: string,
    limit: number,
  ): Promise<readonly WorldClockState[]> {
    const rows = await this.client.gameWorld.findMany({
      where: {
        status: "ACTIVE",
        clockRunning: true,
        nextTickAt: { lte: new Date(nowIso) },
      },
      orderBy: { nextTickAt: "asc" },
      take: limit,
      select: {
        id: true,
        realSecondsPerDay: true,
        clockRunning: true,
        nextTickAt: true,
        currentDate: true,
        version: true,
      },
    });
    return rows.map(toSnapshot);
  }
}

type ClockRow = {
  id: string;
  realSecondsPerDay: number | null;
  clockRunning: boolean;
  nextTickAt: Date | null;
  currentDate: Date;
  version: number;
};

function toSnapshot(row: ClockRow): WorldClockState {
  return {
    gameWorldId: row.id,
    realSecondsPerDay: row.realSecondsPerDay,
    clockRunning: row.clockRunning,
    nextTickAt: row.nextTickAt === null ? null : row.nextTickAt.toISOString(),
    currentDate: row.currentDate.toISOString().slice(0, 10),
    version: row.version,
  };
}
