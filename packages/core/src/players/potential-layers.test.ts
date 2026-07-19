import { describe, expect, it } from "vitest";

import {
  PROVISIONAL_STRUCTURE_LEVEL,
  STRUCTURE_YIELD,
  derivePotentialLayers,
} from "./potential-layers.js";

describe("STRUCTURE_YIELD (R-12)", () => {
  it("é a curva ratificada: 40/55/70/85/95%", () => {
    expect(STRUCTURE_YIELD).toEqual([0.4, 0.55, 0.7, 0.85, 0.95]);
  });
});

describe("derivePotentialLayers — aproveitável", () => {
  it("aplica o rendimento sobre a MARGEM, não sobre o teto", () => {
    // R-12: "potencial para evoluir 10 pontos aproveita 4 com comissão nível 1".
    // Multiplicar o teto (50×0,40=20) daria um aproveitável ABAIXO da
    // habilidade atual — o jogador regrediria por ter estrutura ruim.
    const camadas = derivePotentialLayers({
      natural: 60,
      currentAbility: 50,
      structureLevel: 1,
    });
    expect(camadas.usable).toBe(54); // 50 + (60-50)×0,40
  });

  it("reproduz a tabela do doc: jovem de potencial 85, habilidade 35", () => {
    // 04-estrutura-do-clube-e-staff.md:258-264 — é a validação cruzada da
    // fórmula contra números que o doc publicou.
    const em = (structureLevel: number) =>
      derivePotentialLayers({ natural: 85, currentAbility: 35, structureLevel })
        .usable;
    expect(em(1)).toBe(55); // doc: 55–65
    expect(em(3)).toBe(70); // doc: 70–80
    expect(em(5)).toBe(83); // doc: 80–88 (82,5 arredondado)
  });

  it("nunca fica abaixo da habilidade atual", () => {
    // Estrutura ruim atrasa a evolução; não apaga o que o jogador já é.
    const camadas = derivePotentialLayers({
      natural: 40,
      currentAbility: 70,
      structureLevel: 1,
    });
    expect(camadas.usable).toBe(70);
  });

  it("nunca ultrapassa o natural, nem com estrutura máxima", () => {
    const camadas = derivePotentialLayers({
      natural: 80,
      currentAbility: 40,
      structureLevel: 5,
    });
    expect(camadas.usable).toBeLessThanOrEqual(80);
  });

  it("usa o nível provisório quando a estrutura não é conhecida", () => {
    // Provisório registrado na R-213: DevelopmentSignature e níveis de CT não
    // existem ainda, então cai no nível 3 (meio da tabela).
    expect(PROVISIONAL_STRUCTURE_LEVEL).toBe(3);
    const semNivel = derivePotentialLayers({
      natural: 85,
      currentAbility: 35,
      structureLevel: null,
    });
    const nivelTres = derivePotentialLayers({
      natural: 85,
      currentAbility: 35,
      structureLevel: 3,
    });
    expect(semNivel.usable).toBe(nivelTres.usable);
  });
});

describe("derivePotentialLayers — natural", () => {
  it("devolve o natural intacto", () => {
    expect(
      derivePotentialLayers({
        natural: 82,
        currentAbility: 60,
        structureLevel: 3,
      }).natural,
    ).toBe(82);
  });
});

describe("derivePotentialLayers — funcional", () => {
  it("iguala o aproveitável quando a função é neutra", () => {
    const camadas = derivePotentialLayers({
      natural: 82,
      currentAbility: 60,
      structureLevel: 3,
      roleFit: 0,
    });
    expect(camadas.functional).toBe(camadas.usable);
  });

  it("pode SUPERAR o natural com função ideal", () => {
    // §4: natural 82 rende 86 com mudança de posição. É o único caso em que uma
    // camada passa do teto bruto — e é intencional: a função certa revela o que
    // a posição errada escondia.
    const camadas = derivePotentialLayers({
      natural: 82,
      currentAbility: 82,
      structureLevel: 5,
      roleFit: 1,
    });
    expect(camadas.functional).toBeGreaterThan(82);
  });

  it("cai abaixo do aproveitável com função errada", () => {
    const camadas = derivePotentialLayers({
      natural: 82,
      currentAbility: 60,
      structureLevel: 3,
      roleFit: -1,
    });
    expect(camadas.functional).toBeLessThan(camadas.usable);
  });

  it("nunca cai abaixo da habilidade atual, nem na pior função", () => {
    const camadas = derivePotentialLayers({
      natural: 82,
      currentAbility: 70,
      structureLevel: 1,
      roleFit: -1,
    });
    expect(camadas.functional).toBeGreaterThanOrEqual(70);
  });
});

describe("derivePotentialLayers — bordas", () => {
  it("rejeita nível de estrutura fora de 1..5", () => {
    expect(() =>
      derivePotentialLayers({
        natural: 80,
        currentAbility: 40,
        structureLevel: 0,
      }),
    ).toThrow();
    expect(() =>
      derivePotentialLayers({
        natural: 80,
        currentAbility: 40,
        structureLevel: 6,
      }),
    ).toThrow();
  });

  it("rejeita roleFit fora de -1..1", () => {
    expect(() =>
      derivePotentialLayers({
        natural: 80,
        currentAbility: 40,
        structureLevel: 3,
        roleFit: 2,
      }),
    ).toThrow();
  });

  it("é determinístico", () => {
    const entrada = {
      natural: 77,
      currentAbility: 41,
      structureLevel: 4,
      roleFit: 0.5,
    };
    expect(derivePotentialLayers(entrada)).toEqual(
      derivePotentialLayers(entrada),
    );
  });

  it("devolve inteiros — atributo e habilidade são inteiros no grid", () => {
    const camadas = derivePotentialLayers({
      natural: 85,
      currentAbility: 35,
      structureLevel: 5,
      roleFit: 0.3,
    });
    expect(Number.isInteger(camadas.usable)).toBe(true);
    expect(Number.isInteger(camadas.functional)).toBe(true);
  });
});
