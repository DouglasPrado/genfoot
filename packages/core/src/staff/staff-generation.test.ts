import { describe, expect, it } from "vitest";

import { deriveClubStaff } from "./staff-generation.js";
import { StaffRole } from "./staff-types.js";

const INPUT = {
  worldSeed: "grinta-demo",
  gameWorldId: "019f0000-0000-7000-8000-000000000001",
  clubId: "019f0000-0000-7000-8000-0000000000b2",
  clubIndex: 0,
  currencyId: "019b76da-a800-7787-9462-49c009becccc",
  worldStartDate: "2026-01-01",
  currentSeason: 1,
};

describe("deriveClubStaff — a comissão técnica na largada (C8, R-182)", () => {
  it("materializa os 7 cargos essenciais da comissão", () => {
    const staff = deriveClubStaff(INPUT);
    expect(staff).toHaveLength(7);
    expect(staff.map((s) => s.role)).toContain(StaffRole.HEAD_COACH);
    expect(staff.map((s) => s.role)).toContain(StaffRole.YOUTH_COORDINATOR);
  });

  it("é determinística: mesmo mundo/clube ⇒ mesma comissão", () => {
    const a = deriveClubStaff(INPUT);
    const b = deriveClubStaff(INPUT);
    expect(a.map((s) => s.staffId)).toEqual(b.map((s) => s.staffId));
    expect(a.map((s) => s.abilityScore)).toEqual(b.map((s) => s.abilityScore));
  });

  it("clubes diferentes têm comissões diferentes", () => {
    const c0 = deriveClubStaff(INPUT);
    const c1 = deriveClubStaff({ ...INPUT, clubIndex: 1, clubId: "019f0000-0000-7000-8000-0000000000c3" });
    expect(c0[0]!.staffId).not.toBe(c1[0]!.staffId);
  });

  it("liga cada membro ao clube com contrato — obrigação registrada (R-197)", () => {
    for (const s of deriveClubStaff(INPUT)) {
      expect(s.clubId).toBe(INPUT.clubId);
      expect(s.salaryPerSeasonMinor).toBeGreaterThan(0n);
      expect(s.endSeason).toBeGreaterThan(s.startSeason);
    }
  });

  it("atributos e habilidade ficam na escala 0–100", () => {
    for (const s of deriveClubStaff(INPUT)) {
      expect(s.abilityScore).toBeGreaterThanOrEqual(1);
      expect(s.abilityScore).toBeLessThanOrEqual(100);
      for (const v of Object.values(s.attributes)) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it("o atributo-chave do cargo tem ênfase — o preparador físico entende de medicina", () => {
    const fitness = deriveClubStaff(INPUT).find(
      (s) => s.role === StaffRole.FITNESS_COACH,
    )!;
    expect(fitness.attributes.medicalKnowledge).toBeGreaterThanOrEqual(
      fitness.abilityScore,
    );
  });
});
