import type {
  CompetitionRepositories,
  CompetitionUnitOfWork,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import { PrismaLedgerRepository } from "./prisma-ledger-repository.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaCompetitionAggregateRepository } from "./prisma-competition-aggregate-repository.js";

/**
 * A transação dos commands de competição autorada (C7). Um agregado por commit;
 * o `TransactionClient` (sem `$transaction`) mantém `Competition` + edição +
 * participantes atômicos.
 */
export class PrismaCompetitionUnitOfWork implements CompetitionUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repositories: CompetitionRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 15_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): CompetitionRepositories {
  return {
    competitions: new PrismaCompetitionAggregateRepository(tx),
    ledger: new PrismaLedgerRepository(tx),
  };
}
