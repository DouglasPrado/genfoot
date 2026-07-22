import {
  COHESION_FORMATION_TRAINING_GAIN,
  type AiTrainingReader,
  type AiTrainingRepositories,
  type AiTrainingUnitOfWork,
  type CohesionWriter,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";

/**
 * A transação do treino dos clubes de IA na virada (balanceamento): desenvolve
 * os jogadores e sobe o entrosamento dos clubes SEM controle humano, no mesmo
 * commit. Roda no `world:advance-day` / `world:advance-days`.
 */
export class PrismaAiTrainingUnitOfWork implements AiTrainingUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repos: AiTrainingRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 120_000,
      maxWait: 10_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): AiTrainingRepositories {
  return {
    reader: new PrismaAiTrainingReader(tx),
    players: new PrismaPlayerRepository(tx),
    cohesion: new AiCohesionWriter(tx),
  };
}

class PrismaAiTrainingReader implements AiTrainingReader {
  public constructor(private readonly tx: Prisma.TransactionClient) {}

  /** Clubes do mundo SEM ClubControl ativo — os de IA. */
  public async aiClubIds(gameWorldId: string): Promise<readonly string[]> {
    const rows = await this.tx.$queryRaw<{ id: string }[]>`
      SELECT c.id
      FROM "Club" c
      WHERE c."gameWorldId" = ${gameWorldId}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM "ClubControl" cc
          WHERE cc."gameWorldId" = c."gameWorldId"
            AND cc."clubId" = c.id
            AND cc.status = 'ACTIVE'
        )
    `;
    return rows.map((r) => r.id);
  }

  /** Jogadores APTOS do elenco profissional, mais folga de potencial primeiro. */
  public async availablePlayerIds(
    gameWorldId: string,
    clubId: string,
    limit: number,
  ): Promise<readonly string[]> {
    const rows = await this.tx.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM "Player" p
      JOIN "SquadMembership" sm ON sm."playerId" = p.id AND sm."isActive" = TRUE
      JOIN "Squad" s ON s.id = sm."squadId"
      WHERE s."gameWorldId" = ${gameWorldId}::uuid
        AND s."clubId" = ${clubId}::uuid
        AND s.category = 'FIRST_TEAM'
        AND p.availability = 'AVAILABLE'
      ORDER BY (p."potentialAbility" - p."currentAbility") DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => r.id);
  }
}

class AiCohesionWriter implements CohesionWriter {
  public constructor(private readonly tx: Prisma.TransactionClient) {}

  public async raiseByFormationTraining(
    gameWorldId: string,
    clubId: string,
    bonusPoints = 0,
  ): Promise<void> {
    const gain = COHESION_FORMATION_TRAINING_GAIN + Math.max(0, bonusPoints);
    await this.tx.$executeRaw`
      UPDATE "Club" SET "cohesion" = LEAST(100, "cohesion" + ${gain})
      WHERE "gameWorldId" = ${gameWorldId}::uuid AND id = ${clubId}::uuid
    `;
  }
}
