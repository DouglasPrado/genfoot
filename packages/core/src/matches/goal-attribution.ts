import { SeededRandom } from "../foundation/seeded-random.js";

/**
 * Atribuição de gols a jogadores (C7-V5), pura e determinística: dado o placar
 * que o kernel produziu, decide QUEM marcou. Sem `Math.random()` — o sorteio é
 * um `SeededRandom` namespaceado por partida+lado, então o mesmo jogo dá sempre
 * os mesmos artilheiros (replay, R-182).
 *
 * O peso de cada jogador é `habilidade × fator da posição`: atacante marca muito
 * mais que zagueiro, goleiro quase nunca. É calibração de 1ª passada (Série R).
 */
export interface ScorerCandidate {
  readonly playerId: string;
  readonly primaryPosition: string;
  readonly ability: number;
}

export interface Scorer {
  readonly playerId: string;
  readonly goals: number;
}

/** Quanto cada posição puxa para o gol. Calibração de 1ª passada. */
const POSITION_FACTOR: Readonly<Record<string, number>> = {
  ST: 1.0,
  CF: 1.0,
  LW: 0.85,
  RW: 0.85,
  CAM: 0.6,
  LM: 0.5,
  RM: 0.5,
  CM: 0.4,
  CDM: 0.2,
  LWB: 0.14,
  RWB: 0.14,
  CB: 0.12,
  LB: 0.12,
  RB: 0.12,
  GK: 0.02,
};

function scoringWeight(candidate: ScorerCandidate): number {
  const factor = POSITION_FACTOR[candidate.primaryPosition] ?? 0.3;
  // Piso 1 para todo candidato: até o zagueiro pode marcar (bola parada).
  return Math.max(1, candidate.ability * factor);
}

/**
 * Distribui `goals` gols entre os candidatos, por peso. Cada gol é um sorteio
 * ponderado independente (um jogador pode marcar mais de um). Retorna só quem
 * marcou, agregado.
 */
export function attributeGoals(
  worldSeed: string,
  matchId: string,
  side: "home" | "away",
  candidates: readonly ScorerCandidate[],
  goals: number,
): Scorer[] {
  if (goals <= 0 || candidates.length === 0) return [];
  const random = new SeededRandom({
    worldSeed,
    context: `scorers:${matchId}:${side}`,
  });
  const weights = candidates.map(scoringWeight);
  const total = weights.reduce((sum, w) => sum + w, 0);

  const tally = new Map<string, number>();
  for (let g = 0; g < goals; g += 1) {
    let pick = random.nextFloat() * total;
    let chosen = candidates[candidates.length - 1]!.playerId;
    for (let i = 0; i < candidates.length; i += 1) {
      pick -= weights[i]!;
      if (pick <= 0) {
        chosen = candidates[i]!.playerId;
        break;
      }
    }
    tally.set(chosen, (tally.get(chosen) ?? 0) + 1);
  }
  return [...tally].map(([playerId, count]) => ({ playerId, goals: count }));
}
