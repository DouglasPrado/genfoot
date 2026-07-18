import type { TransferRepositories, TransferUnitOfWork } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaContractRepository } from "./prisma-contract-repository.js";
import { PrismaLedgerRepository } from "./prisma-ledger-repository.js";
import { PrismaNarrativeRepository } from "./prisma-narrative-repository.js";
import { PrismaNotificationRepository } from "./prisma-notification-repository.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";
import { PrismaSquadRepository } from "./prisma-squad-repository.js";

/**
 * A transação da transferência (R-192): dinheiro, contrato e elenco no mesmo
 * commit. Os quatro adapters recebem o MESMO `TransactionClient` — é o tipo (sem
 * `$transaction`) que impede meio efeito de escapar.
 *
 * `timeout` folgado: a transferência lê dois elencos, o razão e o jogador antes
 * de gravar, mas é uma operação humana (o técnico contrata um por vez), não um
 * lote — não precisa dos 5s apertados do default.
 */
export class PrismaTransferUnitOfWork implements TransferUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repositories: TransferRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 20_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): TransferRepositories {
  return {
    players: new PrismaPlayerRepository(tx),
    squads: new PrismaSquadRepository(tx),
    ledger: new PrismaLedgerRepository(tx),
    contracts: new PrismaContractRepository(tx),
    narratives: new PrismaNarrativeRepository(tx),
    notifications: new PrismaNotificationRepository(tx),
  };
}
