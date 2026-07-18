import {
  buildStandings,
  type CompetitionReadModel,
  type CompetitionStandingsView,
  type CompetitionSummaryView,
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

    const clubIds = edition.clubs.map((c) => c.clubId);
    const names = await this.clubNames(gameWorldId, clubIds);
    const table = buildStandings(
      clubIds,
      finished.map((m) => ({
        homeClubId: m.homeClubId,
        awayClubId: m.awayClubId,
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
      })),
    );

    return {
      competitionId: competition.id,
      competitionName: competition.name,
      seasonNumber: 1,
      totalMatches: matches.length,
      playedMatches: finished.length,
      table: table.map((row) => ({
        ...row,
        clubName: names.get(row.clubId)?.name ?? "—",
        shortCode: names.get(row.clubId)?.shortCode ?? "",
      })),
    };
  }

  public async listCompetitions(
    gameWorldId: GameWorldId,
  ): Promise<readonly CompetitionSummaryView[]> {
    const competitions = await this.client.competition.findMany({
      where: { gameWorldId },
      orderBy: [{ tier: "asc" }, { reputation: "desc" }, { name: "asc" }],
      include: {
        seasons: {
          orderBy: { startsAt: "desc" },
          take: 1,
          include: {
            _count: { select: { clubs: true, matches: true } },
          },
        },
      },
    });
    return competitions.map((c) => {
      const edition = c.seasons[0];
      return {
        competitionId: c.id,
        name: c.name,
        type: c.type,
        format: c.format,
        tier: c.tier ?? null,
        lifecycle: edition?.lifecycle ?? "DRAFT",
        clubCount: edition?._count.clubs ?? 0,
        matchCount: edition?._count.matches ?? 0,
        startsOn: edition?.startsAt
          ? edition.startsAt.toISOString().slice(0, 10)
          : null,
        endsOn: edition?.endsAt
          ? edition.endsAt.toISOString().slice(0, 10)
          : null,
      };
    });
  }

  /** O nome vigente de cada clube (BC-003: o período com `effectiveThrough` nulo). */
  private async clubNames(
    gameWorldId: GameWorldId,
    clubIds: readonly string[],
  ): Promise<Map<string, { name: string; shortCode: string }>> {
    const periods = await this.client.clubIdentityPeriod.findMany({
      where: { gameWorldId, clubId: { in: [...clubIds] }, effectiveThrough: null },
      select: { clubId: true, name: true, shortCode: true },
    });
    return new Map(
      periods.map((p) => [p.clubId, { name: p.name, shortCode: p.shortCode }]),
    );
  }
}
