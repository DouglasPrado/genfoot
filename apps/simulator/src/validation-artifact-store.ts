import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type {
  BatchReport,
  CalibrationManifest,
  EvidenceLedger,
  PromotionGateDecision,
  PromotionLog,
  ScenarioRunResult,
} from "@grinta/core";

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * Persistência de artefatos de validação em arquivos (VAL-001, FR-012). Cada lote
 * guarda o manifesto e os artefatos brutos por cenário (retomáveis por shard/resume);
 * o ledger de evidência e o log de promoção são append-only e globais ao espaço.
 * Escreve apenas artefatos de validação; nunca toca o estado simulado.
 */
export class ValidationArtifactStore {
  private readonly baseDirectory: string;

  constructor(baseDirectory: string) {
    this.baseDirectory = resolve(baseDirectory);
  }

  private batchDir(batchId: string): string {
    return join(this.baseDirectory, "batches", batchId);
  }

  async writeManifest(
    batchId: string,
    manifest: CalibrationManifest,
  ): Promise<void> {
    await writeJson(join(this.batchDir(batchId), "manifest.json"), manifest);
  }

  async readManifest(
    batchId: string,
  ): Promise<CalibrationManifest | undefined> {
    return readJson<CalibrationManifest>(
      join(this.batchDir(batchId), "manifest.json"),
    );
  }

  async writeScenario(
    batchId: string,
    run: ScenarioRunResult,
  ): Promise<void> {
    await writeJson(
      join(this.batchDir(batchId), "scenarios", `${run.scenarioId}.json`),
      run,
    );
  }

  async hasScenario(batchId: string, scenarioId: string): Promise<boolean> {
    const existing = await readJson<ScenarioRunResult>(
      join(this.batchDir(batchId), "scenarios", `${scenarioId}.json`),
    );
    return existing !== undefined;
  }

  async readScenario(
    batchId: string,
    scenarioId: string,
  ): Promise<ScenarioRunResult | undefined> {
    return readJson<ScenarioRunResult>(
      join(this.batchDir(batchId), "scenarios", `${scenarioId}.json`),
    );
  }

  async listScenarios(batchId: string): Promise<ScenarioRunResult[]> {
    let entries: string[];
    try {
      entries = await readdir(join(this.batchDir(batchId), "scenarios"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const runs: ScenarioRunResult[] = [];
    for (const entry of entries.sort()) {
      if (!entry.endsWith(".json")) continue;
      const run = await readJson<ScenarioRunResult>(
        join(this.batchDir(batchId), "scenarios", entry),
      );
      if (run) runs.push(run);
    }
    return runs;
  }

  async writeReport(batchId: string, report: BatchReport): Promise<void> {
    await writeJson(join(this.batchDir(batchId), "report.json"), report);
  }

  async readReport(batchId: string): Promise<BatchReport | undefined> {
    return readJson<BatchReport>(join(this.batchDir(batchId), "report.json"));
  }

  private evidencePath(): string {
    return join(this.baseDirectory, "evidence.json");
  }

  async readEvidence(): Promise<EvidenceLedger> {
    return (await readJson<EvidenceLedger>(this.evidencePath())) ?? {
      records: [],
    };
  }

  async writeEvidence(ledger: EvidenceLedger): Promise<void> {
    await writeJson(this.evidencePath(), ledger);
  }

  private promotionPath(): string {
    return join(this.baseDirectory, "promotion-log.json");
  }

  async readPromotionLog(): Promise<PromotionLog> {
    return (await readJson<PromotionLog>(this.promotionPath())) ?? {
      decisions: [],
    };
  }

  async writePromotionLog(log: PromotionLog): Promise<void> {
    await writeJson(this.promotionPath(), log);
  }

  async readGateSpec(
    path: string,
  ): Promise<GateSpecFile | undefined> {
    return readJson<GateSpecFile>(resolve(path));
  }
}

export interface GateSpecFile {
  readonly candidate: string;
  readonly currentRulesetVersion: string;
  readonly requiredGateIds: readonly string[];
  readonly gates: readonly {
    readonly gateId: string;
    readonly result: "PASS" | "FAIL" | "UNEVALUATED";
    readonly evidenceRef: string;
    readonly evidenceRulesetVersion: string;
  }[];
  readonly reviewers?: readonly string[];
}

export type { PromotionGateDecision };
