import type { GameWorldId } from "@grinta/shared";

import type { TieUndecidedReason } from "./competition-phases.js";
import type { ClubOutcome } from "./season-outcome.js";
import type { StandingRow } from "./standings.js";

/**
 * A cara de um clube numa lista: nome vigente, sigla, cores e modelo de escudo
 * (R-211). É o mínimo para a tela desenhar o escudo em vez de um UUID — a
 * mesma informação que `MatchListItem` já carrega para a lista de partidas.
 */
export interface ClubBadgeView {
  readonly clubId: string;
  readonly clubName: string;
  readonly shortCode: string;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
}

/**
 * Uma linha da tabela com o NOME do clube resolvido — a tela mostra "Fúria
 * Azul", não um UUID. O nome mora no período de identidade vigente (BC-003), e é
 * o read model que o resolve, não a lógica pura da tabela.
 */
export interface StandingViewRow extends StandingRow {
  readonly clubName: string;
  readonly shortCode: string;
  readonly primaryColor?: string | null;
  readonly secondaryColor?: string | null;
  readonly crestTemplateId?: string | null;
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

/**
 * Uma competição na lista do admin (C7, R-202): o essencial para gerir o ciclo
 * de vida — nome, formato, em que fase está, quantos clubes, a janela.
 */
export interface CompetitionSummaryView {
  readonly competitionId: string;
  readonly name: string;
  readonly type: string;
  readonly format: string;
  readonly tier: number | null;
  readonly lifecycle: string;
  readonly clubCount: number;
  readonly matchCount: number;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  /**
   * O recorte do clube do usuário (M-COMPETITIONS): participa desta competição?
   * em que posição está? `null` quando a consulta não informou um clube — é o
   * caso do admin, que lista o mundo inteiro sem dono.
   */
  readonly clubParticipates: boolean | null;
  readonly clubRank: number | null;
  /** A rodada mais alta já jogada — "em que pé está" na lista. */
  readonly currentRound: number | null;
}

/**
 * Uma linha do desfecho da temporada (C7-V6b): a linha da tabela final com o
 * rótulo de acesso/rebaixamento resolvido (`season-outcome.ts`).
 */
export interface SeasonOutcomeRow extends StandingViewRow {
  readonly rank: number;
  readonly outcome: ClubOutcome;
}

/**
 * O desfecho de uma edição de liga (C7-V6b): campeão, acessos e rebaixamentos.
 * `finished` diz se a edição foi homologada — antes disso é uma prévia da
 * tabela atual, não o resultado oficial. Os `slots` vêm da config (imutável,
 * R-52): 0/0 numa divisão única do mundo, 4/4 numa do meio.
 */
export interface SeasonOutcomeView {
  readonly competitionId: string;
  readonly competitionName: string;
  readonly seasonNumber: number;
  readonly lifecycle: string;
  readonly finished: boolean;
  readonly champion: { readonly clubId: string; readonly clubName: string } | null;
  readonly promotionSlots: number;
  readonly relegationSlots: number;
  readonly rows: readonly SeasonOutcomeRow[];
}

/** Um artilheiro (C7-V5): gols somados dos `PlayerMatchStats` do mundo. */
export interface TopScorerView {
  readonly playerId: string;
  readonly name: string;
  readonly clubName: string;
  readonly goals: number;
}

export interface CompetitionReadModel {
  /** A competição principal do mundo (a Liga Inicial), com a tabela atual. */
  leagueStandings(
    gameWorldId: GameWorldId,
  ): Promise<CompetitionStandingsView | null>;

  /** Todas as competições do mundo, para o admin gerir (R-202). */
  listCompetitions(
    gameWorldId: GameWorldId,
  ): Promise<readonly CompetitionSummaryView[]>;

  /**
   * O desfecho da liga principal do mundo (C7-V6b): campeão, acesso e
   * rebaixamento pela classificação final. `null` se o mundo não tem liga.
   */
  competitionOutcome(
    gameWorldId: GameWorldId,
  ): Promise<SeasonOutcomeView | null>;

  /** Os artilheiros do mundo (C7-V5), do maior para o menor. */
  topScorers(gameWorldId: GameWorldId): Promise<readonly TopScorerView[]>;
}
