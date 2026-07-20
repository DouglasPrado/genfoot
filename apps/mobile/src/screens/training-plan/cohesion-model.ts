/**
 * Modelo puro do ENTROSAMENTO na tela de treino (R-220 Fase 3).
 *
 * A coesão do time (`Club.cohesion`, 0..100) sobe jogando partida e treinando a
 * formação, e cai por transferência. Esta camada traduz o número para a tela:
 * faixa legível, tom, o modificador ± que ele dá à partida, e se o treino de
 * formação está disponível (precisa de escalação).
 */
export type CohesionTone = "up" | "down" | "neutral";

export interface CohesionBadge {
  readonly label: string;
  readonly tone: CohesionTone;
  /** O valor cru preso em 0..100, para a tela mostrar o número. */
  readonly value: number;
}

const clamp0to100 = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));

export function cohesionBadge(cohesion: number): CohesionBadge {
  const value = clamp0to100(cohesion);
  if (value >= 70) return { label: "Entrosado", tone: "up", value };
  if (value < 35) return { label: "Desentrosado", tone: "down", value };
  return { label: "Ajustando", tone: "neutral", value };
}

/**
 * O modificador ± que o entrosamento dá à força na partida (R-15). Espelha o
 * `cohesionModifier` do domínio: 50 neutro (0), 100 → +6, 0 → −6. Inteiro.
 */
const COHESION_START = 50;
const COHESION_MOD_MAX = 6;

export function cohesionMatchModifier(cohesion: number): number {
  const c = clamp0to100(cohesion);
  return Math.round(((c - COHESION_START) / COHESION_START) * COHESION_MOD_MAX);
}

/**
 * O treino de formação só vale com escalação montada — não se treina uma
 * formação que não existe. O backend recusa com `NO_LINEUP_TO_TRAIN`; a tela
 * não oferece um botão que já se sabe que vai falhar.
 */
export function canTrainFormation(input: { readonly hasLineup: boolean }): boolean {
  return input.hasLineup;
}
