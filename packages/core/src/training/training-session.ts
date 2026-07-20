/**
 * Treino de SESSÃO com progresso instantâneo (R-221, Fase 2a).
 *
 * O núcleo do "atributo vivo pelo treino": uma sessão ocupa o jogador por uma
 * DURAÇÃO em tempo lógico; enquanto treina, ele fica indisponível. O ganho é
 * proporcional aos DIAS efetivamente treinados — tirar no meio rende parcial,
 * nunca tudo nem nada (R-221/§B). Aplica NA HORA (o chamador chama
 * `Player.applyAttributeChange`), não bufferizado até a virada.
 *
 * Puro e determinístico: só datas ISO e aritmética. O `dailyGainMilli` vem da
 * fórmula canônica (`development-gain.ts`); aqui só o escalamos pelo tempo.
 *
 * Números são calibração minha (VAL-001), não constantes de doc.
 */

const DAY_MS = 86_400_000;

/** Uma sessão dura 7 dias lógicos por padrão — janela de treino de uma semana. */
export const SESSION_DURATION_DAYS = 7;

/** Fadiga somada ao tirar do treino e jogar no MESMO dia lógico. */
export const SAME_DAY_FATIGUE_PENALTY = 20;

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00.000Z`);
  const to = Date.parse(`${toIso}T00:00:00.000Z`);
  return Math.floor((to - from) / DAY_MS);
}

/** Dias efetivamente treinados até `currentDate` (nunca negativo). */
export function sessionElapsedDays(
  startDate: string,
  currentDate: string,
): number {
  return Math.max(0, daysBetween(startDate, currentDate));
}

/** A sessão terminou de correr sua duração? */
export function sessionIsComplete(
  elapsedDays: number,
  durationDays: number = SESSION_DURATION_DAYS,
): boolean {
  return elapsedDays >= durationDays;
}

/**
 * O ganho (em milli-unidades) a aplicar quando a sessão é coletada: o ganho
 * diário pelos dias treinados, TETADO na duração. Treinar 3 de 7 dias rende
 * 3/7; deixar passar da duração não rende além dos 7. Zero dia, zero ganho.
 */
export function sessionGainMilli(input: {
  readonly dailyGainMilli: number;
  readonly elapsedDays: number;
  readonly durationDays?: number;
}): number {
  const duration = input.durationDays ?? SESSION_DURATION_DAYS;
  const effectiveDays = Math.max(0, Math.min(input.elapsedDays, duration));
  return Math.max(0, Math.round(input.dailyGainMilli * effectiveDays));
}

/**
 * Fração cumprida da sessão (0..1) — para a barra de progresso da tela e para
 * dizer "parcial".
 */
export function sessionFraction(
  elapsedDays: number,
  durationDays: number = SESSION_DURATION_DAYS,
): number {
  if (durationDays <= 0) return 1;
  return Math.max(0, Math.min(1, elapsedDays / durationDays));
}
