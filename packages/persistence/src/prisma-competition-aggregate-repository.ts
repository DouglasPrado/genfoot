import {
  CompetitionLifecycle,
  type ClubId,
  type CompetitionAggregateRepository,
  type CompetitionAggregateSnapshot,
  type CompetitionConfig,
  type CompetitionId,
  type EditionResults,
  type ScheduledMatchDraw,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter do agregado de competição autorado (C7, R-202).
 *
 * O agregado mora em DUAS tabelas: `Competition` (o guarda-chuva: nome, tipo,
 * formato, divisão) e a edição `CompetitionSeason` (o ciclo de vida, a janela, a
 * config, os participantes). São gravados no MESMO commit; a concorrência
 * otimista é guardada na versão do `Competition` (a raiz). Os participantes
 * (`CompetitionClub`) são REESCRITOS, não somados — o array do domínio é a
 * verdade. Por isso o `TransactionClient` no construtor.
 *
 * Para uma competição existir é preciso uma `Season` (FK obrigatória). Enquanto
 * a virada de temporada não cria temporadas (V6), a primeira competição de um
 * mundo cria/reusa a "Temporada 1".
 */
export class PrismaCompetitionAggregateRepository
  implements CompetitionAggregateRepository
{
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findCompetitionById(
    gameWorldId: string,
    competitionId: string,
  ): Promise<CompetitionAggregateSnapshot | null> {
    const comp = await this.client.competition.findFirst({
      where: { id: competitionId, gameWorldId },
      include: {
        seasons: {
          orderBy: { startsAt: "desc" },
          take: 1,
          include: { clubs: { orderBy: { seed: "asc" } } },
        },
      },
    });
    if (comp === null) return null;
    const edition = comp.seasons[0];
    if (edition === undefined) return null;

    const config = readConfig(edition.rulesJson, edition.prizeJson);
    return {
      id: comp.id as CompetitionId,
      gameWorldId: comp.gameWorldId as GameWorldId,
      name: comp.name,
      type: comp.type,
      format: comp.format,
      tier: comp.tier ?? null,
      reputation: comp.reputation,
      lifecycle: edition.lifecycle,
      startsOn: dateToIso(edition.startsAt),
      endsOn: dateToIso(edition.endsAt),
      clubIds: edition.clubs.map((c) => c.clubId as ClubId),
      config,
      version: comp.version,
    };
  }

  public async saveCompetition(
    snapshot: CompetitionAggregateSnapshot,
    expectedVersion: number,
  ): Promise<void> {
    const rulesJson = {
      rules: snapshot.config.rules,
      qualifications: snapshot.config.qualifications,
    } as unknown as Prisma.InputJsonValue;
    const prizeJson = snapshot.config
      .prizes as unknown as Prisma.InputJsonValue;
    const startsAt = isoToDate(snapshot.startsOn);
    const endsAt = isoToDate(snapshot.endsOn);
    const status = seasonStatusFor(snapshot.lifecycle);

    let editionId: string;

    if (expectedVersion === 0) {
      const seasonId = await this.ensureSeasonId(snapshot.gameWorldId);
      await this.client.competition.create({
        data: {
          id: snapshot.id,
          gameWorldId: snapshot.gameWorldId,
          name: snapshot.name,
          type: snapshot.type,
          format: snapshot.format,
          tier: snapshot.tier,
          reputation: snapshot.reputation,
          version: snapshot.version,
        },
      });
      const edition = await this.client.competitionSeason.create({
        data: {
          competitionId: snapshot.id,
          seasonId,
          name: snapshot.name,
          status,
          lifecycle: snapshot.lifecycle,
          startsAt,
          endsAt,
          rulesJson,
          prizeJson,
          version: snapshot.version,
        },
      });
      editionId = edition.id;
    } else {
      const { count } = await this.client.competition.updateMany({
        where: {
          id: snapshot.id,
          gameWorldId: snapshot.gameWorldId,
          version: expectedVersion,
        },
        data: {
          name: snapshot.name,
          type: snapshot.type,
          format: snapshot.format,
          tier: snapshot.tier,
          reputation: snapshot.reputation,
          version: snapshot.version,
        },
      });
      if (count === 0) {
        throw new Error(
          `AGGREGATE_VERSION_CONFLICT: competição ${snapshot.id} mudou por baixo (esperava ${expectedVersion}).`,
        );
      }
      const edition = await this.client.competitionSeason.findFirst({
        where: { competitionId: snapshot.id },
        orderBy: { startsAt: "desc" },
        select: { id: true },
      });
      if (edition === null) {
        throw new Error(
          `COMPETITION_EDITION_MISSING: competição ${snapshot.id} sem edição.`,
        );
      }
      editionId = edition.id;
      await this.client.competitionSeason.update({
        where: { id: editionId },
        data: {
          name: snapshot.name,
          status,
          lifecycle: snapshot.lifecycle,
          startsAt,
          endsAt,
          rulesJson,
          prizeJson,
          version: snapshot.version,
        },
      });
    }

    // Participantes: reescritos (o array do domínio é a verdade). A ordem vira
    // a semente (seed) — no mata-mata é o chaveamento; na liga é só a ordem.
    await this.client.competitionClub.deleteMany({
      where: { competitionSeasonId: editionId },
    });
    if (snapshot.clubIds.length > 0) {
      await this.client.competitionClub.createMany({
        data: snapshot.clubIds.map((clubId, index) => ({
          competitionSeasonId: editionId,
          clubId,
          seed: index + 1,
        })),
      });
    }
  }

  public async materializeSchedule(
    gameWorldId: string,
    competitionId: string,
    draws: readonly ScheduledMatchDraw[],
  ): Promise<void> {
    const edition = await this.client.competitionSeason.findFirst({
      where: { competitionId },
      orderBy: { startsAt: "desc" },
      select: { id: true },
    });
    if (edition === null) return;
    // O sorteio é reescrito (não somado): re-travar geraria os mesmos jogos.
    await this.client.match.deleteMany({
      where: { competitionSeasonId: edition.id },
    });
    if (draws.length === 0) return;
    await this.client.match.createMany({
      data: draws.map((draw) => ({
        gameWorldId,
        competitionSeasonId: edition.id,
        homeClubId: draw.homeClubId,
        awayClubId: draw.awayClubId,
        seasonNumber: 1,
        roundNumber: draw.round,
        scheduledAt: new Date(`${draw.scheduledOn}T00:00:00.000Z`),
      })),
    });

    // Fase de grupos: grava o grupo de cada clube (a classificação por grupo lê
    // daqui). Ambos os clubes de um jogo de grupo estão no mesmo grupo.
    const groupOfClub = new Map<string, string>();
    for (const draw of draws) {
      if (draw.group === null) continue;
      groupOfClub.set(draw.homeClubId, draw.group);
      groupOfClub.set(draw.awayClubId, draw.group);
    }
    for (const [clubId, group] of groupOfClub) {
      await this.client.competitionClub.updateMany({
        where: { competitionSeasonId: edition.id, clubId },
        data: { groupName: group },
      });
    }
  }

  public async findEditionResults(
    gameWorldId: string,
    competitionId: string,
  ): Promise<EditionResults | null> {
    const edition = await this.client.competitionSeason.findFirst({
      where: { competitionId },
      orderBy: { startsAt: "desc" },
      select: { id: true, clubs: { select: { clubId: true } } },
    });
    if (edition === null) return null;

    const matches = await this.client.match.findMany({
      where: {
        competitionSeasonId: edition.id,
        runtimeStatus: { in: ["FINISHED", "PROCESSED"] },
        resultStatus: "NORMAL",
      },
      select: {
        id: true,
        homeClubId: true,
        awayClubId: true,
        homeGoals: true,
        awayGoals: true,
      },
    });

    // O artilheiro da edição: soma dos gols nos jogos desta edição, maior
    // primeiro; depois resolvemos o clube dele (elenco profissional).
    const matchIds = matches.map((m) => m.id);
    let topScorer: EditionResults["topScorer"] = null;
    if (matchIds.length > 0) {
      const top = await this.client.playerMatchStats.groupBy({
        by: ["playerId"],
        where: { matchId: { in: matchIds }, goals: { gt: 0 } },
        _sum: { goals: true },
        orderBy: { _sum: { goals: "desc" } },
        take: 1,
      });
      const playerId = top[0]?.playerId;
      if (playerId !== undefined) {
        const membership = await this.client.squadMembership.findFirst({
          where: { playerId, squad: { category: "FIRST_TEAM" } },
          select: { squad: { select: { clubId: true } } },
        });
        if (membership !== null) {
          topScorer = { playerId, clubId: membership.squad.clubId };
        }
      }
    }

    return {
      clubIds: edition.clubs.map((c) => c.clubId),
      finishedMatches: matches.map((m) => ({
        homeClubId: m.homeClubId,
        awayClubId: m.awayClubId,
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
      })),
      topScorer,
    };
  }

  public async homologateEditionMatches(
    gameWorldId: string,
    competitionId: string,
  ): Promise<number> {
    const edition = await this.client.competitionSeason.findFirst({
      where: { competitionId },
      orderBy: { startsAt: "desc" },
      select: { id: true },
    });
    if (edition === null) return 0;
    // Só as terminadas viram oficiais; agendadas que ninguém jogou não são
    // homologadas (não há resultado a confirmar).
    const { count } = await this.client.match.updateMany({
      where: {
        gameWorldId,
        competitionSeasonId: edition.id,
        runtimeStatus: "FINISHED",
      },
      data: {
        runtimeStatus: "PROCESSED",
        homologationStatus: "HOMOLOGATED",
      },
    });
    return count;
  }

  /** Encontra ou cria a "Temporada 1" do mundo (FK obrigatória da edição). */
  private async ensureSeasonId(gameWorldId: string): Promise<string> {
    const existing = await this.client.season.findFirst({
      where: { gameWorldId, number: 1 },
      select: { id: true },
    });
    if (existing !== null) return existing.id;
    const world = await this.client.gameWorld.findUnique({
      where: { id: gameWorldId },
      select: { currentDate: true },
    });
    const created = await this.client.season.create({
      data: {
        gameWorldId,
        number: 1,
        name: "Temporada 1",
        startsAt: world?.currentDate ?? new Date(),
      },
      select: { id: true },
    });
    return created.id;
  }
}

/** SeasonStatus derivado do ciclo de vida autoral (mantém read models antigos sãos). */
function seasonStatusFor(
  lifecycle: CompetitionLifecycle,
): "PLANNED" | "ACTIVE" | "FINISHED" {
  if (lifecycle === CompetitionLifecycle.RUNNING) return "ACTIVE";
  if (lifecycle === CompetitionLifecycle.FINISHED) return "FINISHED";
  return "PLANNED";
}

function readConfig(
  rulesJson: unknown,
  prizeJson: unknown,
): CompetitionConfig {
  const parsed = (rulesJson ?? {}) as {
    rules?: CompetitionConfig["rules"];
    qualifications?: CompetitionConfig["qualifications"];
  };
  return {
    rules: parsed.rules as CompetitionConfig["rules"],
    qualifications: parsed.qualifications ?? [],
    prizes: (prizeJson ?? {}) as CompetitionConfig["prizes"],
  };
}

function dateToIso(value: Date | null): string | null {
  return value === null ? null : value.toISOString().slice(0, 10);
}

function isoToDate(value: string | null): Date | null {
  return value === null ? null : new Date(`${value}T00:00:00.000Z`);
}
