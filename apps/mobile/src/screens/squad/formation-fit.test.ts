import { describe, expect, it } from "vitest";

import { fitsFormation, formationFit } from "./formation-fit";

// 4-4-2 canônico no core: [GK, RB, CB, CB, LB, RM, CM, CM, LM, ST, ST].
describe("formationFit — encaixe do jogador na formação (core-backed)", () => {
  it("posição EXATA de um slot → natural", () => {
    expect(formationFit("ST", "4-4-2")).toBe("natural"); // há slot ST
    expect(formationFit("CB", "4-4-2")).toBe("natural"); // há slot CB
    expect(formationFit("GK", "4-4-2")).toBe("natural"); // há slot GK
  });

  it("sem slot exato, mas mesma linha → adapted", () => {
    // CDM não é slot do 4-4-2, mas é meio-campo como CM/RM/LM (mesma linha).
    expect(formationFit("CDM", "4-4-2")).toBe("adapted");
    // CAM idem — meio sem slot exato aqui.
    expect(formationFit("CAM", "4-4-2")).toBe("adapted");
  });

  it("formação que o core não cataloga → unknown (não julga)", () => {
    // 4-2-1-3 existe no mobile mas não no CANONICAL_FORMATIONS do core.
    expect(formationFit("ST", "4-2-1-3")).toBe("unknown");
  });

  it("posição inválida → unknown (cliente não inventa)", () => {
    expect(formationFit("XYZ", "4-4-2")).toBe("unknown");
    expect(formationFit("", "4-3-3")).toBe("unknown");
  });

  it("fitsFormation: natural/adapted/unknown entram; poor não", () => {
    expect(fitsFormation("natural")).toBe(true);
    expect(fitsFormation("adapted")).toBe(true);
    expect(fitsFormation("unknown")).toBe(true); // não restringe o que não sabe
    expect(fitsFormation("poor")).toBe(false);
  });
});
