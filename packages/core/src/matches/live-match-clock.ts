/**
 * O relógio da partida ao vivo — quanto tempo REAL um jogo leva.
 *
 * A regra, decidida pelo dono: a partida ocupa no dia REAL a mesma fatia que
 * ocupa no dia LÓGICO. Um jogo dura 90 dos 1440 minutos de um dia, ou seja 1/16
 * dele; com o dia lógico valendo 4 horas reais, a partida leva 15 minutos
 * reais.
 *
 * A consequência que faz esta regra valer a pena: **não há constante de ritmo
 * em lugar nenhum**. Acelerar o mundo acelera as partidas na mesma proporção,
 * automaticamente, e um mundo lento não deixa o jogador esperando um jogo que
 * demoraria mais que o próprio dia.
 *
 * Puro: recebe o tempo decorrido, nunca o lê do relógio de parede.
 */

/** Minutos de um jogo regulamentar. */
export const REGULATION_MINUTES = 90;

/** Minutos de prorrogação, quando a competição a prevê. */
export const EXTRA_TIME_MINUTES = 30;

const MINUTES_IN_DAY = 24 * 60;

function playedMinutes(withExtraTime: boolean): number {
  return REGULATION_MINUTES + (withExtraTime ? EXTRA_TIME_MINUTES : 0);
}

/**
 * Quanto tempo real a partida leva, dado quanto tempo real vale um dia lógico.
 *
 * Dia não-positivo devolve 0 em vez de estourar: um mundo com relógio parado
 * (ou config inválida) tem partida de duração zero, que o chamador trata como
 * "resolve de uma vez" — dividir por zero mataria o tick do mundo.
 */
export function matchDurationMs(
  dayDurationMs: number,
  withExtraTime: boolean,
): number {
  if (dayDurationMs <= 0) return 0;
  return (dayDurationMs * playedMinutes(withExtraTime)) / MINUTES_IN_DAY;
}

/**
 * Em que minuto DE JOGO a partida está, passado `elapsedMs` desde o apito.
 *
 * É o número que a tela mostra ("68'"). Nunca passa do fim: o jogo não corre
 * para sempre porque o jogador demorou a abrir o app.
 */
export function matchMinuteAt(
  elapsedMs: number,
  dayDurationMs: number,
  withExtraTime: boolean,
): number {
  const total = matchDurationMs(dayDurationMs, withExtraTime);
  const minutes = playedMinutes(withExtraTime);
  if (total <= 0) return minutes;
  const progress = Math.min(1, Math.max(0, elapsedMs / total));
  return Math.round(progress * minutes);
}

/**
 * Até que lance (tick do kernel) a partida deveria ter chegado.
 *
 * O tick é INTEIRO: meio lance não existe, e arredondar para baixo é o que
 * garante que um lance só entra quando o tempo dele passou de fato.
 */
export function tickAt(
  elapsedMs: number,
  dayDurationMs: number,
  totalTicks: number,
  withExtraTime: boolean,
): number {
  const total = matchDurationMs(dayDurationMs, withExtraTime);
  if (total <= 0) return totalTicks;
  const progress = Math.min(1, Math.max(0, elapsedMs / total));
  return Math.min(totalTicks, Math.floor(progress * totalTicks));
}
