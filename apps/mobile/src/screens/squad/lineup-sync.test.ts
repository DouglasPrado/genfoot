import { describe, expect, it } from "vitest";

import {
  desiredSlots,
  lineupDiffers,
  planLineupSync,
  type LineupMembership,
} from "./lineup-sync";

const memberships: LineupMembership[] = [
  { playerId: "a", slot: "S01", category: "SENIOR" },
  { playerId: "b", slot: "S02", category: "SENIOR" },
  { playerId: "c", slot: "S12", category: "SENIOR" },
];

describe("lineup sync (elenco persistente)", () => {
  it("mapeia campo para S01..S11 e banco na sequência", () => {
    const desired = desiredSlots(["a", "b"], ["c"]);
    expect(desired.get("a")).toBe("S01");
    expect(desired.get("b")).toBe("S02");
    expect(desired.get("c")).toBe("S03");
  });

  it("não gera comandos quando nada mudou", () => {
    const desired = desiredSlots(
      ["a", "b"],
      [], // c fica fora do mapa → não é tocado
    );
    expect(lineupDiffers(memberships, desired)).toBe(false);
    expect(planLineupSync(memberships, desired)).toHaveLength(0);
  });

  it("substituição: remove os dois primeiro, depois atribui os slots trocados", () => {
    // c (banco, S12) entra no lugar de b (campo, S02).
    const desired = new Map([
      ["b", "S12"],
      ["c", "S02"],
    ]);
    expect(lineupDiffers(memberships, desired)).toBe(true);
    const plan = planLineupSync(memberships, desired);
    expect(plan.map((c) => c.type)).toEqual([
      "RemoveSquadMember",
      "RemoveSquadMember",
      "AssignSquadSlot",
      "AssignSquadSlot",
    ]);
    // Removes liberam os slots antes dos assigns (evita SQUAD_SLOT_OCCUPIED).
    const assigns = plan.filter((c) => c.type === "AssignSquadSlot");
    expect(assigns).toEqual([
      expect.objectContaining({ playerId: "b", slot: "S12" }),
      expect.objectContaining({ playerId: "c", slot: "S02" }),
    ]);
  });

  it("preserva a categoria original do jogador", () => {
    const youth: LineupMembership[] = [
      { playerId: "y", slot: "S20", category: "YOUTH" },
    ];
    const plan = planLineupSync(youth, new Map([["y", "S05"]]));
    expect(plan.at(-1)).toEqual(
      expect.objectContaining({ category: "YOUTH", slot: "S05" }),
    );
  });
});
