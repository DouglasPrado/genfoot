import { describe, expect, it } from "vitest";

import { estimatePlayerValueMinor } from "./player-value.js";

const MILLION = 100_000_000n; // R$ 1.000.000 em minor

describe("estimatePlayerValueMinor — R-41 (primeira passada)", () => {
  it("o craque vale desproporcionalmente mais que o mediano (potência 3.5)", () => {
    const mediano = estimatePlayerValueMinor(60, 26);
    const craque = estimatePlayerValueMinor(80, 26);
    // 80 vs 60 não é 33% a mais — é ~2.7x, pela curva.
    expect(craque > mediano * 2n).toBe(true);
  });

  it("um titular de 60 no auge vale na casa do milhão", () => {
    const valor = estimatePlayerValueMinor(60, 26);
    expect(valor).toBeGreaterThan(MILLION / 2n);
    expect(valor).toBeLessThan(MILLION * 3n);
  });

  it("o jovem vale mais que o veterano de mesmo overall", () => {
    const jovem = estimatePlayerValueMinor(70, 20);
    const veterano = estimatePlayerValueMinor(70, 34);
    expect(jovem > veterano).toBe(true);
  });

  it("é bigint — não perde precisão em valores altos", () => {
    const valor = estimatePlayerValueMinor(95, 24);
    expect(typeof valor).toBe("bigint");
    expect(valor).toBeGreaterThan(0n);
  });

  it("overall zero vale zero, não negativo", () => {
    expect(estimatePlayerValueMinor(0, 26)).toBe(0n);
  });
});
