import type {
  ClubReadModel,
  ClubWorldView,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Leitura de C3 no Postgres (R-175).
 *
 * O nome do clube vem do PERÍODO vigente, não de uma coluna: o clube não tem
 * nome, tem história de nomes, e o de hoje é o que tem `effectiveThrough IS
 * NULL` (BC-003). O índice único parcial garante que há no máximo um — então o
 * `take: 1` não escolhe entre candidatos, ele pega o único.
 *
 * Um clube sem período vigente é linha corrompida, e a view diz isso em vez de
 * inventar string vazia: nome vazio numa lista parece clube sem nome, e o
 * defeito viajaria até a tela.
 */
export class PrismaClubReadModel implements ClubReadModel {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async summary(
    gameWorldId: string,
  ): Promise<Readonly<{ clubCount: number }>> {
    return { clubCount: await this.client.club.count({ where: { gameWorldId } }) };
  }

  public async worldView(gameWorldId: string): Promise<ClubWorldView> {
    const rows = await this.client.club.findMany({
      where: { gameWorldId },
      include: {
        stadium: true,
        identityPeriods: { where: { effectiveThrough: null }, take: 1 },
      },
      orderBy: { regionId: "asc" },
    });

    return {
      gameWorldId,
      clubs: rows.map((row) => {
        const identity = row.identityPeriods[0];
        if (identity === undefined) {
          throw new Error(`Clube ${row.id} não tem período de identidade vigente.`);
        }
        return {
          id: row.id,
          name: identity.name,
          shortCode: identity.shortCode,
          regionId: row.regionId,
          status: row.status,
          reputationBand: row.reputationBand,
          stadiumName: row.stadium?.name ?? "",
          stadiumCapacity: row.stadium?.capacity ?? 0,
          primaryColor: identity.primaryColor,
          secondaryColor: identity.secondaryColor,
          crestTemplateId: identity.crestTemplateId,
        };
      }),
    };
  }
}
