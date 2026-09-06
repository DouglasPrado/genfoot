import { SeededRandom } from "../foundation/seeded-random.js";

import { MATCH_MINUTES, type Scorer, type TimedGoal } from "./goal-attribution.js";

/**
 * Os lances da partida que NÃO são o gol — assistência, cartão e finalização.
 *
 * Por que aqui e não no kernel: o kernel (`match-kernel.ts`) é o núcleo de
 * replay, e o `resultHash` do manifesto depende da SEQUÊNCIA exata de sorteios
 * que ele consome. Puxar um número a mais lá dentro mudaria o placar de toda
 * partida já gravada e invalidaria os manifestos guardados. Então, como a
 * atribuição de gols já faz, cada família de lance tem o seu `SeededRandom`
 * namespaceado por `matchId` + lado: determinístico (R-182), reproduzível, e
 * inofensivo para o que já existe.
 *
 * Calibração de 1ª passada (Série R), como o resto do motor: as taxas abaixo são
 * balanceamento, não canon.
 */

export interface IncidentCandidate {
  readonly playerId: string;
  readonly primaryPosition: string;
  readonly ability: number;
}

/** Quantos gols saem com assistência. Futebol real fica perto de 2/3. */
const ASSIST_RATE = 0.65;

/** Quanto cada posição puxa para a ASSISTÊNCIA — o oposto do gol. */
const PLAYMAKING_FACTOR: Readonly<Record<string, number>> = {
  CAM: 1.0,
  LW: 0.9,
  RW: 0.9,
  LM: 0.8,
  RM: 0.8,
  CM: 0.75,
  LWB: 0.6,
  RWB: 0.6,
  LB: 0.5,
  RB: 0.5,
  CDM: 0.45,
  ST: 0.4,
  CF: 0.4,
  CB: 0.12,
  GK: 0.02,
};

export interface Assist {
  readonly playerId: string;
  /** De quem foi o gol que esta assistência criou. */
  readonly scorerId: string;
  /** O minuto do GOL — assistência e gol acontecem no mesmo lance. */
  readonly minute: number;
}

/**
 * Quem deu o passe para cada gol.
 *
 * Nem todo gol tem assistência (jogada individual, rebote, bola parada direta),
 * e ninguém assiste a si mesmo — um "assistente" igual ao goleador seria um
 * lance que não existe.
 */
export function attributeAssists(
  worldSeed: string,
  matchId: string,
  side: "home" | "away",
  candidates: readonly IncidentCandidate[],
  goals: readonly TimedGoal[],
): Assist[] {
  if (goals.length === 0 || candidates.length < 2) return [];
  const random = new SeededRandom({
    worldSeed,
    context: `assists:${matchId}:${side}`,
  });

  const assists: Assist[] = [];
  for (const goal of goals) {
    // O sorteio da taxa é consumido SEMPRE, mesmo quando não há assistência:
    // pular o `nextFloat` mudaria a sequência conforme o resultado e quebraria
    // a reprodutibilidade lance a lance.
    const rolled = random.nextFloat();
    const eligible = candidates.filter((c) => c.playerId !== goal.playerId);
    if (eligible.length === 0) continue;
    const pick = weightedPick(random, eligible, playmakingWeight);
    if (rolled > ASSIST_RATE) continue;
    assists.push({
      playerId: pick.playerId,
      scorerId: goal.playerId,
      minute: goal.minute,
    });
  }
  return assists;
}

function playmakingWeight(candidate: IncidentCandidate): number {
  const factor = PLAYMAKING_FACTOR[candidate.primaryPosition] ?? 0.5;
  return Math.max(1, candidate.ability * factor);
}

/** Quanto cada posição puxa para o CARTÃO: quem marca falta mais, leva mais. */
const CARD_FACTOR: Readonly<Record<string, number>> = {
  CDM: 1.0,
  CB: 0.9,
  CM: 0.8,
  LB: 0.75,
  RB: 0.75,
  LWB: 0.7,
  RWB: 0.7,
  CAM: 0.5,
  LM: 0.5,
  RM: 0.5,
  ST: 0.45,
  CF: 0.45,
  LW: 0.4,
  RW: 0.4,
  GK: 0.1,
};

/** Média de amarelos por time por jogo (1ª passada). */
const YELLOW_MIN = 0;
const YELLOW_MAX = 4;
/** Chance de um vermelho DIRETO por time por jogo. */
const RED_RATE = 0.045;

export type CardType = "YELLOW_CARD" | "RED_CARD";

export interface CardIncident {
  readonly playerId: string;
  readonly type: CardType;
  readonly minute: number;
}

/**
 * Os cartões de um lado.
 *
 * Cada amarelo vai para um jogador DIFERENTE: o segundo amarelo do mesmo
 * jogador é expulsão, e essa é regra de partida que o motor ainda não conduz
 * (o expulso teria de sair de campo, e não há campo aqui). Emitir dois amarelos
 * no mesmo jogador sem a expulsão seria descrever um jogo que não pode existir.
 *
 * Isto NÃO decide suspensão — quantos amarelos suspendem e quando a contagem
 * zera é regra de campeonato, sem decisão ratificada. Aqui só nasce o cartão.
 */
export function drawCards(
  worldSeed: string,
  matchId: string,
  side: "home" | "away",
  candidates: readonly IncidentCandidate[],
): CardIncident[] {
  if (candidates.length === 0) return [];
  const random = new SeededRandom({
    worldSeed,
    context: `cards:${matchId}:${side}`,
  });

  const yellowCount = Math.min(
    random.nextInt(YELLOW_MIN, YELLOW_MAX + 1),
    candidates.length,
  );
  const cards: CardIncident[] = [];
  const used = new Set<string>();
  for (let i = 0; i < yellowCount; i += 1) {
    const eligible = candidates.filter((c) => !used.has(c.playerId));
    if (eligible.length === 0) break;
    const pick = weightedPick(random, eligible, cardWeight);
    used.add(pick.playerId);
    cards.push({
      playerId: pick.playerId,
      type: "YELLOW_CARD",
      minute: random.nextInt(1, MATCH_MINUTES + 1),
    });
  }

  // O vermelho direto é independente do amarelo — e pode cair em quem já tem um
  // (falta dura depois de advertido é exatamente o caso comum).
  if (random.nextFloat() < RED_RATE) {
    const pick = weightedPick(random, candidates, cardWeight);
    cards.push({
      playerId: pick.playerId,
      type: "RED_CARD",
      minute: random.nextInt(1, MATCH_MINUTES + 1),
    });
  }

  return cards.sort((a, b) => a.minute - b.minute);
}

function cardWeight(candidate: IncidentCandidate): number {
  return Math.max(1, (CARD_FACTOR[candidate.primaryPosition] ?? 0.5) * 100);
}

export interface PlayerShots {
  readonly playerId: string;
  readonly shots: number;
}

/**
 * Reparte as finalizações do time entre os jogadores.
 *
 * O total é o que o KERNEL produziu — não se inventa finalização a mais nem a
 * menos. Quem marcou recebe pelo menos um chute por gol: um gol sem finalização
 * seria contradição dentro da mesma partida.
 */
export function attributeShots(
  worldSeed: string,
  matchId: string,
  side: "home" | "away",
  candidates: readonly IncidentCandidate[],
  teamShots: number,
  scorers: readonly Scorer[],
): PlayerShots[] {
  const tally = new Map<string, number>();
  for (const scorer of scorers) {
    tally.set(scorer.playerId, scorer.goals);
  }
  const alreadyCounted = [...tally.values()].reduce((sum, n) => sum + n, 0);
  const remaining = Math.max(0, teamShots - alreadyCounted);

  if (candidates.length > 0 && remaining > 0) {
    const random = new SeededRandom({
      worldSeed,
      context: `shots:${matchId}:${side}`,
    });
    for (let i = 0; i < remaining; i += 1) {
      const pick = weightedPick(random, candidates, shootingWeight);
      tally.set(pick.playerId, (tally.get(pick.playerId) ?? 0) + 1);
    }
  }

  return [...tally]
    .filter(([, shots]) => shots > 0)
    .map(([playerId, shots]) => ({ playerId, shots }))
    .sort((a, b) => b.shots - a.shots || a.playerId.localeCompare(b.playerId));
}

/** Quem chuta: mesma intuição do gol — atacante chuta, goleiro não. */
const SHOOTING_FACTOR: Readonly<Record<string, number>> = {
  ST: 1.0,
  CF: 1.0,
  LW: 0.85,
  RW: 0.85,
  CAM: 0.7,
  LM: 0.55,
  RM: 0.55,
  CM: 0.5,
  CDM: 0.3,
  LWB: 0.2,
  RWB: 0.2,
  CB: 0.18,
  LB: 0.18,
  RB: 0.18,
  GK: 0.01,
};

function shootingWeight(candidate: IncidentCandidate): number {
  const factor = SHOOTING_FACTOR[candidate.primaryPosition] ?? 0.3;
  return Math.max(1, candidate.ability * factor);
}

/** Sorteio ponderado consumindo UM float — a mesma forma do gol. */
function weightedPick(
  random: SeededRandom,
  candidates: readonly IncidentCandidate[],
  weightOf: (candidate: IncidentCandidate) => number,
): IncidentCandidate {
  const weights = candidates.map(weightOf);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let pick = random.nextFloat() * total;
  for (let i = 0; i < candidates.length; i += 1) {
    pick -= weights[i]!;
    if (pick <= 0) return candidates[i]!;
  }
  return candidates[candidates.length - 1]!;
}

/** Quanto das finalizações vai no alvo. Calibração de 1ª passada. */
const ON_TARGET_MIN = 0.3;
const ON_TARGET_MAX = 0.55;

/**
 * Quantas das finalizações do time foram no alvo.
 *
 * O gol é sempre no alvo — é o piso, e sem ele a tela mostraria "4 gols, 2
 * chutes no alvo", que é impossível. O kernel não distingue alvo de fora (ele
 * resolve chance → gol), então a divisão é um sorteio próprio, determinístico e
 * fora do RNG do kernel.
 */
export function splitOnTarget(
  worldSeed: string,
  matchId: string,
  side: "home" | "away",
  teamShots: number,
  teamGoals: number,
): number {
  if (teamShots <= 0) return Math.max(0, teamGoals);
  const random = new SeededRandom({
    worldSeed,
    context: `on-target:${matchId}:${side}`,
  });
  const share =
    ON_TARGET_MIN + random.nextFloat() * (ON_TARGET_MAX - ON_TARGET_MIN);
  const drawn = Math.round(teamShots * share);
  return Math.max(teamGoals, Math.min(teamShots, Math.max(drawn, teamGoals)));
}

/** Faltas por time num jogo. Calibração de 1ª passada. */
const FOULS_MIN = 6;
const FOULS_MAX = 20;

export interface PlayerFouls {
  readonly playerId: string;
  readonly fouls: number;
}

/**
 * As faltas cometidas, repartidas pelo elenco.
 *
 * Quem levou cartão cometeu falta — o cartão é a punição de uma, e um jogador
 * advertido com zero faltas seria contradição dentro da própria partida. Os
 * cartões entram primeiro; o resto é sorteado por peso de posição.
 */
export function drawFouls(
  worldSeed: string,
  matchId: string,
  side: "home" | "away",
  candidates: readonly IncidentCandidate[],
  cards: readonly CardIncident[],
): PlayerFouls[] {
  if (candidates.length === 0) return [];
  const random = new SeededRandom({
    worldSeed,
    context: `fouls:${matchId}:${side}`,
  });

  const tally = new Map<string, number>();
  for (const card of cards) {
    tally.set(card.playerId, (tally.get(card.playerId) ?? 0) + 1);
  }

  const total = random.nextInt(FOULS_MIN, FOULS_MAX + 1);
  const already = [...tally.values()].reduce((sum, n) => sum + n, 0);
  for (let i = 0; i < Math.max(0, total - already); i += 1) {
    const pick = weightedPick(random, candidates, cardWeight);
    tally.set(pick.playerId, (tally.get(pick.playerId) ?? 0) + 1);
  }

  return [...tally]
    .filter(([, fouls]) => fouls > 0)
    .map(([playerId, fouls]) => ({ playerId, fouls }))
    .sort((a, b) => b.fouls - a.fouls || a.playerId.localeCompare(b.playerId));
}

/**
 * Reparte as finalizações NO ALVO do time entre os jogadores.
 *
 * A soma tem de fechar EXATAMENTE com o total do time: somar um piso por
 * jogador (cada um pelo menos os seus gols) estoura a conta e a tela mostra "8
 * finalizações, 8 no alvo" num jogo de 4 gols — aproveitamento impossível.
 *
 * Regra: cada jogador começa com os gols que fez (gol é sempre no alvo); o que
 * sobra vai para quem mais finalizou, pelo método do maior resto. Determinístico
 * e sem sorteio — é repartição, não sorte.
 */
export function distributeOnTarget(
  playerShots: readonly PlayerShots[],
  goalsByPlayer: ReadonlyMap<string, number>,
  teamOnTarget: number,
): PlayerShots[] {
  if (playerShots.length === 0) return [];

  const floor = new Map<string, number>();
  for (const entry of playerShots) {
    // O piso não pode passar do que o jogador finalizou.
    const goals = Math.min(goalsByPlayer.get(entry.playerId) ?? 0, entry.shots);
    floor.set(entry.playerId, goals);
  }
  const used = [...floor.values()].reduce((sum, n) => sum + n, 0);
  let remaining = Math.max(0, teamOnTarget - used);

  // Quem tem mais chute ainda não contado recebe primeiro; empate desempata por
  // id para a repartição ser estável entre reprocessamentos.
  const room = playerShots
    .map((entry) => ({
      playerId: entry.playerId,
      room: entry.shots - (floor.get(entry.playerId) ?? 0),
    }))
    .filter((entry) => entry.room > 0)
    .sort((a, b) => b.room - a.room || a.playerId.localeCompare(b.playerId));

  // Distribui de um em um, circulando: espalha em vez de encher o primeiro.
  let index = 0;
  while (remaining > 0 && room.length > 0) {
    const entry = room[index % room.length]!;
    if (entry.room > 0) {
      floor.set(entry.playerId, (floor.get(entry.playerId) ?? 0) + 1);
      entry.room -= 1;
      remaining -= 1;
    }
    index += 1;
    if (room.every((e) => e.room === 0)) break;
  }

  return [...floor]
    .filter(([, onTarget]) => onTarget > 0)
    .map(([playerId, shots]) => ({ playerId, shots }));
}
