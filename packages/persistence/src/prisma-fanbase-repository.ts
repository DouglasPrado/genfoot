import type { FanbaseRepository, FanbaseSeed } from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter de C10 — a semente da torcida.
 *
 * A torcida mora em colunas do `Club` (`fanBaseSize`, `boardPatience`,
 * `pressureLevel`) que C3 não escreve. Este é o dono delas na gênese.
 *
 * `TransactionClient`: roda dentro da transação atômica da gênese. Idempotente
 * por clube — o `WHERE fanBaseSize = 0` garante que reexecutar a gênese só
 * materialize a torcida ainda zerada, nunca sobrescreva uma que já cresceu.
 */
export class PrismaFanbaseRepository implements FanbaseRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async seedFanbases(
    gameWorldId: GameWorldId,
    seeds: readonly FanbaseSeed[],
  ): Promise<void> {
    for (const seed of seeds) {
      await this.client.club.updateMany({
        where: { id: seed.clubId, gameWorldId, fanBaseSize: 0 },
        data: {
          fanBaseSize: seed.headcount,
          boardPatience: seed.boardPatience,
          pressureLevel: seed.pressureLevel,
        },
      });
    }
  }
}
