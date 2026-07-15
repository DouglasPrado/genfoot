import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  runCalibrationBatch,
  type BatchReport,
  type CalibrationManifest,
} from "@grinta/core";

import { ApiException } from "../common/standard-error.js";

/** Manifesto smoke padrão (bandas ratificadas ao kernel real). */
const SMOKE_MANIFEST: CalibrationManifest = {
  manifestHash: "admin-smoke",
  rulesetVersion: "1.0.0",
  timestepChances: 30,
  expectedRuns: 6,
  matchesPerScenario: 300,
  scenarios: [
    { id: "s1", seed: "smoke-1", homeStrength: 70, awayStrength: 50 },
    { id: "s2", seed: "smoke-2", homeStrength: 60, awayStrength: 60 },
    { id: "s3", seed: "smoke-3", homeStrength: 55, awayStrength: 65 },
    { id: "s4", seed: "smoke-4", homeStrength: 80, awayStrength: 40 },
    { id: "s5", seed: "smoke-5", homeStrength: 50, awayStrength: 50 },
    { id: "s6", seed: "smoke-6", homeStrength: 65, awayStrength: 58 },
  ],
  bands: [
    { bandId: "BS-goals", metric: "avgTotalGoals", lo: 6.5, hi: 9, oracleVersion: "oracle-2026.1" },
    { bandId: "BS-home", metric: "homeWinRate", lo: 0.4, hi: 0.8, oracleVersion: "oracle-2026.1" },
  ],
  invariants: { maxTotalGoalsPerMatch: 20 },
};

@ApiTags("validation")
@Controller("validation")
export class ValidationController {
  @ApiOperation({
    summary: "Roda calibração (VAL-001) e devolve o relatório com bandas e gate",
  })
  @Post("run")
  run(@Body() body: unknown): BatchReport {
    const manifest =
      body !== null && typeof body === "object" && "scenarios" in body
        ? (body as CalibrationManifest)
        : SMOKE_MANIFEST;
    const result = runCalibrationBatch(manifest);
    if (!result.ok) {
      throw new ApiException({
        code: result.error.code,
        messageKey: result.error.message,
        correlationId: "unknown",
        retryable: false,
        fieldErrors: [],
        blockingReason: result.error.code,
        recoveryAction: null,
      });
    }
    return result.value;
  }
}
