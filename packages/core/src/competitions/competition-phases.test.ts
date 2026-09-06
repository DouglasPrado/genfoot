import { describe, expect, it } from "vitest";

import {
  buildBracket,
  buildGroupTables,
  buildGroupTablesWithMovement,
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

describe("buildGroupTablesWithMovement", () => {
  const clubs = [
    { clubId: "a", group: null },
    { clubId: "b", group: null },
    { clubId: "c", group: null },
  ];

  it("sem rodada anterior, ninguém subiu nem caiu — é null, não 'manteve'", () => {
    // Só a rodada 1 jogada: não existe classificação anterior para comparar, e
    // dizer "manteve" afirmaria uma posição que nunca existiu.
    const tables = buildGroupTablesWithMovement(clubs, [
      { round: 1, homeClubId: "a", awayClubId: "b", homeGoals: 2, awayGoals: 0 },
    ]);
    for (const row of tables[0]!.table) {
      expect(row.movement).toBeNull();
      expect(row.previousRank).toBeNull();
    }
  });

  it("quem passou o outro aparece como SUBIU, e o outro como CAIU", () => {
    const tables = buildGroupTablesWithMovement(clubs, [
      // Rodada 1: b lidera.
      { round: 1, homeClubId: "b", awayClubId: "c", homeGoals: 3, awayGoals: 0 },
      // Rodada 2: a vence por muito e passa b no saldo.
      { round: 2, homeClubId: "a", awayClubId: "c", homeGoals: 5, awayGoals: 0 },
      { round: 2, homeClubId: "b", awayClubId: "a", homeGoals: 0, awayGoals: 0 },
    ]);
    const byClub = new Map(tables[0]!.table.map((r) => [r.clubId, r]));
    expect(byClub.get("a")?.movement).toBe("up");
    expect(byClub.get("b")?.movement).toBe("down");
  });

  it("quem não mexeu de posição fica em 'same'", () => {
    const tables = buildGroupTablesWithMovement(clubs, [
      { round: 1, homeClubId: "a", awayClubId: "b", homeGoals: 1, awayGoals: 0 },
      { round: 2, homeClubId: "a", awayClubId: "c", homeGoals: 1, awayGoals: 0 },
    ]);
    const byClub = new Map(tables[0]!.table.map((r) => [r.clubId, r]));
    expect(byClub.get("a")?.movement).toBe("same");
    expect(byClub.get("a")?.previousRank).toBe(1);
  });

  it("a comparação é DENTRO do grupo, não na competição inteira", () => {
    const grupos = [
      { clubId: "a1", group: "A" },
      { clubId: "a2", group: "A" },
      { clubId: "b1", group: "B" },
      { clubId: "b2", group: "B" },
    ];
    const tables = buildGroupTablesWithMovement(grupos, [
      { round: 1, homeClubId: "a1", awayClubId: "a2", homeGoals: 0, awayGoals: 1 },
      { round: 1, homeClubId: "b1", awayClubId: "b2", homeGoals: 1, awayGoals: 0 },
      { round: 2, homeClubId: "a1", awayClubId: "a2", homeGoals: 3, awayGoals: 0 },
    ]);
    const grupoA = new Map(tables[0]!.table.map((r) => [r.clubId, r]));
    expect(grupoA.get("a1")?.movement).toBe("up");
    // O grupo B não jogou a rodada 2: ninguém se mexeu lá.
    const grupoB = new Map(tables[1]!.table.map((r) => [r.clubId, r]));
    expect(grupoB.get("b1")?.movement).toBe("same");
  });

  it("jogo sem rodada conta para a tabela, mas não define a rodada corrente", () => {
    const tables = buildGroupTablesWithMovement(clubs, [
      { round: null, homeClubId: "a", awayClubId: "b", homeGoals: 1, awayGoals: 0 },
    ]);
    expect(tables[0]!.table.every((r) => r.movement === null)).toBe(true);
    expect(tables[0]!.table[0]!.clubId).toBe("a");
  });

  it("sem jogo nenhum, a tabela existe e ninguém tem movimento", () => {
    const tables = buildGroupTablesWithMovement(clubs, []);
    expect(tables[0]!.table).toHaveLength(3);
    expect(tables[0]!.table.every((r) => r.movement === null)).toBe(true);
  });
});
