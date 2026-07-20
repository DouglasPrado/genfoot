import { CommandTrackingStatus } from "@grinta/core";

/**
 * Traduz o resultado de um command no que o jogador VÊ — um toast claro.
 *
 * O cliente é não-autoritativo: o efeito oficial chega pela query. Mas o jogador
 * precisa saber se a ação foi aceita ou recusada, e POR QUÊ, sem ler o código de
 * erro técnico. Este módulo é o único lugar que conhece as mensagens; a tela só
 * dispara o toast.
 */
export type FeedbackTone = "success" | "error" | "info";

export interface Feedback {
  readonly tone: FeedbackTone;
  readonly text: string;
}

/** errorCode do domínio/transporte → frase clara em português. */
const MESSAGE_BY_CODE: Readonly<Record<string, string>> = {
  TRAINING_SESSION_ALREADY_TODAY:
    "Este jogador já treinou hoje. Amanhã ele pode treinar de novo.",
  TRAINING_SESSION_ALREADY_ACTIVE:
    "Este jogador já está treinando. Colete a sessão antes de iniciar outra.",
  PLAYER_NOT_AVAILABLE:
    "Jogador indisponível (lesão ou suspensão) não pode treinar.",
  ATTRIBUTE_NOT_APPLICABLE: "Este atributo não se aplica a este jogador.",
  NO_ACTIVE_TRAINING_SESSION: "Não há sessão de treino para coletar.",
  PLAYER_UNDER_MEDICAL_RESTRICTION:
    "Jogador sob restrição médica só treina recuperação.",
  NO_LINEUP_TO_TRAIN: "Monte a escalação antes de treinar a formação.",
  TRAINING_PLAN_INVALID:
    "Plano de treino inválido. Revise foco, carga e jogadores.",
  PLAYER_NOT_IN_SQUAD: "Jogador não pertence ao elenco.",
  AGGREGATE_VERSION_CONFLICT:
    "O dado mudou desde que você abriu a tela. Recarregue e tente de novo.",
  COMMAND_PAYLOAD_INVALID: "Dados inválidos para esta ação.",
  CONTRACT_UPGRADE_REQUIRED: "Atualize o app para continuar.",
  CONTRACT_INCOMPATIBLE: "Atualize o app para continuar.",
  COMMAND_RESULT_UNKNOWN:
    "Não foi possível confirmar a ação. Verifique e tente de novo.",
  UNAUTHENTICATED: "Sessão expirada. Entre novamente.",
  INSUFFICIENT_FUNDS: "Caixa insuficiente para esta contratação.",
};

const GENERIC_ERROR = "Não foi possível concluir a ação. Tente de novo.";

/** A mensagem clara de uma recusa; nunca vaza o código técnico ao jogador. */
export function messageForCode(errorCode: string | null): string {
  if (errorCode === null) return GENERIC_ERROR;
  return MESSAGE_BY_CODE[errorCode] ?? GENERIC_ERROR;
}

/**
 * O toast a mostrar depois de um command, ou `null` quando ainda não há o que
 * dizer (em voo).
 *
 * ACCEPTED/APPLIED → sucesso com o texto que a tela passou (contextual:
 * "Treino iniciado", "Ganho coletado", …). REJECTED/UNKNOWN → erro com a
 * mensagem traduzida do código.
 */
export function commandFeedback(
  result: {
    readonly status: CommandTrackingStatus;
    readonly errorCode: string | null;
  },
  successText: string,
): Feedback | null {
  if (
    result.status === CommandTrackingStatus.ACCEPTED ||
    result.status === CommandTrackingStatus.APPLIED
  ) {
    return { tone: "success", text: successText };
  }
  if (
    result.status === CommandTrackingStatus.REJECTED ||
    result.status === CommandTrackingStatus.UNKNOWN_RECOVERING
  ) {
    return { tone: "error", text: messageForCode(result.errorCode) };
  }
  // SUBMITTING e quaisquer outros: ainda não há o que dizer.
  return null;
}
