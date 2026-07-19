import { describe, expect, it } from "vitest";

import { resolveSeasonOutcome, type ClubOutcome } from "./season-outcome.js";

/** Atalho: 20 clubes "c01".."c20" já ordenados pela classificação. */
const twenty = Array.from({ length: 20 }, (_, i) =>
  `c${String(i + 1).padStart(2, "0")}`,
);

function outcomes(
  ids: readonly string[],
  up: number,
  down: number,
): Record<string, ClubOutcome> {
  const rows = resolveSeasonOutcome(ids, up, down);
  return Object.fromEntries(rows.map((r) => [r.clubId, r.outcome]));
}

describe("resolveSeasonOutcome — divisão do meio (4 sobem, 4 descem)", () => {
  const o = outcomes(twenty, 4, 4);

  it("o 1º é campeão (e sobe)", () => {
    expect(o.c01).toBe("CHAMPION");
  });

  it("2º a 4º sobem", () => {
    expect(o.c02).toBe("PROMOTED");
    expect(o.c03).toBe("PROMOTED");
    expect(o.c04).toBe("PROMOTED");
  });

  it("5º a 16º permanecem", () => {
    expect(o.c05).toBe("STAYED");
    expect(o.c16).toBe("STAYED");
  });

  it("17º a 20º descem", () => {
    expect(o.c17).toBe("RELEGATED");
    expect(o.c18).toBe("RELEGATED");
    expect(o.c19).toBe("RELEGATED");
    expect(o.c20).toBe("RELEGATED");
  });

  it("conta exatamente 1 campeão, 3 acessos, 4 rebaixados", () => {
    const rows = resolveSeasonOutcome(twenty, 4, 4);
    const count = (v: ClubOutcome) =>
      rows.filter((r) => r.outcome === v).length;
    expect(count("CHAMPION")).toBe(1);
    expect(count("PROMOTED")).toBe(3);
    expect(count("RELEGATED")).toBe(4);
    expect(count("STAYED")).toBe(12);
  });
});

describe("resolveSeasonOutcome — divisão do topo (o primeiro não sobe)", () => {
  const o = outcomes(twenty, 0, 4);

  it("o 1º é campeão da elite, mas ninguém sobe", () => {
    expect(o.c01).toBe("CHAMPION");
    expect(Object.values(o).filter((v) => v === "PROMOTED")).toHaveLength(0);
  });

  it("ainda rebaixa os 4 últimos", () => {
    expect(o.c17).toBe("RELEGATED");
    expect(o.c20).toBe("RELEGATED");
  });
});

describe("resolveSeasonOutcome — divisão do fundo (o último não desce)", () => {
  const o = outcomes(twenty, 4, 0);

  it("sobe os 4 primeiros (campeão inclusive)", () => {
    expect(o.c01).toBe("CHAMPION");
    expect(o.c04).toBe("PROMOTED");
  });

  it("ninguém desce", () => {
    expect(Object.values(o).filter((v) => v === "RELEGATED")).toHaveLength(0);
    expect(o.c20).toBe("STAYED");
  });
});

describe("resolveSeasonOutcome — divisão única do mundo (topo E fundo)", () => {
  it("só há campeão; ninguém sobe nem desce", () => {
    const rows = resolveSeasonOutcome(twenty, 0, 0);
    expect(rows[0]!.outcome).toBe("CHAMPION");
    expect(rows.slice(1).every((r) => r.outcome === "STAYED")).toBe(true);
  });
});

describe("resolveSeasonOutcome — bordas", () => {
  it("liga vazia devolve vazio", () => {
    expect(resolveSeasonOutcome([], 4, 4)).toEqual([]);
  });

  it("um clube só é campeão, sem rótulo duplo", () => {
    expect(resolveSeasonOutcome(["c01"], 4, 4)).toEqual([
      { clubId: "c01", rank: 1, outcome: "CHAMPION" },
    ]);
  });

  it("liga minúscula onde as zonas se tocam: acesso vence o rebaixamento", () => {
    // 3 clubes, 2 sobem e 2 descem — o 2º está nas duas zonas; sobe.
    const rows = resolveSeasonOutcome(["a", "b", "c"], 2, 2);
    expect(rows.map((r) => r.outcome)).toEqual([
      "CHAMPION",
      "PROMOTED",
      "RELEGATED",
    ]);
  });
});
