import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type NarrativeClubRef = EntityId<"Club">;
export type PromiseId = EntityId<"NarrativePromise">;
export type NarrativeCrisisId = EntityId<"NarrativeCrisis">;
export type ConversationId = EntityId<"Conversation">;
export type MediaStoryId = EntityId<"MediaStory">;
export type NarrativeEventId = EntityId<"NarrativeEvent">;

export const MediaStoryStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
} as const;

export type MediaStoryStatus =
  (typeof MediaStoryStatus)[keyof typeof MediaStoryStatus];

export const FanbaseSegment = {
  ULTRAS: "ULTRAS",
  FAMILY: "FAMILY",
  CASUAL: "CASUAL",
} as const;

export type FanbaseSegment =
  (typeof FanbaseSegment)[keyof typeof FanbaseSegment];

export const MatchOutcome = {
  WIN: "WIN",
  DRAW: "DRAW",
  LOSS: "LOSS",
} as const;

export type MatchOutcome = (typeof MatchOutcome)[keyof typeof MatchOutcome];

export const PromiseStatus = {
  ACTIVE: "ACTIVE",
  FULFILLED: "FULFILLED",
  BROKEN: "BROKEN",
  CANCELLED: "CANCELLED",
} as const;

export type PromiseStatus =
  (typeof PromiseStatus)[keyof typeof PromiseStatus];

export const CrisisStatus = {
  OPEN: "OPEN",
  RECOVERY: "RECOVERY",
  RESOLVED: "RESOLVED",
} as const;

export type CrisisStatus = (typeof CrisisStatus)[keyof typeof CrisisStatus];

export interface SegmentSatisfaction {
  readonly segment: FanbaseSegment;
  readonly satisfaction: number;
  readonly reactivity: number;
}

export interface ClubFanbaseSnapshot {
  readonly clubId: NarrativeClubRef;
  readonly segments: readonly SegmentSatisfaction[];
  readonly overall: number;
}

export interface ClubReputationSnapshot {
  readonly clubId: NarrativeClubRef;
  readonly score: number;
}

export interface NarrativePromiseSnapshot {
  readonly id: PromiseId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: NarrativeClubRef;
  readonly metric: string;
  readonly targetValue: number;
  readonly deadline: string;
  readonly status: PromiseStatus;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface NarrativeCrisisSnapshot {
  readonly id: NarrativeCrisisId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: NarrativeClubRef;
  readonly cause: string;
  readonly severity: number;
  readonly status: CrisisStatus;
  readonly recoveryPlan: string | null;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface ConversationSnapshot {
  readonly id: ConversationId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: NarrativeClubRef;
  readonly context: string;
  readonly options: readonly string[];
  readonly choice: string;
  readonly reputationEffect: number;
  readonly idempotencyKey: string;
}

export interface MediaStorySnapshot {
  readonly id: MediaStoryId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: NarrativeClubRef;
  readonly factRefs: readonly string[];
  readonly frame: string;
  readonly status: MediaStoryStatus;
  readonly visibility: string;
  readonly idempotencyKey: string;
}

export interface RivalrySnapshot {
  readonly clubA: NarrativeClubRef;
  readonly clubB: NarrativeClubRef;
  readonly intensity: number;
}

export interface SupporterSatisfactionChangedEvent {
  readonly id: NarrativeEventId;
  readonly type: "SupporterSatisfactionChanged";
  readonly gameWorldId: GameWorldId;
  readonly clubId: NarrativeClubRef;
  readonly factId: string;
  readonly overall: number;
  readonly factors: readonly string[];
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface PromiseMadeEvent {
  readonly id: NarrativeEventId;
  readonly type: "PromiseMade";
  readonly gameWorldId: GameWorldId;
  readonly promiseId: PromiseId;
  readonly clubId: NarrativeClubRef;
  readonly metric: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface PromiseSettledEvent {
  readonly id: NarrativeEventId;
  readonly type: "PromiseFulfilled" | "PromiseBroken";
  readonly gameWorldId: GameWorldId;
  readonly promiseId: PromiseId;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface ReputationChangedEvent {
  readonly id: NarrativeEventId;
  readonly type: "ReputationChanged";
  readonly gameWorldId: GameWorldId;
  readonly clubId: NarrativeClubRef;
  readonly score: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface NarrativeCrisisChangedEvent {
  readonly id: NarrativeEventId;
  readonly type: "NarrativeCrisisOpened" | "NarrativeCrisisResolved";
  readonly gameWorldId: GameWorldId;
  readonly crisisId: NarrativeCrisisId;
  readonly clubId: NarrativeClubRef;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface MediaStoryPublishedEvent {
  readonly id: NarrativeEventId;
  readonly type: "MediaStoryPublished";
  readonly gameWorldId: GameWorldId;
  readonly storyId: MediaStoryId;
  readonly clubId: NarrativeClubRef;
  readonly frame: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type NarrativeDomainEvent =
  | SupporterSatisfactionChangedEvent
  | PromiseMadeEvent
  | PromiseSettledEvent
  | ReputationChangedEvent
  | NarrativeCrisisChangedEvent
  | MediaStoryPublishedEvent;

export interface WorldNarrativeSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly fanbases: readonly ClubFanbaseSnapshot[];
  readonly reputation: readonly ClubReputationSnapshot[];
  readonly promises: readonly NarrativePromiseSnapshot[];
  readonly crises: readonly NarrativeCrisisSnapshot[];
  readonly conversations?: readonly ConversationSnapshot[];
  readonly mediaStories?: readonly MediaStorySnapshot[];
  readonly rivalries?: readonly RivalrySnapshot[];
  readonly appliedFactIds: readonly string[];
  readonly events: readonly NarrativeDomainEvent[];
  readonly revision: number;
}

export interface NarrativeSummary {
  readonly fanbaseCount: number;
  readonly activePromiseCount: number;
  readonly openCrisisCount: number;
  readonly mediaStoryCount: number;
  readonly rivalryCount: number;
  readonly eventCount: number;
}
