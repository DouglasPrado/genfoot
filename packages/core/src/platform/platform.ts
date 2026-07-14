import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  CommandCriticality,
  DependencyStatus,
  DeploymentSignal,
  DeploymentStatus,
  HealthState,
  SloComparator,
  type DependencyHealth,
  type RestoreEvaluation,
} from "./platform-types.js";

/** Avalia um SLO: retorna se o observado violou o alvo conforme o comparador. */
export function evaluateSlo(
  input: Readonly<{
    observed: number;
    target: number;
    comparator: SloComparator;
  }>,
): { readonly breached: boolean } {
  const breached =
    input.comparator === SloComparator.AT_MOST
      ? input.observed > input.target
      : input.observed < input.target;
  return { breached };
}

/**
 * Agrega a saúde das dependências em um estado global. Dependência crítica DOWN
 * torna o serviço UNAVAILABLE; risco de integridade força READ_ONLY; degradações
 * viram DEGRADED; caso contrário HEALTHY.
 */
export function aggregateHealth(
  dependencies: readonly DependencyHealth[],
  integrityAtRisk = false,
): HealthState {
  const criticalDown = dependencies.some(
    (dep) => dep.critical && dep.status === DependencyStatus.DOWN,
  );
  if (criticalDown) return HealthState.UNAVAILABLE;
  if (integrityAtRisk) return HealthState.READ_ONLY;
  const anyDegraded = dependencies.some(
    (dep) =>
      dep.status === DependencyStatus.DEGRADED ||
      dep.status === DependencyStatus.DOWN,
  );
  return anyDegraded ? HealthState.DEGRADED : HealthState.HEALTHY;
}

/**
 * Política de admissão de command por estado de saúde: READ_ONLY bloqueia
 * commands críticos mas mantém queries seguras; UNAVAILABLE bloqueia tudo.
 */
export function isCommandAllowed(
  health: HealthState,
  criticality: CommandCriticality,
): boolean {
  switch (health) {
    case HealthState.HEALTHY:
    case HealthState.DEGRADED:
      return true;
    case HealthState.READ_ONLY:
      return criticality === CommandCriticality.SAFE_QUERY;
    default:
      return false;
  }
}

/**
 * Avalia um exercício de restore/DR contra RPO/RTO e integridade. Só libera se
 * os checks passam e RPO/RTO observados ficam dentro dos objetivos.
 */
export function evaluateRestore(
  input: Readonly<{
    observedRpoMinutes: number;
    observedRtoMinutes: number;
    targetRpoMinutes: number;
    targetRtoMinutes: number;
    integrityChecksPassed: boolean;
  }>,
): Result<RestoreEvaluation, DomainError> {
  if (!input.integrityChecksPassed) {
    return fail(
      new DomainError(
        "BACKUP_INVALID",
        "Os checks de integridade do restore falharam.",
      ),
    );
  }
  const rpoOk = input.observedRpoMinutes <= input.targetRpoMinutes;
  const rtoOk = input.observedRtoMinutes <= input.targetRtoMinutes;
  if (!rpoOk || !rtoOk) {
    return fail(
      new DomainError(
        "RPO_RTO_MISSED",
        "RPO/RTO observados excederam os objetivos.",
        {
          observedRpoMinutes: input.observedRpoMinutes,
          observedRtoMinutes: input.observedRtoMinutes,
        },
      ),
    );
  }
  return succeed({ withinObjectives: true, rpoOk, rtoOk, integrityOk: true });
}

/** Máquina de estado do deployment progressivo com rollback seguro. */
export function advanceDeployment(
  status: DeploymentStatus,
  signal: DeploymentSignal,
): Result<DeploymentStatus, DomainError> {
  const invalid = (): Result<DeploymentStatus, DomainError> =>
    fail(
      new DomainError(
        "INVALID_DEPLOYMENT_TRANSITION",
        "Transição de deployment inválida.",
        { status, signal },
      ),
    );
  if (signal === DeploymentSignal.FAIL) {
    return status === DeploymentStatus.COMPLETE
      ? invalid()
      : succeed(DeploymentStatus.FAILED);
  }
  if (signal === DeploymentSignal.ROLLBACK) {
    return status === DeploymentStatus.CANARY ||
      status === DeploymentStatus.ROLLING_OUT
      ? succeed(DeploymentStatus.ROLLED_BACK)
      : invalid();
  }
  switch (signal) {
    case DeploymentSignal.PROMOTE_CANARY:
      return status === DeploymentStatus.PLANNED
        ? succeed(DeploymentStatus.CANARY)
        : invalid();
    case DeploymentSignal.START_ROLLOUT:
      return status === DeploymentStatus.CANARY
        ? succeed(DeploymentStatus.ROLLING_OUT)
        : invalid();
    case DeploymentSignal.COMPLETE:
      return status === DeploymentStatus.ROLLING_OUT
        ? succeed(DeploymentStatus.COMPLETE)
        : invalid();
    default:
      return invalid();
  }
}
