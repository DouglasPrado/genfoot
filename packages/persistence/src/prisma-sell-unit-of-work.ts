import type { SellRepositories, SellUnitOfWork } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaContractRepository } from "./prisma-contract-repository.js";
import { PrismaLedgerRepository } from "./prisma-ledger-repository.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";
import { PrismaSquadRepository } from "./prisma-squad-repository.js";

/**
 * A transação da venda (C6/C9): elenco, contrato e razão no mesmo commit. O
 * `TransactionClient` liga os quatro adapters — meio efeito não escapa.
 */
export class PrismaSellUnitOfWork implements SellUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repositories: SellRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 20_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): SellRepositories {
  return {
    squads: new PrismaSquadRepository(tx),
    contracts: new PrismaContractRepository(tx),
    ledger: new PrismaLedgerRepository(tx),
    players: new PrismaPlayerRepository(tx),
  };
}
