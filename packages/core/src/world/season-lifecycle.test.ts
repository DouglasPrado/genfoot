import { describe, expect, it } from "vitest";

import { SEASON_DAYS } from "./game-world.js";
import {
  seasonIdFor,
  seasonNumberOn,
  seasonWindow,
} from "./season-lifecycle.js";

const START = "2026-01-01";
const SEED = "seed-abc";
const WORLD = "11111111-1111-7111-8111-111111111111";

describe("seasonNumberOn — a temporada de uma data (espelha o domínio)", () => {
  it("o dia de início é a temporada 1", () => {
    expect(seasonNumberOn(START, START)).toBe(1);
  });

  it("o último dia da temporada 1 ainda é 1", () => {
    // dias 0..364 são a temporada 1 (SEASON_DAYS=365)
    const lastDay = "2026-12-31"; // 364 dias depois de 2026-01-01
    expect(seasonNumberOn(START, lastDay)).toBe(1);
  });

  it("cruzar SEASON_DAYS vira a temporada 2", () => {
    const firstDayS2 = "2027-01-01"; // 365 dias depois
    expect(seasonNumberOn(START, firstDayS2)).toBe(2);
  });

  it("bate com a fórmula do domínio para múltiplas temporadas", () => {
    for (const n of [1, 2, 3, 5]) {
      const w = seasonWindow(START, n);
      expect(seasonNumberOn(START, w.startsAt)).toBe(n);
      expect(seasonNumberOn(START, w.endsAt)).toBe(n);
    }
  });
});

describe("seasonWindow — janela [startsAt, endsAt] de uma temporada", () => {
  it("a temporada 1 começa no início do mundo", () => {
    expect(seasonWindow(START, 1).startsAt).toBe(START);
  });

  it("endsAt é o último dia inclusive; o dia seguinte já é a próxima", () => {
    const w1 = seasonWindow(START, 1);
    const w2 = seasonWindow(START, 2);
    // endsAt da 1 + 1 dia = startsAt da 2
    expect(seasonNumberOn(START, w1.endsAt)).toBe(1);
    expect(w2.startsAt > w1.endsAt).toBe(true);
  });

  it("temporadas consecutivas se emendam sem buraco nem sobreposição", () => {
    const w1 = seasonWindow(START, 1);
    const w2 = seasonWindow(START, 2);
    const dayAfterW1End = seasonWindow(START, 1);
    void dayAfterW1End;
    // largura de cada janela = SEASON_DAYS dias
    const days = (a: string, b: string): number =>
      Math.round(
        (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) /
          86_400_000,
      );
    expect(days(w1.startsAt, w1.endsAt)).toBe(SEASON_DAYS - 1);
    expect(days(w1.startsAt, w2.startsAt)).toBe(SEASON_DAYS);
  });
});

describe("seasonIdFor — id determinístico por (mundo, número)", () => {
  it("é determinístico: mesma entrada, mesmo id", () => {
    expect(seasonIdFor(SEED, WORLD, 1)).toBe(seasonIdFor(SEED, WORLD, 1));
  });

  it("números diferentes dão ids diferentes", () => {
    expect(seasonIdFor(SEED, WORLD, 1)).not.toBe(seasonIdFor(SEED, WORLD, 2));
  });

  it("mundos diferentes dão ids diferentes para o mesmo número", () => {
    const other = "22222222-2222-7222-8222-222222222222";
    expect(seasonIdFor(SEED, WORLD, 1)).not.toBe(seasonIdFor(SEED, other, 1));
  });

  it("tem formato de UUID", () => {
    expect(seasonIdFor(SEED, WORLD, 1)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
