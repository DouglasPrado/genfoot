import type { PlayerPosition } from "../genesis/genesis-types.js";

import type { FormationName } from "./formation.js";

/**
 * Escalação por-clube (R-220, Fase 1).
 *
 * A montagem tática CORRENTE do clube: uma formação + 11 titulares nos slots +
 * banco. É per-clube e persistente — a partida lê ISTO para saber quem entra em
 * campo. (O `MatchLineup` congelado por-partida dos docs, R-145, é outro passo;
 * decisão declarada na R-220.) Um lineup por `(gameWorldId, clubId)`.
 */
export interface LineupStarterSnapshot {
  readonly playerId: string;
  /** Índice do slot na formação (0..10). */
  readonly slotIndex: number;
  /** Posição pedida pelo slot (vem da formação). */
  readonly slotPosition: PlayerPosition;
  /**
   * Quão bem o jogador ocupa o slot (0..1, `fillQuality`). < 1 = fora de
   * posição — permitido, rende menos. A partida usa isto para ponderar a força.
   */
  readonly fillQuality: number;
}

export interface LineupSnapshot {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly formation: FormationName;
  readonly starters: readonly LineupStarterSnapshot[];
  readonly bench: readonly string[];
  readonly version: number;
}

/** Um jogador do elenco com sua posição natural — o que a validação precisa. */
export interface SquadPlayerContext {
  readonly playerId: string;
  readonly primaryPosition: PlayerPosition;
}

export interface LineupContextReader {
  squadPlayers(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly SquadPlayerContext[]>;
}

export interface LineupRepository {
  findByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<LineupSnapshot | null>;
  save(lineup: LineupSnapshot, expectedVersion: number | null): Promise<void>;
}

/** Aviso de escalação fora de posição — não bloqueia, informa. */
export interface LineupWarning {
  readonly playerId: string;
  readonly slotPosition: PlayerPosition;
  readonly fillQuality: number;
}

export type LineupEvent = {
  readonly type: "LineupSet";
  readonly lineupId: string;
  readonly clubId: string;
  readonly formation: FormationName;
};
