import { describe, expect, it } from "vitest";

import {
  perAttributeGain,
  projectSessionGainPoints,
  sessionRawGainPoints,
} from "./session-gain.js";

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

describe("perAttributeGain — divisão do ganho entre habilidades (arredonda pra baixo)", () => {
  const attr = 50; // muito headroom até 100

  it("1 habilidade rende o bruto inteiro", () => {
    expect(perAttributeGain({ rawGain: 6, attributeCount: 1, attributeCurrentValue: attr })).toBe(6);
  });

  it("divide igual quando cabe (6/2=3, 6/3=2)", () => {
    expect(perAttributeGain({ rawGain: 6, attributeCount: 2, attributeCurrentValue: attr })).toBe(3);
    expect(perAttributeGain({ rawGain: 6, attributeCount: 3, attributeCurrentValue: attr })).toBe(2);
  });

  it("arredonda PARA BAIXO — 6/4=1, 6/5=1 (o resto se perde)", () => {
    expect(perAttributeGain({ rawGain: 6, attributeCount: 4, attributeCurrentValue: attr })).toBe(1);
    expect(perAttributeGain({ rawGain: 6, attributeCount: 5, attributeCurrentValue: attr })).toBe(1);
  });

  it("tetado no 100 do atributo (98 → no máximo +2)", () => {
    expect(perAttributeGain({ rawGain: 6, attributeCount: 1, attributeCurrentValue: 98 })).toBe(2);
  });

  it("atributo null ou 0 habilidades → 0", () => {
    expect(perAttributeGain({ rawGain: 6, attributeCount: 3, attributeCurrentValue: null })).toBe(0);
    expect(perAttributeGain({ rawGain: 6, attributeCount: 0, attributeCurrentValue: attr })).toBe(0);
  });
});

describe("sessionRawGainPoints", () => {
  it("é o bruto (>=0), tetado em +6", () => {
    const g = sessionRawGainPoints({
      usableCeiling: 99, currentAbility: 40, morale: 70, fatigue: 0,
      age: 20, elapsedDays: 30, durationDays: 7,
    });
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThanOrEqual(6);
  });
});
