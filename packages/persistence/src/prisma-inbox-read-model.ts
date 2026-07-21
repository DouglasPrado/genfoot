import type {
  InboxNotificationView,
  InboxReadModel,
  InboxSummary,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Read model de C12 — o resumo do inbox (M-HOME).
 *
 * Club-scoped: a caixa de entrada é do clube, e o técnico vê a dos clubes que
 * gere. `openNotificationCount` são as PENDÊNCIAS (não lidas); `timelineCount` é
 * o total do período. `reportCount` fica 0 até os relatórios de C8 existirem.
 */
export class PrismaInboxReadModel implements InboxReadModel {
  public constructor(private readonly client: PrismaClient) {}

  public async summaryForClubs(
    gameWorldId: GameWorldId,
    clubIds: readonly string[],
  ): Promise<InboxSummary> {
    if (clubIds.length === 0) {
      return { openNotificationCount: 0, timelineCount: 0, reportCount: 0 };
    }
    const clubFilter = { gameWorldId, clubId: { in: [...clubIds] } };
    const [openNotificationCount, timelineCount] = await Promise.all([
      this.client.notification.count({
        where: { ...clubFilter, isRead: false },
      }),
      this.client.notification.count({ where: clubFilter }),
    ]);
    return { openNotificationCount, timelineCount, reportCount: 0 };
  }

  public async listForClub(
    gameWorldId: GameWorldId,
    clubId: string,
    limit = 50,
  ): Promise<readonly InboxNotificationView[]> {
    const rows = await this.client.notification.findMany({
      where: { gameWorldId, clubId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      message: r.message,
      priority: r.priority,
      isRead: r.isRead,
      createdOn: r.createdAt.toISOString().slice(0, 10),
    }));
  }
}
