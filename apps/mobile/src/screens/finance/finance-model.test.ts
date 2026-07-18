import { describe, expect, it } from "vitest";
import type { ClubFinanceSnapshotView } from "@grinta/core";

import {
  deriveFinanceView,
  formatMinor,
  healthBadge,
} from "./finance-model";

const snapshot: ClubFinanceSnapshotView = {
  clubId: "club-1",
  currencyId: "cur",
  cashMinor: 500_000_000,
  seasonCost: {
    currencyId: "cur",
    totalMinor: 123_400_000,
    lines: [
      { category: "PLAYER_WAGES", amountMinor: 100_000_000, provenance: "ESTIMATED" },
      { category: "INFRA_MAINTENANCE", amountMinor: 13_400_000, provenance: "ESTIMATED" },
      { category: "STADIUM_MAINTENANCE", amountMinor: 10_000_000, provenance: "ESTIMATED" },
    ],
    contractedPlayerCount: 0,
    estimatedPlayerCount: 23,
    omitted: ["STAFF_WAGES", "TRAVEL", "TAXES", "AGENT_COMMISSION"],
  },
  financialHealth: { value: null, computedSubIndices: {}, missingSubIndices: [] },
  provenanceNotes: ["Folha estimada."],
};

describe("formatMinor", () => {
  it("converte centavos em R$ com separador pt-BR", () => {
    expect(formatMinor(500_000_000)).toBe("R$ 5.000.000");
  });
});

describe("healthBadge", () => {
  it("null vira Indisponível", () => {
    expect(healthBadge(null)).toMatchObject({ label: "Indisponível", tone: "unavailable" });
  });
  it("mapeia as 6 faixas", () => {
    expect(healthBadge(95).tone).toBe("excellent");
    expect(healthBadge(75).tone).toBe("stable");
    expect(healthBadge(55).tone).toBe("attention");
    expect(healthBadge(35).tone).toBe("pressure");
    expect(healthBadge(15).tone).toBe("crisis");
    expect(healthBadge(5).tone).toBe("collapse");
  });
});

describe("deriveFinanceView", () => {
  it("retorna null quando não há snapshot", () => {
    expect(deriveFinanceView(null)).toBeNull();
  });

  it("formata caixa, total e as linhas de custo com procedência", () => {
    const view = deriveFinanceView(snapshot)!;
    expect(view.cashLabel).toBe("R$ 5.000.000");
    expect(view.cashNegative).toBe(false);
    expect(view.seasonTotalLabel).toBe("R$ 1.234.000");
    expect(view.costLines[0]).toMatchObject({
      label: "Folha salarial",
      provenanceLabel: "estimado",
    });
    expect(view.estimatedCount).toBe(23);
    expect(view.contractedCount).toBe(0);
  });

  it("nomeia as categorias omitidas e mantém as notas de procedência", () => {
    const view = deriveFinanceView(snapshot)!;
    expect(view.omittedLabels).toContain("Viagens");
    expect(view.omittedLabels).toContain("Impostos");
    expect(view.provenanceNotes).toEqual(["Folha estimada."]);
  });

  it("marca caixa negativo (crise)", () => {
    const view = deriveFinanceView({ ...snapshot, cashMinor: -50_000_000 })!;
    expect(view.cashNegative).toBe(true);
  });

  it("saúde indisponível quando o índice é null", () => {
    const view = deriveFinanceView(snapshot)!;
    expect(view.health.tone).toBe("unavailable");
  });

  it("lista os cartões parciais com o gap nomeado", () => {
    const view = deriveFinanceView(snapshot)!;
    expect(view.partialCards.length).toBeGreaterThan(0);
    expect(view.partialCards.every((c) => c.missing.length > 0)).toBe(true);
  });
});
