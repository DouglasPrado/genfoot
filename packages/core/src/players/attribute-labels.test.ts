import { describe, expect, it } from "vitest";

import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "./player-attributes.js";
import { attributeLabelPt } from "./attribute-labels.js";

describe("attributeLabelPt", () => {
  it("traduz atributos de cada grupo", () => {
    expect(attributeLabelPt("finishing")).toBe("Finalização");
    expect(attributeLabelPt("longShots")).toBe("Chute de longe");
    expect(attributeLabelPt("pace")).toBe("Velocidade");
    expect(attributeLabelPt("composure")).toBe("Frieza");
    expect(attributeLabelPt("goalkeeperReflexes")).toBe("Reflexos");
  });

  it("cobre TODOS os 39 códigos do grid (nenhum cai no código cru)", () => {
    const all = [
      ...TECHNICAL_ATTRIBUTES,
      ...PHYSICAL_ATTRIBUTES,
      ...MENTAL_ATTRIBUTES,
      ...GOALKEEPING_ATTRIBUTES,
    ];
    for (const code of all) {
      expect(attributeLabelPt(code)).not.toBe(code);
    }
  });

  it("código desconhecido cai no próprio código (não quebra)", () => {
    expect(attributeLabelPt("xyz")).toBe("xyz");
  });
});
