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

describe("API market commands (e2e)", () => {
  let app: INestApplication;
  let dataDirectory: string;
  let worldId = "";

  function command(overrides: Record<string, unknown>) {
    return {
      contractVersion: "v1",
      commandType: "world:create",
      payload: {},
      correlationId: "corr-m",
      ...overrides,
    };
  }

  beforeAll(async () => {
    dataDirectory = await mkdtemp(join(tmpdir(), "grinta-apim-"));
    process.env.GRINTA_API_DATA_DIR = dataDirectory;
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
          payload: { seed: "m-seed", startDate: "2026-01-01" },
          idempotencyKey: "m-create",
        }),
      );
    worldId = String(created.body.resource).slice("world:".length);
    await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(command({ commandType: "world:genesis", worldId, idempotencyKey: "m-gen" }));
    await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(command({ commandType: "world:activate", worldId, idempotencyKey: "m-act" }));
  });

  afterAll(async () => {
    await app.close();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it("market:initialize cria o mercado do mundo (ACCEPTED) e a query passa a responder 200", async () => {
    const before = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/market`,
    );
    expect(before.status).toBe(404); // ainda não inicializado

    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "market:initialize",
        worldId,
        idempotencyKey: "m-init",
        correlationId: "corr-m",
        payload: {},
      });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe("ACCEPTED");

    const after = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/market`,
    );
    expect(after.status).toBe(200);
    expect(after.body.scope.queryType).toBe("market");
  });

  it("market:publish-listing publica uma listagem (ACCEPTED) após o mercado existir", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "market:publish-listing",
        worldId,
        idempotencyKey: "m-listing-1",
        correlationId: "corr-m",
        payload: {
          playerId: "player-1",
          sellerClubId: "00000000-0000-7000-8000-000000000000",
          askingFeeMinor: 1_000_000,
        },
      });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe("ACCEPTED");
    expect(response.body.resource).toBe("listing:player-1");

    // idempotência: repetir a mesma key não republica
    const replay = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "market:publish-listing",
        worldId,
        idempotencyKey: "m-listing-1",
        correlationId: "corr-m",
        payload: {
          playerId: "player-1",
          sellerClubId: "00000000-0000-7000-8000-000000000000",
          askingFeeMinor: 1_000_000,
        },
      });
    expect(replay.body.status).toBe("ALREADY_APPLIED");
  });
});
