import type { SquadPlayer } from "./squad-data";

/**
 * Regra de substituição do elenco — POR ENQUANTO restrita à posição de origem.
 *
 * A troca só é permitida entre jogadores da MESMA posição de origem (`position`,
 * o rótulo fino: ZAG, LE, PTE…), não do mesmo grupo grosso (DEF/MEI/ATA). Um
 * zagueiro só entra por outro zagueiro; um lateral esquerdo não cobre um
 * zagueiro. É uma trava temporária pedida pelo usuário até existir uma regra de
 * versatilidade/posições secundárias.
 */

/** Reservas que podem entrar no lugar de `outgoing`. Ordem original preservada. */
export function eligibleSubstitutes(
  outgoing: SquadPlayer | undefined,
  bench: readonly SquadPlayer[],
): readonly SquadPlayer[] {
  if (outgoing === undefined) return [];
  return bench.filter((p) => p.position === outgoing.position);
}

/** A troca `outgoing` ↔ `incoming` é válida? (defesa em profundidade da UI.) */
export function canSubstitute(
  outgoing: SquadPlayer | undefined,
  incoming: SquadPlayer | undefined,
): boolean {
  if (outgoing === undefined || incoming === undefined) return false;
  return incoming.position === outgoing.position;
}
