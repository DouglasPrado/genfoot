import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type SanctionId = EntityId<"Sanction">;
export type AbuseCaseId = EntityId<"AbuseCase">;
export type QuarantineId = EntityId<"Quarantine">;
export type CorrectionRequestId = EntityId<"CorrectionRequest">;
export type SupportCaseId = EntityId<"SupportCase">;
export type ReprocessingRequestId = EntityId<"ReprocessingRequest">;
export type AdminEventId = EntityId<"AdminEvent">;

export const SanctionStatus = {
  PROPOSED: "PROPOSED",
  ACTIVE: "ACTIVE",
  REVERSED: "REVERSED",
  EXPIRED: "EXPIRED",
} as const;

export type SanctionStatus =
  (typeof SanctionStatus)[keyof typeof SanctionStatus];

export const AppealStatus = {
  NONE: "NONE",
  FILED: "FILED",
  UPHELD: "UPHELD",
  REJECTED: "REJECTED",
} as const;

export type AppealStatus = (typeof AppealStatus)[keyof typeof AppealStatus];

export const CaseStatus = {
  OPEN: "OPEN",
  INVESTIGATING: "INVESTIGATING",
  DECIDED: "DECIDED",
  CLOSED: "CLOSED",
} as const;

export type CaseStatus = (typeof CaseStatus)[keyof typeof CaseStatus];

export const QuarantineStatus = {
  ACTIVE: "ACTIVE",
  LIFTED: "LIFTED",
  EXPIRED: "EXPIRED",
} as const;

export type QuarantineStatus =
  (typeof QuarantineStatus)[keyof typeof QuarantineStatus];

export const CorrectionStatus = {
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  EXECUTED: "EXECUTED",
  REJECTED: "REJECTED",
  FAILED: "FAILED",
} as const;

export type CorrectionStatus =
  (typeof CorrectionStatus)[keyof typeof CorrectionStatus];

export const SupportStatus = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
} as const;

export type SupportStatus =
  (typeof SupportStatus)[keyof typeof SupportStatus];

export const ReprocessingStatus = {
  REQUESTED: "REQUESTED",
  COMPLETED: "COMPLETED",
} as const;

export type ReprocessingStatus =
  (typeof ReprocessingStatus)[keyof typeof ReprocessingStatus];

export interface RiskSignalSnapshot {
  readonly dedupKey: string;
  readonly subject: string;
  readonly kind: string;
  readonly weight: number;
  readonly source: string;
  readonly observedOn: string;
}

export interface RiskAssessmentSnapshot {
  readonly subject: string;
  readonly policyVersion: string;
  readonly score: number;
  readonly factors: readonly string[];
  readonly flagged: boolean;
}

export interface SanctionSnapshot {
  readonly id: SanctionId;
  readonly gameWorldId: GameWorldId;
  readonly subject: string;
  readonly sanctionType: string;
  readonly severity: number;
  readonly basis: string;
  readonly evidenceRefs: readonly string[];
  readonly proposedBy: string;
  readonly approvedBy: string | null;
  readonly status: SanctionStatus;
  readonly appealStatus: AppealStatus;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface AuditEventSnapshot {
  readonly sequence: number;
  readonly actor: string;
  readonly action: string;
  readonly target: string;
  readonly prevHash: string;
  readonly eventHash: string;
}

export interface AbuseCaseSnapshot {
  readonly id: AbuseCaseId;
  readonly gameWorldId: GameWorldId;
  readonly subjects: readonly string[];
  readonly severity: number;
  readonly status: CaseStatus;
  readonly evidenceRefs: readonly string[];
  readonly openedBy: string;
  readonly openedOn: string;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface QuarantineSnapshot {
  readonly id: QuarantineId;
  readonly gameWorldId: GameWorldId;
  readonly caseId: AbuseCaseId | null;
  readonly scope: string;
  readonly reason: string;
  readonly status: QuarantineStatus;
  readonly startsOn: string;
  readonly expiresOn: string;
  readonly placedBy: string;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface CorrectionRequestSnapshot {
  readonly id: CorrectionRequestId;
  readonly gameWorldId: GameWorldId;
  readonly targetOwner: string;
  readonly targetId: string;
  readonly targetVersion: number;
  readonly reasonCode: string;
  readonly expectedEffect: string;
  readonly requestedBy: string;
  readonly approvedBy: string | null;
  readonly status: CorrectionStatus;
  readonly compensatingFactRef: string | null;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface SupportCaseSnapshot {
  readonly id: SupportCaseId;
  readonly gameWorldId: GameWorldId;
  readonly requester: string;
  readonly category: string;
  readonly status: SupportStatus;
  readonly resolution: string | null;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface ReprocessingRequestSnapshot {
  readonly id: ReprocessingRequestId;
  readonly gameWorldId: GameWorldId;
  readonly stream: string;
  readonly fromSequence: number;
  readonly toSequence: number;
  readonly reason: string;
  readonly status: ReprocessingStatus;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface RiskThresholdReachedEvent {
  readonly id: AdminEventId;
  readonly type: "RiskThresholdReached";
  readonly gameWorldId: GameWorldId;
  readonly subject: string;
  readonly score: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface SanctionActivatedEvent {
  readonly id: AdminEventId;
  readonly type: "SanctionActivated";
  readonly gameWorldId: GameWorldId;
  readonly sanctionId: SanctionId;
  readonly subject: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface SanctionReversedEvent {
  readonly id: AdminEventId;
  readonly type: "SanctionReversed";
  readonly gameWorldId: GameWorldId;
  readonly sanctionId: SanctionId;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface CaseOpenedEvent {
  readonly id: AdminEventId;
  readonly type: "CaseOpened";
  readonly gameWorldId: GameWorldId;
  readonly caseId: AbuseCaseId;
  readonly severity: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface QuarantinePlacedEvent {
  readonly id: AdminEventId;
  readonly type: "QuarantinePlaced";
  readonly gameWorldId: GameWorldId;
  readonly quarantineId: QuarantineId;
  readonly scope: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface CorrectionApprovedEvent {
  readonly id: AdminEventId;
  readonly type: "CorrectionApproved";
  readonly gameWorldId: GameWorldId;
  readonly correctionId: CorrectionRequestId;
  readonly targetOwner: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface CorrectionExecutedEvent {
  readonly id: AdminEventId;
  readonly type: "CorrectionExecuted";
  readonly gameWorldId: GameWorldId;
  readonly correctionId: CorrectionRequestId;
  readonly targetOwner: string;
  readonly compensatingFactRef: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface AuditIntegrityFailedEvent {
  readonly id: AdminEventId;
  readonly type: "AuditIntegrityFailed";
  readonly gameWorldId: GameWorldId;
  readonly expectedHead: string;
  readonly actualHead: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface ReprocessingCompletedEvent {
  readonly id: AdminEventId;
  readonly type: "ReprocessingCompleted";
  readonly gameWorldId: GameWorldId;
  readonly reprocessingId: ReprocessingRequestId;
  readonly stream: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type AdminDomainEvent =
  | RiskThresholdReachedEvent
  | SanctionActivatedEvent
  | SanctionReversedEvent
  | CaseOpenedEvent
  | QuarantinePlacedEvent
  | CorrectionApprovedEvent
  | CorrectionExecutedEvent
  | AuditIntegrityFailedEvent
  | ReprocessingCompletedEvent;

export interface WorldAdminSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly policyVersion: string;
  readonly riskThreshold: number;
  readonly severeThreshold: number;
  readonly signals: readonly RiskSignalSnapshot[];
  readonly assessments: readonly RiskAssessmentSnapshot[];
  readonly sanctions: readonly SanctionSnapshot[];
  readonly cases?: readonly AbuseCaseSnapshot[];
  readonly quarantines?: readonly QuarantineSnapshot[];
  readonly corrections?: readonly CorrectionRequestSnapshot[];
  readonly supportCases?: readonly SupportCaseSnapshot[];
  readonly reprocessings?: readonly ReprocessingRequestSnapshot[];
  readonly auditChain: readonly AuditEventSnapshot[];
  readonly events: readonly AdminDomainEvent[];
  readonly revision: number;
}

export interface AdminSummary {
  readonly signalCount: number;
  readonly flaggedSubjectCount: number;
  readonly activeSanctionCount: number;
  readonly openCaseCount: number;
  readonly activeQuarantineCount: number;
  readonly executedCorrectionCount: number;
  readonly auditChainLength: number;
}
