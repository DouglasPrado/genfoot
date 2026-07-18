import type { SquadPlayer } from "./squad-data";

/**
 * Regra de substituição do elenco — RANGE de posições adaptáveis.
 *
 * Em vez de exigir a MESMA posição, um jogador pode entrar na posição do titular
 * se ela for a sua (natural) ou uma VIZINHA no grafo de adjacência de posições
 * (adaptável). O grafo segue a lógica pedida: goleiro↔zaga, zaga↔lateral/volante,
 * volante↔meia, e assim por diante ao longo do campo.
 *
 * ⚠️ A adaptação NÃO aplica penalidade de scores/moral/entrosamento por ora: não
 * há regra de domínio ratificada de "fora de posição" (o game design cita
 * "adaptação de posição" como efeito de staff, sem fórmula). Ver a trava no
 * artefato de cobertura. Aqui a adaptação só LIBERA a troca e marca o card.
 */

/** Rótulos de posição do elenco (RosterView → club-projection). */
const ADJACENCY: Readonly<Record<string, readonly string[]>> = {
  GOL: ["ZAG"],
  ZAG: ["GOL", "LE", "LD", "VOL"],
  LE: ["ZAG", "LD", "VOL", "PTE"],
  LD: ["ZAG", "LE", "VOL", "PTD"],
  VOL: ["ZAG", "LE", "LD", "MC", "MEI"],
  MC: ["VOL", "MEI"],
  MEI: ["VOL", "MC", "PTE", "PTD", "ATA"],
  PTE: ["LE", "MEI", "PTD", "ATA"],
  PTD: ["LD", "MEI", "PTE", "ATA"],
  ATA: ["MEI", "PTE", "PTD"],
};

export type PositionFit = "natural" | "adaptable" | "none";

/**
 * Encaixe do reserva na posição `from` (a do titular que sai):
 * - `natural` — mesma posição;
 * - `adaptable` — posição vizinha no grafo (pode se adaptar);
 * - `none` — longe demais, não entra.
 */
export function positionFit(from: string, to: string): PositionFit {
  if (from === to) return "natural";
  return ADJACENCY[from]?.includes(to) ? "adaptable" : "none";
}

const FIT_RANK: Record<PositionFit, number> = {
  natural: 0,
  adaptable: 1,
  none: 2,
};

/** Ordem de exibição: natural < adaptável < bloqueado. */
export function fitRank(fit: PositionFit): number {
  return FIT_RANK[fit];
}

/** A troca `outgoing` ↔ `incoming` é válida? (natural ou adaptável.) */
export function canSubstitute(
  outgoing: SquadPlayer | undefined,
  incoming: SquadPlayer | undefined,
): boolean {
  if (outgoing === undefined || incoming === undefined) return false;
  return positionFit(outgoing.position, incoming.position) !== "none";
}

export type StatTrend = "up" | "steady" | "down";

/** Um atributo do reserva confrontado com o do titular que sai. */
export interface StatComparison {
  readonly value: number;
  /** reserva − titular. `0` quando não há titular de referência. */
  readonly delta: number;
  readonly trend: StatTrend;
}

/**
 * Compara um atributo (OVR, fitness…) do reserva com o do titular que sai — a
 * informação que decide a substituição. Sem titular de referência, devolve só o
 * valor, sem delta.
 */
export function compareStat(
  reserveValue: number,
  outgoingValue: number | undefined,
): StatComparison {
  if (outgoingValue === undefined) {
    return { value: reserveValue, delta: 0, trend: "steady" };
  }
  const delta = reserveValue - outgoingValue;
  return {
    value: reserveValue,
    delta,
    trend: delta > 0 ? "up" : delta < 0 ? "down" : "steady",
  };
}
