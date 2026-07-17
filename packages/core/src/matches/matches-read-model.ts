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

export interface MatchesReadModel {
  /**
   * Resultados recentes e próximas partidas do mundo. Se `clubId` vier, recorta
   * para os jogos daquele clube; senão, a liga inteira.
   */
  recentAndUpcoming(
    gameWorldId: GameWorldId,
    clubId: string | null,
  ): Promise<MatchesView>;
}
