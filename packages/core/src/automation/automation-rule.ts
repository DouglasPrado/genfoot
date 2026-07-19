import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { AutomationLevel } from "./automation-types.js";

/**
 * AutomationRule (X-001) — uma regra "se GATILHO então AÇÃO" que o clube liga.
 * O status segue o enum canônico; `version` é concorrência otimista E o cursor
 * do histórico (cada save congela uma `AutomationRuleVersion`).
 *
 * Duas invariantes vivem aqui e no caso de uso:
 * - **Alto risco não delegável**: risco ≥ HIGH_RISK rebaixa o nível a ASSISTED
 *   (a IA passa a SUGERIR, não executar) — canon "ações de alto risco rebaixadas
 *   a sugerir". É rebaixamento, não recusa.
 * - **Sem conflito de precedência** (no caso de uso, é cross-agregado): duas
 *   regras ativas do mesmo clube não podem disputar o mesmo gatilho na mesma
 *   prioridade.
 */
export const AutomationRuleStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  DISABLED: "DISABLED",
  ARCHIVED: "ARCHIVED",
} as const;

export type AutomationRuleStatus =
  (typeof AutomationRuleStatus)[keyof typeof AutomationRuleStatus];

/** A partir deste risco (1..5) a ação não é delegável — só sugerida. */
export const HIGH_RISK_THRESHOLD = 4;

export interface AutomationRuleSnapshot {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly name: string;
  readonly level: AutomationLevel;
  readonly status: AutomationRuleStatus;
  readonly triggerEvent: string;
  readonly condition: unknown;
  readonly action: unknown;
  readonly risk: number;
  readonly priority: number;
  readonly version: number;
}

export interface AutomationRuleConfig {
  readonly name: string;
  readonly level: AutomationLevel;
  readonly triggerEvent: string;
  readonly condition: unknown;
  readonly action: unknown;
  readonly risk: number;
  readonly priority: number;
}

export class AutomationRule {
  private constructor(private state: AutomationRuleSnapshot) {}

  /** Nasce em DRAFT, versão 1, com o nível já rebaixado se for de alto risco. */
  public static create(
    id: string,
    gameWorldId: string,
    clubId: string,
    config: AutomationRuleConfig,
  ): Result<AutomationRule, DomainError> {
    const problem = validateConfig(config);
    if (problem !== null) return fail(problem);
    return succeed(
      new AutomationRule({
        id,
        gameWorldId,
        clubId,
        status: AutomationRuleStatus.DRAFT,
        version: 1,
        ...applyConfig(config),
      }),
    );
  }

  public static fromSnapshot(
    snapshot: AutomationRuleSnapshot,
  ): Result<AutomationRule, DomainError> {
    if (snapshot.version < 1) {
      return fail(new DomainError("AUTOMATION_RULE_INVALID", "Versão inválida."));
    }
    return succeed(new AutomationRule(snapshot));
  }

  /** Reconfigura a regra: bump de versão, rebaixando alto risco. */
  public reconfigure(config: AutomationRuleConfig): Result<void, DomainError> {
    const problem = validateConfig(config);
    if (problem !== null) return fail(problem);
    this.state = {
      ...this.state,
      ...applyConfig(config),
      version: this.state.version + 1,
    };
    return succeed(undefined);
  }

  public activate(): Result<void, DomainError> {
    this.state = { ...this.state, status: AutomationRuleStatus.ACTIVE };
    return succeed(undefined);
  }

  public pause(): Result<void, DomainError> {
    if (this.state.status !== AutomationRuleStatus.ACTIVE) {
      return fail(
        new DomainError(
          "AUTOMATION_RULE_INVALID",
          "Só uma regra ativa pode ser pausada.",
        ),
      );
    }
    this.state = { ...this.state, status: AutomationRuleStatus.PAUSED };
    return succeed(undefined);
  }

  public snapshot(): AutomationRuleSnapshot {
    return this.state;
  }
}

/** Alto risco derruba o nível para ASSISTED (sugerir); o resto passa direto. */
function applyConfig(
  config: AutomationRuleConfig,
): Omit<
  AutomationRuleSnapshot,
  "id" | "gameWorldId" | "clubId" | "status" | "version"
> {
  const level =
    config.risk >= HIGH_RISK_THRESHOLD &&
    config.level === AutomationLevel.FULLY_AUTOMATED
      ? AutomationLevel.ASSISTED
      : config.level;
  return {
    name: config.name,
    level,
    triggerEvent: config.triggerEvent,
    condition: config.condition ?? null,
    action: config.action ?? null,
    risk: config.risk,
    priority: config.priority,
  };
}

function validateConfig(config: AutomationRuleConfig): DomainError | null {
  if (config.name.trim().length === 0 || config.triggerEvent.trim().length === 0) {
    return new DomainError(
      "AUTOMATION_RULE_INVALID",
      "Nome e gatilho são obrigatórios.",
    );
  }
  if (!Number.isInteger(config.risk) || config.risk < 1 || config.risk > 5) {
    return new DomainError(
      "AUTOMATION_RULE_INVALID",
      "O risco deve ser um inteiro de 1 a 5.",
    );
  }
  if (!Number.isInteger(config.priority) || config.priority < 0) {
    return new DomainError(
      "AUTOMATION_RULE_INVALID",
      "A prioridade deve ser um inteiro não-negativo.",
    );
  }
  return null;
}
