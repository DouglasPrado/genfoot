import {
  COHESION_FORMATION_TRAINING_GAIN,
  type CohesionWriter,
  type GroupTrainingSessionRepositories,
  type GroupTrainingSessionRepository,
  type GroupTrainingSessionSnapshot,
  type GroupTrainingSessionUnitOfWork,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";

/**
 * A transação do treino em GRUPO (R-220.2): marcar/liberar os participantes,
 * gravar a sessão e subir a coesão no MESMO commit. Espelha o UoW da sessão
 * individual, no nível do CLUBE.
 */
export class PrismaGroupTrainingSessionUnitOfWork
  implements GroupTrainingSessionUnitOfWork
{
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repos: GroupTrainingSessionRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 30_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): GroupTrainingSessionRepositories {
  return {
    players: new PrismaPlayerRepository(tx),
    sessions: new PrismaGroupTrainingSessionRepository(tx),
    cohesion: new PrismaGroupCohesionWriter(tx),
  };
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export class PrismaGroupTrainingSessionRepository
  implements GroupTrainingSessionRepository
{
  public constructor(private readonly tx: Prisma.TransactionClient) {}

  public async findActiveByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<GroupTrainingSessionSnapshot | null> {
    const row = await this.tx.groupTrainingSession.findFirst({
      where: { gameWorldId, clubId, active: true },
    });
    if (row === null) return null;
    return toSnapshot(row);
  }

  public async save(
    session: GroupTrainingSessionSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    if (expectedVersion === null) {
      await this.tx.groupTrainingSession.create({
        data: {
          id: session.id,
          gameWorldId: session.gameWorldId,
          clubId: session.clubId,
          formation: session.formation,
          participantIds: [...session.participantIds],
          startDate: new Date(`${session.startDate}T00:00:00.000Z`),
          durationDays: session.durationDays,
          active: session.active,
          version: session.version,
        },
      });
      return;
    }
    const updated = await this.tx.groupTrainingSession.updateMany({
      where: { id: session.id, version: expectedVersion },
      data: { active: session.active, version: session.version },
    });
    if (updated.count === 0) {
      throw new Error(
        `AGGREGATE_VERSION_CONFLICT: treino em grupo ${session.id} não está na versão ${expectedVersion}.`,
      );
    }
  }
}

interface GroupRow {
  id: string;
  gameWorldId: string;
  clubId: string;
  formation: string;
  participantIds: string[];
  startDate: Date;
  durationDays: number;
  active: boolean;
  version: number;
}

function toSnapshot(row: GroupRow): GroupTrainingSessionSnapshot {
  return {
    id: row.id,
    gameWorldId: row.gameWorldId,
    clubId: row.clubId,
    formation: row.formation,
    participantIds: row.participantIds,
    startDate: isoDate(row.startDate),
    durationDays: row.durationDays,
    active: row.active,
    version: row.version,
  };
}

/**
 * Leitura da sessão de grupo ATIVA de um clube (R-175: read model separado da
 * porta de escrita). `null` = clube sem treino em grupo em andamento.
 */
export interface GroupTrainingSessionsReadModel {
  activeByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<GroupTrainingSessionSnapshot | null>;
}

export class PrismaGroupTrainingSessionsReadModel
  implements GroupTrainingSessionsReadModel
{
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async activeByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<GroupTrainingSessionSnapshot | null> {
    const row = await this.client.groupTrainingSession.findFirst({
      where: { gameWorldId, clubId, active: true },
    });
    return row === null ? null : toSnapshot(row);
  }
}

class PrismaGroupCohesionWriter implements CohesionWriter {
  public constructor(private readonly tx: Prisma.TransactionClient) {}

  public async raiseByFormationTraining(
    gameWorldId: string,
    clubId: string,
  ): Promise<void> {
    await this.tx.$executeRaw`
      UPDATE "Club" SET "cohesion" = LEAST(100, "cohesion" + ${COHESION_FORMATION_TRAINING_GAIN})
      WHERE "gameWorldId" = ${gameWorldId}::uuid AND id = ${clubId}::uuid
    `;
  }
}
