import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  simulateUpTo,
  stableHash,
  type KernelCommand,
} from "./match-kernel.js";
import type { SimulationManifest } from "./match-types.js";

/**
 * A partida AO VIVO — o agregado que faz a partida existir no TEMPO.
 *
 * Até aqui a partida era resolvida inteira de uma vez (`world:play-round`
 * simula os 90 minutos e grava o placar). O doc 05 §12 decidiu outra coisa: a
 * partida roda sozinha, mas o técnico pode intervir enquanto ela corre — "o
 * jogo nunca depende de o usuário estar online, mas recompensa quem acompanha".
 * Para isso a partida precisa ter um relógio próprio e aceitar ordens entre um
 * lance e outro.
 *
 * **A garantia que sustenta tudo:** o kernel é reprodutível a partir do log de
 * commands (`simulateUpTo`), então o estado nunca é acumulado — ele é sempre
 * RECALCULADO do zero até o tick corrente. Avançar de 3 em 3 dá exatamente o
 * mesmo jogo que avançar de uma vez, que é o que torna "online ≡ offline ≡
 * replay" verdade em vez de promessa.
 *
 * Puro: sem relógio de parede, sem sorteio fora do kernel semeado.
 */

/** O quanto uma ordem de técnico pode mexer na força de um lado. */
export const COACH_DELTA_LIMIT = 40;

export type LiveMatchStatus = "SCHEDULED" | "IN_PROGRESS" | "FINISHED";

export interface LiveCommandEntry {
  readonly matchSequence: number;
  readonly tick: number;
  readonly actor: string;
  readonly commandType: string;
  readonly side: "HOME" | "AWAY";
  readonly delta: number;
  readonly idempotencyKey: string;
}

export interface LiveMatchSnapshot {
  readonly id: string;
  readonly gameWorldId: string;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly status: LiveMatchStatus;
  readonly manifest: SimulationManifest;
  /** Em que ponto do jogo a partida está (0..`timestepChances`). */
  readonly currentTick: number;
  readonly rngCursor: number;
  readonly nextSequence: number;
  readonly commandLog: readonly LiveCommandEntry[];
  /**
   * O placar CORRENTE. Sempre presente: no minuto zero ele é 0–0 de fato, e
   * isso não é a mentira que a lista de jogos evita — lá o 0–0 seria de um jogo
   * que não aconteceu; aqui é o placar de um jogo que está acontecendo.
   */
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly homeShots: number;
  readonly awayShots: number;
  readonly version: number;
}

export interface CoachCommandInput {
  readonly side: "HOME" | "AWAY";
  readonly delta: number;
  readonly actor: string;
  readonly commandType: string;
  readonly idempotencyKey: string;
}

export class LiveMatch {
  private constructor(private readonly state: LiveMatchSnapshot) {}

  public static fromSnapshot(snapshot: LiveMatchSnapshot): LiveMatch {
    return new LiveMatch(snapshot);
  }

  public snapshot(): LiveMatchSnapshot {
    return this.state;
  }

  /**
   * Apita o início. Começar uma partida já em andamento é IDEMPOTENTE: o
   * relógio do mundo pode mandar iniciar duas vezes no mesmo instante lógico, e
   * recusar isso transformaria uma repetição inofensiva em erro.
   */
  public start(): Result<LiveMatchSnapshot, DomainError> {
    if (this.state.status === "FINISHED") {
      return fail(
        new DomainError(
          "MATCH_ALREADY_FINISHED",
          "A partida já terminou; não é possível reiniciá-la.",
          { matchId: this.state.id },
        ),
      );
    }
    if (this.state.status === "IN_PROGRESS") return succeed(this.state);
    return succeed({ ...this.state, status: "IN_PROGRESS" });
  }

  /**
   * Roda o jogo até `tick`.
   *
   * Pedir um tick já passado NÃO desfaz nada: o relógio do mundo pode chegar
   * atrasado, e voltar o jogo seria apagar lances que o jogador já viu. Passar
   * do fim regulamentar para no fim.
   */
  public advanceTo(tick: number): Result<LiveMatchSnapshot, DomainError> {
    if (this.state.status !== "IN_PROGRESS") {
      return fail(this.notRunning());
    }
    const limit = Math.min(tick, this.state.manifest.timestepChances);
    if (limit <= this.state.currentTick) return succeed(this.state);
    return succeed(this.recomputeUpTo(limit));
  }

  /**
   * A ordem do técnico (doc 05 §11).
   *
   * Vale a partir do tick CORRENTE — não se muda o passado: o gol que já saiu
   * não desaparece porque o técnico mandou recuar depois. O `delta` é limitado
   * porque ação tática "não é bônus livre" (§11): ela muda o comportamento do
   * time, com custo, e um delta sem teto viraria botão de vencer.
   */
  public submitCoachCommand(
    input: CoachCommandInput,
  ): Result<LiveMatchSnapshot, DomainError> {
    if (this.state.status !== "IN_PROGRESS") {
      return fail(this.notRunning());
    }
    if (Math.abs(input.delta) > COACH_DELTA_LIMIT) {
      return fail(
        new DomainError(
          "MATCH_COMMAND_DELTA_OUT_OF_RANGE",
          `A ordem excede o limite de ${COACH_DELTA_LIMIT} de ajuste de força.`,
          { delta: input.delta, limit: COACH_DELTA_LIMIT },
        ),
      );
    }
    // Idempotência por chave: reenviar a mesma ordem (rede instável, retry do
    // cliente) não a aplica duas vezes.
    const already = this.state.commandLog.some(
      (entry) => entry.idempotencyKey === input.idempotencyKey,
    );
    if (already) return succeed(this.state);

    const entry: LiveCommandEntry = {
      matchSequence: this.state.nextSequence,
      tick: this.state.currentTick,
      actor: input.actor,
      commandType: input.commandType,
      side: input.side,
      delta: input.delta,
      idempotencyKey: input.idempotencyKey,
    };
    return succeed({
      ...this.state,
      commandLog: [...this.state.commandLog, entry],
      nextSequence: this.state.nextSequence + 1,
    });
  }

  /** Apita o fim. Só depois do último lance — antes disso o jogo ainda corre. */
  public finish(): Result<LiveMatchSnapshot, DomainError> {
    if (this.state.status === "FINISHED") return succeed(this.state);
    if (this.state.status !== "IN_PROGRESS") {
      return fail(this.notRunning());
    }
    if (this.state.currentTick < this.state.manifest.timestepChances) {
      return fail(
        new DomainError(
          "MATCH_STILL_RUNNING",
          "A partida ainda não chegou ao fim regulamentar.",
          {
            currentTick: this.state.currentTick,
            totalTicks: this.state.manifest.timestepChances,
          },
        ),
      );
    }
    return succeed({ ...this.state, status: "FINISHED" });
  }

  /**
   * O estado no tick pedido, RECALCULADO do zero pelo kernel.
   *
   * Não somamos ao estado anterior de propósito: o kernel consome o log de
   * commands inteiro para chegar ao tick, e recomeçar é o que garante que o
   * caminho percorrido (de uma vez, ou em pedaços) não muda o destino.
   */
  private recomputeUpTo(tick: number): LiveMatchSnapshot {
    const commands: KernelCommand[] = this.state.commandLog.map((entry) => ({
      tick: entry.tick,
      matchSequence: entry.matchSequence,
      side: entry.side,
      delta: entry.delta,
      payloadHash: stableHash(
        `${entry.commandType}:${entry.side}:${entry.delta}`,
      ),
    }));
    const progress = simulateUpTo(
      this.state.id,
      this.state.manifest,
      tick,
      commands,
    );
    return {
      ...this.state,
      currentTick: tick,
      rngCursor: progress.rngCursor,
      homeGoals: progress.homeGoals,
      awayGoals: progress.awayGoals,
      homeShots: progress.homeShots,
      awayShots: progress.awayShots,
    };
  }

  private notRunning(): DomainError {
    return new DomainError(
      "MATCH_NOT_IN_PROGRESS",
      "A partida não está em andamento.",
      { matchId: this.state.id, status: this.state.status },
    );
  }
}
