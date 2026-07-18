import type {
  PromoteYouthRepositories,
  PromoteYouthUnitOfWork,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaSquadRepository } from "./prisma-squad-repository.js";

/**
 * A transação da promoção base→profissional (C8): os dois elencos no mesmo
 * commit. O adapter recebe o MESMO `TransactionClient` (sem `$transaction`), o
 * que impede meio efeito escapar — o jovem sai da base e entra no profissional,
 * ou nada acontece.
 */
export class PrismaPromoteYouthUnitOfWork implements PromoteYouthUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repositories: PromoteYouthRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(
      (tx) => work(bind(tx)),
      { timeout: 15_000, maxWait: 5_000 },
    );
  }
}

function bind(tx: Prisma.TransactionClient): PromoteYouthRepositories {
  return { squads: new PrismaSquadRepository(tx) };
}
