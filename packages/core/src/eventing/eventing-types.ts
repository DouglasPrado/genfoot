import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type OutboxMessageId = EntityId<"OutboxMessage">;
export type EventingEventId = EntityId<"EventingEvent">;

export const InboxStatus = {
  CONSUMED: "CONSUMED",
  FAILED: "FAILED",
  DEAD_LETTERED: "DEAD_LETTERED",
} as const;

export type InboxStatus = (typeof InboxStatus)[keyof typeof InboxStatus];

export interface OutboxMessageSnapshot {
  readonly id: OutboxMessageId;
  readonly gameWorldId: GameWorldId;
  readonly stream: string;
  readonly sequence: number;
  readonly eventType: string;
  readonly payloadHash: string;
  readonly occurredOn: string;
  readonly batchKey: string;
}

export interface InboxRecordSnapshot {
  readonly consumerId: string;
  readonly messageId: OutboxMessageId;
  readonly status: InboxStatus;
  readonly attempts: number;
  readonly lastOn: string;
}

export interface OutboxPublishedEvent {
  readonly id: EventingEventId;
  readonly type: "OutboxPublished";
  readonly gameWorldId: GameWorldId;
  readonly stream: string;
  readonly messageCount: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface MessageDeadLetteredEvent {
  readonly id: EventingEventId;
  readonly type: "MessageDeadLettered";
  readonly gameWorldId: GameWorldId;
  readonly consumerId: string;
  readonly messageId: OutboxMessageId;
  readonly attempts: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type EventingDomainEvent =
  | OutboxPublishedEvent
  | MessageDeadLetteredEvent;

export interface WorldEventingSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly maxAttempts: number;
  readonly outbox: readonly OutboxMessageSnapshot[];
  readonly inbox: readonly InboxRecordSnapshot[];
  readonly events: readonly EventingDomainEvent[];
  readonly revision: number;
}

export interface EventingSummary {
  readonly outboxCount: number;
  readonly consumedCount: number;
  readonly deadLetteredCount: number;
  readonly eventCount: number;
}
