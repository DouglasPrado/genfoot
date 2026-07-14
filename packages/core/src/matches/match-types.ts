import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type MatchId = EntityId<"Match">;
export type MatchEventId = EntityId<"MatchEvent">;
export type MatchClubRef = EntityId<"Club">;
export type MatchFixtureRef = EntityId<"CompetitionFixture">;

export const MatchStatus = {
  CREATED: "CREATED",
  IN_PROGRESS: "IN_PROGRESS",
  FINAL: "FINAL",
} as const;

export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

export interface SimulationManifest {
  readonly seed: string;
  readonly engineBuild: string;
  readonly timestepChances: number;
  readonly homeStrength: number;
  readonly awayStrength: number;
  readonly inputHash: string;
}

export interface MatchResult {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly homeShots: number;
  readonly awayShots: number;
  readonly homePossession: number;
  readonly resultHash: string;
  readonly statsHash: string;
  readonly finalizedOn: string;
}

export interface MatchSnapshot {
  readonly id: MatchId;
  readonly gameWorldId: GameWorldId;
  readonly fixtureRef: MatchFixtureRef;
  readonly homeClubId: MatchClubRef;
  readonly awayClubId: MatchClubRef;
  readonly kickoffOn: string;
  readonly status: MatchStatus;
  readonly manifest: SimulationManifest;
  readonly result: MatchResult | null;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface MatchStartedEvent {
  readonly id: MatchEventId;
  readonly type: "MatchStarted";
  readonly gameWorldId: GameWorldId;
  readonly matchId: MatchId;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface MatchFinishedEvent {
  readonly id: MatchEventId;
  readonly type: "MatchFinished";
  readonly gameWorldId: GameWorldId;
  readonly matchId: MatchId;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface MatchResultOfficialEvent {
  readonly id: MatchEventId;
  readonly type: "MatchResultOfficial";
  readonly gameWorldId: GameWorldId;
  readonly matchId: MatchId;
  readonly fixtureRef: MatchFixtureRef;
  readonly resultHash: string;
  readonly statsHash: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type MatchDomainEvent =
  | MatchStartedEvent
  | MatchFinishedEvent
  | MatchResultOfficialEvent;

export interface WorldMatchesSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly matches: readonly MatchSnapshot[];
  readonly events: readonly MatchDomainEvent[];
  readonly revision: number;
}

export interface MatchSummary {
  readonly matchCount: number;
  readonly finalCount: number;
  readonly eventCount: number;
}
