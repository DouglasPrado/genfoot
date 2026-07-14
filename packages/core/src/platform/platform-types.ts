export const HealthState = {
  HEALTHY: "HEALTHY",
  DEGRADED: "DEGRADED",
  READ_ONLY: "READ_ONLY",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type HealthState = (typeof HealthState)[keyof typeof HealthState];

export const DependencyStatus = {
  UP: "UP",
  DEGRADED: "DEGRADED",
  DOWN: "DOWN",
} as const;

export type DependencyStatus =
  (typeof DependencyStatus)[keyof typeof DependencyStatus];

export const SloComparator = {
  /** Observado deve ficar <= alvo (ex.: latência, taxa de erro). */
  AT_MOST: "AT_MOST",
  /** Observado deve ficar >= alvo (ex.: disponibilidade). */
  AT_LEAST: "AT_LEAST",
} as const;

export type SloComparator =
  (typeof SloComparator)[keyof typeof SloComparator];

export const CommandCriticality = {
  CRITICAL: "CRITICAL",
  SAFE_QUERY: "SAFE_QUERY",
} as const;

export type CommandCriticality =
  (typeof CommandCriticality)[keyof typeof CommandCriticality];

export const DeploymentStatus = {
  PLANNED: "PLANNED",
  CANARY: "CANARY",
  ROLLING_OUT: "ROLLING_OUT",
  COMPLETE: "COMPLETE",
  ROLLED_BACK: "ROLLED_BACK",
  FAILED: "FAILED",
} as const;

export type DeploymentStatus =
  (typeof DeploymentStatus)[keyof typeof DeploymentStatus];

export const DeploymentSignal = {
  PROMOTE_CANARY: "PROMOTE_CANARY",
  START_ROLLOUT: "START_ROLLOUT",
  COMPLETE: "COMPLETE",
  ROLLBACK: "ROLLBACK",
  FAIL: "FAIL",
} as const;

export type DeploymentSignal =
  (typeof DeploymentSignal)[keyof typeof DeploymentSignal];

export interface DependencyHealth {
  readonly name: string;
  readonly status: DependencyStatus;
  readonly critical: boolean;
}

export interface RestoreEvaluation {
  readonly withinObjectives: boolean;
  readonly rpoOk: boolean;
  readonly rtoOk: boolean;
  readonly integrityOk: boolean;
}
