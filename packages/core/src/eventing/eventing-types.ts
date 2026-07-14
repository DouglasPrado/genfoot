import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type OutboxMessageId = EntityId<"OutboxMessage">;
export type EventingEventId = EntityId<"EventingEvent">;
export type SagaInstanceId = EntityId<"SagaInstance">;

export const InboxStatus = {
  CONSUMED: "CONSUMED",
  FAILED: "FAILED",
  DEAD_LETTERED: "DEAD_LETTERED",
} as const;

export type InboxStatus = (typeof InboxStatus)[keyof typeof InboxStatus];

export const SagaStatus = {
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  COMPENSATING: "COMPENSATING",
  COMPENSATED: "COMPENSATED",
} as const;

export type SagaStatus = (typeof SagaStatus)[keyof typeof SagaStatus];

export const SagaStepStatus = {
  PENDING: "PENDING",
  DONE: "DONE",
  COMPENSATED: "COMPENSATED",
} as const;

export type SagaStepStatus =
  (typeof SagaStepStatus)[keyof typeof SagaStepStatus];

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

/** Catálogo versionado de tipos de evento (owner, hash de schema e compatibilidade). */
export interface EventRegistryEntrySnapshot {
  readonly eventType: string;
  readonly version: number;
  readonly owner: string;
  readonly schemaHash: string;
  readonly compatibility: "ADDITIVE" | "BREAKING";
}

export interface SagaStepSnapshot {
  readonly index: number;
  readonly name: string;
  readonly status: SagaStepStatus;
  readonly attempts: number;
  readonly checkpointHash: string | null;
  readonly completedOn: string | null;
}

export interface SagaInstanceSnapshot {
  readonly id: SagaInstanceId;
  readonly gameWorldId: GameWorldId;
  readonly sagaType: string;
  readonly correlationKey: string;
  readonly status: SagaStatus;
  readonly currentStep: number;
  readonly steps: readonly SagaStepSnapshot[];
  readonly leaseOwnerId: string | null;
  readonly leaseExpiresAtMs: number | null;
  readonly fencingToken: number;
  readonly idempotencyKey: string;
  readonly version: number;
}

/** Checkpoint reconstruível de projeção: cursor contíguo por stream + hash do estado. */
export interface ProjectionCheckpointSnapshot {
  readonly projectionId: string;
  readonly gameWorldId: GameWorldId;
  readonly stream: string;
  readonly cursor: number;
  readonly schemaVersion: number;
  readonly stateHash: string;
  readonly updatedOn: string;
}

/** Cursor de realtime recuperável por sequence + resume token determinístico. */
export interface RealtimeCursorSnapshot {
  readonly audience: string;
  readonly stream: string;
  readonly lastSequence: number;
  readonly resumeToken: string;
  readonly expiresOn: string;
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

export interface SagaStartedEvent {
  readonly id: EventingEventId;
  readonly type: "SagaStarted";
  readonly gameWorldId: GameWorldId;
  readonly sagaId: SagaInstanceId;
  readonly sagaType: string;
  readonly correlationKey: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface SagaCheckpointedEvent {
  readonly id: EventingEventId;
  readonly type: "SagaCheckpointed";
  readonly gameWorldId: GameWorldId;
  readonly sagaId: SagaInstanceId;
  readonly stepIndex: number;
  readonly checkpointHash: string;
  readonly fencingToken: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface SagaCompletedEvent {
  readonly id: EventingEventId;
  readonly type: "SagaCompleted";
  readonly gameWorldId: GameWorldId;
  readonly sagaId: SagaInstanceId;
  readonly outcome: "COMPLETED" | "COMPENSATED";
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface ProjectionAdvancedEvent {
  readonly id: EventingEventId;
  readonly type: "ProjectionAdvanced";
  readonly gameWorldId: GameWorldId;
  readonly projectionId: string;
  readonly stream: string;
  readonly cursor: number;
  readonly stateHash: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type EventingDomainEvent =
  | OutboxPublishedEvent
  | MessageDeadLetteredEvent
  | SagaStartedEvent
  | SagaCheckpointedEvent
  | SagaCompletedEvent
  | ProjectionAdvancedEvent;

export interface WorldEventingSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly maxAttempts: number;
  readonly outbox: readonly OutboxMessageSnapshot[];
  readonly inbox: readonly InboxRecordSnapshot[];
  readonly registry?: readonly EventRegistryEntrySnapshot[];
  readonly sagas?: readonly SagaInstanceSnapshot[];
  readonly projections?: readonly ProjectionCheckpointSnapshot[];
  readonly cursors?: readonly RealtimeCursorSnapshot[];
  readonly events: readonly EventingDomainEvent[];
  readonly revision: number;
}

export interface EventingSummary {
  readonly outboxCount: number;
  readonly consumedCount: number;
  readonly deadLetteredCount: number;
  readonly eventCount: number;
  readonly sagaCount: number;
  readonly completedSagaCount: number;
  readonly projectionCount: number;
  readonly cursorCount: number;
}
