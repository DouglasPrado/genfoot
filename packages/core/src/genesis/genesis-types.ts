import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type ClubId = EntityId<"Club">;
export type PersonId = EntityId<"Person">;
export type PlayerId = EntityId<"Player">;
export type SquadId = EntityId<"Squad">;
export type CompetitionId = EntityId<"Competition">;
export type FixtureId = EntityId<"Fixture">;

export const PlayerPosition = {
  GK: "GK",
  CB: "CB",
  LB: "LB",
  RB: "RB",
  CDM: "CDM",
  CM: "CM",
  CAM: "CAM",
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

export interface GeneratedPlayerAttributes {
  readonly technical: number;
  readonly physical: number;
  readonly mental: number;
  readonly goalkeeping: number;
}

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

export interface GeneratedCompetition {
  readonly id: CompetitionId;
  readonly name: "Liga Inicial";
  readonly seasonNumber: 1;
  readonly rounds: 30;
  readonly clubIds: readonly ClubId[];
}

export interface GeneratedFixture {
  readonly id: FixtureId;
  readonly competitionId: CompetitionId;
  readonly round: number;
  readonly leg: 1 | 2;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
  readonly scheduledWorldDate: string;
}

export interface WorldGenesisSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly sourceWorldVersion: number;
  readonly clubs: readonly GeneratedClub[];
  readonly persons: readonly GeneratedPerson[];
  readonly players: readonly GeneratedPlayer[];
  readonly squads: readonly GeneratedSquad[];
  readonly competition: GeneratedCompetition;
  readonly fixtures: readonly GeneratedFixture[];
}

export interface WorldGenesisSummary {
  readonly clubCount: number;
  readonly personCount: number;
  readonly playerCount: number;
  readonly squadCount: number;
  readonly fixtureCount: number;
  readonly roundCount: number;
  readonly averageOverall: number;
}
