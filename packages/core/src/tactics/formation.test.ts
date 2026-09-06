import { describe, expect, it } from "vitest";

import { PlayerPosition } from "../genesis/genesis-types.js";

import {
  CANONICAL_FORMATIONS,
  type FormationName,
  fillQuality,
  formationSlots,
  isKnownFormation,
  positionLine,
} from "./formation.js";

describe("formações canônicas", () => {
  it("toda formação tem exatamente 11 slots", () => {
    for (const name of Object.keys(CANONICAL_FORMATIONS) as FormationName[]) {
      expect(formationSlots(name)!).toHaveLength(11);
    }
  });

  it("toda formação tem exatamente um goleiro", () => {
    for (const name of Object.keys(CANONICAL_FORMATIONS) as FormationName[]) {
      const gks = formationSlots(name)!.filter((p) => p === PlayerPosition.GK);
      expect(gks).toHaveLength(1);
    }
  });

  it("cobre o conjunto canônico decidido (calibração VAL-001)", () => {
    expect(isKnownFormation("4-4-2")).toBe(true);
    expect(isKnownFormation("4-3-3")).toBe(true);
    expect(isKnownFormation("4-2-3-1")).toBe(true);
    expect(isKnownFormation("3-5-2")).toBe(true);
    expect(isKnownFormation("5-3-2")).toBe(true);
    // O padrão do campo do mobile — sem ela, a escalação do jogador era recusada.
    expect(isKnownFormation("4-2-1-3")).toBe(true);
  });

  it("rejeita formação desconhecida", () => {
    expect(isKnownFormation("6-0-4")).toBe(false);
    expect(formationSlots("6-0-4")).toBeNull();
  });

  it("os dígitos do nome batem com a contagem de linhas (fora o GK)", () => {
    // 4-4-2 → 4 def, 4 mid, 2 fwd; etc. O GK não entra no nome.
    const expected: Record<FormationName, [number, number, number]> = {
      "4-4-2": [4, 4, 2],
      "4-3-3": [4, 3, 3],
      "4-2-3-1": [4, 5, 1], // 2+3 no meio = 5 na linha do meio
      "3-5-2": [3, 5, 2],
      "5-3-2": [5, 3, 2],
      "4-2-1-3": [4, 3, 3], // 2+1 no meio = 3 na linha do meio
    };
    for (const name of Object.keys(expected) as FormationName[]) {
      const slots = formationSlots(name)!;
      const def = slots.filter((p) => positionLine(p) === "DEF").length;
      const mid = slots.filter((p) => positionLine(p) === "MID").length;
      const fwd = slots.filter((p) => positionLine(p) === "FWD").length;
      expect([def, mid, fwd]).toEqual(expected[name]);
    }
  });
});

describe("ordem dos slots — esquerda→direita, como o cliente desenha", () => {
  // O cliente manda os titulares em ordem de slot; se esta lista começar pela
  // direita, o lateral-esquerdo cai no slot direito e perde 20% por fillQuality.
  const ESQUERDA = new Set<PlayerPosition>([
    PlayerPosition.LB,
    PlayerPosition.LM,
    PlayerPosition.LW,
  ]);
  const DIREITA = new Set<PlayerPosition>([
    PlayerPosition.RB,
    PlayerPosition.RM,
    PlayerPosition.RW,
  ]);

  it("em cada linha, o lado esquerdo vem antes do direito", () => {
    for (const name of Object.keys(CANONICAL_FORMATIONS) as FormationName[]) {
      const slots = formationSlots(name)!;
      const esq = slots.findIndex((p) => ESQUERDA.has(p));
      const dir = slots.findIndex((p) => DIREITA.has(p));
      if (esq === -1 || dir === -1) continue; // formação sem lados definidos
      expect(
        esq,
        `${name}: esquerda (${esq}) deveria vir antes da direita (${dir})`,
      ).toBeLessThan(dir);
    }
  });

  it("o goleiro é sempre o slot 0 — o campo desenha o gol primeiro", () => {
    for (const name of Object.keys(CANONICAL_FORMATIONS) as FormationName[]) {
      expect(formationSlots(name)![0]).toBe(PlayerPosition.GK);
    }
  });
});

describe("positionLine — a linha de uma posição", () => {
  it("classifica as 15 posições", () => {
    expect(positionLine(PlayerPosition.GK)).toBe("GK");
    expect(positionLine(PlayerPosition.CB)).toBe("DEF");
    expect(positionLine(PlayerPosition.LWB)).toBe("DEF");
    expect(positionLine(PlayerPosition.CDM)).toBe("MID");
    expect(positionLine(PlayerPosition.CAM)).toBe("MID");
    expect(positionLine(PlayerPosition.LW)).toBe("FWD");
    expect(positionLine(PlayerPosition.ST)).toBe("FWD");
    expect(positionLine(PlayerPosition.CF)).toBe("FWD");
  });
});

describe("fillQuality — quão bem um jogador ocupa um slot (avisa, não bloqueia)", () => {
  it("posição exata = ideal (1)", () => {
    expect(fillQuality(PlayerPosition.ST, PlayerPosition.ST)).toBe(1);
  });

  it("mesma linha = ok (parcial)", () => {
    const q = fillQuality(PlayerPosition.CM, PlayerPosition.CDM);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(1);
  });

  it("linha diferente = fora de posição (pior, mas nunca zero — não bloqueia)", () => {
    const q = fillQuality(PlayerPosition.ST, PlayerPosition.CB);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(fillQuality(PlayerPosition.CM, PlayerPosition.CDM));
  });

  it("goleiro fora do gol e jogador de linha no gol são o pior caso", () => {
    expect(fillQuality(PlayerPosition.ST, PlayerPosition.GK)).toBeLessThan(0.5);
    expect(fillQuality(PlayerPosition.GK, PlayerPosition.ST)).toBeLessThan(0.5);
  });
});
