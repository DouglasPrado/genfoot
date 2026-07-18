import type { ReleaseRepositories, ReleaseUnitOfWork } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaContractRepository } from "./prisma-contract-repository.js";
import { PrismaSquadRepository } from "./prisma-squad-repository.js";

/**
 * A transação da dispensa (C6): tira a membership e encerra o contrato no mesmo
 * commit. O `TransactionClient` (sem `$transaction`) impede meio efeito escapar.
 */
export class PrismaReleaseUnitOfWork implements ReleaseUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repositories: ReleaseRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 15_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): ReleaseRepositories {
  return {
    squads: new PrismaSquadRepository(tx),
    contracts: new PrismaContractRepository(tx),
  };
}
