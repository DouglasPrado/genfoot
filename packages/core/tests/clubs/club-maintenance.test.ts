import { describe, expect, it } from "vitest";

import {
  WorldGenesisGenerator,
  buildClubPortfolioFromGenesis,
  processClubMaintenanceDay,
} from "../../src/index.js";
import {
  activeWorldSnapshot,
  schedulingWorldId,
} from "../helpers/scheduling-fixtures.js";

describe("club maintenance", () => {
  it("processes one logical day once and deteriorates on the monthly cadence", () => {
    const world = activeWorldSnapshot(schedulingWorldId());
    const genesis = new WorldGenesisGenerator().generate(world);
    const portfolio = buildClubPortfolioFromGenesis(world, genesis);

    const first = processClubMaintenanceDay(portfolio, "2026-01-31");
    if (!first.ok) throw first.error;
    const retry = processClubMaintenanceDay(first.value, "2026-01-31");
    if (!retry.ok) throw retry.error;

    expect(first.value.clubs[0]!.stadium.condition).toBe(99);
    expect(retry.value).toEqual(first.value);
  });
});
