/**
 * O desfecho de uma temporada de LIGA (C7-V6b): quem foi campeão, quem sobe e
 * quem desce. É uma PROJEÇÃO da classificação final (R-178) — nunca armazenada,
 * sempre reconstruível da tabela + a config da competição.
 *
 * A regra é a do dono do jogo: "N sobem, N descem; o primeiro da divisão de
 * cima não sobe, o último da de baixo não desce". Isso não é um caso especial
 * no código — é o efeito de `promotionSlots = 0` no topo e `relegationSlots = 0`
 * no fundo, decididos no ato de autoria (imutáveis depois, R-52). Uma divisão
 * do meio traz 4 e 4; a única divisão de um mundo (topo E fundo) traz 0 e 0, e
 * então só há campeão.
 */

export type ClubOutcome = "CHAMPION" | "PROMOTED" | "RELEGATED" | "STAYED";

export interface OutcomeRow {
  readonly clubId: string;
  /** Colocação final, 1-based. */
  readonly rank: number;
  readonly outcome: ClubOutcome;
}

/**
 * Rotula cada clube pela colocação final. `orderedClubIds` já vem ordenado pela
 * classificação (1º primeiro) — é a saída de `buildStandings`.
 *
 * Precedência, do topo para o fundo: o 1º é sempre CAMPEÃO (mesmo no topo, onde
 * ninguém sobe — ser campeão da elite é o título). As vagas de acesso vêm em
 * seguida, e as de rebaixamento contam do fim. Numa liga minúscula onde as duas
 * zonas se tocariam, o acesso vence (é checado antes), e ninguém fica com dois
 * rótulos.
 */
export function resolveSeasonOutcome(
  orderedClubIds: readonly string[],
  promotionSlots: number,
  relegationSlots: number,
): readonly OutcomeRow[] {
  const total = orderedClubIds.length;
  const up = Math.max(0, Math.floor(promotionSlots));
  const down = Math.max(0, Math.floor(relegationSlots));
  const relegationFrom = total - down; // ranks estritamente acima disto descem

  return orderedClubIds.map((clubId, index) => {
    const rank = index + 1;
    let outcome: ClubOutcome;
    if (rank === 1) {
      outcome = "CHAMPION";
    } else if (rank <= up) {
      outcome = "PROMOTED";
    } else if (rank > relegationFrom) {
      outcome = "RELEGATED";
    } else {
      outcome = "STAYED";
    }
    return { clubId, rank, outcome };
  });
}
