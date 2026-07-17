import type { GameWorldId } from "@grinta/shared";

import type { PlayerPosition } from "../genesis/genesis-types.js";
import type { PlayerAttributeRollup } from "./player-attributes.js";

/**
 * A visão do elenco para a tela M-03.
 *
 * É read model, não agregado: traz o que a tela mostra, já resolvido — nome do
 * jogador (que mora na pessoa), overall (derivado, R-09), e os 4 grupos como
 * rollup (R-179). Quem decide qualquer coisa lê os 39; a tela mostra o resumo.
 */
export interface RosterPlayerView {
  readonly playerId: string;
  readonly shirtNumber: number;
  readonly name: string;
  readonly primaryPosition: PlayerPosition;
  readonly secondaryPosition: PlayerPosition | null;
  readonly age: number;
  readonly overall: number;
  readonly potential: number;
  readonly availability: string;
  /** Os 4 grupos, derivados dos 39 (R-179) — para exibição. */
  readonly groups: PlayerAttributeRollup;
}

export interface RosterView {
  readonly clubId: string;
  readonly squadName: string;
  readonly seasonNumber: number;
  readonly players: readonly RosterPlayerView[];
}

export interface SquadReadModel {
  /**
   * O elenco da primeira equipe de um clube. `null` = o clube não tem elenco
   * materializado (mundo ainda em gênese, ou clube sem plantel).
   */
  roster(gameWorldId: GameWorldId, clubId: string): Promise<RosterView | null>;
}
