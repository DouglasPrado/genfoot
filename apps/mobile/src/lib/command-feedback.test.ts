import { describe, expect, it } from "vitest";

import { CommandTrackingStatus } from "@grinta/core";

import { commandFeedback } from "./command-feedback.js";

describe("commandFeedback — o que o usuário vê depois de uma ação", () => {
  it("ACCEPTED/APPLIED → toast de sucesso com o texto do chamador", () => {
    expect(
      commandFeedback(
        { status: CommandTrackingStatus.ACCEPTED, errorCode: null },
        "Treino iniciado.",
      ),
    ).toEqual({ tone: "success", text: "Treino iniciado." });
    expect(
      commandFeedback(
        { status: CommandTrackingStatus.APPLIED, errorCode: null },
        "Ganho coletado.",
      ),
    ).toEqual({ tone: "success", text: "Ganho coletado." });
  });

  it("SUBMITTING → sem toast (a ação ainda está em voo)", () => {
    expect(
      commandFeedback(
        { status: CommandTrackingStatus.SUBMITTING, errorCode: null },
        "Treino iniciado.",
      ),
    ).toBeNull();
  });

  it("REJECTED traduz o errorCode para mensagem CLARA, não o código cru", () => {
    const cases: Record<string, string> = {
      TRAINING_SESSION_ALREADY_TODAY: "Este jogador já treinou hoje. Amanhã ele pode treinar de novo.",
      TRAINING_SESSION_ALREADY_ACTIVE: "Este jogador já está treinando. Colete a sessão antes de iniciar outra.",
      PLAYER_NOT_AVAILABLE: "Jogador indisponível (lesão ou suspensão) não pode treinar.",
      ATTRIBUTE_NOT_APPLICABLE: "Este atributo não se aplica a este jogador.",
      NO_ACTIVE_TRAINING_SESSION: "Não há sessão de treino para coletar.",
      PLAYER_UNDER_MEDICAL_RESTRICTION: "Jogador sob restrição médica só treina recuperação.",
      NO_LINEUP_TO_TRAIN: "Monte a escalação antes de treinar a formação.",
      TRAINING_PLAN_INVALID: "Plano de treino inválido. Revise foco, carga e jogadores.",
      AGGREGATE_VERSION_CONFLICT: "O dado mudou desde que você abriu a tela. Recarregue e tente de novo.",
    };
    for (const [code, text] of Object.entries(cases)) {
      const fb = commandFeedback(
        { status: CommandTrackingStatus.REJECTED, errorCode: code },
        "irrelevante",
      );
      expect(fb).toEqual({ tone: "error", text });
    }
  });

  it("REJECTED com código desconhecido NÃO mostra o código cru — mensagem genérica clara", () => {
    const fb = commandFeedback(
      { status: CommandTrackingStatus.REJECTED, errorCode: "ALGUM_CODIGO_NOVO" },
      "irrelevante",
    );
    expect(fb?.tone).toBe("error");
    // Não vaza o código técnico para o jogador.
    expect(fb?.text).not.toContain("ALGUM_CODIGO_NOVO");
    expect(fb?.text.length).toBeGreaterThan(0);
  });

  it("REJECTED sem errorCode ainda dá uma mensagem, não vazio", () => {
    const fb = commandFeedback(
      { status: CommandTrackingStatus.REJECTED, errorCode: null },
      "irrelevante",
    );
    expect(fb?.tone).toBe("error");
    expect(fb?.text.length).toBeGreaterThan(0);
  });

  it("UNKNOWN_RECOVERING → erro honesto de 'não deu para confirmar'", () => {
    const fb = commandFeedback(
      { status: CommandTrackingStatus.UNKNOWN_RECOVERING, errorCode: "COMMAND_RESULT_UNKNOWN" },
      "irrelevante",
    );
    expect(fb?.tone).toBe("error");
    expect(fb?.text.toLowerCase()).toContain("confirm");
  });
});
