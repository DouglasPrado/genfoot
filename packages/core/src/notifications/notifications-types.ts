import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type NotificationId = EntityId<"Notification">;
export type ReportArtifactId = EntityId<"ReportArtifact">;
export type NotificationEventId = EntityId<"NotificationEvent">;

export const NotificationPriority = {
  URGENT: "URGENT",
  HIGH: "HIGH",
  NORMAL: "NORMAL",
  LOW: "LOW",
} as const;

export type NotificationPriority =
  (typeof NotificationPriority)[keyof typeof NotificationPriority];

export const NotificationStatus = {
  OPEN: "OPEN",
  READ: "READ",
  DISMISSED: "DISMISSED",
  EXPIRED: "EXPIRED",
} as const;

export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

export interface NotificationSnapshot {
  readonly id: NotificationId;
  readonly gameWorldId: GameWorldId;
  readonly recipientScope: string;
  readonly category: string;
  readonly priority: NotificationPriority;
  readonly sourceRef: string;
  readonly dedupKey: string;
  readonly createdOn: string;
  readonly deadline: string | null;
  readonly status: NotificationStatus;
  readonly version: number;
}

export interface TimelineEntrySnapshot {
  readonly subject: string;
  readonly occurredOn: string;
  readonly factRef: string;
  readonly sequence: number;
}

export interface RecordSnapshot {
  readonly category: string;
  readonly holder: string;
  readonly value: number;
  readonly achievedOn: string;
  readonly factRef: string;
  readonly idempotencyKey: string;
}

export interface ReportArtifactSnapshot {
  readonly id: ReportArtifactId;
  readonly gameWorldId: GameWorldId;
  readonly definitionId: string;
  readonly version: string;
  readonly asOf: string;
  readonly sourceVersions: readonly string[];
  readonly reportHash: string;
  readonly idempotencyKey: string;
}

export interface NotificationCreatedEvent {
  readonly id: NotificationEventId;
  readonly type: "NotificationCreated";
  readonly gameWorldId: GameWorldId;
  readonly notificationId: NotificationId;
  readonly dedupKey: string;
  readonly priority: NotificationPriority;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface NotificationReadEvent {
  readonly id: NotificationEventId;
  readonly type: "NotificationRead";
  readonly gameWorldId: GameWorldId;
  readonly notificationId: NotificationId;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface DigestReadyEvent {
  readonly id: NotificationEventId;
  readonly type: "DigestReady";
  readonly gameWorldId: GameWorldId;
  readonly recipientScope: string;
  readonly itemCount: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface ReportGeneratedEvent {
  readonly id: NotificationEventId;
  readonly type: "ReportGenerated";
  readonly gameWorldId: GameWorldId;
  readonly reportId: ReportArtifactId;
  readonly reportHash: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface RecordEstablishedEvent {
  readonly id: NotificationEventId;
  readonly type: "RecordEstablished";
  readonly gameWorldId: GameWorldId;
  readonly category: string;
  readonly holder: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type NotificationDomainEvent =
  | NotificationCreatedEvent
  | NotificationReadEvent
  | DigestReadyEvent
  | ReportGeneratedEvent
  | RecordEstablishedEvent;

export interface DigestResult {
  readonly recipientScope: string;
  readonly itemIds: readonly NotificationId[];
}

export interface WorldInboxSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly notifications: readonly NotificationSnapshot[];
  readonly timeline: readonly TimelineEntrySnapshot[];
  readonly records: readonly RecordSnapshot[];
  readonly reports: readonly ReportArtifactSnapshot[];
  readonly events: readonly NotificationDomainEvent[];
  readonly revision: number;
}

export interface InboxSummary {
  readonly openNotificationCount: number;
  readonly timelineCount: number;
  readonly recordCount: number;
  readonly reportCount: number;
}
