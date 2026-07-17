import { describe, expect, it } from "vitest";
import type { SquadPlayer } from "./squad-data";
import { canSubstitute, eligibleSubstitutes } from "./substitution-model";

function player(over: Partial<SquadPlayer> & Pick<SquadPlayer, "id" | "position" | "group">): SquadPlayer {
  return {
    number: 0,
    name: over.id,
    age: 25,
    ovr: 70,
    pot: 75,
    fitness: 100,
    form: "steady",
    morale: 70,
    contractYears: 0,
    starter: false,
    ...over,
  };
}

const zag = player({ id: "zag-a", position: "ZAG", group: "DEF" });
const zag2 = player({ id: "zag-b", position: "ZAG", group: "DEF" });
const le = player({ id: "le-a", position: "LE", group: "DEF" });
const ata = player({ id: "ata-a", position: "ATA", group: "ATA" });

describe("eligibleSubstitutes", () => {
  it("só devolve reservas da MESMA posição de origem do titular que sai", () => {
    const eligible = eligibleSubstitutes(zag, [zag2, le, ata]);
    expect(eligible.map((p) => p.id)).toEqual(["zag-b"]);
  });

  it("um lateral (LE) não é elegível para substituir um zagueiro (ZAG)", () => {
    const eligible = eligibleSubstitutes(zag, [le]);
    expect(eligible).toEqual([]);
  });

  it("preserva a ordem original das reservas", () => {
    const eligible = eligibleSubstitutes(zag, [ata, zag2, le, zag]);
    expect(eligible.map((p) => p.id)).toEqual(["zag-b", "zag-a"]);
  });

  it("sem titular que sai, ninguém é elegível", () => {
    expect(eligibleSubstitutes(undefined, [zag, zag2])).toEqual([]);
  });
});

describe("canSubstitute", () => {
  it("permite a troca quando as posições de origem coincidem", () => {
    expect(canSubstitute(zag, zag2)).toBe(true);
  });

  it("bloqueia a troca entre posições diferentes", () => {
    expect(canSubstitute(zag, le)).toBe(false);
    expect(canSubstitute(zag, ata)).toBe(false);
  });

  it("bloqueia quando falta o titular ou o reserva", () => {
    expect(canSubstitute(undefined, zag)).toBe(false);
    expect(canSubstitute(zag, undefined)).toBe(false);
  });
});
