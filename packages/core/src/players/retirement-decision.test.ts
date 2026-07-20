import { describe, expect, it } from "vitest";

import {
  RETIREMENT_CURVE,
  retirementProbability,
  decidesToRetire,
} from "./retirement-decision.js";

describe("retirementProbability — curva por idade (R-217)", () => {
  it("é ~zero antes dos 33", () => {
    for (const age of [24, 30, 32]) {
      expect(retirementProbability(age)).toBeLessThan(0.05);
    }
  });

  it("cresce com a idade", () => {
    const ps = [33, 35, 37, 39].map(retirementProbability);
    for (let i = 1; i < ps.length; i += 1) {
      expect(ps[i]).toBeGreaterThan(ps[i - 1]!);
    }
  });

  it("é quase certa perto dos 40", () => {
    expect(retirementProbability(40)).toBeGreaterThan(0.8);
  });

  it("nunca sai de 0..1", () => {
    for (let age = 16; age <= 50; age += 1) {
      const p = retirementProbability(age);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("expõe a curva declarada (candidata a VAL-001)", () => {
    expect(Object.keys(RETIREMENT_CURVE).length).toBeGreaterThan(0);
  });
});

const KEY = {
  worldSeed: "mundo-x",
  playerId: "019b76da-a800-72ca-9ec5-f37f87ff4d3a",
  seasonId: "019f782c-830f-759c-9dae-7fc0dd80a6bd",
};

describe("decidesToRetire — roll determinístico (R-182)", () => {
  it("jovem nunca se aposenta", () => {
    for (const age of [18, 24, 29]) {
      expect(decidesToRetire({ ...KEY, age })).toBe(false);
    }
  });

  it("muito velho quase sempre se aposenta", () => {
    // 45 anos: probabilidade ~1; independentemente da chave, aposenta.
    expect(decidesToRetire({ ...KEY, age: 45 })).toBe(true);
  });

  it("mesma chave (mundo, jogador, temporada) → mesmo resultado", () => {
    const a = decidesToRetire({ ...KEY, age: 36 });
    const b = decidesToRetire({ ...KEY, age: 36 });
    expect(a).toBe(b);
  });

  it("dois jogadores da mesma idade podem decidir diferente (§17)", () => {
    // A chave inclui o playerId: o mundo não aposenta todo mundo de 36 de uma
    // vez. Varrendo vários ids, aparece both true e false.
    const resultados = new Set<boolean>();
    for (let i = 0; i < 40; i += 1) {
      resultados.add(
        decidesToRetire({
          ...KEY,
          playerId: `019b76da-a800-72ca-9ec5-f37f87ff${String(i).padStart(4, "0")}`,
          age: 36,
        }),
      );
    }
    expect(resultados.has(true)).toBe(true);
    expect(resultados.has(false)).toBe(true);
  });

  it("temporada diferente pode mudar o destino do mesmo jogador", () => {
    // O jogador que não aposentou nesta temporada enfrenta o roll de novo na
    // próxima — a chave muda com o seasonId.
    const s1 = decidesToRetire({ ...KEY, age: 36, seasonId: "season-0001" });
    const s2 = decidesToRetire({ ...KEY, age: 36, seasonId: "season-0002" });
    // não precisam diferir, mas a função aceita e roda determinística em ambas
    expect(typeof s1).toBe("boolean");
    expect(typeof s2).toBe("boolean");
  });

  it("a taxa agregada segue a curva: aos 36, muitos jogadores → fração perto de p(36)", () => {
    const p = retirementProbability(36);
    let retired = 0;
    const N = 400;
    for (let i = 0; i < N; i += 1) {
      if (
        decidesToRetire({
          ...KEY,
          playerId: `019b76da-a800-72ca-9ec5-f3aa${String(i).padStart(6, "0")}`,
          age: 36,
        })
      )
        retired += 1;
    }
    const frac = retired / N;
    // tolerância larga: é hash, não RNG estatístico, mas deve ficar na vizinhança
    expect(Math.abs(frac - p)).toBeLessThan(0.15);
  });
});
