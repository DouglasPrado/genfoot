import { describe, expect, it } from "vitest";
import type { SquadPlayer } from "./squad-data";
import {
  canSubstitute,
  compareStat,
  fitRank,
  positionFit,
} from "./substitution-model";

function player(
  over: Partial<SquadPlayer> & Pick<SquadPlayer, "id" | "position" | "group">,
): SquadPlayer {
  return {
    number: 0,
    name: over.id,
    age: 25,
    ovr: 70,
    pot: 75,
    fitness: 100,
    form: "steady",
    morale: 70,
    availability: "AVAILABLE",
    contractYears: 0,
    starter: false,
    groups: { technical: 70, physical: 70, mental: 70, goalkeeping: null },
    attributes: null,
    ...over,
  };
}

const zag = player({ id: "zag-a", position: "ZAG", group: "DEF" });
const gol = player({ id: "gol-a", position: "GOL", group: "GOL" });
const vol = player({ id: "vol-a", position: "VOL", group: "MEI" });
const le = player({ id: "le-a", position: "LE", group: "DEF" });
const ata = player({ id: "ata-a", position: "ATA", group: "ATA" });

const ALL_POSITIONS = [
  "GOL",
  "ZAG",
  "LE",
  "LD",
  "VOL",
  "MC",
  "MEI",
  "PTE",
  "PTD",
  "ATA",
] as const;

describe("positionFit — grafo de adaptação", () => {
  it("mesma posição é natural", () => {
    expect(positionFit("ZAG", "ZAG")).toBe("natural");
  });

  it("posições vizinhas se adaptam (exemplos pedidos)", () => {
    expect(positionFit("ZAG", "GOL")).toBe("adaptable"); // zaga pode ser goleiro
    expect(positionFit("GOL", "ZAG")).toBe("adaptable"); // goleiro pode ser zaga
    expect(positionFit("ZAG", "VOL")).toBe("adaptable"); // zaga pode ser volante
    expect(positionFit("VOL", "MEI")).toBe("adaptable"); // volante pode ser meia
    expect(positionFit("VOL", "LE")).toBe("adaptable"); // volante pode ser lateral
  });

  it("posições distantes não encaixam", () => {
    expect(positionFit("GOL", "ATA")).toBe("none");
    expect(positionFit("GOL", "VOL")).toBe("none");
    expect(positionFit("ZAG", "ATA")).toBe("none");
  });

  it("o grafo é simétrico: se A adapta em B, B adapta em A", () => {
    for (const from of ALL_POSITIONS) {
      for (const to of ALL_POSITIONS) {
        expect(positionFit(from, to)).toBe(positionFit(to, from));
      }
    }
  });
});

describe("fitRank — ordem de exibição", () => {
  it("natural vem antes de adaptável, que vem antes de bloqueado", () => {
    expect(fitRank("natural")).toBeLessThan(fitRank("adaptable"));
    expect(fitRank("adaptable")).toBeLessThan(fitRank("none"));
  });
});

describe("canSubstitute", () => {
  it("permite natural e adaptável", () => {
    expect(canSubstitute(zag, zag)).toBe(true); // natural
    expect(canSubstitute(zag, gol)).toBe(true); // adaptável
    expect(canSubstitute(zag, vol)).toBe(true); // adaptável
  });

  it("bloqueia posições distantes", () => {
    expect(canSubstitute(gol, ata)).toBe(false);
  });

  it("bloqueia quando falta o titular ou o reserva", () => {
    expect(canSubstitute(undefined, zag)).toBe(false);
    expect(canSubstitute(zag, undefined)).toBe(false);
  });

  it("um lateral se adapta a zagueiro (vizinho), mas não a atacante", () => {
    expect(canSubstitute(zag, le)).toBe(true);
    expect(canSubstitute(gol, ata)).toBe(false);
  });
});

describe("compareStat", () => {
  it("reserva melhor que o titular: delta positivo, tendência de alta", () => {
    expect(compareStat(80, 78)).toEqual({ value: 80, delta: 2, trend: "up" });
  });

  it("reserva pior que o titular: delta negativo, tendência de baixa", () => {
    expect(compareStat(70, 78)).toEqual({ value: 70, delta: -8, trend: "down" });
  });

  it("empate: delta zero, estável", () => {
    expect(compareStat(78, 78)).toEqual({ value: 78, delta: 0, trend: "steady" });
  });

  it("sem titular de referência: mostra o valor, sem delta", () => {
    expect(compareStat(80, undefined)).toEqual({
      value: 80,
      delta: 0,
      trend: "steady",
    });
  });
});
