import { computeDevelopmentGain, GAIN_SCALE } from "./development-gain.js";
import { sessionGainMilli } from "./training-session.js";

/**
 * O ganho de uma sessão de treino, em PONTOS de atributo. É a MESMA conta que a
 * coleta aplica (`collect-training-session`) — extraída para pura, para que a
 * PROJEÇÃO na tela ("onde ele vai chegar") bata exatamente com o que a coleta
 * vai render. Duplicar a fórmula seria garantir que os dois números divergem.
 *
 * Constantes VAL-001 (calibração minha, não de doc): os fatores fixos da sessão,
 * o intervalo de headroom e a concentração.
 */
export const SESSION_BASE_LEARNING_RATE = 0.6;
export const SESSION_FOCUSED_QUALITY = 1;
export const SESSION_COMPETITIVE_MINUTES = 0.6;
/** Headroom (teto − atual) que satura o fator de potencial restante em 1. */
export const SESSION_MAX_HEADROOM = 40;
/**
 * Concentração da sessão: sem ela o ganho diário renderia < 1 ponto, invisível.
 * Recalibrado de 12→84 quando a sessão INDIVIDUAL virou de 1 dia (decisão do dono
 * 2026-07-20). Princípio: uma sessão de 1 dia rende o que a sessão inteira rendia
 * antes (a duração caiu de 7→1, então a concentração sobe ×7: 12×7=84), tetada no
 * clamp de +6 por coleta. Assim treinar UM dia mexe no atributo de forma visível.
 * VAL-001 — magnitude/velocidade de evolução a confirmar pelo dono.
 */
export const SESSION_INTENSITY = 84;
/** O clamp por aplicação de `applyAttributeChange` (player.ts): +6 por vez. */
export const SESSION_MAX_GAIN_PER_COLLECT = 6;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export interface SessionGainInput {
  /** Valor atual do atributo-foco (0..100), ou null se não se aplica. */
  readonly attributeCurrentValue: number | null;
  /** Teto APROVEITÁVEL do jogador (potential-layers.usable). */
  readonly usableCeiling: number;
  readonly currentAbility: number;
  /** Moral e fadiga do jogador, 0..100. */
  readonly morale: number;
  readonly fatigue: number;
  readonly age: number;
  readonly elapsedDays: number;
  readonly durationDays: number;
}

/** O que a sessão rende NO NÍVEL DO JOGADOR, antes do teto por atributo. */
export type SessionRawGainInput = Omit<SessionGainInput, "attributeCurrentValue">;

/**
 * O ganho BRUTO da sessão (pontos), já com o clamp de +6 por coleta, mas ANTES
 * do teto de 100 por atributo e ANTES de dividir entre habilidades. É o "total"
 * que a coleta rende; quem escolhe treinar N habilidades divide isto por N.
 */
export function sessionRawGainPoints(input: SessionRawGainInput): number {
  const remainingPotential = clamp01(
    (input.usableCeiling - input.currentAbility) / SESSION_MAX_HEADROOM,
  );
  const dailyGainMilli = computeDevelopmentGain({
    baseLearningRate: SESSION_BASE_LEARNING_RATE,
    remainingPotential,
    trainingFocus: SESSION_FOCUSED_QUALITY,
    trainingQuality: SESSION_FOCUSED_QUALITY,
    compatibility: SESSION_FOCUSED_QUALITY,
    competitiveMinutes: SESSION_COMPETITIVE_MINUTES,
    age: input.age,
    morale: clamp01(input.morale / 100),
    fatigue: clamp01(input.fatigue / 100),
    injury: 0,
    negativePressure: 0,
  });
  const gainMilli =
    sessionGainMilli({
      dailyGainMilli,
      elapsedDays: input.elapsedDays,
      durationDays: input.durationDays,
    }) * SESSION_INTENSITY;
  const raw = Math.round(gainMilli / GAIN_SCALE);
  return Math.min(raw, SESSION_MAX_GAIN_PER_COLLECT);
}

/**
 * O ganho de UM atributo: o bruto DIVIDIDO pelo número de habilidades treinadas
 * (arredondando PARA BAIXO — decisão do dono), tetado no teto de 100 do atributo.
 * Treinar 1 habilidade rende tudo; treinar 5 divide por 5 (e o resto se perde).
 */
export function perAttributeGain(input: {
  readonly rawGain: number;
  readonly attributeCount: number;
  readonly attributeCurrentValue: number | null;
}): number {
  if (input.attributeCurrentValue === null || input.attributeCount <= 0) {
    return 0;
  }
  const split = Math.floor(input.rawGain / input.attributeCount);
  const headroomToCeiling = Math.max(0, 100 - input.attributeCurrentValue);
  return Math.max(0, Math.min(split, headroomToCeiling));
}

/**
 * Os pontos que a coleta renderia AGORA para UM atributo treinado sozinho —
 * compatibilidade e projeção da tela (N=1). Multi-habilidade usa
 * `sessionRawGainPoints` + `perAttributeGain`.
 */
export function projectSessionGainPoints(input: SessionGainInput): number {
  return perAttributeGain({
    rawGain: sessionRawGainPoints(input),
    attributeCount: 1,
    attributeCurrentValue: input.attributeCurrentValue,
  });
}
