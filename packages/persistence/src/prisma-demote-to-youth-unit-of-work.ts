import type {
  DemoteToYouthRepositories,
  DemoteToYouthUnitOfWork,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";
import { PrismaSquadRepository } from "./prisma-squad-repository.js";

/**
 * A transação da descida profissional→base (C8): os dois elencos no mesmo commit,
 * mais o jogador (só leitura, para a idade). O mesmo `TransactionClient` liga
 * tudo — meio efeito não escapa.
 */
export class PrismaDemoteToYouthUnitOfWork implements DemoteToYouthUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repositories: DemoteToYouthRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 15_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): DemoteToYouthRepositories {
  return {
    squads: new PrismaSquadRepository(tx),
    players: new PrismaPlayerRepository(tx),
  };
}
