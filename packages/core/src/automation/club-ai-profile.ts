import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  AutomationLevel,
  MAX_OFFLINE_LEVEL,
  MIN_OFFLINE_LEVEL,
  defaultOfflinePlan,
  type ClubAIProfileSnapshot,
  type OfflinePlan,
} from "./automation-types.js";

const MINOR_RE = /^\d+$/;

/**
 * ClubAIProfile (X-001) — o agregado que guarda o plano offline do clube. A IA
 * age dentro do que este plano autoriza (Resolução 27.10.5). As invariantes:
 *
 * - **Alto risco não é delegável** (INV do context map): mudar a identidade do
 *   clube nunca vai para a IA — `canChangeIdentity` tem de ser `false`.
 * - **Nível e profundidade são coerentes**: MANUAL não decide nada offline;
 *   FULLY_AUTOMATED decide o bastante para assumir o comando.
 */
export class ClubAIProfile {
  private constructor(private state: ClubAIProfileSnapshot) {}

  /** Nasce com o plano padrão: assessora, decide pouco, sem autoridade de risco. */
  public static default(
    gameWorldId: string,
    clubId: string,
  ): ClubAIProfile {
    return new ClubAIProfile({
      gameWorldId,
      clubId,
      plan: defaultOfflinePlan(),
    });
  }

  public static fromSnapshot(
    snapshot: ClubAIProfileSnapshot,
  ): Result<ClubAIProfile, DomainError> {
    const problem = validatePlan(snapshot.plan);
    if (problem !== null) return fail(problem);
    return succeed(new ClubAIProfile(snapshot));
  }

  /** Define o plano offline do clube, validando as invariantes de autoridade. */
  public setOfflinePlan(plan: OfflinePlan): Result<void, DomainError> {
    const problem = validatePlan(plan);
    if (problem !== null) return fail(problem);
    this.state = { ...this.state, plan };
    return succeed(undefined);
  }

  public snapshot(): ClubAIProfileSnapshot {
    return this.state;
  }
}

function validatePlan(plan: OfflinePlan): DomainError | null {
  // Alto risco não delegável: identidade é sempre do humano.
  if (plan.authorityLimits.canChangeIdentity) {
    return new DomainError(
      "AUTOMATION_HIGH_RISK_NOT_DELEGABLE",
      "Mudar a identidade do clube não pode ser delegado à automação.",
    );
  }

  if (
    !Number.isInteger(plan.offlineDecisionLevel) ||
    plan.offlineDecisionLevel < MIN_OFFLINE_LEVEL ||
    plan.offlineDecisionLevel > MAX_OFFLINE_LEVEL
  ) {
    return new DomainError(
      "OFFLINE_PLAN_INVALID",
      `A profundidade de decisão offline deve estar entre ${MIN_OFFLINE_LEVEL} e ${MAX_OFFLINE_LEVEL}.`,
    );
  }

  // Coerência nível × profundidade.
  if (
    plan.automationLevel === AutomationLevel.MANUAL &&
    plan.offlineDecisionLevel !== 0
  ) {
    return new DomainError(
      "OFFLINE_PLAN_INVALID",
      "No modo manual, a IA não decide nada offline (nível 0).",
    );
  }
  if (
    plan.automationLevel === AutomationLevel.FULLY_AUTOMATED &&
    plan.offlineDecisionLevel < 2
  ) {
    return new DomainError(
      "OFFLINE_PLAN_INVALID",
      "No modo totalmente automático, a IA precisa de profundidade de decisão ≥ 2.",
    );
  }

  const limits = [
    plan.authorityLimits.maxDebtMinor,
    plan.authorityLimits.maxTransferSpendMinor,
  ];
  if (!limits.every((v) => MINOR_RE.test(v))) {
    return new DomainError(
      "AUTHORITY_LIMIT_EXCEEDED",
      "Os limites de dinheiro devem ser inteiros não-negativos (minor units).",
    );
  }

  return null;
}
