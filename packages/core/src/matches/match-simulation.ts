import {
  attributeGoals,
  timeGoals,
  type Scorer,
  type ScorerCandidate,
} from "./goal-attribution.js";
import { simulateMatch } from "./match-kernel.js";
import { stableHash } from "./match-kernel.js";

/** Um gol como evento de partida (C5-V1): quem, quando, de que lado. */
export interface GoalEvent {
  readonly playerId: string;
  readonly minute: number;
  readonly side: "home" | "away";
}

/**
 * Quantas chances uma partida resolve — C5.
 *
 * **Calibração de primeira passada, não canon.** O motor (doc 05) diz que "o
 * placar emerge dos eventos", e o número de chances por jogo é balanceamento
 * (Série R). No kernel, cada chance é um chute que converte a ~25%, então
 * `chances × 0,25 ≈ gols/partida`. A validação usa 30 (dá ~7,5 gols/jogo, placar
 * de basquete); 12 dá ~3 gols, que é futebol. Ajustar aqui, num lugar só —
 * quando a curva de conversão do motor evoluir, este número acompanha.
 */
export const MATCH_CHANCES = 12;

/** O engine build — muda quando a fórmula do motor muda, invalidando replays. */
export const MATCH_ENGINE_BUILD = "c5-v1";

export interface ScheduledMatchInput {
  readonly matchId: string;
  readonly homeClubId: string;
  readonly awayClubId: string;
  /** Força do elenco (overall médio). O placar emerge disto, não é definido por isto. */
  readonly homeStrength: number;
  readonly awayStrength: number;
  /** Candidatos a goleador (C7-V5). Vazio = não atribui gols (mundo legado). */
  readonly homeScorers?: readonly ScorerCandidate[];
  readonly awayScorers?: readonly ScorerCandidate[];
}

export interface SimulatedMatchResult {
  readonly matchId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly homeShots: number;
  readonly awayShots: number;
  readonly homePossession: number;
  readonly resultHash: string;
  /** Quem marcou de cada lado (C7-V5). */
  readonly homeScorers: readonly Scorer[];
  readonly awayScorers: readonly Scorer[];
  /** O feed de gols com minuto, ordenado (C5-V1). */
  readonly goalEvents: readonly GoalEvent[];
  /** O manifesto de replay (C5-V2): o que reproduz a partida bit a bit. */
  readonly manifest: SimulationReplayManifest;
}

/** O manifesto persistível de replay (C5-V2, doc 15 §3.1). */
export interface SimulationReplayManifest {
  readonly engineBuild: string;
  readonly chances: number;
  readonly randomSeed: string;
  readonly homeStrength: number;
  readonly awayStrength: number;
  readonly inputHash: string;
  readonly resultHash: string;
  readonly statsHash: string;
}

/**
 * Simula uma partida agendada — determinístico (R-182): o mesmo mundo, a mesma
 * partida, o mesmo resultado, sempre. O kernel é quem sorteia; aqui só montamos
 * o manifesto a partir das forças e do seed.
 *
 * `seed` é o do mundo; o kernel já namespaceia por `matchId`, então dois jogos
 * do mesmo mundo não compartilham sorteios.
 */
export function simulateScheduledMatch(
  worldSeed: string,
  match: ScheduledMatchInput,
): SimulatedMatchResult {
  const inputHash = stableHash(
    `${match.homeClubId}:${match.homeStrength}|${match.awayClubId}:${match.awayStrength}`,
  );
  const output = simulateMatch(match.matchId, {
    seed: worldSeed,
    engineBuild: MATCH_ENGINE_BUILD,
    timestepChances: MATCH_CHANCES,
    homeStrength: match.homeStrength,
    awayStrength: match.awayStrength,
    inputHash,
  });
  const homeScorers = attributeGoals(
    worldSeed,
    match.matchId,
    "home",
    match.homeScorers ?? [],
    output.homeGoals,
  );
  const awayScorers = attributeGoals(
    worldSeed,
    match.matchId,
    "away",
    match.awayScorers ?? [],
    output.awayGoals,
  );
  // Os gols viram feed: cada um ganha um minuto, e os dois lados se intercalam
  // na ordem do relógio (o eventSequence sai daqui).
  const goalEvents: GoalEvent[] = [
    ...timeGoals(worldSeed, match.matchId, "home", homeScorers).map((g) => ({
      ...g,
      side: "home" as const,
    })),
    ...timeGoals(worldSeed, match.matchId, "away", awayScorers).map((g) => ({
      ...g,
      side: "away" as const,
    })),
  ].sort((a, b) => a.minute - b.minute);

  return {
    matchId: match.matchId,
    homeGoals: output.homeGoals,
    awayGoals: output.awayGoals,
    homeShots: output.homeShots,
    awayShots: output.awayShots,
    homePossession: output.homePossession,
    resultHash: output.resultHash,
    homeScorers,
    awayScorers,
    goalEvents,
    manifest: {
      engineBuild: MATCH_ENGINE_BUILD,
      chances: MATCH_CHANCES,
      randomSeed: worldSeed,
      homeStrength: match.homeStrength,
      awayStrength: match.awayStrength,
      inputHash,
      resultHash: output.resultHash,
      statsHash: output.statsHash,
    },
  };
}
