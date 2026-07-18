import type {
  MatchPlayRepository,
  ScheduledMatchWithStrength,
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

    const strengths = await this.clubStrengths(gameWorldId);
    return matches.map((match) => ({
      matchId: match.id,
      roundNumber: match.roundNumber ?? 0,
      homeClubId: match.homeClubId,
      awayClubId: match.awayClubId,
      // Um clube sem elenco (não deveria acontecer pós-gênese) cai em 50 — a
      // média do mundo — em vez de 0, que faria o kernel dividir por zero de força.
      homeStrength: strengths.get(match.homeClubId) ?? 50,
      awayStrength: strengths.get(match.awayClubId) ?? 50,
    }));
  }

  public async saveResults(
    gameWorldId: GameWorldId,
    results: readonly SimulatedMatchResult[],
  ): Promise<void> {
    for (const result of results) {
      await this.client.match.updateMany({
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
    }
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
