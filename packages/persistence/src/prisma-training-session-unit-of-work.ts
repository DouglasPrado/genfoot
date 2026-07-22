import type {
  TrainingSessionRepositories,
  TrainingSessionRepository,
  TrainingSessionSnapshot,
  TrainingSessionUnitOfWork,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaNotificationRepository } from "./prisma-notification-repository.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";

/**
 * A transação do treino de sessão (R-221 Fase 2a): aplicar o ganho no jogador e
 * encerrar a sessão no MESMO commit. Espelha os UoWs de virada — um crash no
 * meio não deixa o atributo aplicado com a sessão ainda aberta (reaplicaria) nem
 * a sessão fechada sem o ganho.
 */
export class PrismaTrainingSessionUnitOfWork
  implements TrainingSessionUnitOfWork
{
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repos: TrainingSessionRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 30_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): TrainingSessionRepositories {
  return {
    players: new PrismaPlayerRepository(tx),
    sessions: new PrismaTrainingSessionRepository(tx),
    notifications: new PrismaNotificationRepository(tx),
  };
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export class PrismaTrainingSessionRepository
  implements TrainingSessionRepository
{
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findActiveByPlayer(
    gameWorldId: string,
    playerId: string,
  ): Promise<TrainingSessionSnapshot | null> {
    const row = await this.client.trainingSession.findFirst({
      where: { gameWorldId, playerId, active: true },
    });
    if (row === null) return null;
    return {
      id: row.id,
      gameWorldId: row.gameWorldId,
      clubId: row.clubId,
      playerId: row.playerId,
      attributeCodes: row.attributeCodes,
      startDate: isoDate(row.startDate),
      durationDays: row.durationDays,
      active: row.active,
      version: row.version,
    };
  }

  public async findAllActive(
    gameWorldId: string,
  ): Promise<readonly TrainingSessionSnapshot[]> {
    const rows = await this.client.trainingSession.findMany({
      where: { gameWorldId, active: true },
    });
    return rows.map((row) => ({
      id: row.id,
      gameWorldId: row.gameWorldId,
      clubId: row.clubId,
      playerId: row.playerId,
      attributeCodes: row.attributeCodes,
      startDate: isoDate(row.startDate),
      durationDays: row.durationDays,
      active: row.active,
      version: row.version,
    }));
  }

  public async existsWithId(
    gameWorldId: string,
    id: string,
  ): Promise<boolean> {
    const row = await this.client.trainingSession.findFirst({
      where: { gameWorldId, id },
      select: { id: true },
    });
    return row !== null;
  }

  public async save(
    session: TrainingSessionSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    if (expectedVersion === null) {
      await this.client.trainingSession.create({
        data: {
          id: session.id,
          gameWorldId: session.gameWorldId,
          clubId: session.clubId,
          playerId: session.playerId,
          attributeCodes: [...session.attributeCodes],
          startDate: new Date(`${session.startDate}T00:00:00.000Z`),
          durationDays: session.durationDays,
          active: session.active,
          version: session.version,
        },
      });
      return;
    }
    const updated = await this.client.trainingSession.updateMany({
      where: { id: session.id, version: expectedVersion },
      data: { active: session.active, version: session.version },
    });
    if (updated.count === 0) {
      throw new Error(
        `AGGREGATE_VERSION_CONFLICT: sessão ${session.id} não está na versão ${expectedVersion}.`,
      );
    }
  }
}
