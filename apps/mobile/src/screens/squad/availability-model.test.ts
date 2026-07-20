import { describe, expect, it } from "vitest";

import { isMedicalBlock, lineupBlock } from "./availability-model";

describe("lineupBlock", () => {
  it("não impede quem está disponível", () => {
    expect(lineupBlock("AVAILABLE")).toBeNull();
  });

  it("marca lesão como impedimento médico", () => {
    const block = lineupBlock("INJURED");
    expect(block).not.toBeNull();
    expect(block?.kind).toBe("medical");
    expect(block?.reason).toContain("recuperação médica");
    expect(isMedicalBlock(block)).toBe(true);
  });

  it("separa suspensão e convocação da lesão — não são médicas", () => {
    expect(lineupBlock("SUSPENDED")?.kind).toBe("suspended");
    expect(lineupBlock("CONVENED")?.kind).toBe("convened");
    expect(isMedicalBlock(lineupBlock("SUSPENDED"))).toBe(false);
    expect(isMedicalBlock(lineupBlock("CONVENED"))).toBe(false);
  });

  it("UNAVAILABLE é treino, NÃO lesão — o domínio usa esse estado na sessão", () => {
    const block = lineupBlock("UNAVAILABLE");
    expect(block?.kind).toBe("training");
    expect(isMedicalBlock(block)).toBe(false);
  });

  it("estado desconhecido não inventa impedimento", () => {
    expect(lineupBlock("")).toBeNull();
    expect(lineupBlock("ALGO_NOVO")).toBeNull();
  });

  it("todo impedimento tem rótulo curto e motivo legível", () => {
    for (const availability of [
      "INJURED",
      "SUSPENDED",
      "CONVENED",
      "UNAVAILABLE",
    ]) {
      const block = lineupBlock(availability);
      expect(block?.label.length).toBeLessThanOrEqual(10);
      expect(block?.reason.length).toBeGreaterThan(10);
    }
  });
});

describe("isMedicalBlock", () => {
  it("null não é impedimento médico", () => {
    expect(isMedicalBlock(null)).toBe(false);
  });
});
