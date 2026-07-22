import type { PushTokenRecord, PushTokenRepository } from "@grinta/core";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Adapter dos tokens de push (Expo) por conta. Upsert pelo token (único): o
 * mesmo device dá o mesmo token, então registrar de novo atualiza a conta em vez
 * de duplicar. O `id` é gerado pelo default do schema (uuid7).
 */
export class PrismaPushTokenRepository implements PushTokenRepository {
  public constructor(private readonly client: PrismaClient) {}

  public async upsertByToken(record: PushTokenRecord): Promise<void> {
    await this.client.pushDeviceToken.upsert({
      where: { expoPushToken: record.expoPushToken },
      create: {
        accountId: record.accountId,
        expoPushToken: record.expoPushToken,
        platform: record.platform,
      },
      update: {
        accountId: record.accountId,
        platform: record.platform,
      },
    });
  }

  public async findByAccount(
    accountId: string,
  ): Promise<readonly PushTokenRecord[]> {
    const rows = await this.client.pushDeviceToken.findMany({
      where: { accountId },
    });
    return rows.map((r) => ({
      accountId: r.accountId,
      expoPushToken: r.expoPushToken,
      platform: r.platform,
    }));
  }

  public async findTokensForClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly string[]> {
    // Clube → controlador ativo → conta → tokens. Clube de IA (sem controle
    // ativo) resolve para lista vazia.
    const controls = await this.client.clubControl.findMany({
      where: { gameWorldId, clubId, status: "ACTIVE" },
      select: { worldParticipant: { select: { userId: true } } },
    });
    const accountIds = controls.map((c) => c.worldParticipant.userId);
    if (accountIds.length === 0) return [];
    const tokens = await this.client.pushDeviceToken.findMany({
      where: { accountId: { in: accountIds } },
      select: { expoPushToken: true },
    });
    return tokens.map((t) => t.expoPushToken);
  }
}
