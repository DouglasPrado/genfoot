import { describe, expect, it } from "vitest";

import { InjuryType } from "./injury-episode-types.js";
import {
  INJURY_BASE_RATE,
  INJURY_MAX_RATE,
  fatigueRiskMultiplier,
  injuryProbability,
  injuryTypeDistribution,
  rollInjuryType,
} from "./injury-risk.js";

describe("F13 · p_lesão (R-21)", () => {
  it("sem fadiga e com risco neutro cai na taxa-base", () => {
    expect(injuryProbability({ fatigue: 0, riskScore: 50 })).toBeCloseTo(
      INJURY_BASE_RATE,
      10,
    );
  });

  it("a fadiga só entra em cena depois dos 60% (R-16)", () => {
    expect(fatigueRiskMultiplier(0)).toBe(1);
    expect(fatigueRiskMultiplier(60)).toBe(1);
    expect(fatigueRiskMultiplier(100)).toBe(4);
  });

  it("≈3,6% de lesão numa partida-base de 90 ticks", () => {
    const perTick = injuryProbability({ fatigue: 0, riskScore: 50 });
    const perMatch = 1 - (1 - perTick) ** 90;

    expect(perMatch).toBeGreaterThan(0.03);
    expect(perMatch).toBeLessThan(0.04);
  });

  it("nunca passa do teto de 0,02 por tick", () => {
    expect(injuryProbability({ fatigue: 100, riskScore: 100 })).toBeLessThanOrEqual(
      INJURY_MAX_RATE,
    );
  });

  it("nunca fica negativa, nem com risco mínimo", () => {
    expect(injuryProbability({ fatigue: 0, riskScore: 0 })).toBeGreaterThanOrEqual(0);
  });

  it("jogador fatigado corre mais risco que descansado — a lesão não é independente da decisão", () => {
    const rested = injuryProbability({ fatigue: 20, riskScore: 50 });
    const spent = injuryProbability({ fatigue: 90, riskScore: 50 });

    expect(spent).toBeGreaterThan(rested);
  });
});

describe("matriz de tipo (R-21)", () => {
  const neutral = {
    fatigue: 40,
    contact: false,
    recurrentHistory: false,
    age: 25,
  } as const;

  it("a distribuição soma 1", () => {
    const total = injuryTypeDistribution(neutral).reduce(
      (sum, entry) => sum + entry.probability,
      0,
    );

    expect(total).toBeCloseTo(1, 10);
  });

  it("fadiga > 70 dobra o peso da muscular", () => {
    const base = injuryTypeDistribution(neutral);
    const tired = injuryTypeDistribution({ ...neutral, fatigue: 80 });
    const muscular = (
      distribution: ReadonlyArray<{ type: InjuryType; probability: number }>,
    ) =>
      distribution.find((entry) => entry.type === InjuryType.MUSCULAR)
        ?.probability ?? 0;

    expect(muscular(tired)).toBeGreaterThan(muscular(base));
  });

  it("contato triplica a por pancada e histórico triplica a recorrente", () => {
    const impact = injuryTypeDistribution({ ...neutral, contact: true }).find(
      (entry) => entry.type === InjuryType.IMPACT,
    );
    const recurrent = injuryTypeDistribution({
      ...neutral,
      recurrentHistory: true,
    }).find((entry) => entry.type === InjuryType.RECURRENT);

    expect(impact?.probability).toBeGreaterThan(0.03 / 1.01);
    expect(recurrent?.probability).toBeGreaterThan(0.02);
  });

  it("acima de 32 anos a grave pesa mais", () => {
    const serious = (age: number) =>
      injuryTypeDistribution({ ...neutral, age }).find(
        (entry) => entry.type === InjuryType.SERIOUS,
      )?.probability ?? 0;

    expect(serious(35)).toBeGreaterThan(serious(25));
  });

  it("o sorteio é determinístico — mesmo roll, mesmo tipo", () => {
    expect(rollInjuryType(neutral, 0.1)).toBe(rollInjuryType(neutral, 0.1));
    expect(rollInjuryType(neutral, 0.1)).toBe(InjuryType.LIGHT);
    expect(rollInjuryType(neutral, 0.999)).toBe(InjuryType.RECURRENT);
  });
});
