import {
  composePlayerDevelopmentView,
  type PlayerDevelopmentView,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * A view de desenvolvimento de um jogador (§31).
 *
 * Lê `Player` (habilidade/base/teto) e o buffer `PlayerDevelopmentAccrual` da
 * temporada, e delega a composição das camadas ao core (`composePlayerDevelopmentView`).
 * O read model não sabe regra — só junta as linhas.
 */
export interface PlayerDevelopmentReadModel {
  view(
    gameWorldId: string,
    playerId: string,
    seasonId: string | null,
  ): Promise<PlayerDevelopmentView | null>;
}

export class PrismaPlayerDevelopmentReadModel
  implements PlayerDevelopmentReadModel
{
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async view(
    gameWorldId: string,
    playerId: string,
    seasonId: string | null,
  ): Promise<PlayerDevelopmentView | null> {
    // seasonId omitido (R-221): usa o season CORRENTE do mundo (currentSeasonId).
    // O mobile chama só com playerId e não precisa conhecer o season.
    const effectiveSeasonId =
      seasonId ??
      (
        await this.client.gameWorld.findUnique({
          where: { id: gameWorldId },
          select: { currentSeasonId: true },
        })
      )?.currentSeasonId ??
      null;
    const player = await this.client.player.findFirst({
      where: { gameWorldId, id: playerId },
      select: {
        id: true,
        currentAbility: true,
        formaModifier: true,
        baselineAbility: true,
        potentialAbility: true,
      },
    });
    if (player === null) return null;

    // Sem season corrente não há accrual a projetar — só o núcleo/forma/potencial.
    const accruals =
      effectiveSeasonId === null
        ? []
        : await this.client.playerDevelopmentAccrual.findMany({
            where: { gameWorldId, playerId, seasonId: effectiveSeasonId },
            select: {
              attributeCode: true,
              pendingDeltaMinor: true,
              evidenceCount: true,
            },
          });

    return composePlayerDevelopmentView({
      playerId: player.id,
      currentAbility: player.currentAbility,
      formaModifier: player.formaModifier,
      baselineAbility: player.baselineAbility,
      naturalPotential: player.potentialAbility,
      accruals: accruals.map((a) => ({
        attributeCode: a.attributeCode,
        pendingDeltaMinor: a.pendingDeltaMinor,
        evidenceCount: a.evidenceCount,
      })),
    });
  }
}
