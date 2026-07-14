import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type AutomationRuleId = EntityId<"AutomationRule">;
export type DecisionId = EntityId<"AutomationDecision">;
export type AutomationEventId = EntityId<"AutomationEvent">;
export type AutomationControllerRef = EntityId<"Club">;

export const RuleStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;

export type RuleStatus = (typeof RuleStatus)[keyof typeof RuleStatus];

export const ExecutionStatus = {
  SUBMITTED: "SUBMITTED",
  REJECTED: "REJECTED",
} as const;

export type ExecutionStatus =
  (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

export interface AutomationRuleSnapshot {
  readonly id: AutomationRuleId;
  readonly gameWorldId: GameWorldId;
  readonly controllerId: AutomationControllerRef;
  readonly scope: string;
  readonly trigger: string;
  readonly action: string;
  readonly risk: number;
  readonly priority: number;
  readonly status: RuleStatus;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface DecisionOption {
  readonly commandDraft: string;
  readonly score: number;
}

export interface DecisionProposalSnapshot {
  readonly id: DecisionId;
  readonly gameWorldId: GameWorldId;
  readonly ruleId: AutomationRuleId;
  readonly asOf: string;
  readonly seedStream: string;
  readonly chosenCommand: string;
  readonly chosenScore: number;
  readonly factors: readonly string[];
  readonly alternatives: readonly DecisionOption[];
  readonly idempotencyKey: string;
}

export interface AutomationExecutionSnapshot {
  readonly ruleId: AutomationRuleId;
  readonly decisionId: DecisionId;
  readonly commandDraft: string;
  readonly status: ExecutionStatus;
  readonly idempotencyKey: string;
}

export interface AutomationRuleActivatedEvent {
  readonly id: AutomationEventId;
  readonly type: "AutomationRuleActivated";
  readonly gameWorldId: GameWorldId;
  readonly ruleId: AutomationRuleId;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface DecisionProposedEvent {
  readonly id: AutomationEventId;
  readonly type: "DecisionProposed";
  readonly gameWorldId: GameWorldId;
  readonly decisionId: DecisionId;
  readonly ruleId: AutomationRuleId;
  readonly chosenCommand: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface DecisionCommandSubmittedEvent {
  readonly id: AutomationEventId;
  readonly type: "DecisionCommandSubmitted";
  readonly gameWorldId: GameWorldId;
  readonly decisionId: DecisionId;
  readonly commandDraft: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface DecisionRejectedEvent {
  readonly id: AutomationEventId;
  readonly type: "DecisionRejected";
  readonly gameWorldId: GameWorldId;
  readonly decisionId: DecisionId;
  readonly reason: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface AutomationDisabledOnControlChangeEvent {
  readonly id: AutomationEventId;
  readonly type: "AutomationDisabledOnControlChange";
  readonly gameWorldId: GameWorldId;
  readonly controllerId: AutomationControllerRef;
  readonly disabledCount: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type AutomationDomainEvent =
  | AutomationRuleActivatedEvent
  | DecisionProposedEvent
  | DecisionCommandSubmittedEvent
  | DecisionRejectedEvent
  | AutomationDisabledOnControlChangeEvent;

export interface WorldAutomationSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly rules: readonly AutomationRuleSnapshot[];
  readonly proposals: readonly DecisionProposalSnapshot[];
  readonly executions: readonly AutomationExecutionSnapshot[];
  readonly events: readonly AutomationDomainEvent[];
  readonly revision: number;
}

export interface AutomationSummary {
  readonly ruleCount: number;
  readonly activeRuleCount: number;
  readonly proposalCount: number;
  readonly executionCount: number;
}
