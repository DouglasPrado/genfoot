import type { GameWorldId } from "@grinta/shared";

import type { PlayerPosition } from "../genesis/genesis-types.js";
import type {
  PlayerAttributeRollup,
  PlayerAttributes,
} from "./player-attributes.js";

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
  /** Identidade visual do clube (C3) — pro escudo na vitrine. `null` sem período. */
  readonly clubPrimaryColor: string | null;
  readonly clubSecondaryColor: string | null;
  readonly clubCrestTemplateId: string | null;
  readonly primaryPosition: PlayerPosition;
  readonly age: number;
  readonly overall: number;
  readonly potential: number;
  /**
   * Rollup de 4 grupos (mesma derivação do elenco, R-179): alimenta o card de
   * habilidades do jogador na vitrine. `goalkeeping` é `null` fora do gol.
   */
  readonly groups: PlayerAttributeRollup;
  /** Os 39 atributos finos (R-188) — o card de habilidades detalhado. */
  readonly attributes: PlayerAttributes;
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
