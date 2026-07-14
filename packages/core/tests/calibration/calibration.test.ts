import { describe, expect, it } from "vitest";

import {
  evaluatePromotionGate,
  runCalibrationBatch,
  type CalibrationBand,
  type CalibrationManifest,
} from "../../src/index.js";

const SCENARIOS = [
  { id: "s1", seed: "calib-1", homeStrength: 70, awayStrength: 50 },
  { id: "s2", seed: "calib-2", homeStrength: 60, awayStrength: 60 },
  { id: "s3", seed: "calib-3", homeStrength: 55, awayStrength: 65 },
  { id: "s4", seed: "calib-4", homeStrength: 80, awayStrength: 40 },
  { id: "s5", seed: "calib-5", homeStrength: 50, awayStrength: 50 },
  { id: "s6", seed: "calib-6", homeStrength: 65, awayStrength: 58 },
];

function manifest(
  bands: readonly CalibrationBand[],
  maxTotalGoalsPerMatch = 20,
): CalibrationManifest {
  return {
    manifestHash: "manifest-1",
    rulesetVersion: "1.0.0",
    timestepChances: 30,
    expectedRuns: SCENARIOS.length,
    scenarios: SCENARIOS,
    bands,
    invariants: { maxTotalGoalsPerMatch },
  };
}

const WIDE_BANDS: CalibrationBand[] = [
  { bandId: "BS-goals", metric: "avgTotalGoals", lo: 0, hi: 100 },
  { bandId: "BS-home", metric: "homeWinRate", lo: 0, hi: 1 },
];

describe("Simulation calibration harness", () => {
  it("produz relatório reproduzível (mesmo manifesto → mesmo reportHash)", () => {
    const first = runCalibrationBatch(manifest(WIDE_BANDS));
    const second = runCalibrationBatch(manifest(WIDE_BANDS));
    if (!first.ok || !second.ok) throw new Error("falhou");

    expect(first.value.runsExecuted).toBe(6);
    expect(first.value.reportHash).toBe(second.value.reportHash);
    expect(first.value.scenarioRuns.map((r) => r.resultHash)).toEqual(
      second.value.scenarioRuns.map((r) => r.resultHash),
    );
    expect(first.value.gateResult).toBe("PASS");
  });

  it("reprova o gate quando uma banda ratificada fica fora do intervalo", () => {
    const bands: CalibrationBand[] = [
      { bandId: "BS-goals", metric: "avgTotalGoals", lo: 50, hi: 60 },
      { bandId: "BS-home", metric: "homeWinRate", lo: 0, hi: 1 },
    ];
    const report = runCalibrationBatch(manifest(bands));
    if (!report.ok) throw report.error;
    expect(report.value.gateResult).toBe("FAIL");
    const failed = report.value.bandEvaluations.find(
      (b) => b.result === "FAIL",
    );
    expect(failed?.bandId).toBe("BS-goals");
  });

  it("reprova o gate por violação em qualquer seed, sem mascarar pela média", () => {
    const report = runCalibrationBatch(manifest(WIDE_BANDS, 0));
    if (!report.ok) throw report.error;
    // bandas largas passam, mas há violação de invariante -> gate FAIL
    expect(report.value.bandEvaluations.every((b) => b.result === "PASS")).toBe(
      true,
    );
    expect(report.value.invariantViolationCount).toBeGreaterThan(0);
    expect(report.value.gateResult).toBe("FAIL");
  });

  it("rejeita manifesto incoerente e seeds duplicadas", () => {
    expect(
      runCalibrationBatch({ ...manifest(WIDE_BANDS), expectedRuns: 99 }),
    ).toMatchObject({ ok: false, error: { code: "MANIFEST_INVALID" } });

    expect(
      runCalibrationBatch({
        manifestHash: "m",
        rulesetVersion: "1.0.0",
        timestepChances: 30,
        expectedRuns: 2,
        scenarios: [
          { id: "a", seed: "dup", homeStrength: 50, awayStrength: 50 },
          { id: "b", seed: "dup", homeStrength: 50, awayStrength: 50 },
        ],
        bands: WIDE_BANDS,
        invariants: { maxTotalGoalsPerMatch: 20 },
      }),
    ).toMatchObject({ ok: false, error: { code: "RUN_DUPLICATE" } });
  });

  it("escala R-34: agrega métricas sobre N partidas por cenário e permanece reproduzível", () => {
    const scaled = (): CalibrationManifest => ({
      ...manifest(WIDE_BANDS),
      matchesPerScenario: 200,
    });
    const first = runCalibrationBatch(scaled());
    const second = runCalibrationBatch(scaled());
    if (!first.ok || !second.ok) throw new Error("falhou");

    expect(first.value.runsExecuted).toBe(6);
    expect(first.value.matchesExecuted).toBe(6 * 200);
    expect(first.value.scenarioRuns.every((r) => r.matchCount === 200)).toBe(
      true,
    );
    // média sobre todas as partidas, não sobre os 6 cenários
    const goals = first.value.metrics.find(
      (m) => m.metricId === "avgTotalGoals",
    );
    expect(goals?.value).toBeGreaterThan(0);
    expect(first.value.reportHash).toBe(second.value.reportHash);
    expect(first.value.gateResult).toBe("PASS");
  });

  it("escala R-34 rejeita matchesPerScenario inválido", () => {
    expect(
      runCalibrationBatch({ ...manifest(WIDE_BANDS), matchesPerScenario: 0 }),
    ).toMatchObject({ ok: false, error: { code: "MANIFEST_INVALID" } });
  });

  it("banda carrega oracleVersion versionado (FR-006)", () => {
    const bands: CalibrationBand[] = [
      {
        bandId: "BS-goals",
        metric: "avgTotalGoals",
        lo: 0,
        hi: 100,
        oracleVersion: "oracle-2026.1",
      },
    ];
    const report = runCalibrationBatch(manifest(bands));
    if (!report.ok) throw report.error;
    expect(report.value.bandEvaluations[0]?.oracleVersion).toBe("oracle-2026.1");
  });

  it("promove somente com todos os gates PASS (decisão conjuntiva)", () => {
    const required = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"];
    const allPass = required.map((gateId) => ({
      gateId,
      result: "PASS" as const,
    }));
    expect(
      evaluatePromotionGate({
        candidate: "v1",
        requiredGateIds: required,
        gates: allPass,
      }).decision,
    ).toBe("GO");

    const oneFail = allPass.map((g, i) =>
      i === 3 ? { ...g, result: "FAIL" as const } : g,
    );
    const noGo = evaluatePromotionGate({
      candidate: "v1",
      requiredGateIds: required,
      gates: oneFail,
    });
    expect(noGo.decision).toBe("NO_GO");
    expect(noGo.missingGateIds).toContain("G4");

    const missing = evaluatePromotionGate({
      candidate: "v1",
      requiredGateIds: required,
      gates: allPass.slice(0, 7),
    });
    expect(missing.decision).toBe("NO_GO");
    expect(missing.missingGateIds).toContain("G8");
  });
});
