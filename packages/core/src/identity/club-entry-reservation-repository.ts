import type { ClubEntryReservationSnapshot } from "./club-entry-reservation.js";

/**
 * Porta da reserva de entrada (R-175). Escopo `(gameWorldId, id)`.
 *
 * `findExpiredOn` é o motivo de a tabela existir: com a reserva dentro do blob
 * de identidade, expirar significava carregar o mundo inteiro e varrer o array.
 * Agora o varredor acha as vencidas pelo índice `(status, expiresOn)`.
 */
export interface ClubEntryReservationRepository {
  findReservationById(
    gameWorldId: string,
    id: string,
  ): Promise<ClubEntryReservationSnapshot | null>;

  /** A reserva RETIDA do clube, se houver. No máximo uma — o banco garante. */
  findHeldReservationForClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<ClubEntryReservationSnapshot | null>;

  /** Retidas cujo prazo já passou na data do mundo. Alimenta o varredor de TTL. */
  findExpiredOn(
    gameWorldId: string,
    worldDate: string,
  ): Promise<readonly ClubEntryReservationSnapshot[]>;

  saveReservation(
    snapshot: ClubEntryReservationSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
}
