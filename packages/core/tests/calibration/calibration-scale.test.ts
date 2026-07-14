import { describe, expect, it } from "vitest";

import {
  runCalibrationBatch,
  type CalibrationManifest,
} from "../../src/index.js";

/**
 * R-34 (FR-002): cada cenário aprovado cobre ~10.000 partidas. Este teste prova que
 * o harness escala a esse volume de forma determinística e reproduzível, e que as
 * métricas agregam sobre TODAS as partidas (não sobre os cenários). Mantém-se dentro
 * de poucos milhares de ms — o kernel é puro e sem I/O.
 */
describe("R-34 scale (~10k matches/scenario)", () => {
  const MATCHES = 10_000;
  const manifest = (): CalibrationManifest => ({
    manifestHash: "scale-1",
    rulesetVersion: "1.0.0",
    timestepChances: 30,
    expectedRuns: 2,
    scenarios: [
      { id: "a", seed: "scale-a", homeStrength: 62, awayStrength: 55 },
      { id: "b", seed: "scale-b", homeStrength: 58, awayStrength: 58 },
    ],
    bands: [
      { bandId: "BS-goals", metric: "avgTotalGoals", lo: 0, hi: 10 },
      { bandId: "BS-home", metric: "homeWinRate", lo: 0, hi: 1 },
    ],
    invariants: { maxTotalGoalsPerMatch: 30 },
    matchesPerScenario: MATCHES,
  });

  it("executa 20.000 partidas determinísticas e reproduz o reportHash", () => {
    const first = runCalibrationBatch(manifest());
    const second = runCalibrationBatch(manifest());
    if (!first.ok || !second.ok) throw new Error("falhou");

    expect(first.value.matchesExecuted).toBe(2 * MATCHES);
    expect(first.value.scenarioRuns.every((r) => r.matchCount === MATCHES)).toBe(
      true,
    );
    // homeWinRate agregado sobre 20k partidas fica bem definido em (0,1)
    const rate = first.value.metrics.find((m) => m.metricId === "homeWinRate");
    expect(rate?.value).toBeGreaterThan(0);
    expect(rate?.value).toBeLessThan(1);
    // reprodutibilidade bit-a-bit (FR-007/SC-003)
    expect(first.value.reportHash).toBe(second.value.reportHash);
    expect(first.value.gateResult).toBe("PASS");
  });
});
