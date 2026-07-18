import type {
  NotificationItemSnapshot,
  NotificationRepository,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter de C12 — a notificação.
 *
 * `TransactionClient`: a caixa de entrada do clube ganha a pendência DENTRO da
 * transação da transferência (fato e notificação no mesmo commit). Idempotente
 * por `id` determinístico — reprocessar o fato não duplica (upsert no-op).
 */
export class PrismaNotificationRepository implements NotificationRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async append(item: NotificationItemSnapshot): Promise<void> {
    await this.client.notification.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        gameWorldId: item.gameWorldId,
        userId: item.userId,
        clubId: item.clubId,
        type: item.type,
        title: item.title,
        message: item.message,
        priority: item.priority,
        createdAt: new Date(item.createdOn),
      },
      update: {},
    });
  }
}
