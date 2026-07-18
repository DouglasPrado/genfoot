import {
  buildStandings,
  type CompetitionReadModel,
  type CompetitionStandingsView,
  type CompetitionSummaryView,
  type TopScorerView,
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

  public async topScorers(
    gameWorldId: GameWorldId,
  ): Promise<readonly TopScorerView[]> {
    // Gols somados por jogador (só as partidas deste mundo). Artilharia é
    // projeção dos PlayerMatchStats — não há coluna de "gols na carreira".
    const totals = await this.client.$queryRaw<
      { playerId: string; goals: number }[]
    >`
      SELECT pms."playerId" AS "playerId", SUM(pms.goals)::int AS goals
      FROM "PlayerMatchStats" pms
      JOIN "Match" m ON m.id = pms."matchId"
      WHERE m."gameWorldId" = ${gameWorldId}::uuid AND pms.goals > 0
      GROUP BY pms."playerId"
      ORDER BY goals DESC
      LIMIT 30
    `;
    if (totals.length === 0) return [];

    const ids = totals.map((t) => t.playerId);
    const players = await this.client.player.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        person: { select: { firstName: true, lastName: true } },
        squadMemberships: {
          where: { squad: { category: "FIRST_TEAM" } },
          take: 1,
          select: { squad: { select: { clubId: true } } },
        },
      },
    });
    const clubIds = [
      ...new Set(
        players.flatMap((p) =>
          p.squadMemberships[0] ? [p.squadMemberships[0].squad.clubId] : [],
        ),
      ),
    ];
    const clubNames = await this.clubNames(gameWorldId, clubIds);
    const byId = new Map(players.map((p) => [p.id, p]));

    return totals.map((t) => {
      const player = byId.get(t.playerId);
      const clubId = player?.squadMemberships[0]?.squad.clubId;
      return {
        playerId: t.playerId,
        name: player
          ? `${player.person.firstName} ${player.person.lastName}`
          : "—",
        clubName: clubId ? (clubNames.get(clubId)?.name ?? "Sem clube") : "Sem clube",
        goals: t.goals,
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
