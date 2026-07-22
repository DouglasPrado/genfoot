import type {
  ClubDisciplineView,
  MatchClubBadge,
  MatchPlayerRating,
  MatchDetailView,
  MatchFeedCoverage,
  MatchFeedEvent,
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
        // FINISHED (jogada) e PROCESSED (já homologada, C5-V3) — ambas têm placar.
        where: {
          gameWorldId,
          runtimeStatus: { in: ["FINISHED", "PROCESSED"] },
          ...clubFilter,
        },
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

    const toItem = (
      m: (typeof finished)[number],
      isFinished: boolean,
    ): MatchListItem => ({
      matchId: m.id,
      roundNumber: m.roundNumber ?? 0,
      homeClubId: m.homeClubId,
      awayClubId: m.awayClubId,
      homeClubName: names.get(m.homeClubId)?.name ?? "—",
      awayClubName: names.get(m.awayClubId)?.name ?? "—",
      homeShortCode: names.get(m.homeClubId)?.shortCode ?? "",
      awayShortCode: names.get(m.awayClubId)?.shortCode ?? "",
      homeClubPrimaryColor: names.get(m.homeClubId)?.primaryColor ?? null,
      homeClubSecondaryColor: names.get(m.homeClubId)?.secondaryColor ?? null,
      homeClubCrestTemplateId: names.get(m.homeClubId)?.crestTemplateId ?? null,
      awayClubPrimaryColor: names.get(m.awayClubId)?.primaryColor ?? null,
      awayClubSecondaryColor: names.get(m.awayClubId)?.secondaryColor ?? null,
      awayClubCrestTemplateId: names.get(m.awayClubId)?.crestTemplateId ?? null,
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

  public async clubDiscipline(
    gameWorldId: GameWorldId,
    clubId: string,
  ): Promise<ClubDisciplineView> {
    // Cartoes somados dos `PlayerMatchStats` das partidas DESTE mundo, para os
    // jogadores do elenco profissional do clube. Projecao, como a artilharia —
    // nao existe coluna "cartoes na temporada".
    const rows = await this.client.$queryRaw<
      {
        playerId: string;
        firstName: string;
        lastName: string;
        primaryPosition: string;
        yellowCards: number;
        redCards: number;
      }[]
    >`
      SELECT p.id AS "playerId",
             pe."firstName" AS "firstName",
             pe."lastName" AS "lastName",
             p."primaryPosition" AS "primaryPosition",
             COALESCE(SUM(pms."yellowCards"), 0)::int AS "yellowCards",
             COALESCE(SUM(pms."redCards"), 0)::int AS "redCards"
      FROM "Player" p
      JOIN "Person" pe ON pe.id = p."personId"
      JOIN "SquadMembership" sm ON sm."playerId" = p.id AND sm."isActive" = true
      JOIN "Squad" s ON s.id = sm."squadId"
        AND s."clubId" = ${clubId}::uuid
        AND s.category = 'FIRST_TEAM'
      LEFT JOIN "PlayerMatchStats" pms ON pms."playerId" = p.id
      LEFT JOIN "Match" m ON m.id = pms."matchId" AND m."gameWorldId" = ${gameWorldId}::uuid
      WHERE p."gameWorldId" = ${gameWorldId}::uuid
      GROUP BY p.id, pe."firstName", pe."lastName", p."primaryPosition"
      HAVING COALESCE(SUM(pms."yellowCards"), 0) > 0
          OR COALESCE(SUM(pms."redCards"), 0) > 0
      ORDER BY COALESCE(SUM(pms."redCards"), 0) DESC,
               COALESCE(SUM(pms."yellowCards"), 0) DESC
    `;

    return {
      clubId,
      players: rows.map((row) => ({
        playerId: row.playerId,
        playerName: `${row.firstName} ${row.lastName}`,
        position: row.primaryPosition,
        yellowCards: row.yellowCards,
        redCards: row.redCards,
      })),
      cardsTracked: MATCH_FEED_COVERAGE.cards,
      // Nao existe regra de suspensao no dominio: zero ocorrencias em
      // packages/core. A tela conta cartao, nao afirma pendurado.
      suspensionRuleExists: false,
    };
  }

  public async matchDetail(
    gameWorldId: GameWorldId,
    matchId: string,
  ): Promise<MatchDetailView | null> {
    const match = await this.client.match.findFirst({
      where: { id: matchId, gameWorldId },
      include: {
        competitionSeason: {
          select: { competition: { select: { name: true } } },
        },
        playerStats: {
          include: {
            player: {
              select: {
                id: true,
                primaryPosition: true,
                person: { select: { firstName: true, lastName: true } },
                squadMemberships: {
                  where: { squad: { category: "FIRST_TEAM" } },
                  take: 1,
                  select: { squad: { select: { clubId: true } } },
                },
              },
            },
          },
        },
        events: {
          orderBy: { eventSequence: "asc" },
          include: {
            player: {
              include: {
                person: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
    if (match === null) return null;

    const names = await this.clubNames(gameWorldId, [
      match.homeClubId,
      match.awayClubId,
    ]);
    const finished =
      match.runtimeStatus === "FINISHED" || match.runtimeStatus === "PROCESSED";

    // As notas saem dos PlayerMatchStats — a nota e coluna, calculada pelo
    // simulador; aqui so se resolve nome e clube. Ordenada da maior para a
    // menor: o primeiro e o melhor em campo, o ultimo o pior.
    const ratings: MatchPlayerRating[] = match.playerStats
      .map((row) => ({
        playerId: row.playerId,
        playerName: `${row.player.person.firstName} ${row.player.person.lastName}`,
        clubId: row.player.squadMemberships[0]?.squad.clubId ?? "",
        position: row.player.primaryPosition,
        rating: Number(row.rating),
        goals: row.goals,
        assists: row.assists,
        shots: row.shots,
        saves: row.saves,
        yellowCards: row.yellowCards,
        redCards: row.redCards,
      }))
      .sort((a, b) => b.rating - a.rating || a.playerName.localeCompare(b.playerName));

    // Chute no alvo por time: soma do que cada jogador do lado acertou.
    const onTarget = { home: 0, away: 0 };
    for (const row of match.playerStats) {
      const clubId = row.player.squadMemberships[0]?.squad.clubId ?? "";
      if (clubId === match.homeClubId) onTarget.home += row.shotsOnTarget;
      else if (clubId === match.awayClubId) onTarget.away += row.shotsOnTarget;
    }

    const events: MatchFeedEvent[] = match.events.map((e) => ({
      sequence: e.eventSequence,
      minute: e.minute,
      type: e.type,
      clubId: e.clubId,
      playerId: e.playerId,
      playerName: e.player
        ? `${e.player.person.firstName} ${e.player.person.lastName}`
        : null,
      description: e.description,
    }));

    return {
      matchId: match.id,
      roundNumber: match.roundNumber ?? 0,
      scheduledOn: match.scheduledAt.toISOString().slice(0, 10),
      runtimeStatus: match.runtimeStatus,
      finished,
      homeClubId: match.homeClubId,
      awayClubId: match.awayClubId,
      homeClubName: names.get(match.homeClubId)?.name ?? "—",
      awayClubName: names.get(match.awayClubId)?.name ?? "—",
      home: matchBadge(match.homeClubId, names),
      away: matchBadge(match.awayClubId, names),
      competitionName: match.competitionSeason?.competition.name ?? null,
      homeGoals: finished ? match.homeGoals : null,
      awayGoals: finished ? match.awayGoals : null,
      // `null` sobrevive de proposito: partida jogada ANTES da migration
      // `match_team_stats` nao tem estes numeros, e zero ali afirmaria um jogo
      // sem nenhuma finalizacao.
      homeShots: finished ? match.homeShots : null,
      awayShots: finished ? match.awayShots : null,
      homePossession: finished ? match.homePossession : null,
      homeExpectedGoals: finished ? toNumber(match.homeExpectedGoals) : null,
      awayExpectedGoals: finished ? toNumber(match.awayExpectedGoals) : null,
      homeShotsOnTarget: finished ? onTarget.home : null,
      awayShotsOnTarget: finished ? onTarget.away : null,
      ratings,
      events,
      feedCoverage: MATCH_FEED_COVERAGE,
    };
  }

  private async clubNames(
    gameWorldId: GameWorldId,
    clubIds: readonly string[],
  ): Promise<
    Map<
      string,
      {
        name: string;
        shortCode: string;
        primaryColor: string | null;
        secondaryColor: string | null;
        crestTemplateId: string | null;
      }
    >
  > {
    const periods = await this.client.clubIdentityPeriod.findMany({
      where: {
        gameWorldId,
        clubId: { in: [...clubIds] },
        effectiveThrough: null,
      },
      select: {
        clubId: true,
        name: true,
        shortCode: true,
        primaryColor: true,
        secondaryColor: true,
        crestTemplateId: true,
      },
    });
    return new Map(
      periods.map((period) => [
        period.clubId,
        {
          name: period.name,
          shortCode: period.shortCode,
          primaryColor: period.primaryColor,
          secondaryColor: period.secondaryColor,
          crestTemplateId: period.crestTemplateId,
        },
      ]),
    );
  }
}

/**
 * O que o motor de partida grava no feed HOJE.
 *
 * `saveResults` (prisma-match-play-repository) cria UM `MatchEvent` do tipo
 * `GOAL` por gol e nada mais — cartão, substituição e finalização existem no
 * `enum MatchEventType` mas nenhum é emitido, e `PlayerMatchStats` recebe zero
 * fixo em tudo que não é gol. `M-POSTMATCH` usa isto para dizer o que NÃO foi
 * registrado, em vez de deixar o feed curto passar por partida morna.
 */
const MATCH_FEED_COVERAGE: MatchFeedCoverage = {
  goals: true,
  assists: true,
  cards: true,
  // O motor nao sabe QUEM esta em campo (nao ha escalacao para clube de IA),
  // entao uma substituicao seria uma decisao que ninguem tomou.
  substitutions: false,
  // Finalizacao existe por TIME e por JOGADOR (PlayerMatchStats), mas nao como
  // lance no feed: o kernel da o total, nao o instante de cada chute.
  shots: false,
  teamStats: true,
  ratings: true,
  // Passe certo, desarme e intercepcao exigem o motor simular POSSE lance a
  // lance (doc 05 §6). O kernel resolve chance -> gol, sem meio-campo.
  passingAndDefending: false,
};

/** Decimal do Prisma -> number. `null` sobrevive: partida antiga nao tem xG. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function matchBadge(
  clubId: string,
  names: Map<
    string,
    {
      name: string;
      shortCode: string;
      primaryColor: string | null;
      secondaryColor: string | null;
      crestTemplateId: string | null;
    }
  >,
): MatchClubBadge {
  const identity = names.get(clubId);
  return {
    clubId,
    clubName: identity?.name ?? "—",
    shortCode: identity?.shortCode ?? "",
    primaryColor: identity?.primaryColor ?? null,
    secondaryColor: identity?.secondaryColor ?? null,
    crestTemplateId: identity?.crestTemplateId ?? null,
  };
}
