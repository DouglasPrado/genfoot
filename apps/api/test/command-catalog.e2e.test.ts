import "reflect-metadata";

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { registeredCommandTypes } from "../src/commands/command-registry.js";
import { API_PREFIX } from "../src/main.js";
import { AppModule } from "../src/app.module.js";

const VALID_STATUSES = new Set(["ACCEPTED", "ALREADY_APPLIED", "REJECTED"]);

describe("API command catalog integrity (e2e)", () => {
  let app: INestApplication;
  let dataDirectory: string;
  let worldId = "";

  beforeAll(async () => {
    dataDirectory = await mkdtemp(join(tmpdir(), "grinta-apicat-"));
    process.env.GRINTA_API_DATA_DIR = dataDirectory;
    process.env.GRINTA_API_ALLOW_ANONYMOUS = "1";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();

    const send = (commandType: string, payload: Record<string, unknown>, key: string) =>
      request(app.getHttpServer())
        .post("/api/v1/commands")
        .send({
          contractVersion: "v1",
          commandType,
          worldId: commandType === "world:create" ? undefined : worldId,
          idempotencyKey: key,
          correlationId: "corr-cat",
          payload,
        });

    const created = await send(
      "world:create",
      { seed: "cat-seed", startDate: "2026-01-01" },
      "cat-create",
    );
    worldId = String(created.body.resource).slice("world:".length);
    await send("world:genesis", {}, "cat-gen");
    await send("world:activate", {}, "cat-act");
  });

  afterAll(async () => {
    await app.close();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it("expõe um catálogo amplo de commands (>= 120 tipos)", () => {
    expect(registeredCommandTypes().length).toBeGreaterThanOrEqual(120);
  });

  it("GET /commands/catalog lista commands e queries para descoberta", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/commands/catalog",
    );
    expect(response.status).toBe(200);
    expect(response.body.commandCount).toBeGreaterThanOrEqual(120);
    expect(response.body.queries.length).toBe(14);
    expect(response.body.commands).toContain("infrastructure:start");
    expect(response.body.commands).toContain("scheduler:resume");
    expect(response.body.commands).toContain("match:submit-command");
  });

  it("todo command registrado é alcançável e devolve um CommandResponse válido (nunca 500)", async () => {
    const failures: string[] = [];
    for (const commandType of registeredCommandTypes()) {
      const response = await request(app.getHttpServer())
        .post("/api/v1/commands")
        .send({
          contractVersion: "v1",
          commandType,
          worldId,
          expectedVersion: 0,
          idempotencyKey: `probe-${commandType}`,
          correlationId: "corr-cat",
          payload: {},
        });
      // Aceito 201 (accepted/rejected no corpo) ou 400 (envelope/desconhecido),
      // mas NUNCA 500.
      if (response.status >= 500) {
        failures.push(`${commandType} → HTTP ${response.status}`);
        continue;
      }
      if (response.status === 201 && !VALID_STATUSES.has(response.body.status)) {
        failures.push(`${commandType} → status inválido ${response.body.status}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
