/**
 * F13 · Risco de lesão — **R-21** (ratificada).
 *
 * `p_lesão = clamp(baseRate · riskMult_F2(f) · (1 + 0.01·(riscoScore − 50)), 0, 0.02)`
 * com `baseRate = 0.0004` e `riskMult_F2(f) = 1 + 3·(max(0, f − 60)/40)²` (R-16).
 *
 * A matriz de tipo (pesos-base + ajustes multiplicativos renormalizados)
 * também é R-21. Tudo puro e determinístico: o sorteio entra como `roll`.
 *
 * Isto é o gatilho MED-1 da máquina médica: quem dispara chama
 * `openInjuryEpisode` com o tipo sorteado aqui.
 */

import { InjuryType } from "./injury-episode-types.js";

/** R-21: incidência base por tick (≈3,6% numa partida-base de 90 ticks). */
export const INJURY_BASE_RATE = 0.0004;

/** R-21: teto duro da probabilidade por tick. */
export const INJURY_MAX_RATE = 0.02;

/** R-16: multiplicador de risco pela fadiga — entra em cena após 60%. */
export function fatigueRiskMultiplier(fatigue: number): number {
  const excess = Math.max(0, fatigue - 60) / 40;
  return 1 + 3 * excess * excess;
}

export interface InjuryRiskInput {
  /** Fadiga acumulada 0–100 (R-16). */
  readonly fatigue: number;
  /**
   * `riscoScore` 0–100 — somatório assinado de histórico, intensidade, clima,
   * gramado, sprints, duelos, idade, menos preparação e equipe médica (R-21).
   */
  readonly riskScore: number;
}

/** `p_lesão` por tick, conforme R-21. */
export function injuryProbability(input: InjuryRiskInput): number {
  const raw =
    INJURY_BASE_RATE *
    fatigueRiskMultiplier(input.fatigue) *
    (1 + 0.01 * (input.riskScore - 50));
  return Math.min(INJURY_MAX_RATE, Math.max(0, raw));
}

/** R-21: pesos-base da matriz de tipo. */
const BASE_TYPE_WEIGHTS: Readonly<Record<InjuryType, number>> = {
  LIGHT: 45,
  MODERATE: 30,
  SERIOUS: 12,
  MUSCULAR: 8,
  IMPACT: 3,
  RECURRENT: 2,
};

export interface InjuryTypeContext {
  readonly fatigue: number;
  /** O lance foi contato/duelo? */
  readonly contact: boolean;
  /** Há histórico de lesão na mesma região? */
  readonly recurrentHistory: boolean;
  readonly age: number;
}

/**
 * Distribuição de tipo — pesos-base ajustados por contexto (multiplicativos) e
 * renormalizados, exatamente como R-21 manda.
 */
export function injuryTypeDistribution(
  context: InjuryTypeContext,
): ReadonlyArray<{ readonly type: InjuryType; readonly probability: number }> {
  const adjusted: Array<{ type: InjuryType; weight: number }> = (
    Object.keys(BASE_TYPE_WEIGHTS) as InjuryType[]
  ).map((type) => {
    let weight = BASE_TYPE_WEIGHTS[type];
    if (type === InjuryType.MUSCULAR && context.fatigue > 70) weight *= 2;
    if (type === InjuryType.IMPACT && context.contact) weight *= 3;
    if (type === InjuryType.RECURRENT && context.recurrentHistory) weight *= 3;
    if (type === InjuryType.SERIOUS && context.age > 32) weight *= 1.5;
    return { type, weight };
  });

  const total = adjusted.reduce((sum, entry) => sum + entry.weight, 0);
  return adjusted.map((entry) => ({
    type: entry.type,
    probability: entry.weight / total,
  }));
}

/**
 * Sorteia o tipo a partir de um `roll` 0–1 (vem do `SeededRandom` do mundo).
 * Percorre a distribuição na ordem canônica — mesmo roll, mesmo tipo.
 */
export function rollInjuryType(
  context: InjuryTypeContext,
  roll: number,
): InjuryType {
  const distribution = injuryTypeDistribution(context);
  let cumulative = 0;
  for (const entry of distribution) {
    cumulative += entry.probability;
    if (roll < cumulative) return entry.type;
  }
  return distribution[distribution.length - 1]?.type ?? InjuryType.LIGHT;
}
