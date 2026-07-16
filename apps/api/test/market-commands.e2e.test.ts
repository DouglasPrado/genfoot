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
    process.env.GRINTA_API_ALLOW_ANONYMOUS = "1";
// Porta de desenvolvimento: sem ela, /auth/session exige prova do provedor.
    process.env.GRINTA_API_ALLOW_DEV_SESSIONS = "1";
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
      .send(
        command({
          commandType: "world:genesis",
          worldId,
          idempotencyKey: "m-gen",
        }),
      );
    await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        command({
          commandType: "world:activate",
          worldId,
          idempotencyKey: "m-act",
        }),
      );
  });

  afterAll(async () => {
    await app.close();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it("market:initialize cria o mercado do mundo (ACCEPTED) e a query passa a responder 200", async () => {
    const before = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/market`,
    );
    expect(before.status).toBe(200); // a gênese já entrega o mercado jogável
    expect(before.body.data.availablePlayerCount).toBe(160);

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
    expect(after.body.data.availablePlayerCount).toBe(160);
    expect(after.body.data.availablePlayers).toHaveLength(160);

    const roster = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/player-roster`,
    );
    expect(roster.status).toBe(200);
    const freeAgents = roster.body.data.players.filter(
      (player: { careerStatus: string }) =>
        player.careerStatus === "FREE_AGENT",
    );
    expect(freeAgents).toHaveLength(160);
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
          playerId: "019f0000-0000-7000-8000-00000000f001",
          sellerClubId: "00000000-0000-7000-8000-000000000000",
          askingFeeMinor: 1_000_000,
        },
      });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe("ACCEPTED");
    expect(response.body.resource).toBe("listing:019f0000-0000-7000-8000-00000000f001");

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
          playerId: "019f0000-0000-7000-8000-00000000f001",
          sellerClubId: "00000000-0000-7000-8000-000000000000",
          askingFeeMinor: 1_000_000,
        },
      });
    expect(replay.body.status).toBe("ALREADY_APPLIED");
  });

  it("observa jogador livre e projeta o relatório oficial no mercado", async () => {
    const [market, club] = await Promise.all([
      request(app.getHttpServer()).get(`/api/v1/worlds/${worldId}/market`),
      request(app.getHttpServer()).get(`/api/v1/worlds/${worldId}/club`),
    ]);
    const playerId = market.body.data.availablePlayers[0].id as string;
    const observerClubId = club.body.data.clubs[0].id as string;

    const observed = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "market:request-scouting",
        worldId,
        idempotencyKey: `scout:${playerId}:${observerClubId}`,
        correlationId: "corr-scout-player",
        payload: {
          playerId,
          observerClubId,
          scoutingCapacity: 80,
          observations: ["capacidade atual", "potencial"],
          validUntil: "2027-01-01",
        },
      });
    expect(observed.body.status).toBe("ACCEPTED");

    const projected = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/market`,
    );
    expect(projected.body.data.scoutingReports).toEqual([
      expect.objectContaining({ playerId, observerClubId, confidence: 80 }),
    ]);
  });
});
