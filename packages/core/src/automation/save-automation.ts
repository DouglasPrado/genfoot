import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  AutomationRule,
  AutomationRuleStatus,
  type AutomationRuleConfig,
  type AutomationRuleSnapshot,
} from "./automation-rule.js";
import type {
  AutomationRepositories,
  AutomationRuleRepository,
  AutomationUnitOfWork,
} from "./automation-ports.js";

/**
 * SaveAutomation / ToggleAutomation (X-001). Uma regra por commit; cada save
 * congela uma versão (o adapter grava a `AutomationRuleVersion`). A invariante
 * de precedência é cross-agregado (depende das OUTRAS regras do clube), então
 * vive aqui, não no agregado.
 */
export interface SaveAutomationInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  /** id existente para atualizar; ausente = criar. */
  readonly ruleId?: string;
  /** Novo id, quando criar (a API o gera). */
  readonly newRuleId: string;
  readonly activate: boolean;
  readonly config: AutomationRuleConfig;
}

export class SaveAutomation {
  public constructor(private readonly unitOfWork: AutomationUnitOfWork) {}

  public execute(
    input: SaveAutomationInput,
  ): Promise<Result<{ ruleId: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const rules = repos.rules;
      let rule: AutomationRule;
      let ruleId: string;

      if (input.ruleId !== undefined) {
        const existing = await rules.findRuleById(
          input.gameWorldId,
          input.ruleId,
        );
        if (existing === null) {
          return fail(
            new DomainError("AUTOMATION_RULE_NOT_FOUND", "Regra não encontrada."),
          );
        }
        const loaded = AutomationRule.fromSnapshot(existing);
        if (!loaded.ok) return loaded;
        const reconfigured = loaded.value.reconfigure(input.config);
        if (!reconfigured.ok) return reconfigured;
        rule = loaded.value;
        ruleId = input.ruleId;
      } else {
        const created = AutomationRule.create(
          input.newRuleId,
          input.gameWorldId,
          input.clubId,
          input.config,
        );
        if (!created.ok) return created;
        rule = created.value;
        ruleId = input.newRuleId;
      }

      if (input.activate) {
        const activated = rule.activate();
        if (!activated.ok) return activated;
      }

      // Precedência: se a regra vai ficar ATIVA, nenhuma OUTRA ativa do clube
      // pode disputar o mesmo gatilho na mesma prioridade.
      const snapshot = rule.snapshot();
      if (snapshot.status === AutomationRuleStatus.ACTIVE) {
        const conflict = await findConflict(rules, input, snapshot, ruleId);
        if (conflict !== null) return fail(conflict);
      }

      await rules.saveRuleWithVersion(snapshot);
      return succeed({ ruleId });
    });
  }
}

export interface ToggleAutomationInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly ruleId: string;
  readonly activate: boolean;
}

export class ToggleAutomation {
  public constructor(private readonly unitOfWork: AutomationUnitOfWork) {}

  public execute(
    input: ToggleAutomationInput,
  ): Promise<Result<{ ruleId: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const rules = repos.rules;
      const existing = await rules.findRuleById(input.gameWorldId, input.ruleId);
      if (existing === null) {
        return fail(
          new DomainError("AUTOMATION_RULE_NOT_FOUND", "Regra não encontrada."),
        );
      }
      const loaded = AutomationRule.fromSnapshot(existing);
      if (!loaded.ok) return loaded;

      if (input.activate) {
        const activated = loaded.value.activate();
        if (!activated.ok) return activated;
        const conflict = await findConflict(
          rules,
          input,
          loaded.value.snapshot(),
          input.ruleId,
        );
        if (conflict !== null) return fail(conflict);
      } else {
        const paused = loaded.value.pause();
        if (!paused.ok) return paused;
      }

      await rules.saveRuleWithVersion(loaded.value.snapshot());
      return succeed({ ruleId: input.ruleId });
    });
  }
}

/** Devolve um erro de conflito se outra regra ativa disputa (gatilho, prioridade). */
async function findConflict(
  rules: AutomationRuleRepository,
  scope: { gameWorldId: string; clubId: string },
  snapshot: AutomationRuleSnapshot,
  ruleId: string,
): Promise<DomainError | null> {
  const active = await rules.activeRuleKeys(scope.gameWorldId, scope.clubId);
  const clash = active.some(
    (k) =>
      k.id !== ruleId &&
      k.triggerEvent === snapshot.triggerEvent &&
      k.priority === snapshot.priority,
  );
  return clash
    ? new DomainError(
        "AUTOMATION_CONFLICT",
        "Outra regra ativa já disputa este gatilho na mesma prioridade.",
      )
    : null;
}

class Rollback extends Error {
  public constructor(public readonly domainError: DomainError) {
    super(domainError.message);
  }
}

async function run<T>(
  unitOfWork: AutomationUnitOfWork,
  work: (
    repositories: AutomationRepositories,
  ) => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    return await unitOfWork.run(async (repositories) => {
      const result = await work(repositories);
      if (!result.ok) throw new Rollback(result.error);
      return result;
    });
  } catch (error) {
    if (error instanceof Rollback) return fail(error.domainError);
    throw error;
  }
}
