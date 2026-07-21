import { describe, expect, it } from "vitest";

import { buildTrainingReportMessage } from "./training-report-message.js";

describe("buildTrainingReportMessage", () => {
  it("monta título + corpo com o ganho (de → para)", () => {
    const m = buildTrainingReportMessage({
      playerName: "Kauã Martins",
      attributeCode: "shortPassing",
      before: 32,
      after: 38,
    });
    expect(m.title).toBe("Kauã Martins completou o treino");
    expect(m.body).toBe("Passe curto 32 → 38 (+6)");
  });

  it("sem ganho (teto), o corpo diz que não rendeu", () => {
    const m = buildTrainingReportMessage({
      playerName: "Fulano",
      attributeCode: "pace",
      before: 80,
      after: 80,
    });
    expect(m.body).toBe("Velocidade 80 — sem ganho neste treino");
  });

  it("atributo desconhecido cai no próprio código (não quebra)", () => {
    const m = buildTrainingReportMessage({
      playerName: "X",
      attributeCode: "xyz",
      before: 1,
      after: 2,
    });
    expect(m.body).toBe("xyz 1 → 2 (+1)");
  });
});
