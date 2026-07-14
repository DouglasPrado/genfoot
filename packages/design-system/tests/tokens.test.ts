import { describe, expect, it } from "vitest";

import {
  color,
  commandRisk,
  requiresConfirmation,
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

  it("classifica risco de command e exige confirmação (T017)", () => {
    expect(commandRisk("competition:homologate")).toBe("irreversible");
    expect(commandRisk("admin:place-quarantine")).toBe("irreversible");
    expect(commandRisk("admin:record-risk")).toBe("high");
    expect(commandRisk("ledger:post-transaction")).toBe("high");
    expect(commandRisk("world:advance-days")).toBe("medium");
    expect(commandRisk("club:command")).toBe("low");

    expect(requiresConfirmation("competition:homologate")).toBe(true);
    expect(requiresConfirmation("admin:record-risk")).toBe(true);
    expect(requiresConfirmation("world:advance-days")).toBe(false);
  });
});
