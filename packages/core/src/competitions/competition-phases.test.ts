import { describe, expect, it } from "vitest";

import {
  buildBracket,
  buildGroupTables,
  knockoutRoundName,
} from "./competition-phases.js";

describe("buildGroupTables", () => {
  it("separa a tabela por grupo e ignora o jogo de outro grupo", () => {
    const tables = buildGroupTables(
      [
        { clubId: "a1", group: "A" },
        { clubId: "a2", group: "A" },
        { clubId: "b1", group: "B" },
        { clubId: "b2", group: "B" },
      ],
      [
        { homeClubId: "a1", awayClubId: "a2", homeGoals: 2, awayGoals: 0 },
        { homeClubId: "b1", awayClubId: "b2", homeGoals: 1, awayGoals: 1 },
      ],
    );

    expect(tables.map((t) => t.group)).toEqual(["A", "B"]);
    const groupA = tables[0]!;
    expect(groupA.table.map((r) => r.clubId)).toEqual(["a1", "a2"]);
    expect(groupA.table[0]!.points).toBe(3);
    // O jogo do grupo B não pode ter entrado no grupo A.
    expect(groupA.table[1]!.played).toBe(1);
    expect(tables[1]!.table.every((r) => r.points === 1)).toBe(true);
  });

  it("clube sem grupo cai numa tabela única (liga não tem grupo)", () => {
    const tables = buildGroupTables(
      [
        { clubId: "c1", group: null },
        { clubId: "c2", group: null },
      ],
      [{ homeClubId: "c1", awayClubId: "c2", homeGoals: 0, awayGoals: 3 }],
    );

    expect(tables).toHaveLength(1);
    expect(tables[0]!.group).toBeNull();
    expect(tables[0]!.table[0]!.clubId).toBe("c2");
  });

  it("grupo sem jogo terminado ainda lista todos os clubes zerados", () => {
    const tables = buildGroupTables(
      [
        { clubId: "a1", group: "A" },
        { clubId: "a2", group: "A" },
      ],
      [],
    );

    expect(tables[0]!.table).toHaveLength(2);
    expect(tables[0]!.table.every((r) => r.played === 0)).toBe(true);
  });

  it("ordena os grupos por nome, não pela ordem de chegada", () => {
    const tables = buildGroupTables(
      [
        { clubId: "c1", group: "C" },
        { clubId: "a1", group: "A" },
        { clubId: "b1", group: "B" },
      ],
      [],
    );

    expect(tables.map((t) => t.group)).toEqual(["A", "B", "C"]);
  });
});

describe("knockoutRoundName", () => {
  it("nomeia a fase pelo número de confrontos", () => {
    expect(knockoutRoundName(1)).toBe("Final");
    expect(knockoutRoundName(2)).toBe("Semifinal");
    expect(knockoutRoundName(4)).toBe("Quartas de final");
    expect(knockoutRoundName(8)).toBe("Oitavas de final");
    expect(knockoutRoundName(16)).toBe("16 avos de final");
  });

  it("cai num rótulo genérico quando não é potência de dois", () => {
    expect(knockoutRoundName(3)).toBe("Fase de 3 confrontos");
  });
});

describe("buildBracket", () => {
  const tie = (over: Partial<Parameters<typeof buildBracket>[0][number]> = {}) => ({
    matchId: "m1",
    round: 1,
    homeClubId: "h",
    awayClubId: "a",
    homeGoals: null,
    awayGoals: null,
    finished: false,
    scheduledOn: "2026-01-01",
    ...over,
  });

  it("agrupa as duas pernas do mesmo confronto numa chave só", () => {
    const rounds = buildBracket([
      tie({ matchId: "ida", homeClubId: "x", awayClubId: "y", homeGoals: 2, awayGoals: 1, finished: true }),
      tie({ matchId: "volta", homeClubId: "y", awayClubId: "x", homeGoals: 0, awayGoals: 0, finished: true }),
    ]);

    expect(rounds).toHaveLength(1);
    const ties = rounds[0]!.ties;
    expect(ties).toHaveLength(1);
    // O mandante da chave é o do PRIMEIRO jogo; o agregado soma as duas pernas.
    expect(ties[0]!.homeClubId).toBe("x");
    expect(ties[0]!.homeAggregate).toBe(2);
    expect(ties[0]!.awayAggregate).toBe(1);
    expect(ties[0]!.legs).toHaveLength(2);
    expect(ties[0]!.winnerClubId).toBe("x");
  });

  it("não declara vencedor enquanto uma perna não terminou", () => {
    const rounds = buildBracket([
      tie({ matchId: "ida", homeClubId: "x", awayClubId: "y", homeGoals: 3, awayGoals: 0, finished: true }),
      tie({ matchId: "volta", homeClubId: "y", awayClubId: "x" }),
    ]);

    const [only] = rounds[0]!.ties;
    expect(only!.winnerClubId).toBeNull();
    expect(only!.undecidedReason).toBe("PENDING_LEG");
  });

  it("empate no agregado fica SEM vencedor e diz por quê", () => {
    const rounds = buildBracket([
      tie({ matchId: "ida", homeClubId: "x", awayClubId: "y", homeGoals: 1, awayGoals: 1, finished: true }),
    ]);

    const [only] = rounds[0]!.ties;
    expect(only!.winnerClubId).toBeNull();
    // Gol fora / prorrogação / pênaltis não existem no domínio: não inventamos
    // um vencedor que a regra não decide.
    expect(only!.undecidedReason).toBe("AGGREGATE_TIE");
  });

  it("separa as rodadas e nomeia cada uma pelo tamanho", () => {
    const rounds = buildBracket([
      tie({ matchId: "q1", round: 1, homeClubId: "a", awayClubId: "b" }),
      tie({ matchId: "q2", round: 1, homeClubId: "c", awayClubId: "d" }),
      tie({ matchId: "s1", round: 2, homeClubId: "a", awayClubId: "c" }),
    ]);

    expect(rounds.map((r) => r.round)).toEqual([1, 2]);
    expect(rounds[0]!.name).toBe("Semifinal");
    expect(rounds[1]!.name).toBe("Final");
  });

  it("mundo sem mata-mata devolve chaveamento vazio", () => {
    expect(buildBracket([])).toEqual([]);
  });
});
