export const BandMetric = {
  AVG_TOTAL_GOALS: "avgTotalGoals",
  HOME_WIN_RATE: "homeWinRate",
  AVG_HOME_GOALS: "avgHomeGoals",
} as const;

export type BandMetric = (typeof BandMetric)[keyof typeof BandMetric];

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
}

export interface BatchReport {
  readonly manifestHash: string;
  readonly rulesetVersion: string;
  readonly runsExpected: number;
  readonly runsExecuted: number;
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
}
