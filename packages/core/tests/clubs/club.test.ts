import { WorldDate, newEntityId, parseRulesetVersion } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  Club,
  ClubDepartmentKind,
  WorldGenesisGenerator,
  buildClubPortfolioFromGenesis,
} from "../../src/index.js";
import {
  activeWorldSnapshot,
  schedulingWorldId,
} from "../helpers/scheduling-fixtures.js";

const ruleset = parseRulesetVersion("1.0.0");
if (!ruleset.ok) throw ruleset.error;

describe("Club", () => {
  it("keeps one active identity period and immutable history", () => {
    const club = initialClub();
    const changed = club.updateIdentity({
      name: "Clube Renovado",
      shortCode: "REN",
      effectiveOn: date("2026-01-02"),
      rulesetVersion: ruleset.value,
      identityId: newEntityId<"ClubIdentityPeriod">(),
    });

    expect(changed.ok).toBe(true);
    expect(club.snapshot().identity.name).toBe("Clube Renovado");
    expect(club.snapshot().identityHistory).toHaveLength(2);
    expect(club.snapshot().identityHistory[0]?.effectiveThrough).toBe(
      "2026-01-01",
    );
  });

  it("validates department, ticket, commercial and board invariants", () => {
    const club = initialClub();
    expect(
      club.setDepartmentPlan({
        kind: ClubDepartmentKind.TRAINING,
        targetLevel: 11,
        capacity: 50,
      }).ok,
    ).toBe(false);
    expect(
      club.setTicketPrice({
        id: newEntityId<"TicketPricePolicy">(),
        priceMinor: 0,
        effectiveOn: "2026-01-02",
        rulesetVersion: ruleset.value,
      }).ok,
    ).toBe(false);

    expect(
      club.signCommercialAgreement({
        id: newEntityId<"CommercialAgreement">(),
        asset: "SHIRT_FRONT",
        exclusive: true,
        startsOn: "2026-01-01",
        endsOn: "2026-12-31",
        externalAgreementRef: "C9:deal:1",
        rulesetVersion: ruleset.value,
      }).ok,
    ).toBe(true);
    expect(
      club.signCommercialAgreement({
        id: newEntityId<"CommercialAgreement">(),
        asset: "SHIRT_FRONT",
        exclusive: true,
        startsOn: "2026-06-01",
        endsOn: "2027-01-01",
        externalAgreementRef: "C9:deal:2",
        rulesetVersion: ruleset.value,
      }).ok,
    ).toBe(false);
    expect(
      club.recordBoardDecision({
        id: newEntityId<"BoardDecision">(),
        decisionType: "RECOVERY_PLAN",
        authorId: "board:1",
        justification: "",
        effectiveFrom: "2026-01-01",
        effectiveThrough: null,
        recordedAt: "2026-01-01",
        rulesetVersion: ruleset.value,
      }).ok,
    ).toBe(false);
  });
});

function initialClub(): Club {
  const world = activeWorldSnapshot(schedulingWorldId());
  const genesis = new WorldGenesisGenerator().generate(world);
  const snapshot = buildClubPortfolioFromGenesis(world, genesis).clubs[0]!;
  const club = Club.fromSnapshot(snapshot);
  if (!club.ok) throw club.error;
  return club.value;
}

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}
