import type {
  LineupContextReader,
  LineupRepository,
  LineupSnapshot,
  SquadPlayerContext,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * A escalação corrente do clube em Postgres (R-220 Fase 1).
 *
 * `save` faz concorrência otimista no BANCO (`updateMany` com a versão no
 * WHERE) e substitui os titulares por inteiro — a escalação É a lista, um merge
 * deixaria um titular removido ainda em campo. `benchPlayerIds` é coluna de
 * lista; os titulares são tabela porque carregam slot e aproveitamento.
 */
export class PrismaClubLineupRepository implements LineupRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<LineupSnapshot | null> {
    const row = await this.client.clubLineup.findFirst({
      where: { gameWorldId, clubId },
      include: { starters: { orderBy: { slotIndex: "asc" } } },
    });
    if (row === null) return null;
    return {
      id: row.id,
      gameWorldId: row.gameWorldId,
      clubId: row.clubId,
      formation: row.formation as LineupSnapshot["formation"],
      starters: row.starters.map((s) => ({
        playerId: s.playerId,
        slotIndex: s.slotIndex,
        slotPosition: s.slotPosition,
        fillQuality: s.fillQuality,
      })),
      bench: row.benchPlayerIds,
      version: row.version,
    };
  }

  public async save(
    lineup: LineupSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const startersData = lineup.starters.map((s) => ({
      playerId: s.playerId,
      slotIndex: s.slotIndex,
      slotPosition: s.slotPosition,
      fillQuality: s.fillQuality,
    }));

    if (expectedVersion === null) {
      await this.client.clubLineup.create({
        data: {
          id: lineup.id,
          gameWorldId: lineup.gameWorldId,
          clubId: lineup.clubId,
          formation: lineup.formation,
          benchPlayerIds: [...lineup.bench],
          version: lineup.version,
          starters: { create: startersData },
        },
      });
      return;
    }

    const updated = await this.client.clubLineup.updateMany({
      where: { id: lineup.id, version: expectedVersion },
      data: {
        formation: lineup.formation,
        benchPlayerIds: [...lineup.bench],
        version: lineup.version,
      },
    });
    if (updated.count === 0) {
      throw new Error(
        `AGGREGATE_VERSION_CONFLICT: escalação ${lineup.id} não está na versão ${expectedVersion}.`,
      );
    }
    // Titulares reescritos por inteiro.
    await this.client.clubLineupStarter.deleteMany({
      where: { lineupId: lineup.id },
    });
    await this.client.clubLineupStarter.createMany({
      data: startersData.map((s) => ({ lineupId: lineup.id, ...s })),
    });
  }
}

/**
 * O que a escalação pergunta ao elenco: os jogadores do time PRINCIPAL
 * (`FIRST_TEAM`) com a posição natural — a mesma base que a partida usa, para a
 * validação e a força concordarem.
 */
export class PrismaLineupContextReader implements LineupContextReader {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async squadPlayers(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly SquadPlayerContext[]> {
    const rows = await this.client.squadMembership.findMany({
      where: {
        isActive: true,
        squad: { gameWorldId, clubId, category: "FIRST_TEAM" },
      },
      select: {
        player: { select: { id: true, primaryPosition: true } },
      },
    });
    return rows.map((row) => ({
      playerId: row.player.id,
      primaryPosition: row.player.primaryPosition,
    }));
  }
}
