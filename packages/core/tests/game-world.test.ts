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
});
