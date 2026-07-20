/**
 * Modelo puro da conversa/decisão (R-221 Fase 2c, mobile). Seleção de postura e
 * montagem dos payloads dos commands morale:talk-to-player e morale:talk-to-squad.
 * O componente só despacha via submitTrackedCommand; a regra vive e é testada aqui.
 */
export type TalkStance = "PRAISE" | "CRITICIZE";

export interface StanceOption {
  readonly stance: TalkStance;
  readonly label: string;
  readonly tone: "up" | "down";
}

/** As duas posturas oferecidas na tela, com rótulo e tom pro visual. */
export const STANCE_OPTIONS: readonly StanceOption[] = [
  { stance: "PRAISE", label: "Elogiar", tone: "up" },
  { stance: "CRITICIZE", label: "Criticar", tone: "down" },
];

export function buildTalkToPlayerPayload(input: {
  readonly clubId: string;
  readonly playerId: string;
  readonly stance: TalkStance;
}): { readonly clubId: string; readonly playerId: string; readonly stance: TalkStance } {
  return { clubId: input.clubId, playerId: input.playerId, stance: input.stance };
}

export function buildTalkToSquadPayload(input: {
  readonly clubId: string;
  readonly stance: TalkStance;
}): { readonly clubId: string; readonly stance: TalkStance } {
  return { clubId: input.clubId, stance: input.stance };
}

/** Chave de idempotência estável por (alvo, postura) — um efeito por conversa. */
export function talkIdempotencyKey(input: {
  readonly commandType: string;
  readonly targetId: string;
  readonly stance: TalkStance;
}): string {
  return `${input.commandType}:${input.targetId}:${input.stance}`;
}
