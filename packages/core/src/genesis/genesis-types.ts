import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

import type { PlayerAttributes } from "../players/player-attributes.js";

export type ClubId = EntityId<"Club">;
export type PersonId = EntityId<"Person">;
export type PlayerId = EntityId<"Player">;
export type SquadId = EntityId<"Squad">;
export type CompetitionId = EntityId<"Competition">;
export type FixtureId = EntityId<"Fixture">;

/**
 * As 15 posições — as mesmas do `enum PlayerPosition` do schema.
 *
 * Eram 11: faltavam `LWB`, `RWB`, `LM` e `RM`, que o banco aceita. Um domínio
 * que não representa uma linha que o banco grava não consegue reidratar o
 * próprio agregado — o `fromSnapshot` estouraria num ala-lateral perfeitamente
 * válido.
 */
export const PlayerPosition = {
  GK: "GK",
  CB: "CB",
  LB: "LB",
  RB: "RB",
  LWB: "LWB",
  RWB: "RWB",
  CDM: "CDM",
  CM: "CM",
  CAM: "CAM",
  LM: "LM",
  RM: "RM",
  LW: "LW",
  RW: "RW",
  ST: "ST",
  CF: "CF",
} as const;

export type PlayerPosition =
  (typeof PlayerPosition)[keyof typeof PlayerPosition];

export const DominantFoot = {
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  BOTH: "BOTH",
} as const;

export type DominantFoot = (typeof DominantFoot)[keyof typeof DominantFoot];

export interface GeneratedClub {
  readonly id: ClubId;
  readonly name: string;
  readonly shortCode: string;
}

export interface GeneratedPerson {
  readonly id: PersonId;
  readonly firstName: string;
  readonly lastName: string;
  readonly birthDate: string;
  readonly primaryNationality: "BR";
}

/**
 * Os 39 atributos do GDD §2 — R-188.
 *
 * Eram 4 escalares agrupados (`technical`/`physical`/`mental`/`goalkeeping`).
 * Os grupos não sumiram: viraram **rollup derivado** (`rollupAttributes`), que é
 * o que a R-179 decidiu. O que sumiu foi eles serem a FONTE.
 */
export type GeneratedPlayerAttributes = PlayerAttributes;

export interface GeneratedPlayer {
  readonly id: PlayerId;
  readonly personId: PersonId;
  readonly clubId: ClubId;
  readonly primaryPosition: PlayerPosition;
  readonly secondaryPosition?: PlayerPosition;
  readonly dominantFoot: DominantFoot;
  readonly attributes: GeneratedPlayerAttributes;
  readonly potentialAbility: number;
  readonly generationSource: "INITIAL_WORLD";
}

export interface GeneratedSquad {
  readonly id: SquadId;
  readonly clubId: ClubId;
  readonly playerIds: readonly PlayerId[];
}

// O mundo nasce SEM competição (R-203): a gênese materializa só clubes,
// jogadores, elenco, base, comissão, torcida e economia. As competições são
// autoradas no admin (R-202) e criadas do zero — não vêm da gênese.
export interface WorldGenesisSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly sourceWorldVersion: number;
  readonly clubs: readonly GeneratedClub[];
  readonly persons: readonly GeneratedPerson[];
  readonly players: readonly GeneratedPlayer[];
  readonly squads: readonly GeneratedSquad[];
}

export interface WorldGenesisSummary {
  readonly clubCount: number;
  readonly personCount: number;
  readonly playerCount: number;
  readonly squadCount: number;
  readonly averageOverall: number;
}
