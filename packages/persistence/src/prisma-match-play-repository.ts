import type {
  MatchPlayRepository,
  ScheduledMatchWithStrength,
  ScorerCandidate,
  SimulatedMatchResult,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Adapter de jogo de C5 (R-175).
 *
 * A força de cada clube é o overall médio do elenco — uma agregação de banco
 * (`AVG(currentAbility)` sobre os membros do elenco), não uma regra do domínio.
 * O placar emerge dela no kernel; ela não define o placar.
 *
 * `PrismaClient` (não `TransactionClient`) porque a leitura da rodada e a
 * gravação dos resultados são operações independentes; a atomicidade que importa
 * é por partida (cada `update`), e os resultados de uma rodada são idempotentes
 * por já marcarem FINISHED — reprocessar não muda nada.
 */
export class PrismaMatchPlayRepository implements MatchPlayRepository {
  public constructor(private readonly client: PrismaClient) {}

  public async nextUnplayedRound(
    gameWorldId: GameWorldId,
  ): Promise<readonly ScheduledMatchWithStrength[]> {
    // A primeira rodada com alguma partida ainda agendada.
    const next = await this.client.match.findFirst({
      where: { gameWorldId, runtimeStatus: "SCHEDULED" },
      orderBy: [{ roundNumber: "asc" }, { scheduledAt: "asc" }],
      select: { roundNumber: true },
    });
    if (next?.roundNumber == null) return [];

    const matches = await this.client.match.findMany({
      where: {
        gameWorldId,
        runtimeStatus: "SCHEDULED",
        roundNumber: next.roundNumber,
      },
      select: { id: true, roundNumber: true, homeClubId: true, awayClubId: true },
    });

    const clubIds = [
      ...new Set(matches.flatMap((m) => [m.homeClubId, m.awayClubId])),
    ];
    const [strengths, scorers] = await Promise.all([
      this.clubStrengths(gameWorldId),
      this.scorerCandidates(gameWorldId, clubIds),
    ]);
    return matches.map((match) => ({
      matchId: match.id,
      roundNumber: match.roundNumber ?? 0,
      homeClubId: match.homeClubId,
      awayClubId: match.awayClubId,
      // Um clube sem elenco (não deveria acontecer pós-gênese) cai em 50 — a
      // média do mundo — em vez de 0, que faria o kernel dividir por zero de força.
      homeStrength: strengths.get(match.homeClubId) ?? 50,
      awayStrength: strengths.get(match.awayClubId) ?? 50,
      homeScorers: scorers.get(match.homeClubId) ?? [],
      awayScorers: scorers.get(match.awayClubId) ?? [],
    }));
  }

  public async saveResults(
    gameWorldId: GameWorldId,
    results: readonly SimulatedMatchResult[],
  ): Promise<void> {
    for (const result of results) {
      const { count } = await this.client.match.updateMany({
        where: { gameWorldId, id: result.matchId, runtimeStatus: "SCHEDULED" },
        data: {
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
          runtimeStatus: "FINISHED",
          resultStatus: "NORMAL",
          simulationSeed: result.resultHash,
          finishedAt: new Date(),
        },
      });
      // Só grava a artilharia da partida que ESTE processamento fechou —
      // reprocessar (a partida já FINISHED) não duplica os gols.
      if (count === 0) continue;
      const goals = [...result.homeScorers, ...result.awayScorers];
      if (goals.length === 0) continue;
      await this.client.playerMatchStats.deleteMany({
        where: { matchId: result.matchId },
      });
      await this.client.playerMatchStats.createMany({
        data: goals.map((scorer) => ({
          matchId: result.matchId,
          playerId: scorer.playerId,
          goals: scorer.goals,
          // Só gols são simulados hoje; o resto fica zerado até o motor evoluir.
          assists: 0,
          shots: 0,
          shotsOnTarget: 0,
          passesAttempted: 0,
          passesCompleted: 0,
          tackles: 0,
          interceptions: 0,
          foulsCommitted: 0,
          yellowCards: 0,
          redCards: 0,
          saves: 0,
          goalsConceded: 0,
          fatigueStart: 0,
          fatigueEnd: 0,
        })),
      });

      // O feed da partida (C5-V1): um MatchEvent GOAL por gol, já com minuto e
      // ordem total (eventSequence). O clube vem do lado. Reescrito, não somado.
      if (result.goalEvents.length === 0) continue;
      const match = await this.client.match.findUnique({
        where: { id: result.matchId },
        select: { homeClubId: true, awayClubId: true },
      });
      if (match === null) continue;
      await this.client.matchEvent.deleteMany({
        where: { matchId: result.matchId },
      });
      await this.client.matchEvent.createMany({
        data: result.goalEvents.map((goal, index) => ({
          matchId: result.matchId,
          clubId: goal.side === "home" ? match.homeClubId : match.awayClubId,
          playerId: goal.playerId,
          type: "GOAL" as const,
          minute: goal.minute,
          eventSequence: index + 1,
          description: "Gol",
          importance: 3,
        })),
      });
    }
  }

  /** Candidatos a goleador de cada clube: os jogadores do elenco profissional. */
  private async scorerCandidates(
    gameWorldId: GameWorldId,
    clubIds: readonly string[],
  ): Promise<Map<string, ScorerCandidate[]>> {
    if (clubIds.length === 0) return new Map();
    const squads = await this.client.squad.findMany({
      where: { gameWorldId, category: "FIRST_TEAM", clubId: { in: [...clubIds] } },
      select: {
        clubId: true,
        memberships: {
          select: {
            player: {
              select: { id: true, primaryPosition: true, currentAbility: true },
            },
          },
        },
      },
    });
    const byClub = new Map<string, ScorerCandidate[]>();
    for (const squad of squads) {
      byClub.set(
        squad.clubId,
        squad.memberships.map((m) => ({
          playerId: m.player.id,
          primaryPosition: m.player.primaryPosition,
          ability: m.player.currentAbility,
        })),
      );
    }
    return byClub;
  }

  /** O overall médio do elenco de cada clube do mundo. */
  private async clubStrengths(
    gameWorldId: GameWorldId,
  ): Promise<Map<string, number>> {
    const rows = await this.client.$queryRaw<
      { clubId: string; strength: number }[]
    >`
      SELECT s."clubId" AS "clubId",
             ROUND(AVG(p."currentAbility"))::int AS strength
      FROM "Squad" s
      JOIN "SquadMembership" sm ON sm."squadId" = s.id
      JOIN "Player" p ON p.id = sm."playerId"
      WHERE s."gameWorldId" = ${gameWorldId}::uuid
        AND s.category = 'FIRST_TEAM'
      GROUP BY s."clubId"
    `;
    return new Map(rows.map((row) => [row.clubId, Number(row.strength)]));
  }
}
