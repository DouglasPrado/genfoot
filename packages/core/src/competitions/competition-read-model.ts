import type { GameWorldId } from "@grinta/shared";

import type { StandingRow } from "./standings.js";

/**
 * A visão da competição para a tela (M-04 / competições).
 *
 * A tabela é derivada (R-178): o read model soma os jogos terminados. `rounds`
 * diz quantas rodadas a competição tem, e `playedMatches`/`totalMatches` dão o
 * andamento da temporada.
 */
export interface CompetitionStandingsView {
  readonly competitionId: string;
  readonly competitionName: string;
  readonly seasonNumber: number;
  readonly totalMatches: number;
  readonly playedMatches: number;
  readonly table: readonly StandingRow[];
}

export interface CompetitionReadModel {
  /** A competição principal do mundo (a Liga Inicial), com a tabela atual. */
  leagueStandings(
    gameWorldId: GameWorldId,
  ): Promise<CompetitionStandingsView | null>;
}
