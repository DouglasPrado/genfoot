import { describe, expect, it } from "vitest";

import { GameWorld, SEASON_DAYS } from "./game-world.js";
import {
  WorldStatus,
  type GameWorldSnapshot,
  type WorldDomainEvent,
} from "./world-types.js";

type SeasonRolledOver = Extract<WorldDomainEvent, { type: "SeasonRolledOver" }>;

function activeWorld(currentDate: string): GameWorld {
  const snapshot: GameWorldSnapshot = {
    id: "world-1" as never,
    seed: "seed-1",
    name: null,
    description: null,
    bannerKey: null,
    squarePhotoKey: null,
    startDate: "2026-01-01",
    currentDate,
    rulesetVersion: "1.0.0" as never,
    status: WorldStatus.ACTIVE,
    worldSequence: 0,
    version: 1,
  };
  const loaded = GameWorld.fromSnapshot(snapshot);
  if (!loaded.ok) throw loaded.error;
  return loaded.value;
}

function rollovers(world: GameWorld): SeasonRolledOver[] {
  return world
    .pullDomainEvents()
    .filter((event): event is SeasonRolledOver => event.type === "SeasonRolledOver");
}

describe("GameWorld.advanceDays — virada de temporada", () => {
  it("não vira dentro da mesma temporada", () => {
    const world = activeWorld("2026-01-01");
    const advanced = world.advanceDays(10);
    expect(advanced.ok).toBe(true);
    expect(rollovers(world)).toHaveLength(0);
  });

  it("cruzar SEASON_DAYS emite exatamente uma virada da temporada que acabou", () => {
    const world = activeWorld("2026-01-01");
    world.advanceDays(SEASON_DAYS);
    const events = rollovers(world);
    expect(events).toHaveLength(1);
    expect(events[0]?.payload).toMatchObject({ seasonNumber: 1 });
  });

  it("um dia antes da fronteira ainda não vira", () => {
    const world = activeWorld("2026-01-01");
    world.advanceDays(SEASON_DAYS - 1);
    expect(rollovers(world)).toHaveLength(0);
  });

  it("cruzar duas fronteiras emite duas viradas, das temporadas 1 e 2", () => {
    const world = activeWorld("2026-01-01");
    world.advanceDays(SEASON_DAYS * 2);
    const seasons = rollovers(world).map((event) => event.payload.seasonNumber);
    expect(seasons).toEqual([1, 2]);
  });

  it("partindo do meio da temporada, vira ao alcançar a fronteira", () => {
    const world = activeWorld("2026-06-01"); // ~151 dias dentro da temporada 1
    world.advanceDays(SEASON_DAYS); // ultrapassa o dia 365
    const events = rollovers(world);
    expect(events).toHaveLength(1);
    expect(events[0]?.payload.seasonNumber).toBe(1);
  });
});
