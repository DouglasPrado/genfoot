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

/**
 * Rótulos de posição do elenco (RosterView → club-projection) E os papéis que
 * só existem como SLOT do campo tático: `ME`/`MD` (meias abertos do 4-4-2 e do
 * 4-2-3-1) e `ALA` (o ala do 3-5-2). Nenhum jogador tem essas três como posição
 * natural, mas o campo as desenha — e slot que o grafo não conhece não casa com
 * ninguém, então o modal de substituição abria VAZIO e a troca morria calada.
 *
 * O grafo é SIMÉTRICO por invariante (há teste): toda aresta vale nos dois
 * sentidos.
 */
const ADJACENCY: Readonly<Record<string, readonly string[]>> = {
  GOL: ["ZAG"],
  ZAG: ["GOL", "LE", "LD", "VOL"],
  LE: ["ZAG", "LD", "VOL", "PTE", "ME", "ALA"],
  LD: ["ZAG", "LE", "VOL", "PTD", "MD", "ALA"],
  VOL: ["ZAG", "LE", "LD", "MC", "MEI", "ALA"],
  MC: ["VOL", "MEI", "ME", "MD"],
  MEI: ["VOL", "MC", "PTE", "PTD", "ATA", "ME", "MD"],
  PTE: ["LE", "MEI", "PTD", "ATA", "ME", "ALA"],
  PTD: ["LD", "MEI", "PTE", "ATA", "MD", "ALA"],
  ATA: ["MEI", "PTE", "PTD"],
  // Papéis de slot: quem cobre a faixa lateral do meio e o corredor inteiro.
  ME: ["LE", "MC", "MEI", "PTE", "ALA"],
  MD: ["LD", "MC", "MEI", "PTD", "ALA"],
  ALA: ["LE", "LD", "VOL", "PTE", "PTD", "ME", "MD"],
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

/**
 * Quem pode entrar num SLOT da formação — a pergunta certa do campo tático.
 *
 * O que o slot pede é o papel desenhado no campo (`Slot.role`: "LE", "VOL"…),
 * não a posição natural de quem está ocupando ele. A tela perguntava pela
 * segunda: com um zagueiro escalado na lateral-esquerda, o campo mostrava "LE"
 * mas o modal de substituição oferecia o leque do ZAG. O jogador via uma
 * formação e recebia outra na hora de trocar.
 *
 * `undefined` de slot = nada a decidir, ninguém entra.
 */
export function canSubstituteIntoSlot(
  slotRole: string | undefined,
  incoming: SquadPlayer | undefined,
): boolean {
  if (slotRole === undefined || incoming === undefined) return false;
  return positionFit(slotRole, incoming.position) !== "none";
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
