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
  `API command/query transport (e2e)${hasDatabase ? "" : ` — PULADO: ${skipReason}`}`,
  () => {
  let app: INestApplication;
  let dataDirectory: string;

  beforeAll(async () => {
    dataDirectory = await mkdtemp(join(tmpdir(), "grinta-api-"));
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

  function envelope(overrides: Record<string, unknown>) {
    return {
      contractVersion: "v1",
      commandType: "world:create",
      payload: {},
      idempotencyKey: "key-1",
      correlationId: "corr-1",
      ...overrides,
    };
  }

  let createdWorldId = "";

  it("aceita world:create e devolve commandId + resource (ACCEPTED)", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        envelope({
          payload: { seed: "api-seed-1", startDate: "2026-01-01" },
          idempotencyKey: "create-1",
        }),
      );
    expect(response.status).toBe(201);
    expect(response.body.status).toBe("ACCEPTED");
    expect(response.body.commandId).toBeTruthy();
    expect(String(response.body.resource)).toMatch(/^world:/);
    createdWorldId = String(response.body.resource).slice("world:".length);
  });

  it("repetição da mesma idempotencyKey → ALREADY_APPLIED com o mesmo commandId", async () => {
    const first = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        envelope({
          payload: { seed: "api-seed-2", startDate: "2026-01-01" },
          idempotencyKey: "create-2",
        }),
      );
    const replay = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        envelope({
          payload: { seed: "api-seed-2", startDate: "2026-01-01" },
          idempotencyKey: "create-2",
        }),
      );
    expect(replay.body.status).toBe("ALREADY_APPLIED");
    expect(replay.body.commandId).toBe(first.body.commandId);
  });

  it("query devolve envelope com asOf/projectionVersion/scope", async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${createdWorldId}`,
    );
    expect(response.status).toBe(200);
    expect(response.body.asOf).toBe("2026-01-01");
    expect(response.body.projectionVersion).toBeGreaterThanOrEqual(0);
    expect(response.body.scope.worldId).toBe(createdWorldId);
    expect(response.body.data.seed).toBe("api-seed-1");
  });

  it("comando de domínio inválido vira REJECTED com código de erro", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        // `world:advance-days` morreu com o `WorldScheduler` (R-175). O que este
        // teste prova não é o command: é que erro de DOMÍNIO vira REJECTED com
        // código, e não 500. `world:genesis` num mundo inexistente prova o
        // mesmo, e é um command que existe.
        envelope({
          commandType: "world:genesis",
          worldId: "00000000-0000-7000-8000-000000000000",
          payload: {},
          idempotencyKey: "genesis-nonexistent",
        }),
      );
    expect(response.body.status).toBe("REJECTED");
    expect(response.body.error.code).toBe("WORLD_NOT_FOUND");
  });

  it("commandType desconhecido → 400 erro-padrão COMMAND_UNKNOWN", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(envelope({ commandType: "nope:nope", idempotencyKey: "unknown-1" }));
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("COMMAND_UNKNOWN");
    expect(response.body.correlationId).toBe("corr-1");
  });

  it("envelope malformado → 400 erro-padrão com fieldErrors", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({ contractVersion: "v1", commandType: "world:create" });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("REQUEST_INVALID");
    expect(Array.isArray(response.body.fieldErrors)).toBe(true);
    expect(response.body.fieldErrors.length).toBeGreaterThan(0);
  });

  it("contractVersion incompatível → 400 CONTRACT_INCOMPATIBLE (FR-014)", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        envelope({
          contractVersion: "v99",
          idempotencyKey: "bad-contract",
        }),
      );
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("CONTRACT_INCOMPATIBLE");
    expect(response.body.recoveryAction).toBe("UPGRADE_CLIENT");
  });

  it("query de mundo inexistente → 404 erro-padrão NOT_FOUND", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/worlds/00000000-0000-7000-8000-000000000000",
    );
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("WORLD_NOT_FOUND");
  });
});
