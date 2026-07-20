/**
 * Modelo puro da tela de treino de sessão (R-221 Fase 2a, mobile). Decide o
 * ESTADO da sessão de um jogador e monta os payloads dos commands. O componente
 * só renderiza e despacha via submitTrackedCommand; nada de regra na view.
 *
 * Estados: DISPONÍVEL (pode iniciar), TREINANDO (indisponível, coletável), e o
 * jogador que não pode treinar (lesionado/suspenso) fica BLOQUEADO.
 */
export type SessionState = "IDLE" | "TRAINING" | "BLOCKED";

export interface PlayerSessionInput {
  readonly availability: string; // PlayerAvailability
  readonly hasActiveSession: boolean;
}

export function sessionStateOf(input: PlayerSessionInput): SessionState {
  if (input.hasActiveSession) return "TRAINING";
  if (input.availability === "AVAILABLE") return "IDLE";
  return "BLOCKED";
}

export const canStart = (s: SessionState): boolean => s === "IDLE";
export const canCollect = (s: SessionState): boolean => s === "TRAINING";

export interface StartSessionPayload {
  readonly clubId: string;
  readonly playerId: string;
  readonly attributeCode: string;
}

export function buildStartSessionPayload(input: {
  readonly clubId: string;
  readonly playerId: string;
  readonly attributeCode: string | null;
}): StartSessionPayload | { readonly error: "NO_ATTRIBUTE" } {
  if (input.attributeCode === null || input.attributeCode.trim() === "") {
    return { error: "NO_ATTRIBUTE" };
  }
  return {
    clubId: input.clubId,
    playerId: input.playerId,
    attributeCode: input.attributeCode,
  };
}
