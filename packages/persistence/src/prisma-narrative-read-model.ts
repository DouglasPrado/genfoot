import type {
  NarrativeFeedView,
  NarrativeReadModel,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Read model de C11 — o feed de imprensa (M-25).
 *
 * Lê as manchetes ativas do mundo, mais nova primeiro. Não é `TransactionClient`:
 * query é leitura, fora de qualquer transação de escrita.
 */
export class PrismaNarrativeReadModel implements NarrativeReadModel {
  public constructor(private readonly client: PrismaClient) {}

  public async recentForWorld(
    gameWorldId: GameWorldId,
    limit: number,
  ): Promise<NarrativeFeedView> {
    const rows = await this.client.narrative.findMany({
      where: { gameWorldId, isActive: true },
      orderBy: { startsAt: "desc" },
      take: limit,
      select: {
        id: true,
        clubId: true,
        type: true,
        title: true,
        description: true,
        intensity: true,
        startsAt: true,
      },
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        clubId: row.clubId,
        type: row.type,
        title: row.title,
        description: row.description,
        intensity: row.intensity,
        occurredOn: row.startsAt.toISOString().slice(0, 10),
      })),
    };
  }
}
