import { describe, expect, it } from "vitest";

import {
  MANDATORY_SCREEN_STATES,
  SCREEN_REGISTRY,
  screensFor,
  screenById,
} from "../../src/index.js";

describe("screen registry (FR-010 / SC-003 / FR-007)", () => {
  it("cobre exatamente 138 telas (114 mobile + 24 admin)", () => {
    expect(SCREEN_REGISTRY).toHaveLength(138);
    expect(screensFor("mobile")).toHaveLength(114);
    expect(screensFor("admin")).toHaveLength(24);
  });

  it("nenhum ID duplicado", () => {
    const ids = SCREEN_REGISTRY.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("toda tela mapeia um arquétipo de layout (FR-010)", () => {
    for (const screen of SCREEN_REGISTRY) {
      expect(screen.archetype).toMatch(/^L-[MA]0[1-9]$/);
    }
  });

  it("toda tela herda os 12 estados obrigatórios (FR-007/SC-003)", () => {
    expect(MANDATORY_SCREEN_STATES).toHaveLength(12);
    for (const screen of SCREEN_REGISTRY) {
      expect(screen.states).toEqual(MANDATORY_SCREEN_STATES);
    }
  });

  it("toda tela tem risco proporcional; irreversível exige o padrão máximo", () => {
    const seasonClose = screenById("M-SEASON-CLOSE");
    expect(seasonClose?.risk).toBe("irreversible");
    const home = screenById("M-HOME");
    expect(home?.risk).toBe("low");
    const login = screenById("A-LOGIN");
    expect(login?.risk).toBe("irreversible");
  });
});
