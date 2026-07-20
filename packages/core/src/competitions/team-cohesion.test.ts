import { describe, expect, it } from "vitest";

import {
  COHESION_FORMATION_TRAINING_GAIN,
  COHESION_MATCH_GAIN,
  COHESION_START,
  cohesionAfterFormationTraining,
  cohesionAfterMatch,
  cohesionAfterTransfer,
  cohesionModifier,
} from "./team-cohesion.js";

describe("team-cohesion (R-220 Fase 3)", () => {
  it("jogar junto SOBE a coesão, com teto 100", () => {
    expect(cohesionAfterMatch(50)).toBeGreaterThan(50);
    expect(cohesionAfterMatch(99)).toBe(100);
  });

  it("transferência DESCE a coesão, com piso 0", () => {
    expect(cohesionAfterTransfer(50)).toBeLessThan(50);
    expect(cohesionAfterTransfer(5)).toBe(0);
  });

  it("modificador de partida é neutro no meio, ±6 nos extremos (R-15)", () => {
    expect(cohesionModifier(COHESION_START)).toBe(0);
    expect(cohesionModifier(100)).toBe(6);
    expect(cohesionModifier(0)).toBe(-6);
  });

  it("modificador é monotônico e fica na faixa [−6,+6]", () => {
    let prev = -99;
    for (let c = 0; c <= 100; c += 10) {
      const m = cohesionModifier(c);
      expect(m).toBeGreaterThanOrEqual(-6);
      expect(m).toBeLessThanOrEqual(6);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it("time entrosado (alta coesão) rende mais que time desentrosado", () => {
    expect(cohesionModifier(90)).toBeGreaterThan(cohesionModifier(20));
  });

  it("treinar a formação SOBE a coesão, com teto 100", () => {
    expect(cohesionAfterFormationTraining(50)).toBeGreaterThan(50);
    expect(cohesionAfterFormationTraining(99)).toBe(100);
  });

  it("treinar entrosa MENOS que jogar de verdade — praticar não é competir", () => {
    // Se treino rendesse igual ou mais que partida, ninguém precisaria jogar
    // para entrosar, e o custo de rotatividade sumiria. Treino é o caminho lento.
    expect(COHESION_FORMATION_TRAINING_GAIN).toBeLessThan(COHESION_MATCH_GAIN);
    expect(COHESION_FORMATION_TRAINING_GAIN).toBeGreaterThan(0);
    const partiu = cohesionAfterMatch(50);
    const treinou = cohesionAfterFormationTraining(50);
    expect(treinou - 50).toBeLessThan(partiu - 50);
  });
});
