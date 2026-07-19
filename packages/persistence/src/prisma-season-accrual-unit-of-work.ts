import type {
  SeasonAccrualRepositories,
  SeasonAccrualStore,
  SeasonAccrualUnitOfWork,
  SeasonAccrualRow,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaPlayerRepository } from "./prisma-player-repository.js";

/**
 * A transação da virada de temporada: aplicar o accrual e zerar o buffer no
 * MESMO commit (INV-29/R-113).
 *
 * O adapter recebe o mesmo `TransactionClient` — jogador salvo e buffer limpo
 * são um efeito só. Um crash no meio não deixa o atributo aplicado com o buffer
 * intacto (que reaplicaria na próxima virada) nem o buffer limpo sem o ganho
 * (que perderia a temporada de treino).
 */
export class PrismaSeasonAccrualUnitOfWork implements SeasonAccrualUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repos: SeasonAccrualRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 30_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): SeasonAccrualRepositories {
  return {
    players: new PrismaPlayerRepository(tx),
    accruals: new PrismaSeasonAccrualStore(tx),
  };
}

class PrismaSeasonAccrualStore implements SeasonAccrualStore {
  public constructor(private readonly tx: Prisma.TransactionClient) {}

  public async listForSeason(
    gameWorldId: string,
    seasonId: string,
  ): Promise<readonly SeasonAccrualRow[]> {
    const rows = await this.tx.playerDevelopmentAccrual.findMany({
      where: { gameWorldId, seasonId },
      select: { playerId: true, attributeCode: true, pendingDeltaMinor: true },
    });
    return rows.map((r) => ({
      playerId: r.playerId,
      attributeCode: r.attributeCode,
      pendingDeltaMinor: r.pendingDeltaMinor,
    }));
  }

  public async clearConsumed(
    playerId: string,
    seasonId: string,
    attributeCodes: readonly string[],
  ): Promise<void> {
    if (attributeCodes.length === 0) return;
    await this.tx.playerDevelopmentAccrual.deleteMany({
      where: {
        playerId,
        seasonId,
        attributeCode: { in: [...attributeCodes] },
      },
    });
  }
}
