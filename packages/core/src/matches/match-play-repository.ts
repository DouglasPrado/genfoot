import type { GameWorldId } from "@grinta/shared";

import type { SimulatedMatchResult } from "./match-simulation.js";

/**
 * Uma partida agendada, com as forças já resolvidas para a simulação.
 *
 * `homeStrength`/`awayStrength` são o overall médio do elenco de cada clube —
 * calculados pelo adapter (uma agregação de banco), não pelo domínio. O placar
 * emerge deles no kernel; eles não definem o placar.
 */
export interface ScheduledMatchWithStrength {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeStrength: number;
  readonly awayStrength: number;
}

/**
 * O repositório de jogo de C5 (R-175).
 *
 * `nextUnplayedRound` traz as partidas da PRIMEIRA rodada ainda não jogada, já
 * com as forças — é o que o comando `world:play-round` simula. `saveResults`
 * grava os placares e marca as partidas FINISHED/NORMAL, o que faz a tabela
 * (projeção, R-178) se preencher sozinha.
 */
export interface MatchPlayRepository {
  nextUnplayedRound(
    gameWorldId: GameWorldId,
  ): Promise<readonly ScheduledMatchWithStrength[]>;

  saveResults(
    gameWorldId: GameWorldId,
    results: readonly SimulatedMatchResult[],
  ): Promise<void>;
}
