import { describe, expect, it } from "vitest";

import {
  FOCUS_ATTRIBUTES,
  accrueTrainingDay,
  type AccrualPlayerContext,
} from "./training-accrual.js";
import { TrainingFocus } from "./training-types.js";
import {
  TECHNICAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
} from "../players/player-attributes.js";

const P1 = "019b76da-a800-72ca-9ec5-f37f87ff4d3a";

function ctx(over: Partial<AccrualPlayerContext> = {}): AccrualPlayerContext {
  return {
    playerId: P1,
    age: 19, // faixa de pico (18-21)
    baselineAbility: 50,
    currentAbility: 50,
    naturalPotential: 90,
    baseLearningRate: 1,
    trainingQuality: 1,
    compatibility: 1,
    competitiveMinutes: 1,
    morale: 1,
    fatigue: 0,
    injury: 0,
    negativePressure: 0,
    applicableAttributes: [...FOCUS_ATTRIBUTES.TECHNICAL],
    ...over,
  };
}

describe("FOCUS_ATTRIBUTES — o mapa foco→atributos", () => {
  it("cobre todos os focos do enum TrainingFocus", () => {
    for (const focus of Object.values(TrainingFocus)) {
      expect(FOCUS_ATTRIBUTES[focus]).toBeDefined();
    }
  });

  it("RECOVERY não desenvolve atributo nenhum — é descanso", () => {
    // O treino que o médico manda fazer não é ganho: é o buffer parado.
    expect(FOCUS_ATTRIBUTES.RECOVERY).toEqual([]);
  });

  it("DEFENSIVE aponta para marcação/desarme, não finalização", () => {
    expect(FOCUS_ATTRIBUTES.DEFENSIVE).toContain("marking");
    expect(FOCUS_ATTRIBUTES.DEFENSIVE).toContain("tackling");
    expect(FOCUS_ATTRIBUTES.DEFENSIVE).not.toContain("finishing");
  });

  it("só emite códigos canônicos de atributo", () => {
    const validos = new Set<string>([
      ...TECHNICAL_ATTRIBUTES,
      ...PHYSICAL_ATTRIBUTES,
      ...MENTAL_ATTRIBUTES,
    ]);
    // nenhum foco inventa um código fora do grid canônico (R-188)
    for (const focus of Object.values(TrainingFocus)) {
      for (const code of FOCUS_ATTRIBUTES[focus]) {
        expect(validos.has(code)).toBe(true);
      }
    }
  });
});

describe("accrueTrainingDay — acumulação no buffer (R-212/R-82)", () => {
  it("acumula por attributeCode, só nos atributos do foco", () => {
    const deltas = accrueTrainingDay(
      { focus: TrainingFocus.DEFENSIVE, workload: 100, qualityFactor: 1 },
      ctx({ applicableAttributes: ["marking", "tackling", "positioning"] }),
    );
    const codes = deltas.map((d) => d.attributeCode);
    expect(codes).toContain("marking");
    expect(codes).not.toContain("finishing");
    expect(deltas.every((d) => d.playerId === P1)).toBe(true);
  });

  it("delta em pontos-base inteiros (R-82), positivo com ganho", () => {
    const deltas = accrueTrainingDay(
      { focus: TrainingFocus.TECHNICAL, workload: 100, qualityFactor: 1 },
      ctx(),
    );
    expect(deltas.length).toBeGreaterThan(0);
    for (const d of deltas) {
      expect(Number.isInteger(d.pendingDelta)).toBe(true);
      expect(d.pendingDelta).toBeGreaterThan(0);
    }
  });

  it("RECOVERY não gera delta nenhum", () => {
    expect(
      accrueTrainingDay(
        { focus: TrainingFocus.RECOVERY, workload: 100, qualityFactor: 1 },
        ctx(),
      ),
    ).toEqual([]);
  });

  it("qualityFactor da agenda (R-13) reduz o ganho proporcionalmente", () => {
    const cheio = accrueTrainingDay(
      { focus: TrainingFocus.TECHNICAL, workload: 100, qualityFactor: 1 },
      ctx(),
    );
    const meio = accrueTrainingDay(
      { focus: TrainingFocus.TECHNICAL, workload: 100, qualityFactor: 0.5 },
      ctx(),
    );
    const somaCheio = cheio.reduce((s, d) => s + d.pendingDelta, 0);
    const somaMeio = meio.reduce((s, d) => s + d.pendingDelta, 0);
    expect(somaMeio).toBeLessThan(somaCheio);
  });

  it("workload zero não desenvolve", () => {
    expect(
      accrueTrainingDay(
        { focus: TrainingFocus.TECHNICAL, workload: 0, qualityFactor: 1 },
        ctx(),
      ),
    ).toEqual([]);
  });

  it("jovem no pico ganha mais que veterano com o mesmo treino (§5)", () => {
    const jovem = accrueTrainingDay(
      { focus: TrainingFocus.TECHNICAL, workload: 100, qualityFactor: 1 },
      ctx({ age: 19 }),
    ).reduce((s, d) => s + d.pendingDelta, 0);
    const veterano = accrueTrainingDay(
      { focus: TrainingFocus.TECHNICAL, workload: 100, qualityFactor: 1 },
      ctx({ age: 34 }),
    ).reduce((s, d) => s + d.pendingDelta, 0);
    expect(jovem).toBeGreaterThan(veterano);
  });

  it("não desenvolve atributo que não se aplica à posição", () => {
    // Só os applicableAttributes do jogador entram — treinar o que ele não tem
    // (grid de goleiro num zagueiro) não gera buffer.
    const deltas = accrueTrainingDay(
      { focus: TrainingFocus.TECHNICAL, workload: 100, qualityFactor: 1 },
      ctx({ applicableAttributes: ["shortPassing"] }),
    );
    expect(deltas.map((d) => d.attributeCode)).toEqual(["shortPassing"]);
  });

  it("é determinístico", () => {
    const a = accrueTrainingDay(
      { focus: TrainingFocus.PHYSICAL, workload: 70, qualityFactor: 0.8 },
      ctx(),
    );
    const b = accrueTrainingDay(
      { focus: TrainingFocus.PHYSICAL, workload: 70, qualityFactor: 0.8 },
      ctx(),
    );
    expect(a).toEqual(b);
  });
});
