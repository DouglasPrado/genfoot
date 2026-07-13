import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const contractsDirectory = resolve(
  repositoryRoot,
  "specs/001-game-delivery-roadmap/contracts",
);
const indexPath = resolve(contractsDirectory, "feature-index.yaml");
const schemaPath = resolve(contractsDirectory, "feature-index.schema.json");
const sourceMapPath = resolve(contractsDirectory, "source-map.md");

const featureIndexValidator = resolve(
  repositoryRoot,
  "scripts/roadmap/validate-feature-index.mjs",
);
const coverageValidator = resolve(
  repositoryRoot,
  "scripts/roadmap/validate-coverage.mjs",
);
const dependencyValidator = resolve(
  repositoryRoot,
  "scripts/roadmap/validate-dependency-graph.mjs",
);

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("contrato do roadmap de features", () => {
  it("aceita o índice canônico compatível com o schema", () => {
    const result = runValidator(featureIndexValidator, [
      "--index",
      indexPath,
      "--schema",
      schemaPath,
    ]);

    expect(result, diagnostic(result)).toMatchObject({ status: 0 });
    expect(result.output).toMatch(/34 features? válidas?/i);
  });

  it("rejeita valor incompatível com o schema", () => {
    const invalidIndex = writeFixture(
      "invalid-schema.yaml",
      readFileSync(indexPath, "utf8").replace(
        "status: DELIVERED",
        "status: UNKNOWN",
      ),
    );
    const result = runValidator(featureIndexValidator, [
      "--index",
      invalidIndex,
      "--schema",
      schemaPath,
    ]);

    expect(result.status, diagnostic(result)).toBe(1);
    expect(result.output).toMatch(/schema|status.*UNKNOWN/i);
    expect(result.output).not.toMatch(/MODULE_NOT_FOUND|Cannot find module/i);
  });

  it("rejeita IDs duplicados com diagnóstico acionável", () => {
    const duplicateIndex = writeFixture(
      "duplicate-id.yaml",
      `${readFileSync(indexPath, "utf8")}\n  - id: FND-001\n    slug: duplicate-domain-kernel\n    status: PLANNED\n    milestone: M0\n    childDirectory: specs/999-duplicate-domain-kernel\n`,
    );
    const result = runValidator(featureIndexValidator, [
      "--index",
      duplicateIndex,
      "--schema",
      schemaPath,
    ]);

    expect(result.status, diagnostic(result)).toBe(1);
    expect(result.output).toMatch(/duplicad[oa]|duplicate.*FND-001/i);
    expect(result.output).not.toMatch(/MODULE_NOT_FOUND|Cannot find module/i);
  });

  it("exige 34 IDs, 12 contexts, 3 concerns e 16 golden paths", () => {
    const incompleteIndex = writeFixture(
      "incomplete-coverage.yaml",
      removeFeature(readFileSync(indexPath, "utf8"), "BC-012"),
    );
    const result = runValidator(coverageValidator, [
      "--index",
      incompleteIndex,
      "--source-map",
      sourceMapPath,
    ]);

    expect(result.status, diagnostic(result)).toBe(1);
    expect(result.output).toMatch(/34|12 bounded contexts?|BC-012/i);
    expect(result.output).not.toMatch(/MODULE_NOT_FOUND|Cannot find module/i);
  });

  it("rejeita dependência cíclica e informa o caminho do ciclo", () => {
    const cyclicGraph = writeFixture(
      "cyclic-dependencies.yaml",
      [
        "version: 1",
        "dependencies:",
        "  - from: FND-001",
        "    to: BC-002",
        "    kind: FINISHES_AFTER",
        "    reason: foundation before world",
        "  - from: BC-002",
        "    to: BC-003",
        "    kind: FINISHES_AFTER",
        "    reason: world before club",
        "  - from: BC-003",
        "    to: FND-001",
        "    kind: FINISHES_AFTER",
        "    reason: intentional cycle fixture",
        "",
      ].join("\n"),
    );
    const result = runValidator(dependencyValidator, ["--graph", cyclicGraph]);

    expect(result.status, diagnostic(result)).toBe(1);
    expect(result.output).toMatch(
      /FND-001.*BC-002.*BC-003.*FND-001|ciclo|cycle/i,
    );
    expect(result.output).not.toMatch(/MODULE_NOT_FOUND|Cannot find module/i);
  });
});

interface ValidatorResult {
  readonly status: number | null;
  readonly output: string;
}

function runValidator(
  validatorPath: string,
  arguments_: readonly string[],
): ValidatorResult {
  const result = spawnSync(process.execPath, [validatorPath, ...arguments_], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  };
}

function writeFixture(name: string, contents: string): string {
  const directory = mkdtempSync(join(tmpdir(), "grinta-roadmap-test-"));
  temporaryDirectories.push(directory);
  const path = join(directory, name);
  writeFileSync(path, contents, "utf8");
  return path;
}

function removeFeature(index: string, id: string): string {
  const lines = index.split("\n");
  const start = lines.findIndex((line) => line === `  - id: ${id}`);
  if (start < 0) {
    throw new Error(`Fixture não encontrou ${id} no índice canônico.`);
  }
  let end = start + 1;
  while (end < lines.length && !lines[end]!.startsWith("  - id: ")) {
    end += 1;
  }
  lines.splice(start, end - start);
  return lines.join("\n");
}

function diagnostic(result: ValidatorResult): string {
  return [
    `validator status: ${String(result.status)}`,
    result.output.trim() || "validator sem saída",
  ].join("\n");
}
