import { describe, expect, it } from "vitest";

import { SquadCategory, type SquadSnapshot } from "../clubs/club-types.js";
import type { SquadRepository } from "../clubs/squad-repository.js";

import {
  PromoteYouthPlayer,
  type PromoteYouthRepositories,
  type PromoteYouthUnitOfWork,
} from "./promote-youth.js";

const WORLD = "019f0000-0000-7000-8000-000000000001";
const CLUB = "019f0000-0000-7000-8000-0000000000a1";
const JOVEM = "019f0000-0000-7000-8000-0000000000c3";

function squad(
  id: string,
  category: SquadCategory,
  playerIds: readonly string[],
): SquadSnapshot {
  return {
    id: id as never,
    gameWorldId: WORLD as never,
    clubId: CLUB as never,
    name: `Elenco ${category}`,
    category,
    seasonNumber: 1,
    version: 1,
    memberships: playerIds.map((playerId, index) => ({
      playerId: playerId as never,
      shirtNumber: index + 1,
      role: null,
      effectiveFrom: "2026-01-01",
    })),
  };
}

class FakeWorld {
  public squads = new Map<SquadCategory, SquadSnapshot>();
  public checkpoint(): () => void {
    const snapshot = new Map(this.squads);
    return () => {
      this.squads = snapshot;
    };
  }
}

function fakeUnitOfWork(world: FakeWorld): PromoteYouthUnitOfWork {
  const repos: PromoteYouthRepositories = {
    squads: {
      findFirstTeamSquad: () =>
        Promise.resolve(world.squads.get(SquadCategory.FIRST_TEAM) ?? null),
      findYouthSquad: () =>
        Promise.resolve(world.squads.get(SquadCategory.YOUTH_ACADEMY) ?? null),
      findSquadById: () => Promise.resolve(null),
      saveSquad: (snapshot) => {
        world.squads.set(snapshot.category, snapshot);
        return Promise.resolve();
      },
    } satisfies SquadRepository,
  };
  return {
    run: async (work) => {
      const rollback = world.checkpoint();
      try {
        return await work(repos);
      } catch (error) {
        rollback();
        throw error;
      }
    },
  };
}

function arrange() {
  const world = new FakeWorld();
  world.squads.set(
    SquadCategory.YOUTH_ACADEMY,
    squad("youth-1", SquadCategory.YOUTH_ACADEMY, [JOVEM, "j2", "j3"]),
  );
  world.squads.set(
    SquadCategory.FIRST_TEAM,
    squad("first-1", SquadCategory.FIRST_TEAM, ["p1", "p2"]),
  );
  return world;
}

const input = {
  gameWorldId: WORLD,
  clubId: CLUB,
  playerId: JOVEM,
  occurredOn: "2026-01-01",
};

describe("PromoteYouthPlayer — subir da base ao profissional (C8)", () => {
  it("move o jovem da base para o profissional, num só commit", async () => {
    const world = arrange();
    const result = await new PromoteYouthPlayer(fakeUnitOfWork(world)).execute(
      input,
    );
    expect(result.ok).toBe(true);

    const youth = world.squads.get(SquadCategory.YOUTH_ACADEMY)!;
    const first = world.squads.get(SquadCategory.FIRST_TEAM)!;
    expect(youth.memberships.some((m) => m.playerId === JOVEM)).toBe(false);
    expect(first.memberships.some((m) => m.playerId === JOVEM)).toBe(true);
    expect(first.memberships).toHaveLength(3);
  });

  it("recusa quem não está na base — sem mexer em nada", async () => {
    const world = arrange();
    const result = await new PromoteYouthPlayer(fakeUnitOfWork(world)).execute({
      ...input,
      playerId: "estranho",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PLAYER_NOT_IN_YOUTH");
    expect(
      world.squads.get(SquadCategory.FIRST_TEAM)!.memberships,
    ).toHaveLength(2);
  });
});
