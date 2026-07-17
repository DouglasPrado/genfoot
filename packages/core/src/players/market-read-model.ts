import type { GameWorldId } from "@grinta/shared";

import type { PlayerPosition } from "../genesis/genesis-types.js";

/**
 * A visão do mercado (M-06) — o scout dos jogadores do mundo.
 *
 * NÃO é o comando de compra (isso é C6, com contrato e dinheiro). É a vitrine:
 * quem existe, de que clube, com que nota e por quanto — para o técnico decidir
 * quem observar. O `valueMinor` é ESTIMATIVA (R-41) até C9 materializar o preço
 * de verdade dentro da economia.
 */
export interface MarketPlayerView {
  readonly playerId: string;
  readonly name: string;
  readonly clubId: string;
  readonly clubName: string;
  readonly primaryPosition: PlayerPosition;
  readonly age: number;
  readonly overall: number;
  readonly potential: number;
  /** Valor de mercado estimado, em unidade mínima (R-41). Exibição. */
  readonly valueMinor: string;
}

export interface MarketView {
  readonly players: readonly MarketPlayerView[];
}

export interface MarketReadModel {
  /**
   * Os jogadores do mundo para o scout, ordenados por valor. `excludeClubId`
   * tira o próprio elenco da vitrine (você não contrata quem já é seu).
   */
  scoutablePlayers(
    gameWorldId: GameWorldId,
    excludeClubId: string | null,
  ): Promise<MarketView>;
}
