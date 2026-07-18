import { describe, expect, it } from "vitest";

import { buildStandings } from "./standings.js";

const CLUBS = ["a", "b", "c", "d"];

describe("buildStandings — a tabela é derivada dos jogos", () => {
  it("no início da temporada, todo clube aparece zerado", () => {
    const table = buildStandings(CLUBS, []);
    expect(table).toHaveLength(4);
    expect(table.every((r) => r.played === 0 && r.points === 0)).toBe(true);
  });

  it("vitória vale 3, empate 1, derrota 0", () => {
    const table = buildStandings(CLUBS, [
      { homeClubId: "a", awayClubId: "b", homeGoals: 2, awayGoals: 0 }, // a vence
      { homeClubId: "c", awayClubId: "d", homeGoals: 1, awayGoals: 1 }, // empate
    ]);
    const byId = new Map(table.map((r) => [r.clubId, r]));
    expect(byId.get("a")?.points).toBe(3);
    expect(byId.get("b")?.points).toBe(0);
    expect(byId.get("c")?.points).toBe(1);
    expect(byId.get("d")?.points).toBe(1);
  });

  it("acumula gols pró, contra e saldo", () => {
    const table = buildStandings(CLUBS, [
      { homeClubId: "a", awayClubId: "b", homeGoals: 3, awayGoals: 1 },
      { homeClubId: "a", awayClubId: "c", homeGoals: 2, awayGoals: 2 },
    ]);
    const a = table.find((r) => r.clubId === "a")!;
    expect(a.played).toBe(2);
    expect(a.goalsFor).toBe(5);
    expect(a.goalsAgainst).toBe(3);
    expect(a.goalDifference).toBe(2);
    expect(a.points).toBe(4); // vitória + empate
  });

  /** Ordena por pontos, depois saldo, depois gols pró. */
  it("o líder é quem tem mais pontos; o saldo desempata", () => {
    const table = buildStandings(CLUBS, [
      { homeClubId: "a", awayClubId: "b", homeGoals: 1, awayGoals: 0 }, // a: 3pts, +1
      { homeClubId: "c", awayClubId: "d", homeGoals: 5, awayGoals: 0 }, // c: 3pts, +5
    ]);
    // c e a têm 3 pontos; c tem saldo maior, então lidera.
    expect(table[0]?.clubId).toBe("c");
    expect(table[1]?.clubId).toBe("a");
  });

  /** Uma partida entre clubes fora da lista não entra na tabela. */
  it("ignora partida de clube que não está na competição", () => {
    const table = buildStandings(CLUBS, [
      { homeClubId: "x", awayClubId: "y", homeGoals: 3, awayGoals: 0 },
    ]);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });
});
