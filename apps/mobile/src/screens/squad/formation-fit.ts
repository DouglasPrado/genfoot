import { PlayerPosition, fillQuality, formationSlots } from "@grinta/core";

/**
 * Encaixe de um jogador numa FORMAÇÃO (para o treino em grupo, R-220.1). Reusa o
 * modelo CANÔNICO do domínio (`@grinta/core` — `formationSlots` + `fillQuality`),
 * que fala o MESMO vocabulário de posição do roster (código EN: CB, LB, ST…) —
 * nada de reinventar um grafo no cliente.
 *
 * - `natural`  — o jogador tem a posição EXATA de algum slot (fillQuality 1);
 * - `adapted`  — o melhor slot é da mesma linha ou vizinha (fillQuality ≥ 0.5),
 *   nunca exato: joga adaptado (a decisão do dono dá BÔNUS a isto no entrosamento);
 * - `poor`     — só encaixa longe (linha distante / gol↔linha);
 * - `unknown`  — formação que o core não cataloga, ou posição inválida: não julga.
 *
 * Nota: como uma formação cobre todas as linhas, um jogador de linha quase sempre
 * é ao menos `adapted` em ALGUM slot — então isto serve mais para MARCAR (ofício
 * vs adaptado) do que para excluir. A exclusão dura, se desejada, é por SLOT, não
 * pela formação inteira.
 */
export type FormationFit = "natural" | "adapted" | "poor" | "unknown";

/** Abaixo disto o encaixe é ruim demais (linha distante). */
export const ADAPTED_MIN_QUALITY = 0.5;

const VALID_POSITIONS = new Set<string>(Object.values(PlayerPosition));

export function formationFit(
  primaryPosition: string,
  formationName: string,
): FormationFit {
  const slots = formationSlots(formationName);
  if (slots === null) return "unknown";
  if (!VALID_POSITIONS.has(primaryPosition)) return "unknown";
  let best = 0;
  for (const slot of slots) {
    const q = fillQuality(primaryPosition as PlayerPosition, slot);
    if (q > best) best = q;
  }
  if (best >= 1) return "natural";
  if (best >= ADAPTED_MIN_QUALITY) return "adapted";
  return "poor";
}

/**
 * Entra no treino da formação? `natural`/`adapted` sim; `poor` não; `unknown` não
 * restringe (não sabemos julgar — o cliente não inventa exclusão).
 */
export function fitsFormation(fit: FormationFit): boolean {
  return fit !== "poor";
}

/** Ordem de exibição: ofício < adaptado < ruim < desconhecido. */
const FIT_RANK: Record<FormationFit, number> = {
  natural: 0,
  adapted: 1,
  poor: 2,
  unknown: 3,
};

export function formationFitRank(fit: FormationFit): number {
  return FIT_RANK[fit];
}
