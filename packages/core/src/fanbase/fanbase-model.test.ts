import { describe, expect, it } from "vitest";

import {
  HEADCOUNT_RANGE,
  deriveFanbaseHeadcount,
} from "./fanbase-model.js";

describe("deriveFanbaseHeadcount — a torcida na largada (C10, R-182)", () => {
  it("é determinística: mesmo mundo e índice, mesma torcida", () => {
    const a = deriveFanbaseHeadcount("grinta-beta", 3);
    const b = deriveFanbaseHeadcount("grinta-beta", 3);
    expect(a).toBe(b);
  });

  it("clubes diferentes do mesmo mundo têm torcidas diferentes", () => {
    const sizes = Array.from({ length: 16 }, (_v, i) =>
      deriveFanbaseHeadcount("grinta-beta", i),
    );
    expect(new Set(sizes).size).toBeGreaterThan(1);
  });

  it("mundos diferentes geram torcidas diferentes para o mesmo índice", () => {
    expect(deriveFanbaseHeadcount("mundo-a", 0)).not.toBe(
      deriveFanbaseHeadcount("mundo-b", 0),
    );
  });

  it("fica dentro da faixa [min, max]", () => {
    for (let i = 0; i < 64; i += 1) {
      const size = deriveFanbaseHeadcount("grinta-beta", i);
      expect(size).toBeGreaterThanOrEqual(HEADCOUNT_RANGE.min);
      expect(size).toBeLessThanOrEqual(HEADCOUNT_RANGE.max);
    }
  });

  it("a curva é enviesada para baixo — a mediana fica na metade inferior da faixa", () => {
    const sizes = Array.from({ length: 200 }, (_v, i) =>
      deriveFanbaseHeadcount("grinta-beta", i),
    ).sort((a, b) => a - b);
    const median = sizes[Math.floor(sizes.length / 2)]!;
    const midpoint = (HEADCOUNT_RANGE.min + HEADCOUNT_RANGE.max) / 2;
    expect(median).toBeLessThan(midpoint);
  });
});
