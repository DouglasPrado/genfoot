import { describe, expect, it } from "vitest";

import { scoutPotentialBand } from "./scout-report.js";

describe("scoutPotentialBand — incerteza do olheiro (R-04)", () => {
  it("olheiro RUIM: faixa ±10 e confiança ≤ 40", () => {
    const b = scoutPotentialBand({ truePotential: 80, scoutQuality: 0, cycles: 1 });
    expect(b.max - b.min).toBe(20); // ±10 no pior olheiro (qualidade 0)
    expect(b.confidence).toBeLessThanOrEqual(40);
    expect(b.min).toBeLessThanOrEqual(80);
    expect(b.max).toBeGreaterThanOrEqual(80);
  });

  it("olheiro BOM: faixa ±3 e confiança ≥ 80", () => {
    const b = scoutPotentialBand({ truePotential: 80, scoutQuality: 100, cycles: 1 });
    expect(b.max - b.min).toBe(6); // ±3 no melhor olheiro (qualidade 100)
    expect(b.confidence).toBeGreaterThanOrEqual(80);
  });

  it("a faixa contém o valor real", () => {
    for (const q of [0, 30, 60, 100]) {
      const b = scoutPotentialBand({ truePotential: 72, scoutQuality: q, cycles: 1 });
      expect(b.min).toBeLessThanOrEqual(72);
      expect(b.max).toBeGreaterThanOrEqual(72);
    }
  });

  it("a faixa estreita ~30% a cada ciclo de observação", () => {
    const c1 = scoutPotentialBand({ truePotential: 80, scoutQuality: 40, cycles: 1 });
    const c2 = scoutPotentialBand({ truePotential: 80, scoutQuality: 40, cycles: 2 });
    const w1 = c1.max - c1.min;
    const w2 = c2.max - c2.min;
    expect(w2).toBeLessThan(w1);
    expect(w2 / w1).toBeCloseTo(0.7, 1); // ~30% mais estreita
  });

  it("melhor olheiro dá faixa mais estreita e mais confiança", () => {
    const ruim = scoutPotentialBand({ truePotential: 75, scoutQuality: 20, cycles: 1 });
    const bom = scoutPotentialBand({ truePotential: 75, scoutQuality: 85, cycles: 1 });
    expect(bom.max - bom.min).toBeLessThan(ruim.max - ruim.min);
    expect(bom.confidence).toBeGreaterThan(ruim.confidence);
  });

  it("a faixa não vaza de 0..100 (potencial no topo/fundo)", () => {
    const topo = scoutPotentialBand({ truePotential: 98, scoutQuality: 10, cycles: 1 });
    expect(topo.max).toBeLessThanOrEqual(100);
    const fundo = scoutPotentialBand({ truePotential: 3, scoutQuality: 10, cycles: 1 });
    expect(fundo.min).toBeGreaterThanOrEqual(0);
  });

  it("nunca colapsa a faixa a zero, nem com olheiro perfeito e muitos ciclos", () => {
    // "Informação incompleta nunca vira zero" — a faixa aperta, mas há sempre
    // uma margem mínima; o olheiro não vê a verdade exata.
    const b = scoutPotentialBand({ truePotential: 80, scoutQuality: 100, cycles: 10 });
    expect(b.max - b.min).toBeGreaterThanOrEqual(2);
  });

  it("é determinística", () => {
    const i = { truePotential: 77, scoutQuality: 55, cycles: 2 };
    expect(scoutPotentialBand(i)).toEqual(scoutPotentialBand(i));
  });
});
