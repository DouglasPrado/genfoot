import { describe, expect, it } from "vitest";

import { SquadCategory, type SquadSnapshot } from "../clubs/club-types.js";
import type { SquadRepository } from "../clubs/squad-repository.js";
import type {
  PlayerAggregateSnapshot,
  PlayerRepository,
} from "../players/player-repository.js";

import {
  DemoteToYouthPlayer,
  type DemoteToYouthRepositories,
  type DemoteToYouthUnitOfWork,
} from "./demote-to-youth.js";

const WORLD = "019f0000-0000-7000-8000-000000000001";
const CLUB = "019f0000-0000-7000-8000-0000000000a1";
const PRO = "019f0000-0000-7000-8000-0000000000c3";

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
  public birthByPlayer = new Map<string, string>();
  public checkpoint(): () => void {
    const snapshot = new Map(this.squads);
    return () => {
      this.squads = snapshot;
    };
  }
}

function fakeUnitOfWork(world: FakeWorld): DemoteToYouthUnitOfWork {
  const players: PlayerRepository = {
    findPlayerById: (_w, id) => {
      const birthDate = world.birthByPlayer.get(id as string);
      if (birthDate === undefined) return Promise.resolve(null);
      return Promise.resolve({
        person: { birthDate },
      } as unknown as PlayerAggregateSnapshot);
    },
    savePlayer: () => Promise.resolve(),
  };
  const squads: SquadRepository = {
    findFirstTeamSquad: () =>
      Promise.resolve(world.squads.get(SquadCategory.FIRST_TEAM) ?? null),
    findYouthSquad: () =>
      Promise.resolve(world.squads.get(SquadCategory.YOUTH_ACADEMY) ?? null),
    findSquadById: () => Promise.resolve(null),
    saveSquad: (snapshot) => {
      world.squads.set(snapshot.category, snapshot);
      return Promise.resolve();
    },
  };
  const repos: DemoteToYouthRepositories = { squads, players };
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

function arrange(birthDate: string) {
  const world = new FakeWorld();
  world.squads.set(
    SquadCategory.FIRST_TEAM,
    squad("first-1", SquadCategory.FIRST_TEAM, [PRO, "p2", "p3"]),
  );
  world.squads.set(
    SquadCategory.YOUTH_ACADEMY,
    squad("youth-1", SquadCategory.YOUTH_ACADEMY, ["j1"]),
  );
  world.birthByPlayer.set(PRO, birthDate);
  return world;
}

const input = {
  gameWorldId: WORLD,
  clubId: CLUB,
  playerId: PRO,
  worldDate: "2026-01-01",
  occurredOn: "2026-01-01",
};

describe("DemoteToYouthPlayer — voltar à base (C8)", () => {
  it("um jovem profissional (≤ 21) desce para a base, num só commit", async () => {
    const world = arrange("2006-05-01"); // 19 anos em 2026-01-01
    const result = await new DemoteToYouthPlayer(fakeUnitOfWork(world)).execute(
      input,
    );
    expect(result.ok).toBe(true);

    const first = world.squads.get(SquadCategory.FIRST_TEAM)!;
    const youth = world.squads.get(SquadCategory.YOUTH_ACADEMY)!;
    expect(first.memberships.some((m) => m.playerId === PRO)).toBe(false);
    expect(youth.memberships.some((m) => m.playerId === PRO)).toBe(true);
  });

  it("recusa quem já passou dos 21 — sem mexer em nada", async () => {
    const world = arrange("2000-05-01"); // 25 anos
    const result = await new DemoteToYouthPlayer(fakeUnitOfWork(world)).execute(
      input,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PLAYER_TOO_OLD_FOR_YOUTH");
    expect(
      world.squads.get(SquadCategory.YOUTH_ACADEMY)!.memberships,
    ).toHaveLength(1);
  });

  it("recusa quem não está no profissional", async () => {
    const world = arrange("2006-05-01");
    const result = await new DemoteToYouthPlayer(fakeUnitOfWork(world)).execute({
      ...input,
      playerId: "estranho",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PLAYER_NOT_IN_FIRST_TEAM");
  });
});
