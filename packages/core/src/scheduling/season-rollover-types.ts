import type { GameWorldId, RulesetVersion } from "@grinta/shared";

export const SEASON_ROLLOVER_STEPS = [
  "FINISH_PENDING_MATCHES",
  "CLOSE_STANDINGS",
  "HOMOLOGATE_RESULTS",
  "DISTRIBUTE_AWARDS",
  "UPDATE_CLUB_REPUTATION",
  "UPDATE_PLAYER_REPUTATION",
  "APPLY_PLAYER_DEVELOPMENT",
  "PROCESS_PERSONAL_EVENTS",
  "PROCESS_LONG_INJURIES",
  "PROCESS_RETIREMENTS",
  "UPDATE_CONTRACTS",
  "REPRICE_MARKET",
  "GENERATE_CLUB_INTEREST",
  "CLOSE_CLUB_FINANCES",
  "UPDATE_BOARD_OBJECTIVES",
  "PROMOTE_YOUTH_PLAYERS",
  "GENERATE_YOUTH_CLASS",
  "GENERATE_NEXT_CALENDAR",
  "DEFINE_NEXT_EXPECTATIONS",
  "START_NEXT_SEASON",
] as const;

export type SeasonRolloverStepId = (typeof SEASON_ROLLOVER_STEPS)[number];

export const SeasonRolloverPhase = {
  REQUESTED: "REQUESTED",
  PREPARING: "PREPARING",
  VALIDATING: "VALIDATING",
  FREEZING_INPUTS: "FREEZING_INPUTS",
  CALCULATING: "CALCULATING",
  APPLYING_RESULTS: "APPLYING_RESULTS",
  VERIFYING: "VERIFYING",
  COMPLETED: "COMPLETED",
} as const;

export type SeasonRolloverPhase =
  (typeof SeasonRolloverPhase)[keyof typeof SeasonRolloverPhase];

export const SeasonRolloverStatus = {
  REQUESTED: "REQUESTED",
  RUNNING: "RUNNING",
  WAITING: "WAITING",
  COMPLETED: "COMPLETED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
} as const;

export type SeasonRolloverStatus =
  (typeof SeasonRolloverStatus)[keyof typeof SeasonRolloverStatus];

export const SeasonRolloverStepStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  WAITING: "WAITING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type SeasonRolloverStepStatus =
  (typeof SeasonRolloverStepStatus)[keyof typeof SeasonRolloverStepStatus];

export interface SeasonRolloverStepSnapshot {
  readonly stepId: SeasonRolloverStepId;
  readonly status: SeasonRolloverStepStatus;
  readonly attempts: number;
  readonly fencingToken: number | null;
  readonly lastError: string | null;
  readonly evidence: Readonly<Record<string, unknown>> | null;
  readonly completedAt: string | null;
}

export interface SeasonRolloverSnapshot {
  readonly id: string;
  readonly gameWorldId: GameWorldId;
  readonly seasonId: string;
  readonly nextSeason: Readonly<{
    id: string;
    number: number;
    name: string;
    startsOn: string;
    endsOn: string;
  }>;
  readonly rulesetVersion: RulesetVersion;
  readonly status: SeasonRolloverStatus;
  readonly phase: SeasonRolloverPhase;
  readonly currentStepIndex: number;
  readonly steps: readonly SeasonRolloverStepSnapshot[];
  readonly maxAttemptsPerStep: number;
  readonly leaseOwnerId: string | null;
  readonly leaseExpiresAtMs: number | null;
  readonly fencingToken: number;
  readonly verification: SeasonRolloverVerification | null;
  readonly revision: number;
}

export interface SeasonRolloverStepContext {
  readonly rolloverId: string;
  readonly gameWorldId: GameWorldId;
  readonly seasonId: string;
  readonly stepId: SeasonRolloverStepId;
  readonly stepNumber: number;
  readonly idempotencyKey: string;
  readonly fencingToken: number;
  readonly rulesetVersion: RulesetVersion;
}

export type SeasonRolloverStepResult = Readonly<{
  status: "COMPLETED" | "WAITING";
  evidence?: Readonly<Record<string, unknown>>;
}>;

export type SeasonRolloverStepHandler = (
  context: SeasonRolloverStepContext,
) => Promise<SeasonRolloverStepResult>;

export interface SeasonRolloverVerification {
  readonly standingsConsistent: boolean;
  readonly ledgerBalanced: boolean;
  readonly populationInBand: boolean;
  readonly evidence?: Readonly<Record<string, unknown>>;
}

export type SeasonRolloverVerifier = (
  snapshot: SeasonRolloverSnapshot,
) => Promise<SeasonRolloverVerification>;
