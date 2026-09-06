import { describe, expect, it } from "vitest";

import { RATING_BASE, ratePlayers, type RatingInput } from "./player-ratings.js";

const base = (over: Partial<RatingInput> = {}): RatingInput => ({
  playerId: "p1",
  primaryPosition: "ST",
  goals: 0,
  assists: 0,
  shots: 0,
  shotsOnTarget: 0,
  saves: 0,
  goalsConceded: 0,
  yellowCards: 0,
  redCards: 0,
  teamResult: "draw",
  ...over,
});

describe("ratePlayers", () => {
  it("quem não fez nada fica na base, nem herói nem culpado", () => {
    const [row] = ratePlayers([base()]);
    expect(row!.rating).toBe(RATING_BASE);
  });

  it("gol sobe a nota; dois gols sobem mais", () => {
    const [um] = ratePlayers([base({ goals: 1 })]);
    const [dois] = ratePlayers([base({ goals: 2 })]);
    expect(um!.rating).toBeGreaterThan(RATING_BASE);
    expect(dois!.rating).toBeGreaterThan(um!.rating);
  });

  it("assistência vale menos que gol", () => {
    const [gol] = ratePlayers([base({ goals: 1 })]);
    const [assist] = ratePlayers([base({ assists: 1 })]);
    expect(assist!.rating).toBeGreaterThan(RATING_BASE);
    expect(assist!.rating).toBeLessThan(gol!.rating);
  });

  it("cartão desce a nota; vermelho desce muito mais", () => {
    const [amarelo] = ratePlayers([base({ yellowCards: 1 })]);
    const [vermelho] = ratePlayers([base({ redCards: 1 })]);
    expect(amarelo!.rating).toBeLessThan(RATING_BASE);
    expect(vermelho!.rating).toBeLessThan(amarelo!.rating);
  });

  it("goleiro que faz defesa e não sofre gol é premiado", () => {
    const [gk] = ratePlayers([
      base({ primaryPosition: "GK", saves: 5, goalsConceded: 0 }),
    ]);
    expect(gk!.rating).toBeGreaterThan(RATING_BASE);
  });

  it("goleiro vazado várias vezes cai", () => {
    const [gk] = ratePlayers([
      base({ primaryPosition: "GK", saves: 1, goalsConceded: 4 }),
    ]);
    expect(gk!.rating).toBeLessThan(RATING_BASE);
  });

  it("o resultado do time move a nota de todo mundo", () => {
    const [venceu] = ratePlayers([base({ teamResult: "win" })]);
    const [perdeu] = ratePlayers([base({ teamResult: "loss" })]);
    expect(venceu!.rating).toBeGreaterThan(perdeu!.rating);
  });

  it("a nota fica na escala 1..10, por mais extremo que seja o jogo", () => {
    const monstro = ratePlayers([
      base({ goals: 9, assists: 5, shotsOnTarget: 12, teamResult: "win" }),
    ]);
    const desastre = ratePlayers([
      base({
        primaryPosition: "GK",
        redCards: 1,
        yellowCards: 1,
        goalsConceded: 9,
        teamResult: "loss",
      }),
    ]);
    expect(monstro[0]!.rating).toBeLessThanOrEqual(10);
    expect(desastre[0]!.rating).toBeGreaterThanOrEqual(1);
  });

  it("a nota tem uma casa decimal — 7,4 e não 7,3999", () => {
    const [row] = ratePlayers([base({ goals: 1, assists: 1 })]);
    expect(Number.isInteger(row!.rating * 10)).toBe(true);
  });

  it("elenco vazio devolve lista vazia", () => {
    expect(ratePlayers([])).toEqual([]);
  });

  it("é ordenado da maior nota para a menor — o melhor em campo é o primeiro", () => {
    const rows = ratePlayers([
      base({ playerId: "ruim", yellowCards: 1 }),
      base({ playerId: "craque", goals: 2 }),
      base({ playerId: "medio", assists: 1 }),
    ]);
    expect(rows.map((r) => r.playerId)).toEqual(["craque", "medio", "ruim"]);
  });
});
