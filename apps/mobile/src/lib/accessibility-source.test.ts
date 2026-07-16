import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function source(relative: string): string {
  return readFileSync(resolve(root, relative), "utf8");
}

describe("acessibilidade automatizada dos fluxos mobile críticos", () => {
  it.each([
    "screens/onboarding/index.tsx",
    "screens/club/index.tsx",
    "screens/market/index.tsx",
    "screens/live-match/index.tsx",
    "screens/squad/index.tsx",
  ])("%s nomeia controles para leitor de tela", (file) => {
    expect(source(file)).toContain("accessibilityLabel");
  });

  it.each([
    "screens/onboarding/index.tsx",
    "screens/market/index.tsx",
    "screens/live-match/index.tsx",
    "screens/squad/index.tsx",
  ])("%s expõe estado selecionado, ocupado ou desabilitado", (file) => {
    expect(source(file)).toContain("accessibilityState");
  });

  it("respeita reduced motion no único fluxo com transição animada", () => {
    const squad = source("screens/squad/index.tsx");
    expect(squad).toContain("useReducedMotion");
    expect(squad).toContain('animationType={reducedMotion ? "none" : "slide"}');
  });

  it("move o foco assistivo para o modal de substituição", () => {
    expect(source("screens/squad/index.tsx")).toContain(
      "AccessibilityInfo.setAccessibilityFocus",
    );
  });

  it("centraliza o touch target mínimo em 44 pontos", () => {
    expect(source("lib/accessibility.ts")).toContain(
      "MINIMUM_TOUCH_TARGET = 44",
    );
  });
});
