import { describe, expect, it } from "vitest";

import {
  Squad,
  WorldGenesisGenerator,
  buildClubPortfolioFromGenesis,
} from "../../src/index.js";
import {
  activeWorldSnapshot,
  schedulingWorldId,
} from "../helpers/scheduling-fixtures.js";

describe("Squad", () => {
  it("rejects duplicate players and occupied slots", () => {
    const squad = initialSquad();
    const first = squad.snapshot().memberships[0]!;
    expect(
      squad.assign({
        playerId: first.playerId,
        slot: "S99",
        category: "RESERVE",
        effectiveFrom: "2026-01-02",
      }).ok,
    ).toBe(false);
    expect(
      squad.assign({
        playerId: "019f5d42-f83e-7000-8000-000000000099" as never,
        slot: first.slot,
        category: "RESERVE",
        effectiveFrom: "2026-01-02",
      }).ok,
    ).toBe(false);
  });

  it("supports a unique external player reference after a slot is freed", () => {
    const squad = initialSquad();
    const removed = squad.snapshot().memberships[0]!;
    expect(squad.remove(removed.playerId).ok).toBe(true);
    expect(
      squad.assign({
        playerId: "019f5d42-f83e-7000-8000-000000000099" as never,
        slot: removed.slot,
        category: "SENIOR",
        effectiveFrom: "2026-01-02",
      }).ok,
    ).toBe(true);
    expect(squad.snapshot().memberships).toHaveLength(23);
  });
});

function initialSquad(): Squad {
  const world = activeWorldSnapshot(schedulingWorldId());
  const genesis = new WorldGenesisGenerator().generate(world);
  const snapshot = buildClubPortfolioFromGenesis(world, genesis).squads[0]!;
  const squad = Squad.fromSnapshot(snapshot);
  if (!squad.ok) throw squad.error;
  return squad.value;
}
