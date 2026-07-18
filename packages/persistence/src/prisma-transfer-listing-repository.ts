import type {
  TransferListingRepository,
  TransferListingSnapshot,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter de C6 — o anúncio de venda (`TransferListing`).
 *
 * `TransactionClient`: a listagem roda na transação que verifica o jogador. O id
 * é determinístico por (mundo, jogador), então relistar é upsert (atualiza o
 * preço, não duplica anúncio).
 */
export class PrismaTransferListingRepository
  implements TransferListingRepository
{
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async listPlayer(snapshot: TransferListingSnapshot): Promise<void> {
    await this.client.transferListing.upsert({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        gameWorldId: snapshot.gameWorldId,
        clubId: snapshot.clubId,
        playerId: snapshot.playerId,
        currencyId: snapshot.currencyId,
        status: snapshot.status,
        type: snapshot.type,
        askingPriceMinor: snapshot.askingPriceMinor,
        listedAt: new Date(snapshot.listedOn),
        version: snapshot.version,
      },
      update: {
        status: snapshot.status,
        askingPriceMinor: snapshot.askingPriceMinor,
      },
    });
  }

  public async unlistPlayer(
    gameWorldId: string,
    playerId: string,
  ): Promise<void> {
    await this.client.transferListing.updateMany({
      where: { gameWorldId, playerId, status: "LISTED" },
      data: { status: "CANCELLED" },
    });
  }
}
