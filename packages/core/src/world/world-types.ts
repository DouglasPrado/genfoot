import type {
  DomainEvent,
  GameWorldId,
  RulesetVersion,
  WorldDate,
} from "@grinta/shared";

export const WorldStatus = {
  CREATING: "CREATING",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  FINISHED: "FINISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type WorldStatus = (typeof WorldStatus)[keyof typeof WorldStatus];

export interface CreateGameWorldInput {
  readonly id: GameWorldId;
  readonly seed: string;
  readonly startDate: WorldDate;
  readonly rulesetVersion: RulesetVersion;
}

export interface WorldProvisioningEvidence {
  readonly generatedClubCount: 16;
  readonly clubsWithValidSquads: 16;
  readonly generatedPlayerCount: 368;
  readonly playersPerSquad: 23;
  readonly calendarValidated: true;
  readonly rulesetVersion: RulesetVersion;
}

export interface GameWorldSnapshot {
  readonly id: GameWorldId;
  readonly seed: string;
  readonly startDate: string;
  readonly currentDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly status: WorldStatus;
  readonly worldSequence: number;
  readonly version: number;
}

export type WorldCreatedEvent = DomainEvent<
  "WorldCreated",
  Readonly<{
    gameWorldId: GameWorldId;
    seed: string;
    rulesetVersion: RulesetVersion;
  }>
>;

export type WorldActivatedEvent = DomainEvent<
  "WorldActivated",
  Readonly<{ gameWorldId: GameWorldId; rulesetVersion: RulesetVersion }>
>;

export type WorldDayAdvancedEvent = DomainEvent<
  "WorldDayAdvanced",
  Readonly<{
    gameWorldId: GameWorldId;
    gameDate: string;
    worldSequence: number;
  }>
>;

export type WorldDomainEvent =
  WorldCreatedEvent | WorldActivatedEvent | WorldDayAdvancedEvent;
