import type { Prisma } from "./generated/prisma/client.js";

/**
 * A temporada CORRENTE de um mundo, para as queries que recortam por temporada.
 *
 * Existe porque `training-plan` (e o command `training:set-plan`) exigiam
 * `seasonId`, e NENHUMA query o devolvia: o cliente teria que adivinhar um uuid.
 * O `PlayerDevelopmentReadModel` já resolvia isso lendo `GameWorld` por dentro
 * (R-221); isto extrai a mesma leitura para quem mais precisar, em vez de
 * duplicá-la.
 *
 * `null` é resposta LEGÍTIMA — mundo recém-semeado nasce sem temporada (2 dos 24
 * mundos de desenvolvimento estão assim). Quem chama decide o que dizer na tela;
 * o read model não inventa uma temporada que não existe.
 */
export interface WorldSeasonReadModel {
  currentSeasonId(gameWorldId: string): Promise<string | null>;
}

export class PrismaWorldSeasonReadModel implements WorldSeasonReadModel {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async currentSeasonId(gameWorldId: string): Promise<string | null> {
    const row = await this.client.gameWorld.findUnique({
      where: { id: gameWorldId },
      select: { currentSeasonId: true },
    });
    return row?.currentSeasonId ?? null;
  }
}
