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
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly events: readonly MatchFeedEvent[];
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

  /** O detalhe de uma partida (C5-V1). `null` se não existe neste mundo. */
  matchDetail(
    gameWorldId: GameWorldId,
    matchId: string,
  ): Promise<MatchDetailView | null>;
}
