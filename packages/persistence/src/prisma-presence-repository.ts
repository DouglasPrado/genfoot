import type { PresenceRepository } from "@grinta/core";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Adapter de presença (X-001). Revive o `UserSession` — que já tinha `isOnline`
 * e `lastSeenAt` mas estava órfão desde que a autenticação foi para o Clerk
 * (R-174). Presença é estado de jogo, não de auth; este é o lar dela em código.
 *
 * `lastSeenAt` é o relógio de PAREDE, carimbado aqui na borda (como `finishedAt`
 * das partidas) — nunca no domínio. Sem `@@unique(userId, gameWorldId)` no
 * schema, o upsert é find-then-write; roda numa transação para não perder corrida.
 */
export class PrismaPresenceRepository implements PresenceRepository {
  public constructor(private readonly client: PrismaClient) {}

  public recordOnline(gameWorldId: string, userId: string): Promise<void> {
    return this.write(gameWorldId, userId, true);
  }

  public recordOffline(gameWorldId: string, userId: string): Promise<void> {
    return this.write(gameWorldId, userId, false);
  }

  private async write(
    gameWorldId: string,
    userId: string,
    isOnline: boolean,
  ): Promise<void> {
    await this.client.$transaction(async (tx) => {
      const existing = await tx.userSession.findFirst({
        where: { userId, gameWorldId },
        select: { id: true },
      });
      if (existing === null) {
        await tx.userSession.create({
          data: { userId, gameWorldId, isOnline, lastSeenAt: new Date() },
        });
      } else {
        await tx.userSession.update({
          where: { id: existing.id },
          data: { isOnline, lastSeenAt: new Date() },
        });
      }
    });
  }
}
