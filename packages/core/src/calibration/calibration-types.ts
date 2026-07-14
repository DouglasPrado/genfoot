export const BandMetric = {
  // BS — banda esportiva (partida / R-34)
  AVG_TOTAL_GOALS: "avgTotalGoals",
  HOME_WIN_RATE: "homeWinRate",
  AVG_HOME_GOALS: "avgHomeGoals",
  // BS — equilíbrio competitivo agregado (multi-temporada / R-88)
  COMPETITIVE_BALANCE: "competitiveBalance",
  // BE — banda de economia (multi-temporada / R-88), em minor units inteiras
  AVG_CLUB_REVENUE_MINOR: "avgClubRevenueMinor",
  // BD — banda de demografia (multi-temporada / R-88)
  AVG_SQUAD_AGE: "avgSquadAge",
} as const;

export type BandMetric = (typeof BandMetric)[keyof typeof BandMetric];

/**
 * Dimensão da banda conforme a metodologia de aceite (docs §17):
 * BS = esporte (partida/equilíbrio), BE = economia, BD = demografia.
 */
export const BandDimension = {
  SPORT: "BS",
  ECONOMY: "BE",
  DEMOGRAPHY: "BD",
} as const;

export type BandDimension =
  (typeof BandDimension)[keyof typeof BandDimension];

export const EvaluationResult = {
  PASS: "PASS",
  FAIL: "FAIL",
} as const;

export type EvaluationResult =
  (typeof EvaluationResult)[keyof typeof EvaluationResult];

export const PromotionOutcome = {
  GO: "GO",
  NO_GO: "NO_GO",
} as const;

export type PromotionOutcome =
  (typeof PromotionOutcome)[keyof typeof PromotionOutcome];

export interface CalibrationScenario {
  readonly id: string;
  readonly seed: string;
  readonly homeStrength: number;
  readonly awayStrength: number;
}

export interface CalibrationBand {
  readonly bandId: string;
  readonly metric: BandMetric;
  readonly lo: number;
  readonly hi: number;
  /** Oráculo versionado ao qual esta banda se compara (FR-006). */
  readonly oracleVersion?: string;
}

export interface CalibrationInvariants {
  readonly maxTotalGoalsPerMatch: number;
}

export interface CalibrationManifest {
  readonly manifestHash: string;
  readonly rulesetVersion: string;
  readonly timestepChances: number;
  readonly expectedRuns: number;
  readonly scenarios: readonly CalibrationScenario[];
  readonly bands: readonly CalibrationBand[];
  readonly invariants: CalibrationInvariants;
  /**
   * Partidas por cenário (R-34 exige ~10.000 por cenário aprovado). Cada partida
   * usa uma seed derivada determinística; as métricas agregam sobre todas as
   * partidas. Ausente ou 1 preserva o comportamento de partida única.
   */
  readonly matchesPerScenario?: number;
}

export interface ScenarioRunResult {
  readonly scenarioId: string;
  readonly seed: string;
  readonly resultHash: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly totalGoals: number;
  readonly homeWin: boolean;
  readonly violations: readonly string[];
  /** Número de partidas agregadas neste cenário (R-34). */
  readonly matchCount: number;
  /** Partidas vencidas pelo mandante dentro do cenário (para agregar homeWinRate). */
  readonly homeWinCount: number;
}

export interface MetricObservation {
  readonly metricId: BandMetric;
  readonly value: number;
}

export interface BandEvaluation {
  readonly bandId: string;
  readonly metric: BandMetric;
  readonly observed: number;
  readonly lo: number;
  readonly hi: number;
  readonly result: EvaluationResult;
  /** Oráculo versionado usado na comparação (FR-006). */
  readonly oracleVersion: string;
}

export interface BatchReport {
  readonly manifestHash: string;
  readonly rulesetVersion: string;
  readonly runsExpected: number;
  readonly runsExecuted: number;
  /** Partidas efetivamente executadas (cenários × matchesPerScenario, R-34). */
  readonly matchesExecuted: number;
  readonly scenarioRuns: readonly ScenarioRunResult[];
  readonly metrics: readonly MetricObservation[];
  readonly bandEvaluations: readonly BandEvaluation[];
  readonly invariantViolationCount: number;
  readonly gateResult: EvaluationResult;
  readonly reportHash: string;
}

export interface GateEvaluationInput {
  readonly gateId: string;
  readonly result: EvaluationResult | "UNEVALUATED";
}

export interface PromotionDecision {
  readonly candidate: string;
  readonly gates: readonly GateEvaluationInput[];
  readonly missingGateIds: readonly string[];
  readonly decision: PromotionOutcome;
  /** Revisores humanos que assinam a decisão (data-model: append-only). */
  readonly reviewers: readonly string[];
}

// ---------------------------------------------------------------------------
// Multi-temporada (R-88): economia (BE) e demografia (BD) sobre lotes longos.
// ---------------------------------------------------------------------------

/** Modelo determinístico de bilheteria/receita em minor units inteiras. */
export interface CalibrationEconomyModel {
  readonly ticketPriceMinor: number;
  readonly baseAttendance: number;
  readonly attendancePerGoal: number;
}

/** Modelo determinístico de envelhecimento/regeneração do elenco. */
export interface CalibrationDemographyModel {
  readonly squadSize: number;
  readonly startAge: number;
  readonly retireAge: number;
  readonly regenAge: number;
}

export interface MultiSeasonInvariants {
  readonly minSquadAge: number;
  readonly maxSquadAge: number;
}

export interface MultiSeasonManifest {
  readonly manifestHash: string;
  readonly rulesetVersion: string;
  readonly timestepChances: number;
  /** Sementes de mundo, uma por mundo simulado (R-88 exige ≥ 1000). */
  readonly worldSeeds: readonly string[];
  readonly seasons: number;
  readonly clubs: number;
  readonly bands: readonly CalibrationBand[];
  readonly economy: CalibrationEconomyModel;
  readonly demography: CalibrationDemographyModel;
  readonly invariants: MultiSeasonInvariants;
}

export interface MultiSeasonReport {
  readonly manifestHash: string;
  readonly rulesetVersion: string;
  readonly worldsExecuted: number;
  readonly seasonsPerWorld: number;
  readonly matchesExecuted: number;
  readonly metrics: readonly MetricObservation[];
  readonly bandEvaluations: readonly BandEvaluation[];
  readonly invariantViolationCount: number;
  readonly gateResult: EvaluationResult;
  readonly reportHash: string;
}

// ---------------------------------------------------------------------------
// Evidência append-only por rulesetVersion + staleness do gate (FR-008/010).
// ---------------------------------------------------------------------------

export interface EvidenceRecord {
  readonly evidenceRef: string;
  readonly rulesetVersion: string;
  readonly reportHash: string;
  /** Ordem de anexação (append-only, monotônica). */
  readonly sequence: number;
}

export interface EvidenceLedger {
  readonly records: readonly EvidenceRecord[];
}

export const GateEvidenceStatus = {
  PASS: "PASS",
  FAIL: "FAIL",
  UNEVALUATED: "UNEVALUATED",
  EVIDENCE_MISSING: "EVIDENCE_MISSING",
  EVIDENCE_STALE: "EVIDENCE_STALE",
} as const;

export type GateEvidenceStatus =
  (typeof GateEvidenceStatus)[keyof typeof GateEvidenceStatus];

export interface GateEvidenceInput {
  readonly gateId: string;
  readonly result: EvaluationResult | "UNEVALUATED";
  readonly evidenceRef: string;
  readonly evidenceRulesetVersion: string;
}

export interface GateEvidenceEvaluation {
  readonly gateId: string;
  readonly status: GateEvidenceStatus;
  readonly evidenceRef: string;
}

export interface PromotionGateDecision {
  readonly candidate: string;
  readonly currentRulesetVersion: string;
  readonly gates: readonly GateEvidenceEvaluation[];
  readonly blockingGateIds: readonly string[];
  readonly decision: PromotionOutcome;
  readonly reviewers: readonly string[];
  readonly sequence: number;
}

export interface PromotionLog {
  readonly decisions: readonly PromotionGateDecision[];
}
