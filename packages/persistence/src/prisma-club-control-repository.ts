import type { ClubControlRepository, ClubControlSnapshot } from "@grinta/core";
import { ControlStatus } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter do controle de clube (R-175).
 *
 * `findActiveControlForClub` conta com o índice único parcial
 * (`ClubControl_um_ativo_por_clube`, `WHERE status = 'ACTIVE'`): por isso pode
 * devolver no máximo um sem precisar decidir qual — o banco não deixa existir
 * dois. Antes, `world-identity.ts:545` pegava o primeiro `find` de um array com
 * o mundo inteiro dentro, e dois ativos seriam indetectáveis.
 */
export class PrismaClubControlRepository implements ClubControlRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findControlById(
    gameWorldId: string,
    id: string,
  ): Promise<ClubControlSnapshot | null> {
    return toSnapshot(
      await this.client.clubControl.findUnique({
        where: { gameWorldId_id: { gameWorldId, id } },
      }),
    );
  }

  public async findActiveControlForClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<ClubControlSnapshot | null> {
    return toSnapshot(
      await this.client.clubControl.findFirst({
        where: { gameWorldId, clubId, status: "ACTIVE" },
      }),
    );
  }

  public async saveControl(
    snapshot: ClubControlSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const data = {
      status: snapshot.status,
      startsOn: fromWorldDate(snapshot.startsOn),
      endedOn: snapshot.endedOn === null ? null : fromWorldDate(snapshot.endedOn),
      endedReason: snapshot.endedReason,
      version: snapshot.version,
    };

    if (expectedVersion === null) {
      await this.client.clubControl.create({
        data: {
          id: snapshot.id,
          gameWorldId: snapshot.gameWorldId,
          clubId: snapshot.clubId,
          worldParticipantId: snapshot.worldParticipantId,
          ...data,
        },
      });
      return;
    }

    const { count } = await this.client.clubControl.updateMany({
      where: {
        id: snapshot.id,
        gameWorldId: snapshot.gameWorldId,
        version: expectedVersion,
      },
      data,
    });
    if (count === 0) {
      throw new ControlVersionConflict(snapshot.id, expectedVersion);
    }
  }
}

export class ControlVersionConflict extends Error {
  public readonly code = "CONTROL_VERSION_CONFLICT";
  public constructor(id: string, expectedVersion: number) {
    super(`Controle ${id} mudou: versão esperada ${expectedVersion} não confere.`);
  }
}

interface ClubControlRow {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly worldParticipantId: string;
  readonly status: string;
  readonly startsOn: Date;
  readonly endedOn: Date | null;
  readonly endedReason: string | null;
  readonly version: number;
}

function toSnapshot(row: ClubControlRow | null): ClubControlSnapshot | null {
  if (row === null) return null;
  return {
    id: row.id as ClubControlSnapshot["id"],
    gameWorldId: row.gameWorldId as ClubControlSnapshot["gameWorldId"],
    clubId: row.clubId as ClubControlSnapshot["clubId"],
    worldParticipantId: row.worldParticipantId as ClubControlSnapshot["worldParticipantId"],
    status: row.status === "ENDED" ? ControlStatus.ENDED : ControlStatus.ACTIVE,
    startsOn: toWorldDate(row.startsOn),
    endedOn: row.endedOn === null ? null : toWorldDate(row.endedOn),
    endedReason: row.endedReason,
    version: row.version,
  };
}

/** `YYYY-MM-DD` → meia-noite UTC, que é o que a coluna DATE guarda. */
function fromWorldDate(worldDate: string): Date {
  return new Date(`${worldDate}T00:00:00.000Z`);
}

/** Volta só a data: o domínio não conhece hora. */
function toWorldDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
