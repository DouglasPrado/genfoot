import type {
  ClubEntryReservationRepository,
  ClubEntryReservationSnapshot,
} from "@grinta/core";
import { ClubReservationStatus } from "@grinta/core";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Adapter da reserva de entrada (R-175).
 *
 * `findExpiredOn` usa `expiresOn < worldDate` — estritamente menor, porque o
 * prazo vale até o fim do dia de `expiresOn`. Usar `<=` cortaria um dia de
 * quem ainda tem direito à vaga.
 */
export class PrismaClubEntryReservationRepository
  implements ClubEntryReservationRepository
{
  public constructor(private readonly client: PrismaClient) {}

  public async findReservationById(
    gameWorldId: string,
    id: string,
  ): Promise<ClubEntryReservationSnapshot | null> {
    return toSnapshot(
      await this.client.clubEntryReservation.findUnique({
        where: { gameWorldId_id: { gameWorldId, id } },
      }),
    );
  }

  public async findHeldReservationForClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<ClubEntryReservationSnapshot | null> {
    return toSnapshot(
      await this.client.clubEntryReservation.findFirst({
        where: { gameWorldId, clubId, status: "HELD" },
      }),
    );
  }

  public async findExpiredOn(
    gameWorldId: string,
    worldDate: string,
  ): Promise<readonly ClubEntryReservationSnapshot[]> {
    const rows = await this.client.clubEntryReservation.findMany({
      where: { gameWorldId, status: "HELD", expiresOn: { lt: fromWorldDate(worldDate) } },
      orderBy: { expiresOn: "asc" },
    });
    return rows.map((row) => toSnapshot(row)!);
  }

  public async saveReservation(
    snapshot: ClubEntryReservationSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const data = {
      status: snapshot.status,
      heldOn: fromWorldDate(snapshot.heldOn),
      expiresOn: fromWorldDate(snapshot.expiresOn),
      version: snapshot.version,
    };

    if (expectedVersion === null) {
      await this.client.clubEntryReservation.create({
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

    const { count } = await this.client.clubEntryReservation.updateMany({
      where: {
        id: snapshot.id,
        gameWorldId: snapshot.gameWorldId,
        version: expectedVersion,
      },
      data,
    });
    if (count === 0) {
      throw new ReservationVersionConflict(snapshot.id, expectedVersion);
    }
  }
}

export class ReservationVersionConflict extends Error {
  public readonly code = "RESERVATION_VERSION_CONFLICT";
  public constructor(id: string, expectedVersion: number) {
    super(`Reserva ${id} mudou: versão esperada ${expectedVersion} não confere.`);
  }
}

interface ClubEntryReservationRow {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly worldParticipantId: string;
  readonly status: string;
  readonly heldOn: Date;
  readonly expiresOn: Date;
  readonly version: number;
}

const STATUSES: Record<string, ClubReservationStatus> = {
  HELD: ClubReservationStatus.HELD,
  CONFIRMED: ClubReservationStatus.CONFIRMED,
  EXPIRED: ClubReservationStatus.EXPIRED,
  RELEASED: ClubReservationStatus.RELEASED,
};

function toSnapshot(
  row: ClubEntryReservationRow | null,
): ClubEntryReservationSnapshot | null {
  if (row === null) return null;
  return {
    id: row.id as ClubEntryReservationSnapshot["id"],
    gameWorldId: row.gameWorldId as ClubEntryReservationSnapshot["gameWorldId"],
    clubId: row.clubId as ClubEntryReservationSnapshot["clubId"],
    worldParticipantId:
      row.worldParticipantId as ClubEntryReservationSnapshot["worldParticipantId"],
    status: STATUSES[row.status] ?? ClubReservationStatus.HELD,
    heldOn: toWorldDate(row.heldOn),
    expiresOn: toWorldDate(row.expiresOn),
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
