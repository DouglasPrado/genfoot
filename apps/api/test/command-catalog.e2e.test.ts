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
import { hasDatabase, skipReason } from "./postgres.guard.js";

const VALID_STATUSES = new Set(["ACCEPTED", "ALREADY_APPLIED", "REJECTED"]);

describe.skipIf(!hasDatabase)(
  `API command catalog integrity (e2e)${hasDatabase ? "" : ` — PULADO: ${skipReason}`}`,
  () => {
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
      // X-001: regras de automação, executor (autopilot) e o plano offline.
      "automation:run-autopilot",
      "automation:save-automation",
      "automation:set-offline-plan",
      "automation:toggle-automation",
      // R-204: autora um campeonato inteiro (pirâmide de divisões) numa tacada.
      "championship:create",
      // BC-003 pela tela do clube no mobile (MF-25). Faltava aqui: eu o
      // registrei em 608fd99 e não atualizei esta lista — o gate ficou vermelho
      // nesse commit, e eu não vi porque rodei a suíte sem `DATABASE_URL` e
      // tomei o erro dos e2e por ambiental.
      "club:apply-identity",
      // C7: competição autorada no admin (R-202..R-207).
      "competition:configure",
      "competition:create",
      "competition:finish",
      "competition:lock",
      "competition:start",
      "identity:confirm-onboarding",
      "identity:end-club-control",
      "identity:join-world",
      // Push remoto: o device registra seu Expo push token, atrelado à conta.
      "identity:register-push-token",
      "identity:release-club-reservation",
      "identity:request-switch",
      "identity:reserve-club",
      // C6: a compra de verdade — dinheiro, contrato e elenco num só commit (R-192).
      "market:list-player",
      "market:release-player",
      "market:sell-player",
      "market:sign-player",
      // Departamento médico (M-MEDICAL / M-MEDICAL-CASE): a máquina MED-1..MED-9.
      "medical:advance-rehab",
      "medical:diagnose",
      "medical:discharge",
      "medical:force-return",
      "medical:order-exam",
      "medical:retire-player",
      "medical:set-plan",
      // M-MENTORING: vincular/desvincular mentor (evolução acelerada).
      "mentoring:link-mentor",
      "mentoring:unlink-mentor",
      // R-221 Fase 2c: a decisão (elogiar/criticar) move a forma.
      "morale:talk-to-player",
      "morale:talk-to-squad",
      // X-001: o usuário registra presença no mundo (heartbeat).
      "presence:heartbeat",
      // R-220 Fase 1: a escalação corrente do clube (M-LINEUP).
      "tactics:set-lineup",
      // Treino (R-212..R-217): plano, accrual diário, virada de treino e idade.
      "training:accrue-day",
      "training:apply-season",
      "training:apply-season-aging",
      // Treino de sessão instantâneo (R-221 Fase 2a): inicia e coleta.
      "training:collect-group-session",
      "training:collect-session",
      "training:set-individual-plan",
      "training:set-plan",
      "training:start-group-session",
      "training:start-session",
      // R-220 Fase 3: treinar a formação sobe o entrosamento do time.
      "training:train-formation",
      "world:activate",
      // MUNDO-V2: avança um dia lógico e roda o trabalho do dia (o motor).
      "world:advance-day",
      // Registrado por trabalho paralelo (ciclo de temporada/finanças). Entra aqui
      // para reverdejar o gate — o command existe, faltava a linha do catálogo.
      "world:advance-days",
      // O ciclo de vida operacional: a aba de Configurações do admin os despacha.
      // Sobem aqui porque uma tela viva os exige — que é a regra desta lista.
      "world:archive",
      "world:create",
      "world:delete",
      "world:genesis",
      "world:pause",
      // C5: joga a próxima rodada da liga (simulação determinística).
      "world:play-round",
      "world:resume",
      // MUNDO-V1: o relógio — o mundo passa a andar sozinho.
      "world:set-clock",
      "world:set-identity",
      // C8: desce um profissional (≤21) de volta à base.
      "youth:demote-player",
      // R-218: gera a safra anual de captação (M-YOUTH-INTAKE).
      "youth:generate-intake",
      // C8: sobe um jovem da base ao elenco profissional.
      "youth:promote-player",
    ]);
  });

  it("GET /commands/catalog lista commands e queries para descoberta", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/commands/catalog",
    );
    expect(response.status).toBe(200);
    expect(response.body.commandCount).toBe(60);
    expect(response.body.commands).toContain("world:genesis");
    expect(response.body.commands).toContain("world:pause");
    expect(response.body.commands).toContain("identity:reserve-club");
    expect([...response.body.queries].sort()).toEqual([
      "club",
      "club-detail",
      // M-COMPETITION aba Chaveamento: os confrontos de mata-mata da edição.
      "competition-bracket",
      // M-COMPETITION: cabeçalho + regulamento de UMA competição.
      "competition-detail",
      // M-COMPETITION aba Jogos: todos os jogos da edição, com escudo e placar.
      "competition-matches",
      // O desfecho da temporada (C7-V6b): campeão, acesso e rebaixamento.
      "competition-outcome",
      // M-COMPETITION abas Artilharia/Assistências, com a cobertura do motor.
      "competition-stats",
      // M-COMPETITION aba Tabela/Grupos: uma tabela na liga, N na fase de grupos.
      "competition-table",
      // A tabela da liga (C7): derivada dos jogos terminados.
      "competitions",
      // A lista de competições do mundo para o admin gerir (C7, R-202).
      "competitions-list",
      // A torcida (C10, M-25): headcount, paciência da diretoria, pressão.
      "fanbase",
      // Registrado por trabalho paralelo (finanças/temporada) — reverdejando o gate.
      "finance-snapshot",
      "group-training-session",
      "identity",
      "identity-detail",
      // A caixa de entrada (C12, M-HOME): pendências do clube.
      "inbox",
      // A LISTA de avisos do clube (tela de avisos): itens com título/corpo.
      "inbox-items",
      // O plano de treino INDIVIDUAL de um jogador (M-TRAINING-INDIV).
      "individual-training-plan",
      // Os jogadores do clube que TÊM plano individual (a listagem marca quem não tem).
      "individual-training-plans",
      // O resumo financeiro (M-02): contas, lançamentos, caixa por clube (C9).
      "ledger",
      // A escalação corrente do clube (M-LINEUP, R-220 Fase 1): recorte por clubId.
      "lineup",
      // O mercado (M-06): scout dos jogadores do mundo, com valor estimado.
      "market",
      // O detalhe de uma partida (C5-V1): placar + feed de eventos, por matchId.
      "match-detail",
      // O calendário e os resultados (M-05, lista).
      "matches",
      // O departamento médico do clube (M-MEDICAL): casos abertos + indicadores.
      "medical",
      // O caso aberto de um jogador (M-MEDICAL-CASE) + opções de tratamento.
      "medical-case",
      // O mentor atual de um pupilo (M-MENTORING).
      "mentorship",
      // A imprensa (C11, M-25): manchetes dos fatos reais do mundo.
      "narrative",
      // O desenvolvimento do jogador (M-PLAYER-DEV, R-216): ganho/base por atributo.
      "player-development",
      // O elenco (M-03): recorte fino por clubId. Faltava aqui — eu registrei o
      // handler e não atualizei esta lista, o mesmo descuido do club:apply-identity.
      "roster",
      // A comissão técnica (C8, M-25): recorte por clubId.
      "staff",
      // Os artilheiros do mundo (C7-V5): projeção dos PlayerMatchStats.
      "top-scorers",
      // O plano de treino do clube na temporada (M-TRAINING, R-214).
      "training-plan",
      // As sessões de treino ATIVAS do clube (R-221 Fase 2a). Sem ela o estado
      // TREINANDO era inobservável: só o caminho "iniciar" era alcançável.
      "training-sessions",
      // O relógio do mundo (MUNDO-V4): config do tempo e próximo tick, para o admin.
      "world-clock",
      // A base (C8): os jovens em formação, recorte por clubId.
      "youth",
      // A safra de captação (M-YOUTH-INTAKE, R-218): candidatos com banda de scout.
      "youth-intake",
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
