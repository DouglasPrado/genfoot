import type { GameWorldId } from "@grinta/shared";

import type { ClubId } from "../genesis/genesis-types.js";

/**
 * Orçamento por áreas — §15.1 da economia. O clube autoriza quanto pode gastar
 * em cada frente; o gasto voluntário (transferência, obra, salário) é barrado
 * quando estoura a autorização ou compromete o mesmo dinheiro duas vezes.
 */
export const BudgetAreaKind = {
  WAGES: "WAGES",
  TRANSFERS: "TRANSFERS",
  STAFF: "STAFF",
  INFRASTRUCTURE: "INFRASTRUCTURE",
  YOUTH: "YOUTH",
  OPERATIONS: "OPERATIONS",
  COMMERCIAL: "COMMERCIAL",
  EMERGENCY_RESERVE: "EMERGENCY_RESERVE",
} as const;

export type BudgetAreaKind =
  (typeof BudgetAreaKind)[keyof typeof BudgetAreaKind];

/**
 * A dotação de uma área: quanto foi AUTORIZADO e quanto já está COMPROMETIDO
 * (reservado por decisões em curso — INV-10, impede prometer o mesmo dinheiro
 * duas vezes). O disponível é `authorizedMinor − committedMinor`.
 */
export interface BudgetAllocation {
  readonly area: BudgetAreaKind;
  readonly authorizedMinor: bigint;
  readonly committedMinor: bigint;
}

export interface BudgetSnapshot {
  readonly id: string;
  readonly gameWorldId: GameWorldId;
  readonly clubId: ClubId;
  readonly currencyId: string;
  /** Teto total autorizado: a soma das áreas não pode ultrapassá-lo. */
  readonly authorizedTotalMinor: bigint;
  readonly allocations: readonly BudgetAllocation[];
  readonly version: number;
}

export interface BudgetRepository {
  findByClub(
    gameWorldId: GameWorldId,
    clubId: ClubId,
  ): Promise<BudgetSnapshot | null>;

  /** Grava com concorrência otimista: `expectedVersion` null cria (v1). */
  save(snapshot: BudgetSnapshot, expectedVersion: number | null): Promise<void>;
}
