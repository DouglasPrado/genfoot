import type { GameWorldId } from "@grinta/shared";

/**
 * A visão da tela de partidas (M-05, lista) — C5/C7.
 *
 * Não é a partida AO VIVO: é o calendário e os resultados. Uma linha por jogo,
 * com os nomes dos clubes já resolvidos (a tela mostra "Fúria Azul", não UUID) e
 * o placar quando a partida terminou.
 */
export interface MatchListItem {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeClubName: string;
  readonly awayClubName: string;
  readonly homeShortCode: string;
  readonly awayShortCode: string;
  readonly homeClubPrimaryColor: string | null;
  readonly homeClubSecondaryColor: string | null;
  readonly homeClubCrestTemplateId: string | null;
  readonly awayClubPrimaryColor: string | null;
  readonly awayClubSecondaryColor: string | null;
  readonly awayClubCrestTemplateId: string | null;
  /** Placar; `null` quando ainda não jogaram (não é 0×0 empate). */
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly finished: boolean;
  readonly scheduledOn: string;
}

export interface MatchesView {
  /** Resultados recentes, do mais novo para o mais antigo. */
  readonly results: readonly MatchListItem[];
  /** Próximas partidas agendadas, da mais próxima em diante. */
  readonly upcoming: readonly MatchListItem[];
}

/** Uma linha do feed de uma partida (C5-V1): o que aconteceu e quando. */
export interface MatchFeedEvent {
  readonly sequence: number;
  readonly minute: number;
  readonly type: string;
  readonly clubId: string | null;
  readonly playerId: string | null;
  readonly playerName: string | null;
  readonly description: string;
}

/**
 * A cara de um clube na partida: nome vigente, sigla, cores e escudo (R-211).
 * Mesma forma do `ClubBadgeView` de C7 — a tela desenha escudo, não UUID.
 */
export interface MatchClubBadge {
  readonly clubId: string;
  readonly clubName: string;
  readonly shortCode: string;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
}

/** O detalhe de UMA partida (C5-V1): placar, clubes e o feed de eventos. */
export interface MatchDetailView {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly scheduledOn: string;
  readonly runtimeStatus: string;
  readonly finished: boolean;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeClubName: string;
  readonly awayClubName: string;
  /** Os clubes com escudo e cores, para `M-POSTMATCH` desenhar o placar. */
  readonly home: MatchClubBadge;
  readonly away: MatchClubBadge;
  /** A competição da partida; `null` num amistoso sem edição. */
  readonly competitionName: string | null;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  /**
   * Estatisticas de time que o kernel produz. `null` quando a partida nao foi
   * jogada, ou quando ela e ANTERIOR a migration que criou as colunas — nesse
   * caso o dado nao existe, e a tela diz isso em vez de mostrar zero.
   */
  readonly homeShots: number | null;
  readonly awayShots: number | null;
  readonly homePossession: number | null;
  /** xG: soma das probabilidades das chances criadas. `null` = partida antiga. */
  readonly homeExpectedGoals: number | null;
  readonly awayExpectedGoals: number | null;
  readonly homeShotsOnTarget: number | null;
  readonly awayShotsOnTarget: number | null;
  /** As notas do jogo, da maior para a menor (doc 05 §16). */
  readonly ratings: readonly MatchPlayerRating[];
  readonly events: readonly MatchFeedEvent[];
  /**
   * O que o motor REGISTRA no feed desta partida.
   *
   * O simulador só emite `GOAL` (`prisma-match-play-repository.ts`): não há
   * cartão, substituição, finalização nem posse. Sem esta bandeira, um feed com
   * 3 linhas se leria como "a partida teve 3 lances" — e o que houve foi 3 gols
   * num jogo do qual o resto não foi gravado.
   */
  readonly feedCoverage: MatchFeedCoverage;
}

/** A nota de um jogador na partida, com o que a sustenta. */
export interface MatchPlayerRating {
  readonly playerId: string;
  readonly playerName: string;
  readonly clubId: string;
  readonly position: string;
  readonly rating: number;
  readonly goals: number;
  readonly assists: number;
  readonly shots: number;
  readonly saves: number;
  readonly yellowCards: number;
  readonly redCards: number;
}

/** Quais famílias de evento o motor de partida produz hoje. */
export interface MatchFeedCoverage {
  readonly goals: boolean;
  readonly assists: boolean;
  readonly cards: boolean;
  readonly substitutions: boolean;
  /** Finalizações no feed, lance a lance (não o total por time). */
  readonly shots: boolean;
  /** Estatísticas agregadas (posse, finalizações) por time. */
  readonly teamStats: boolean;
  /** Notas por jogador e melhor/pior em campo (doc 05 §16). */
  readonly ratings: boolean;
  /** Passe certo, desarme e interceptação — exigem simular posse (§6). */
  readonly passingAndDefending: boolean;
}

/** A ficha disciplinar de um jogador do clube (M-CLUB-VIEW). */
export interface PlayerDisciplineRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly yellowCards: number;
  readonly redCards: number;
}

/**
 * A disciplina do elenco de um clube no mundo.
 *
 * Conta cartões — NÃO diz quem está suspenso nem "pendurado": quantos amarelos
 * suspendem e quando a contagem zera é regra de campeonato, e não existe decisão
 * ratificada. Contar é fato; suspender seria inventar regra.
 */
export interface ClubDisciplineView {
  readonly clubId: string;
  readonly players: readonly PlayerDisciplineRow[];
  /** `false` enquanto o motor não produzir cartão — a tela declara em vez de zerar. */
  readonly cardsTracked: boolean;
  /** Não há regra de suspensão no domínio; a tela não pode afirmar pendurado. */
  readonly suspensionRuleExists: boolean;
}

export interface MatchesReadModel {
  /**
   * Resultados recentes e próximas partidas do mundo. Se `clubId` vier, recorta
   * para os jogos daquele clube; senão, a liga inteira.
   */
  recentAndUpcoming(
    gameWorldId: GameWorldId,
    clubId: string | null,
  ): Promise<MatchesView>;

  /** A ficha disciplinar do elenco de um clube (M-CLUB-VIEW). */
  clubDiscipline(
    gameWorldId: GameWorldId,
    clubId: string,
  ): Promise<ClubDisciplineView>;

  /** O detalhe de uma partida (C5-V1). `null` se não existe neste mundo. */
  matchDetail(
    gameWorldId: GameWorldId,
    matchId: string,
  ): Promise<MatchDetailView | null>;
}
