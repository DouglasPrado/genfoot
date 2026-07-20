import { describe, expect, it } from "vitest";

import {
  FOCUS_OPTIONS,
  buildSetPlanPayload,
  clampIntensity,
  entryFocusFor,
  intensityLabel,
} from "./training-plan-model.js";

const disponivel = { playerId: "p1", availability: "AVAILABLE" };
const lesionado = { playerId: "p2", availability: "INJURED" };
const suspenso = { playerId: "p3", availability: "SUSPENDED" };

describe("training-plan-model (M-TRAINING coletivo)", () => {
  it("oferece os focos do domínio, com rótulo em português", () => {
    const codes = FOCUS_OPTIONS.map((o) => o.focus);
    expect(codes).toContain("OFFENSIVE");
    expect(codes).toContain("RECOVERY");
    // Cobre TODOS os focos do domínio — um faltando some da tela em silêncio.
    expect(FOCUS_OPTIONS).toHaveLength(9);
    // Rótulo é para a tela: existe e não é o enum cru gritado em inglês.
    expect(FOCUS_OPTIONS.every((o) => o.label.trim().length > 0)).toBe(true);
    expect(new Set(FOCUS_OPTIONS.map((o) => o.label)).size).toBe(9);
  });

  it("intensidade fica presa em 0..100, o intervalo do domínio", () => {
    expect(clampIntensity(-10)).toBe(0);
    expect(clampIntensity(140)).toBe(100);
    expect(clampIntensity(55)).toBe(55);
    // Fracionário não passa: o domínio exige inteiro.
    expect(clampIntensity(55.7)).toBe(56);
  });

  it("rotula a carga em palavras, não só número", () => {
    expect(intensityLabel(0)).toBe("Poupando");
    expect(intensityLabel(30)).toBe("Leve");
    expect(intensityLabel(60)).toBe("Firme");
    expect(intensityLabel(90)).toBe("Pesado");
  });

  it("jogador sob restrição médica entra como RECUPERAÇÃO, não com o foco coletivo", () => {
    // O domínio recusaria (PLAYER_UNDER_MEDICAL_RESTRICTION). A tela não deve
    // deixar montar um plano que já se sabe inválido.
    expect(entryFocusFor(lesionado, "OFFENSIVE")).toBe("RECOVERY");
    expect(entryFocusFor(disponivel, "OFFENSIVE")).toBe("OFFENSIVE");
  });

  it("suspenso NÃO é restrição médica — treina o foco coletivo normalmente", () => {
    expect(entryFocusFor(suspenso, "TECHNICAL")).toBe("TECHNICAL");
  });

  it("monta o payload sem seasonId — o servidor resolve a temporada corrente", () => {
    const payload = buildSetPlanPayload({
      clubId: "c1",
      name: "Base ofensiva",
      focus: "OFFENSIVE",
      intensity: 60,
      players: [disponivel, lesionado],
      expectedVersion: null,
    });
    expect("error" in payload).toBe(false);
    if ("error" in payload) return;
    expect(payload).not.toHaveProperty("seasonId");
    expect(payload.entries).toEqual([
      { playerId: "p1", focus: "OFFENSIVE", workload: 60 },
      { playerId: "p2", focus: "RECOVERY", workload: 60 },
    ]);
  });

  it("elenco vazio não vira plano — o domínio recusaria", () => {
    const payload = buildSetPlanPayload({
      clubId: "c1",
      name: "Vazio",
      focus: "OFFENSIVE",
      intensity: 50,
      players: [],
      expectedVersion: null,
    });
    expect(payload).toEqual({ error: "NO_PLAYERS" });
  });

  it("nome em branco é recusado antes de sair do aparelho", () => {
    expect(
      buildSetPlanPayload({
        clubId: "c1",
        name: "   ",
        focus: "OFFENSIVE",
        intensity: 50,
        players: [disponivel],
        expectedVersion: null,
      }),
    ).toEqual({ error: "NO_NAME" });
  });

  it("carrega expectedVersion para a concorrência otimista", () => {
    const payload = buildSetPlanPayload({
      clubId: "c1",
      name: "Plano",
      focus: "MENTAL",
      intensity: 40,
      players: [disponivel],
      expectedVersion: 7,
    });
    if ("error" in payload) throw new Error("deveria montar");
    expect(payload.expectedVersion).toBe(7);
  });
});
