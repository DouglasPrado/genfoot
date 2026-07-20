import {
  FORM_MAX,
  matchFormDelta,
  type MatchOutcome,
  type MatchPlayRepository,
  type ScheduledMatchWithStrength,
  type ScorerCandidate,
  type SimulatedMatchResult,
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

  public async matchesDueBy(
    gameWorldId: GameWorldId,
    dateIso: string,
  ): Promise<readonly ScheduledMatchWithStrength[]> {
    const matches = await this.client.match.findMany({
      where: {
        gameWorldId,
        runtimeStatus: "SCHEDULED",
        scheduledAt: { lte: new Date(`${dateIso}T23:59:59.999Z`) },
      },
      orderBy: [{ scheduledAt: "asc" }, { roundNumber: "asc" }],
      select: { id: true, roundNumber: true, homeClubId: true, awayClubId: true },
    });
    if (matches.length === 0) return [];

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
      // Só processa a partida que ESTE `saveResults` fechou — reprocessar (já
      // FINISHED) não duplica nada.
      if (count === 0) continue;

      // A FORMA (R-221 Fase 2b): o resultado move a forma de quem jogou —
      // vencedor sobe, perdedor desce; artilheiro embala. Aplicado uma vez (só
      // na transição para FINISHED, count>0). Atalho de SQL clamped, como a
      // força: a forma é stat transiente, não agregado disputado.
      await this.applyMatchForma(gameWorldId, result);

      // O manifesto de replay (C5-V2): reproduz a partida bit a bit (doc 15
      // §3.1). Vale para TODA partida jogada, inclusive 0×0. Reescrito por
      // matchId (unique) — reprocessar não duplica.
      const m = result.manifest;
      await this.client.matchSimulation.deleteMany({
        where: { matchId: result.matchId },
      });
      await this.client.matchSimulation.create({
        data: {
          gameWorldId,
          matchId: result.matchId,
          engineVersion: m.engineBuild,
          tickIntervalSeconds: 0, // o kernel resolve por chances, não por segundos
          totalTicks: m.chances,
          homeStrengthSnapshot: { overall: m.homeStrength },
          awayStrengthSnapshot: { overall: m.awayStrength },
          randomSeed: m.randomSeed,
          inputHash: m.inputHash,
          resultHash: m.resultHash,
        },
      });

      // A artilharia da partida (C7-V5). Reescrita — reprocessar não soma.
      const goals = [...result.homeScorers, ...result.awayScorers];
      if (goals.length > 0) {
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
      }

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

  /**
   * Move a forma dos jogadores pelo resultado da partida (R-221 Fase 2b): base
   * do resultado para o elenco de cada clube + bônus por gol ao artilheiro.
   */
  private async applyMatchForma(
    gameWorldId: GameWorldId,
    result: SimulatedMatchResult,
  ): Promise<void> {
    const clubs = await this.client.match.findUnique({
      where: { id: result.matchId },
      select: { homeClubId: true, awayClubId: true },
    });
    if (clubs === null) return;
    const homeOutcome: MatchOutcome =
      result.homeGoals > result.awayGoals
        ? "WIN"
        : result.homeGoals < result.awayGoals
          ? "LOSS"
          : "DRAW";
    const awayOutcome: MatchOutcome =
      homeOutcome === "WIN" ? "LOSS" : homeOutcome === "LOSS" ? "WIN" : "DRAW";
    const homeBase = matchFormDelta({ outcome: homeOutcome, goalsScored: 0 });
    const awayBase = matchFormDelta({ outcome: awayOutcome, goalsScored: 0 });
    await this.applyClubForma(gameWorldId, clubs.homeClubId, homeBase);
    await this.applyClubForma(gameWorldId, clubs.awayClubId, awayBase);
    // Bônus do artilheiro = o delta a mais além da base (goals × bônus por gol).
    for (const s of result.homeScorers) {
      await this.applyPlayerForma(
        s.playerId,
        matchFormDelta({ outcome: homeOutcome, goalsScored: s.goals }) - homeBase,
      );
    }
    for (const s of result.awayScorers) {
      await this.applyPlayerForma(
        s.playerId,
        matchFormDelta({ outcome: awayOutcome, goalsScored: s.goals }) - awayBase,
      );
    }
  }

  private async applyClubForma(
    gameWorldId: GameWorldId,
    clubId: string,
    delta: number,
  ): Promise<void> {
    if (delta === 0) return;
    // Quem "jogou" leva a forma: os ESCALADOS quando há escalação (mesma base da
    // força, R-220 Fase 1), senão o elenco FIRST_TEAM. Sem escalação, o clube
    // ainda representa com o time principal.
    const hasLineup = await this.client.clubLineup.count({
      where: { gameWorldId, clubId },
    });
    if (hasLineup > 0) {
      await this.client.$executeRaw`
        UPDATE "Player"
        SET "formaModifier" = LEAST(${FORM_MAX}, GREATEST(${-FORM_MAX}, "formaModifier" + ${delta}))
        WHERE id IN (
          SELECT cls."playerId" FROM "ClubLineupStarter" cls
          JOIN "ClubLineup" cl ON cl.id = cls."lineupId"
          WHERE cl."gameWorldId" = ${gameWorldId}::uuid AND cl."clubId" = ${clubId}::uuid
        )
      `;
      return;
    }
    await this.client.$executeRaw`
      UPDATE "Player"
      SET "formaModifier" = LEAST(${FORM_MAX}, GREATEST(${-FORM_MAX}, "formaModifier" + ${delta}))
      WHERE id IN (
        SELECT sm."playerId" FROM "SquadMembership" sm
        JOIN "Squad" s ON s.id = sm."squadId"
        WHERE s."gameWorldId" = ${gameWorldId}::uuid
          AND s."clubId" = ${clubId}::uuid AND s.category = 'FIRST_TEAM'
      )
    `;
  }

  private async applyPlayerForma(
    playerId: string,
    delta: number,
  ): Promise<void> {
    if (delta === 0) return;
    await this.client.$executeRaw`
      UPDATE "Player"
      SET "formaModifier" = LEAST(${FORM_MAX}, GREATEST(${-FORM_MAX}, "formaModifier" + ${delta}))
      WHERE id = ${playerId}::uuid
    `;
  }

  /**
   * A força de cada clube: dos 11 ESCALADOS quando há escalação (R-220 Fase 1),
   * ponderados por `fillQuality`; senão, a média do elenco FIRST_TEAM. A força
   * usa a habilidade EFETIVA — núcleo + forma, presa em 0..100 (R-221 Fase 2b):
   * um time em alta rende mais, em baixa rende menos, na mesma partida.
   */
  private async clubStrengths(
    gameWorldId: GameWorldId,
  ): Promise<Map<string, number>> {
    const [squadRows, lineupRows] = await Promise.all([
      this.client.$queryRaw<{ clubId: string; strength: number }[]>`
        SELECT s."clubId" AS "clubId",
               ROUND(AVG(LEAST(100, GREATEST(0, p."currentAbility" + p."formaModifier"))))::int AS strength
        FROM "Squad" s
        JOIN "SquadMembership" sm ON sm."squadId" = s.id
        JOIN "Player" p ON p.id = sm."playerId"
        WHERE s."gameWorldId" = ${gameWorldId}::uuid
          AND s.category = 'FIRST_TEAM'
        GROUP BY s."clubId"
      `,
      this.client.$queryRaw<{ clubId: string; strength: number }[]>`
        SELECT cl."clubId" AS "clubId",
               ROUND(AVG(LEAST(100, GREATEST(0, p."currentAbility" + p."formaModifier")) * cls."fillQuality"))::int AS strength
        FROM "ClubLineup" cl
        JOIN "ClubLineupStarter" cls ON cls."lineupId" = cl.id
        JOIN "Player" p ON p.id = cls."playerId"
        WHERE cl."gameWorldId" = ${gameWorldId}::uuid
        GROUP BY cl."clubId"
      `,
    ]);
    // Base = média do elenco; a escalação sobrescreve onde existe.
    const strengths = new Map(
      squadRows.map((row) => [row.clubId, Number(row.strength)]),
    );
    for (const row of lineupRows) {
      strengths.set(row.clubId, Number(row.strength));
    }
    return strengths;
  }
}
