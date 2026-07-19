import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";

import { SEASON_DAYS } from "./game-world.js";

/**
 * Ciclo de vida de temporada como entidade do MUNDO (R-219).
 *
 * Puro e determinístico. O domínio (`game-world.ts`) já sabe QUANDO a temporada
 * vira (emite `SeasonRolledOver` com o número que acabou). Isto aqui responde as
 * outras três perguntas que a virada precisa, sem tocar o relógio:
 *
 * - `seasonNumberOn` — em que temporada cai uma data (espelha a fórmula do
 *   domínio, `floor(diasDesdeInício / SEASON_DAYS) + 1`);
 * - `seasonWindow` — a janela `[startsAt, endsAt]` de uma temporada;
 * - `seasonIdFor` — o id ESTÁVEL de uma temporada a partir de `(mundo, número)`.
 *
 * Por que o id é derivado e não sorteado: a virada automática só conhece o
 * NÚMERO da temporada que fechou (é o que `SeasonRolledOver` carrega). Para
 * aplicar treino/envelhecimento — que são chaveados por `seasonId` (UUID) — ela
 * precisa reencontrar o mesmo id que a materialização criou, sem ir ao banco.
 * Derivar de `(worldSeed, worldId, número)` garante que o caminho manual e o
 * automático concordem no mesmo id (R-182).
 */

const DAY_MS = 86_400_000;

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00.000Z`);
  const to = Date.parse(`${toIso}T00:00:00.000Z`);
  return Math.floor((to - from) / DAY_MS);
}

function addDaysIso(iso: string, days: number): string {
  const ms = Date.parse(`${iso}T00:00:00.000Z`) + days * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * O número (1-based) da temporada em que uma data cai. Idêntico ao
 * `seasonNumberOn` privado de `GameWorld` — a fronteira é a mesma para que a
 * virada aplicada bata com a virada emitida.
 */
export function seasonNumberOn(
  startDate: string,
  date: string,
  seasonDays: number = SEASON_DAYS,
): number {
  return Math.floor(daysBetween(startDate, date) / seasonDays) + 1;
}

export interface SeasonDateRange {
  readonly startsAt: string;
  readonly endsAt: string;
}

/**
 * A janela de uma temporada. `endsAt` é o ÚLTIMO dia inclusive: o dia seguinte
 * já pertence à próxima. Assim `seasonNumberOn(endsAt) === number` e
 * `endsAt + 1 dia` cai na temporada seguinte — a mesma fronteira do relógio.
 */
export function seasonWindow(
  startDate: string,
  number: number,
  seasonDays: number = SEASON_DAYS,
): SeasonDateRange {
  const startsAt = addDaysIso(startDate, (number - 1) * seasonDays);
  const endsAt = addDaysIso(startDate, number * seasonDays - 1);
  return { startsAt, endsAt };
}

/**
 * Id determinístico de uma temporada. O timestamp do UUIDv7 é o próprio número
 * (pequeno, ≥0, cabe em 48 bits) — só serve à ordenação; a identidade real vem
 * do `context` `(worldId:season:número)` mais a seed.
 */
export function seasonIdFor(
  worldSeed: string,
  gameWorldId: string,
  number: number,
): string {
  return deterministicUuidV7({
    worldSeed,
    context: `${gameWorldId}:season:${number}`,
    timestampMilliseconds: number,
  });
}
