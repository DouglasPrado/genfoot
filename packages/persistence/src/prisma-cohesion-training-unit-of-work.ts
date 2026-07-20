import {
  COHESION_FORMATION_TRAINING_GAIN,
  type CohesionTrainingRepositories,
  type CohesionTrainingUnitOfWork,
  type CohesionWriter,
  type LineupPresenceReader,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";

/**
 * O treino de formação como fonte de coesão (R-220 Fase 3): checar que a
 * escalação existe e subir a coesão do clube no MESMO commit. Espelha o baque de
 * coesão da transferência (`PrismaClubCohesionRepository`), do outro lado do
 * sinal — aqui a coesão sobe.
 */
export class PrismaCohesionTrainingUnitOfWork
  implements CohesionTrainingUnitOfWork
{
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repos: CohesionTrainingRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 30_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): CohesionTrainingRepositories {
  return {
    lineup: new PrismaLineupPresenceReader(tx),
    cohesion: new PrismaCohesionWriter(tx),
  };
}

class PrismaLineupPresenceReader implements LineupPresenceReader {
  public constructor(private readonly tx: Prisma.TransactionClient) {}

  public async hasLineup(
    gameWorldId: string,
    clubId: string,
  ): Promise<boolean> {
    const row = await this.tx.clubLineup.findFirst({
      where: { gameWorldId, clubId },
      select: { id: true },
    });
    return row !== null;
  }
}

class PrismaCohesionWriter implements CohesionWriter {
  public constructor(private readonly tx: Prisma.TransactionClient) {}

  public async raiseByFormationTraining(
    gameWorldId: string,
    clubId: string,
  ): Promise<void> {
    // Simétrico ao applyTransferHit, com sinal trocado e teto 100 (LEAST).
    await this.tx.$executeRaw`
      UPDATE "Club" SET "cohesion" = LEAST(100, "cohesion" + ${COHESION_FORMATION_TRAINING_GAIN})
      WHERE "gameWorldId" = ${gameWorldId}::uuid AND id = ${clubId}::uuid
    `;
  }
}
