import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type StaffMemberId = EntityId<"StaffMember">;
export type StaffContractId = EntityId<"StaffContract">;
export type StaffAssignmentId = EntityId<"StaffAssignment">;
export type StaffEventId = EntityId<"StaffEvent">;
export type StaffClubRef = EntityId<"Club">;
export type StaffDepartmentRef = EntityId<"ClubDepartment">;

export const StaffRole = {
  HEAD_COACH: "HEAD_COACH",
  ASSISTANT_COACH: "ASSISTANT_COACH",
  FITNESS_COACH: "FITNESS_COACH",
  GOALKEEPING_COACH: "GOALKEEPING_COACH",
  PHYSIO: "PHYSIO",
  SCOUT: "SCOUT",
  DIRECTOR_OF_FOOTBALL: "DIRECTOR_OF_FOOTBALL",
} as const;

export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const StaffAvailability = {
  AVAILABLE: "AVAILABLE",
  ASSIGNED: "ASSIGNED",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type StaffAvailability =
  (typeof StaffAvailability)[keyof typeof StaffAvailability];

export const StaffContractStatus = {
  OFFERED: "OFFERED",
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
} as const;

export type StaffContractStatus =
  (typeof StaffContractStatus)[keyof typeof StaffContractStatus];

export interface StaffCapabilities {
  readonly coaching: number;
  readonly fitness: number;
  readonly medical: number;
  readonly scouting: number;
  readonly management: number;
}

export interface StaffMemberSnapshot {
  readonly id: StaffMemberId;
  readonly gameWorldId: GameWorldId;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: StaffRole;
  readonly capabilities: StaffCapabilities;
  readonly reputation: number;
  readonly availability: StaffAvailability;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface StaffContractSnapshot {
  readonly id: StaffContractId;
  readonly gameWorldId: GameWorldId;
  readonly staffId: StaffMemberId;
  readonly clubId: StaffClubRef;
  readonly role: StaffRole;
  readonly status: StaffContractStatus;
  readonly startOn: string;
  readonly endOn: string;
  readonly compensationRef: string;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface StaffAssignmentSnapshot {
  readonly id: StaffAssignmentId;
  readonly gameWorldId: GameWorldId;
  readonly contractId: StaffContractId;
  readonly staffId: StaffMemberId;
  readonly departmentRef: StaffDepartmentRef;
  readonly workload: number;
  readonly startOn: string;
  readonly endOn: string | null;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface StaffMemberCreatedEvent {
  readonly id: StaffEventId;
  readonly type: "StaffMemberCreated";
  readonly gameWorldId: GameWorldId;
  readonly staffId: StaffMemberId;
  readonly role: StaffRole;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface StaffContractActivatedEvent {
  readonly id: StaffEventId;
  readonly type: "StaffContractActivated";
  readonly gameWorldId: GameWorldId;
  readonly contractId: StaffContractId;
  readonly staffId: StaffMemberId;
  readonly clubId: StaffClubRef;
  readonly role: StaffRole;
  readonly startOn: string;
  readonly endOn: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface StaffAssignedEvent {
  readonly id: StaffEventId;
  readonly type: "StaffAssigned";
  readonly gameWorldId: GameWorldId;
  readonly assignmentId: StaffAssignmentId;
  readonly contractId: StaffContractId;
  readonly staffId: StaffMemberId;
  readonly departmentRef: StaffDepartmentRef;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface StaffContractEndedEvent {
  readonly id: StaffEventId;
  readonly type: "StaffContractEnded";
  readonly gameWorldId: GameWorldId;
  readonly contractId: StaffContractId;
  readonly staffId: StaffMemberId;
  readonly endedOn: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type StaffDomainEvent =
  | StaffMemberCreatedEvent
  | StaffContractActivatedEvent
  | StaffAssignedEvent
  | StaffContractEndedEvent;

export interface WorldStaffSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly members: readonly StaffMemberSnapshot[];
  readonly contracts: readonly StaffContractSnapshot[];
  readonly assignments: readonly StaffAssignmentSnapshot[];
  readonly events: readonly StaffDomainEvent[];
  readonly revision: number;
}

export interface StaffSummary {
  readonly memberCount: number;
  readonly activeContractCount: number;
  readonly assignmentCount: number;
  readonly eventCount: number;
}

export interface StaffCapabilitySnapshot {
  readonly staffId: StaffMemberId;
  readonly clubId: StaffClubRef;
  readonly role: StaffRole;
  readonly score: number;
  readonly confidence: number;
  readonly asOf: string;
  readonly rulesetVersion: RulesetVersion;
}
