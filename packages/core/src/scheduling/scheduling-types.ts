import type { GameWorldId, RulesetVersion } from "@grinta/shared";

import type { SeasonRolloverSnapshot } from "./season-rollover-types.js";

export const SeasonStatus = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  FINISHED: "FINISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type SeasonStatus = (typeof SeasonStatus)[keyof typeof SeasonStatus];

export const SeasonLifecycleState = {
  PLANNING: "PLANNING",
  REGISTRATION: "REGISTRATION",
  IN_PROGRESS: "IN_PROGRESS",
  FINALIZING: "FINALIZING",
  OFF_SEASON: "OFF_SEASON",
  COMPLETED: "COMPLETED",
} as const;

export type SeasonLifecycleState =
  (typeof SeasonLifecycleState)[keyof typeof SeasonLifecycleState];

export interface SeasonSnapshot {
  readonly id: string;
  readonly gameWorldId: GameWorldId;
  readonly number: number;
  readonly name: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly lifecycleState: SeasonLifecycleState;
  readonly status: SeasonStatus;
  readonly version: number;
}

export const ScheduledTaskStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type ScheduledTaskStatus =
  (typeof ScheduledTaskStatus)[keyof typeof ScheduledTaskStatus];

export interface ScheduledTaskSnapshot {
  readonly id: string;
  readonly gameWorldId: GameWorldId;
  readonly type: string;
  readonly dueOn: string;
  readonly priority: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string;
  readonly recurrence: Readonly<{
    everyDays: number;
    untilOn: string;
  }> | null;
  readonly status: ScheduledTaskStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly fencingToken: number | null;
  readonly lastError: string | null;
  readonly completedOn: string | null;
  readonly version: number;
}

export interface WorldSchedulerConfig {
  readonly rulesetVersion: RulesetVersion;
  readonly maxTaskAttempts: number;
  readonly clockLeaseDurationMs: number;
}

export const TemporalWindowType = {
  TRANSFER: "TRANSFER",
  REGISTRATION: "REGISTRATION",
  RENEWAL: "RENEWAL",
  CUSTOM: "CUSTOM",
} as const;

export type TemporalWindowType =
  (typeof TemporalWindowType)[keyof typeof TemporalWindowType];

export interface TemporalWindowSnapshot {
  readonly id: string;
  readonly gameWorldId: GameWorldId;
  readonly type: TemporalWindowType;
  readonly name: string;
  readonly opensOn: string;
  readonly closesOn: string;
  readonly rulesetVersion: RulesetVersion;
  readonly configVersion: number;
  readonly version: number;
}

export interface WorldCommandReceipt {
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly commandType: "AdvanceWorldDay";
  readonly gameWorldId: GameWorldId;
  readonly expectedDate: string;
  readonly resultDate: string;
  readonly resultWorldVersion: number;
  readonly fencingToken: number;
  readonly rulesetVersion: RulesetVersion;
  readonly processedTaskIds: readonly string[];
}

export interface WorldClockSnapshot {
  readonly leaseOwnerId: string | null;
  readonly leaseExpiresAtMs: number | null;
  readonly fencingToken: number;
}

export interface WorldSchedulerSnapshot {
  readonly schemaVersion: 2;
  readonly gameWorldId: GameWorldId;
  readonly config: WorldSchedulerConfig;
  readonly seasons: readonly SeasonSnapshot[];
  readonly tasks: readonly ScheduledTaskSnapshot[];
  readonly windows: readonly TemporalWindowSnapshot[];
  readonly commandReceipts: readonly WorldCommandReceipt[];
  readonly rollovers: readonly SeasonRolloverSnapshot[];
  readonly clock: WorldClockSnapshot;
  readonly runtimeEpoch: number;
  readonly revision: number;
}

export interface SchedulingEnvelope {
  readonly scheduler: WorldSchedulerSnapshot;
}

export interface TaskExecutionContext {
  readonly gameWorldId: GameWorldId;
  readonly taskId: string;
  readonly idempotencyKey: string;
  readonly fencingToken: number;
  readonly worldDate: string;
  readonly dueOn: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export type ScheduledTaskHandler = (
  context: TaskExecutionContext,
) => Promise<void>;

export interface TaskExecutionReport {
  readonly taskId: string;
  readonly type: string;
  readonly status: "COMPLETED" | "FAILED";
  readonly attempts: number;
  readonly error?: string;
  readonly emittedEvents?: readonly Readonly<{
    type: "SeasonStarted" | "SeasonDue";
    payload: Readonly<Record<string, unknown>>;
  }>[];
}
