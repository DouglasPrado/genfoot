import { describe, expect, it } from "vitest";

import {
  EXTRA_TIME_MINUTES,
  REGULATION_MINUTES,
  matchDurationMs,
  matchMinuteAt,
  tickAt,
} from "./live-match-clock.js";

/** Um dia lógico valendo 4 horas reais — a configuração do mundo demo. */
const DAY_4H = 4 * 60 * 60 * 1000;

describe("matchDurationMs", () => {
  it("a partida ocupa a mesma fatia do dia que ocupa na vida real", () => {
    // 90 dos 1440 minutos do dia = 1/16 do dia. Com o dia a 4h, são 15 min.
    expect(matchDurationMs(DAY_4H, false)).toBe(15 * 60 * 1000);
  });

  it("acelerar o mundo acelera a partida na mesma proporção", () => {
    // Dia de 1 hora → a partida cai para 3m45s, sem constante nova.
    expect(matchDurationMs(60 * 60 * 1000, false)).toBe(3.75 * 60 * 1000);
  });

  it("a prorrogação estica o jogo pelos 30 minutos que ela tem", () => {
    const normal = matchDurationMs(DAY_4H, false);
    const comProrrogacao = matchDurationMs(DAY_4H, true);
    expect(comProrrogacao / normal).toBeCloseTo(
      (REGULATION_MINUTES + EXTRA_TIME_MINUTES) / REGULATION_MINUTES,
      5,
    );
  });

  it("dia inválido não vira duração negativa nem divisão por zero", () => {
    expect(matchDurationMs(0, false)).toBe(0);
    expect(matchDurationMs(-500, false)).toBe(0);
  });
});

describe("matchMinuteAt", () => {
  it("no apito inicial o relógio está em zero", () => {
    expect(matchMinuteAt(0, DAY_4H, false)).toBe(0);
  });

  it("na metade do tempo real, o jogo está no intervalo", () => {
    expect(matchMinuteAt(matchDurationMs(DAY_4H, false) / 2, DAY_4H, false)).toBe(
      45,
    );
  });

  it("no fim do tempo real, o jogo está nos 90", () => {
    expect(matchMinuteAt(matchDurationMs(DAY_4H, false), DAY_4H, false)).toBe(90);
  });

  it("passar do tempo não passa dos 90 — o jogo não corre para sempre", () => {
    expect(
      matchMinuteAt(matchDurationMs(DAY_4H, false) * 3, DAY_4H, false),
    ).toBe(90);
  });

  it("tempo negativo (relógio atrás do apito) fica em zero, não negativo", () => {
    expect(matchMinuteAt(-1000, DAY_4H, false)).toBe(0);
  });
});

describe("tickAt", () => {
  it("o tick acompanha o minuto: metade do jogo, metade dos lances", () => {
    const meio = matchDurationMs(DAY_4H, false) / 2;
    expect(tickAt(meio, DAY_4H, 12, false)).toBe(6);
  });

  it("no apito inicial nenhum lance foi resolvido", () => {
    expect(tickAt(0, DAY_4H, 12, false)).toBe(0);
  });

  it("no fim, todos os lances foram resolvidos", () => {
    expect(tickAt(matchDurationMs(DAY_4H, false), DAY_4H, 12, false)).toBe(12);
  });

  it("nunca passa do total de lances, por mais tarde que o relógio chegue", () => {
    expect(tickAt(DAY_4H * 5, DAY_4H, 12, false)).toBe(12);
  });

  it("o tick é INTEIRO — meio lance não existe", () => {
    const tick = tickAt(matchDurationMs(DAY_4H, false) * 0.37, DAY_4H, 12, false);
    expect(Number.isInteger(tick)).toBe(true);
  });
});
