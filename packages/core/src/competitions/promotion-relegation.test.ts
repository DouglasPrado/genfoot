import { describe, expect, it } from "vitest";

import {
  applyPromotionRelegation,
  type DivisionResult,
} from "./promotion-relegation.js";

/** Divisão de `size` clubes "tK-cNN", já ordenados pela classificação. */
function division(
  tier: number,
  size: number,
  promotionSlots: number,
  relegationSlots: number,
): DivisionResult {
  return {
    tier,
    orderedClubIds: Array.from(
      { length: size },
      (_, i) => `t${tier}-c${String(i + 1).padStart(2, "0")}`,
    ),
    promotionSlots,
    relegationSlots,
  };
}

function rosterOf(rosters: ReturnType<typeof applyPromotionRelegation>, tier: number) {
  return rosters.find((r) => r.tier === tier)!.clubIds;
}

describe("applyPromotionRelegation — pirâmide de 2 divisões (2 sobem/descem)", () => {
  // Topo: 0 sobem, 2 descem. Fundo: 2 sobem, 0 descem. 6 clubes cada.
  const rosters = applyPromotionRelegation([
    division(1, 6, 0, 2),
    division(2, 6, 2, 0),
  ]);

  it("a divisão de cima perde os 2 últimos e ganha os 2 primeiros de baixo", () => {
    const top = rosterOf(rosters, 1);
    // fica com 1º..4º da 1ª divisão + os 2 promovidos da 2ª (t2-c01, t2-c02)
    expect(top).toEqual([
      "t1-c01",
      "t1-c02",
      "t1-c03",
      "t1-c04",
      "t2-c01",
      "t2-c02",
    ]);
  });

  it("a divisão de baixo perde os 2 primeiros e ganha os 2 rebaixados de cima", () => {
    const bottom = rosterOf(rosters, 2);
    // fica com 3º..6º da 2ª divisão + os 2 rebaixados da 1ª (t1-c05, t1-c06)
    expect(bottom).toEqual([
      "t2-c03",
      "t2-c04",
      "t2-c05",
      "t2-c06",
      "t1-c05",
      "t1-c06",
    ]);
  });

  it("conserva o tamanho de cada divisão", () => {
    expect(rosterOf(rosters, 1)).toHaveLength(6);
    expect(rosterOf(rosters, 2)).toHaveLength(6);
  });

  it("nenhum clube fica em duas divisões, e nenhum some", () => {
    const all = rosters.flatMap((r) => r.clubIds);
    expect(new Set(all).size).toBe(all.length); // sem duplicata
    expect(all).toHaveLength(12); // todos os 12 seguem em alguma divisão
  });
});

describe("applyPromotionRelegation — pirâmide de 3 divisões (o meio troca dos dois lados)", () => {
  const rosters = applyPromotionRelegation([
    division(1, 6, 0, 2), // topo
    division(2, 6, 2, 2), // meio
    division(3, 6, 2, 0), // fundo
  ]);

  it("o meio mantém quem ficou e recebe rebaixados de cima + promovidos de baixo", () => {
    const mid = rosterOf(rosters, 2);
    // stayers do meio: 3º e 4º (t2-c03, t2-c04); +2 rebaixados da 1ª; +2 promovidos da 3ª
    expect(mid).toEqual([
      "t2-c03",
      "t2-c04",
      "t1-c05",
      "t1-c06",
      "t3-c01",
      "t3-c02",
    ]);
  });

  it("toda divisão conserva 6 clubes", () => {
    for (const tier of [1, 2, 3]) {
      expect(rosterOf(rosters, tier)).toHaveLength(6);
    }
  });
});

describe("applyPromotionRelegation — divisão única (topo E fundo)", () => {
  it("sem para onde subir ou descer, o elenco se repete", () => {
    const rosters = applyPromotionRelegation([division(1, 6, 0, 0)]);
    expect(rosterOf(rosters, 1)).toEqual([
      "t1-c01",
      "t1-c02",
      "t1-c03",
      "t1-c04",
      "t1-c05",
      "t1-c06",
    ]);
  });
});
