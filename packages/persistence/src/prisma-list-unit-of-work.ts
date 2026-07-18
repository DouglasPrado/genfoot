import type { ListRepositories, ListUnitOfWork } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";
import { PrismaSquadRepository } from "./prisma-squad-repository.js";
import { PrismaTransferListingRepository } from "./prisma-transfer-listing-repository.js";

/** A transação de listar um jogador à venda (C6): verifica e anuncia num commit. */
export class PrismaListUnitOfWork implements ListUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repositories: ListRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 15_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): ListRepositories {
  return {
    squads: new PrismaSquadRepository(tx),
    players: new PrismaPlayerRepository(tx),
    listings: new PrismaTransferListingRepository(tx),
  };
}
