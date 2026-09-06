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
import {
  hasDatabase,
  resetWorldFixtures,
  skipReason,
} from "./postgres.guard.js";

describe.skipIf(!hasDatabase)(
  `API query catalog (e2e)${hasDatabase ? "" : ` — PULADO: ${skipReason}`}`,
  () => {
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
    // Banco limpo ANTES de criar o mundo: estes e2e usam idempotencyKey fixa,
    // e um registro sobrevivente aponta para um mundo truncado (404 em tudo).
    await resetWorldFixtures();
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

  // A gênese materializa os clubes como LINHAS (R-185): o que este teste prova é
  // que `world:genesis` teve efeito no Postgres. A query `players` saiu junto
  // com o contexto que a servia e volta quando uma tela precisar dela.
  it.each(["club", "club-detail"])(
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

  /**
   * C1 já migrou para o Postgres (R-173/R-175), então esta query exige banco —
   * é read model sobre quatro tabelas, não mais o snapshot de um mega-agregado.
   * Sem `DATABASE_URL` ela é PULADA e diz por quê, em vez de passar em silêncio
   * dando a impressão de que foi verificada.
   *
   * Sem `revision`: não existe mais revisão de mundo (R-175), é `version` por
   * linha. Sem `accounts`: a conta é de plataforma (R-172) e não vive no mundo.
   * Sem `identity:initialize`: não há agregado de identidade para inicializar —
   * os roots nascem quando o jogador age.
   */
  it.skipIf(process.env.DATABASE_URL === undefined)(
    "query identity-detail entrega reservas, controles e participações do mundo",
    async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/worlds/${worldId}/identity-detail`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        participations: [],
        reservations: [],
        controls: [],
        cooldowns: [],
      });
      expect(response.body.data).not.toHaveProperty("accounts");
      expect(response.body.data).not.toHaveProperty("revision");
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
