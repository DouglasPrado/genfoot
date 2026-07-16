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

describe("API query world-scope enforcement (e2e)", () => {
  let app: INestApplication;
  let dataDirectory: string;
  let worldId = "";
  let adminToken = "";

  async function token(
    role: "user" | "admin",
    worldScope?: string[],
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/session")
      .send({
        subject: "scope-e2e",
        role,
        adminKey: role === "admin" ? "grinta-dev-admin" : undefined,
        worldScope,
      });
    return res.body.token as string;
  }

  beforeAll(async () => {
    dataDirectory = await mkdtemp(join(tmpdir(), "grinta-apiscope-"));
    process.env.GRINTA_API_DATA_DIR = dataDirectory;
    delete process.env.GRINTA_API_ALLOW_ANONYMOUS;
// Porta de desenvolvimento: sem ela, /auth/session exige prova do provedor.
    process.env.GRINTA_API_ALLOW_DEV_SESSIONS = "1";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();

    adminToken = await token("admin");
    const created = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        contractVersion: "v1",
        commandType: "world:create",
        payload: { seed: "scope-seed", startDate: "2026-01-01" },
        idempotencyKey: "scope-create",
        correlationId: "c",
      });
    worldId = String(created.body.resource).slice("world:".length);
  });

  afterAll(async () => {
    await app.close();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it("token com escopo do mundo → 200", async () => {
    const scoped = await token("user", [worldId]);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/worlds/${worldId}`)
      .set("Authorization", `Bearer ${scoped}`);
    expect(response.status).toBe(200);
  });

  it("token com escopo de OUTRO mundo → 403 FORBIDDEN", async () => {
    const scoped = await token("user", [
      "11111111-1111-7000-8000-111111111111",
    ]);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/worlds/${worldId}`)
      .set("Authorization", `Bearer ${scoped}`);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  it("admin acessa qualquer mundo (escopo ignorado)", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/worlds/${worldId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
  });

  it("usuário sem escopo (aberto) acessa o mundo", async () => {
    const open = await token("user");
    const response = await request(app.getHttpServer())
      .get(`/api/v1/worlds/${worldId}`)
      .set("Authorization", `Bearer ${open}`);
    expect(response.status).toBe(200);
  });
});
