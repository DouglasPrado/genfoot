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

    const send = (
      commandType: string,
      payload: Record<string, unknown>,
      key: string,
    ) =>
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

  /**
   * O que este teste media antes: `registeredCommandTypes().length >= 120`.
   *
   * Era a métrica que produziu o problema. Largura de catálogo não é progresso:
   * os 148 commands foram construídos sobre 16 mega-agregados antes de qualquer
   * cliente provar que eram os certos, e o resultado foi 16 contextos completos
   * convivendo com 11 de 114 telas. Um teste que exige ≥120 PREMIA seguir
   * construindo às cegas e falha quando se apaga o que não se usa.
   *
   * O que ele mede agora: que o catálogo é exatamente o que uma vertical viva
   * exige, e que cada command nele é alcançável (o teste abaixo). Quando um
   * contexto voltar, este número sobe junto — nunca antes.
   */
  it("o catálogo é exatamente o que a vertical viva exige", () => {
    expect([...registeredCommandTypes()].sort()).toEqual([
      // BC-003 pela tela do clube no mobile (MF-25). Faltava aqui: eu o
      // registrei em 608fd99 e não atualizei esta lista — o gate ficou vermelho
      // nesse commit, e eu não vi porque rodei a suíte sem `DATABASE_URL` e
      // tomei o erro dos e2e por ambiental.
      "club:apply-identity",
      "identity:confirm-onboarding",
      "identity:end-club-control",
      "identity:join-world",
      "identity:release-club-reservation",
      "identity:request-switch",
      "identity:reserve-club",
      "world:activate",
      // O ciclo de vida operacional: a aba de Configurações do admin os despacha.
      // Sobem aqui porque uma tela viva os exige — que é a regra desta lista.
      "world:archive",
      "world:create",
      "world:delete",
      "world:genesis",
      "world:pause",
      "world:resume",
      "world:set-identity",
    ]);
  });

  it("GET /commands/catalog lista commands e queries para descoberta", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/commands/catalog",
    );
    expect(response.status).toBe(200);
    expect(response.body.commandCount).toBe(15);
    expect(response.body.commands).toContain("world:genesis");
    expect(response.body.commands).toContain("world:pause");
    expect(response.body.commands).toContain("identity:reserve-club");
    expect([...response.body.queries].sort()).toEqual([
      "club",
      "club-detail",
      // A tabela da liga (C7): derivada dos jogos terminados.
      "competitions",
      "identity",
      "identity-detail",
      // O resumo financeiro (M-02): contas, lançamentos, caixa por clube (C9).
      "ledger",
      // O elenco (M-03): recorte fino por clubId. Faltava aqui — eu registrei o
      // handler e não atualizei esta lista, o mesmo descuido do club:apply-identity.
      "roster",
    ]);
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
      if (
        response.status === 201 &&
        !VALID_STATUSES.has(response.body.status)
      ) {
        failures.push(
          `${commandType} → status inválido ${response.body.status}`,
        );
      }
    }
    expect(failures).toEqual([]);
  });
});
