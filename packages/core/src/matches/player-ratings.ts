/**
 * A nota do jogador na partida (doc 05 §16: "notas dos jogadores por ação").
 *
 * Derivada do que o jogador FEZ no jogo que o motor de fato registrou — gol,
 * assistência, finalização no alvo, defesa, gol sofrido, cartão — mais o
 * resultado do time. Não há sorteio aqui: a nota é contabilidade, e duas
 * partidas idênticas dão notas idênticas.
 *
 * Calibração de 1ª passada (Série R), como o resto do motor.
 */

/** A nota de quem passou pelo jogo sem marcar nem falhar. */
export const RATING_BASE = 6;

const RATING_MIN = 1;
const RATING_MAX = 10;

export type TeamResult = "win" | "draw" | "loss";

export interface RatingInput {
  readonly playerId: string;
  readonly primaryPosition: string;
  readonly goals: number;
  readonly assists: number;
  readonly shots: number;
  readonly shotsOnTarget: number;
  /** Só faz sentido para goleiro; 0 para o resto. */
  readonly saves: number;
  readonly goalsConceded: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly teamResult: TeamResult;
}

export interface PlayerRating {
  readonly playerId: string;
  /** 1..10, com uma casa decimal. */
  readonly rating: number;
}

const GOAL_BONUS = 1.2;
const ASSIST_BONUS = 0.7;
const ON_TARGET_BONUS = 0.15;
const SAVE_BONUS = 0.25;
const CONCEDED_PENALTY = 0.45;
const YELLOW_PENALTY = 0.4;
const RED_PENALTY = 1.8;
const RESULT_BONUS: Readonly<Record<TeamResult, number>> = {
  win: 0.3,
  draw: 0,
  loss: -0.3,
};

/**
 * As notas do jogo, da melhor para a pior — o primeiro da lista é o melhor em
 * campo e o último é o pior, que é como o doc pede para exibir.
 */
export function ratePlayers(
  inputs: readonly RatingInput[],
): readonly PlayerRating[] {
  return inputs
    .map((input) => ({ playerId: input.playerId, rating: rate(input) }))
    .sort((a, b) => b.rating - a.rating || a.playerId.localeCompare(b.playerId));
}

function rate(input: RatingInput): number {
  let rating = RATING_BASE;
  rating += input.goals * GOAL_BONUS;
  rating += input.assists * ASSIST_BONUS;
  // Só o chute no alvo conta: finalizar para fora não é contribuição.
  rating += input.shotsOnTarget * ON_TARGET_BONUS;
  rating += RESULT_BONUS[input.teamResult];

  if (input.primaryPosition === "GK") {
    rating += input.saves * SAVE_BONUS;
    rating -= input.goalsConceded * CONCEDED_PENALTY;
  }

  rating -= input.yellowCards * YELLOW_PENALTY;
  rating -= input.redCards * RED_PENALTY;

  const clamped = Math.max(RATING_MIN, Math.min(RATING_MAX, rating));
  // Uma casa decimal: nota de jogo se lê "7,4", não "7,3999999".
  return Math.round(clamped * 10) / 10;
}
