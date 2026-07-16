import type { ClubControlSnapshot } from "./club-control.js";

/**
 * Porta do controle de clube (R-175). Escopo `(gameWorldId, id)`, como o
 * context map exige por root.
 *
 * `findActiveControlForClub` substitui a varredura de array de
 * `world-identity.ts:545`: quem garante "1 controle ativo por clube" passa a ser
 * o índice único parcial do Postgres, não um `find` em memória sobre o mundo
 * inteiro carregado.
 */
export interface ClubControlRepository {
  findControlById(
    gameWorldId: string,
    id: string,
  ): Promise<ClubControlSnapshot | null>;

  /** O controle ATIVO do clube, se houver. No máximo um — o banco garante. */
  findActiveControlForClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<ClubControlSnapshot | null>;

  saveControl(
    snapshot: ClubControlSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
}
