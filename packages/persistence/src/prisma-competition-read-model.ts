import {
  buildBracket,
  buildGroupTables,
  buildGroupTablesWithMovement,
  buildStandings,
  resolveSeasonOutcome,
  type ClubBadgeView,
  type CompetitionBracketView,
  type CompetitionDetailView,
  type CompetitionMatchesView,
  type CompetitionMatchRow,
  type CompetitionReadModel,
  type CompetitionStandingsView,
  type CompetitionStatsView,
  type CompetitionSummaryView,
  type CompetitionTableView,
  type MatchStatsCoverage,
  type PlayerStatRow,
  type SeasonOutcomeView,
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

    const matches = await this.editionMatches(edition.id);
    // Só partidas de fato TERMINADAS entram na tabela — o 0×0 de uma agendada
    // não é empate.
    const finished = matches.filter(isPlayed);

    const clubIds = edition.clubs.map((c) => c.clubId);
    const names = await this.clubNames(gameWorldId, clubIds);
    // A Home mostra a MESMA variação de posição da aba Tabela: uma conta só,
    // num lugar só, senão as duas telas divergiriam sobre quem subiu.
    const [group] = buildGroupTablesWithMovement(
      clubIds.map((clubId) => ({ clubId, group: null })),
      finished.map((m) => ({
        round: m.roundNumber,
        homeClubId: m.homeClubId,
        awayClubId: m.awayClubId,
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
      })),
    );
    const table = group?.table ?? [];

    return {
      competitionId: competition.id,
      competitionName: competition.name,
      seasonNumber: 1,
      totalMatches: matches.length,
      playedMatches: finished.length,
      // A cara do clube vai junto (R-211): a Home desenha o ESCUDO na tabela, e
      // sem cor/modelo aqui ela só tinha texto — era a query que faltava dar o
      // dado, não a tela que esquecia de mostrar.
      table: table.map((row) => ({
        ...row,
        clubName: names.get(row.clubId)?.name ?? "—",
        shortCode: names.get(row.clubId)?.shortCode ?? "",
        primaryColor: names.get(row.clubId)?.primaryColor ?? null,
        secondaryColor: names.get(row.clubId)?.secondaryColor ?? null,
        crestTemplateId: names.get(row.clubId)?.crestTemplateId ?? null,
      })),
    };
  }

  public async listCompetitions(
    gameWorldId: GameWorldId,
    clubId: string | null = null,
  ): Promise<readonly CompetitionSummaryView[]> {
    const competitions = await this.client.competition.findMany({
      where: { gameWorldId },
      orderBy: [{ tier: "asc" }, { reputation: "desc" }, { name: "asc" }],
      include: {
        seasons: {
          orderBy: { startsAt: "desc" },
          take: 1,
          include: {
            clubs: { select: { clubId: true, groupName: true } },
            _count: { select: { clubs: true, matches: true } },
          },
        },
      },
    });

    return Promise.all(
      competitions.map(async (c) => {
        const edition = c.seasons[0];
        const participates =
          clubId === null
            ? null
            : (edition?.clubs.some((e) => e.clubId === clubId) ?? false);

        // A posição só é calculada para a competição em que o clube JOGA — não
        // vale varrer a tabela do mundo inteiro para uma lista.
        let clubRank: number | null = null;
        let currentRound: number | null = null;
        if (edition !== undefined && participates === true) {
          const matches = await this.editionMatches(edition.id);
          const played = matches.filter(isPlayed);
          const rounds = played
            .map((m) => m.roundNumber)
            .filter((r): r is number => r !== null);
          currentRound = rounds.length > 0 ? Math.max(...rounds) : null;

          // Na fase de grupos a posição é DENTRO do grupo — dizer "3º de 32"
          // num torneio de grupos seria falso.
          const tables = buildGroupTables(
            edition.clubs.map((e) => ({ clubId: e.clubId, group: e.groupName })),
            played.map((m) => ({
              homeClubId: m.homeClubId,
              awayClubId: m.awayClubId,
              homeGoals: m.homeGoals,
              awayGoals: m.awayGoals,
            })),
          );
          for (const table of tables) {
            const index = table.table.findIndex((row) => row.clubId === clubId);
            if (index >= 0) {
              clubRank = index + 1;
              break;
            }
          }
        }

        return {
          competitionId: c.id,
          name: c.name,
          type: c.type,
          format: c.format,
          tier: c.tier ?? null,
          lifecycle: edition?.lifecycle ?? "DRAFT",
          clubCount: edition?._count.clubs ?? 0,
          matchCount: edition?._count.matches ?? 0,
          startsOn: toDay(edition?.startsAt),
          endsOn: toDay(edition?.endsAt),
          clubParticipates: participates,
          clubRank,
          currentRound,
        };
      }),
    );
  }

  public async competitionOutcome(
    gameWorldId: GameWorldId,
    competitionId: string | null = null,
  ): Promise<SeasonOutcomeView | null> {
    // Sem id, a liga principal do mundo — mesma escolha de `leagueStandings`.
    const found = await this.currentEdition(gameWorldId, competitionId);
    if (found === null) return null;
    const { competition, edition } = found;

    // As vagas de acesso/rebaixamento vêm da config imutável (R-52), gravada em
    // `rulesJson.rules`. Sem elas, o mundo de divisão única (0/0) é o padrão
    // honesto — não inventamos rebaixamento onde não há para onde descer.
    const { promotionSlots, relegationSlots } = editionRules(edition.rulesJson);

    const matches = await this.editionMatches(edition.id);
    const finished = matches.filter(isPlayed);

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

    // A ordem da tabela É a classificação; o desfecho rotula por posição.
    const outcome = resolveSeasonOutcome(
      table.map((r) => r.clubId),
      promotionSlots,
      relegationSlots,
    );
    const outcomeByClub = new Map(outcome.map((o) => [o.clubId, o]));

    const rows = table.map((row) => {
      const o = outcomeByClub.get(row.clubId)!;
      return {
        ...row,
        clubName: names.get(row.clubId)?.name ?? "—",
        shortCode: names.get(row.clubId)?.shortCode ?? "",
        primaryColor: names.get(row.clubId)?.primaryColor ?? null,
        secondaryColor: names.get(row.clubId)?.secondaryColor ?? null,
        crestTemplateId: names.get(row.clubId)?.crestTemplateId ?? null,
        rank: o.rank,
        outcome: o.outcome,
      };
    });

    const finishedEdition = edition.lifecycle === "FINISHED";
    // Campeão só é oficial quando a edição está homologada. Antes disso, o líder
    // da tabela é uma prévia, não um título — não afirmamos campeão de uma liga
    // que ainda corre.
    const leader = rows[0];
    const champion =
      finishedEdition && leader !== undefined
        ? { clubId: leader.clubId, clubName: leader.clubName }
        : null;

    return {
      competitionId: competition.id,
      competitionName: competition.name,
      seasonNumber: await this.seasonNumber(edition.seasonId),
      lifecycle: edition.lifecycle,
      finished: finishedEdition,
      champion,
      promotionSlots,
      relegationSlots,
      rows,
    };
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
  ): Promise<Map<string, ClubIdentityNow>> {
    const periods = await this.client.clubIdentityPeriod.findMany({
      where: { gameWorldId, clubId: { in: [...clubIds] }, effectiveThrough: null },
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
      periods.map((p) => [
        p.clubId,
        {
          name: p.name,
          shortCode: p.shortCode,
          primaryColor: p.primaryColor,
          secondaryColor: p.secondaryColor,
          crestTemplateId: p.crestTemplateId,
        },
      ]),
    );
  }

  /**
   * A edição CORRENTE de uma competição — a de `startsAt` mais recente.
   *
   * Com `competitionId`, aquela competição (e só se for deste mundo — o id vem
   * da URL e não se confia nele). Sem, a liga principal, a mesma escolha de
   * `leagueStandings`.
   */
  private async currentEdition(
    gameWorldId: GameWorldId,
    competitionId: string | null,
  ) {
    const competition = await this.client.competition.findFirst({
      where:
        competitionId === null
          ? { gameWorldId, type: "LEAGUE" }
          : { gameWorldId, id: competitionId },
      orderBy: [{ tier: "asc" }, { reputation: "desc" }],
      include: {
        seasons: {
          orderBy: { startsAt: "desc" },
          take: 1,
          include: {
            clubs: { select: { clubId: true, groupName: true, seed: true } },
          },
        },
      },
    });
    if (competition === null || competition === undefined) return null;
    const edition = competition.seasons[0];
    if (edition === undefined) return null;
    return { competition, edition };
  }

  /**
   * O NÚMERO da temporada da edição. `CompetitionSeason` guarda `seasonId`, e o
   * Prisma não expõe a relação — a busca é direta. `1` é o fallback honesto de
   * um mundo cuja temporada sumiu, não uma afirmação.
   */
  private async seasonNumber(seasonId: string): Promise<number> {
    const season = await this.client.season.findUnique({
      where: { id: seasonId },
      select: { number: true },
    });
    return season?.number ?? 1;
  }

  /** As partidas da edição, com o que a tabela e o chaveamento precisam. */
  private async editionMatches(competitionSeasonId: string) {
    return this.client.match.findMany({
      where: { competitionSeasonId },
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        roundNumber: true,
        scheduledAt: true,
        homeClubId: true,
        awayClubId: true,
        homeGoals: true,
        awayGoals: true,
        runtimeStatus: true,
        resultStatus: true,
      },
    });
  }

  public async competitionDetail(
    gameWorldId: GameWorldId,
    competitionId: string,
  ): Promise<CompetitionDetailView | null> {
    const found = await this.currentEdition(gameWorldId, competitionId);
    if (found === null) return null;
    const { competition, edition } = found;

    const matches = await this.editionMatches(edition.id);
    const played = matches.filter(isPlayed);
    const rounds = matches
      .map((m) => m.roundNumber)
      .filter((r): r is number => r !== null);
    const playedRounds = played
      .map((m) => m.roundNumber)
      .filter((r): r is number => r !== null);

    const rules = editionRules(edition.rulesJson);
    const hasGroups = edition.clubs.some((c) => c.groupName !== null);
    // O mata-mata de uma competição de grupos só existe DEPOIS que os grupos
    // terminam (C7-V5/V6) — hoje o gerador nem o cria. A aba só aparece quando
    // há partida de mata-mata de fato, e é por isso que olhamos o formato E a
    // existência de jogo, não só a config.
    const knockoutFormat =
      competition.format === "KNOCKOUT" ||
      competition.format === "GROUPS_AND_KNOCKOUT";

    return {
      competitionId: competition.id,
      name: competition.name,
      type: competition.type,
      format: competition.format,
      tier: competition.tier ?? null,
      lifecycle: edition.lifecycle,
      seasonNumber: await this.seasonNumber(edition.seasonId),
      startsOn: toDay(edition.startsAt),
      endsOn: toDay(edition.endsAt),
      clubCount: edition.clubs.length,
      totalMatches: matches.length,
      playedMatches: played.length,
      currentRound: playedRounds.length > 0 ? Math.max(...playedRounds) : null,
      totalRounds: rounds.length > 0 ? Math.max(...rounds) : null,
      promotionSlots: rules.promotionSlots,
      relegationSlots: rules.relegationSlots,
      hasGroups,
      hasKnockout: knockoutFormat && matches.length > 0,
    };
  }

  public async competitionTable(
    gameWorldId: GameWorldId,
    competitionId: string,
  ): Promise<CompetitionTableView | null> {
    const found = await this.currentEdition(gameWorldId, competitionId);
    if (found === null) return null;
    const { competition, edition } = found;

    const matches = await this.editionMatches(edition.id);
    // A rodada vai junto: a variação de posição precisa saber onde cada jogo
    // caiu para reconstruir a tabela da rodada anterior.
    const finished = matches.filter(isPlayed).map((m) => ({
      round: m.roundNumber,
      homeClubId: m.homeClubId,
      awayClubId: m.awayClubId,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
    }));

    const names = await this.clubNames(
      gameWorldId,
      edition.clubs.map((c) => c.clubId),
    );
    const groups = buildGroupTablesWithMovement(
      edition.clubs.map((c) => ({ clubId: c.clubId, group: c.groupName })),
      finished,
    );

    return {
      competitionId: competition.id,
      format: competition.format,
      groups: groups.map((g) => ({
        group: g.group,
        table: g.table.map((row) => ({
          ...row,
          clubName: names.get(row.clubId)?.name ?? "—",
          shortCode: names.get(row.clubId)?.shortCode ?? "",
          primaryColor: names.get(row.clubId)?.primaryColor ?? null,
          secondaryColor: names.get(row.clubId)?.secondaryColor ?? null,
          crestTemplateId: names.get(row.clubId)?.crestTemplateId ?? null,
        })),
      })),
    };
  }

  public async competitionBracket(
    gameWorldId: GameWorldId,
    competitionId: string,
  ): Promise<CompetitionBracketView | null> {
    const found = await this.currentEdition(gameWorldId, competitionId);
    if (found === null) return null;
    const { competition, edition } = found;

    // Só competição de mata-mata tem chaveamento. Numa liga a resposta é a
    // lista VAZIA (a tela esconde a aba), não `null` — `null` é "não existe".
    if (
      competition.format !== "KNOCKOUT" &&
      competition.format !== "GROUPS_AND_KNOCKOUT"
    ) {
      return { competitionId: competition.id, rounds: [] };
    }

    const matches = await this.editionMatches(edition.id);
    const rounds = buildBracket(
      matches.map((m) => ({
        matchId: m.id,
        round: m.roundNumber ?? 1,
        homeClubId: m.homeClubId,
        awayClubId: m.awayClubId,
        homeGoals: isPlayed(m) ? m.homeGoals : null,
        awayGoals: isPlayed(m) ? m.awayGoals : null,
        finished: isPlayed(m),
        scheduledOn: toDay(m.scheduledAt) ?? "",
      })),
    );

    const names = await this.clubNames(
      gameWorldId,
      edition.clubs.map((c) => c.clubId),
    );
    return {
      competitionId: competition.id,
      rounds: rounds.map((round) => ({
        round: round.round,
        name: round.name,
        ties: round.ties.map((tie) => ({
          tieKey: tie.tieKey,
          round: tie.round,
          home: badge(tie.homeClubId, names),
          away: badge(tie.awayClubId, names),
          homeAggregate: tie.homeAggregate,
          awayAggregate: tie.awayAggregate,
          legs: tie.legs,
          winnerClubId: tie.winnerClubId,
          undecidedReason: tie.undecidedReason,
        })),
      })),
    };
  }

  public async competitionMatches(
    gameWorldId: GameWorldId,
    competitionId: string,
  ): Promise<CompetitionMatchesView | null> {
    const found = await this.currentEdition(gameWorldId, competitionId);
    if (found === null) return null;
    const { competition, edition } = found;

    const matches = await this.editionMatches(edition.id);
    const names = await this.clubNames(
      gameWorldId,
      edition.clubs.map((c) => c.clubId),
    );
    // O grupo do jogo vem do grupo dos clubes — `Match` não guarda grupo. Só
    // vale quando os DOIS estão no mesmo grupo (fora da fase de grupos, `null`).
    const groupOf = new Map(edition.clubs.map((c) => [c.clubId, c.groupName]));

    const rows: CompetitionMatchRow[] = matches.map((m) => {
      const homeGroup = groupOf.get(m.homeClubId) ?? null;
      const awayGroup = groupOf.get(m.awayClubId) ?? null;
      const played = isPlayed(m);
      return {
        matchId: m.id,
        roundNumber: m.roundNumber,
        group: homeGroup !== null && homeGroup === awayGroup ? homeGroup : null,
        scheduledOn: toDay(m.scheduledAt) ?? "",
        finished: played,
        home: badge(m.homeClubId, names),
        away: badge(m.awayClubId, names),
        homeGoals: played ? m.homeGoals : null,
        awayGoals: played ? m.awayGoals : null,
      };
    });

    return { competitionId: competition.id, matches: rows };
  }

  public async competitionStats(
    gameWorldId: GameWorldId,
    competitionId: string,
  ): Promise<CompetitionStatsView | null> {
    const found = await this.currentEdition(gameWorldId, competitionId);
    if (found === null) return null;
    const { competition, edition } = found;

    const totals = await this.client.$queryRaw<
      { playerId: string; goals: number; assists: number }[]
    >`
      SELECT pms."playerId" AS "playerId",
             SUM(pms.goals)::int AS goals,
             SUM(pms.assists)::int AS assists
      FROM "PlayerMatchStats" pms
      JOIN "Match" m ON m.id = pms."matchId"
      WHERE m."gameWorldId" = ${gameWorldId}::uuid
        AND m."competitionSeasonId" = ${edition.id}::uuid
      GROUP BY pms."playerId"
      HAVING SUM(pms.goals) > 0 OR SUM(pms.assists) > 0
      LIMIT 100
    `;

    const rowsByPlayer = await this.playerStatIdentities(
      gameWorldId,
      totals.map((t) => t.playerId),
    );
    const toRow = (playerId: string, value: number): PlayerStatRow => {
      const found = rowsByPlayer.get(playerId);
      return {
        playerId,
        name: found?.name ?? "—",
        // O escudo do clube do jogador, para a linha da artilharia mostrar a
        // mesma cara que a tabela e os jogos mostram.
        club: found?.club ?? NO_CLUB_BADGE,
        value,
      };
    };

    const scorers = totals
      .filter((t) => t.goals > 0)
      .sort((a, b) => b.goals - a.goals || a.playerId.localeCompare(b.playerId))
      .slice(0, 30)
      .map((t) => toRow(t.playerId, t.goals));
    const assists = totals
      .filter((t) => t.assists > 0)
      .sort((a, b) => b.assists - a.assists || a.playerId.localeCompare(b.playerId))
      .slice(0, 30)
      .map((t) => toRow(t.playerId, t.assists));

    return {
      competitionId: competition.id,
      coverage: MATCH_STATS_COVERAGE,
      scorers,
      assists,
    };
  }

  /** Nome do jogador + clube atual, para as linhas de estatística. */
  private async playerStatIdentities(
    gameWorldId: GameWorldId,
    playerIds: readonly string[],
  ): Promise<Map<string, { name: string; club: ClubBadgeView }>> {
    if (playerIds.length === 0) return new Map();
    const players = await this.client.player.findMany({
      where: { id: { in: [...playerIds] } },
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
    const names = await this.clubNames(gameWorldId, clubIds);
    return new Map(
      players.map((p) => {
        const clubId = p.squadMemberships[0]?.squad.clubId ?? "";
        return [
          p.id,
          {
            name: `${p.person.firstName} ${p.person.lastName}`,
            // Jogador sem elenco profissional não tem escudo: "Sem clube" é o
            // estado honesto, não um escudo em branco de um clube inexistente.
            club: clubId === "" ? NO_CLUB_BADGE : badge(clubId, names),
          },
        ];
      }),
    );
  }
}

interface ClubIdentityNow {
  name: string;
  shortCode: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  crestTemplateId: string | null;
}

/**
 * O que o motor de partida produz HOJE.
 *
 * `assists`/`cards` são `false` porque o simulador grava zero fixo nessas
 * colunas (`prisma-match-play-repository.ts`: "só gols são simulados hoje").
 * Vira `true` no mesmo commit em que o motor passar a produzi-los — e o teste
 * que cobre isto quebra junto, de propósito.
 */
const MATCH_STATS_COVERAGE: MatchStatsCoverage = {
  goals: true,
  // R-206b: o simulador passou a produzir assistencia e cartao em RNG proprio,
  // fora do kernel — o placar de toda partida ja gravada segue identico.
  // Partidas jogadas ANTES disso continuam so com gol: o dado nao existe
  // retroativamente, e a lista simplesmente nao as inclui.
  assists: true,
  cards: true,
};

/** Uma partida só conta quando TERMINOU de fato — 0×0 agendado não é empate. */
function isPlayed(match: {
  runtimeStatus: string;
  resultStatus: string;
}): boolean {
  return (
    (match.runtimeStatus === "FINISHED" || match.runtimeStatus === "PROCESSED") &&
    match.resultStatus === "NORMAL"
  );
}

function toDay(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** O clube ausente: jogador fora de elenco profissional. */
const NO_CLUB_BADGE: ClubBadgeView = {
  clubId: "",
  clubName: "Sem clube",
  shortCode: "",
  primaryColor: null,
  secondaryColor: null,
  crestTemplateId: null,
};

function badge(
  clubId: string,
  names: Map<string, ClubIdentityNow>,
): ClubBadgeView {
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

/** As vagas de acesso/rebaixamento da config imutável da edição (R-52). */
function editionRules(rulesJson: unknown): {
  promotionSlots: number;
  relegationSlots: number;
} {
  const rules = (rulesJson ?? {}) as {
    rules?: { promotionSlots?: number; relegationSlots?: number };
  };
  return {
    promotionSlots: rules.rules?.promotionSlots ?? 0,
    relegationSlots: rules.rules?.relegationSlots ?? 0,
  };
}
