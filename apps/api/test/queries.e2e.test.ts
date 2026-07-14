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

describe("API query catalog (e2e)", () => {
  let app: INestApplication;
  let dataDirectory: string;
  let worldId = "";

  function command(overrides: Record<string, unknown>) {
    return {
      contractVersion: "v1",
      commandType: "world:create",
      payload: {},
      correlationId: "corr-q",
      ...overrides,
    };
  }

  beforeAll(async () => {
    dataDirectory = await mkdtemp(join(tmpdir(), "grinta-apiq-"));
    process.env.GRINTA_API_DATA_DIR = dataDirectory;
    process.env.GRINTA_API_ALLOW_ANONYMOUS = "1";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();

    const created = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        command({
          payload: { seed: "q-seed", startDate: "2026-01-01" },
          idempotencyKey: "q-create",
        }),
      );
    worldId = String(created.body.resource).slice("world:".length);

    await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        command({
          commandType: "world:genesis",
          worldId,
          idempotencyKey: "q-genesis",
        }),
      );
    await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        command({
          commandType: "world:activate",
          worldId,
          idempotencyKey: "q-activate",
        }),
      );
  });

  afterAll(async () => {
    await app.close();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it("ciclo create→genesis→activate deixa o mundo ACTIVE", async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ACTIVE");
  });

  // Genesis + activate inicializam clube e elenco; os demais contextos só
  // existem após o setup próprio (temporada, transações, mercado).
  it.each(["club", "players"])(
    "query %s (inicializado na gênese) → 200 com envelope",
    async (queryType) => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/worlds/${worldId}/${queryType}`,
      );
      expect(response.status).toBe(200);
      expect(response.body.scope.queryType).toBe(queryType);
      expect(response.body.data).toBeDefined();
      expect(response.body.asOf).toBe("2026-01-01");
    },
  );

  it.each(["competitions", "matches", "market", "ledger"])(
    "query %s (contexto ainda não criado) → 404 erro-padrão",
    async (queryType) => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/worlds/${worldId}/${queryType}`,
      );
      expect(response.status).toBe(404);
      expect(typeof response.body.code).toBe("string");
    },
  );

  it("envelope de query carrega paginação (limit/offset)", async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/club?limit=10&offset=0`,
    );
    expect(response.status).toBe(200);
    expect(response.body.pagination.limit).toBe(10);
    expect(response.body.pagination.offset).toBe(0);
    expect(typeof response.body.pagination.hasMore).toBe("boolean");
  });

  it("queryType desconhecido → 400 QUERY_UNKNOWN", async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/naoexiste`,
    );
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("QUERY_UNKNOWN");
  });

  it("query em mundo inexistente → 404", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/worlds/00000000-0000-7000-8000-000000000000/club",
    );
    expect(response.status).toBe(404);
  });
});
