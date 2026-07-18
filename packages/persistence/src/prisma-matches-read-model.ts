import type {
  MatchListItem,
  MatchesReadModel,
  MatchesView,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

const RESULTS_LIMIT = 20;
const UPCOMING_LIMIT = 20;

/**
 * Read model das partidas (M-05 lista) — C5/C7.
 *
 * Resultados e calendário, com os nomes dos clubes resolvidos num JOIN. O placar
 * só aparece nas partidas FINISHED — o 0×0 de uma agendada não é resultado.
 */
export class PrismaMatchesReadModel implements MatchesReadModel {
  public constructor(private readonly client: PrismaClient) {}

  public async recentAndUpcoming(
    gameWorldId: GameWorldId,
    clubId: string | null,
  ): Promise<MatchesView> {
    const clubFilter =
      clubId === null
        ? {}
        : { OR: [{ homeClubId: clubId }, { awayClubId: clubId }] };

    const [finished, scheduled] = await Promise.all([
      this.client.match.findMany({
        where: { gameWorldId, runtimeStatus: "FINISHED", ...clubFilter },
        orderBy: [{ finishedAt: "desc" }, { roundNumber: "desc" }],
        take: RESULTS_LIMIT,
      }),
      this.client.match.findMany({
        where: { gameWorldId, runtimeStatus: "SCHEDULED", ...clubFilter },
        orderBy: [{ roundNumber: "asc" }, { scheduledAt: "asc" }],
        take: UPCOMING_LIMIT,
      }),
    ]);

    const ids = new Set<string>();
    for (const m of [...finished, ...scheduled]) {
      ids.add(m.homeClubId);
      ids.add(m.awayClubId);
    }
    const names = await this.clubNames(gameWorldId, [...ids]);

    const toItem = (m: (typeof finished)[number], isFinished: boolean): MatchListItem => ({
      matchId: m.id,
      roundNumber: m.roundNumber ?? 0,
      homeClubId: m.homeClubId,
      awayClubId: m.awayClubId,
      homeClubName: names.get(m.homeClubId)?.name ?? "—",
      awayClubName: names.get(m.awayClubId)?.name ?? "—",
      homeShortCode: names.get(m.homeClubId)?.shortCode ?? "",
      awayShortCode: names.get(m.awayClubId)?.shortCode ?? "",
      homeGoals: isFinished ? m.homeGoals : null,
      awayGoals: isFinished ? m.awayGoals : null,
      finished: isFinished,
      scheduledOn: m.scheduledAt.toISOString().slice(0, 10),
    });

    return {
      results: finished.map((m) => toItem(m, true)),
      upcoming: scheduled.map((m) => toItem(m, false)),
    };
  }

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
