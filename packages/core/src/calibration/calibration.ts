import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { simulateMatch, stableHash } from "../matches/match-kernel.js";
import type { SimulationManifest } from "../matches/match-types.js";
import {
  BandMetric,
  EvaluationResult,
  PromotionOutcome,
  type BandEvaluation,
  type BatchReport,
  type CalibrationManifest,
  type GateEvaluationInput,
  type MetricObservation,
  type PromotionDecision,
  type ScenarioRunResult,
} from "./calibration-types.js";

const VALID_METRICS = new Set<string>(Object.values(BandMetric));

/**
 * Executa um lote de calibração determinístico: cada cenário roda pelo kernel
 * de partida, as métricas agregam e as bandas/invariantes viram PASS/FAIL.
 * O gate é conjuntivo — uma única violação reprova o lote, sem ser mascarada
 * pela média. Mesmo manifesto → mesmo reportHash.
 */
export function runCalibrationBatch(
  manifest: CalibrationManifest,
): Result<BatchReport, DomainError> {
  if (
    manifest.scenarios.length === 0 ||
    manifest.scenarios.length !== manifest.expectedRuns
  ) {
    return fail(
      new DomainError(
        "MANIFEST_INVALID",
        "O manifesto exige cenários e expectedRuns coerentes.",
        {
          expectedRuns: manifest.expectedRuns,
          scenarios: manifest.scenarios.length,
        },
      ),
    );
  }
  if (
    !Number.isSafeInteger(manifest.timestepChances) ||
    manifest.timestepChances < 1
  ) {
    return fail(new DomainError("MANIFEST_INVALID", "timestepChances inválido."));
  }
  for (const band of manifest.bands) {
    if (!VALID_METRICS.has(band.metric) || band.lo > band.hi) {
      return fail(
        new DomainError("MANIFEST_INVALID", "Banda inválida.", {
          bandId: band.bandId,
        }),
      );
    }
  }
  const seeds = new Set<string>();
  for (const scenario of manifest.scenarios) {
    if (seeds.has(scenario.seed)) {
      return fail(
        new DomainError("RUN_DUPLICATE", "Seed duplicada no manifesto.", {
          seed: scenario.seed,
        }),
      );
    }
    seeds.add(scenario.seed);
  }

  const scenarioRuns: ScenarioRunResult[] = manifest.scenarios.map(
    (scenario) => {
      const inputHash = stableHash(
        [
          scenario.id,
          scenario.seed,
          scenario.homeStrength,
          scenario.awayStrength,
          manifest.rulesetVersion,
          manifest.timestepChances,
        ].join("|"),
      );
      const simManifest: SimulationManifest = {
        seed: scenario.seed,
        engineBuild: `calibration:${manifest.rulesetVersion}`,
        timestepChances: manifest.timestepChances,
        homeStrength: scenario.homeStrength,
        awayStrength: scenario.awayStrength,
        inputHash,
      };
      const kernel = simulateMatch(scenario.id, simManifest);
      const totalGoals = kernel.homeGoals + kernel.awayGoals;
      const violations: string[] = [];
      if (totalGoals > manifest.invariants.maxTotalGoalsPerMatch) {
        violations.push(
          `INV_MAX_GOALS:${scenario.id}:${totalGoals}>${manifest.invariants.maxTotalGoalsPerMatch}`,
        );
      }
      return {
        scenarioId: scenario.id,
        seed: scenario.seed,
        resultHash: kernel.resultHash,
        homeGoals: kernel.homeGoals,
        awayGoals: kernel.awayGoals,
        totalGoals,
        homeWin: kernel.homeGoals > kernel.awayGoals,
        violations,
      };
    },
  );

  const runsExecuted = scenarioRuns.length;
  const totalGoalsSum = scenarioRuns.reduce((s, r) => s + r.totalGoals, 0);
  const homeGoalsSum = scenarioRuns.reduce((s, r) => s + r.homeGoals, 0);
  const homeWins = scenarioRuns.filter((r) => r.homeWin).length;
  const metricValues: Record<BandMetric, number> = {
    [BandMetric.AVG_TOTAL_GOALS]: totalGoalsSum / runsExecuted,
    [BandMetric.AVG_HOME_GOALS]: homeGoalsSum / runsExecuted,
    [BandMetric.HOME_WIN_RATE]: homeWins / runsExecuted,
  };
  const metrics: MetricObservation[] = (
    Object.keys(metricValues) as BandMetric[]
  ).map((metricId) => ({ metricId, value: metricValues[metricId] }));

  const bandEvaluations: BandEvaluation[] = manifest.bands.map((band) => {
    const observed = metricValues[band.metric];
    const result =
      observed >= band.lo && observed <= band.hi
        ? EvaluationResult.PASS
        : EvaluationResult.FAIL;
    return {
      bandId: band.bandId,
      metric: band.metric,
      observed,
      lo: band.lo,
      hi: band.hi,
      result,
    };
  });

  const invariantViolationCount = scenarioRuns.reduce(
    (sum, run) => sum + run.violations.length,
    0,
  );
  const gateResult =
    invariantViolationCount === 0 &&
    bandEvaluations.every((band) => band.result === EvaluationResult.PASS)
      ? EvaluationResult.PASS
      : EvaluationResult.FAIL;

  const reportHash = stableHash(
    [
      manifest.manifestHash,
      manifest.rulesetVersion,
      ...scenarioRuns.map((run) => `${run.scenarioId}:${run.resultHash}`),
      `gate:${gateResult}`,
    ].join("|"),
  );

  return succeed({
    manifestHash: manifest.manifestHash,
    rulesetVersion: manifest.rulesetVersion,
    runsExpected: manifest.expectedRuns,
    runsExecuted,
    scenarioRuns,
    metrics,
    bandEvaluations,
    invariantViolationCount,
    gateResult,
    reportHash,
  });
}

/**
 * Decisão de promoção conjuntiva: GO somente se todos os gates requeridos
 * existem e são PASS. Ausente, UNEVALUATED ou FAIL → NO_GO. Não há PARTIAL_GO.
 */
export function evaluatePromotionGate(
  input: Readonly<{
    candidate: string;
    requiredGateIds: readonly string[];
    gates: readonly GateEvaluationInput[];
  }>,
): PromotionDecision {
  const byId = new Map(input.gates.map((gate) => [gate.gateId, gate]));
  const missingGateIds = input.requiredGateIds.filter((id) => {
    const gate = byId.get(id);
    return gate === undefined || gate.result !== EvaluationResult.PASS;
  });
  return {
    candidate: input.candidate,
    gates: input.gates,
    missingGateIds,
    decision:
      missingGateIds.length === 0
        ? PromotionOutcome.GO
        : PromotionOutcome.NO_GO,
  };
}
