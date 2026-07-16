export const CommandTrackingStatus = {
  DRAFT: "DRAFT",
  SUBMITTING: "SUBMITTING",
  ACCEPTED: "ACCEPTED",
  APPLIED: "APPLIED",
  REJECTED: "REJECTED",
  UNKNOWN_RECOVERING: "UNKNOWN_RECOVERING",
} as const;

export type CommandTrackingStatus =
  (typeof CommandTrackingStatus)[keyof typeof CommandTrackingStatus];

export const CommandTrackingSignal = {
  SUBMIT: "SUBMIT",
  ACCEPT: "ACCEPT",
  APPLY: "APPLY",
  REJECT: "REJECT",
  TIMEOUT: "TIMEOUT",
} as const;

export type CommandTrackingSignal =
  (typeof CommandTrackingSignal)[keyof typeof CommandTrackingSignal];

export const RealtimeApply = {
  APPLIED: "APPLIED",
  DUPLICATE: "DUPLICATE",
  GAP: "GAP",
} as const;

export type RealtimeApply = (typeof RealtimeApply)[keyof typeof RealtimeApply];

export const RealtimeRecoveryStatus = {
  CONNECTING: "CONNECTING",
  LIVE: "LIVE",
  GAP: "GAP",
  RECOVERING: "RECOVERING",
  OFFLINE: "OFFLINE",
} as const;

export type RealtimeRecoveryStatus =
  (typeof RealtimeRecoveryStatus)[keyof typeof RealtimeRecoveryStatus];

export interface ClientRealtimeCursorSnapshot {
  readonly status: RealtimeRecoveryStatus;
  readonly lastSequence: number;
}

export const OfflineIntentStatus = {
  QUEUED: "QUEUED",
  SUBMITTED: "SUBMITTED",
  EXPIRED: "EXPIRED",
} as const;

export type OfflineIntentStatus =
  (typeof OfflineIntentStatus)[keyof typeof OfflineIntentStatus];

export interface RealtimeApplyResult {
  readonly result: RealtimeApply;
  readonly lastSequence: number;
}

export interface OfflineIntent {
  readonly id: string;
  readonly commandType: string;
  readonly idempotencyKey: string;
  readonly createdOn: string;
  readonly expiresOn: string;
  readonly status: OfflineIntentStatus;
}
