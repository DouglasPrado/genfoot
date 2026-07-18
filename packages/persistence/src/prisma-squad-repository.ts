import {
  SquadCategory,
  type ClubId,
  type SquadId,
  type SquadRepository,
  type SquadSnapshot,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter do elenco (C3, R-190).
 *
 * `Prisma.TransactionClient` no construtor pela mesma razão do clube: o elenco é
 * a linha `Squad` mais N `SquadMembership`, e os membros são REESCRITOS
 * (deleteMany + createMany), não somados. Fora de uma transação, um save que
 * apaga e reinsere deixaria o elenco vazio numa falha no meio.
 *
 * `type` e `youthAgeCategory` do físico não têm contraparte no domínio: a gênese
 * só cria a primeira equipe (SENIOR/FIRST_TEAM, sem categoria de base). Ficam no
 * default até a base existir (#34) — dívida declarada.
 */
export class PrismaSquadRepository implements SquadRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findFirstTeamSquad(
    gameWorldId: GameWorldId,
    clubId: ClubId,
  ): Promise<SquadSnapshot | null> {
    const row = await this.client.squad.findFirst({
      where: { gameWorldId, clubId, category: SquadCategory.FIRST_TEAM },
      include: { memberships: { orderBy: { shirtNumber: "asc" } } },
    });
    return row === null ? null : toSnapshot(row);
  }

  public async findSquadById(
    gameWorldId: GameWorldId,
    squadId: SquadId,
  ): Promise<SquadSnapshot | null> {
    const row = await this.client.squad.findUnique({
      where: { gameWorldId_id: { gameWorldId, id: squadId } },
      include: { memberships: { orderBy: { shirtNumber: "asc" } } },
    });
    return row === null ? null : toSnapshot(row);
  }

  public async findYouthSquad(
    gameWorldId: GameWorldId,
    clubId: ClubId,
  ): Promise<SquadSnapshot | null> {
    const row = await this.client.squad.findFirst({
      where: { gameWorldId, clubId, category: SquadCategory.YOUTH_ACADEMY },
      include: { memberships: { orderBy: { shirtNumber: "asc" } } },
    });
    return row === null ? null : toSnapshot(row);
  }

  public async saveSquad(
    snapshot: SquadSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const { id, gameWorldId, clubId } = snapshot;
    const data = {
      name: snapshot.name,
      category: snapshot.category,
      seasonNumber: snapshot.seasonNumber,
      version: snapshot.version,
    };

    if (expectedVersion === null) {
      await this.client.squad.create({ data: { id, gameWorldId, clubId, ...data } });
    } else {
      const { count } = await this.client.squad.updateMany({
        where: { id, gameWorldId, version: expectedVersion },
        data,
      });
      if (count === 0) {
        throw new Error(
          `AGGREGATE_VERSION_CONFLICT: elenco ${id} mudou por baixo (esperava ${expectedVersion}).`,
        );
      }
    }

    // Os membros são o elenco — reescritos, não somados. O array do domínio é a
    // verdade; a tabela tem de ficar igual a ele. Apagar e reinserir dentro da
    // transação é O(membros), e um elenco tem 23.
    await this.client.squadMembership.deleteMany({ where: { squadId: id } });
    if (snapshot.memberships.length > 0) {
      await this.client.squadMembership.createMany({
        data: snapshot.memberships.map((member) => ({
          squadId: id,
          playerId: member.playerId,
          shirtNumber: member.shirtNumber,
          role: member.role,
          startsAt: new Date(`${member.effectiveFrom}T00:00:00.000Z`),
        })),
      });
    }
  }
}

type SquadRow = Prisma.SquadGetPayload<{ include: { memberships: true } }>;

function toSnapshot(row: SquadRow): SquadSnapshot {
  return {
    id: row.id as SquadId,
    gameWorldId: row.gameWorldId as GameWorldId,
    clubId: row.clubId as ClubId,
    name: row.name,
    category: row.category,
    seasonNumber: row.seasonNumber,
    version: row.version,
    memberships: row.memberships.map((member) => ({
      playerId: member.playerId as SquadSnapshot["memberships"][number]["playerId"],
      shirtNumber: member.shirtNumber ?? 0,
      role: member.role,
      effectiveFrom: member.startsAt.toISOString().slice(0, 10),
    })),
  };
}
