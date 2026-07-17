import { describe, expect, it } from "vitest";

import {
  color,
  commandRisk,
  contrastRatio,
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

  /**
   * `world:delete` era `low`, e portanto NÃO pedia confirmação no console.
   *
   * O command mais destrutivo do sistema — apaga o mundo e tudo que pende dele —
   * não casava com nenhuma das listas: nem `:homologate`, nem `admin:`, nem
   * `:advance-`. O botão da tela tem diálogo próprio e o servidor exige
   * `confirmSeed`, então nada foi apagado por isto; mas quem digitasse
   * `world:delete` no console disparava sem uma pergunta sequer, e o chip de
   * risco dizia "low" para o operador.
   */
  it("classifica o ciclo de vida do mundo pelo que cada transição custa", () => {
    // Apagar é irreversível de verdade: não há volta, nem histórico preservado.
    expect(commandRisk("world:delete")).toBe("irreversible");
    expect(requiresConfirmation("world:delete")).toBe(true);

    // Arquivar NÃO é irreversível (R-56 manda ser reversível), mas põe o mundo
    // inteiro em read-only: alto risco, confirmação obrigatória.
    expect(commandRisk("world:archive")).toBe("high");
    expect(requiresConfirmation("world:archive")).toBe(true);

    // Congelar e descongelar são operação corriqueira e reversível na hora.
    expect(commandRisk("world:pause")).toBe("medium");
    expect(commandRisk("world:resume")).toBe("medium");
    expect(requiresConfirmation("world:pause")).toBe(false);
  });

  it("contraste WCAG dos tokens críticos passa os limiares (FR-011/SC-004)", () => {
    // texto normal ≥ 4.5:1; texto de apoio e acento (UI) ≥ 3:1
    expect(contrastRatio(color.text, color.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color.textMuted, color.background)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(color.primary, color.background)).toBeGreaterThanOrEqual(3);
    // botão primário: texto escuro sobre verde-neon
    expect(
      contrastRatio(color.primaryContrast, color.primary),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
