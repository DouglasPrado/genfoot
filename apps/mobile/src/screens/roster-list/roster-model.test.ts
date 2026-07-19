import { describe, expect, it } from "vitest";

import {
  availabilityBadge,
  buildSquadReport,
  groupBySector,
  sectorOf,
  type RosterPlayerLike,
} from "./roster-model";

function player(
  primaryPosition: string,
  overall: number,
  age = 25,
  availability = "AVAILABLE",
): RosterPlayerLike {
  return { primaryPosition, overall, age, availability };
}

describe("roster-model — lógica do Elenco (M-SQUAD)", () => {
  it("mapeia cada posição ao seu setor", () => {
    expect(sectorOf("GK")).toBe("GOL");
    expect(sectorOf("CB")).toBe("DEF");
    expect(sectorOf("CM")).toBe("MEI");
    expect(sectorOf("ST")).toBe("ATA");
    expect(sectorOf("???")).toBe("MEI"); // desconhecida cai no meio
  });

  it("agrupa por setor na ordem GOL→DEF→MEI→ATA, ordenado por overall", () => {
    const squad = [
      player("ST", 80),
      player("GK", 70),
      player("CB", 75),
      player("ST", 85),
      player("CM", 72),
    ];
    const sections = groupBySector(squad);
    expect(sections.map((s) => s.sector)).toEqual(["GOL", "DEF", "MEI", "ATA"]);
    // Atacantes ordenados por overall desc.
    expect(sections[3]!.players.map((p) => p.overall)).toEqual([85, 80]);
  });

  it("recorta para um setor quando pedido", () => {
    const squad = [player("GK", 70), player("ST", 80), player("CB", 75)];
    const only = groupBySector(squad, "DEF");
    expect(only).toHaveLength(1);
    expect(only[0]!.sector).toBe("DEF");
  });

  it("o relatório soma profundidade, médias e aponta lacunas", () => {
    // 1 GOL, 1 DEF, 1 MEI, 1 ATA — abaixo do piso em DEF (4) e MEI (4).
    const squad = [
      player("GK", 70, 30),
      player("CB", 60, 20),
      player("CM", 80, 28),
      player("ST", 90, 22),
    ];
    const report = buildSquadReport(squad);
    expect(report.total).toBe(4);
    expect(report.depth).toEqual({ GOL: 1, DEF: 1, MEI: 1, ATA: 1 });
    expect(report.averageAge).toBe(25);
    expect(report.averageOverall).toBe(75);
    expect(report.gaps).toContain("DEF");
    expect(report.gaps).toContain("MEI");
  });

  it("relatório de elenco vazio não divide por zero", () => {
    const report = buildSquadReport([]);
    expect(report.averageAge).toBe(0);
    expect(report.averageOverall).toBe(0);
  });

  it("só rende badge quando a disponibilidade tem o que dizer", () => {
    expect(availabilityBadge("AVAILABLE")).toBeNull();
    expect(availabilityBadge("INJURED")).toEqual({
      label: "Lesionado",
      tone: "danger",
    });
    expect(availabilityBadge("CONVENED")?.tone).toBe("warn");
  });
});
