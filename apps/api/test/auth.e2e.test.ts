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

describe("API auth guard + RBAC (e2e)", () => {
  let app: INestApplication;
  let dataDirectory: string;

  async function issueToken(
    role?: "user" | "admin",
    adminKey?: string,
  ): Promise<request.Response> {
    return request(app.getHttpServer())
      .post("/api/v1/auth/session")
      .send({ subject: "e2e", role, adminKey });
  }

  beforeAll(async () => {
    dataDirectory = await mkdtemp(join(tmpdir(), "grinta-apiauth-"));
    process.env.GRINTA_API_DATA_DIR = dataDirectory;
    delete process.env.GRINTA_API_ALLOW_ANONYMOUS; // guard real, sem bypass
// Porta de desenvolvimento: sem ela, /auth/session exige prova do provedor.
    process.env.GRINTA_API_ALLOW_DEV_SESSIONS = "1";
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

  it("health é público (sem token → 200)", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health");
    expect(response.status).toBe(200);
  });

  it("command sem token → 401 UNAUTHENTICATED", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "world:create",
        payload: { seed: "x", startDate: "2026-01-01" },
        idempotencyKey: "noauth",
        correlationId: "c",
      });
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHENTICATED");
  });

  it("query sem token → 401", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/worlds/00000000-0000-7000-8000-000000000000",
    );
    expect(response.status).toBe(401);
  });

  // Regressão do buraco: /auth/session emitia Bearer para qualquer `subject`
  // do corpo, sem prova. Autenticar no Clerk não era autenticar no jogo, e
  // quem falasse direto com a API passava por cima do login inteiro.
  it("com a porta de desenvolvimento FECHADA, recusa sessão sem prova", async () => {
    delete process.env.GRINTA_API_ALLOW_DEV_SESSIONS;
    try {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/session")
        .send({ subject: "qualquer-um", role: "user" });
      expect(response.status).toBe(401);
      expect(response.body.code).toBe("UNAUTHENTICATED");
      expect(response.body.recoveryAction).toBe("AUTHENTICATE");
    } finally {
      process.env.GRINTA_API_ALLOW_DEV_SESSIONS = "1";
    }
  });

  it("com a porta fechada, token do provedor inválido também é recusado", async () => {
    delete process.env.GRINTA_API_ALLOW_DEV_SESSIONS;
    try {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/session")
        .send({ subject: "ignorado", role: "user", clerkToken: "nao-e-um-jwt" });
      expect(response.status).toBe(401);
      expect(response.body.code).toBe("UNAUTHENTICATED");
    } finally {
      process.env.GRINTA_API_ALLOW_DEV_SESSIONS = "1";
    }
  });

  it("emite token de usuário e aceita command autenticado", async () => {
    const session = await issueToken("user");
    expect(session.status).toBe(201);
    const token = session.body.token as string;
    expect(session.body.role).toBe("user");

    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .set("Authorization", `Bearer ${token}`)
      .send({
        contractVersion: "v1",
        commandType: "world:create",
        payload: { seed: "auth-seed", startDate: "2026-01-01" },
        idempotencyKey: "auth-create",
        correlationId: "c",
      });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe("ACCEPTED");
  });

  it("token inválido → 401", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .set("Authorization", "Bearer nope")
      .send({
        contractVersion: "v1",
        commandType: "world:create",
        payload: { seed: "y", startDate: "2026-01-01" },
        idempotencyKey: "bad-token",
        correlationId: "c",
      });
    expect(response.status).toBe(401);
  });

  it("papel admin exige adminKey de bootstrap", async () => {
    const semKey = await issueToken("admin");
    expect(semKey.status).toBe(400);
    expect(semKey.body.code).toBe("ADMIN_KEY_INVALID");

    const comKey = await issueToken("admin", "grinta-dev-admin");
    expect(comKey.status).toBe(201);
    expect(comKey.body.role).toBe("admin");
  });

  it("RBAC: command admin:* exige papel admin (user → 403, admin → não 403)", async () => {
    const userToken = (await issueToken("user")).body.token as string;
    const adminToken = (await issueToken("admin", "grinta-dev-admin")).body
      .token as string;

    const forbidden = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        contractVersion: "v1",
        commandType: "admin:record-risk",
        worldId: "00000000-0000-7000-8000-000000000000",
        idempotencyKey: "rbac-user",
        correlationId: "c",
        payload: {},
      });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe("FORBIDDEN");

    const allowed = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        contractVersion: "v1",
        commandType: "admin:record-risk",
        worldId: "00000000-0000-7000-8000-000000000000",
        idempotencyKey: "rbac-admin",
        correlationId: "c",
        payload: {},
      });
    expect(allowed.status).not.toBe(403);
  });
});
