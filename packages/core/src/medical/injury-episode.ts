/**
 * Máquina do episódio médico — MED-1..MED-9 + recaída e aposentadoria médica
 * (`docs/02-tecnico/14-maquinas-de-estado.md §6`).
 *
 * Tudo aqui é PURO: cada transição recebe o snapshot e devolve o snapshot
 * seguinte com os eventos canônicos. Nada de `Date.now()`/`Math.random()` — o
 * sorteio da recaída entra como `relapseRoll` de fora (o chamador tira do
 * `SeededRandom` do mundo), para o desfecho ser reproduzível.
 *
 * O que é regra de doc e o que é calibração:
 * - Ordem dos 7 estágios, terminais e gatilhos: **ratificado** (§6).
 * - Faixas de recuperação, tabela de tratamento e fórmula do risco de recaída:
 *   **calibração VAL-MED-001, não ratificada** — não há R-* que as fixe.
 */

import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";

import {
  FIRST_REHAB_STAGE,
  InjurySeverity,
  LAST_REHAB_STAGE,
  MedicalEpisodeState,
  RETURN_TO_TRAINING_STAGE,
  TreatmentOption,
  isEpisodeClosed,
  type InjuryCause,
  type InjuryDiagnosis,
  type InjuryEpisodeSnapshot,
  type InjuryType,
  type MedicalEvent,
  type MedicalEventType,
  type TreatmentProfile,
} from "./injury-episode-types.js";

export interface EpisodeTransition {
  readonly episode: InjuryEpisodeSnapshot;
  readonly events: readonly MedicalEvent[];
}

type TransitionResult = Result<EpisodeTransition, DomainError>;

const invalid = (message: string, details?: Record<string, unknown>) =>
  fail(new DomainError("MEDICAL_PLAN_INVALID", message, details));

const notRecommended = (message: string, details?: Record<string, unknown>) =>
  fail(new DomainError("TREATMENT_NOT_RECOMMENDED", message, details));

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const addDays = (worldDate: string, days: number): string =>
  new Date(timestampOf(worldDate) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

/**
 * Faixa de recuperação por gravidade, em dias.
 * ⚠️ Calibração VAL-MED-001 — sem decisão R-* que fixe estes números.
 */
const RECOVERY_RANGES: Readonly<
  Record<InjurySeverity, { minimumDays: number; maximumDays: number }>
> = {
  MINOR: { minimumDays: 1, maximumDays: 3 },
  LIGHT: { minimumDays: 4, maximumDays: 10 },
  MODERATE: { minimumDays: 11, maximumDays: 28 },
  SERIOUS: { minimumDays: 29, maximumDays: 84 },
  CRITICAL: { minimumDays: 85, maximumDays: 240 },
};

export const recoveryRangeFor = (
  severity: InjurySeverity,
): { readonly minimumDays: number; readonly maximumDays: number } =>
  RECOVERY_RANGES[severity];

/** Escala ordenada da gravidade — usada pelo agravamento e pelas guardas. */
const SEVERITY_ORDER: readonly InjurySeverity[] = [
  InjurySeverity.MINOR,
  InjurySeverity.LIGHT,
  InjurySeverity.MODERATE,
  InjurySeverity.SERIOUS,
  InjurySeverity.CRITICAL,
];

const severityRank = (severity: InjurySeverity): number =>
  SEVERITY_ORDER.indexOf(severity);

const worsen = (severity: InjurySeverity): InjurySeverity =>
  SEVERITY_ORDER[Math.min(severityRank(severity) + 1, SEVERITY_ORDER.length - 1)] ??
  severity;

/** ⚠️ Calibração VAL-MED-001 (ver `injury-episode-types.ts`). */
const TREATMENT_PROFILES: readonly TreatmentProfile[] = [
  {
    option: TreatmentOption.CONSERVATIVE,
    durationMultiplier: 1.25,
    relapseRiskDelta: -10,
    dailyCostMinor: 2_000,
    minimumSeverity: InjurySeverity.MINOR,
  },
  {
    option: TreatmentOption.STANDARD,
    durationMultiplier: 1,
    relapseRiskDelta: 0,
    dailyCostMinor: 5_000,
    minimumSeverity: InjurySeverity.MINOR,
  },
  {
    option: TreatmentOption.INTENSIVE,
    durationMultiplier: 0.7,
    relapseRiskDelta: 15,
    dailyCostMinor: 12_000,
    minimumSeverity: InjurySeverity.LIGHT,
  },
  {
    option: TreatmentOption.SURGERY,
    durationMultiplier: 1.4,
    relapseRiskDelta: -20,
    dailyCostMinor: 40_000,
    minimumSeverity: InjurySeverity.MODERATE,
  },
];

/** As opções que a comissão médica recomenda para a gravidade diagnosticada. */
export const treatmentOptionsFor = (
  severity: InjurySeverity,
): readonly TreatmentProfile[] =>
  TREATMENT_PROFILES.filter(
    (profile) => severityRank(severity) >= severityRank(profile.minimumSeverity),
  );

export const treatmentProfileOf = (
  option: TreatmentOption,
): TreatmentProfile | null =>
  TREATMENT_PROFILES.find((profile) => profile.option === option) ?? null;

const bump = (
  episode: InjuryEpisodeSnapshot,
  patch: Partial<InjuryEpisodeSnapshot>,
): InjuryEpisodeSnapshot => ({
  ...episode,
  ...patch,
  version: episode.version + 1,
});

const eventOf = (
  episode: InjuryEpisodeSnapshot,
  type: MedicalEventType,
  occurredOn: string,
  details?: Record<string, unknown>,
): MedicalEvent => ({
  type,
  playerId: episode.playerId,
  injuryId: episode.id,
  occurredOn,
  ...(details ? { details } : {}),
});

/** Guarda comum: episódio fechado não aceita transição. */
const ensureOpen = (
  episode: InjuryEpisodeSnapshot,
): DomainError | null =>
  isEpisodeClosed(episode)
    ? new DomainError(
        "PLAYER_NOT_INJURED",
        "O episódio médico já está encerrado.",
        { injuryId: episode.id, state: episode.state },
      )
    : null;

const ensureWorldDate = (occurredOn: string): DomainError | null =>
  ISO_DATE.test(occurredOn)
    ? null
    : new DomainError(
        "MEDICAL_PLAN_INVALID",
        "A data do mundo deve estar em YYYY-MM-DD.",
        { occurredOn },
      );

// ---------------------------------------------------------------------------
// MED-1 · abertura
// ---------------------------------------------------------------------------

export interface OpenInjuryEpisodeInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly injuryType: InjuryType;
  readonly cause: InjuryCause;
  readonly region: string;
}

export function openInjuryEpisode(
  input: OpenInjuryEpisodeInput,
): TransitionResult {
  const dateError = ensureWorldDate(input.occurredOn);
  if (dateError) return fail(dateError);

  const region = input.region.trim();
  if (region.length === 0) {
    return invalid("A região do corpo é obrigatória no episódio médico.");
  }

  const id = deterministicUuidV7<"PlayerInjury">({
    worldSeed: input.worldSeed,
    context: `injury:${input.gameWorldId}:${input.playerId}:${input.occurredOn}:${region}`,
    timestampMilliseconds: timestampOf(input.occurredOn),
  });

  const episode: InjuryEpisodeSnapshot = {
    id,
    gameWorldId: input.gameWorldId,
    clubId: input.clubId,
    playerId: input.playerId,
    state: MedicalEpisodeState.EVALUATION,
    rehabStage: null,
    injuryType: input.injuryType,
    cause: input.cause,
    region,
    occurredOn: input.occurredOn,
    diagnosis: null,
    treatment: null,
    relapseCount: 0,
    dischargedOn: null,
    version: 1,
  };

  return succeed({
    episode,
    events: [
      eventOf(episode, "InjurySuspected", input.occurredOn, {
        injuryType: input.injuryType,
        cause: input.cause,
        region,
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// MED-2 · exames
// ---------------------------------------------------------------------------

export function orderMedicalExam(
  episode: InjuryEpisodeSnapshot,
  input: { readonly occurredOn: string },
): TransitionResult {
  const closed = ensureOpen(episode);
  if (closed) return fail(closed);
  const dateError = ensureWorldDate(input.occurredOn);
  if (dateError) return fail(dateError);

  if (episode.state !== MedicalEpisodeState.EVALUATION) {
    return invalid("Só se pede exame a partir da avaliação inicial (MED-2).", {
      state: episode.state,
    });
  }

  const next = bump(episode, { state: MedicalEpisodeState.EXAMS });
  return succeed({
    episode: next,
    events: [eventOf(next, "MedicalExamOrdered", input.occurredOn)],
  });
}

// ---------------------------------------------------------------------------
// MED-3 · diagnóstico
// ---------------------------------------------------------------------------

export interface DiagnoseInjuryInput {
  readonly occurredOn: string;
  readonly severity: InjurySeverity;
  /** Risco de retorno 0–100 (R-48 governa os limiares do exame). */
  readonly returnRiskScore: number;
}

const buildDiagnosis = (
  input: DiagnoseInjuryInput,
  revisions: number,
): InjuryDiagnosis => {
  const range = recoveryRangeFor(input.severity);
  return {
    severity: input.severity,
    minimumDays: range.minimumDays,
    maximumDays: range.maximumDays,
    returnRiskScore: input.returnRiskScore,
    revisions,
  };
};

const validateDiagnosis = (input: DiagnoseInjuryInput): DomainError | null => {
  const dateError = ensureWorldDate(input.occurredOn);
  if (dateError) return dateError;
  if (
    !Number.isInteger(input.returnRiskScore) ||
    input.returnRiskScore < 0 ||
    input.returnRiskScore > 100
  ) {
    return new DomainError(
      "MEDICAL_PLAN_INVALID",
      "O risco de retorno deve ser inteiro entre 0 e 100.",
      { returnRiskScore: input.returnRiskScore },
    );
  }
  return null;
};

export function diagnoseInjury(
  episode: InjuryEpisodeSnapshot,
  input: DiagnoseInjuryInput,
): TransitionResult {
  const closed = ensureOpen(episode);
  if (closed) return fail(closed);
  const error = validateDiagnosis(input);
  if (error) return fail(error);

  if (episode.state !== MedicalEpisodeState.EXAMS) {
    return invalid("O diagnóstico fecha a partir dos exames (MED-3).", {
      state: episode.state,
    });
  }

  const next = bump(episode, {
    state: MedicalEpisodeState.DIAGNOSIS,
    diagnosis: buildDiagnosis(input, 0),
  });
  return succeed({
    episode: next,
    events: [
      eventOf(next, "InjuryDiagnosed", input.occurredOn, {
        severity: input.severity,
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// MED-9 · a estimativa pode mudar
// ---------------------------------------------------------------------------

export function reviseDiagnosis(
  episode: InjuryEpisodeSnapshot,
  input: DiagnoseInjuryInput,
): TransitionResult {
  const closed = ensureOpen(episode);
  if (closed) return fail(closed);
  const error = validateDiagnosis(input);
  if (error) return fail(error);

  if (episode.diagnosis === null) {
    return invalid("Não há diagnóstico a revisar (MED-9).", {
      state: episode.state,
    });
  }

  const next = bump(episode, {
    state: MedicalEpisodeState.DIAGNOSIS,
    diagnosis: buildDiagnosis(input, episode.diagnosis.revisions + 1),
  });
  return succeed({
    episode: next,
    events: [
      eventOf(next, "DiagnosisRevised", input.occurredOn, {
        severity: input.severity,
        revisions: next.diagnosis?.revisions,
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// MED-4 · plano de tratamento → REHAB_S1
// ---------------------------------------------------------------------------

export function setMedicalPlan(
  episode: InjuryEpisodeSnapshot,
  input: { readonly occurredOn: string; readonly option: TreatmentOption },
): TransitionResult {
  const closed = ensureOpen(episode);
  if (closed) return fail(closed);
  const dateError = ensureWorldDate(input.occurredOn);
  if (dateError) return fail(dateError);

  if (
    episode.state !== MedicalEpisodeState.DIAGNOSIS ||
    episode.diagnosis === null
  ) {
    return invalid(
      "O plano de tratamento exige diagnóstico fechado (MED-4).",
      { state: episode.state },
    );
  }

  const profile = treatmentProfileOf(input.option);
  if (!profile) {
    return invalid("Opção de tratamento desconhecida.", {
      option: input.option,
    });
  }
  if (
    severityRank(episode.diagnosis.severity) <
    severityRank(profile.minimumSeverity)
  ) {
    return notRecommended(
      "A comissão médica não recomenda este tratamento para a gravidade diagnosticada.",
      {
        option: input.option,
        severity: episode.diagnosis.severity,
        minimumSeverity: profile.minimumSeverity,
      },
    );
  }

  const days = Math.max(
    1,
    Math.round(episode.diagnosis.maximumDays * profile.durationMultiplier),
  );
  const next = bump(episode, {
    state: MedicalEpisodeState.REHAB,
    rehabStage: FIRST_REHAB_STAGE,
    treatment: {
      option: input.option,
      startedOn: input.occurredOn,
      estimatedReturnOn: addDays(input.occurredOn, days),
    },
  });

  return succeed({
    episode: next,
    events: [
      eventOf(next, "MedicalPlanSet", input.occurredOn, {
        option: input.option,
        estimatedReturnOn: next.treatment?.estimatedReturnOn,
      }),
      eventOf(next, "RehabStarted", input.occurredOn, {
        stage: FIRST_REHAB_STAGE,
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// MED-5/6/7 · reabilitação
// ---------------------------------------------------------------------------

export function advanceRehabStage(
  episode: InjuryEpisodeSnapshot,
  input: { readonly occurredOn: string },
): TransitionResult {
  const closed = ensureOpen(episode);
  if (closed) return fail(closed);
  const dateError = ensureWorldDate(input.occurredOn);
  if (dateError) return fail(dateError);

  if (
    episode.state !== MedicalEpisodeState.REHAB ||
    episode.rehabStage === null
  ) {
    return invalid("Só avança estágio quem está em reabilitação (MED-5).", {
      state: episode.state,
    });
  }

  // S7 concluído é liberação competitiva (MED-7), não um S8.
  if (episode.rehabStage >= LAST_REHAB_STAGE) {
    const cleared = bump(episode, {
      state: MedicalEpisodeState.COMPETITIVE_RETURN,
      rehabStage: null,
    });
    return succeed({
      episode: cleared,
      events: [eventOf(cleared, "MedicallyCleared", input.occurredOn)],
    });
  }

  const stage = episode.rehabStage + 1;
  const next = bump(episode, { rehabStage: stage });
  const events: MedicalEvent[] = [
    eventOf(next, "RehabStageAdvanced", input.occurredOn, { stage }),
  ];
  // MED-6: a entrada em S4 É o retorno ao treino.
  if (stage === RETURN_TO_TRAINING_STAGE) {
    events.push(eventOf(next, "ReturnedToTraining", input.occurredOn));
  }

  return succeed({ episode: next, events });
}

// ---------------------------------------------------------------------------
// MED-8 · alta
// ---------------------------------------------------------------------------

export function dischargePlayer(
  episode: InjuryEpisodeSnapshot,
  input: { readonly occurredOn: string },
): TransitionResult {
  const closed = ensureOpen(episode);
  if (closed) return fail(closed);
  const dateError = ensureWorldDate(input.occurredOn);
  if (dateError) return fail(dateError);

  if (episode.state !== MedicalEpisodeState.COMPETITIVE_RETURN) {
    return invalid("A alta exige liberação competitiva prévia (MED-8).", {
      state: episode.state,
    });
  }

  const next = bump(episode, {
    state: MedicalEpisodeState.DISCHARGE,
    rehabStage: null,
    dischargedOn: input.occurredOn,
  });
  return succeed({
    episode: next,
    events: [eventOf(next, "PlayerRecovered", input.occurredOn)],
  });
}

// ---------------------------------------------------------------------------
// Recaída · forçar o retorno tem consequência real (§6.3)
// ---------------------------------------------------------------------------

/**
 * Risco de recaída 0–100.
 *
 * ⚠️ Calibração VAL-MED-001. A regra de doc é qualitativa: forçar ANTES de S7
 * pode gerar recaída, e a gravidade pode aumentar. A forma abaixo apenas
 * ordena isso — quanto mais longe de S7 e quanto mais recaídas no histórico,
 * maior o risco; o tratamento desloca por `relapseRiskDelta`.
 */
export function relapseRiskScore(episode: InjuryEpisodeSnapshot): number {
  if (episode.state === MedicalEpisodeState.COMPETITIVE_RETURN) return 0;

  const stage = episode.rehabStage ?? 0;
  const stagesMissing = Math.max(0, LAST_REHAB_STAGE - stage);
  const base = stagesMissing * 12;
  const fromDiagnosis = Math.round((episode.diagnosis?.returnRiskScore ?? 50) / 4);
  const fromHistory = episode.relapseCount * 10;
  const fromTreatment = episode.treatment
    ? (treatmentProfileOf(episode.treatment.option)?.relapseRiskDelta ?? 0)
    : 0;

  return Math.max(
    0,
    Math.min(100, base + fromDiagnosis + fromHistory + fromTreatment),
  );
}

export interface ForceReturnInput {
  readonly occurredOn: string;
  /** Sorteio 0–1 vindo do `SeededRandom` do mundo. `< risco/100` = recaída. */
  readonly relapseRoll: number;
  /** Sorteio 0–1 do agravamento; `< 0.25` agrava a gravidade. */
  readonly aggravationRoll?: number;
}

export function forceReturn(
  episode: InjuryEpisodeSnapshot,
  input: ForceReturnInput,
): TransitionResult {
  const closed = ensureOpen(episode);
  if (closed) return fail(closed);
  const dateError = ensureWorldDate(input.occurredOn);
  if (dateError) return fail(dateError);

  if (
    episode.state !== MedicalEpisodeState.REHAB ||
    episode.rehabStage === null
  ) {
    return invalid("Só se força o retorno de quem está em reabilitação.", {
      state: episode.state,
    });
  }
  if (input.relapseRoll < 0 || input.relapseRoll > 1) {
    return invalid("O sorteio da recaída deve estar entre 0 e 1.", {
      relapseRoll: input.relapseRoll,
    });
  }

  // Em S7 o retorno não é forçado: é a liberação competitiva regular (MED-7).
  if (episode.rehabStage >= LAST_REHAB_STAGE) {
    return advanceRehabStage(episode, { occurredOn: input.occurredOn });
  }

  const risk = relapseRiskScore(episode);
  if (input.relapseRoll >= risk / 100) {
    const cleared = bump(episode, {
      state: MedicalEpisodeState.COMPETITIVE_RETURN,
      rehabStage: null,
    });
    return succeed({
      episode: cleared,
      events: [
        eventOf(cleared, "MedicallyCleared", input.occurredOn, {
          forced: true,
          risk,
        }),
      ],
    });
  }

  // Recaiu: volta um estágio (de S1 reentra em EVALUATION — não existe S0) e a
  // gravidade pode aumentar.
  const previousStage = episode.rehabStage - 1;
  const aggravated =
    episode.diagnosis && (input.aggravationRoll ?? 1) < 0.25
      ? buildDiagnosis(
          {
            occurredOn: input.occurredOn,
            severity: worsen(episode.diagnosis.severity),
            returnRiskScore: episode.diagnosis.returnRiskScore,
          },
          episode.diagnosis.revisions + 1,
        )
      : episode.diagnosis;

  const next = bump(episode, {
    state:
      previousStage < FIRST_REHAB_STAGE
        ? MedicalEpisodeState.EVALUATION
        : MedicalEpisodeState.REHAB,
    rehabStage: previousStage < FIRST_REHAB_STAGE ? null : previousStage,
    relapseCount: episode.relapseCount + 1,
    diagnosis: aggravated,
  });

  return succeed({
    episode: next,
    events: [
      eventOf(next, "InjuryRelapsed", input.occurredOn, {
        risk,
        stage: next.rehabStage,
        severity: aggravated?.severity,
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Aposentadoria médica · terminal absoluto (INV-4)
// ---------------------------------------------------------------------------

export function retireMedically(
  episode: InjuryEpisodeSnapshot,
  input: { readonly occurredOn: string; readonly confirmed: boolean },
): TransitionResult {
  const closed = ensureOpen(episode);
  if (closed) return fail(closed);
  const dateError = ensureWorldDate(input.occurredOn);
  if (dateError) return fail(dateError);

  if (
    episode.state !== MedicalEpisodeState.DIAGNOSIS &&
    episode.state !== MedicalEpisodeState.REHAB
  ) {
    return invalid(
      "A aposentadoria médica parte do diagnóstico ou da reabilitação.",
      { state: episode.state },
    );
  }
  // §17 exige rito de confirmação — o terminal é absoluto e irreversível.
  if (!input.confirmed) {
    return invalid("A aposentadoria médica exige confirmação explícita.");
  }
  if (
    !episode.diagnosis ||
    severityRank(episode.diagnosis.severity) <
      severityRank(InjurySeverity.SERIOUS)
  ) {
    return notRecommended(
      "A aposentadoria médica exige lesão grave diagnosticada.",
      { severity: episode.diagnosis?.severity ?? null },
    );
  }

  const next = bump(episode, {
    state: MedicalEpisodeState.MEDICAL_RETIREMENT,
    rehabStage: null,
  });
  return succeed({
    episode: next,
    events: [
      eventOf(next, "MedicalRetirement", input.occurredOn, {
        severity: episode.diagnosis.severity,
      }),
    ],
  });
}
