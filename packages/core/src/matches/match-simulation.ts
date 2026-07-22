import {
  attributeGoals,
  timeGoals,
  type Scorer,
  type ScorerCandidate,
} from "./goal-attribution.js";
import {
  attributeAssists,
  attributeShots,
  drawCards,
  drawFouls,
  splitOnTarget,
  type Assist,
  type CardIncident,
  type PlayerFouls,
  type PlayerShots,
} from "./match-incidents.js";
import { ratePlayers, type PlayerRating, type TeamResult } from "./player-ratings.js";
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
  /**
   * Os demais lances (R-206 mantido): assistencias, cartoes e finalizacoes por
   * jogador. Saem de RNG proprio, fora do kernel — o placar de qualquer partida
   * ja gravada continua identico.
   */
  readonly homeAssists: readonly Assist[];
  readonly awayAssists: readonly Assist[];
  readonly homeCards: readonly CardIncident[];
  readonly awayCards: readonly CardIncident[];
  readonly homePlayerShots: readonly PlayerShots[];
  readonly awayPlayerShots: readonly PlayerShots[];
  readonly homeFouls: readonly PlayerFouls[];
  readonly awayFouls: readonly PlayerFouls[];
  /** Finalizacoes NO ALVO por time (o gol e sempre uma delas). */
  readonly homeShotsOnTarget: number;
  readonly awayShotsOnTarget: number;
  /** xG: a soma das probabilidades de gol das chances criadas. */
  readonly homeExpectedGoals: number;
  readonly awayExpectedGoals: number;
  /** As defesas do goleiro de cada lado: chutes no alvo do adversario menos gols. */
  readonly homeSaves: number;
  readonly awaySaves: number;
  /** A nota de cada jogador (doc 05 §16), da maior para a menor. */
  readonly ratings: readonly PlayerRating[];
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

  const homeCandidates = match.homeScorers ?? [];
  const awayCandidates = match.awayScorers ?? [];
  const homeOnTarget = splitOnTarget(
    worldSeed,
    match.matchId,
    "home",
    output.homeShots,
    output.homeGoals,
  );
  const awayOnTarget = splitOnTarget(
    worldSeed,
    match.matchId,
    "away",
    output.awayShots,
    output.awayGoals,
  );
  const homeTimed = goalEvents
    .filter((g) => g.side === "home")
    .map((g) => ({ playerId: g.playerId, minute: g.minute }));
  const awayTimed = goalEvents
    .filter((g) => g.side === "away")
    .map((g) => ({ playerId: g.playerId, minute: g.minute }));

  const homeAssists = attributeAssists(
    worldSeed,
    match.matchId,
    "home",
    homeCandidates,
    homeTimed,
  );
  const awayAssists = attributeAssists(
    worldSeed,
    match.matchId,
    "away",
    awayCandidates,
    awayTimed,
  );
  const homeCards = drawCards(worldSeed, match.matchId, "home", homeCandidates);
  const awayCards = drawCards(worldSeed, match.matchId, "away", awayCandidates);
  const homeFouls = drawFouls(
    worldSeed,
    match.matchId,
    "home",
    homeCandidates,
    homeCards,
  );
  const awayFouls = drawFouls(
    worldSeed,
    match.matchId,
    "away",
    awayCandidates,
    awayCards,
  );
  const homePlayerShots = attributeShots(
    worldSeed,
    match.matchId,
    "home",
    homeCandidates,
    output.homeShots,
    homeScorers,
  );
  const awayPlayerShots = attributeShots(
    worldSeed,
    match.matchId,
    "away",
    awayCandidates,
    output.awayShots,
    awayScorers,
  );

  // A defesa do goleiro da casa e o chute no alvo do VISITANTE que nao virou
  // gol — a conta so fecha assim, e por isso ela mora aqui e nao em cada lado.
  const homeSaves = Math.max(0, awayOnTarget - output.awayGoals);
  const awaySaves = Math.max(0, homeOnTarget - output.homeGoals);

  const homeResult: TeamResult =
    output.homeGoals > output.awayGoals
      ? "win"
      : output.homeGoals < output.awayGoals
        ? "loss"
        : "draw";
  const awayResult: TeamResult =
    homeResult === "win" ? "loss" : homeResult === "loss" ? "win" : "draw";

  const ratings = ratePlayers([
    ...ratingInputs(
      homeCandidates,
      homeScorers,
      homeAssists,
      homeCards,
      homePlayerShots,
      homeOnTarget,
      homeSaves,
      output.awayGoals,
      homeResult,
    ),
    ...ratingInputs(
      awayCandidates,
      awayScorers,
      awayAssists,
      awayCards,
      awayPlayerShots,
      awayOnTarget,
      awaySaves,
      output.homeGoals,
      awayResult,
    ),
  ]);

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
    homeAssists,
    awayAssists,
    homeCards,
    awayCards,
    homePlayerShots,
    awayPlayerShots,
    homeFouls,
    awayFouls,
    homeShotsOnTarget: homeOnTarget,
    awayShotsOnTarget: awayOnTarget,
    homeExpectedGoals: output.homeExpectedGoals,
    awayExpectedGoals: output.awayExpectedGoals,
    homeSaves,
    awaySaves,
    ratings,
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

/**
 * Monta a entrada de nota de cada jogador do lado a partir do que ele fez.
 *
 * O chute no alvo e do TIME (o kernel nao diz qual chute foi no alvo), entao
 * ele e distribuido proporcionalmente as finalizacoes do jogador — quem chutou
 * mais teve mais chances de acertar o gol. E aproximacao declarada, nao medicao.
 */
function ratingInputs(
  candidates: readonly ScorerCandidate[],
  scorers: readonly Scorer[],
  assists: readonly Assist[],
  cards: readonly CardIncident[],
  playerShots: readonly PlayerShots[],
  teamOnTarget: number,
  teamSaves: number,
  goalsConceded: number,
  teamResult: TeamResult,
) {
  const goalsBy = new Map(scorers.map((s) => [s.playerId, s.goals]));
  const shotsBy = new Map(playerShots.map((s) => [s.playerId, s.shots]));
  const teamShots = [...shotsBy.values()].reduce((sum, n) => sum + n, 0);
  const assistsBy = new Map<string, number>();
  for (const assist of assists) {
    assistsBy.set(assist.playerId, (assistsBy.get(assist.playerId) ?? 0) + 1);
  }
  const yellowBy = new Map<string, number>();
  const redBy = new Map<string, number>();
  for (const card of cards) {
    const target = card.type === "YELLOW_CARD" ? yellowBy : redBy;
    target.set(card.playerId, (target.get(card.playerId) ?? 0) + 1);
  }

  return candidates.map((candidate) => {
    const shots = shotsBy.get(candidate.playerId) ?? 0;
    const goals = goalsBy.get(candidate.playerId) ?? 0;
    const onTarget =
      teamShots === 0
        ? goals
        : Math.max(goals, Math.round((shots / teamShots) * teamOnTarget));
    return {
      playerId: candidate.playerId,
      primaryPosition: candidate.primaryPosition,
      goals,
      assists: assistsBy.get(candidate.playerId) ?? 0,
      shots,
      shotsOnTarget: onTarget,
      saves: candidate.primaryPosition === "GK" ? teamSaves : 0,
      goalsConceded: candidate.primaryPosition === "GK" ? goalsConceded : 0,
      yellowCards: yellowBy.get(candidate.playerId) ?? 0,
      redCards: redBy.get(candidate.playerId) ?? 0,
      teamResult,
    };
  });
}
