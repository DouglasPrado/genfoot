import type { GenesisRepositories, GenesisUnitOfWork } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaClubRepository } from "./prisma-club-repository.js";
import { PrismaCompetitionRepository } from "./prisma-competition-repository.js";
import { PrismaLedgerRepository } from "./prisma-ledger-repository.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";
import { PrismaSquadRepository } from "./prisma-squad-repository.js";

/**
 * A transação da gênese: 16 clubes, 368 jogadores, 16 elencos, tudo ou nada.
 *
 * Os três adapters recebem o MESMO `TransactionClient` — que não tem
 * `$transaction` —, então nenhum abre a sua. É o tipo que garante que a gênese
 * seja um efeito atômico, e não 400 gravações independentes que podem parar no
 * meio.
 *
 * O `timeout` é generoso de propósito: materializar 368 jogadores (cada um com
 * pessoa + atributos) é muito ida-e-volta, e o default de 5s do Prisma estoura.
 * Não é folga arbitrária — é o custo real de criar um mundo, que acontece uma
 * vez por mundo.
 */
export class PrismaGenesisUnitOfWork implements GenesisUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repositories: GenesisRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bindGenesis(tx)), {
      timeout: 120_000,
      maxWait: 10_000,
    });
  }
}

export function bindGenesis(tx: Prisma.TransactionClient): GenesisRepositories {
  return {
    clubs: new PrismaClubRepository(tx),
    players: new PrismaPlayerRepository(tx),
    squads: new PrismaSquadRepository(tx),
    ledger: new PrismaLedgerRepository(tx),
    competitions: new PrismaCompetitionRepository(tx),
  };
}
