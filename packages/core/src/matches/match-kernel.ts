import { SeededRandom } from "../foundation/seeded-random.js";

import type { SimulationManifest } from "./match-types.js";

const HOME_ADVANTAGE = 5;
const UINT_64_MASK = (1n << 64n) - 1n;
const FNV_OFFSET = 14_695_981_039_346_656_037n;
const FNV_PRIME = 1_099_511_628_211n;

export interface MatchKernelOutput {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly homeShots: number;
  readonly awayShots: number;
  readonly homePossession: number;
  /**
   * xG — a soma das PROBABILIDADES de gol das finalizações que o time criou.
   *
   * Não é estimativa nem enfeite: `conversion()` é literalmente a chance contra
   * a qual cada chute foi sorteado, então somá-las é a definição de expected
   * goals. Não consome sorteio nenhum — é contabilidade do que já aconteceu,
   * então acrescentá-lo não muda placar de partida alguma.
   */
  readonly homeExpectedGoals: number;
  readonly awayExpectedGoals: number;
  readonly resultHash: string;
  readonly statsHash: string;
}

/**
 * Intenção tática aplicada ao timestep canônico a partir do seu `tick` (inclusive).
 * Ajusta a força de um lado por um delta limitado, sem alterar a contagem de sorteios
 * do RNG por chance (mantém a âncora determinística de online ≡ offline ≡ replay).
 */
export interface KernelCommand {
  readonly tick: number;
  readonly matchSequence: number;
  readonly side: "HOME" | "AWAY";
  readonly delta: number;
  readonly payloadHash: string;
}

export interface MatchKernelProgress {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly homeShots: number;
  readonly awayShots: number;
  /** Ver `MatchKernelOutput.homeExpectedGoals`. */
  readonly homeExpectedGoals: number;
  readonly awayExpectedGoals: number;
  readonly rngCursor: number;
}

/**
 * Avança o timestep canônico até `tickLimit` chances (0..timestepChances), aplicando o
 * command log em ordem. É puro e determinístico: a execução incremental (tick a tick) e a
 * offline (limite total de uma vez) consomem exatamente os mesmos sorteios e convergem para
 * o mesmo estado — base de online ≡ offline ≡ replay e do resume por checkpoint.
 */
export function simulateUpTo(
  matchId: string,
  manifest: SimulationManifest,
  tickLimit: number,
  commands: readonly KernelCommand[] = [],
): MatchKernelProgress {
  const rng = new SeededRandom({
    worldSeed: manifest.seed,
    context: `match:${matchId}:kernel`,
  });
  const limit = Math.max(0, Math.min(tickLimit, manifest.timestepChances));
  const sorted = [...commands].sort(
    (a, b) => a.tick - b.tick || a.matchSequence - b.matchSequence,
  );
  let homeGoals = 0;
  let awayGoals = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeExpectedGoals = 0;
  let awayExpectedGoals = 0;
  let rngCursor = 0;
  let homeMod = 0;
  let awayMod = 0;
  let cursor = 0;
  for (let chance = 0; chance < limit; chance += 1) {
    while (cursor < sorted.length && sorted[cursor]!.tick === chance) {
      const command = sorted[cursor]!;
      if (command.side === "HOME") homeMod += command.delta;
      else awayMod += command.delta;
      cursor += 1;
    }
    const homeAdjusted = Math.max(
      1,
      manifest.homeStrength + HOME_ADVANTAGE + homeMod,
    );
    const away = Math.max(1, manifest.awayStrength + awayMod);
    const total = homeAdjusted + away;
    const attacker = rng.nextInt(0, total);
    rngCursor += 1;
    if (attacker < homeAdjusted) {
      homeShots += 1;
      const chance = conversion(homeAdjusted, away);
      homeExpectedGoals += chance / 100;
      const roll = rng.nextInt(0, 100);
      rngCursor += 1;
      if (roll < chance) homeGoals += 1;
    } else {
      awayShots += 1;
      const chance = conversion(away, homeAdjusted);
      awayExpectedGoals += chance / 100;
      const roll = rng.nextInt(0, 100);
      rngCursor += 1;
      if (roll < chance) awayGoals += 1;
    }
  }
  return {
    homeGoals,
    awayGoals,
    homeShots,
    awayShots,
    homeExpectedGoals,
    awayExpectedGoals,
    rngCursor,
  };
}

/**
 * Núcleo determinístico e puro da partida: mesma manifest + matchId + command log produz
 * sempre a mesma saída (online ≡ offline ≡ replay). Não faz E/S nem usa relógio.
 */
export function simulateMatch(
  matchId: string,
  manifest: SimulationManifest,
  commands: readonly KernelCommand[] = [],
): MatchKernelOutput {
  const progress = simulateUpTo(
    matchId,
    manifest,
    manifest.timestepChances,
    commands,
  );
  const homeAdjusted = manifest.homeStrength + HOME_ADVANTAGE;
  const total = homeAdjusted + manifest.awayStrength;
  const homePossession = Math.round((homeAdjusted / total) * 100);
  const commandsDigest =
    commands.length === 0
      ? ""
      : `|cmd:${stableHash(
          [...commands]
            .sort((a, b) => a.tick - b.tick || a.matchSequence - b.matchSequence)
            .map(
              (c) => `${c.tick}:${c.matchSequence}:${c.side}:${c.delta}:${c.payloadHash}`,
            )
            .join(","),
        )}`;
  const resultHash = stableHash(
    `${matchId}|${manifest.inputHash}|${progress.homeGoals}-${progress.awayGoals}${commandsDigest}`,
  );
  const statsHash = stableHash(
    `${matchId}|${manifest.inputHash}|${progress.homeShots}|${progress.awayShots}|${homePossession}${commandsDigest}`,
  );
  return {
    homeGoals: progress.homeGoals,
    awayGoals: progress.awayGoals,
    homeShots: progress.homeShots,
    awayShots: progress.awayShots,
    homePossession,
    // Arredondado a 2 casas: o xG é para leitura humana ("1,84"), e a coluna do
    // banco é Decimal(8,4). O `statsHash` NÃO o inclui de propósito — ele é
    // derivado das finalizações que já estão lá, e mudar o hash invalidaria os
    // manifestos de replay já gravados.
    homeExpectedGoals: Math.round(progress.homeExpectedGoals * 100) / 100,
    awayExpectedGoals: Math.round(progress.awayExpectedGoals * 100) / 100,
    resultHash,
    statsHash,
  };
}

function conversion(attack: number, defence: number): number {
  const raw = 25 + Math.round((attack - defence) / 4);
  return Math.max(5, Math.min(60, raw));
}

/** FNV-1a de 64 bits em hexadecimal — determinístico e sem dependências. */
export function stableHash(value: string): string {
  let hash = FNV_OFFSET & UINT_64_MASK;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & UINT_64_MASK;
  }
  return hash.toString(16).padStart(16, "0");
}
