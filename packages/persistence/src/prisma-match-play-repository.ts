import {
  COHESION_MATCH_GAIN,
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
          // O kernel ja calculava isto; ate a migration `match_team_stats` nao
          // havia onde gravar, e o dado morria no objeto.
          homeShots: result.homeShots,
          awayShots: result.awayShots,
          homePossession: result.homePossession,
          // xG: a soma das probabilidades contra as quais cada chute foi
          // sorteado. Nao e estimativa — e a conta do proprio kernel.
          homeExpectedGoals: result.homeExpectedGoals,
          awayExpectedGoals: result.awayExpectedGoals,
          runtimeStatus: "FINISHED",
          resultStatus: "NORMAL",
          simulationSeed: result.resultHash,
          finishedAt: new Date(),
        },
      });
      // Só processa a partida que ESTE `saveResults` fechou — reprocessar (já
      // FINISHED) não duplica nada.
      if (count === 0) continue;

      // Os clubes vem antes de tudo: as estatisticas individuais precisam saber
      // de que lado cada jogador esta (o goleiro que defendeu, por exemplo).
      const match = await this.client.match.findUnique({
        where: { id: result.matchId },
        select: { homeClubId: true, awayClubId: true },
      });
      if (match === null) continue;
      const squads = await this.scorerCandidates(gameWorldId, [
        match.homeClubId,
        match.awayClubId,
      ]);
      const homeSquad = squads.get(match.homeClubId) ?? [];
      const awaySquad = squads.get(match.awayClubId) ?? [];

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

      // As estatisticas individuais da partida. Reescritas — reprocessar nao
      // soma. Ate a R-206b so `goals` era real: assistencia, cartao e
      // finalizacao entravam com ZERO FIXO, e a tela lia isso como "ninguem
      // assistiu, ninguem foi advertido". Agora vem do simulador.
      const perPlayer = new Map<
        string,
        {
          goals: number;
          assists: number;
          shots: number;
          shotsOnTarget: number;
          fouls: number;
          saves: number;
          goalsConceded: number;
          yellowCards: number;
          redCards: number;
        }
      >();
      const bump = (
        playerId: string,
        field:
          | "goals"
          | "assists"
          | "shots"
          | "shotsOnTarget"
          | "fouls"
          | "saves"
          | "goalsConceded"
          | "yellowCards"
          | "redCards",
        by = 1,
      ) => {
        const row = perPlayer.get(playerId) ?? {
          goals: 0,
          assists: 0,
          shots: 0,
          shotsOnTarget: 0,
          fouls: 0,
          saves: 0,
          goalsConceded: 0,
          yellowCards: 0,
          redCards: 0,
        };
        row[field] += by;
        perPlayer.set(playerId, row);
      };

      for (const scorer of [...result.homeScorers, ...result.awayScorers]) {
        bump(scorer.playerId, "goals", scorer.goals);
      }
      for (const assist of [...result.homeAssists, ...result.awayAssists]) {
        bump(assist.playerId, "assists");
      }
      for (const shot of [
        ...result.homePlayerShots,
        ...result.awayPlayerShots,
      ]) {
        bump(shot.playerId, "shots", shot.shots);
      }
      for (const card of [...result.homeCards, ...result.awayCards]) {
        bump(
          card.playerId,
          card.type === "YELLOW_CARD" ? "yellowCards" : "redCards",
        );
      }
      for (const foul of [...result.homeFouls, ...result.awayFouls]) {
        bump(foul.playerId, "fouls", foul.fouls);
      }
      // O chute no alvo e do TIME; reparte-se proporcionalmente ao que cada um
      // finalizou, com o piso do gol (gol e sempre no alvo).
      for (const [playerShots, teamOnTarget] of [
        [result.homePlayerShots, result.homeShotsOnTarget],
        [result.awayPlayerShots, result.awayShotsOnTarget],
      ] as const) {
        const teamShots = playerShots.reduce((sum, s) => sum + s.shots, 0);
        for (const entry of playerShots) {
          const goals = perPlayer.get(entry.playerId)?.goals ?? 0;
          const share =
            teamShots === 0
              ? goals
              : Math.round((entry.shots / teamShots) * teamOnTarget);
          bump(entry.playerId, "shotsOnTarget", Math.max(goals, share));
        }
      }
      // A defesa e do goleiro: sem escalacao, o goleiro do jogo e o de maior
      // habilidade do elenco. E aproximacao declarada — quando houver
      // escalacao, vira o GK escalado.
      const gk = (side: "home" | "away") => {
        const squad = side === "home" ? homeSquad : awaySquad;
        const keepers = squad.filter((c) => c.primaryPosition === "GK");
        return keepers.sort((a, b) => b.ability - a.ability)[0]?.playerId ?? null;
      };
      const homeKeeper = gk("home");
      const awayKeeper = gk("away");
      if (homeKeeper !== null) {
        bump(homeKeeper, "saves", result.homeSaves);
        bump(homeKeeper, "goalsConceded", result.awayGoals);
      }
      if (awayKeeper !== null) {
        bump(awayKeeper, "saves", result.awaySaves);
        bump(awayKeeper, "goalsConceded", result.homeGoals);
      }

      const ratingByPlayer = new Map(
        result.ratings.map((r) => [r.playerId, r.rating]),
      );

      await this.client.playerMatchStats.deleteMany({
        where: { matchId: result.matchId },
      });
      if (perPlayer.size > 0) {
        await this.client.playerMatchStats.createMany({
          data: [...perPlayer].map(([playerId, row]) => ({
            matchId: result.matchId,
            playerId,
            goals: row.goals,
            assists: row.assists,
            shots: row.shots,
            shotsOnTarget: row.shotsOnTarget,
            foulsCommitted: row.fouls,
            yellowCards: row.yellowCards,
            redCards: row.redCards,
            saves: row.saves,
            goalsConceded: row.goalsConceded,
            rating: ratingByPlayer.get(playerId) ?? 6,
            // Passe, desarme e interceptacao exigem o motor simular POSSE lance
            // a lance (doc 05 §6, os 9 passos do ataque), que ele ainda nao faz.
            // Zero aqui e ausencia de motor, e a tela declara isso.
            passesAttempted: 0,
            passesCompleted: 0,
            tackles: 0,
            interceptions: 0,
            // Fadiga por jogador exige minutos em campo, que exigem escalacao.
            fatigueStart: 0,
            fatigueEnd: 0,
          })),
        });
      }

      // O feed da partida (C5-V1): um MatchEvent GOAL por gol, já com minuto e
      // ordem total (eventSequence). O clube vem do lado. Reescrito, nao somado.
      const clubOf = (side: "home" | "away") =>
        side === "home" ? match.homeClubId : match.awayClubId;

      // Um so feed com TODAS as familias que o motor produz, ordenado pelo
      // minuto. A `eventSequence` sai desta ordem — ela e a ordem oficial do
      // relato (`@@unique(matchId, eventSequence)`), e a tela le por ela.
      const feed: {
        minute: number;
        clubId: string;
        playerId: string;
        type: "GOAL" | "ASSIST" | "YELLOW_CARD" | "RED_CARD";
        description: string;
        importance: number;
      }[] = [];

      for (const goal of result.goalEvents) {
        feed.push({
          minute: goal.minute,
          clubId: clubOf(goal.side),
          playerId: goal.playerId,
          type: "GOAL",
          description: "Gol",
          importance: 3,
        });
      }
      for (const [side, assists] of [
        ["home", result.homeAssists],
        ["away", result.awayAssists],
      ] as const) {
        for (const assist of assists) {
          feed.push({
            minute: assist.minute,
            clubId: clubOf(side),
            playerId: assist.playerId,
            type: "ASSIST",
            description: "Assistencia",
            importance: 2,
          });
        }
      }
      for (const [side, cards] of [
        ["home", result.homeCards],
        ["away", result.awayCards],
      ] as const) {
        for (const card of cards) {
          feed.push({
            minute: card.minute,
            clubId: clubOf(side),
            playerId: card.playerId,
            type: card.type,
            description:
              card.type === "YELLOW_CARD" ? "Cartao amarelo" : "Cartao vermelho",
            importance: card.type === "RED_CARD" ? 3 : 1,
          });
        }
      }

      await this.client.matchEvent.deleteMany({
        where: { matchId: result.matchId },
      });
      if (feed.length === 0) continue;
      // A assistencia vem ANTES do gol no mesmo minuto (o passe precede a
      // conclusao); fora isso, a ordem e o minuto. Desempate final por playerId
      // para a sequencia ser estavel entre reprocessamentos.
      const ORDER: Record<string, number> = {
        ASSIST: 0,
        GOAL: 1,
        YELLOW_CARD: 2,
        RED_CARD: 3,
      };
      feed.sort(
        (a, b) =>
          a.minute - b.minute ||
          (ORDER[a.type] ?? 9) - (ORDER[b.type] ?? 9) ||
          a.playerId.localeCompare(b.playerId),
      );
      await this.client.matchEvent.createMany({
        data: feed.map((event, index) => ({
          matchId: result.matchId,
          clubId: event.clubId,
          playerId: event.playerId,
          type: event.type,
          minute: event.minute,
          eventSequence: index + 1,
          description: event.description,
          importance: event.importance,
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
    // Entrosamento (R-220 Fase 3): jogar sobe a coesão dos dois clubes (teto 100).
    await this.client.$executeRaw`
      UPDATE "Club" SET "cohesion" = LEAST(100, "cohesion" + ${COHESION_MATCH_GAIN})
      WHERE id IN (${clubs.homeClubId}::uuid, ${clubs.awayClubId}::uuid)
    `;
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
    // A força soma o entrosamento do clube (R-220 Fase 3, R-15 ±6): time
    // entrosado rende mais. O modificador é (cohesion−50)/50×6, inteiro.
    const [squadRows, lineupRows] = await Promise.all([
      this.client.$queryRaw<{ clubId: string; strength: number }[]>`
        SELECT s."clubId" AS "clubId",
               (ROUND(AVG(LEAST(100, GREATEST(0, p."currentAbility" + p."formaModifier"))))
                + ROUND((c."cohesion" - 50) / 50.0 * 6))::int AS strength
        FROM "Squad" s
        JOIN "SquadMembership" sm ON sm."squadId" = s.id
        JOIN "Player" p ON p.id = sm."playerId"
        JOIN "Club" c ON c.id = s."clubId"
        WHERE s."gameWorldId" = ${gameWorldId}::uuid
          AND s.category = 'FIRST_TEAM'
        GROUP BY s."clubId", c."cohesion"
      `,
      this.client.$queryRaw<{ clubId: string; strength: number }[]>`
        SELECT cl."clubId" AS "clubId",
               (ROUND(AVG(LEAST(100, GREATEST(0, p."currentAbility" + p."formaModifier")) * cls."fillQuality"))
                + ROUND((c."cohesion" - 50) / 50.0 * 6))::int AS strength
        FROM "ClubLineup" cl
        JOIN "ClubLineupStarter" cls ON cls."lineupId" = cl.id
        JOIN "Player" p ON p.id = cls."playerId"
        JOIN "Club" c ON c.id = cl."clubId"
        WHERE cl."gameWorldId" = ${gameWorldId}::uuid
        GROUP BY cl."clubId", c."cohesion"
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
