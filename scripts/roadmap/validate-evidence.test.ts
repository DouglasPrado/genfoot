import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const validator = resolve(root, "scripts/roadmap/validate-evidence.mjs");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("integridade de evidências", () => {
  it("aceita observation completa e reproduzível", () => {
    const fixture = createFixture("valid");
    const result = run(fixture);
    expect(result.status, result.output).toBe(0);
    expect(result.output).toMatch(/1 slots?.*PASS/i);
  });

  it("rejeita artefato ausente em alegação PASS", () => {
    const fixture = createFixture("missing-file", {
      location: "missing/report.txt",
    });
    const result = run(fixture);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/MISSING.*missing\/report\.txt/i);
  });

  it("rejeita PASS sem observation válida", () => {
    const fixture = createFixture("invalid-pass", {}, { observation: null });
    const result = run(fixture);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/PASS.*observation|observation.*ausente/i);
  });

  it("rejeita simulação sem ruleset e seeds", () => {
    const fixture = createFixture("missing-ruleset-seeds", {
      rulesetVersion: undefined,
      seedSet: undefined,
      criterionRefs: ["BS-01"],
    });
    const result = run(fixture);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(
      /rulesetVersion.*seedSet|seedSet.*rulesetVersion/i,
    );
  });

  it("rejeita referência canônica stale", () => {
    const fixture = createFixture(
      "stale-source",
      {},
      {
        source: {
          document: "docs/01-game-design/15-fluxos-completos.md",
          heading: "Cabeçalho removido e inexistente",
        },
      },
    );
    const result = run(fixture);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/STALE_SOURCE.*Cabeçalho removido/i);
  });
});

function createFixture(
  name: string,
  observationOverrides: Record<string, unknown> = {},
  options: Readonly<{
    observation?: Record<string, unknown> | null;
    source?: { document: string; heading: string };
  }> = {},
): string {
  const directory = mkdtempSync(join(tmpdir(), `grinta-evidence-${name}-`));
  temporaryDirectories.push(directory);
  const artifact = join(directory, "artifact.txt");
  writeFileSync(artifact, "evidence\n", "utf8");
  const source = join(directory, "source.md");
  writeFileSync(source, "# Existing heading\n", "utf8");
  const index = join(directory, "index.yaml");
  writeFileSync(
    index,
    "features:\n  - id: FND-001\n    slug: foundation\n    status: DELIVERED\n    milestone: M0\n    childDirectory: specs/002-domain-kernel-simulator\n",
    "utf8",
  );

  const baseObservation: Record<string, unknown> = {
    evidenceId: "EVD-FND-001-TEST-001",
    result: "PASS",
    location: artifact,
    artifactHash: `sha256:${createHash("sha256").update("evidence\n").digest("hex")}`,
    observedAt: "2026-07-13T12:00:00Z",
    commitSha: "9d639f209faf27a47bde4ec8fdf19032c65b68be",
    criterionRefs: ["SC-004"],
    command: "pnpm test",
    toolchain: "node@22 + pnpm@10",
    environment: "test fixture",
    startedAt: "2026-07-13T11:59:00Z",
    finishedAt: "2026-07-13T12:00:00Z",
    owner: "FND-001",
    inputs: [index],
    outputs: [artifact],
  };
  for (const [key, value] of Object.entries(observationOverrides)) {
    if (value === undefined) delete baseObservation[key];
    else baseObservation[key] = value;
  }
  const observation =
    options.observation === null
      ? null
      : { ...baseObservation, ...options.observation };
  const registry = {
    version: "1.0.0",
    candidateCommit: "9d639f209faf27a47bde4ec8fdf19032c65b68be",
    features: [
      {
        featureId: "FND-001",
        milestoneId: "M0",
        status: "DELIVERED",
        sourceRefs: [
          options.source ?? { document: source, heading: "Existing heading" },
        ],
        slots: [
          {
            slotId: "FND-001-TEST-FOUNDATION",
            type: "TEST",
            blocking: true,
            effectiveResult: "PASS",
            observation,
          },
        ],
      },
    ],
  };
  const registryPath = join(directory, "registry.yaml");
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  return registryPath;
}

function run(registry: string): { status: number | null; output: string } {
  const result = spawnSync(
    process.execPath,
    [validator, "--registry", registry, "--root", root],
    { cwd: root, encoding: "utf8" },
  );
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}
