import { describe, expect, it } from "vitest";

import { formatCountdown, sessionCountdown } from "./session-countdown.js";

describe("sessionCountdown — quanto falta para a sessão render tudo", () => {
  const clock = {
    realSecondsPerDay: 4 * 3600, // 4h reais por dia lógico (como o seed)
    nextTickAt: "2026-01-10T12:00:00.000Z",
  };

  it("conta até o próximo dia + os dias restantes até a duração", () => {
    // Agora 11:00; próximo tick 12:00 (falta 1h). Restam 3 dias de duração
    // (elapsed 4 de 7). Total = 1h + 2 dias * 4h = 1h + 8h = 9h.
    const r = sessionCountdown({
      ...clock,
      elapsedDays: 4,
      durationDays: 7,
      nowIso: "2026-01-10T11:00:00.000Z",
    });
    expect(r.complete).toBe(false);
    expect(r.secondsRemaining).toBe(9 * 3600);
  });

  it("sessão já completa → 0 e complete=true", () => {
    const r = sessionCountdown({
      ...clock,
      elapsedDays: 7,
      durationDays: 7,
      nowIso: "2026-01-10T11:00:00.000Z",
    });
    expect(r.complete).toBe(true);
    expect(r.secondsRemaining).toBe(0);
  });

  it("último dia: só falta o tempo até o próximo tick", () => {
    const r = sessionCountdown({
      ...clock,
      elapsedDays: 6,
      durationDays: 7,
      nowIso: "2026-01-10T11:00:00.000Z",
    });
    expect(r.secondsRemaining).toBe(3600); // 1h até o tick, e aí completa
  });

  it("relógio parado (nextTickAt null) → sem contagem, mas informa dias restantes", () => {
    const r = sessionCountdown({
      realSecondsPerDay: null,
      nextTickAt: null,
      elapsedDays: 3,
      durationDays: 7,
      nowIso: "2026-01-10T11:00:00.000Z",
    });
    expect(r.secondsRemaining).toBeNull();
    expect(r.daysRemaining).toBe(4);
    expect(r.complete).toBe(false);
  });

  it("tick já vencido (nextTickAt no passado) não vira negativo", () => {
    const r = sessionCountdown({
      ...clock,
      elapsedDays: 6,
      durationDays: 7,
      nowIso: "2026-01-10T13:00:00.000Z", // 1h DEPOIS do tick
    });
    expect(r.secondsRemaining).toBe(0);
  });
});

describe("formatCountdown — mm:ss / hh:mm:ss legível", () => {
  it("formata horas, minutos e segundos", () => {
    expect(formatCountdown(9 * 3600)).toBe("9h 00m");
    expect(formatCountdown(3661)).toBe("1h 01m");
    expect(formatCountdown(65)).toBe("1m 05s");
    expect(formatCountdown(9)).toBe("0m 09s");
    expect(formatCountdown(0)).toBe("0m 00s");
  });

  it("null vira travessão", () => {
    expect(formatCountdown(null)).toBe("—");
  });
});
