import "reflect-metadata";

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { API_PREFIX } from "../src/main.js";
import { AppModule } from "../src/app.module.js";
import { hasDatabase, skipReason } from "./postgres.guard.js";

describe.skipIf(!hasDatabase)(
  `API validation/calibration (e2e)${hasDatabase ? "" : ` — PULADO: ${skipReason}`}`,
  () => {
  let app: INestApplication;
  let dataDirectory: string;

  beforeAll(async () => {
    dataDirectory = await mkdtemp(join(tmpdir(), "grinta-apival-"));
    process.env.GRINTA_API_DATA_DIR = dataDirectory;
    process.env.GRINTA_API_ALLOW_ANONYMOUS = "1";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it("POST /validation/run (smoke) → relatório com gate PASS e bandas", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/validation/run")
      .send({});
    expect(response.status).toBe(201);
    expect(response.body.gateResult).toBe("PASS");
    expect(response.body.matchesExecuted).toBeGreaterThan(0);
    expect(response.body.bandEvaluations.length).toBeGreaterThan(0);
    expect(response.body.reportHash).toBeTruthy();
  });
});
