import type {
  MentorshipRepositories,
  MentorshipUnitOfWork,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import { PrismaMentorshipRepository } from "./prisma-mentorship-repository.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";

/**
 * A transação do settle da MENTORIA na virada: aplica a evolução acelerada aos
 * pupilos no mesmo commit. Roda no `world:advance-day` / `world:advance-days`.
 */
export class PrismaMentorshipUnitOfWork implements MentorshipUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repos: MentorshipRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(
      (tx: Prisma.TransactionClient) =>
        work({
          mentorships: new PrismaMentorshipRepository(tx),
          players: new PrismaPlayerRepository(tx),
        }),
      { timeout: 120_000, maxWait: 10_000 },
    );
  }
}
