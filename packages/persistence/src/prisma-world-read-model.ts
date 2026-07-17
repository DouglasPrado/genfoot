import type { WorldListItemView, WorldReadModel } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Listagem dos mundos, no Postgres (R-173/R-182).
 *
 * `clubCount` sai de um `_count` na mesma consulta — não de N+1 chamadas nem de
 * uma varredura de `Club` em memória.
 */
export class PrismaWorldReadModel implements WorldReadModel {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async listWorlds(): Promise<readonly WorldListItemView[]> {
    const rows = await this.client.gameWorld.findMany({
      include: { _count: { select: { clubs: true } } },
      orderBy: { seed: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      seed: row.seed,
      status: row.status,
      // Só a data: o domínio não conhece hora (R-177).
      currentDate: row.currentDate.toISOString().slice(0, 10),
      startDate: row.startDate.toISOString().slice(0, 10),
      rulesetVersion: row.rulesetVersion,
      clubCount: row._count.clubs,
    }));
  }
}
