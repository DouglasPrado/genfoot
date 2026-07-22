import { describe, expect, it } from "vitest";

import { buildTrainingReportMessage } from "./training-report-message.js";

describe("buildTrainingReportMessage", () => {
  it("uma habilidade: título + corpo com de→para", () => {
    const m = buildTrainingReportMessage({
      playerName: "Kauã Martins",
      changes: [{ attributeCode: "shortPassing", before: 32, after: 38 }],
    });
    expect(m.title).toBe("Kauã Martins completou o treino");
    expect(m.body).toBe("Passe curto 32→38");
  });

  it("várias habilidades: lista as que subiram, separadas por ·", () => {
    const m = buildTrainingReportMessage({
      playerName: "Fulano",
      changes: [
        { attributeCode: "finishing", before: 30, after: 31 },
        { attributeCode: "shortPassing", before: 40, after: 41 },
      ],
    });
    expect(m.body).toBe("Finalização 30→31 · Passe curto 40→41");
  });

  it("ignora habilidades sem ganho (after == before)", () => {
    const m = buildTrainingReportMessage({
      playerName: "X",
      changes: [
        { attributeCode: "pace", before: 80, after: 80 },
        { attributeCode: "finishing", before: 30, after: 32 },
      ],
    });
    expect(m.body).toBe("Finalização 30→32");
  });

  it("nenhuma subiu → diz que não rendeu", () => {
    const m = buildTrainingReportMessage({
      playerName: "X",
      changes: [{ attributeCode: "pace", before: 100, after: 100 }],
    });
    expect(m.body).toBe("sem ganho neste treino");
  });
});
