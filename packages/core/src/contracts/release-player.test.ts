import { describe, expect, it } from "vitest";

import { SquadCategory, type SquadSnapshot } from "../clubs/club-types.js";
import type { SquadRepository } from "../clubs/squad-repository.js";

import {
  ContractStatus,
  type ContractRepository,
  type PlayerContractSnapshot,
} from "./contract-types.js";
import {
  ReleasePlayer,
  type ReleaseRepositories,
  type ReleaseUnitOfWork,
} from "./release-player.js";

const WORLD = "019f0000-0000-7000-8000-000000000001";
const CLUB = "019f0000-0000-7000-8000-0000000000a1";
const PLAYER = "019f0000-0000-7000-8000-0000000000c3";

function squad(playerIds: readonly string[]): SquadSnapshot {
  return {
    id: "sq-1" as never,
    gameWorldId: WORLD as never,
    clubId: CLUB as never,
    name: "Elenco",
    category: SquadCategory.FIRST_TEAM,
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
  public squad: SquadSnapshot = squad([PLAYER, "p2"]);
  public contracts: PlayerContractSnapshot[] = [];
  public checkpoint(): () => void {
    const s = this.squad;
    const c = [...this.contracts];
    return () => {
      this.squad = s;
      this.contracts = c;
    };
  }
}

function fakeUnitOfWork(world: FakeWorld): ReleaseUnitOfWork {
  const squads: SquadRepository = {
    findFirstTeamSquad: () => Promise.resolve(world.squad),
    findYouthSquad: () => Promise.resolve(null),
    findSquadById: () => Promise.resolve(null),
    saveSquad: (snapshot) => {
      world.squad = snapshot;
      return Promise.resolve();
    },
  };
  const contracts: ContractRepository = {
    findActiveByPlayer: (_w, playerId) =>
      Promise.resolve(
        world.contracts.find(
          (c) => c.playerId === playerId && c.status === ContractStatus.ACTIVE,
        ) ?? null,
      ),
    saveContract: (snapshot) => {
      const at = world.contracts.findIndex((c) => c.id === snapshot.id);
      if (at >= 0) world.contracts[at] = snapshot;
      else world.contracts.push(snapshot);
      return Promise.resolve();
    },
  };
  const repos: ReleaseRepositories = { squads, contracts };
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

const input = {
  gameWorldId: WORLD,
  clubId: CLUB,
  playerId: PLAYER,
  occurredOn: "2026-01-01",
};

describe("ReleasePlayer — dispensar (C6)", () => {
  it("tira o jogador do elenco e encerra o contrato ativo", async () => {
    const world = new FakeWorld();
    world.contracts.push({
      id: "c1",
      gameWorldId: WORLD as never,
      playerId: PLAYER,
      clubId: CLUB,
      currencyId: "cur",
      status: ContractStatus.ACTIVE,
      startSeason: 1,
      endSeason: 4,
      salaryPerSeasonMinor: 100n,
      signingBonusMinor: 0n,
      releaseClauseMinor: null,
      version: 1,
    });

    const result = await new ReleasePlayer(fakeUnitOfWork(world)).execute(input);
    expect(result.ok).toBe(true);
    expect(world.squad.memberships.some((m) => m.playerId === PLAYER)).toBe(
      false,
    );
    expect(world.contracts[0]!.status).toBe(ContractStatus.TERMINATED);
  });

  it("dispensa jovem sem contrato (R-189) — só tira do elenco", async () => {
    const world = new FakeWorld();
    const result = await new ReleasePlayer(fakeUnitOfWork(world)).execute(input);
    expect(result.ok).toBe(true);
    expect(world.squad.memberships).toHaveLength(1);
  });

  it("recusa quem não está no elenco", async () => {
    const world = new FakeWorld();
    const result = await new ReleasePlayer(fakeUnitOfWork(world)).execute({
      ...input,
      playerId: "estranho",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PLAYER_NOT_IN_SQUAD");
  });
});
