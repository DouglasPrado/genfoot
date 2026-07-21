import type {
  IndividualTrainingRepositories,
  IndividualTrainingUnitOfWork,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import { PrismaIndividualTrainingPlanRepository } from "./prisma-individual-training-plan-repository.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";

/**
 * A transação do settle dos planos INDIVIDUAIS na virada: aplica cada plano ao
 * seu jogador (desenvolvimento rumo ao alvo) no mesmo commit. Roda no
 * `world:advance-day` / `world:advance-days`, junto dos demais settles.
 */
export class PrismaIndividualTrainingUnitOfWork
  implements IndividualTrainingUnitOfWork
{
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repos: IndividualTrainingRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(
      (tx: Prisma.TransactionClient) =>
        work({
          plans: new PrismaIndividualTrainingPlanRepository(tx),
          players: new PrismaPlayerRepository(tx),
        }),
      { timeout: 120_000, maxWait: 10_000 },
    );
  }
}
