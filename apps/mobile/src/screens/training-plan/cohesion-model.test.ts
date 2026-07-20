import { describe, expect, it } from "vitest";

import {
  cohesionBadge,
  cohesionMatchModifier,
  canTrainFormation,
} from "./cohesion-model.js";

describe("cohesion-model (M-TRAINING, entrosamento R-220 Fase 3)", () => {
  it("rotula o entrosamento em faixas legíveis, não só número", () => {
    expect(cohesionBadge(90).label).toBe("Entrosado");
    expect(cohesionBadge(50).label).toBe("Ajustando");
    expect(cohesionBadge(20).label).toBe("Desentrosado");
    // O valor cru viaja junto para a tela mostrar o número também.
    expect(cohesionBadge(54).value).toBe(54);
  });

  it("o tom acompanha a faixa — verde entrosado, vermelho desentrosado", () => {
    expect(cohesionBadge(90).tone).toBe("up");
    expect(cohesionBadge(50).tone).toBe("neutral");
    expect(cohesionBadge(20).tone).toBe("down");
  });

  it("expõe o modificador ± que o entrosamento dá à partida (R-15)", () => {
    // Espelha o cohesionModifier do domínio: 50 neutro, 100 → +6, 0 → −6.
    expect(cohesionMatchModifier(50)).toBe(0);
    expect(cohesionMatchModifier(100)).toBe(6);
    expect(cohesionMatchModifier(0)).toBe(-6);
  });

  it("prende o valor em 0..100 antes de rotular — dado sujo não quebra a tela", () => {
    expect(cohesionBadge(140).value).toBe(100);
    expect(cohesionBadge(-10).value).toBe(0);
  });

  it("só pode treinar a formação com escalação montada", () => {
    // O backend recusa com NO_LINEUP_TO_TRAIN; a tela não oferece o botão morto.
    expect(canTrainFormation({ hasLineup: true })).toBe(true);
    expect(canTrainFormation({ hasLineup: false })).toBe(false);
  });
});
