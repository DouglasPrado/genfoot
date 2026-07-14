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

describe("API gameplay happy-path via wc factory (e2e)", () => {
  let app: INestApplication;
  let dataDirectory: string;
  let worldId = "";

  beforeAll(async () => {
    dataDirectory = await mkdtemp(join(tmpdir(), "grinta-apihp-"));
    process.env.GRINTA_API_DATA_DIR = dataDirectory;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();

    const created = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "world:create",
        payload: { seed: "hp-seed", startDate: "2026-01-01" },
        idempotencyKey: "hp-create",
        correlationId: "corr-hp",
      });
    worldId = String(created.body.resource).slice("world:".length);
  });

  afterAll(async () => {
    await app.close();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it("ledger:initialize → ledger:open-account (wc injeta contexto) → ACCEPTED", async () => {
    const init = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "ledger:initialize",
        worldId,
        idempotencyKey: "hp-ledger-init",
        correlationId: "corr-hp",
        payload: {},
      });
    expect(init.body.status).toBe("ACCEPTED");

    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "ledger:open-account",
        worldId,
        idempotencyKey: "hp-ledger-1",
        correlationId: "corr-hp",
        payload: { name: "Caixa do Clube", type: "ASSET" },
      });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe("ACCEPTED");
    expect(response.body.resource).toBe(`ledger:${worldId}`);

    // a query de ledger passa a responder 200
    const query = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/ledger`,
    );
    expect(query.status).toBe(200);
  });
});
