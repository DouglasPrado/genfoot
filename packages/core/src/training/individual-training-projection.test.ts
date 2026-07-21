import { describe, expect, it } from "vitest";

import { recommendedAttributes } from "../players/position-attributes.js";

import { projectIndividualPlan } from "./individual-training-projection.js";

// Um jogador simples: finishing baixo (o mais fraco), o resto em 50.
const attrs: Record<string, number | null> = { finishing: 30, dribbling: 50, pace: 55, strength: 40, goalkeeperReflexes: null };
const valueOf = (code: string): number | null => attrs[code] ?? null;

describe("projectIndividualPlan", () => {
  it("orçamento zero não projeta nada", () => {
    expect(
      projectIndividualPlan({ target: { kind: "ATTRIBUTE", attributeCode: "finishing" }, rawGainPoints: 0, attributeValueOf: valueOf }),
    ).toEqual([]);
  });

  it("ATRIBUTO: concentra o orçamento inteiro no alvo (÷1)", () => {
    const changes = projectIndividualPlan({
      target: { kind: "ATTRIBUTE", attributeCode: "finishing" },
      rawGainPoints: 4,
      attributeValueOf: valueOf,
    });
    expect(changes).toEqual([{ attributeCode: "finishing", before: 30, after: 34, gain: 4 }]);
  });

  it("ATRIBUTO que não se aplica ao jogador (null) não projeta", () => {
    expect(
      projectIndividualPlan({ target: { kind: "ATTRIBUTE", attributeCode: "goalkeeperReflexes" }, rawGainPoints: 5, attributeValueOf: valueOf }),
    ).toEqual([]);
  });

  it("POSIÇÃO: +1 nas recomendadas mais fracas, gastando o orçamento", () => {
    const budget = 2;
    const changes = projectIndividualPlan({
      target: { kind: "POSITION", position: "ST" },
      rawGainPoints: budget,
      attributeValueOf: valueOf,
    });
    // Gasta exatamente o orçamento, +1 em cada, só nas recomendadas do ST.
    expect(changes.length).toBe(budget);
    const recs = new Set(recommendedAttributes("ST"));
    for (const c of changes) {
      expect(c.gain).toBe(1);
      expect(c.after).toBe(c.before + 1);
      expect(recs.has(c.attributeCode)).toBe(true);
    }
    // A mais fraca recomendada entra primeiro (finishing=30, se for recomendada do ST).
    if (recs.has("finishing")) {
      expect(changes[0]?.attributeCode).toBe("finishing");
    }
  });
});
