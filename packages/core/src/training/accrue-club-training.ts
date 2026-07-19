import { succeed, type Result } from "@grinta/shared";
import type { DomainError } from "@grinta/shared";

import { accrueTrainingDay } from "./training-accrual.js";
import type { TrainingPlanSnapshot } from "./training-types.js";

/**
 * Um dia de treino do clube: do plano ativo ao buffer de desenvolvimento
 * (R-212/R-113).
 *
 * Orquestra as peças puras — lê o plano da temporada, monta o contexto de cada
 * jogador, roda `accrueTrainingDay` e soma o resultado em
 * `PlayerDevelopmentAccrual`. Nenhum atributo muda aqui: isso é a virada
 * (INV-29). Este passo é o que o relógio do mundo dispara a cada dia.
 */
export interface TrainingPlanReader {
  findByClubSeason(
    gameWorldId: string,
    clubId: string,
    seasonId: string,
  ): Promise<TrainingPlanSnapshot | null>;
}

export interface PlayerAccrualContext {
  readonly playerId: string;
  readonly age: number;
  readonly baselineAbility: number;
  readonly currentAbility: number;
  readonly naturalPotential: number;
  readonly applicableAttributes: readonly string[];
}

export interface AccrualContextReader {
  contextFor(
    gameWorldId: string,
    clubId: string,
    playerIds: readonly string[],
  ): Promise<readonly PlayerAccrualContext[]>;
}

export interface BufferIncrement {
  readonly gameWorldId: string;
  readonly seasonId: string;
  readonly playerId: string;
  readonly attributeCode: string;
  readonly pendingDelta: number;
}

export interface AccrualBufferWriter {
  /** Soma cada incremento ao buffer existente (upsert por chave). */
  addToBuffer(increments: readonly BufferIncrement[]): Promise<void>;
}

export interface AccrueClubTrainingInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly seasonId: string;
}

export class AccrueClubTraining {
  public constructor(
    private readonly plans: TrainingPlanReader,
    private readonly context: AccrualContextReader,
    private readonly buffer: AccrualBufferWriter,
  ) {}

  public async execute(
    input: AccrueClubTrainingInput,
  ): Promise<Result<{ increments: number }, DomainError>> {
    const plan = await this.plans.findByClubSeason(
      input.gameWorldId,
      input.clubId,
      input.seasonId,
    );
    // Clube sem plano na temporada não treina — no-op, não erro. Um mundo pode
    // rodar dias antes de qualquer clube definir treino.
    if (plan === null) return succeed({ increments: 0 });

    const playerIds = plan.entries.map((e) => e.playerId);
    const contexts = await this.context.contextFor(
      input.gameWorldId,
      input.clubId,
      playerIds,
    );
    const byId = new Map(contexts.map((c) => [c.playerId, c]));

    const increments: BufferIncrement[] = [];
    for (const entry of plan.entries) {
      const ctx = byId.get(entry.playerId);
      // Jogador na entrada mas sem contexto: saiu do elenco entre o set-plan e o
      // dia. Ignora — o plano ainda o cita, o mundo já não.
      if (ctx === undefined) continue;

      const deltas = accrueTrainingDay(
        {
          focus: entry.focus,
          workload: entry.workload,
          qualityFactor: plan.qualityFactor,
        },
        {
          playerId: ctx.playerId,
          age: ctx.age,
          baselineAbility: ctx.baselineAbility,
          currentAbility: ctx.currentAbility,
          naturalPotential: ctx.naturalPotential,
          baseLearningRate: 1,
          trainingQuality: 1,
          compatibility: 1,
          competitiveMinutes: 1,
          morale: 1,
          fatigue: 0,
          injury: 0,
          negativePressure: 0,
          applicableAttributes: ctx.applicableAttributes,
        },
      );
      for (const d of deltas) {
        increments.push({
          gameWorldId: input.gameWorldId,
          seasonId: input.seasonId,
          playerId: d.playerId,
          attributeCode: d.attributeCode,
          pendingDelta: d.pendingDelta,
        });
      }
    }

    if (increments.length > 0) await this.buffer.addToBuffer(increments);
    return succeed({ increments: increments.length });
  }
}
