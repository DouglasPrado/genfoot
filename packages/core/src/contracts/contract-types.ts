import type { GameWorldId } from "@grinta/shared";

/**
 * C6 — contratos. O vínculo AUTORITATIVO jogador↔clube (Q5/R-189).
 *
 * O elenco (`SquadMembership`) é projeção disto; o contrato é a fonte. Um jogador
 * da gênese não tinha contrato (a dívida da R-189) — a primeira transferência o
 * cria (R-192).
 */
export const ContractStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  TERMINATED: "TERMINATED",
  RENEWED: "RENEWED",
  TRANSFERRED: "TRANSFERRED",
} as const;

export type ContractStatus =
  (typeof ContractStatus)[keyof typeof ContractStatus];

export interface PlayerContractSnapshot {
  readonly id: string;
  readonly gameWorldId: GameWorldId;
  readonly playerId: string;
  readonly clubId: string;
  readonly currencyId: string;
  readonly status: ContractStatus;
  readonly startSeason: number;
  readonly endSeason: number;
  readonly salaryPerSeasonMinor: bigint;
  readonly signingBonusMinor: bigint;
  readonly releaseClauseMinor: bigint | null;
  readonly version: number;
}

export interface ContractRepository {
  /** O contrato ACTIVE de um jogador, se houver. */
  findActiveByPlayer(
    gameWorldId: GameWorldId,
    playerId: string,
  ): Promise<PlayerContractSnapshot | null>;

  saveContract(snapshot: PlayerContractSnapshot): Promise<void>;
}
