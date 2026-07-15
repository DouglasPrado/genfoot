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
  readonly version: number;
  readonly identity: {
    readonly name: string;
    readonly shortCode: string;
    readonly visualIdentity?: {
      readonly primaryColor: string;
      readonly homeKitTemplateId: string;
      readonly crestTemplateId: string;
    };
  };
}

const visualIdentity = {
  primaryColor: "#C2F74A",
  secondaryColor: "#0A0B0D",
  tertiaryColor: null,
  homeKitTemplateId: "kit-stripes",
  awayKitTemplateId: "kit-solid",
  crestTemplateId: "crest-shield",
};

/**
 * E2E da personalização de clube (Fase 1 / C3): exercita o caminho HTTP
 * completo — comando UpdateClubVisualIdentity, unicidade de nome no mundo e a
 * persistência real (Zod) preservando a identidade visual na projeção.
 */
describe("API club customization (e2e)", () => {
  let app: INestApplication;
  let dataDirectory: string;
  let worldId = "";

  function command(overrides: Record<string, unknown>) {
    return {
      contractVersion: "v1",
      commandType: "world:create",
      payload: {},
      correlationId: "corr-cust",
      ...overrides,
    };
  }

  async function readClubs(): Promise<ClubSnapshot[]> {
    const response = await request(app.getHttpServer()).get(
      `/api/v1/worlds/${worldId}/club`,
    );
    return response.body.data.clubs as ClubSnapshot[];
  }

  beforeAll(async () => {
    dataDirectory = await mkdtemp(join(tmpdir(), "grinta-apicust-"));
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
          payload: { seed: "cust-seed", startDate: "2026-01-01" },
          idempotencyKey: "cust-create",
        }),
      );
    worldId = String(created.body.resource).slice("world:".length);
    await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        command({
          commandType: "world:genesis",
          worldId,
          idempotencyKey: "cust-gen",
        }),
      );
    await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send(
        command({
          commandType: "world:activate",
          worldId,
          idempotencyKey: "cust-act",
        }),
      );
  });

  afterAll(async () => {
    await app.close();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it("UpdateClubVisualIdentity persiste nome e identidade visual na projeção", async () => {
    const club = (await readClubs())[0]!;

    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "club:command",
        worldId,
        expectedVersion: club.version,
        idempotencyKey: "cust-rebrand-1",
        correlationId: "corr-cust",
        payload: {
          clubId: club.id,
          actorId: "operador",
          occurredAt: "2026-06-15",
          command: {
            type: "UpdateClubVisualIdentity",
            name: "Grinta Fênix",
            shortCode: "GFX",
            visualIdentity,
          },
        },
      });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe("ACCEPTED");

    const updated = (await readClubs()).find(
      (candidate) => candidate.id === club.id,
    );
    expect(updated?.identity.name).toBe("Grinta Fênix");
    // A persistência (Zod) preserva a identidade visual no round-trip.
    expect(updated?.identity.visualIdentity?.primaryColor).toBe("#C2F74A");
    expect(updated?.identity.visualIdentity?.crestTemplateId).toBe(
      "crest-shield",
    );
  });

  it("rejeita nome já usado por outro clube no mundo", async () => {
    const clubs = await readClubs();
    const target = clubs[0]!;
    const otherName = clubs[1]!.identity.name;

    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "club:command",
        worldId,
        expectedVersion: target.version,
        idempotencyKey: "cust-collision-1",
        correlationId: "corr-cust",
        payload: {
          clubId: target.id,
          actorId: "operador",
          occurredAt: "2026-07-01",
          command: {
            type: "UpdateClubVisualIdentity",
            name: otherName,
            shortCode: "DUP",
            visualIdentity,
          },
        },
      });
    expect(response.body.status).toBe("REJECTED");

    // O nome do clube alvo não mudou.
    const after = (await readClubs()).find(
      (candidate) => candidate.id === target.id,
    );
    expect(after?.identity.name).not.toBe(otherName);
  });

  it("rejeita paleta inválida (cor primária malformada)", async () => {
    const target = (await readClubs())[0]!;

    const response = await request(app.getHttpServer())
      .post("/api/v1/commands")
      .send({
        contractVersion: "v1",
        commandType: "club:command",
        worldId,
        expectedVersion: target.version,
        idempotencyKey: "cust-badcolor-1",
        correlationId: "corr-cust",
        payload: {
          clubId: target.id,
          actorId: "operador",
          occurredAt: "2026-07-02",
          command: {
            type: "UpdateClubVisualIdentity",
            name: "Cor Quebrada",
            shortCode: "CQB",
            visualIdentity: { ...visualIdentity, primaryColor: "verde" },
          },
        },
      });
    expect(response.body.status).toBe("REJECTED");
  });
});
