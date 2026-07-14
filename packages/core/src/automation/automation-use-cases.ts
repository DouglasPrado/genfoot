import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GameWorldSnapshot } from "../world/world-types.js";
import type { AutomationRepository } from "./automation-repository.js";
import type {
  AutomationControllerRef,
  AutomationExecutionSnapshot,
  AutomationRuleSnapshot,
  AutomationSummary,
  DecisionOption,
  DecisionProposalSnapshot,
  WorldAutomationSnapshot,
} from "./automation-types.js";
import { WorldAutomation } from "./world-automation.js";

async function loadAutomation(
  repository: AutomationRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldAutomation, DomainError>> {
  const snapshot = await repository.findAutomationByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "AUTOMATION_NOT_FOUND",
        "A automação do mundo ainda não foi inicializada.",
        { gameWorldId },
      ),
    );
  }
  return WorldAutomation.fromSnapshot(snapshot);
}

async function mutate<T>(
  repository: AutomationRepository,
  gameWorldId: GameWorldId,
  apply: (automation: WorldAutomation) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadAutomation(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.saveAutomation(loaded.value.snapshot(), expectedRevision);
  }
  return result;
}

interface RuleTransitionCommand {
  readonly ruleId: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
  readonly worldSeed: string;
  readonly worldDate: string;
}

export class InitializeAutomation {
  public constructor(private readonly repository: AutomationRepository) {}

  public async execute(
    world: GameWorldSnapshot,
  ): Promise<Result<WorldAutomationSnapshot, DomainError>> {
    const existing = await this.repository.findAutomationByWorldId(world.id);
    if (existing !== null) {
      const validated = WorldAutomation.fromSnapshot(existing);
      return validated.ok ? succeed(validated.value.snapshot()) : validated;
    }
    const created = WorldAutomation.initialize(world);
    if (!created.ok) return created;
    await this.repository.saveAutomation(created.value.snapshot(), null);
    return succeed(created.value.snapshot());
  }
}

export class CreateAutomationRule {
  public constructor(private readonly repository: AutomationRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      controllerId: AutomationControllerRef;
      scope: string;
      trigger: string;
      action: string;
      risk: number;
      priority: number;
      validFrom: string;
      validUntil: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<AutomationRuleSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (automation) =>
      automation.createAutomationRule(input),
    );
  }
}

export class ActivateAutomationRule {
  public constructor(private readonly repository: AutomationRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: RuleTransitionCommand,
  ): Promise<Result<AutomationRuleSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (automation) =>
      automation.activateAutomationRule(input),
    );
  }
}

export class SuspendAutomationRule {
  public constructor(private readonly repository: AutomationRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: RuleTransitionCommand,
  ): Promise<Result<AutomationRuleSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (automation) =>
      automation.suspendAutomationRule(input),
    );
  }
}

export class RevokeAutomationRule {
  public constructor(private readonly repository: AutomationRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: RuleTransitionCommand,
  ): Promise<Result<AutomationRuleSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (automation) =>
      automation.revokeAutomationRule(input),
    );
  }
}

export class EvaluateDecision {
  public constructor(private readonly repository: AutomationRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      ruleId: string;
      asOf: string;
      seedStream: string;
      options: readonly DecisionOption[];
      factors: readonly string[];
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<DecisionProposalSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (automation) =>
      automation.evaluateDecision(input),
    );
  }
}

export class ExecuteDecisionProposal {
  public constructor(private readonly repository: AutomationRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      decisionId: string;
      accept: boolean;
      reason?: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<AutomationExecutionSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (automation) =>
      automation.executeDecisionProposal(input),
    );
  }
}

export class DisableAutomationOnControlChange {
  public constructor(private readonly repository: AutomationRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      controllerId: AutomationControllerRef;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<number, DomainError>> {
    return mutate(this.repository, gameWorldId, (automation) =>
      automation.disableOnControlChange(input),
    );
  }
}

export class InspectAutomation {
  public constructor(private readonly repository: AutomationRepository) {}

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<AutomationSummary, DomainError>> {
    const loaded = await loadAutomation(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }
}
