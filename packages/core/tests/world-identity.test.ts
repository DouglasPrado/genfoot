import {
  WorldDate,
  newGameWorldId,
  parseRulesetVersion,
  type RulesetVersion,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import { GameWorld, WorldStatus, type WorldProvisioningEvidence } from "../src/index.js";

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

function evidence(): WorldProvisioningEvidence {
  return {
    generatedClubCount: 20,
    clubsWithValidSquads: 20,
    generatedPlayerCount: 460,
    playersPerSquad: 23,
    calendarValidated: true,
    rulesetVersion: ruleset(),
  };
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

/**
 * Nome e descrição do mundo.
 *
 * **Não são configuração, e a distinção tem consequência.** O schema carimbava
 * `name` como "pendente: vai para GameRuleConfig (R-182)", e o adapter repetia.
 * R-182 não diz isso: o texto dela lista `maxClubs`, `seasonDays` e
 * `initialClubCashMinor` — dimensionamento — e os literais da gênese. O
 * `GameRuleConfig`, por definição própria, é "atalho chave-valor para parâmetros
 * simples de BALANCEAMENTO". Nome de exibição não balanceia nada; é identidade,
 * e identidade é atributo do agregado.
 */
describe("identidade do mundo", () => {
  it("nasce sem nome nem descrição — e isso é ausência, não string vazia", () => {
    const snapshot = createWorld().snapshot();

    expect(snapshot.name).toBeNull();
    expect(snapshot.description).toBeNull();
  });

  it("grava nome e descrição, e emite WorldIdentityChanged", () => {
    const world = createWorld();

    const result = world.setIdentity({
      name: "Série R — Beta",
      description: "Mundo de teste da onda de calibração.",
    });

    expect(result.ok).toBe(true);
    expect(world.snapshot()).toMatchObject({
      name: "Série R — Beta",
      description: "Mundo de teste da onda de calibração.",
    });
    expect(world.pullDomainEvents().map((e) => e.type)).toEqual([
      "WorldIdentityChanged",
    ]);
  });

  describe("atualização parcial: ausente é 'não mexa', não 'apague'", () => {
    it("mudar só o nome preserva a descrição", () => {
      const world = createWorld();
      world.setIdentity({ name: "Antigo", description: "Descrição vale." });

      world.setIdentity({ name: "Novo" });

      expect(world.snapshot()).toMatchObject({
        name: "Novo",
        description: "Descrição vale.",
      });
    });

    it("mudar só a descrição preserva o nome", () => {
      const world = createWorld();
      world.setIdentity({ name: "Nome vale.", description: "Antiga" });

      world.setIdentity({ description: "Nova" });

      expect(world.snapshot().name).toBe("Nome vale.");
    });

    it("null é o comando explícito de limpar", () => {
      const world = createWorld();
      world.setIdentity({ name: "Some", description: "Some também" });

      world.setIdentity({ name: null, description: null });

      expect(world.snapshot()).toMatchObject({ name: null, description: null });
    });
  });

  describe("higiene do texto", () => {
    it("apara os espaços das pontas", () => {
      const world = createWorld();

      world.setIdentity({ name: "  Série R  ", description: "  texto  " });

      expect(world.snapshot()).toMatchObject({
        name: "Série R",
        description: "texto",
      });
    });

    it("só espaços é ausência, não nome", () => {
      // Sem isto, `"   "` viraria um nome que a tela renderiza como vazio — e
      // ninguém entende por que o mundo perdeu o título.
      const world = createWorld();

      world.setIdentity({ name: "   ", description: "  " });

      expect(world.snapshot()).toMatchObject({ name: null, description: null });
    });

    it("recusa nome longo demais em vez de truncar calado", () => {
      const result = createWorld().setIdentity({ name: "x".repeat(61) });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("esperava falha");
      expect(result.error.code).toBe("INVALID_WORLD_NAME");
    });

    it("recusa descrição longa demais", () => {
      const result = createWorld().setIdentity({
        description: "x".repeat(501),
      });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("esperava falha");
      expect(result.error.code).toBe("INVALID_WORLD_DESCRIPTION");
    });

    it("aceita exatamente o limite", () => {
      const world = createWorld();

      expect(world.setIdentity({ name: "x".repeat(60) }).ok).toBe(true);
      expect(world.setIdentity({ description: "x".repeat(500) }).ok).toBe(true);
    });

    it("transição recusada não muda nada nem gasta revisão", () => {
      const world = createWorld();
      world.setIdentity({ name: "Bom nome" });
      world.pullDomainEvents();
      const before = world.snapshot();

      const result = world.setIdentity({ name: "x".repeat(61) });

      expect(result.ok).toBe(false);
      expect(world.snapshot()).toMatchObject({
        name: "Bom nome",
        version: before.version,
      });
      expect(world.pullDomainEvents()).toHaveLength(0);
    });

    it("valida os DOIS campos antes de gravar qualquer um", () => {
      // Nome válido + descrição inválida não pode gravar o nome e falhar depois:
      // metade aplicada é o pior resultado possível.
      const world = createWorld();

      const result = world.setIdentity({
        name: "Nome bom",
        description: "x".repeat(501),
      });

      expect(result.ok).toBe(false);
      expect(world.snapshot().name).toBeNull();
    });
  });

  describe("identidade não é determinismo", () => {
    it("renomear NÃO toca a seed: o mundo continua o mesmo mundo", () => {
      // Seed é entrada do replay (R-182) e `readonly` no agregado. Nome é rótulo.
      const world = createWorld();

      world.setIdentity({ name: "Outro nome" });

      expect(world.snapshot().seed).toBe("grinta-001");
    });

    it("pode renomear em qualquer estado, inclusive arquivado", () => {
      // O read-only de R-56 é sobre simulação — "nenhuma partida nova roda" —,
      // não sobre metadado administrativo. Reabrir um mundo arquivado é decisão
      // administrativa; rotulá-lo também é.
      const world = createWorld();
      const activated = world.activate(evidence());
      if (!activated.ok) throw activated.error;
      const archived = world.archive();
      if (!archived.ok) throw archived.error;

      const result = world.setIdentity({ name: "[Arquivado] Beta" });

      expect(result.ok).toBe(true);
      expect(world.snapshot().status).toBe(WorldStatus.ARCHIVED);
    });
  });

  it("sobrevive ao round-trip pelo snapshot", () => {
    const world = createWorld();
    world.setIdentity({ name: "Persistido", description: "Volta inteiro." });

    const restored = GameWorld.fromSnapshot(world.snapshot());

    if (!restored.ok) throw restored.error;
    expect(restored.value.snapshot()).toMatchObject({
      name: "Persistido",
      description: "Volta inteiro.",
    });
  });
});
