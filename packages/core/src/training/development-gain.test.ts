import { describe, expect, it } from "vitest";

import {
  AGE_BANDS,
  GAIN_SCALE,
  ageBandFor,
  computeDevelopmentGain,
} from "./development-gain.js";

/** Um cenário neutro: todo fator em 1, nenhuma penalidade. */
const NEUTRO = {
  baseLearningRate: 1,
  remainingPotential: 1,
  trainingFocus: 1,
  trainingQuality: 1,
  compatibility: 1,
  competitiveMinutes: 1,
  age: 24,
  morale: 1,
  fatigue: 0,
  injury: 0,
  negativePressure: 0,
} as const;

describe("ageBandFor (§5:232-245)", () => {
  it("classifica as seis faixas do doc", () => {
    expect(ageBandFor(15)).toBe("14-17");
    expect(ageBandFor(19)).toBe("18-21");
    expect(ageBandFor(24)).toBe("22-25");
    expect(ageBandFor(27)).toBe("26-29");
    expect(ageBandFor(31)).toBe("30-33");
    expect(ageBandFor(36)).toBe("34+");
  });

  it("acerta as bordas de cada faixa", () => {
    expect(ageBandFor(17)).toBe("14-17");
    expect(ageBandFor(18)).toBe("18-21");
    expect(ageBandFor(21)).toBe("18-21");
    expect(ageBandFor(22)).toBe("22-25");
    expect(ageBandFor(33)).toBe("30-33");
    expect(ageBandFor(34)).toBe("34+");
  });

  it("trata idade abaixo do mínimo como a faixa mais nova", () => {
    expect(ageBandFor(13)).toBe("14-17");
  });

  it("cobre as seis faixas declaradas", () => {
    expect(Object.keys(AGE_BANDS)).toHaveLength(6);
  });
});

describe("computeDevelopmentGain — a explosão dos 18-21 (§5)", () => {
  it("rende mais aos 19 que aos 33 com o mesmo treino", () => {
    // O doc é explícito: "treino de velocidade aos 18 pode gerar evolução alta.
    // Aos 33, o mesmo treino serve mais para manutenção do que para ganho real."
    const jovem = computeDevelopmentGain({ ...NEUTRO, age: 19 });
    const veterano = computeDevelopmentGain({ ...NEUTRO, age: 33 });
    expect(jovem).toBeGreaterThan(veterano);
  });

  it("o pico é a faixa 18-21", () => {
    const porFaixa = [15, 19, 24, 27, 31, 36].map((age) =>
      computeDevelopmentGain({ ...NEUTRO, age }),
    );
    expect(Math.max(...porFaixa)).toBe(porFaixa[1]);
  });

  it("decai monotonicamente dos 22 em diante", () => {
    const [c22, c26, c30, c34] = [24, 27, 31, 36].map((age) =>
      computeDevelopmentGain({ ...NEUTRO, age }),
    );
    expect(c22).toBeGreaterThan(c26!);
    expect(c26).toBeGreaterThan(c30!);
    expect(c30).toBeGreaterThan(c34!);
  });
});

describe("computeDevelopmentGain — fatores multiplicativos", () => {
  it("qualquer fator zerado zera o ganho", () => {
    // É produto: sem foco no atributo, não há ganho nele por mais que o jogador
    // aprenda rápido. O doc separa baseLearningRate de focoDoTreino justamente
    // para isso (§6:307).
    for (const campo of [
      "baseLearningRate",
      "remainingPotential",
      "trainingFocus",
      "trainingQuality",
      "compatibility",
      "competitiveMinutes",
      "morale",
    ] as const) {
      expect(computeDevelopmentGain({ ...NEUTRO, [campo]: 0 })).toBe(0);
    }
  });

  it("baseLearningRate e focoDoTreino são fatores DISTINTOS", () => {
    // "Um jogador que aprende rápido num treino sem foco no atributo evolui
    // pouco, e vice-versa" (§6:307). Se fossem o mesmo fator, trocar um pelo
    // outro daria o mesmo resultado — e daria, sendo produto; o que este teste
    // fixa é que ambos entram, e que zerar QUALQUER um zera.
    const soAprende = computeDevelopmentGain({
      ...NEUTRO,
      baseLearningRate: 1,
      trainingFocus: 0.1,
    });
    const soFoco = computeDevelopmentGain({
      ...NEUTRO,
      baseLearningRate: 0.1,
      trainingFocus: 1,
    });
    const ambos = computeDevelopmentGain({ ...NEUTRO });
    expect(soAprende).toBeLessThan(ambos);
    expect(soFoco).toBeLessThan(ambos);
  });

  it("potencial restante zerado impede ganho", () => {
    expect(
      computeDevelopmentGain({ ...NEUTRO, remainingPotential: 0 }),
    ).toBe(0);
  });
});

describe("computeDevelopmentGain — penalidades subtrativas", () => {
  it("fadiga, lesão e pressão SUBTRAEM, não multiplicam", () => {
    // A distinção importa: penalidade multiplicativa nunca leva a zero, e o
    // doc lista as três com sinal de menos (§6:317-320). Fadiga alta tem que
    // conseguir anular um treino bom.
    const semPenalidade = computeDevelopmentGain({ ...NEUTRO });
    const comFadiga = computeDevelopmentGain({ ...NEUTRO, fatigue: 0.5 });
    expect(semPenalidade - comFadiga).toBeCloseTo(0.5 * GAIN_SCALE, 5);
  });

  it("nunca devolve ganho negativo", () => {
    // Treino ruim estagna; não desfaz o jogador. A perda por trade-off é outra
    // regra (§6:297-303) e tem o seu próprio caminho.
    expect(
      computeDevelopmentGain({
        ...NEUTRO,
        fatigue: 1,
        injury: 1,
        negativePressure: 1,
      }),
    ).toBe(0);
  });

  it("as três penalidades acumulam", () => {
    const uma = computeDevelopmentGain({ ...NEUTRO, fatigue: 0.1 });
    const tres = computeDevelopmentGain({
      ...NEUTRO,
      fatigue: 0.1,
      injury: 0.1,
      negativePressure: 0.1,
    });
    expect(tres).toBeLessThan(uma);
  });
});

describe("computeDevelopmentGain — escala e determinismo", () => {
  it("devolve inteiro em pontos-base (R-82)", () => {
    // Escalas internas base 10000: o accrual guarda BigInt, e float acumulado
    // ao longo de uma temporada deriva. GAIN_SCALE é a ponte.
    const ganho = computeDevelopmentGain({ ...NEUTRO, trainingQuality: 0.37 });
    expect(Number.isInteger(ganho)).toBe(true);
    expect(GAIN_SCALE).toBe(10_000);
  });

  it("é determinístico", () => {
    const entrada = { ...NEUTRO, age: 20, trainingQuality: 0.83, morale: 0.6 };
    expect(computeDevelopmentGain(entrada)).toBe(
      computeDevelopmentGain(entrada),
    );
  });

  it("rejeita fator fora de 0..1", () => {
    expect(() =>
      computeDevelopmentGain({ ...NEUTRO, trainingQuality: 1.5 }),
    ).toThrow();
    expect(() =>
      computeDevelopmentGain({ ...NEUTRO, compatibility: -0.1 }),
    ).toThrow();
  });

  it("rejeita idade absurda", () => {
    expect(() => computeDevelopmentGain({ ...NEUTRO, age: 0 })).toThrow();
    expect(() => computeDevelopmentGain({ ...NEUTRO, age: 99 })).toThrow();
  });
});
