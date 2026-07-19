import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";

import {
  MAX_INTENSITY,
  MIN_INTENSITY,
  TrainingFocus,
  type TrainingContextReader,
  type TrainingEntrySnapshot,
  type TrainingEvent,
  type TrainingPlanRepository,
  type TrainingPlanSnapshot,
} from "./training-types.js";

/**
 * Definir o plano de treino do clube — command `SetTrainingPlan`
 * (`M-TRAINING`, rastreabilidade §9).
 *
 * Concorrência otimista por `expectedVersion` (R-214/INV-31): `null` cria o
 * plano da temporada; um número exige bater com a versão atual. Antes da R-214
 * a coluna não existia e dois aparelhos se sobrescreviam em silêncio.
 */
export interface SetTrainingPlanInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly seasonId: string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly name: string;
  readonly focus: TrainingFocus;
  readonly intensity: number;
  readonly entries: readonly TrainingEntrySnapshot[];
  readonly expectedVersion: number | null;
}

export interface SetTrainingPlanResult {
  readonly plan: TrainingPlanSnapshot;
  readonly events: readonly TrainingEvent[];
}

/**
 * Perda de qualidade por sessão excedente (R-13).
 *
 * O doc dá a REGRA — "conflito de agenda resolvido por fila de prioridade;
 * excesso sofre perda de qualidade, não bloqueio" — e não o número. Este 0,15
 * por sessão excedente, com piso em 0,25, é **calibração minha**: candidata a
 * VAL-001, não constante do doc. O piso existe porque treino ruim ainda é
 * treino; zerar equivaleria ao bloqueio que o doc recusa.
 */
const QUALITY_LOSS_PER_EXCESS = 0.15;
const MIN_QUALITY = 0.25;

const invalid = (message: string, details?: Record<string, unknown>) =>
  fail(new DomainError("TRAINING_PLAN_INVALID", message, details));

export class SetTrainingPlan {
  public constructor(
    private readonly repository: TrainingPlanRepository,
    private readonly context: TrainingContextReader,
  ) {}

  public async execute(
    input: SetTrainingPlanInput,
  ): Promise<Result<SetTrainingPlanResult, DomainError>> {
    if (input.name.trim() === "") {
      return invalid("O plano de treino precisa de nome.");
    }
    if (
      !Number.isInteger(input.intensity) ||
      input.intensity < MIN_INTENSITY ||
      input.intensity > MAX_INTENSITY
    ) {
      return invalid("Intensidade deve ser inteiro entre 0 e 100.", {
        intensity: input.intensity,
      });
    }
    if (input.entries.length === 0) {
      return invalid("Um plano sem jogador não treina ninguém.");
    }

    const vistos = new Set<string>();
    for (const entry of input.entries) {
      if (vistos.has(entry.playerId)) {
        return invalid("O mesmo jogador aparece duas vezes no plano.", {
          playerId: entry.playerId,
        });
      }
      vistos.add(entry.playerId);
      if (
        !Number.isInteger(entry.workload) ||
        entry.workload < MIN_INTENSITY ||
        entry.workload > MAX_INTENSITY
      ) {
        return invalid("Carga individual deve ser inteiro entre 0 e 100.", {
          playerId: entry.playerId,
          workload: entry.workload,
        });
      }
    }

    const elenco = new Set(
      await this.context.squadPlayerIds(input.gameWorldId, input.clubId),
    );
    for (const entry of input.entries) {
      if (!elenco.has(entry.playerId)) {
        return fail(
          new DomainError(
            "PLAYER_NOT_IN_SQUAD",
            "Jogador não pertence ao elenco do clube.",
            { playerId: entry.playerId },
          ),
        );
      }
    }

    const restritos = new Set(
      await this.context.medicallyRestrictedPlayerIds(
        input.gameWorldId,
        input.clubId,
      ),
    );
    for (const entry of input.entries) {
      // RECOVERY é o treino que o departamento médico MANDA fazer. Bloqueá-la
      // deixaria o lesionado sem plano nenhum — a restrição é contra carga, não
      // contra recuperação.
      if (
        restritos.has(entry.playerId) &&
        entry.focus !== TrainingFocus.RECOVERY
      ) {
        return fail(
          new DomainError(
            "PLAYER_UNDER_MEDICAL_RESTRICTION",
            "Jogador sob restrição médica só aceita treino de recuperação.",
            { playerId: entry.playerId },
          ),
        );
      }
    }

    const existing = await this.repository.findByClubSeason(
      input.gameWorldId,
      input.clubId,
      input.seasonId,
    );
    const versaoAtual = existing?.version ?? null;
    if (versaoAtual !== input.expectedVersion) {
      return fail(
        new DomainError(
          "AGGREGATE_VERSION_CONFLICT",
          "O plano de treino mudou desde a leitura; recarregue e reenvie.",
          { expectedVersion: input.expectedVersion, actualVersion: versaoAtual },
        ),
      );
    }

    // Capacidade do CT (R-13): sessões paralelas = focos distintos no plano.
    // Excesso NÃO bloqueia — perde qualidade, e o plano carrega quanto perdeu.
    const focosDistintos = new Set(input.entries.map((e) => e.focus)).size;
    const capacidade = await this.context.trainingCapacity(
      input.gameWorldId,
      input.clubId,
    );
    const excesso = Math.max(0, focosDistintos - capacidade);
    const qualityFactor = Math.max(
      MIN_QUALITY,
      Number((1 - excesso * QUALITY_LOSS_PER_EXCESS).toFixed(4)),
    );

    const plan: TrainingPlanSnapshot = {
      id:
        existing?.id ??
        deterministicUuidV7({
          worldSeed: input.worldSeed,
          context: `${input.gameWorldId}:training-plan:${input.clubId}:${input.seasonId}`,
          timestampMilliseconds: timestampOf(input.occurredOn),
        }),
      gameWorldId: input.gameWorldId,
      clubId: input.clubId,
      seasonId: input.seasonId,
      name: input.name.trim(),
      focus: input.focus,
      intensity: input.intensity,
      entries: input.entries,
      qualityFactor,
      version: (versaoAtual ?? 0) + 1,
    };

    await this.repository.save(plan, versaoAtual);

    const events: TrainingEvent[] = [
      {
        type: "TrainingPlanSet",
        planId: plan.id,
        clubId: plan.clubId,
        focus: plan.focus,
        intensity: plan.intensity,
        qualityFactor: plan.qualityFactor,
      },
      ...plan.entries.map(
        (entry): TrainingEvent => ({
          type: "TrainingPlayerEntryUpdated",
          planId: plan.id,
          playerId: entry.playerId,
          focus: entry.focus,
          workload: entry.workload,
        }),
      ),
    ];

    return succeed({ plan, events });
  }
}
