import { commandIdempotencyKey, onDay } from "../../lib/idempotency";

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

/**
 * Chave de idempotência por (alvo, postura, DIA LÓGICO do mundo).
 *
 * O dia é o que impede a chave de virar botão de uso único. A versão anterior
 * era estável por (alvo, postura) e só — e contra a API real o segundo elogio
 * ao mesmo jogador voltava `ALREADY_APPLIED` com a forma parada (5 → 8 → 8).
 * O treinador podia elogiar cada jogador UMA VEZ, para sempre.
 *
 * Idempotência é "repetir a MESMA conversa não multiplica o efeito", não
 * "conversar uma vez na vida". Conversar de novo no dia seguinte é uma conversa
 * nova e tem que valer.
 *
 * A data vem do mundo (`asOf`), nunca de `Date.now()`: chave derivada do relógio
 * local mudaria à meia-noite do jogador, não à virada do dia lógico.
 */
export function talkIdempotencyKey(input: {
  readonly commandType: string;
  readonly targetId: string;
  readonly stance: TalkStance;
  readonly worldDate: string;
}): string {
  return commandIdempotencyKey({
    commandType: input.commandType,
    target: `${input.targetId}:${input.stance}`,
    occasion: onDay(input.worldDate),
  });
}
