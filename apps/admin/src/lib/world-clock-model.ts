/**
 * MUNDO-V4 — o painel do relógio do mundo, lógica pura.
 *
 * O domínio mede o tempo do mundo em SEGUNDOS reais por dia lógico
 * (`realSecondsPerDay`, 1..31_536_000 — de 1 segundo a 1 ano real por dia). Mas
 * o operador pensa em "cada dia roda a cada 4 horas", não em 14 400 segundos.
 * Este módulo é a tradução entre as duas linguagens, e a validação dos limites —
 * fora do componente, coberta por teste (CLAUDE.md §3). Sem `Date.now()`: o
 * "agora" para calcular o tempo até o próximo tick chega por parâmetro.
 */

// Espelham `packages/core/src/world/world-clock.ts` — a fonte da verdade dos
// limites é o domínio; aqui só validamos cedo para não mandar um valor que o
// servidor recusaria.
export const MIN_SECONDS_PER_DAY = 1;
export const MAX_SECONDS_PER_DAY = 31_536_000; // 1 ano real por dia lógico

export type ClockUnit = "seconds" | "minutes" | "hours";

const UNIT_SECONDS: Record<ClockUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3_600,
};

export const UNIT_LABEL: Record<ClockUnit, string> = {
  seconds: "segundos",
  minutes: "minutos",
  hours: "horas",
};

/** Config do relógio como a query `world-clock` a serve. */
export interface ClockView {
  readonly realSecondsPerDay: number | null;
  readonly clockRunning: boolean;
  readonly nextTickAt: string | null;
  readonly version: number;
}

/** Converte um valor numa unidade para segundos inteiros. Arredonda. */
export function toSeconds(value: number, unit: ClockUnit): number {
  return Math.round(value * UNIT_SECONDS[unit]);
}

/**
 * Escolhe a MAIOR unidade que representa `seconds` sem fração — 14 400 vira
 * "4 horas", 90 vira "90 segundos" (não "1.5 minutos", que confunde). É o que
 * preenche o formulário quando a tela abre com uma config já gravada.
 */
export function fromSeconds(seconds: number): {
  readonly value: number;
  readonly unit: ClockUnit;
} {
  if (seconds % UNIT_SECONDS.hours === 0) {
    return { value: seconds / UNIT_SECONDS.hours, unit: "hours" };
  }
  if (seconds % UNIT_SECONDS.minutes === 0) {
    return { value: seconds / UNIT_SECONDS.minutes, unit: "minutes" };
  }
  return { value: seconds, unit: "seconds" };
}

/**
 * Valida o valor bruto do formulário. Devolve a mensagem do que está errado, ou
 * `null` se serve. Rejeita o que o domínio rejeitaria — inteiro dentro dos
 * limites — mas em português, na tela, antes do round-trip.
 */
export function validateSecondsPerDay(seconds: number): string | null {
  if (!Number.isFinite(seconds) || !Number.isInteger(seconds)) {
    return "Informe um número inteiro de segundos.";
  }
  if (seconds < MIN_SECONDS_PER_DAY) {
    return `Rápido demais: o mínimo é ${MIN_SECONDS_PER_DAY}s por dia lógico.`;
  }
  if (seconds > MAX_SECONDS_PER_DAY) {
    return "Lento demais: o máximo é 1 ano real (31.536.000s) por dia lógico.";
  }
  return null;
}

/**
 * Frase que descreve a cadência para o operador conferir antes de gravar:
 * "Cada dia lógico avança a cada 4 horas." Escolhe a unidade legível.
 */
export function describeCadence(seconds: number): string {
  const { value, unit } = fromSeconds(seconds);
  const label = value === 1 ? UNIT_LABEL[unit].replace(/s$/, "") : UNIT_LABEL[unit];
  const pretty = Number.isInteger(value)
    ? value.toLocaleString("pt-BR")
    : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return `Cada dia lógico avança a cada ${pretty} ${label}.`;
}

/**
 * Quanto falta até o próximo tick, em texto humano — a partir do `nextTickAt`
 * (ISO) e do `nowIso` que a tela passa. `null` quando não há tick agendado
 * (relógio parado). "vencido" quando já passou: o scheduler o pega na próxima
 * passada.
 */
export function timeUntilTick(
  nextTickAtIso: string | null,
  nowIso: string,
): string | null {
  if (nextTickAtIso === null) return null;
  const deltaMs = Date.parse(nextTickAtIso) - Date.parse(nowIso);
  if (Number.isNaN(deltaMs)) return null;
  if (deltaMs <= 0) return "vencido — avança na próxima passada";
  const totalSeconds = Math.round(deltaMs / 1_000);
  const h = Math.floor(totalSeconds / 3_600);
  const m = Math.floor((totalSeconds % 3_600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}min`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return `em ${parts.join(" ")}`;
}
