import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

import type { ClubId } from "../genesis/genesis-types.js";

export type InfrastructureProjectId = EntityId<"InfrastructureProject">;

export const INFRASTRUCTURE_PROJECT_STEPS = [
  "APPROVE",
  "FINANCE",
  "EXECUTE_MILESTONES",
  "LICENSE",
  "OPERATE",
] as const;
export type InfrastructureProjectStepId =
  (typeof INFRASTRUCTURE_PROJECT_STEPS)[number];

export const InfrastructureProjectStatus = {
  CREATED: "CREATED",
  RUNNING: "RUNNING",
  WAITING: "WAITING",
  COMPENSATING: "COMPENSATING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
} as const;
export type InfrastructureProjectStatus =
  (typeof InfrastructureProjectStatus)[keyof typeof InfrastructureProjectStatus];

export const InfrastructureProjectStepStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  WAITING: "WAITING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  COMPENSATED: "COMPENSATED",
} as const;
export type InfrastructureProjectStepStatus =
  (typeof InfrastructureProjectStepStatus)[keyof typeof InfrastructureProjectStepStatus];

export const InfrastructureMilestoneStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type InfrastructureMilestoneStatus =
  (typeof InfrastructureMilestoneStatus)[keyof typeof InfrastructureMilestoneStatus];

export interface InfrastructureProjectTarget {
  readonly kind: "STADIUM_CAPACITY" | "DEPARTMENT_LEVEL";
  readonly reference: string;
  readonly targetValue: number;
}

export interface InfrastructureMilestoneInput {
  readonly id: string;
  readonly name: string;
  readonly dueOn: string;
  readonly amountMinor: number;
}

export interface InfrastructureMilestoneSnapshot extends InfrastructureMilestoneInput {
  readonly status: InfrastructureMilestoneStatus;
  readonly disbursementFactRef: string | null;
  readonly completedAt: string | null;
}

export interface InfrastructureProjectStepSnapshot {
  readonly stepId: InfrastructureProjectStepId;
  readonly status: InfrastructureProjectStepStatus;
  readonly attempts: number;
  readonly fencingToken: number | null;
  readonly lastError: string | null;
  readonly evidence: Readonly<Record<string, unknown>> | null;
  readonly completedAt: string | null;
}

export interface InfrastructureInspection {
  readonly approved: boolean;
  readonly inspectionRef: string | null;
}

export interface InfrastructureProjectSnapshot {
  readonly id: InfrastructureProjectId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: ClubId;
  readonly rulesetVersion: RulesetVersion;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly actorId: string;
  readonly proposedAt: string;
  readonly status: InfrastructureProjectStatus;
  readonly target: InfrastructureProjectTarget;
  readonly fundingRequestRef: string;
  readonly financingEvidence: Readonly<Record<string, unknown>> | null;
  readonly milestones: readonly InfrastructureMilestoneSnapshot[];
  readonly inspection: InfrastructureInspection | null;
  readonly currentStepIndex: number;
  readonly steps: readonly InfrastructureProjectStepSnapshot[];
  readonly maxAttemptsPerStep: number;
  readonly leaseOwnerId: string | null;
  readonly leaseExpiresAtMs: number | null;
  readonly fencingToken: number;
  readonly compensationEvidence: Readonly<Record<string, unknown>> | null;
  readonly version: number;
}

export type CreateInfrastructureProjectInput = Omit<
  InfrastructureProjectSnapshot,
  | "status"
  | "financingEvidence"
  | "inspection"
  | "currentStepIndex"
  | "steps"
  | "leaseOwnerId"
  | "leaseExpiresAtMs"
  | "fencingToken"
  | "compensationEvidence"
  | "version"
  | "milestones"
> &
  Readonly<{ milestones: readonly InfrastructureMilestoneInput[] }>;

export interface InfrastructureProjectStepContext {
  readonly projectId: InfrastructureProjectId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: ClubId;
  readonly stepId: InfrastructureProjectStepId;
  readonly stepNumber: number;
  readonly idempotencyKey: string;
  readonly fencingToken: number;
  readonly rulesetVersion: RulesetVersion;
}

export interface InfrastructureMilestoneContext extends InfrastructureProjectStepContext {
  readonly milestone: InfrastructureMilestoneSnapshot;
}

export interface InfrastructureFinancingPort {
  reserve(
    context: InfrastructureProjectStepContext,
  ): Promise<Readonly<Record<string, string>>>;
  disburseMilestone(
    context: InfrastructureMilestoneContext,
  ): Promise<Readonly<Record<string, string>>>;
  releaseRemainder(
    context: InfrastructureProjectStepContext,
  ): Promise<Readonly<Record<string, string>>>;
}

export interface InfrastructureLicensingPort {
  inspect(
    context: InfrastructureProjectStepContext,
  ): Promise<Readonly<{ approved: boolean; inspectionRef: string }>>;
}
