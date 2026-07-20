/**
 * A FORMA — a camada transiente da habilidade viva (R-221 Fase 2b).
 *
 * `habilidadeEfetiva = núcleo + forma`. O núcleo sobe por treino (permanente,
 * Fase 2a); a FORMA move ± por PARTIDA (e, na 2c, por decisão) e **decai** de
 * volta ao neutro (0) com o tempo. Jogo bom dá um pico; jogo ruim, um vale; um
 * mau momento não destrói o jogador — a forma sara sozinha.
 *
 * Puro e determinístico. Números são calibração minha (VAL-001), não constante
 * de doc.
 */

/** Teto ± da forma: um pico/vale de forma não passa disto. */
export const FORM_MAX = 10;
/** Quanto a forma volta ao neutro por dia lógico (decaimento). */
export const FORM_DECAY_PER_DAY = 1;

/** Efeito-base do resultado da partida na forma de quem jogou. */
const OUTCOME_FORM: Record<"WIN" | "DRAW" | "LOSS", number> = {
  WIN: 2,
  DRAW: 0,
  LOSS: -2,
};
/** Bônus de forma por gol marcado pelo jogador — o artilheiro embala. */
const GOAL_FORM_BONUS = 2;

export type MatchOutcome = "WIN" | "DRAW" | "LOSS";

/**
 * O delta de forma que uma partida gera para um jogador que atuou: o efeito do
 * resultado mais o embalo por gols. Pode ser ± (derrota puxa pra baixo).
 */
export function matchFormDelta(input: {
  readonly outcome: MatchOutcome;
  readonly goalsScored: number;
}): number {
  const goals = Math.max(0, Math.floor(input.goalsScored));
  return OUTCOME_FORM[input.outcome] + goals * GOAL_FORM_BONUS;
}

/** Aplica um delta à forma corrente, tetado em ±`FORM_MAX`. */
export function clampForm(forma: number): number {
  return Math.max(-FORM_MAX, Math.min(FORM_MAX, forma));
}

/** A forma depois de `days` dias de decaimento em direção ao neutro (0). */
export function decayedForm(forma: number, days: number): number {
  if (days <= 0) return forma;
  const step = FORM_DECAY_PER_DAY * days;
  if (forma > 0) return Math.max(0, forma - step);
  if (forma < 0) return Math.min(0, forma + step);
  return 0;
}
