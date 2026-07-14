import { describe, expect, it } from "vitest";

import {
  appendEvidence,
  evaluatePromotionGateWithEvidence,
  latestEvidence,
  recordPromotion,
  runMultiSeasonBatch,
  type CalibrationBand,
  type EvidenceLedger,
  type GateEvidenceInput,
  type MultiSeasonManifest,
  type PromotionLog,
} from "../../src/index.js";

const WORLD_SEEDS = Array.from({ length: 12 }, (_, i) => `world-${i}`);

const WIDE_BANDS: CalibrationBand[] = [
  { bandId: "BS-balance", metric: "competitiveBalance", lo: 0, hi: 100 },
  { bandId: "BE-revenue", metric: "avgClubRevenueMinor", lo: 0, hi: 100_000_000 },
  { bandId: "BD-age", metric: "avgSquadAge", lo: 0, hi: 100 },
];

function manifest(
  overrides: Partial<MultiSeasonManifest> = {},
): MultiSeasonManifest {
  return {
    manifestHash: "ms-manifest-1",
    rulesetVersion: "1.0.0",
    timestepChances: 30,
    worldSeeds: WORLD_SEEDS,
    seasons: 10,
    clubs: 6,
    bands: WIDE_BANDS,
    economy: {
      ticketPriceMinor: 5_000,
      baseAttendance: 1_000,
      attendancePerGoal: 50,
    },
    demography: { squadSize: 20, startAge: 18, retireAge: 34, regenAge: 17 },
    invariants: { minSquadAge: 15, maxSquadAge: 40 },
    ...overrides,
  };
}

describe("Multi-season calibration (R-88)", () => {
  it("produz bandas de economia/demografia reproduzíveis (mesmo manifesto → mesmo reportHash)", () => {
    const first = runMultiSeasonBatch(manifest());
    const second = runMultiSeasonBatch(manifest());
    if (!first.ok || !second.ok) throw new Error("falhou");

    expect(first.value.worldsExecuted).toBe(12);
    expect(first.value.seasonsPerWorld).toBe(10);
    // 12 mundos × 10 temporadas × (6×5) partidas do turno único = 3600
    expect(first.value.matchesExecuted).toBe(12 * 10 * 6 * 5);
    expect(first.value.reportHash).toBe(second.value.reportHash);

    const be = first.value.metrics.find(
      (m) => m.metricId === "avgClubRevenueMinor",
    );
    const bd = first.value.metrics.find((m) => m.metricId === "avgSquadAge");
    expect(be?.value).toBeGreaterThan(0);
    expect(Number.isInteger(be?.value)).toBe(true); // minor units inteiras
    expect(bd?.value).toBeGreaterThan(0);
    expect(first.value.gateResult).toBe("PASS");
  });

  it("reprova o gate quando a banda de economia fica fora do oráculo", () => {
    const report = runMultiSeasonBatch(
      manifest({
        bands: [
          { bandId: "BE-revenue", metric: "avgClubRevenueMinor", lo: 1, hi: 2 },
        ],
      }),
    );
    if (!report.ok) throw report.error;
    expect(report.value.gateResult).toBe("FAIL");
    expect(report.value.bandEvaluations[0]?.result).toBe("FAIL");
  });

  it("reprova por violação de invariante demográfica sem mascarar pela média", () => {
    const report = runMultiSeasonBatch(
      manifest({ invariants: { minSquadAge: 30, maxSquadAge: 31 } }),
    );
    if (!report.ok) throw report.error;
    expect(report.value.invariantViolationCount).toBeGreaterThan(0);
    expect(report.value.gateResult).toBe("FAIL");
  });

  it("rejeita manifesto sem sementes e sementes duplicadas", () => {
    expect(runMultiSeasonBatch(manifest({ worldSeeds: [] }))).toMatchObject({
      ok: false,
      error: { code: "SEED_MISSING" },
    });
    expect(
      runMultiSeasonBatch(manifest({ worldSeeds: ["dup", "dup"] })),
    ).toMatchObject({ ok: false, error: { code: "RUN_DUPLICATE" } });
  });
});

describe("Evidence append-only per rulesetVersion (T013/FR-010)", () => {
  it("recalibrar cria nova evidência efetiva e preserva as anteriores (prefixo imutável)", () => {
    let ledger: EvidenceLedger = { records: [] };
    ledger = appendEvidence(ledger, {
      rulesetVersion: "1.0.0",
      reportHash: "hash-a",
    });
    const afterFirst = ledger.records;
    // recalibração: novo ruleset
    ledger = appendEvidence(ledger, {
      rulesetVersion: "1.1.0",
      reportHash: "hash-b",
    });
    // histórico anterior é prefixo imutável do novo
    expect(ledger.records.slice(0, 1)).toEqual(afterFirst);
    expect(ledger.records).toHaveLength(2);
    expect(latestEvidence(ledger, "1.0.0")?.reportHash).toBe("hash-a");
    expect(latestEvidence(ledger, "1.1.0")?.reportHash).toBe("hash-b");
  });

  it("reanexar o mesmo par (ruleset, reportHash) é idempotente", () => {
    let ledger: EvidenceLedger = { records: [] };
    ledger = appendEvidence(ledger, {
      rulesetVersion: "1.0.0",
      reportHash: "hash-a",
    });
    ledger = appendEvidence(ledger, {
      rulesetVersion: "1.0.0",
      reportHash: "hash-a",
    });
    expect(ledger.records).toHaveLength(1);
  });
});

describe("Promotion gate with evidence staleness (T015/FR-008)", () => {
  const required = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"];

  function passingGates(
    ledger: EvidenceLedger,
    ruleset: string,
  ): GateEvidenceInput[] {
    return required.map((gateId) => {
      const ref = ledger.records.find((r) => r.reportHash === `report-${gateId}`);
      return {
        gateId,
        result: "PASS" as const,
        evidenceRef: ref?.evidenceRef ?? "",
        evidenceRulesetVersion: ruleset,
      };
    });
  }

  function ledgerFor(ruleset: string): EvidenceLedger {
    let ledger: EvidenceLedger = { records: [] };
    for (const gateId of required) {
      ledger = appendEvidence(ledger, {
        rulesetVersion: ruleset,
        reportHash: `report-${gateId}`,
      });
    }
    return ledger;
  }

  it("promove GO com todos os gates PASS e evidência fresca", () => {
    const ledger = ledgerFor("2.0.0");
    const decision = evaluatePromotionGateWithEvidence({
      candidate: "v2",
      currentRulesetVersion: "2.0.0",
      requiredGateIds: required,
      gates: passingGates(ledger, "2.0.0"),
      ledger,
      reviewers: ["alice", "bob"],
    });
    expect(decision.decision).toBe("GO");
    expect(decision.reviewers).toEqual(["alice", "bob"]);
    expect(decision.gates.every((g) => g.status === "PASS")).toBe(true);
  });

  it("evidência obsoleta (ruleset divergente) equivale a FAIL → NO_GO", () => {
    const ledger = ledgerFor("2.0.0");
    const gates = passingGates(ledger, "1.0.0"); // evidência de ruleset antigo
    const decision = evaluatePromotionGateWithEvidence({
      candidate: "v2",
      currentRulesetVersion: "2.0.0",
      requiredGateIds: required,
      gates,
      ledger,
    });
    expect(decision.decision).toBe("NO_GO");
    expect(decision.gates.every((g) => g.status === "EVIDENCE_STALE")).toBe(true);
    expect(decision.blockingGateIds).toEqual(required);
  });

  it("evidência ausente do ledger equivale a FAIL → NO_GO", () => {
    const ledger = ledgerFor("2.0.0");
    const gates = passingGates(ledger, "2.0.0").map((g, i) =>
      i === 2 ? { ...g, evidenceRef: "inexistente" } : g,
    );
    const decision = evaluatePromotionGateWithEvidence({
      candidate: "v2",
      currentRulesetVersion: "2.0.0",
      requiredGateIds: required,
      gates,
      ledger,
    });
    expect(decision.decision).toBe("NO_GO");
    expect(decision.blockingGateIds).toContain("G3");
    expect(decision.gates[2]?.status).toBe("EVIDENCE_MISSING");
  });

  it("registra decisões no log append-only com reviewers", () => {
    const ledger = ledgerFor("2.0.0");
    let log: PromotionLog = { decisions: [] };
    const first = evaluatePromotionGateWithEvidence({
      candidate: "v2",
      currentRulesetVersion: "2.0.0",
      requiredGateIds: required,
      gates: passingGates(ledger, "2.0.0"),
      ledger,
      reviewers: ["alice"],
    });
    log = recordPromotion(log, first);
    log = recordPromotion(log, { ...first, candidate: "v3" });
    expect(log.decisions).toHaveLength(2);
    expect(log.decisions.map((d) => d.sequence)).toEqual([0, 1]);
    expect(log.decisions[0]?.reviewers).toEqual(["alice"]);
  });
});
