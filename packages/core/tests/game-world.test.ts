import {
  WorldDate,
  newGameWorldId,
  parseRulesetVersion,
  type RulesetVersion,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldStatus,
  type WorldProvisioningEvidence,
} from "../src/index.js";

function ruleset(): RulesetVersion {
  const parsed = parseRulesetVersion("1.0.0");
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function date(value = "2026-01-01"): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function createWorld(): GameWorld {
  const result = GameWorld.create({
    id: newGameWorldId(),
    seed: "grinta-001",
    startDate: date(),
    rulesetVersion: ruleset(),
  });
  if (!result.ok) throw result.error;
  return result.value;
}

function validEvidence(): WorldProvisioningEvidence {
  return {
    generatedClubCount: 16,
    clubsWithValidSquads: 16,
    generatedPlayerCount: 368,
    playersPerSquad: 23,
    calendarValidated: true,
    rulesetVersion: ruleset(),
  };
}

describe("GameWorld", () => {
  it("nasce em CREATING com seed, data e ruleset imutáveis", () => {
    const snapshot = createWorld().snapshot();

    expect(snapshot).toMatchObject({
      seed: "grinta-001",
      startDate: "2026-01-01",
      currentDate: "2026-01-01",
      rulesetVersion: "1.0.0",
      status: WorldStatus.CREATING,
      worldSequence: 0,
      version: 1,
    });
  });

  it("rejeita ativação sem gênese completa", () => {
    const world = createWorld();
    const result = world.activate({
      ...validEvidence(),
      generatedPlayerCount: 367,
    } as unknown as WorldProvisioningEvidence);

    expect(result.ok).toBe(false);
    expect(world.snapshot().status).toBe(WorldStatus.CREATING);
  });

  it("ativa com evidência completa e emite eventos ordenados", () => {
    const world = createWorld();
    const result = world.activate(validEvidence());

    expect(result.ok).toBe(true);
    expect(world.snapshot()).toMatchObject({
      status: WorldStatus.ACTIVE,
      worldSequence: 2,
    });
    expect(world.pullDomainEvents().map((event) => event.type)).toEqual([
      "WorldCreated",
      "WorldActivated",
    ]);
  });

  it("não altera um mundo inativo quando o avanço é rejeitado", () => {
    const world = createWorld();
    const before = world.snapshot();
    const result = world.advanceDays(1);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORLD_NOT_ACTIVE");
    expect(world.snapshot()).toEqual(before);
  });

  it("avança um mundo ativo um dia por vez", () => {
    const world = createWorld();
    world.activate(validEvidence());
    world.pullDomainEvents();

    const result = world.advanceDays(3);
    const events = world.pullDomainEvents();

    expect(result.ok).toBe(true);
    expect(world.snapshot()).toMatchObject({
      currentDate: "2026-01-04",
      worldSequence: 5,
      version: 6,
    });
    expect(
      events.map((event) => [event.type, event.worldDate, event.worldSequence]),
    ).toEqual([
      ["WorldDayAdvanced", "2026-01-02", 3],
      ["WorldDayAdvanced", "2026-01-03", 4],
      ["WorldDayAdvanced", "2026-01-04", 5],
    ]);
  });

  /**
   * Ciclo de vida operacional: EM BREVE → ATIVO → (CONGELADO ⇄ ATIVO | INATIVO).
   *
   * Antes daqui só existia UMA transição — `#status = ACTIVE` dentro de
   * `activate()`. `PAUSED`, `FINISHED` e `ARCHIVED` estavam no enum sem que
   * nenhuma linha os atribuísse: valores mortos.
   *
   * `FINISHED` continua fora: é fim de temporada (AF-08), não decisão de
   * operador, e não tem dono enquanto C7 não existir.
   */
  describe("ciclo de vida", () => {
    function activeWorld(): GameWorld {
      const world = createWorld();
      const activated = world.activate(validEvidence());
      if (!activated.ok) throw activated.error;
      world.pullDomainEvents();
      return world;
    }

    function pausedWorld(): GameWorld {
      const world = activeWorld();
      const paused = world.pause();
      if (!paused.ok) throw paused.error;
      world.pullDomainEvents();
      return world;
    }

    describe("congelar", () => {
      it("ACTIVE → PAUSED, e emite WorldPaused", () => {
        const world = activeWorld();

        const result = world.pause();

        expect(result.ok).toBe(true);
        expect(world.snapshot().status).toBe(WorldStatus.PAUSED);
        expect(world.pullDomainEvents().map((e) => e.type)).toEqual([
          "WorldPaused",
        ]);
      });

      it("congelar PARA o relógio — é o que 'congelado' significa", () => {
        // `advanceDays` já exigia ACTIVE antes deste ciclo de vida existir, então
        // a garantia sai de graça. O teste existe porque é a razão de ser do
        // estado: se algum dia alguém afrouxar a checagem lá, isto reprova aqui.
        const world = pausedWorld();

        const result = world.advanceDays(1);

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("esperava falha");
        expect(result.error.code).toBe("WORLD_NOT_ACTIVE");
        expect(world.snapshot().currentDate).toBe("2026-01-01");
      });

      it("mundo em CREATING não congela: não há o que congelar", () => {
        const result = createWorld().pause();

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("esperava falha");
        expect(result.error.code).toBe("INVALID_WORLD_TRANSITION");
      });

      it("congelar duas vezes é erro, não silêncio", () => {
        const result = pausedWorld().pause();

        expect(result.ok).toBe(false);
      });
    });

    describe("descongelar", () => {
      it("PAUSED → ACTIVE, e o relógio volta a andar", () => {
        const world = pausedWorld();

        const result = world.resume();

        expect(result.ok).toBe(true);
        expect(world.snapshot().status).toBe(WorldStatus.ACTIVE);
        expect(world.pullDomainEvents().map((e) => e.type)).toEqual([
          "WorldResumed",
        ]);
        expect(world.advanceDays(1).ok).toBe(true);
      });

      it("descongelar NÃO repete a prova de gênese", () => {
        // `activate()` exige `WorldProvisioningEvidence` porque a gênese acabou
        // de rodar. Voltar de CONGELADO não gera clube nenhum — exigir a mesma
        // prova seria pedir ao operador que provasse de novo o que já é fato no
        // banco. Por isso `resume()` não recebe evidência.
        const world = pausedWorld();

        expect(world.resume().ok).toBe(true);
      });

      it("mundo ATIVO não descongela: já está andando", () => {
        const result = activeWorld().resume();

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("esperava falha");
        expect(result.error.code).toBe("INVALID_WORLD_TRANSITION");
      });
    });

    /**
     * Inativar = arquivar, e **R-56 manda aqui**: "o mundo entra em estado
     * read-only — histórico, títulos e recordes preservados; nenhuma partida
     * nova roda —, **reversível por decisão administrativa**".
     *
     * A primeira versão disto fazia ARCHIVED terminal, e estava errada: contraria
     * uma decisão ratificada, o que o CLAUDE.md §2 proíbe sem decisão nova.
     * Terminal é `world:delete`, que apaga; arquivar preserva.
     */
    describe("inativar (arquivar · R-56)", () => {
      function archivedWorld(): GameWorld {
        const world = activeWorld();
        const result = world.archive();
        if (!result.ok) throw result.error;
        world.pullDomainEvents();
        return world;
      }

      it("ACTIVE → ARCHIVED, e emite WorldArchived", () => {
        const world = activeWorld();

        const result = world.archive();

        expect(result.ok).toBe(true);
        expect(world.snapshot().status).toBe(WorldStatus.ARCHIVED);
        expect(world.pullDomainEvents().map((e) => e.type)).toEqual([
          "WorldArchived",
        ]);
      });

      it("CONGELADO → INATIVO também vale: congelar não é pré-requisito", () => {
        const world = pausedWorld();

        expect(world.archive().ok).toBe(true);
        expect(world.snapshot().status).toBe(WorldStatus.ARCHIVED);
      });

      it("é read-only: nenhuma partida nova roda", () => {
        const result = archivedWorld().advanceDays(1);

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("esperava falha");
        expect(result.error.code).toBe("WORLD_NOT_ACTIVE");
      });

      it("é REVERSÍVEL por decisão administrativa (R-56)", () => {
        const world = archivedWorld();

        const result = world.resume();

        expect(result.ok).toBe(true);
        expect(world.snapshot().status).toBe(WorldStatus.ACTIVE);
        expect(world.pullDomainEvents().map((e) => e.type)).toEqual([
          "WorldResumed",
        ]);
        expect(world.advanceDays(1).ok).toBe(true);
      });

      it("reabrir preserva a história: seed, datas e sequência seguem intactas", () => {
        // "histórico, títulos e recordes preservados" (R-56). Arquivar não é
        // reset: o que muda é o status, e nada mais.
        const world = archivedWorld();
        const before = world.snapshot();

        world.resume();
        const after = world.snapshot();

        expect(after).toMatchObject({
          seed: before.seed,
          startDate: before.startDate,
          currentDate: before.currentDate,
        });
        expect(after.worldSequence).toBeGreaterThan(before.worldSequence);
      });

      it("arquivar duas vezes é erro, não silêncio", () => {
        expect(archivedWorld().archive().ok).toBe(false);
      });

      it("mundo arquivado não congela: descongele primeiro", () => {
        const result = archivedWorld().pause();

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("esperava falha");
        expect(result.error.code).toBe("INVALID_WORLD_TRANSITION");
      });
    });

    describe("a regra que o pedido fez questão: ativo não volta atrás", () => {
      it("nenhuma transição devolve o mundo para CREATING", () => {
        // A garantia estrutural: só `create()` produz CREATING, e `activate()`
        // é o único caminho para fora dele. Este teste percorre todas as
        // transições existentes e verifica que nenhuma reabre a porta.
        const world = activeWorld();

        world.pause();
        world.resume();
        world.pause();
        world.archive();
        world.resume();

        expect(world.snapshot().status).not.toBe(WorldStatus.CREATING);
      });

      it("mundo ATIVO não volta a ser ativável (activate é uma vez só)", () => {
        const result = activeWorld().activate(validEvidence());

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("esperava falha");
        expect(result.error.code).toBe("INVALID_WORLD_TRANSITION");
      });

      it("mundo CONGELADO não volta pela porta da gênese", () => {
        // Sem isto, `activate()` num mundo PAUSED seria a brecha que traz o
        // mundo de volta ao caminho de criação — com evidência de gênese e tudo.
        const result = pausedWorld().activate(validEvidence());

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("esperava falha");
        expect(result.error.code).toBe("INVALID_WORLD_TRANSITION");
      });
    });

    it("identidade é independente do ciclo de vida: renomear não move o status", () => {
      const world = activeWorld();

      world.setIdentity({ name: "Série R — Beta" });

      expect(world.snapshot().status).toBe(WorldStatus.ACTIVE);
    });

    it("cada transição avança versão e sequência: o lock otimista continua valendo", () => {
      const world = activeWorld();
      const before = world.snapshot();

      world.pause();
      const after = world.snapshot();

      expect(after.version).toBe(before.version + 1);
      expect(after.worldSequence).toBe(before.worldSequence + 1);
    });
  });
});
