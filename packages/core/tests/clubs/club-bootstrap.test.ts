import { describe, expect, it } from "vitest";

import {
  WorldGenesisGenerator,
  buildClubPortfolioFromGenesis,
} from "../../src/index.js";
import {
  activeWorldSnapshot,
  schedulingWorldId,
} from "../helpers/scheduling-fixtures.js";

describe("club portfolio bootstrap", () => {
  it("converts the 16 genesis clubs and squads deterministically", () => {
    const world = activeWorldSnapshot(schedulingWorldId());
    const genesis = new WorldGenesisGenerator().generate(world);
    const first = buildClubPortfolioFromGenesis(world, genesis);
    const replay = buildClubPortfolioFromGenesis(world, genesis);

    expect(first).toEqual(replay);
    expect(first.clubs).toHaveLength(16);
    expect(first.squads).toHaveLength(16);
    expect(
      first.squads.every(({ memberships }) => memberships.length === 23),
    ).toBe(true);
    expect(
      first.clubs.every(({ gameWorldId }) => gameWorldId === world.id),
    ).toBe(true);
  });
});
