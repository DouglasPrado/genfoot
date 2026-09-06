import type { GameWorldId } from "@grinta/shared";

import type {
  RankMovement,
  TieUndecidedReason,
} from "./competition-phases.js";
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
  /**
   * A posição na rodada anterior e o movimento desde ela. `null` NÃO é
   * "manteve" — é "não há rodada anterior com que comparar", e a tela precisa
   * distinguir os dois: antes da 2ª rodada ninguém subiu nem caiu.
   */
  readonly previousRank?: number | null;
  readonly movement?: RankMovement | null;
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

/**
 * O que o motor de partida REALMENTE registra hoje.
 *
 * Existe porque `PlayerMatchStats` tem colunas de assistência e cartão que o
 * simulador grava com ZERO fixo (`prisma-match-play-repository.ts`, "só gols são
 * simulados hoje"). Sem esta bandeira a tela mostraria "0 assistências para
 * todo mundo" e isso se lê como fato do jogo — é ausência de motor, não ausência
 * de assistência. A tela usa isto para dizer "indisponível", não para mentir
 * zero. Vira `true` quando o simulador passar a produzir cada família.
 */
export interface MatchStatsCoverage {
  readonly goals: boolean;
  readonly assists: boolean;
  readonly cards: boolean;
}

/**
 * Uma linha de estatística individual da competição (artilharia/assistência).
 *
 * O clube vem como `ClubBadgeView` inteiro, não como nome solto: a linha da
 * artilharia mostra o ESCUDO do clube do jogador, igual à tabela e aos jogos.
 */
export interface PlayerStatRow {
  readonly playerId: string;
  readonly name: string;
  readonly club: ClubBadgeView;
  readonly value: number;
}

/** As abas de estatística de uma competição (artilharia · assistências). */
export interface CompetitionStatsView {
  readonly competitionId: string;
  readonly coverage: MatchStatsCoverage;
  readonly scorers: readonly PlayerStatRow[];
  readonly assists: readonly PlayerStatRow[];
}

/** O cabeçalho + regulamento de uma competição (abas Regulamento/Qualificação). */
export interface CompetitionDetailView {
  readonly competitionId: string;
  readonly name: string;
  readonly type: string;
  readonly format: string;
  readonly tier: number | null;
  readonly lifecycle: string;
  readonly seasonNumber: number;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly clubCount: number;
  readonly totalMatches: number;
  readonly playedMatches: number;
  readonly currentRound: number | null;
  readonly totalRounds: number | null;
  readonly promotionSlots: number;
  readonly relegationSlots: number;
  /** `true` quando a edição tem fase de grupos (algum clube com grupo). */
  readonly hasGroups: boolean;
  /** `true` quando existe partida de mata-mata — a aba só aparece se houver. */
  readonly hasKnockout: boolean;
}

/** A tabela de um grupo, com a cara dos clubes resolvida. */
export interface GroupTableView {
  readonly group: string | null;
  readonly table: readonly StandingViewRow[];
}

/** A aba Tabela/Grupos: uma tabela na liga, N na fase de grupos. */
export interface CompetitionTableView {
  readonly competitionId: string;
  readonly format: string;
  readonly groups: readonly GroupTableView[];
}

export interface BracketLegView {
  readonly matchId: string;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly finished: boolean;
  readonly scheduledOn: string;
}

export interface BracketTieView {
  readonly tieKey: string;
  readonly round: number;
  readonly home: ClubBadgeView;
  readonly away: ClubBadgeView;
  readonly homeAggregate: number;
  readonly awayAggregate: number;
  readonly legs: readonly BracketLegView[];
  readonly winnerClubId: string | null;
  readonly undecidedReason: TieUndecidedReason | null;
}

export interface BracketRoundView {
  readonly round: number;
  readonly name: string;
  readonly ties: readonly BracketTieView[];
}

/** A aba Chaveamento. `rounds` vazio = a competição não tem mata-mata. */
export interface CompetitionBracketView {
  readonly competitionId: string;
  readonly rounds: readonly BracketRoundView[];
}

/** Uma partida na aba Rodadas/Jogos, com escudo dos dois lados. */
export interface CompetitionMatchRow {
  readonly matchId: string;
  readonly roundNumber: number | null;
  readonly group: string | null;
  readonly scheduledOn: string;
  readonly finished: boolean;
  readonly home: ClubBadgeView;
  readonly away: ClubBadgeView;
  /** `null` enquanto não jogou — não é 0×0. */
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
}

/** A aba Rodadas/Jogos: TODOS os jogos da edição, jogados e por jogar. */
export interface CompetitionMatchesView {
  readonly competitionId: string;
  readonly matches: readonly CompetitionMatchRow[];
}

export interface CompetitionReadModel {
  /** A competição principal do mundo (a Liga Inicial), com a tabela atual. */
  leagueStandings(
    gameWorldId: GameWorldId,
  ): Promise<CompetitionStandingsView | null>;

  /**
   * Todas as competições do mundo — o admin gerir (R-202) e o jogador navegar
   * (M-COMPETITIONS). Com `clubId`, cada linha diz se aquele clube participa e
   * em que posição está; sem ele (admin), esses campos vêm `null`.
   */
  listCompetitions(
    gameWorldId: GameWorldId,
    clubId?: string | null,
  ): Promise<readonly CompetitionSummaryView[]>;

  /** O cabeçalho + regulamento de UMA competição. `null` se não é deste mundo. */
  competitionDetail(
    gameWorldId: GameWorldId,
    competitionId: string,
  ): Promise<CompetitionDetailView | null>;

  /** A(s) tabela(s) de uma competição: uma na liga, uma por grupo nos grupos. */
  competitionTable(
    gameWorldId: GameWorldId,
    competitionId: string,
  ): Promise<CompetitionTableView | null>;

  /** O chaveamento de mata-mata. `rounds` vazio quando não há mata-mata. */
  competitionBracket(
    gameWorldId: GameWorldId,
    competitionId: string,
  ): Promise<CompetitionBracketView | null>;

  /** Todos os jogos da edição corrente, jogados e por jogar. */
  competitionMatches(
    gameWorldId: GameWorldId,
    competitionId: string,
  ): Promise<CompetitionMatchesView | null>;

  /** Artilharia e assistências DA competição, com a cobertura do motor. */
  competitionStats(
    gameWorldId: GameWorldId,
    competitionId: string,
  ): Promise<CompetitionStatsView | null>;

  /**
   * O desfecho de uma edição (C7-V6b): campeão, acesso e rebaixamento pela
   * classificação final — a aba Premiações. Sem `competitionId`, a liga
   * principal do mundo. `null` se o mundo não tem liga / a competição não é
   * deste mundo.
   */
  competitionOutcome(
    gameWorldId: GameWorldId,
    competitionId?: string | null,
  ): Promise<SeasonOutcomeView | null>;

  /** Os artilheiros do mundo (C7-V5), do maior para o menor. */
  topScorers(gameWorldId: GameWorldId): Promise<readonly TopScorerView[]>;
}
