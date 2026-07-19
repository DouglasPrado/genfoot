import type {
  SeasonAgingRepositories,
  SeasonAgingRoster,
  SeasonAgingUnitOfWork,
} from "@grinta/core";
import { PlayerCareerStatus } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";

/**
 * A transação da virada que envelhece o elenco (R-217).
 *
 * Declínio de atributo e `careerStatus`→`RETIRED` de cada jogador no MESMO
 * commit. Espelha o UoW do accrual: um crash no meio não deixa metade do elenco
 * envelhecida e metade não.
 */
export class PrismaSeasonAgingUnitOfWork implements SeasonAgingUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repos: SeasonAgingRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 60_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): SeasonAgingRepositories {
  return {
    players: new PrismaPlayerRepository(tx),
    roster: new PrismaSeasonAgingRoster(tx),
  };
}

class PrismaSeasonAgingRoster implements SeasonAgingRoster {
  public constructor(private readonly tx: Prisma.TransactionClient) {}

  public async activePlayers(
    gameWorldId: string,
  ): Promise<readonly { readonly playerId: string; readonly age: number }[]> {
    // Só quem está ATIVO envelhece; aposentado já saiu do ciclo. A idade vem de
    // Person.ageVirtual (derivada de birthDate na persistência).
    const rows = await this.tx.player.findMany({
      where: {
        gameWorldId,
        status: PlayerCareerStatus.ACTIVE,
      },
      select: { id: true, person: { select: { ageVirtual: true } } },
    });
    return rows.map((row) => ({ playerId: row.id, age: row.person.ageVirtual }));
  }
}
