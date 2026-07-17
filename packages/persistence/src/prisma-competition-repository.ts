import type {
  CompetitionGenesis,
  CompetitionId,
  CompetitionRepository,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter de C7 (R-175/R-185).
 *
 * `TransactionClient` no construtor: a estrutura de uma edição ocupa cinco
 * tabelas (competição, temporada, edição, participantes, partidas), e meia
 * estrutura gravada é uma liga sem calendário. Quem chama está em transação.
 */
export class PrismaCompetitionRepository implements CompetitionRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findCompetition(
    gameWorldId: GameWorldId,
    competitionId: CompetitionId,
  ): Promise<{ readonly id: string } | null> {
    return this.client.competition.findUnique({
      where: { gameWorldId_id: { gameWorldId, id: competitionId } },
      select: { id: true },
    });
  }

  public async materializeGenesis(
    genesis: CompetitionGenesis,
  ): Promise<boolean> {
    // Idempotente: a competição que já existe pula a estrutura inteira. A gênese
    // pode ser reexecutada, e a liga não deve nascer duas vezes.
    const existing = await this.findCompetition(
      genesis.competition.gameWorldId,
      genesis.competition.id,
    );
    if (existing !== null) return false;

    await this.client.competition.create({
      data: {
        id: genesis.competition.id,
        gameWorldId: genesis.competition.gameWorldId,
        name: genesis.competition.name,
        type: genesis.competition.type,
        format: genesis.competition.format,
        tier: genesis.competition.tier,
        reputation: genesis.competition.reputation,
        version: genesis.competition.version,
      },
    });

    await this.client.season.create({
      data: {
        id: genesis.season.id,
        gameWorldId: genesis.season.gameWorldId,
        number: genesis.season.number,
        name: genesis.season.name,
        status: genesis.season.status,
        startsAt: worldDate(genesis.season.startsOn),
        endsAt: worldDate(genesis.season.endsOn),
        version: genesis.season.version,
      },
    });

    await this.client.competitionSeason.create({
      data: {
        id: genesis.edition.id,
        competitionId: genesis.edition.competitionId,
        seasonId: genesis.edition.seasonId,
        name: genesis.edition.name,
        status: genesis.edition.status,
        startsAt: worldDate(genesis.edition.startsOn),
        clubs: {
          create: genesis.edition.clubIds.map((clubId) => ({ clubId })),
        },
      },
    });

    await this.client.match.createMany({
      data: genesis.matches.map((match) => ({
        id: match.id,
        gameWorldId: match.gameWorldId,
        competitionSeasonId: match.competitionSeasonId,
        homeClubId: match.homeClubId,
        awayClubId: match.awayClubId,
        seasonNumber: match.seasonNumber,
        roundNumber: match.roundNumber,
        scheduledAt: worldDate(match.scheduledOn),
        runtimeStatus: match.runtimeStatus,
        resultStatus: match.resultStatus,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        version: match.version,
      })),
    });

    return true;
  }
}

function worldDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}
