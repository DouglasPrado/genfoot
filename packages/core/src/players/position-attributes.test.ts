import { describe, expect, it } from "vitest";

import { OVERALL_WEIGHTS } from "./player-attributes.js";
import { PlayerPosition } from "../genesis/genesis-types.js";
import {
  isRecommendedAttribute,
  recommendedAttributes,
} from "./position-attributes.js";

describe("recommendedAttributes / isRecommendedAttribute", () => {
  it("cada posição inclui o seu specificAttribute (âncora do OVERALL_WEIGHTS)", () => {
    for (const position of Object.values(PlayerPosition)) {
      const specific = OVERALL_WEIGHTS[position].specificAttribute;
      expect(recommendedAttributes(position)).toContain(specific);
    }
  });

  it("reconhece recomendações por posição", () => {
    expect(isRecommendedAttribute("ST", "finishing")).toBe(true);
    expect(isRecommendedAttribute("CB", "marking")).toBe(true);
    expect(isRecommendedAttribute("GK", "goalkeeperReflexes")).toBe(true);
    // Finalização não é foco de zagueiro.
    expect(isRecommendedAttribute("CB", "finishing")).toBe(false);
  });

  it("posição desconhecida → lista vazia, nada recomendado", () => {
    expect(recommendedAttributes("XYZ")).toEqual([]);
    expect(isRecommendedAttribute("XYZ", "finishing")).toBe(false);
  });

  it("toda recomendação tem de 1 a 8 habilidades (lista útil, não vazia)", () => {
    for (const position of Object.values(PlayerPosition)) {
      const rec = recommendedAttributes(position);
      expect(rec.length).toBeGreaterThan(0);
      expect(rec.length).toBeLessThanOrEqual(8);
    }
  });
});
