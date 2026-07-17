import {
  buildStandings,
  type CompetitionReadModel,
  type CompetitionStandingsView,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Read model de C7 — a tabela da liga.
 *
 * A classificação é PROJEÇÃO (R-178): busca as partidas terminadas e chama
 * `buildStandings` (domínio puro). A tabela não é coluna; ela se reconstrói do
 * resultado dos jogos a cada consulta.
 */
export class PrismaCompetitionReadModel implements CompetitionReadModel {
  public constructor(private readonly client: PrismaClient) {}

  public async leagueStandings(
    gameWorldId: GameWorldId,
  ): Promise<CompetitionStandingsView | null> {
    // A competição principal do mundo: a de maior reputação (a Liga Inicial é a
    // única por ora). `tier` menor = mais importante.
    const competition = await this.client.competition.findFirst({
      where: { gameWorldId, type: "LEAGUE" },
      orderBy: [{ tier: "asc" }, { reputation: "desc" }],
      include: {
        seasons: {
          orderBy: { startsAt: "desc" },
          take: 1,
          include: { clubs: { select: { clubId: true } } },
        },
      },
    });
    if (competition === undefined || competition === null) return null;
    const edition = competition.seasons[0];
    if (edition === undefined) return null;

    const matches = await this.client.match.findMany({
      where: { competitionSeasonId: edition.id },
      select: {
        homeClubId: true,
        awayClubId: true,
        homeGoals: true,
        awayGoals: true,
        runtimeStatus: true,
        resultStatus: true,
      },
    });

    // Só partidas de fato TERMINADAS entram na tabela — o 0×0 de uma agendada
    // não é empate.
    const finished = matches.filter(
      (m) =>
        (m.runtimeStatus === "FINISHED" || m.runtimeStatus === "PROCESSED") &&
        m.resultStatus === "NORMAL",
    );

    return {
      competitionId: competition.id,
      competitionName: competition.name,
      seasonNumber: 1,
      totalMatches: matches.length,
      playedMatches: finished.length,
      table: buildStandings(
        edition.clubs.map((c) => c.clubId),
        finished.map((m) => ({
          homeClubId: m.homeClubId,
          awayClubId: m.awayClubId,
          homeGoals: m.homeGoals,
          awayGoals: m.awayGoals,
        })),
      ),
    };
  }
}
