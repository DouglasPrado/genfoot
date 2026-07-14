import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type SanctionId = EntityId<"Sanction">;
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

export type AdminDomainEvent =
  | RiskThresholdReachedEvent
  | SanctionActivatedEvent
  | SanctionReversedEvent;

export interface WorldAdminSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly policyVersion: string;
  readonly riskThreshold: number;
  readonly severeThreshold: number;
  readonly signals: readonly RiskSignalSnapshot[];
  readonly assessments: readonly RiskAssessmentSnapshot[];
  readonly sanctions: readonly SanctionSnapshot[];
  readonly auditChain: readonly AuditEventSnapshot[];
  readonly events: readonly AdminDomainEvent[];
  readonly revision: number;
}

export interface AdminSummary {
  readonly signalCount: number;
  readonly flaggedSubjectCount: number;
  readonly activeSanctionCount: number;
  readonly auditChainLength: number;
}
