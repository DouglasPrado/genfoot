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
    process.env.GRINTA_API_ALLOW_ANONYMOUS = "1";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();

    const send = (
      commandType: string,
      key: string,
      payload: Record<string, unknown> = {},
    ) =>
      request(app.getHttpServer())
        .post("/api/v1/commands")
        .send({
          contractVersion: "v1",
          commandType,
          worldId: commandType === "world:create" ? undefined : worldId,
          idempotencyKey: key,
          correlationId: "corr-hp",
          payload,
        });

    const created = await send("world:create", "hp-create", {
      seed: "hp-seed",
      startDate: "2026-01-01",
    });
    worldId = String(created.body.resource).slice("world:".length);
    await send("world:genesis", "hp-gen");
    await send("world:activate", "hp-act");
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
    expect(init.body.status, JSON.stringify(init.body)).toBe("ACCEPTED");

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
    expect(query.body.data).toMatchObject({
      accountCount: 18,
      transactionCount: 16,
      residualMinor: 0,
    });
  });

  it("os inicializadores de contexto <ctx>:initialize destravam suas queries (404→200)", async () => {
    const contexts: [string, string][] = [
      ["competition:initialize", "competitions"],
      ["match:initialize", "matches"],
      ["staff:initialize", "staff"],
      ["narrative:initialize", "narrative"],
      ["inbox:initialize", "inbox"],
      ["admin:initialize", "admin"],
      ["automation:initialize", "automation"],
      ["identity:initialize", "identity"],
      ["eventing:initialize", "eventing"],
      ["market:initialize", "market"],
    ];
    for (const [commandType, queryType] of contexts) {
      const init = await request(app.getHttpServer())
        .post("/api/v1/commands")
        .send({
          contractVersion: "v1",
          commandType,
          worldId,
          idempotencyKey: `hp-init-${queryType}`,
          correlationId: "corr-hp",
          payload: {},
        });
      expect(
        init.body.status,
        `${commandType}: ${JSON.stringify(init.body)}`,
      ).toBe("ACCEPTED");

      const query = await request(app.getHttpServer()).get(
        `/api/v1/worlds/${worldId}/${queryType}`,
      );
      expect(query.status, `query ${queryType}`).toBe(200);
      if (queryType === "competitions") {
        expect(query.body.data).toMatchObject({
          editionCount: 1,
          participantCount: 16,
          fixtureCount: 240,
        });
      }
    }
  });
});
