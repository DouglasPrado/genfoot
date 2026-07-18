import type { FanbaseReadModel, FanbaseView } from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Read model de C10 — a torcida de um clube para a tela do Clube (M-25).
 *
 * Lê as colunas de torcida direto do `Club`. Não é `TransactionClient`: query é
 * leitura, fora de qualquer transação de escrita.
 */
export class PrismaFanbaseReadModel implements FanbaseReadModel {
  public constructor(private readonly client: PrismaClient) {}

  public async fanbaseForClub(
    gameWorldId: GameWorldId,
    clubId: string,
  ): Promise<FanbaseView | null> {
    const row = await this.client.club.findFirst({
      where: { id: clubId, gameWorldId },
      select: {
        id: true,
        fanBaseSize: true,
        boardPatience: true,
        pressureLevel: true,
      },
    });
    if (row === null) return null;
    return {
      clubId: row.id,
      headcount: row.fanBaseSize,
      boardPatience: row.boardPatience,
      pressureLevel: row.pressureLevel,
    };
  }
}
