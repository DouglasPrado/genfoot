import type {
  CollectiveTrainingRepositories,
  CollectiveTrainingUnitOfWork,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import { PrismaNotificationRepository } from "./prisma-notification-repository.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";
import { PrismaTrainingPlanRepository } from "./prisma-training-plan-repository.js";

/**
 * A transação do settle do plano COLETIVO na virada: desenvolve os jogadores
 * pelo foco e grava o aviso-resumo, no mesmo commit. Roda no
 * `world:advance-day` / `world:advance-days`.
 */
export class PrismaCollectiveTrainingUnitOfWork
  implements CollectiveTrainingUnitOfWork
{
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repos: CollectiveTrainingRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(
      (tx: Prisma.TransactionClient) =>
        work({
          plans: new PrismaTrainingPlanRepository(tx),
          players: new PrismaPlayerRepository(tx),
          notifications: new PrismaNotificationRepository(tx),
        }),
      { timeout: 120_000, maxWait: 10_000 },
    );
  }
}
