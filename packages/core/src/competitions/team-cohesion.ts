/**
 * Entrosamento do time (R-220 Fase 3 / R-07 / R-15 / R-33).
 *
 * PONTUAÇÃO DE TIME (R-220.1) — 0..100, NÃO grafo de pares. Sobe quando o time
 * joga junto (partida disputada) e cai quando o elenco é sacudido (transferência
 * traz cara nova). Na partida, entra como um modificador ± de time, na faixa da
 * R-15 (entrosamento ∈ [−6, +6]): time entrosado rende mais.
 *
 * Puro e determinístico. Magnitudes são calibração minha (VAL-001).
 */

/** Coesão de partida de um clube recém-nascido: mediana neutra. */
export const COHESION_START = 50;
/** Ganho por partida jogada — o time se entende jogando junto. */
export const COHESION_MATCH_GAIN = 4;
/** Baque por transferência que entra: cara nova desajusta o coletivo. */
export const COHESION_TRANSFER_HIT = 12;
/**
 * Ganho por treinar a formação (R-220 Fase 3, refinamento declarado: "treino
 * coletivo-por-formação como fonte de coesão"). MENOR que o de partida de
 * propósito: praticar entrosa, mas não como competir de verdade. Se treino
 * rendesse igual à partida, o custo de rotatividade de elenco desapareceria —
 * bastaria treinar para reentrosar na hora. É o caminho lento. VAL-001.
 */
export const COHESION_FORMATION_TRAINING_GAIN = 2;

/**
 * Bônus de coesão por participante ADAPTADO (fora do ofício) no treino em grupo —
 * decisão do dono (2026-07-21): treinar a formação com gente jogando adaptada
 * entrosa MAIS (o time aprende a se virar). Some ao ganho base. VAL-001.
 */
export const COHESION_ADAPTED_BONUS_PER_PLAYER = 1;
/** Teto do bônus por sessão, para um time inteiro adaptado não estourar a coesão. */
export const COHESION_ADAPTED_BONUS_MAX = 3;

/** O bônus total (tetado) para um número de participantes adaptados. */
export function adaptedCohesionBonus(adaptedCount: number): number {
  const raw = Math.max(0, adaptedCount) * COHESION_ADAPTED_BONUS_PER_PLAYER;
  return Math.min(raw, COHESION_ADAPTED_BONUS_MAX);
}

/** Faixa do modificador na partida (R-15). */
const COHESION_MOD_MAX = 6;

const clamp0to100 = (v: number): number => Math.max(0, Math.min(100, v));

/** Coesão depois de uma partida disputada (sobe, teto 100). */
export function cohesionAfterMatch(current: number): number {
  return clamp0to100(current + COHESION_MATCH_GAIN);
}

/** Coesão depois de uma transferência que mexe no elenco (cai, piso 0). */
export function cohesionAfterTransfer(current: number): number {
  return clamp0to100(current - COHESION_TRANSFER_HIT);
}

/** Coesão depois de um treino da formação (sobe devagar, teto 100). */
export function cohesionAfterFormationTraining(current: number): number {
  return clamp0to100(current + COHESION_FORMATION_TRAINING_GAIN);
}

/**
 * O modificador ± que a coesão dá à força do time na partida (R-15): 50 é
 * neutro (0), 100 → +6, 0 → −6. Inteiro.
 */
export function cohesionModifier(cohesion: number): number {
  const c = clamp0to100(cohesion);
  return Math.round(((c - COHESION_START) / COHESION_START) * COHESION_MOD_MAX);
}
