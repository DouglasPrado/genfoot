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
/** Concentração da sessão: sem ela o ganho diário renderia < 1 ponto, invisível. */
export const SESSION_INTENSITY = 12;
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

/**
 * Os pontos que a coleta desta sessão renderia AGORA (dado o tempo já treinado),
 * já com o clamp de +6 por coleta e o teto de 100. Não aplica nada — só projeta.
 */
export function projectSessionGainPoints(input: SessionGainInput): number {
  if (input.attributeCurrentValue === null) return 0;
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
  // Clamp por coleta (+6) e teto do atributo (100).
  const capped = Math.min(raw, SESSION_MAX_GAIN_PER_COLLECT);
  const headroomToCeiling = Math.max(0, 100 - input.attributeCurrentValue);
  return Math.max(0, Math.min(capped, headroomToCeiling));
}
