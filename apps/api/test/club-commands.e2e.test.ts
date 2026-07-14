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

interface ClubSnapshot {
  readonly id: string;
  readonly identity: { readonly name: string; readonly shortCode: string };
}

describe("API club:command (e2e)", () => {
  let app: INestApplication;
  let dataDirectory: string;
  let worldId = "";

  function command(overrides: Record<string, unknown>) {
    return {
      contractVersion: "v1",
      commandType: "world:create",
      payload: {},
      correlationId: "corr-c",
      ...overrides,
    };
  }

  beforeAll(async () => {
    dataDirectory = await mkdtemp(join(tmpdir(), "grinta-apic-"));
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
          payload: { seed: "c-seed", startDate: "2026-01-01" },
          idempotencyKey: "c-create",
        }),
      );
    worldId = String(created.body.resource).slice("world:".length);
    await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(command({ commandType: "world:genesis", worldId, idempotencyKey: "c-gen" }));
    await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(command({ commandType: "world:activate", worldId, idempotencyKey: "c-act" }));
  });

  afterAll(async () => {
    await app.close();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it("UpdateClubIdentity muta o clube via API e a query reflete", async () => {
    const before = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/club`,
    );
    const club = (before.body.data.clubs as ClubSnapshot[])[0]!;
    const expectedVersion = before.body.data.revision as number;

    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "club:command",
        worldId,
        expectedVersion,
        idempotencyKey: "club-rename-1",
        correlationId: "corr-c",
        payload: {
          clubId: club.id,
          actorId: "operador",
          occurredAt: "2026-06-15",
          command: {
            type: "UpdateClubIdentity",
            name: "Grinta United",
            shortCode: "GRU",
          },
        },
      });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe("ACCEPTED");
    expect(response.body.resource).toBe(`club:${club.id}`);

    const after = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/club`,
    );
    const updated = (after.body.data.clubs as ClubSnapshot[]).find(
      (candidate) => candidate.id === club.id,
    );
    expect(updated?.identity.name).toBe("Grinta United");
    expect(updated?.identity.shortCode).toBe("GRU");
  });

  it("expectedVersion errado → REJECTED (concorrência otimista)", async () => {
    const before = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/club`,
    );
    const club = (before.body.data.clubs as ClubSnapshot[])[0]!;

    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "club:command",
        worldId,
        expectedVersion: 999,
        idempotencyKey: "club-stale-1",
        correlationId: "corr-c",
        payload: {
          clubId: club.id,
          actorId: "operador",
          occurredAt: "2026-01-01",
          command: { type: "UpdateClubIdentity", name: "X", shortCode: "XXX" },
        },
      });
    expect(response.body.status).toBe("REJECTED");
  });

  it("club:command sem expectedVersion → REJECTED", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "club:command",
        worldId,
        idempotencyKey: "club-noversion",
        correlationId: "corr-c",
        payload: {
          clubId: "00000000-0000-7000-8000-000000000000",
          actorId: "op",
          occurredAt: "2026-01-01",
          command: { type: "UpdateClubIdentity", name: "X", shortCode: "XXX" },
        },
      });
    expect(response.body.status).toBe("REJECTED");
    expect(response.body.error.code).toBe("COMMAND_PAYLOAD_INVALID");
  });
});
