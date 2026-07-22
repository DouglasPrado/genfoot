import { describe, expect, it } from "vitest";

import {
  attributeAssists,
  attributeShots,
  drawCards,
  distributeOnTarget,
  drawFouls,
  splitOnTarget,
  type IncidentCandidate,
} from "./match-incidents.js";

const squad: IncidentCandidate[] = [
  { playerId: "gk", primaryPosition: "GK", ability: 60 },
  { playerId: "cb1", primaryPosition: "CB", ability: 62 },
  { playerId: "cb2", primaryPosition: "CB", ability: 58 },
  { playerId: "lb", primaryPosition: "LB", ability: 59 },
  { playerId: "cdm", primaryPosition: "CDM", ability: 63 },
  { playerId: "cm", primaryPosition: "CM", ability: 65 },
  { playerId: "cam", primaryPosition: "CAM", ability: 70 },
  { playerId: "lw", primaryPosition: "LW", ability: 68 },
  { playerId: "st", primaryPosition: "ST", ability: 72 },
];

const SEED = "mundo-seed";
const MATCH = "019f782e-4198-77f8-baa0-6d54bcfa9c31";

describe("attributeAssists", () => {
  const goals = [
    { playerId: "st", minute: 10 },
    { playerId: "lw", minute: 40 },
    { playerId: "cam", minute: 77 },
  ];

  it("é determinístico: mesma semente, mesmas assistências", () => {
    const a = attributeAssists(SEED, MATCH, "home", squad, goals);
    const b = attributeAssists(SEED, MATCH, "home", squad, goals);
    expect(a).toEqual(b);
  });

  it("partida diferente dá assistências diferentes", () => {
    const a = attributeAssists(SEED, MATCH, "home", squad, goals);
    const b = attributeAssists(SEED, "outro-match-id", "home", squad, goals);
    expect(a).not.toEqual(b);
  });

  it("ninguém assiste o próprio gol", () => {
    const assists = attributeAssists(SEED, MATCH, "home", squad, goals);
    for (const assist of assists) {
      expect(assist.playerId).not.toBe(assist.scorerId);
    }
  });

  it("a assistência cai no MESMO minuto do gol que ela criou", () => {
    const assists = attributeAssists(SEED, MATCH, "home", squad, goals);
    for (const assist of assists) {
      const goal = goals.find((g) => g.playerId === assist.scorerId);
      expect(assist.minute).toBe(goal?.minute);
    }
  });

  it("nem todo gol tem assistência — gol solitário existe", () => {
    // Com muitos gols, alguns saem sem assistência: a taxa não é 100%.
    const muitos = Array.from({ length: 40 }, (_, i) => ({
      playerId: "st",
      minute: i + 1,
    }));
    const assists = attributeAssists(SEED, MATCH, "home", squad, muitos);
    expect(assists.length).toBeGreaterThan(0);
    expect(assists.length).toBeLessThan(muitos.length);
  });

  it("sem gol não há assistência", () => {
    expect(attributeAssists(SEED, MATCH, "home", squad, [])).toEqual([]);
  });

  it("elenco de um jogador só não gera assistência para ele mesmo", () => {
    const solo = [{ playerId: "st", primaryPosition: "ST", ability: 70 }];
    expect(
      attributeAssists(SEED, MATCH, "home", solo, [
        { playerId: "st", minute: 10 },
      ]),
    ).toEqual([]);
  });
});

describe("drawCards", () => {
  it("é determinístico", () => {
    expect(drawCards(SEED, MATCH, "home", squad)).toEqual(
      drawCards(SEED, MATCH, "home", squad),
    );
  });

  it("os dois lados sorteiam cartões diferentes", () => {
    expect(drawCards(SEED, MATCH, "home", squad)).not.toEqual(
      drawCards(SEED, MATCH, "away", squad),
    );
  });

  it("nenhum jogador leva dois amarelos no mesmo jogo", () => {
    for (let i = 0; i < 50; i += 1) {
      const cards = drawCards(SEED, `partida-${i}`, "home", squad);
      const yellows = cards.filter((c) => c.type === "YELLOW_CARD");
      const ids = yellows.map((c) => c.playerId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("o minuto de todo cartão está dentro do jogo", () => {
    for (let i = 0; i < 30; i += 1) {
      for (const card of drawCards(SEED, `p-${i}`, "home", squad)) {
        expect(card.minute).toBeGreaterThanOrEqual(1);
        expect(card.minute).toBeLessThanOrEqual(90);
      }
    }
  });

  it("vermelho é RARO — muito menos comum que amarelo", () => {
    let yellows = 0;
    let reds = 0;
    for (let i = 0; i < 200; i += 1) {
      for (const card of drawCards(SEED, `amostra-${i}`, "home", squad)) {
        if (card.type === "YELLOW_CARD") yellows += 1;
        else reds += 1;
      }
    }
    expect(yellows).toBeGreaterThan(0);
    expect(reds * 10).toBeLessThan(yellows);
  });

  it("elenco vazio não gera cartão", () => {
    expect(drawCards(SEED, MATCH, "home", [])).toEqual([]);
  });
});

describe("attributeShots", () => {
  it("distribui exatamente o total de finalizações do kernel", () => {
    const shots = attributeShots(SEED, MATCH, "home", squad, 14, []);
    const total = shots.reduce((sum, s) => sum + s.shots, 0);
    expect(total).toBe(14);
  });

  it("quem marcou finaliza pelo menos o número de gols que fez", () => {
    const scorers = [
      { playerId: "st", goals: 2 },
      { playerId: "cb1", goals: 1 },
    ];
    const shots = attributeShots(SEED, MATCH, "home", squad, 10, scorers);
    const byPlayer = new Map(shots.map((s) => [s.playerId, s.shots]));
    expect(byPlayer.get("st") ?? 0).toBeGreaterThanOrEqual(2);
    expect(byPlayer.get("cb1") ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("é determinístico", () => {
    expect(attributeShots(SEED, MATCH, "home", squad, 9, [])).toEqual(
      attributeShots(SEED, MATCH, "home", squad, 9, []),
    );
  });

  it("mais gols que finalizações do kernel não quebra a conta", () => {
    // Estado impossível no motor, mas a função não pode devolver total negativo.
    const shots = attributeShots(SEED, MATCH, "home", squad, 1, [
      { playerId: "st", goals: 3 },
    ]);
    const total = shots.reduce((sum, s) => sum + s.shots, 0);
    expect(total).toBeGreaterThanOrEqual(3);
  });

  it("zero finalização e zero gol devolve lista vazia", () => {
    expect(attributeShots(SEED, MATCH, "home", squad, 0, [])).toEqual([]);
  });
});

describe("splitOnTarget", () => {
  it("gol é SEMPRE finalização no alvo", () => {
    for (let i = 0; i < 40; i += 1) {
      const onTarget = splitOnTarget(SEED, `jogo-${i}`, "home", 10, 4);
      expect(onTarget).toBeGreaterThanOrEqual(4);
    }
  });

  it("nunca passa do total de finalizações", () => {
    for (let i = 0; i < 40; i += 1) {
      const onTarget = splitOnTarget(SEED, `jogo-${i}`, "home", 7, 1);
      expect(onTarget).toBeLessThanOrEqual(7);
    }
  });

  it("é determinístico", () => {
    expect(splitOnTarget(SEED, MATCH, "home", 12, 2)).toBe(
      splitOnTarget(SEED, MATCH, "home", 12, 2),
    );
  });

  it("sem finalização não há chute no alvo", () => {
    expect(splitOnTarget(SEED, MATCH, "home", 0, 0)).toBe(0);
  });

  it("mais gols que finalizações não devolve alvo menor que os gols", () => {
    expect(splitOnTarget(SEED, MATCH, "home", 1, 3)).toBe(3);
  });
});

describe("drawFouls", () => {
  it("é determinístico", () => {
    expect(drawFouls(SEED, MATCH, "home", squad, [])).toEqual(
      drawFouls(SEED, MATCH, "home", squad, []),
    );
  });

  it("quem levou cartão cometeu ao menos uma falta", () => {
    const cards = [
      { playerId: "cdm", type: "YELLOW_CARD" as const, minute: 20 },
      { playerId: "cb1", type: "RED_CARD" as const, minute: 70 },
    ];
    const fouls = drawFouls(SEED, MATCH, "home", squad, cards);
    const byPlayer = new Map(fouls.map((f) => [f.playerId, f.fouls]));
    expect(byPlayer.get("cdm") ?? 0).toBeGreaterThanOrEqual(1);
    expect(byPlayer.get("cb1") ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("elenco vazio não comete falta", () => {
    expect(drawFouls(SEED, MATCH, "home", [], [])).toEqual([]);
  });

  it("o total de faltas do time é plausível para um jogo", () => {
    for (let i = 0; i < 30; i += 1) {
      const total = drawFouls(SEED, `p-${i}`, "home", squad, []).reduce(
        (sum, f) => sum + f.fouls,
        0,
      );
      expect(total).toBeGreaterThanOrEqual(6);
      expect(total).toBeLessThanOrEqual(20);
    }
  });
});

describe("distributeOnTarget", () => {
  const shots = [
    { playerId: "st", shots: 4 },
    { playerId: "lw", shots: 3 },
    { playerId: "cm", shots: 1 },
  ];

  it("a soma fecha EXATAMENTE com o total do time", () => {
    for (const total of [0, 1, 3, 5, 8]) {
      const rows = distributeOnTarget(shots, new Map(), total);
      expect(rows.reduce((sum, r) => sum + r.shots, 0)).toBe(total);
    }
  });

  it("quem marcou tem pelo menos os gols dele no alvo", () => {
    const rows = distributeOnTarget(
      shots,
      new Map([["cm", 1]]),
      2,
    );
    const byPlayer = new Map(rows.map((r) => [r.playerId, r.shots]));
    expect(byPlayer.get("cm") ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("ninguém acerta mais chutes do que deu", () => {
    const rows = distributeOnTarget(shots, new Map(), 8);
    for (const row of rows) {
      const dado = shots.find((s) => s.playerId === row.playerId)!.shots;
      expect(row.shots).toBeLessThanOrEqual(dado);
    }
  });

  it("é determinístico", () => {
    expect(distributeOnTarget(shots, new Map(), 4)).toEqual(
      distributeOnTarget(shots, new Map(), 4),
    );
  });

  it("sem finalização não há alvo", () => {
    expect(distributeOnTarget([], new Map(), 5)).toEqual([]);
  });
});
