import type { GameWorldId } from "@grinta/shared";

import type { StandingRow } from "./standings.js";

/**
 * Uma linha da tabela com o NOME do clube resolvido — a tela mostra "Fúria
 * Azul", não um UUID. O nome mora no período de identidade vigente (BC-003), e é
 * o read model que o resolve, não a lógica pura da tabela.
 */
export interface StandingViewRow extends StandingRow {
  readonly clubName: string;
  readonly shortCode: string;
}

/**
 * A visão da competição para a tela (M-04 / competições).
 *
 * A tabela é derivada (R-178): o read model soma os jogos terminados.
 * `playedMatches`/`totalMatches` dão o andamento da temporada.
 */
export interface CompetitionStandingsView {
  readonly competitionId: string;
  readonly competitionName: string;
  readonly seasonNumber: number;
  readonly totalMatches: number;
  readonly playedMatches: number;
  readonly table: readonly StandingViewRow[];
}

export interface CompetitionReadModel {
  /** A competição principal do mundo (a Liga Inicial), com a tabela atual. */
  leagueStandings(
    gameWorldId: GameWorldId,
  ): Promise<CompetitionStandingsView | null>;
}
