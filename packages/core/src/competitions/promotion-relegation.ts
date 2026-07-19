/**
 * O acesso e o rebaixamento ENTRE divisões de um mesmo campeonato (R-204), na
 * virada de temporada. É a parte estrutural do desfecho: `season-outcome.ts`
 * diz QUEM sobe e desce numa divisão; aqui os clubes efetivamente TROCAM de
 * divisão para a próxima temporada.
 *
 * A regra é a do dono: "N sobem, N descem; o primeiro da de cima não sobe (topo,
 * `promotionSlots = 0`), o último da de baixo não desce (fundo,
 * `relegationSlots = 0`)". Puro e determinístico: entra a classificação final de
 * cada divisão, sai o elenco de cada divisão na temporada seguinte.
 */

export interface DivisionResult {
  /** 1 = divisão de cima; quanto maior, mais embaixo na pirâmide. */
  readonly tier: number;
  /** Classificação final: 1º primeiro. */
  readonly orderedClubIds: readonly string[];
  /** Quantos sobem para a divisão de cima (0 = topo). */
  readonly promotionSlots: number;
  /** Quantos descem para a divisão de baixo (0 = fundo). */
  readonly relegationSlots: number;
}

export interface DivisionRoster {
  readonly tier: number;
  readonly clubIds: readonly string[];
}

/**
 * Recompõe cada divisão para a próxima temporada. A divisão K fica com quem
 * permaneceu, recebe os REBAIXADOS da divisão de cima (K−1) e os PROMOVIDOS da
 * de baixo (K+1). Com as vagas casadas (`relegationSlots[K−1] = promotionSlots[K]`
 * e 0 nas pontas), o tamanho da divisão se conserva.
 *
 * Não valida o casamento das vagas: uma config torta muda o tamanho da divisão,
 * e isso é erro de autoria, não deste cálculo — que só aplica o que foi
 * decidido antes de começar (imutável, R-52).
 */
export function applyPromotionRelegation(
  divisions: readonly DivisionResult[],
): readonly DivisionRoster[] {
  const sorted = [...divisions].sort((a, b) => a.tier - b.tier);

  const promoted = new Map<number, readonly string[]>(); // sobem para K−1
  const relegated = new Map<number, readonly string[]>(); // descem para K+1
  const stayed = new Map<number, readonly string[]>();

  for (const d of sorted) {
    const up = Math.max(0, Math.floor(d.promotionSlots));
    const down = Math.max(0, Math.floor(d.relegationSlots));
    const n = d.orderedClubIds.length;
    const relegationFrom = Math.max(up, n - down); // não invade a zona de acesso
    promoted.set(d.tier, d.orderedClubIds.slice(0, Math.min(up, n)));
    relegated.set(d.tier, d.orderedClubIds.slice(relegationFrom));
    stayed.set(d.tier, d.orderedClubIds.slice(Math.min(up, n), relegationFrom));
  }

  return sorted.map((d) => ({
    tier: d.tier,
    clubIds: [
      ...(stayed.get(d.tier) ?? []),
      ...(relegated.get(d.tier - 1) ?? []), // descem da divisão de cima
      ...(promoted.get(d.tier + 1) ?? []), // sobem da divisão de baixo
    ],
  }));
}
