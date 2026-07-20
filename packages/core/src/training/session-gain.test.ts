import { describe, expect, it } from "vitest";

import { projectSessionGainPoints } from "./session-gain.js";

const base = {
  attributeCurrentValue: 50,
  usableCeiling: 75,
  currentAbility: 55,
  morale: 70,
  fatigue: 0,
  age: 20,
  elapsedDays: 7,
  durationDays: 7,
};

describe("projectSessionGainPoints (R-221)", () => {
  it("sessão completa de um jovem com headroom rende ganho positivo", () => {
    expect(projectSessionGainPoints(base)).toBeGreaterThan(0);
  });

  it("proporcional aos dias treinados — meio caminho rende menos que o fim", () => {
    const meio = projectSessionGainPoints({ ...base, elapsedDays: 3 });
    const fim = projectSessionGainPoints({ ...base, elapsedDays: 7 });
    expect(meio).toBeLessThanOrEqual(fim);
    expect(meio).toBeGreaterThanOrEqual(0);
  });

  it("zero dia treinado, zero ganho", () => {
    expect(projectSessionGainPoints({ ...base, elapsedDays: 0 })).toBe(0);
  });

  it("nunca passa do clamp de +6 por coleta", () => {
    // Headroom enorme + tempo cheio: ainda tetado em 6.
    const g = projectSessionGainPoints({
      ...base,
      usableCeiling: 99,
      currentAbility: 40,
      attributeCurrentValue: 40,
      elapsedDays: 30,
    });
    expect(g).toBeLessThanOrEqual(6);
  });

  it("atributo colado no teto 100 não ganha nada", () => {
    expect(
      projectSessionGainPoints({ ...base, attributeCurrentValue: 100 }),
    ).toBe(0);
  });

  it("atributo que não se aplica (null) rende 0", () => {
    expect(
      projectSessionGainPoints({ ...base, attributeCurrentValue: null }),
    ).toBe(0);
  });

  it("sem headroom de habilidade (no teto aproveitável) o ganho murcha", () => {
    const noHeadroom = projectSessionGainPoints({
      ...base,
      usableCeiling: 55,
      currentAbility: 55,
    });
    const withHeadroom = projectSessionGainPoints(base);
    expect(noHeadroom).toBeLessThanOrEqual(withHeadroom);
  });
});
