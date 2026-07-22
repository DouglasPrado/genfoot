import { describe, expect, it } from "vitest";

import { FORMATIONS, assignToFormation } from "./formations";
import type { PositionGroup } from "./squad-data";

/** Um elenco onde cada jogador tem posição, setor e um overall distinto. */
const p = (id: string, position: string, group: PositionGroup, ovr: number) => ({
  id,
  position,
  group,
  ovr,
});

// Elenco com dois de cada posição do 4-2-1-3, o segundo sempre pior.
const elenco = [
  p("gk1", "GOL", "GOL", 70),
  p("le1", "LE", "DEF", 68),
  p("zag1", "ZAG", "DEF", 80),
  p("zag2", "ZAG", "DEF", 79),
  p("ld1", "LD", "DEF", 67),
  p("vol1", "VOL", "MEI", 75),
  p("vol2", "VOL", "MEI", 74),
  p("mei1", "MEI", "MEI", 72),
  p("pte1", "PTE", "ATA", 71),
  p("ata1", "ATA", "ATA", 85),
  p("ptd1", "PTD", "ATA", 69),
];

describe("assignToFormation — quem ocupa cada slot", () => {
  it("põe cada jogador na sua posição natural quando o elenco permite", () => {
    // Sem a passada por posição, os ZAG (80/79) tomavam a lateral por serem os
    // melhores do setor DEF, e o time perdia força por `fillQuality`.
    const slots = FORMATIONS["4-2-1-3"];
    const escalados = assignToFormation(elenco, "4-2-1-3");
    expect(escalados).toHaveLength(11);
    const byId = new Map(elenco.map((x) => [x.id, x]));
    escalados.forEach((id, index) => {
      expect(byId.get(id)!.position).toBe(slots[index]!.role);
    });
  });

  it("sem alguém da posição exata, cai para o mesmo setor", () => {
    const semLaterais = elenco.filter(
      (x) => x.position !== "LE" && x.position !== "LD",
    );
    const extras = [
      p("zag3", "ZAG", "DEF", 60),
      p("zag4", "ZAG", "DEF", 59),
    ];
    const escalados = assignToFormation([...semLaterais, ...extras], "4-2-1-3");
    expect(escalados).toHaveLength(11);
    // Os slots de lateral existem e estão ocupados por gente do setor DEF.
    const byId = new Map([...semLaterais, ...extras].map((x) => [x.id, x]));
    const slots = FORMATIONS["4-2-1-3"];
    slots.forEach((slot, index) => {
      if (slot.role === "LE" || slot.role === "LD") {
        expect(byId.get(escalados[index]!)!.group).toBe("DEF");
      }
    });
  });

  it("não repete jogador entre os slots", () => {
    const escalados = assignToFormation(elenco, "4-3-3");
    expect(new Set(escalados).size).toBe(escalados.length);
  });

  it("elenco menor que 11 devolve o que dá, sem buraco no meio", () => {
    const escalados = assignToFormation(elenco.slice(0, 5), "4-4-2");
    expect(escalados).toHaveLength(5);
    expect(escalados.every((id) => typeof id === "string")).toBe(true);
  });

  it("sem o rótulo de posição, ainda escala pelo setor (compat)", () => {
    const semPosicao = elenco.map(({ id, group, ovr }) => ({ id, group, ovr }));
    expect(assignToFormation(semPosicao, "4-2-1-3")).toHaveLength(11);
  });
});
