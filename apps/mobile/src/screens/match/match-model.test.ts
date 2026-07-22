import { describe, expect, it } from "vitest";

import {
  buildTimeline,
  eventLabel,
  missingFeedFamilies,
  scoreAfterEvent,
  type MatchFeedEventSource,
} from "./match-model";

const goal = (
  over: Partial<MatchFeedEventSource> = {},
): MatchFeedEventSource => ({
  sequence: 1,
  minute: 10,
  type: "GOAL",
  clubId: "casa",
  playerId: "p1",
  playerName: "Otávio Rocha",
  description: "Gol",
  ...over,
});

describe("buildTimeline", () => {
  it("separa 1º e 2º tempo pelo minuto 45", () => {
    const halves = buildTimeline(
      [
        goal({ sequence: 1, minute: 12 }),
        goal({ sequence: 2, minute: 45 }),
        goal({ sequence: 3, minute: 46 }),
        goal({ sequence: 4, minute: 90 }),
      ],
      "casa",
    );

    expect(halves.map((h) => h.half)).toEqual([1, 2]);
    expect(halves[0]!.events.map((e) => e.minute)).toEqual([12, 45]);
    expect(halves[1]!.events.map((e) => e.minute)).toEqual([46, 90]);
  });

  it("ordena por sequência, não pelo minuto — a sequência é a ordem oficial", () => {
    const halves = buildTimeline(
      [
        goal({ sequence: 2, minute: 20 }),
        goal({ sequence: 1, minute: 20 }),
      ],
      "casa",
    );
    expect(halves[0]!.events.map((e) => e.sequence)).toEqual([1, 2]);
  });

  it("marca de que lado o evento foi", () => {
    const halves = buildTimeline(
      [
        goal({ sequence: 1, clubId: "casa" }),
        goal({ sequence: 2, clubId: "fora" }),
        goal({ sequence: 3, clubId: null }),
      ],
      "casa",
    );
    const events = halves[0]!.events;
    expect(events[0]!.side).toBe("home");
    expect(events[1]!.side).toBe("away");
    // Evento sem clube (apito, VAR) não pertence a lado nenhum.
    expect(events[2]!.side).toBeNull();
  });

  it("partida sem evento devolve nenhum tempo, não um tempo vazio", () => {
    expect(buildTimeline([], "casa")).toEqual([]);
  });

  it("só 2º tempo não inventa um 1º tempo vazio", () => {
    const halves = buildTimeline([goal({ minute: 70 })], "casa");
    expect(halves).toHaveLength(1);
    expect(halves[0]!.half).toBe(2);
  });
});

describe("scoreAfterEvent", () => {
  it("acumula o placar lance a lance", () => {
    const events = [
      goal({ sequence: 1, clubId: "casa" }),
      goal({ sequence: 2, clubId: "fora" }),
      goal({ sequence: 3, clubId: "casa" }),
    ];
    expect(scoreAfterEvent(events, 1, "casa")).toEqual({ home: 1, away: 0 });
    expect(scoreAfterEvent(events, 2, "casa")).toEqual({ home: 1, away: 1 });
    expect(scoreAfterEvent(events, 3, "casa")).toEqual({ home: 2, away: 1 });
  });

  it("gol contra conta para o ADVERSÁRIO de quem marcou", () => {
    const events = [
      goal({ sequence: 1, type: "OWN_GOAL", clubId: "casa" }),
    ];
    // O evento é do clube da casa, mas o gol é do visitante.
    expect(scoreAfterEvent(events, 1, "casa")).toEqual({ home: 0, away: 1 });
  });

  it("evento que não é gol não move o placar", () => {
    const events = [
      goal({ sequence: 1, type: "YELLOW_CARD", clubId: "casa" }),
      goal({ sequence: 2, type: "GOAL", clubId: "casa" }),
    ];
    expect(scoreAfterEvent(events, 1, "casa")).toEqual({ home: 0, away: 0 });
    expect(scoreAfterEvent(events, 2, "casa")).toEqual({ home: 1, away: 0 });
  });
});

describe("eventLabel", () => {
  it("traduz os tipos que o feed pode trazer", () => {
    expect(eventLabel("GOAL")).toBe("Gol");
    expect(eventLabel("OWN_GOAL")).toBe("Gol contra");
    expect(eventLabel("YELLOW_CARD")).toBe("Cartão amarelo");
    expect(eventLabel("RED_CARD")).toBe("Cartão vermelho");
    expect(eventLabel("SUBSTITUTION")).toBe("Substituição");
    expect(eventLabel("PENALTY_SCORED")).toBe("Pênalti convertido");
  });

  it("tipo desconhecido devolve o próprio código, nunca vazio", () => {
    expect(eventLabel("QUALQUER_COISA")).toBe("QUALQUER_COISA");
  });
});

describe("missingFeedFamilies", () => {
  it("nomeia o que o motor NÃO registrou nesta partida", () => {
    const missing = missingFeedFamilies({
      goals: true,
      assists: true,
      cards: true,
      substitutions: false,
      shots: false,
      teamStats: true,
    });
    // O que o motor produz hoje: gol, assistência, cartão e estatística de
    // time. Falta a substituição (sem escalação, ninguém sabe quem está em
    // campo) e a finalização como LANCE (o kernel dá o total, não o instante).
    expect(missing).toEqual([
      "substituições",
      "finalizações lance a lance",
    ]);
  });

  it("motor completo não tem nada a declarar", () => {
    expect(
      missingFeedFamilies({
        goals: true,
        assists: true,
        cards: true,
        substitutions: true,
        shots: true,
        teamStats: true,
      }),
    ).toEqual([]);
  });

  it("gol ausente também é declarado — nada é presumido", () => {
    const missing = missingFeedFamilies({
      goals: false,
      assists: true,
      cards: true,
      substitutions: true,
      shots: true,
      teamStats: true,
    });
    expect(missing).toEqual(["gols"]);
  });
});
