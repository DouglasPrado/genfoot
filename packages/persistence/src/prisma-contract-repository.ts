import type {
  ContractRepository,
  PlayerContractSnapshot,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter de C6 — o contrato (R-192).
 *
 * `TransactionClient`: a transferência grava contrato, elenco e razão no mesmo
 * commit, e o contrato é um dos três efeitos indivisíveis. Quem chama está na
 * transação da transferência.
 */
export class PrismaContractRepository implements ContractRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findActiveByPlayer(
    gameWorldId: GameWorldId,
    playerId: string,
  ): Promise<PlayerContractSnapshot | null> {
    const row = await this.client.playerContract.findFirst({
      where: { gameWorldId, playerId, status: "ACTIVE" },
    });
    return row === null ? null : toSnapshot(row);
  }

  public async saveContract(snapshot: PlayerContractSnapshot): Promise<void> {
    await this.client.playerContract.upsert({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        gameWorldId: snapshot.gameWorldId,
        playerId: snapshot.playerId,
        clubId: snapshot.clubId,
        currencyId: snapshot.currencyId,
        status: snapshot.status,
        startSeason: snapshot.startSeason,
        endSeason: snapshot.endSeason,
        salaryPerSeasonMinor: snapshot.salaryPerSeasonMinor,
        signingBonusMinor: snapshot.signingBonusMinor,
        releaseClauseMinor: snapshot.releaseClauseMinor,
        version: snapshot.version,
      },
      update: {
        clubId: snapshot.clubId,
        status: snapshot.status,
        salaryPerSeasonMinor: snapshot.salaryPerSeasonMinor,
        version: snapshot.version,
      },
    });
  }
}

function toSnapshot(
  row: Prisma.PlayerContractGetPayload<object>,
): PlayerContractSnapshot {
  return {
    id: row.id,
    gameWorldId: row.gameWorldId as GameWorldId,
    playerId: row.playerId,
    clubId: row.clubId,
    currencyId: row.currencyId,
    status: row.status,
    startSeason: row.startSeason,
    endSeason: row.endSeason,
    salaryPerSeasonMinor: row.salaryPerSeasonMinor,
    signingBonusMinor: row.signingBonusMinor,
    releaseClauseMinor: row.releaseClauseMinor,
    version: row.version,
  };
}
