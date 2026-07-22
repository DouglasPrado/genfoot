import { describe, expect, it } from "vitest";

import {
  canForceReturn,
  departmentLevelLabel,
  departmentSummary,
  forceReturnWarning,
  formatWorldDate,
  primaryAction,
  rehabProgress,
  rehabStageLabel,
  returnEstimateLabel,
  restrictionLabel,
  severityLabel,
  sortCases,
  type MedicalCase,
  type MedicalRestriction,
} from "./medical-model.js";

const restriction: MedicalRestriction = {
  playerId: "player-9",
  playerName: "Ademir Souza",
  position: "CB",
  availability: "INJURED",
  fatigue: 30,
  condition: 70,
};

const baseCase: MedicalCase = {
  injuryId: "injury-1",
  playerId: "player-1",
  playerName: "Rafael Nascimento",
  position: "ST",
  state: "REHAB",
  rehabStage: 3,
  rehabStageCode: "STRENGTHENING",
  rehabStageTotal: 7,
  injuryType: "MUSCULAR",
  region: "coxa-direita",
  severity: "MODERATE",
  occurredOn: "2026-07-22",
  estimatedReturnOn: "2026-08-15",
  minimumDays: 11,
  maximumDays: 28,
  treatmentOption: "STANDARD",
  relapseRisk: 48,
  returnRiskScore: 40,
  relapseCount: 0,
  fatigue: 20,
  condition: 80,
  backInTraining: false,
};

const withCase = (overrides: Partial<MedicalCase>): MedicalCase => ({
  ...baseCase,
  ...overrides,
});

describe("ordenação da lista", () => {
  it("põe primeiro quem espera decisão, não quem já está em tratamento", () => {
    const ordered = sortCases([
      withCase({ playerId: "a", state: "REHAB" }),
      withCase({ playerId: "b", state: "EVALUATION", severity: null }),
      withCase({ playerId: "c", state: "DIAGNOSIS" }),
    ]);

    expect(ordered.map((item) => item.playerId)).toEqual(["b", "c", "a"]);
  });

  it("dentro do mesmo estado, o mais grave vem antes", () => {
    const ordered = sortCases([
      withCase({ playerId: "leve", severity: "LIGHT" }),
      withCase({ playerId: "grave", severity: "CRITICAL" }),
    ]);

    expect(ordered[0]?.playerId).toBe("grave");
  });

  it("empate é resolvido pelo nome — a lista não dança entre buscas", () => {
    const ordered = sortCases([
      withCase({ playerId: "z", playerName: "Zico" }),
      withCase({ playerId: "a", playerName: "Ademir" }),
    ]);

    expect(ordered.map((item) => item.playerId)).toEqual(["a", "z"]);
  });

  it("não muta a lista recebida", () => {
    const original = [
      withCase({ playerId: "a", state: "REHAB" }),
      withCase({ playerId: "b", state: "EVALUATION" }),
    ];
    sortCases(original);

    expect(original[0]?.playerId).toBe("a");
  });
});

describe("ação permitida pelo estado", () => {
  it("cada estado oferece exatamente a transição que a máquina aceita", () => {
    expect(primaryAction(withCase({ state: "EVALUATION" })).kind).toBe(
      "ORDER_EXAM",
    );
    expect(primaryAction(withCase({ state: "EXAMS" })).kind).toBe("DIAGNOSE");
    expect(primaryAction(withCase({ state: "DIAGNOSIS" })).kind).toBe("SET_PLAN");
    expect(primaryAction(withCase({ state: "REHAB" })).kind).toBe("ADVANCE_REHAB");
    expect(primaryAction(withCase({ state: "COMPETITIVE_RETURN" })).kind).toBe(
      "DISCHARGE",
    );
  });

  it("no último estágio o botão vira liberação competitiva", () => {
    expect(primaryAction(withCase({ rehabStage: 7 })).label).toBe(
      "Liberar para competição",
    );
    expect(primaryAction(withCase({ rehabStage: 6 })).label).toBe(
      "Avançar estágio",
    );
  });

  it("caso encerrado não oferece ação", () => {
    expect(primaryAction(withCase({ state: "DISCHARGE" })).kind).toBe("NONE");
    expect(primaryAction(withCase({ state: "MEDICAL_RETIREMENT" })).kind).toBe(
      "NONE",
    );
  });

  it("forçar retorno só existe dentro da reabilitação, antes do último estágio", () => {
    expect(canForceReturn(withCase({ state: "REHAB", rehabStage: 2 }))).toBe(true);
    expect(canForceReturn(withCase({ state: "REHAB", rehabStage: 7 }))).toBe(false);
    expect(canForceReturn(withCase({ state: "EXAMS", rehabStage: null }))).toBe(
      false,
    );
  });
});

describe("progresso da reabilitação", () => {
  it("é a fração do estágio sobre o total", () => {
    expect(rehabProgress(withCase({ rehabStage: 3 }))).toBeCloseTo(3 / 7);
  });

  it("liberado pela medicina é 100%", () => {
    expect(
      rehabProgress(withCase({ state: "COMPETITIVE_RETURN", rehabStage: null })),
    ).toBe(1);
  });

  it("fora da reabilitação não existe barra", () => {
    expect(rehabProgress(withCase({ state: "EXAMS", rehabStage: null }))).toBeNull();
  });
});

describe("aviso do retorno forçado", () => {
  it("escala o tom com o risco", () => {
    expect(forceReturnWarning(withCase({ relapseRisk: 10 })).tone).toBe("info");
    expect(forceReturnWarning(withCase({ relapseRisk: 40 })).tone).toBe("warning");
    expect(forceReturnWarning(withCase({ relapseRisk: 80 })).tone).toBe("danger");
  });

  it("diz quantos estágios faltam e o risco em número", () => {
    const warning = forceReturnWarning(withCase({ rehabStage: 5, relapseRisk: 25 }));

    expect(warning.message).toContain("2 estágios");
    expect(warning.message).toContain("25%");
  });

  it("caso fora da reabilitação não inventa risco — trata como zero", () => {
    const warning = forceReturnWarning(
      withCase({ state: "EVALUATION", rehabStage: null, relapseRisk: null }),
    );

    expect(warning.tone).toBe("info");
    expect(warning.message).toContain("0%");
  });

  it("singular quando falta um estágio só", () => {
    expect(
      forceReturnWarning(withCase({ rehabStage: 6 })).message,
    ).toContain("1 estágio de reabilitação");
  });
});

describe("rótulos", () => {
  it("sem diagnóstico a gravidade é 'a confirmar', não uma gravidade inventada", () => {
    expect(severityLabel(null)).toBe("A confirmar");
    expect(severityLabel("SERIOUS")).toBe("Grave");
  });

  it("traduz os 7 estágios", () => {
    expect(rehabStageLabel("PAIN_CONTROL")).toBe("Controle da dor");
    expect(rehabStageLabel("COMPETITIVE_CLEARANCE")).toBe("Liberação competitiva");
    expect(rehabStageLabel(null)).toBeNull();
  });

  it("prazo cai na faixa do diagnóstico quando não há tratamento", () => {
    expect(
      returnEstimateLabel(withCase({ estimatedReturnOn: null })),
    ).toBe("Faixa estimada: 11–28 dias");
  });

  it("sem diagnóstico nem tratamento o prazo é honesto sobre não saber", () => {
    expect(
      returnEstimateLabel(
        withCase({ estimatedReturnOn: null, minimumDays: null, maximumDays: null }),
      ),
    ).toBe("Prazo a definir pelos exames");
  });

  it("formata a data do MUNDO, não a do device", () => {
    expect(formatWorldDate("2026-08-15")).toBe("15/08/2026");
  });
});

describe("resumo do departamento", () => {
  it("elenco sem casos é o estado vazio 'saudável'", () => {
    expect(
      departmentSummary({
        cases: [],
        restrictions: [],
        squadSize: 23,
        healthyCount: 23,
        departmentLevel: 55,
      }),
    ).toBe("Elenco saudável — 23 jogadores disponíveis");
  });

  it("com casos, mostra a incidência agregada", () => {
    const summary = departmentSummary({
      cases: [withCase({ state: "REHAB" }), withCase({ state: "EXAMS" })],
      restrictions: [],
      squadSize: 23,
      healthyCount: 21,
      departmentLevel: 55,
    });

    expect(summary).toBe("2 casos abertos · 1 em reabilitação · 21 sãos");
  });

  it("jogador impedido sem episódio NÃO some — senão o elenco e o médico se contradizem", () => {
    const summary = departmentSummary({
      cases: [],
      restrictions: [restriction],
      squadSize: 23,
      healthyCount: 22,
      departmentLevel: 55,
    });

    expect(summary).toBe(
      "1 jogador impedido sem caso registrado · 22 sãos",
    );
  });

  it("com caso E impedido sem episódio, o resumo cita os dois", () => {
    const summary = departmentSummary({
      cases: [withCase({ state: "REHAB" })],
      restrictions: [restriction],
      squadSize: 23,
      healthyCount: 21,
      departmentLevel: 55,
    });

    expect(summary).toContain("1 caso aberto");
    expect(summary).toContain("1 sem caso registrado");
  });

  it("o rótulo do impedido diz o motivo real, sem inventar lesão", () => {
    expect(restrictionLabel(restriction)).toBe(
      "Marcado como lesionado, sem caso médico aberto",
    );
    expect(
      restrictionLabel({ ...restriction, availability: "UNAVAILABLE" }),
    ).toBe("Indisponível, sem caso médico aberto");
  });

  it("clube sem médico contratado diz isso, não inventa nível", () => {
    expect(departmentLevelLabel(null)).toBe("Sem comissão médica contratada");
    expect(departmentLevelLabel(85)).toContain("elite");
  });
});
