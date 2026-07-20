import { describe, expect, it } from "vitest";

import {
  SESSION_DURATION_DAYS,
  sessionElapsedDays,
  sessionFraction,
  sessionGainMilli,
  sessionIsComplete,
} from "./training-session.js";

describe("sessionElapsedDays", () => {
  it("conta os dias treinados", () => {
    expect(sessionElapsedDays("2026-01-01", "2026-01-04")).toBe(3);
  });
  it("nunca é negativo (data corrente antes do início)", () => {
    expect(sessionElapsedDays("2026-01-10", "2026-01-01")).toBe(0);
  });
});

describe("sessionIsComplete", () => {
  it("completa ao atingir a duração", () => {
    expect(sessionIsComplete(SESSION_DURATION_DAYS)).toBe(true);
    expect(sessionIsComplete(SESSION_DURATION_DAYS - 1)).toBe(false);
  });
});

describe("sessionGainMilli — ganho proporcional aos dias, tetado na duração", () => {
  it("sessão completa rende o ganho diário × duração", () => {
    const g = sessionGainMilli({ dailyGainMilli: 1000, elapsedDays: 7, durationDays: 7 });
    expect(g).toBe(7000);
  });
  it("interromper na metade rende parcial (não tudo, não nada)", () => {
    const full = sessionGainMilli({ dailyGainMilli: 1000, elapsedDays: 7, durationDays: 7 });
    const half = sessionGainMilli({ dailyGainMilli: 1000, elapsedDays: 3, durationDays: 7 });
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(full);
    expect(half).toBe(3000);
  });
  it("zero dia treinado, zero ganho", () => {
    expect(sessionGainMilli({ dailyGainMilli: 1000, elapsedDays: 0 })).toBe(0);
  });
  it("passar da duração não rende além do teto", () => {
    const capped = sessionGainMilli({ dailyGainMilli: 1000, elapsedDays: 30, durationDays: 7 });
    expect(capped).toBe(7000);
  });
  it("ganho diário zero (jogador no teto) rende zero", () => {
    expect(sessionGainMilli({ dailyGainMilli: 0, elapsedDays: 7 })).toBe(0);
  });
});

describe("sessionFraction — barra de progresso", () => {
  it("0 no início, 1 no fim, meio no meio", () => {
    expect(sessionFraction(0, 7)).toBe(0);
    expect(sessionFraction(7, 7)).toBe(1);
    expect(sessionFraction(0, 0)).toBe(1);
    expect(sessionFraction(3.5, 7)).toBeCloseTo(0.5, 5);
  });
  it("não passa de 1 além da duração", () => {
    expect(sessionFraction(20, 7)).toBe(1);
  });
});
