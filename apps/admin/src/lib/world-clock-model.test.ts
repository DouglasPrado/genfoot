import { describe, expect, it } from "vitest";

import {
  MAX_SECONDS_PER_DAY,
  MIN_SECONDS_PER_DAY,
  describeCadence,
  fromSeconds,
  timeUntilTick,
  toSeconds,
  validateSecondsPerDay,
} from "./world-clock-model";

describe("toSeconds", () => {
  it("converte cada unidade e arredonda", () => {
    expect(toSeconds(4, "hours")).toBe(14_400);
    expect(toSeconds(90, "seconds")).toBe(90);
    expect(toSeconds(2.5, "minutes")).toBe(150);
    expect(toSeconds(1.4, "seconds")).toBe(1);
  });
});

describe("fromSeconds", () => {
  it("escolhe a maior unidade sem fração", () => {
    expect(fromSeconds(14_400)).toEqual({ value: 4, unit: "hours" });
    expect(fromSeconds(90)).toEqual({ value: 90, unit: "seconds" });
    expect(fromSeconds(120)).toEqual({ value: 2, unit: "minutes" });
    expect(fromSeconds(150)).toEqual({ value: 150, unit: "seconds" });
    expect(fromSeconds(1)).toEqual({ value: 1, unit: "seconds" });
  });

  it("é inversa de toSeconds nos valores redondos", () => {
    for (const s of [1, 60, 3_600, 14_400, 86_400]) {
      const { value, unit } = fromSeconds(s);
      expect(toSeconds(value, unit)).toBe(s);
    }
  });
});

describe("validateSecondsPerDay", () => {
  it("aceita os valores dentro dos limites", () => {
    expect(validateSecondsPerDay(1)).toBeNull();
    expect(validateSecondsPerDay(14_400)).toBeNull();
    expect(validateSecondsPerDay(MAX_SECONDS_PER_DAY)).toBeNull();
  });

  it("recusa abaixo do mínimo", () => {
    expect(validateSecondsPerDay(MIN_SECONDS_PER_DAY - 1)).toMatch(/mínimo/);
    expect(validateSecondsPerDay(0)).toMatch(/mínimo/);
  });

  it("recusa acima do máximo", () => {
    expect(validateSecondsPerDay(MAX_SECONDS_PER_DAY + 1)).toMatch(/máximo/);
  });

  it("recusa não-inteiros e NaN", () => {
    expect(validateSecondsPerDay(1.5)).toMatch(/inteiro/);
    expect(validateSecondsPerDay(Number.NaN)).toMatch(/inteiro/);
  });
});

describe("describeCadence", () => {
  it("descreve com a unidade legível e concordância", () => {
    expect(describeCadence(14_400)).toBe(
      "Cada dia lógico avança a cada 4 horas.",
    );
    expect(describeCadence(3_600)).toBe("Cada dia lógico avança a cada 1 hora.");
    expect(describeCadence(1)).toBe("Cada dia lógico avança a cada 1 segundo.");
  });
});

describe("timeUntilTick", () => {
  const now = "2026-07-18T12:00:00.000Z";

  it("null quando não há tick agendado", () => {
    expect(timeUntilTick(null, now)).toBeNull();
  });

  it("formata o tempo restante em h/min/s", () => {
    expect(timeUntilTick("2026-07-18T16:00:00.000Z", now)).toBe("em 4h");
    expect(timeUntilTick("2026-07-18T12:01:30.000Z", now)).toBe("em 1min 30s");
    expect(timeUntilTick("2026-07-18T12:00:05.000Z", now)).toBe("em 5s");
  });

  it("diz vencido quando o tick já passou", () => {
    expect(timeUntilTick("2026-07-18T11:59:00.000Z", now)).toMatch(/vencido/);
  });
});
