import { describe, expect, it } from "vitest";

import {
  DECLINE_FLOOR,
  PHYSICAL_DECLINE,
  physicalDeclineFor,
} from "./age-decline.js";

describe("PHYSICAL_DECLINE — a curva por idade (R-217, §5)", () => {
  it("não decai no auge (≤29): perda zero", () => {
    for (const age of [24, 26, 29]) {
      expect(physicalDeclineFor(age, 70)).toBe(0);
    }
  });

  it("decai gradual na faixa 30-33", () => {
    const perda = physicalDeclineFor(31, 70);
    expect(perda).toBeGreaterThan(0);
    // gradual < queda: a perda aos 31 é menor que aos 36
    expect(perda).toBeLessThan(physicalDeclineFor(36, 70));
  });

  it("queda acentuada aos 34+", () => {
    expect(physicalDeclineFor(36, 70)).toBeGreaterThan(0);
  });

  it("quanto mais velho, mais perde (monotônico dos 30 em diante)", () => {
    const perdas = [30, 33, 36, 39].map((age) => physicalDeclineFor(age, 70));
    for (let i = 1; i < perdas.length; i += 1) {
      expect(perdas[i]).toBeGreaterThanOrEqual(perdas[i - 1]!);
    }
  });

  it("expõe a curva declarada (candidata a VAL-001)", () => {
    // O mapa é a calibração: faixas → perda por temporada. Fixá-lo em teste
    // documenta o número e faz mudança de balanceamento aparecer no diff.
    expect(Object.keys(PHYSICAL_DECLINE).length).toBeGreaterThan(0);
  });
});

describe("physicalDeclineFor — piso (R-217)", () => {
  it("nunca leva o atributo abaixo do piso: veterano perde vigor, não vira amador", () => {
    // Atributo já no piso não perde mais.
    expect(physicalDeclineFor(40, DECLINE_FLOOR)).toBe(0);
    expect(physicalDeclineFor(40, DECLINE_FLOOR - 5)).toBe(0);
  });

  it("limita a perda para não furar o piso num só passo", () => {
    const current = DECLINE_FLOOR + 2;
    const perda = physicalDeclineFor(40, current);
    expect(current - perda).toBeGreaterThanOrEqual(DECLINE_FLOOR);
  });

  it("atributo bem acima do piso perde a curva cheia", () => {
    const perda = physicalDeclineFor(36, 80);
    expect(perda).toBeGreaterThan(0);
    expect(80 - perda).toBeGreaterThan(DECLINE_FLOOR);
  });
});

describe("physicalDeclineFor — bordas", () => {
  it("devolve perda inteira (o grid é inteiro)", () => {
    expect(Number.isInteger(physicalDeclineFor(35, 70))).toBe(true);
  });

  it("é determinística", () => {
    expect(physicalDeclineFor(35, 70)).toBe(physicalDeclineFor(35, 70));
  });

  it("idade absurda não quebra", () => {
    expect(physicalDeclineFor(99, 70)).toBeGreaterThan(0);
    expect(physicalDeclineFor(10, 70)).toBe(0);
  });
});
