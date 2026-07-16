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
    // Porta de desenvolvimento: sem ela, /auth/session exige prova do provedor.
    process.env.GRINTA_API_ALLOW_DEV_SESSIONS = "1";
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

  it("query player-roster entrega elenco e reserva oficial de mercado", async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/player-roster`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.players).toHaveLength(528);
    expect(response.body.data.persons).toHaveLength(528);
    expect(response.body.data.players[0]).toMatchObject({
      careerStatus: "ACTIVE",
      availability: "AVAILABLE",
    });
    expect(response.body.data.persons[0]).toEqual(
      expect.objectContaining({
        firstName: expect.any(String),
        lastName: expect.any(String),
      }),
    );
    expect(
      response.body.data.players.filter(
        (player: { careerStatus: string }) =>
          player.careerStatus === "FREE_AGENT",
      ),
    ).toHaveLength(160);
  });

  it("gênese materializa as 240 partidas oficiais da Liga Inicial", async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/matches-detail`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.matches).toHaveLength(240);
    expect(response.body.data.matches[0]).toMatchObject({
      status: "CREATED",
      kickoffOn: "2026-01-08",
    });
  });

  it("query identity-detail entrega contas, reservas e controles oficiais", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        command({
          commandType: "identity:initialize",
          worldId,
          idempotencyKey: "q-identity-init",
        }),
      );

    const response = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/identity-detail`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      accounts: [],
      reservations: [],
      controls: [],
      participations: [],
      revision: 1,
    });
  });

  it("query matches resume o calendário materializado", async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/matches`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      matchCount: 240,
      finalCount: 0,
    });
  });

  it("a gênese entrega economia, mercado e competição jogáveis", async () => {
    const [ledger, market, competitions] = await Promise.all([
      request(app.getHttpServer()).get(`/api/v1/worlds/${worldId}/ledger`),
      request(app.getHttpServer()).get(`/api/v1/worlds/${worldId}/market`),
      request(app.getHttpServer()).get(
        `/api/v1/worlds/${worldId}/competitions`,
      ),
    ]);

    expect(ledger.body.data).toMatchObject({
      accountCount: 17,
      transactionCount: 16,
      residualMinor: 0,
    });
    expect(market.body.data.availablePlayerCount).toBe(160);
    expect(competitions.body.data).toMatchObject({
      editionCount: 1,
      participantCount: 16,
      fixtureCount: 240,
      nextKickoffOn: "2026-01-08",
    });
  });

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
