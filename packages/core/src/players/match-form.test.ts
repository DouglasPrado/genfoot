import { describe, expect, it } from "vitest";

import {
  FORM_MAX,
  clampForm,
  decayedForm,
  matchFormDelta,
} from "./match-form.js";

describe("matchFormDelta — a partida move a forma ±", () => {
  it("vitória sobe, derrota desce, empate é neutro", () => {
    expect(matchFormDelta({ outcome: "WIN", goalsScored: 0 })).toBeGreaterThan(0);
    expect(matchFormDelta({ outcome: "LOSS", goalsScored: 0 })).toBeLessThan(0);
    expect(matchFormDelta({ outcome: "DRAW", goalsScored: 0 })).toBe(0);
  });

  it("marcar gol embala (bônus por gol)", () => {
    const semGol = matchFormDelta({ outcome: "WIN", goalsScored: 0 });
    const comGol = matchFormDelta({ outcome: "WIN", goalsScored: 2 });
    expect(comGol).toBeGreaterThan(semGol);
  });

  it("gol na derrota pode compensar o resultado", () => {
    const d = matchFormDelta({ outcome: "LOSS", goalsScored: 2 });
    expect(d).toBeGreaterThanOrEqual(0);
  });
});

describe("clampForm — teto ±FORM_MAX", () => {
  it("não passa do teto para cima nem para baixo", () => {
    expect(clampForm(999)).toBe(FORM_MAX);
    expect(clampForm(-999)).toBe(-FORM_MAX);
    expect(clampForm(3)).toBe(3);
  });
});

describe("decayedForm — a forma sara sozinha", () => {
  it("pico positivo decai em direção a zero, sem cruzar", () => {
    expect(decayedForm(5, 2)).toBe(3);
    expect(decayedForm(1, 5)).toBe(0);
  });
  it("vale negativo sobe em direção a zero, sem cruzar", () => {
    expect(decayedForm(-5, 2)).toBe(-3);
    expect(decayedForm(-1, 5)).toBe(0);
  });
  it("neutro fica neutro; zero dias não muda", () => {
    expect(decayedForm(0, 10)).toBe(0);
    expect(decayedForm(7, 0)).toBe(7);
  });
});
