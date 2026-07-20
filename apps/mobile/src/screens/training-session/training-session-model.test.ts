import { describe, expect, it } from "vitest";

import {
  buildStartSessionPayload,
  buildTrainingRows,
  canCollect,
  canStart,
  sessionProgressPercent,
  sessionStateOf,
  summarizeTraining,
} from "./training-session-model.js";

describe("training-session-model (R-221 mobile)", () => {
  it("disponível sem sessão → IDLE (pode iniciar)", () => {
    const s = sessionStateOf({ availability: "AVAILABLE", hasActiveSession: false });
    expect(s).toBe("IDLE");
    expect(canStart(s)).toBe(true);
    expect(canCollect(s)).toBe(false);
  });

  it("com sessão ativa → TREINANDO (pode coletar, não iniciar)", () => {
    const s = sessionStateOf({ availability: "UNAVAILABLE", hasActiveSession: true });
    expect(s).toBe("TRAINING");
    expect(canCollect(s)).toBe(true);
    expect(canStart(s)).toBe(false);
  });

  it("indisponível por lesão sem sessão → BLOQUEADO", () => {
    const s = sessionStateOf({ availability: "INJURED", hasActiveSession: false });
    expect(s).toBe("BLOCKED");
    expect(canStart(s)).toBe(false);
  });

  it("payload de start exige atributo-foco", () => {
    expect(buildStartSessionPayload({ clubId: "c", playerId: "p", attributeCode: null }))
      .toEqual({ error: "NO_ATTRIBUTE" });
    expect(buildStartSessionPayload({ clubId: "c", playerId: "p", attributeCode: "shortPassing" }))
      .toEqual({ clubId: "c", playerId: "p", attributeCode: "shortPassing" });
  });
});

describe("buildTrainingRows — junta elenco e sessões ativas (M-TRAINING)", () => {
  const players = [
    { playerId: "p1", name: "Alfa", shirtNumber: 10, primaryPosition: "ST", overall: 70, availability: "AVAILABLE" },
    { playerId: "p2", name: "Beta", shirtNumber: 4, primaryPosition: "CB", overall: 65, availability: "AVAILABLE" },
    { playerId: "p3", name: "Gama", shirtNumber: 1, primaryPosition: "GK", overall: 60, availability: "INJURED" },
  ];
  const sessions = [
    { playerId: "p2", attributeCode: "marking", startDate: "2027-06-08", durationDays: 7 },
  ];

  it("sem sessão e disponível → IDLE, sem progresso", () => {
    const rows = buildTrainingRows(players, sessions, "2027-06-11");
    const row = rows.find((r) => r.playerId === "p1");
    expect(row?.state).toBe("IDLE");
    expect(row?.session).toBeNull();
  });

  it("com sessão ativa → TREINANDO, com dias decorridos e progresso parcial", () => {
    const rows = buildTrainingRows(players, sessions, "2027-06-11");
    const row = rows.find((r) => r.playerId === "p2");
    expect(row?.state).toBe("TRAINING");
    // 08 → 11 = 3 dias de 7.
    expect(row?.session).toEqual({
      attributeCode: "marking",
      elapsedDays: 3,
      durationDays: 7,
      complete: false,
      // Sem projeção do servidor nestes fixtures → campos nulos/zero.
      attributeCurrentValue: null,
      projectedGainPoints: 0,
      projectedValue: null,
    });
  });

  it("passa a projeção do servidor adiante (atual → projetado)", () => {
    const rows = buildTrainingRows(
      players,
      [
        {
          playerId: "p2",
          attributeCode: "marking",
          startDate: "2027-06-08",
          durationDays: 7,
          attributeCurrentValue: 60,
          projectedGainPoints: 4,
          projectedValue: 64,
        },
      ],
      "2027-06-11",
    );
    const row = rows.find((r) => r.playerId === "p2");
    expect(row?.session?.attributeCurrentValue).toBe(60);
    expect(row?.session?.projectedGainPoints).toBe(4);
    expect(row?.session?.projectedValue).toBe(64);
  });

  it("sessão que passou da duração fica completa, e o progresso não passa de 7/7", () => {
    const rows = buildTrainingRows(players, sessions, "2027-06-30");
    const row = rows.find((r) => r.playerId === "p2");
    expect(row?.session?.complete).toBe(true);
    // Coletar depois do fim não rende além da duração — o progresso não mente.
    expect(row?.session?.elapsedDays).toBe(7);
  });

  it("lesionado sem sessão → BLOQUEADO com o motivo da indisponibilidade", () => {
    const rows = buildTrainingRows(players, sessions, "2027-06-11");
    const row = rows.find((r) => r.playerId === "p3");
    expect(row?.state).toBe("BLOCKED");
    expect(row?.blockedLabel).toBe("Lesionado");
  });

  it("a linha carrega a availability crua — a flag de lesão/suspensão lê dela", () => {
    const rows = buildTrainingRows(players, sessions, "2027-06-11");
    expect(rows.find((r) => r.playerId === "p3")?.availability).toBe("INJURED");
    expect(rows.find((r) => r.playerId === "p1")?.availability).toBe("AVAILABLE");
  });

  it("sessão de jogador fora do elenco é ignorada, não vira linha fantasma", () => {
    const rows = buildTrainingRows(players, [
      { playerId: "sumiu", attributeCode: "pace", startDate: "2027-06-10", durationDays: 7 },
    ], "2027-06-11");
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.session === null)).toBe(true);
  });

  it("resumo conta treinando, disponíveis e bloqueados", () => {
    const rows = buildTrainingRows(players, sessions, "2027-06-11");
    expect(summarizeTraining(rows)).toEqual({
      training: 1,
      idle: 1,
      blocked: 1,
      collectable: 1,
    });
  });

  it("elenco vazio rende resumo zerado, não NaN", () => {
    expect(summarizeTraining(buildTrainingRows([], [], "2027-06-11"))).toEqual({
      training: 0,
      idle: 0,
      blocked: 0,
      collectable: 0,
    });
  });
});

describe("sessionProgressPercent — barra de progresso robusta", () => {
  it("proporção normal vira porcentagem arredondada", () => {
    expect(sessionProgressPercent({ elapsedDays: 3, durationDays: 7 })).toBe(43);
    expect(sessionProgressPercent({ elapsedDays: 7, durationDays: 7 })).toBe(100);
  });

  it("durationDays 0 NÃO vira NaN — divisão por zero guardada", () => {
    expect(sessionProgressPercent({ elapsedDays: 3, durationDays: 0 })).toBe(0);
  });

  it("passar da duração não estoura a barra além de 100", () => {
    expect(sessionProgressPercent({ elapsedDays: 20, durationDays: 7 })).toBe(100);
  });

  it("valores negativos caem em 0, não em barra invertida", () => {
    expect(sessionProgressPercent({ elapsedDays: -5, durationDays: 7 })).toBe(0);
  });
});
