/**
 * Quanto falta para uma sessão de treino render TUDO (chegar à duração), em
 * tempo REAL, usando o relógio do mundo (`realSecondsPerDay` + `nextTickAt`).
 *
 * Puro: recebe `nowIso` de fora (o componente passa o relógio de parede e
 * re-renderiza a cada segundo para a contagem regressiva). Sem `Date.now()`
 * aqui — a lógica é testável, e o tique é um efeito da view.
 */
export interface SessionCountdownInput {
  /** Segundos reais por dia lógico; `null` = relógio parado. */
  readonly realSecondsPerDay: number | null;
  /** Quando o próximo dia lógico roda (ISO); `null` = parado. */
  readonly nextTickAt: string | null;
  readonly elapsedDays: number;
  readonly durationDays: number;
  readonly nowIso: string;
}

export interface SessionCountdown {
  /** Segundos reais até a sessão completar; `null` se o relógio está parado. */
  readonly secondsRemaining: number | null;
  /** Dias lógicos restantes até a duração (nunca negativo). */
  readonly daysRemaining: number;
  readonly complete: boolean;
}

export function sessionCountdown(
  input: SessionCountdownInput,
): SessionCountdown {
  const daysRemaining = Math.max(0, input.durationDays - input.elapsedDays);
  if (daysRemaining <= 0) {
    return { secondsRemaining: 0, daysRemaining: 0, complete: true };
  }
  // Sem relógio andando não há contagem em tempo real — só os dias restantes.
  if (input.realSecondsPerDay === null || input.nextTickAt === null) {
    return { secondsRemaining: null, daysRemaining, complete: false };
  }
  const now = Date.parse(input.nowIso);
  const next = Date.parse(input.nextTickAt);
  if (Number.isNaN(now) || Number.isNaN(next)) {
    return { secondsRemaining: null, daysRemaining, complete: false };
  }
  // Tempo até o próximo tick (nunca negativo — tick vencido conta como 0).
  const untilNextTickSec = Math.max(0, Math.round((next - now) / 1000));
  // Depois do próximo tick, faltam (daysRemaining - 1) dias inteiros.
  const secondsRemaining =
    untilNextTickSec + (daysRemaining - 1) * input.realSecondsPerDay;
  return { secondsRemaining, daysRemaining, complete: false };
}

/**
 * O quanto da sessão JÁ passou, 0..100 — para a barra de progresso que avança em
 * tempo real conforme a contagem regressiva desce.
 *
 * Com o relógio andando, usa o tempo REAL (total = duração × segundos-por-dia,
 * feito = total − restante), então a barra se move a cada segundo. Com o relógio
 * parado, cai na fração de DIAS lógicos decorridos — grosseira, mas honesta.
 */
export function countdownProgressPercent(input: {
  readonly secondsRemaining: number | null;
  readonly elapsedDays: number;
  readonly durationDays: number;
  readonly realSecondsPerDay: number | null;
}): number {
  if (input.durationDays <= 0) return 100;
  if (input.secondsRemaining !== null && input.realSecondsPerDay !== null) {
    const total = input.durationDays * input.realSecondsPerDay;
    if (total <= 0) return 100;
    const done = total - input.secondsRemaining;
    return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  }
  const frac = input.elapsedDays / input.durationDays;
  return Math.max(0, Math.min(100, Math.round(frac * 100)));
}

/** Formata segundos em "Xh YYm" (≥1h) ou "Ym ZZs" (<1h). `null` → travessão. */
export function formatCountdown(seconds: number | null): string {
  if (seconds === null) return "—";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h >= 1) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}
