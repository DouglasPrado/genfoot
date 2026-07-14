import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type CompetitionEditionId = EntityId<"CompetitionEdition">;
export type CompetitionFixtureId = EntityId<"CompetitionFixture">;
export type CompetitionHomologationId = EntityId<"CompetitionHomologation">;
export type CompetitionEventId = EntityId<"CompetitionEvent">;
export type CompetitionClubRef = EntityId<"Club">;
export type CompetitionSeasonRef = EntityId<"Season">;
export type CompetitionMatchRef = EntityId<"Match">;

export const CompetitionStatus = {
  REGISTRATION: "REGISTRATION",
  SCHEDULED: "SCHEDULED",
  HOMOLOGATED: "HOMOLOGATED",
} as const;

export type CompetitionStatus =
  (typeof CompetitionStatus)[keyof typeof CompetitionStatus];

export const FixtureStatus = {
  SCHEDULED: "SCHEDULED",
  FINAL: "FINAL",
} as const;

export type FixtureStatus =
  (typeof FixtureStatus)[keyof typeof FixtureStatus];

export interface CompetitionParticipantSnapshot {
  readonly editionId: CompetitionEditionId;
  readonly clubId: CompetitionClubRef;
  readonly seedNumber: number;
  readonly registeredOn: string;
  readonly idempotencyKey: string;
}

export interface CompetitionFixtureSnapshot {
  readonly id: CompetitionFixtureId;
  readonly gameWorldId: GameWorldId;
  readonly editionId: CompetitionEditionId;
  readonly phase: string;
  readonly round: number;
  readonly homeClubId: CompetitionClubRef;
  readonly awayClubId: CompetitionClubRef;
  readonly kickoffOn: string;
  readonly status: FixtureStatus;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly resultRef?: string;
}

export interface StandingEntrySnapshot {
  readonly editionId: CompetitionEditionId;
  readonly clubId: CompetitionClubRef;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly points: number;
  readonly disciplinaryPoints: number;
  readonly provisionalRank: number;
}

export interface CompetitionHomologationSnapshot {
  readonly id: CompetitionHomologationId;
  readonly gameWorldId: GameWorldId;
  readonly editionId: CompetitionEditionId;
  readonly inputHash: string;
  readonly decidedBy: string;
  readonly decidedOn: string;
  readonly finalRanking: readonly CompetitionClubRef[];
  readonly idempotencyKey: string;
}

export interface CompetitionEditionSnapshot {
  readonly id: CompetitionEditionId;
  readonly gameWorldId: GameWorldId;
  readonly seasonRef: CompetitionSeasonRef;
  readonly name: string;
  readonly formatVersion: string;
  readonly status: CompetitionStatus;
  readonly maxParticipants: number;
  readonly startOn: string;
  readonly roundIntervalDays: number;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface CompetitionCreatedEvent {
  readonly id: CompetitionEventId;
  readonly type: "CompetitionCreated";
  readonly gameWorldId: GameWorldId;
  readonly editionId: CompetitionEditionId;
  readonly formatVersion: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface RegistrationAcceptedEvent {
  readonly id: CompetitionEventId;
  readonly type: "RegistrationAccepted";
  readonly gameWorldId: GameWorldId;
  readonly editionId: CompetitionEditionId;
  readonly clubId: CompetitionClubRef;
  readonly seedNumber: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface FixturesPublishedEvent {
  readonly id: CompetitionEventId;
  readonly type: "FixturesPublished";
  readonly gameWorldId: GameWorldId;
  readonly editionId: CompetitionEditionId;
  readonly fixtureCount: number;
  readonly roundCount: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface StandingChangedEvent {
  readonly id: CompetitionEventId;
  readonly type: "StandingChanged";
  readonly gameWorldId: GameWorldId;
  readonly editionId: CompetitionEditionId;
  readonly fixtureId: CompetitionFixtureId | null;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface CompetitionHomologatedEvent {
  readonly id: CompetitionEventId;
  readonly type: "CompetitionHomologated";
  readonly gameWorldId: GameWorldId;
  readonly editionId: CompetitionEditionId;
  readonly homologationId: CompetitionHomologationId;
  readonly inputHash: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type CompetitionDomainEvent =
  | CompetitionCreatedEvent
  | RegistrationAcceptedEvent
  | FixturesPublishedEvent
  | StandingChangedEvent
  | CompetitionHomologatedEvent;

export interface WorldCompetitionsSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly editions: readonly CompetitionEditionSnapshot[];
  readonly participants: readonly CompetitionParticipantSnapshot[];
  readonly fixtures: readonly CompetitionFixtureSnapshot[];
  readonly standings?: readonly StandingEntrySnapshot[];
  readonly homologations?: readonly CompetitionHomologationSnapshot[];
  readonly events: readonly CompetitionDomainEvent[];
  readonly revision: number;
}

export interface CompetitionSummary {
  readonly editionCount: number;
  readonly participantCount: number;
  readonly fixtureCount: number;
  readonly finalFixtureCount: number;
  readonly homologatedEditionCount: number;
  readonly eventCount: number;
}
