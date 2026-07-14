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
  readonly resultHash: string;
  readonly statsHash: string;
}

/**
 * Núcleo determinístico e puro da partida: mesma manifest + matchId produz
 * sempre a mesma saída (online ≡ offline ≡ replay). Não faz E/S nem usa relógio.
 */
export function simulateMatch(
  matchId: string,
  manifest: SimulationManifest,
): MatchKernelOutput {
  const rng = new SeededRandom({
    worldSeed: manifest.seed,
    context: `match:${matchId}:kernel`,
  });
  const homeAdjusted = manifest.homeStrength + HOME_ADVANTAGE;
  const total = homeAdjusted + manifest.awayStrength;
  let homeGoals = 0;
  let awayGoals = 0;
  let homeShots = 0;
  let awayShots = 0;
  for (let chance = 0; chance < manifest.timestepChances; chance += 1) {
    const attacker = rng.nextInt(0, total);
    if (attacker < homeAdjusted) {
      homeShots += 1;
      if (rng.nextInt(0, 100) < conversion(homeAdjusted, manifest.awayStrength)) {
        homeGoals += 1;
      }
    } else {
      awayShots += 1;
      if (rng.nextInt(0, 100) < conversion(manifest.awayStrength, homeAdjusted)) {
        awayGoals += 1;
      }
    }
  }
  const homePossession = Math.round((homeAdjusted / total) * 100);
  const resultHash = stableHash(
    `${matchId}|${manifest.inputHash}|${homeGoals}-${awayGoals}`,
  );
  const statsHash = stableHash(
    `${matchId}|${manifest.inputHash}|${homeShots}|${awayShots}|${homePossession}`,
  );
  return {
    homeGoals,
    awayGoals,
    homeShots,
    awayShots,
    homePossession,
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
