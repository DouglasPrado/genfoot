import { describe, expect, it } from "vitest";

import {
  buildLinkMentorPayload,
  buildUnlinkMentorPayload,
  eligibleMentors,
  type MentorCandidate,
} from "./mentoring-model.js";

const p = (playerId: string, age: number): MentorCandidate => ({
  playerId, name: playerId, primaryPosition: "CM", overall: 60, age,
});

describe("mentoring-model (M-MENTORING)", () => {
  it("elegíveis: mais velhos que o pupilo, sem ele mesmo, veterano primeiro", () => {
    const mentee = p("jovem", 18);
    const roster = [mentee, p("veterano", 34), p("meio", 25), p("outro-jovem", 17)];
    const got = eligibleMentors(roster, "jovem", 18).map((m) => m.playerId);
    // 34 e 25 são mais velhos; 17 não; 'jovem' se exclui. Ordem por idade desc.
    expect(got).toEqual(["veterano", "meio"]);
  });

  it("monta o payload de vincular", () => {
    const r = buildLinkMentorPayload({ clubId: "c", menteeId: "j", mentorId: "v", expectedVersion: 2 });
    expect(r).toEqual({ clubId: "c", menteeId: "j", mentorId: "v", expectedVersion: 2 });
  });

  it("sem mentor escolhido → NO_MENTOR", () => {
    expect(buildLinkMentorPayload({ clubId: "c", menteeId: "j", mentorId: null, expectedVersion: null }))
      .toEqual({ error: "NO_MENTOR" });
  });

  it("mentor = pupilo → SELF (o domínio recusaria)", () => {
    expect(buildLinkMentorPayload({ clubId: "c", menteeId: "j", mentorId: "j", expectedVersion: null }))
      .toEqual({ error: "SELF" });
  });

  it("payload de desvincular carrega só clube e pupilo", () => {
    expect(buildUnlinkMentorPayload({ clubId: "c", menteeId: "j" })).toEqual({ clubId: "c", menteeId: "j" });
  });
});
