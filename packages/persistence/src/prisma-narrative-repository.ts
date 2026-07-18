import type { NarrativeItemSnapshot, NarrativeRepository } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter de C11 — a manchete.
 *
 * `TransactionClient`: a imprensa narra a contratação DENTRO da transação da
 * transferência (o fato e a manchete no mesmo commit). Idempotente por `id`
 * determinístico — reprocessar o fato não duplica a notícia (upsert no-op).
 */
export class PrismaNarrativeRepository implements NarrativeRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async append(item: NarrativeItemSnapshot): Promise<void> {
    await this.client.narrative.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        gameWorldId: item.gameWorldId,
        clubId: item.clubId,
        playerId: item.playerId,
        type: item.type,
        title: item.title,
        description: item.description,
        intensity: item.intensity,
        startsAt: new Date(item.occurredOn),
      },
      update: {},
    });
  }
}
