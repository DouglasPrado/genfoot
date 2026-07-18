import { describe, expect, it } from "vitest";

import {
  attributeGoals,
  timeGoals,
  MATCH_MINUTES,
  type ScorerCandidate,
} from "./goal-attribution.js";

const SEED = "seed-artilharia";
const MATCH = "019f0000-0000-7000-8000-000000000abc";

function squad(): ScorerCandidate[] {
  return [
    { playerId: "gk", primaryPosition: "GK", ability: 70 },
    { playerId: "cb1", primaryPosition: "CB", ability: 70 },
    { playerId: "cb2", primaryPosition: "CB", ability: 70 },
    { playerId: "cm", primaryPosition: "CM", ability: 70 },
    { playerId: "st1", primaryPosition: "ST", ability: 75 },
    { playerId: "st2", primaryPosition: "ST", ability: 72 },
  ];
}

describe("attributeGoals — quem marcou (C7-V5)", () => {
  it("sem gols, sem artilheiros", () => {
    expect(attributeGoals(SEED, MATCH, "home", squad(), 0)).toHaveLength(0);
  });

  it("sem candidatos, sem artilheiros", () => {
    expect(attributeGoals(SEED, MATCH, "home", [], 3)).toHaveLength(0);
  });

  it("a soma dos gols distribuídos é o placar", () => {
    const scorers = attributeGoals(SEED, MATCH, "home", squad(), 3);
    const total = scorers.reduce((s, x) => s + x.goals, 0);
    expect(total).toBe(3);
  });

  it("é determinístico: mesmo jogo, mesmos artilheiros", () => {
    const a = attributeGoals(SEED, MATCH, "home", squad(), 4);
    const b = attributeGoals(SEED, MATCH, "home", squad(), 4);
    expect(a).toEqual(b);
  });

  it("lados diferentes sorteiam diferente", () => {
    const home = attributeGoals(SEED, MATCH, "home", squad(), 4);
    const away = attributeGoals(SEED, MATCH, "away", squad(), 4);
    // Improvável (mas não impossível) coincidirem; o namespace por lado garante
    // sorteios independentes. Comparamos as CHAVES do sorteio, não os ids.
    expect(JSON.stringify(home)).not.toBe(JSON.stringify(away));
  });

  it("atacantes marcam muito mais que a defesa (peso por posição)", () => {
    // Num volume grande de gols, os ST dominam a artilharia.
    const scorers = attributeGoals(SEED, MATCH, "home", squad(), 200);
    const byPlayer = new Map(scorers.map((s) => [s.playerId, s.goals]));
    const attackers = (byPlayer.get("st1") ?? 0) + (byPlayer.get("st2") ?? 0);
    const defenders =
      (byPlayer.get("cb1") ?? 0) +
      (byPlayer.get("cb2") ?? 0) +
      (byPlayer.get("gk") ?? 0);
    expect(attackers).toBeGreaterThan(defenders * 3);
  });
});

describe("timeGoals — o minuto de cada gol (C5-V1)", () => {
  const scorers = [
    { playerId: "st1", goals: 2 },
    { playerId: "st2", goals: 1 },
  ];

  it("expande cada gol num evento com minuto em [1, 90], ordenado", () => {
    const goals = timeGoals(SEED, MATCH, "home", scorers);
    expect(goals).toHaveLength(3); // 2 + 1
    for (const g of goals) {
      expect(g.minute).toBeGreaterThanOrEqual(1);
      expect(g.minute).toBeLessThanOrEqual(MATCH_MINUTES);
    }
    // Ordenado por minuto.
    const minutes = goals.map((g) => g.minute);
    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes);
  });

  it("é determinístico: mesmo jogo, mesmos minutos", () => {
    expect(timeGoals(SEED, MATCH, "home", scorers)).toEqual(
      timeGoals(SEED, MATCH, "home", scorers),
    );
  });

  it("sem gols, sem eventos", () => {
    expect(timeGoals(SEED, MATCH, "home", [])).toHaveLength(0);
  });
});
