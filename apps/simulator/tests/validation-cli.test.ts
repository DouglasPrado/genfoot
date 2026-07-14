import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runCli, type CliIo } from "../src/cli.js";

const directories: string[] = [];

afterEach(async () => {
  while (directories.length > 0) {
    const directory = directories.pop();
    if (directory) await rm(directory, { recursive: true, force: true });
  }
});

function capture(): Readonly<{ io: CliIo; stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
    },
  };
}

function lastData(lines: string[]): Record<string, unknown> {
  const parsed = JSON.parse(lines.join("")) as { data: Record<string, unknown> };
  return parsed.data;
}

const SCENARIOS = Array.from({ length: 8 }, (_, i) => ({
  id: `s${i}`,
  seed: `calib-${i}`,
  homeStrength: 60 + i,
  awayStrength: 55,
}));

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    manifestHash: "batch-smoke",
    rulesetVersion: "1.0.0",
    timestepChances: 30,
    expectedRuns: SCENARIOS.length,
    scenarios: SCENARIOS,
    bands: [
      { bandId: "BS-goals", metric: "avgTotalGoals", lo: 0, hi: 100 },
      { bandId: "BS-home", metric: "homeWinRate", lo: 0, hi: 1 },
    ],
    invariants: { maxTotalGoalsPerMatch: 30 },
    matchesPerScenario: 40,
    ...overrides,
  };
}

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "grinta-val-"));
  directories.push(directory);
  const validation = join(directory, "validation");
  const manifestPath = join(directory, "manifest.json");
  return { directory, validation, manifestPath };
}

describe("validation CLI (VAL-001)", () => {
  it("roda o manifesto, agrega relatório reproduzível e faz replay 100% igual", async () => {
    const { validation, manifestPath } = await setup();
    await writeFile(manifestPath, JSON.stringify(manifest()), "utf8");

    const runOut = capture();
    const runCode = await runCli(["validation:run", "--manifest", manifestPath], {
      validationDirectory: validation,
      io: runOut.io,
    });
    expect(runCode).toBe(0);
    const run = lastData(runOut.stdout);
    expect(run.batchId).toBe("batch-smoke");
    expect(run.scenariosExecuted).toBe(8);

    const reportOut = capture();
    const reportCode = await runCli(
      ["validation:report", "--batch-id", "batch-smoke"],
      { validationDirectory: validation, io: reportOut.io },
    );
    expect(reportCode).toBe(0);
    const report = lastData(reportOut.stdout);
    expect(report.runsExecuted).toBe(8);
    expect(report.matchesExecuted).toBe(8 * 40);
    expect(report.gateResult).toBe("PASS");
    const firstHash = report.reportHash;

    // relatório é reproduzível por comando (FR-012)
    const reportOut2 = capture();
    await runCli(["validation:report", "--batch-id", "batch-smoke"], {
      validationDirectory: validation,
      io: reportOut2.io,
    });
    expect(lastData(reportOut2.stdout).reportHash).toBe(firstHash);

    const replayOut = capture();
    const replayCode = await runCli(
      ["validation:replay", "--batch-id", "batch-smoke", "--scenario", "s3"],
      { validationDirectory: validation, io: replayOut.io },
    );
    expect(replayCode).toBe(0);
    expect(lastData(replayOut.stdout).reproduced).toBe(true);
  });

  it("shard/resume cobre exatamente o seed set, sem duplicar nem omitir", async () => {
    const { validation, manifestPath } = await setup();
    await writeFile(manifestPath, JSON.stringify(manifest()), "utf8");

    // 3 shards disjuntos
    let totalExecuted = 0;
    for (let index = 0; index < 3; index += 1) {
      const out = capture();
      await runCli(
        ["validation:run", "--manifest", manifestPath, "--shard", `${index}/3`],
        { validationDirectory: validation, io: out.io },
      );
      totalExecuted += Number(lastData(out.stdout).scenariosExecuted);
    }
    expect(totalExecuted).toBe(8); // cobertura exata, sem sobreposição

    // resume: re-rodar um shard não re-executa nada
    const resumeOut = capture();
    await runCli(
      ["validation:run", "--manifest", manifestPath, "--shard", "0/3", "--resume"],
      { validationDirectory: validation, io: resumeOut.io },
    );
    expect(Number(lastData(resumeOut.stdout).scenariosExecuted)).toBe(0);
    expect(Number(lastData(resumeOut.stdout).scenariosSkipped)).toBeGreaterThan(0);

    // relatório agrega os 8 cenários vindos dos shards
    const reportOut = capture();
    await runCli(["validation:report", "--batch-id", "batch-smoke"], {
      validationDirectory: validation,
      io: reportOut.io,
    });
    expect(lastData(reportOut.stdout).runsExecuted).toBe(8);
  });

  it("relatório com run ausente falha (GATE_INCOMPLETE)", async () => {
    const { validation, manifestPath } = await setup();
    await writeFile(manifestPath, JSON.stringify(manifest()), "utf8");

    // roda apenas 1 dos 3 shards
    const runOut = capture();
    await runCli(
      ["validation:run", "--manifest", manifestPath, "--shard", "0/3"],
      { validationDirectory: validation, io: runOut.io },
    );

    const reportOut = capture();
    const code = await runCli(
      ["validation:report", "--batch-id", "batch-smoke"],
      { validationDirectory: validation, io: reportOut.io },
    );
    expect(code).toBe(2);
    const error = JSON.parse(reportOut.stderr.join("")) as {
      error: { code: string };
    };
    expect(error.error.code).toBe("GATE_INCOMPLETE");
  });

  it("gate conjuntivo: GO com evidência fresca, NO_GO com evidência obsoleta", async () => {
    const { directory, validation, manifestPath } = await setup();
    await writeFile(manifestPath, JSON.stringify(manifest()), "utf8");

    await runCli(["validation:run", "--manifest", manifestPath], {
      validationDirectory: validation,
      io: capture().io,
    });
    await runCli(["validation:report", "--batch-id", "batch-smoke"], {
      validationDirectory: validation,
      io: capture().io,
    });

    // lê o evidenceRef efetivo produzido pelo report
    const ledger = JSON.parse(
      await readFile(join(validation, "evidence.json"), "utf8"),
    ) as { records: { evidenceRef: string; rulesetVersion: string }[] };
    const evidenceRef = ledger.records[0]!.evidenceRef;
    const required = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"];

    const freshGateFile = join(directory, "gate-fresh.json");
    await writeFile(
      freshGateFile,
      JSON.stringify({
        candidate: "v1",
        currentRulesetVersion: "1.0.0",
        requiredGateIds: required,
        reviewers: ["alice", "bob"],
        gates: required.map((gateId) => ({
          gateId,
          result: "PASS",
          evidenceRef,
          evidenceRulesetVersion: "1.0.0",
        })),
      }),
      "utf8",
    );
    const goOut = capture();
    const goCode = await runCli(
      ["validation:gate", "--candidate", "v1", "--gate-file", freshGateFile],
      { validationDirectory: validation, io: goOut.io },
    );
    expect(goCode).toBe(0);
    expect(lastData(goOut.stdout).decision).toBe("GO");

    // evidência obsoleta: ruleset divergente → NO_GO
    const staleGateFile = join(directory, "gate-stale.json");
    await writeFile(
      staleGateFile,
      JSON.stringify({
        candidate: "v2",
        currentRulesetVersion: "2.0.0",
        requiredGateIds: required,
        gates: required.map((gateId) => ({
          gateId,
          result: "PASS",
          evidenceRef,
          evidenceRulesetVersion: "1.0.0",
        })),
      }),
      "utf8",
    );
    const noGoOut = capture();
    await runCli(
      ["validation:gate", "--candidate", "v2", "--gate-file", staleGateFile],
      { validationDirectory: validation, io: noGoOut.io },
    );
    const noGo = lastData(noGoOut.stdout);
    expect(noGo.decision).toBe("NO_GO");
    expect((noGo.gates as { status: string }[]).every((g) => g.status === "EVIDENCE_STALE")).toBe(true);

    // log de promoção é append-only (2 decisões)
    const log = JSON.parse(
      await readFile(join(validation, "promotion-log.json"), "utf8"),
    ) as { decisions: unknown[] };
    expect(log.decisions).toHaveLength(2);
  });

  it("rejeita manifesto ilegível/incoerente (MANIFEST_INVALID)", async () => {
    const { validation, manifestPath } = await setup();
    await writeFile(
      manifestPath,
      JSON.stringify(manifest({ expectedRuns: 99 })),
      "utf8",
    );
    const out = capture();
    const code = await runCli(
      ["validation:run", "--manifest", manifestPath],
      { validationDirectory: validation, io: out.io },
    );
    expect(code).toBe(2);
    expect(
      (JSON.parse(out.stderr.join("")) as { error: { code: string } }).error.code,
    ).toBe("MANIFEST_INVALID");
  });
});
