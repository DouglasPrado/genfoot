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

export const MatchCommandSide = {
  HOME: "HOME",
  AWAY: "AWAY",
} as const;

export type MatchCommandSide =
  (typeof MatchCommandSide)[keyof typeof MatchCommandSide];

/** Entrada aceita do command log ao vivo: ordenada por matchSequence e ancorada num tick. */
export interface MatchCommandLogEntry {
  readonly matchSequence: number;
  readonly tick: number;
  readonly actor: string;
  readonly commandType: string;
  readonly side: MatchCommandSide;
  readonly delta: number;
  readonly payloadHash: string;
  readonly accepted: true;
  readonly commandId: string;
  readonly idempotencyKey: string;
}

/** Checkpoint retomável: tick, hash do estado, cursor de RNG e sequência de commands. */
export interface MatchCheckpointSnapshot {
  readonly tick: number;
  readonly stateHash: string;
  readonly rngCursor: number;
  readonly commandSequence: number;
  readonly idempotencyKey: string;
}

/** Estado do timestep canônico enquanto a partida está em andamento. */
export interface MatchRuntimeState {
  readonly currentTick: number;
  readonly totalTicks: number;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly homeShots: number;
  readonly awayShots: number;
  readonly rngCursor: number;
  readonly nextSequence: number;
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
  readonly runtime?: MatchRuntimeState;
  readonly commandLog?: readonly MatchCommandLogEntry[];
  readonly checkpoints?: readonly MatchCheckpointSnapshot[];
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

export interface MatchCommandAcceptedEvent {
  readonly id: MatchEventId;
  readonly type: "MatchCommandAccepted";
  readonly gameWorldId: GameWorldId;
  readonly matchId: MatchId;
  readonly matchSequence: number;
  readonly tick: number;
  readonly actor: string;
  readonly commandType: string;
  readonly payloadHash: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface MatchCheckpointedEvent {
  readonly id: MatchEventId;
  readonly type: "MatchCheckpointed";
  readonly gameWorldId: GameWorldId;
  readonly matchId: MatchId;
  readonly tick: number;
  readonly stateHash: string;
  readonly commandSequence: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type MatchDomainEvent =
  | MatchStartedEvent
  | MatchCommandAcceptedEvent
  | MatchCheckpointedEvent
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
  readonly commandCount: number;
  readonly checkpointCount: number;
}
