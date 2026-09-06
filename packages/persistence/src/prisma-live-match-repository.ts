import {
  LiveMatch,
  tickAt,
  type LiveMatchRepository,
  type LiveMatchSnapshot,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * A partida ao vivo sobre Postgres (C5-V2).
 *
 * O tick corrente é DERIVADO de `Match.startedAt` + `realSecondsPerDay` do
 * relógio do mundo — não há coluna de tick, de propósito (ver a porta). O
 * placar vem do kernel, recalculado a partir do log de ordens; nada de placar
 * ao vivo é armazenado até o apito final, quando o caminho de `saveResults`
 * grava o resultado oficial como sempre gravou.
 *
 * `now` entra por parâmetro em vez de sair de `Date.now()` aqui dentro: o
 * relógio de parede é do chamador, e injetá-lo torna o repositório testável sem
 * esperar o tempo passar.
 */
export class PrismaLiveMatchRepository implements LiveMatchRepository {
  public constructor(
    private readonly client: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async findLive(
    gameWorldId: GameWorldId,
    matchId: string,
  ): Promise<LiveMatchSnapshot | null> {
    const match = await this.client.match.findFirst({
      where: { id: matchId, gameWorldId },
      include: {
        simulation: { include: { commandLog: { orderBy: { matchSequence: "asc" } } } },
      },
    });
    if (match === null) return null;
    const simulation = match.simulation;
    // Sem manifesto congelado a partida ainda não apitou: ela existe como
    // agendada, e é isso que devolvemos — não um jogo em andamento sem regras.
    if (simulation === null) {
      return this.scheduledSnapshot(match);
    }

    const dayMs = await this.dayDurationMs(gameWorldId);
    const totalTicks = simulation.totalTicks;
    const elapsedMs =
      match.startedAt === null
        ? 0
        : this.now().getTime() - match.startedAt.getTime();
    const derivedTick = tickAt(elapsedMs, dayMs, totalTicks, false);

    const commandLog = simulation.commandLog.map((entry) => {
      const payload = (entry.payloadSnapshot ?? {}) as {
        side?: "HOME" | "AWAY";
        delta?: number;
      };
      return {
        matchSequence: Number(entry.matchSequence),
        tick: entry.appliedAtTick,
        actor: entry.controlSource,
        commandType: entry.commandType,
        side: payload.side ?? ("HOME" as const),
        delta: payload.delta ?? 0,
        idempotencyKey: entry.idempotencyKey ?? entry.commandId,
      };
    });

    const strengths = simulation.homeStrengthSnapshot as { overall?: number };
    const awayStrengths = simulation.awayStrengthSnapshot as { overall?: number };
    const base: LiveMatchSnapshot = {
      id: match.id,
      gameWorldId,
      homeClubId: match.homeClubId,
      awayClubId: match.awayClubId,
      status: liveStatus(match.runtimeStatus),
      manifest: {
        seed: simulation.randomSeed,
        engineBuild: simulation.engineVersion,
        timestepChances: totalTicks,
        homeStrength: strengths.overall ?? 50,
        awayStrength: awayStrengths.overall ?? 50,
        inputHash: simulation.inputHash ?? "",
      },
      currentTick: 0,
      rngCursor: 0,
      nextSequence: commandLog.length + 1,
      commandLog,
      homeGoals: 0,
      awayGoals: 0,
      homeShots: 0,
      awayShots: 0,
      version: match.version,
    };

    // Partida encerrada mostra o placar OFICIAL da coluna, não o recalculado:
    // o resultado homologado é a verdade, e recalcular poderia divergir se o
    // motor mudar de versão depois.
    if (base.status === "FINISHED") {
      return {
        ...base,
        currentTick: totalTicks,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        homeShots: match.homeShots ?? 0,
        awayShots: match.awayShots ?? 0,
      };
    }
    if (base.status !== "IN_PROGRESS" || derivedTick <= 0) return base;

    const advanced = LiveMatch.fromSnapshot(base).advanceTo(derivedTick);
    return advanced.ok ? advanced.value : base;
  }

  public async dueToStart(
    gameWorldId: GameWorldId,
    worldDateIso: string,
  ): Promise<readonly string[]> {
    const matches = await this.client.match.findMany({
      where: {
        gameWorldId,
        runtimeStatus: "SCHEDULED",
        scheduledAt: { lte: new Date(`${worldDateIso}T23:59:59.999Z`) },
      },
      select: { id: true },
      orderBy: { scheduledAt: "asc" },
    });
    return matches.map((m) => m.id);
  }

  public async dueToFinish(
    gameWorldId: GameWorldId,
  ): Promise<readonly string[]> {
    const dayMs = await this.dayDurationMs(gameWorldId);
    const live = await this.client.match.findMany({
      where: { gameWorldId, runtimeStatus: "LIVE" },
      select: { id: true, startedAt: true, simulation: { select: { totalTicks: true } } },
    });
    const nowMs = this.now().getTime();
    return live
      .filter((m) => {
        if (m.startedAt === null) return true;
        const totalTicks = m.simulation?.totalTicks ?? 0;
        // Chegou ao último lance = acabou. `tickAt` já satura no total, então
        // comparar com ele cobre também o caso de o app ficar horas fechado.
        return (
          tickAt(nowMs - m.startedAt.getTime(), dayMs, totalTicks, false) >=
          totalTicks
        );
      })
      .map((m) => m.id);
  }

  public async startMatch(
    gameWorldId: GameWorldId,
    matchId: string,
  ): Promise<LiveMatchSnapshot | null> {
    const { count } = await this.client.match.updateMany({
      where: { gameWorldId, id: matchId, runtimeStatus: "SCHEDULED" },
      data: { runtimeStatus: "LIVE", startedAt: this.now() },
    });
    // `count === 0` = outra chamada já apitou. Não é erro: o relógio pode
    // disparar duas vezes, e reapitar é o que NÃO pode acontecer.
    if (count === 0) return this.findLive(gameWorldId, matchId);
    return this.findLive(gameWorldId, matchId);
  }

  public async appendCommand(
    gameWorldId: GameWorldId,
    matchId: string,
    command: {
      readonly matchSequence: number;
      readonly tick: number;
      readonly actor: string;
      readonly commandType: string;
      readonly side: "HOME" | "AWAY";
      readonly delta: number;
      readonly idempotencyKey: string;
    },
  ): Promise<boolean> {
    const simulation = await this.client.matchSimulation.findFirst({
      where: { matchId, gameWorldId },
      select: { id: true },
    });
    if (simulation === null) return false;
    try {
      await this.client.matchCommandLog.create({
        data: {
          gameWorldId,
          simulationId: simulation.id,
          matchSequence: BigInt(command.matchSequence),
          appliedAtTick: command.tick,
          commandType: command.commandType,
          // O §12 separa quem agiu: usuário online, IA no lugar dele, ou
          // sistema. Esta ordem veio de um toque na tela.
          controlSource: "USER_ONLINE",
          payloadSnapshot: { side: command.side, delta: command.delta },
          commandId: crypto.randomUUID(),
          idempotencyKey: command.idempotencyKey,
        },
      });
      return true;
    } catch {
      // `@@unique([simulationId, matchSequence])` recusa duas ordens na mesma
      // posição: a segunda perde, e perder é o comportamento correto — a ordem
      // do log é a ordem-verdade do replay.
      return false;
    }
  }

  /** Quanto tempo real vale um dia lógico; sem relógio, a partida não corre. */
  private async dayDurationMs(gameWorldId: GameWorldId): Promise<number> {
    const clock = await this.client.gameWorld.findUnique({
      where: { id: gameWorldId },
      select: { realSecondsPerDay: true },
    });
    return (clock?.realSecondsPerDay ?? 0) * 1000;
  }

  private scheduledSnapshot(match: {
    id: string;
    gameWorldId: string;
    homeClubId: string;
    awayClubId: string;
    version: number;
  }): LiveMatchSnapshot {
    return {
      id: match.id,
      gameWorldId: match.gameWorldId,
      homeClubId: match.homeClubId,
      awayClubId: match.awayClubId,
      status: "SCHEDULED",
      manifest: {
        seed: "",
        engineBuild: "",
        timestepChances: 0,
        homeStrength: 0,
        awayStrength: 0,
        inputHash: "",
      },
      currentTick: 0,
      rngCursor: 0,
      nextSequence: 1,
      commandLog: [],
      homeGoals: 0,
      awayGoals: 0,
      homeShots: 0,
      awayShots: 0,
      version: match.version,
    };
  }
}

/** O status do banco traduzido para o do agregado. */
function liveStatus(runtimeStatus: string): LiveMatchSnapshot["status"] {
  if (runtimeStatus === "LIVE" || runtimeStatus === "PAUSED_FOR_DECISION") {
    return "IN_PROGRESS";
  }
  if (runtimeStatus === "FINISHED" || runtimeStatus === "PROCESSED") {
    return "FINISHED";
  }
  return "SCHEDULED";
}
