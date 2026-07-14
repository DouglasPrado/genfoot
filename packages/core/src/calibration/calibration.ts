import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { simulateMatch, stableHash } from "../matches/match-kernel.js";
import type { SimulationManifest } from "../matches/match-types.js";
import {
  BandMetric,
  EvaluationResult,
  GateEvidenceStatus,
  PromotionOutcome,
  type BandEvaluation,
  type BatchReport,
  type CalibrationBand,
  type CalibrationManifest,
  type EvidenceLedger,
  type EvidenceRecord,
  type GateEvaluationInput,
  type GateEvidenceEvaluation,
  type GateEvidenceInput,
  type MetricObservation,
  type MultiSeasonManifest,
  type MultiSeasonReport,
  type PromotionDecision,
  type PromotionGateDecision,
  type PromotionLog,
  type ScenarioRunResult,
} from "./calibration-types.js";

const VALID_METRICS = new Set<string>(Object.values(BandMetric));

/** Inteiro determinístico e não-negativo derivado de um rótulo estável. */
function hashInt(label: string): number {
  return Number.parseInt(stableHash(label).slice(0, 13), 16);
}

function evaluateBands(
  bands: readonly CalibrationBand[],
  metricValues: Partial<Record<BandMetric, number>>,
  fallbackOracle: string,
): BandEvaluation[] {
  return bands.map((band) => {
    const observed = metricValues[band.metric] ?? Number.NaN;
    const result =
      Number.isFinite(observed) && observed >= band.lo && observed <= band.hi
        ? EvaluationResult.PASS
        : EvaluationResult.FAIL;
    return {
      bandId: band.bandId,
      metric: band.metric,
      observed,
      lo: band.lo,
      hi: band.hi,
      result,
      oracleVersion: band.oracleVersion ?? fallbackOracle,
    };
  });
}

/** Valida a coerência estrutural do manifesto (compartilhado por batch e shard). */
function validateManifest(
  manifest: CalibrationManifest,
): DomainError | undefined {
  if (
    manifest.scenarios.length === 0 ||
    manifest.scenarios.length !== manifest.expectedRuns
  ) {
    return new DomainError(
      "MANIFEST_INVALID",
      "O manifesto exige cenários e expectedRuns coerentes.",
      {
        expectedRuns: manifest.expectedRuns,
        scenarios: manifest.scenarios.length,
      },
    );
  }
  if (
    !Number.isSafeInteger(manifest.timestepChances) ||
    manifest.timestepChances < 1
  ) {
    return new DomainError("MANIFEST_INVALID", "timestepChances inválido.");
  }
  const matchesPerScenario = manifest.matchesPerScenario ?? 1;
  if (!Number.isSafeInteger(matchesPerScenario) || matchesPerScenario < 1) {
    return new DomainError("MANIFEST_INVALID", "matchesPerScenario inválido.");
  }
  for (const band of manifest.bands) {
    if (!VALID_METRICS.has(band.metric) || band.lo > band.hi) {
      return new DomainError("MANIFEST_INVALID", "Banda inválida.", {
        bandId: band.bandId,
      });
    }
  }
  const seeds = new Set<string>();
  for (const scenario of manifest.scenarios) {
    if (seeds.has(scenario.seed)) {
      return new DomainError("RUN_DUPLICATE", "Seed duplicada no manifesto.", {
        seed: scenario.seed,
      });
    }
    seeds.add(scenario.seed);
  }
  return undefined;
}

/**
 * Executa UM cenário de forma determinística e pura: roda `matchesPerScenario`
 * partidas (R-34) pelo kernel com seeds derivadas e agrega o resultado. É a unidade
 * de trabalho de shard/resume — persistir cada ScenarioRunResult permite retomar sem
 * re-executar nem duplicar. Mesmo cenário + manifesto → mesmo resultHash.
 */
export function runCalibrationScenario(
  manifest: CalibrationManifest,
  scenario: CalibrationManifest["scenarios"][number],
): ScenarioRunResult {
  const matchesPerScenario = manifest.matchesPerScenario ?? 1;
  let scHome = 0;
  let scAway = 0;
  let homeWinCount = 0;
  const violations: string[] = [];
  const matchHashes: string[] = [];
  for (let index = 0; index < matchesPerScenario; index += 1) {
    const single = matchesPerScenario === 1;
    const matchId = single ? scenario.id : `${scenario.id}#${index}`;
    const inputHash = stableHash(
      [
        scenario.id,
        scenario.seed,
        scenario.homeStrength,
        scenario.awayStrength,
        manifest.rulesetVersion,
        manifest.timestepChances,
        ...(single ? [] : [index]),
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
    const kernel = simulateMatch(matchId, simManifest);
    const totalGoals = kernel.homeGoals + kernel.awayGoals;
    if (totalGoals > manifest.invariants.maxTotalGoalsPerMatch) {
      violations.push(
        `INV_MAX_GOALS:${matchId}:${totalGoals}>${manifest.invariants.maxTotalGoalsPerMatch}`,
      );
    }
    matchHashes.push(kernel.resultHash);
    scHome += kernel.homeGoals;
    scAway += kernel.awayGoals;
    if (kernel.homeGoals > kernel.awayGoals) homeWinCount += 1;
  }
  const resultHash =
    matchesPerScenario === 1
      ? matchHashes[0]!
      : stableHash(matchHashes.join("|"));
  return {
    scenarioId: scenario.id,
    seed: scenario.seed,
    resultHash,
    homeGoals: scHome,
    awayGoals: scAway,
    totalGoals: scHome + scAway,
    homeWin: scHome > scAway,
    violations,
    matchCount: matchesPerScenario,
    homeWinCount,
  };
}

/**
 * Agrega ScenarioRunResults num BatchReport: métricas sobre TODAS as partidas,
 * bandas/invariantes PASS/FAIL e gate conjuntivo. Fonte única usada tanto pelo batch
 * em memória quanto pelo `validation:report` sobre artefatos persistidos.
 */
export function aggregateBatchReport(
  manifest: CalibrationManifest,
  scenarioRuns: readonly ScenarioRunResult[],
): BatchReport {
  const matchesExecuted = scenarioRuns.reduce((s, r) => s + r.matchCount, 0);
  const totalGoalsSum = scenarioRuns.reduce((s, r) => s + r.totalGoals, 0);
  const homeGoalsSum = scenarioRuns.reduce((s, r) => s + r.homeGoals, 0);
  const homeWins = scenarioRuns.reduce((s, r) => s + r.homeWinCount, 0);
  const denom = matchesExecuted > 0 ? matchesExecuted : 1;
  const metricValues: Record<BandMetric, number> = {
    [BandMetric.AVG_TOTAL_GOALS]: totalGoalsSum / denom,
    [BandMetric.AVG_HOME_GOALS]: homeGoalsSum / denom,
    [BandMetric.HOME_WIN_RATE]: homeWins / denom,
    [BandMetric.COMPETITIVE_BALANCE]: Number.NaN,
    [BandMetric.AVG_CLUB_REVENUE_MINOR]: Number.NaN,
    [BandMetric.AVG_SQUAD_AGE]: Number.NaN,
  };
  const metrics: MetricObservation[] = [
    BandMetric.AVG_TOTAL_GOALS,
    BandMetric.AVG_HOME_GOALS,
    BandMetric.HOME_WIN_RATE,
  ].map((metricId) => ({ metricId, value: metricValues[metricId] }));

  const bandEvaluations = evaluateBands(
    manifest.bands,
    metricValues,
    manifest.rulesetVersion,
  );
  const invariantViolationCount = scenarioRuns.reduce(
    (sum, run) => sum + run.violations.length,
    0,
  );
  const gateResult =
    invariantViolationCount === 0 &&
    bandEvaluations.every((band) => band.result === EvaluationResult.PASS)
      ? EvaluationResult.PASS
      : EvaluationResult.FAIL;

  // Ordem canônica por scenarioId para que o reportHash independa da ordem de shard.
  const ordered = [...scenarioRuns].sort((a, b) =>
    a.scenarioId < b.scenarioId ? -1 : a.scenarioId > b.scenarioId ? 1 : 0,
  );
  const reportHash = stableHash(
    [
      manifest.manifestHash,
      manifest.rulesetVersion,
      `matches:${matchesExecuted}`,
      ...ordered.map((run) => `${run.scenarioId}:${run.resultHash}`),
      `gate:${gateResult}`,
    ].join("|"),
  );

  return {
    manifestHash: manifest.manifestHash,
    rulesetVersion: manifest.rulesetVersion,
    runsExpected: manifest.expectedRuns,
    runsExecuted: scenarioRuns.length,
    matchesExecuted,
    scenarioRuns: ordered,
    metrics,
    bandEvaluations,
    invariantViolationCount,
    gateResult,
    reportHash,
  };
}

/**
 * Executa um lote de calibração determinístico: cada cenário roda `matchesPerScenario`
 * partidas (R-34, ~10.000 por cenário aprovado) pelo kernel de partida, as métricas
 * agregam sobre TODAS as partidas e as bandas/invariantes viram PASS/FAIL. O gate é
 * conjuntivo — uma única violação reprova o lote, sem ser mascarada pela média. Mesmo
 * manifesto → mesmo reportHash.
 */
export function runCalibrationBatch(
  manifest: CalibrationManifest,
): Result<BatchReport, DomainError> {
  const invalid = validateManifest(manifest);
  if (invalid) return fail(invalid);
  const scenarioRuns = manifest.scenarios.map((scenario) =>
    runCalibrationScenario(manifest, scenario),
  );
  return succeed(aggregateBatchReport(manifest, scenarioRuns));
}

export { validateManifest as validateCalibrationManifest };

/**
 * Lote multi-temporada (R-88): simula N mundos por S temporadas em turno único
 * determinístico sobre o kernel de partida e agrega bandas de esporte (equilíbrio
 * competitivo), economia (receita em minor units inteiras) e demografia (idade média
 * de elenco) contra oráculos versionados. É puro/reproduzível: mesmo manifesto →
 * mesmo reportHash. Escreve somente métricas de validação; não altera estado simulado.
 */
export function runMultiSeasonBatch(
  manifest: MultiSeasonManifest,
): Result<MultiSeasonReport, DomainError> {
  if (manifest.worldSeeds.length === 0) {
    return fail(new DomainError("SEED_MISSING", "Sem sementes de mundo."));
  }
  if (!Number.isSafeInteger(manifest.seasons) || manifest.seasons < 1) {
    return fail(new DomainError("MANIFEST_INVALID", "seasons inválido."));
  }
  if (!Number.isSafeInteger(manifest.clubs) || manifest.clubs < 2) {
    return fail(new DomainError("MANIFEST_INVALID", "clubs inválido (≥2)."));
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
  const seen = new Set<string>();
  for (const seed of manifest.worldSeeds) {
    if (seen.has(seed)) {
      return fail(
        new DomainError("RUN_DUPLICATE", "Semente de mundo duplicada.", {
          seed,
        }),
      );
    }
    seen.add(seed);
  }

  const { economy, demography, invariants } = manifest;
  let matchesExecuted = 0;
  let revenueSumMinor = 0;
  let revenueSlots = 0;
  let balanceSum = 0;
  let balanceSamples = 0;
  let ageSum = 0;
  let ageSamples = 0;
  let invariantViolationCount = 0;
  const worldDigests: string[] = [];

  for (const worldSeed of manifest.worldSeeds) {
    // Força determinística por clube.
    const strengths = Array.from({ length: manifest.clubs }, (_, club) =>
      40 + (hashInt(`${worldSeed}:strength:${club}`) % 41),
    );
    // Elenco inicial: idades semeadas por mundo/clube/jogador.
    const squads = Array.from({ length: manifest.clubs }, (_, club) =>
      Array.from({ length: demography.squadSize }, (_, player) => {
        const span = Math.max(1, demography.retireAge - demography.startAge);
        return (
          demography.startAge +
          (hashInt(`${worldSeed}:age:${club}:${player}`) % span)
        );
      }),
    );

    let worldResultDigest = "";
    for (let season = 0; season < manifest.seasons; season += 1) {
      const points = new Array<number>(manifest.clubs).fill(0);
      for (let home = 0; home < manifest.clubs; home += 1) {
        for (let away = 0; away < manifest.clubs; away += 1) {
          if (home === away) continue;
          const matchId = `${worldSeed}:s${season}:${home}v${away}`;
          const inputHash = stableHash(
            [worldSeed, season, home, away, manifest.rulesetVersion].join("|"),
          );
          const simManifest: SimulationManifest = {
            seed: worldSeed,
            engineBuild: `calibration-ms:${manifest.rulesetVersion}`,
            timestepChances: manifest.timestepChances,
            homeStrength: strengths[home]!,
            awayStrength: strengths[away]!,
            inputHash,
          };
          const kernel = simulateMatch(matchId, simManifest);
          matchesExecuted += 1;
          const totalGoals = kernel.homeGoals + kernel.awayGoals;
          if (kernel.homeGoals > kernel.awayGoals) points[home]! += 3;
          else if (kernel.homeGoals < kernel.awayGoals) points[away]! += 3;
          else {
            points[home]! += 1;
            points[away]! += 1;
          }
          // Economia: bilheteria do mandante em minor units inteiras.
          const attendance =
            economy.baseAttendance + economy.attendancePerGoal * totalGoals;
          const revenue = economy.ticketPriceMinor * Math.max(0, attendance);
          if (revenue < 0) invariantViolationCount += 1;
          revenueSumMinor += revenue;
          revenueSlots += 1;
          worldResultDigest = stableHash(
            `${worldResultDigest}|${kernel.resultHash}`,
          );
        }
      }
      // Equilíbrio competitivo: dispersão normalizada dos pontos da temporada.
      const meanPoints =
        points.reduce((s, p) => s + p, 0) / manifest.clubs;
      const variance =
        points.reduce((s, p) => s + (p - meanPoints) ** 2, 0) / manifest.clubs;
      const spread = meanPoints > 0 ? Math.sqrt(variance) / meanPoints : 0;
      balanceSum += spread;
      balanceSamples += 1;
      // Demografia: envelhece o elenco e regenera aposentados.
      for (const squad of squads) {
        for (let player = 0; player < squad.length; player += 1) {
          const aged = squad[player]! + 1;
          squad[player] = aged >= demography.retireAge ? demography.regenAge : aged;
        }
      }
    }

    for (const squad of squads) {
      for (const age of squad) {
        ageSum += age;
        ageSamples += 1;
        if (age < invariants.minSquadAge || age > invariants.maxSquadAge) {
          invariantViolationCount += 1;
        }
      }
    }
    worldDigests.push(`${worldSeed}:${worldResultDigest}`);
  }

  const metricValues: Partial<Record<BandMetric, number>> = {
    [BandMetric.COMPETITIVE_BALANCE]:
      balanceSamples > 0 ? balanceSum / balanceSamples : 0,
    [BandMetric.AVG_CLUB_REVENUE_MINOR]:
      revenueSlots > 0 ? Math.round(revenueSumMinor / revenueSlots) : 0,
    [BandMetric.AVG_SQUAD_AGE]: ageSamples > 0 ? ageSum / ageSamples : 0,
  };
  const metrics: MetricObservation[] = (
    Object.keys(metricValues) as BandMetric[]
  ).map((metricId) => ({ metricId, value: metricValues[metricId]! }));

  const bandEvaluations = evaluateBands(
    manifest.bands,
    metricValues,
    manifest.rulesetVersion,
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
      `matches:${matchesExecuted}`,
      ...worldDigests,
      `gate:${gateResult}`,
    ].join("|"),
  );

  return succeed({
    manifestHash: manifest.manifestHash,
    rulesetVersion: manifest.rulesetVersion,
    worldsExecuted: manifest.worldSeeds.length,
    seasonsPerWorld: manifest.seasons,
    matchesExecuted,
    metrics,
    bandEvaluations,
    invariantViolationCount,
    gateResult,
    reportHash,
  });
}

/**
 * Anexa uma evidência ao ledger append-only (FR-010). Recalibrar (novo rulesetVersion
 * ou novo reportHash) cria um NOVO registro efetivo; os fatos anteriores são preservados
 * sem mutação. Reanexar exatamente o mesmo par (rulesetVersion, reportHash) é idempotente.
 */
export function appendEvidence(
  ledger: EvidenceLedger,
  input: Readonly<{ rulesetVersion: string; reportHash: string }>,
): EvidenceLedger {
  const already = ledger.records.find(
    (record) =>
      record.rulesetVersion === input.rulesetVersion &&
      record.reportHash === input.reportHash,
  );
  if (already) return ledger;
  const sequence = ledger.records.length;
  const record: EvidenceRecord = {
    evidenceRef: stableHash(
      `${input.rulesetVersion}|${input.reportHash}|${sequence}`,
    ),
    rulesetVersion: input.rulesetVersion,
    reportHash: input.reportHash,
    sequence,
  };
  return { records: [...ledger.records, record] };
}

/** Evidência efetiva mais recente para um rulesetVersion (ou undefined). */
export function latestEvidence(
  ledger: EvidenceLedger,
  rulesetVersion: string,
): EvidenceRecord | undefined {
  let latest: EvidenceRecord | undefined;
  for (const record of ledger.records) {
    if (record.rulesetVersion === rulesetVersion) latest = record;
  }
  return latest;
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
    reviewers?: readonly string[];
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
    reviewers: input.reviewers ?? [],
  };
}

/**
 * Promoção com verificação de evidência (FR-008/009): cada gate G1–G8 exige um
 * PASS cuja evidência exista no ledger e esteja atualizada para o rulesetVersion
 * corrente. Evidência ausente, obsoleta (rulesetVersion divergente) ou incompatível
 * (ref não encontrado) equivale a FAIL. Resultado conjuntivo GO/NO_GO, sem PARTIAL_GO.
 */
export function evaluatePromotionGateWithEvidence(
  input: Readonly<{
    candidate: string;
    currentRulesetVersion: string;
    requiredGateIds: readonly string[];
    gates: readonly GateEvidenceInput[];
    ledger: EvidenceLedger;
    reviewers?: readonly string[];
    sequence?: number;
  }>,
): PromotionGateDecision {
  const byId = new Map(input.gates.map((gate) => [gate.gateId, gate]));
  const refs = new Set(input.ledger.records.map((record) => record.evidenceRef));
  const gates: GateEvidenceEvaluation[] = input.requiredGateIds.map((gateId) => {
    const gate = byId.get(gateId);
    if (gate === undefined) {
      return { gateId, status: GateEvidenceStatus.EVIDENCE_MISSING, evidenceRef: "" };
    }
    if (gate.result === "UNEVALUATED") {
      return {
        gateId,
        status: GateEvidenceStatus.UNEVALUATED,
        evidenceRef: gate.evidenceRef,
      };
    }
    if (gate.result === EvaluationResult.FAIL) {
      return {
        gateId,
        status: GateEvidenceStatus.FAIL,
        evidenceRef: gate.evidenceRef,
      };
    }
    if (!refs.has(gate.evidenceRef)) {
      return {
        gateId,
        status: GateEvidenceStatus.EVIDENCE_MISSING,
        evidenceRef: gate.evidenceRef,
      };
    }
    if (gate.evidenceRulesetVersion !== input.currentRulesetVersion) {
      return {
        gateId,
        status: GateEvidenceStatus.EVIDENCE_STALE,
        evidenceRef: gate.evidenceRef,
      };
    }
    return {
      gateId,
      status: GateEvidenceStatus.PASS,
      evidenceRef: gate.evidenceRef,
    };
  });
  const blockingGateIds = gates
    .filter((gate) => gate.status !== GateEvidenceStatus.PASS)
    .map((gate) => gate.gateId);
  return {
    candidate: input.candidate,
    currentRulesetVersion: input.currentRulesetVersion,
    gates,
    blockingGateIds,
    decision:
      blockingGateIds.length === 0
        ? PromotionOutcome.GO
        : PromotionOutcome.NO_GO,
    reviewers: input.reviewers ?? [],
    sequence: input.sequence ?? 0,
  };
}

/** Anexa uma decisão de promoção ao log append-only (data-model: append-only). */
export function recordPromotion(
  log: PromotionLog,
  decision: Omit<PromotionGateDecision, "sequence">,
): PromotionLog {
  const sequence = log.decisions.length;
  return {
    decisions: [...log.decisions, { ...decision, sequence }],
  };
}
