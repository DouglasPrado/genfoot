import { describe, expect, it } from "vitest";

import { recommendedAttributes } from "../players/position-attributes.js";

import { archetypeAttributes } from "./gk-archetypes.js";
import { projectIndividualPlan } from "./individual-training-projection.js";

// Um jogador simples: finishing baixo (o mais fraco), o resto em 50.
const attrs: Record<string, number | null> = { finishing: 30, dribbling: 50, pace: 55, strength: 40, goalkeeperReflexes: null };
const valueOf = (code: string): number | null => attrs[code] ?? null;

// Um goleiro: atributos de GK preenchidos, reflexos o mais fraco.
const gk: Record<string, number | null> = {
  goalkeeperReflexes: 28, goalkeeperOneOnOne: 45, goalkeeperPositioning: 50, goalkeeperPenalty: 40,
  goalkeeperKicking: 35, goalkeeperCommand: 42, goalkeeperAerial: 48, goalkeeperHandling: 44,
};
const gkValueOf = (code: string): number | null => gk[code] ?? null;

describe("projectIndividualPlan", () => {
  it("orçamento zero não projeta nada", () => {
    expect(
      projectIndividualPlan({ target: { kind: "ATTRIBUTE", attributeCodes: ["finishing"] }, rawGainPoints: 0, attributeValueOf: valueOf }),
    ).toEqual([]);
  });

  it("ATRIBUTO com UMA habilidade: o orçamento inteiro nela (÷1)", () => {
    const changes = projectIndividualPlan({
      target: { kind: "ATTRIBUTE", attributeCodes: ["finishing"] },
      rawGainPoints: 4,
      attributeValueOf: valueOf,
    });
    expect(changes).toEqual([{ attributeCode: "finishing", before: 30, after: 34, gain: 4 }]);
  });

  it("ATRIBUTO com até 5 habilidades: o orçamento é DIVIDIDO (÷N, floor), como a sessão", () => {
    const changes = projectIndividualPlan({
      target: { kind: "ATTRIBUTE", attributeCodes: ["finishing", "dribbling"] },
      rawGainPoints: 5, // ÷2 = 2 por habilidade (resto se perde)
      attributeValueOf: valueOf,
    });
    expect(changes).toEqual([
      { attributeCode: "finishing", before: 30, after: 32, gain: 2 },
      { attributeCode: "dribbling", before: 50, after: 52, gain: 2 },
    ]);
  });

  it("ATRIBUTO que não se aplica ao jogador (null) não projeta", () => {
    expect(
      projectIndividualPlan({ target: { kind: "ATTRIBUTE", attributeCodes: ["goalkeeperReflexes"] }, rawGainPoints: 5, attributeValueOf: valueOf }),
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

  it("ARQUÉTIPO DE GOLEIRO: +1 nos atributos de GK do arquétipo, mais fraco primeiro", () => {
    const budget = 2;
    const changes = projectIndividualPlan({
      target: { kind: "GK_ARCHETYPE", archetype: "SHOT_STOPPER" },
      rawGainPoints: budget,
      attributeValueOf: gkValueOf,
    });
    expect(changes.length).toBe(budget);
    const set = new Set(archetypeAttributes("SHOT_STOPPER"));
    for (const c of changes) {
      expect(c.gain).toBe(1);
      expect(set.has(c.attributeCode)).toBe(true);
    }
    // Reflexos (28) é o mais fraco do shot-stopper → entra primeiro.
    expect(changes[0]?.attributeCode).toBe("goalkeeperReflexes");
  });

  it("arquétipo aplicado a jogador de LINHA (GK null) não projeta nada", () => {
    const changes = projectIndividualPlan({
      target: { kind: "GK_ARCHETYPE", archetype: "SHOT_STOPPER" },
      rawGainPoints: 4,
      attributeValueOf: valueOf, // jogador de linha: GK = null
    });
    expect(changes).toEqual([]);
  });
});
