import { describe, expect, it } from "vitest";

import {
  color,
  riskColor,
  riskLevel,
  commandStatusColor,
  space,
} from "../src/index.js";

describe("design-system tokens", () => {
  it("expõe a paleta do protótipo (dark + verde-neon)", () => {
    expect(color.background).toMatch(/^#[0-9a-f]{6}$/i);
    expect(color.primary).toBe("#c2f74a");
    expect(Object.values(color).every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(
      true,
    );
  });

  it("escala de espaçamento monotônica", () => {
    const values = Object.values(space);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    }
  });

  it("cor de risco por nível e por percentual", () => {
    expect(riskColor("low")).toBe(color.success);
    expect(riskColor("high")).toBe(color.danger);
    expect(riskLevel(20)).toBe("low");
    expect(riskLevel(40)).toBe("medium");
    expect(riskLevel(70)).toBe("high");
  });

  it("cor de estado de command tracking", () => {
    expect(commandStatusColor("APPLIED")).toBe(color.success);
    expect(commandStatusColor("REJECTED")).toBe(color.danger);
    expect(commandStatusColor("UNKNOWN_RECOVERING")).toBe(color.warning);
  });
});
