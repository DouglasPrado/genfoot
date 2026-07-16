import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";
import { stableHash } from "../matches/match-kernel.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import {
  ExecutionStatus,
  RuleStatus,
  type AutomationControllerRef,
  type AutomationDomainEvent,
  type AutomationRuleId,
  type DecisionId,
  type AutomationExecutionSnapshot,
  type AutomationRuleActivatedEvent,
  type AutomationRuleSnapshot,
  type AutomationSummary,
  type DecisionOption,
  type DecisionProposalSnapshot,
  type DecisionProposedEvent,
  type WorldAutomationSnapshot,
} from "./automation-types.js";

const DEFAULT_RISK_THRESHOLD = 50;

export interface DecisionExplanation {
  readonly decisionId: DecisionId;
  readonly ruleId: AutomationRuleId;
  readonly chosenCommand: string;
  readonly chosenScore: number;
  readonly factors: readonly string[];
  readonly alternatives: readonly DecisionOption[];
  readonly asOf: string;
}

export class WorldAutomation {
  private constructor(private state: WorldAutomationSnapshot) {}

  public static initialize(
    world: GameWorldSnapshot,
  ): Result<WorldAutomation, DomainError> {
    return WorldAutomation.fromSnapshot({
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      rules: [],
      proposals: [],
      executions: [],
      events: [],
      revision: 1,
    });
  }

  public static fromSnapshot(
    snapshot: WorldAutomationSnapshot,
  ): Result<WorldAutomation, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidAutomation("A revisão da automação é inválida."));
    }
    const ruleIds = new Set<string>();
    for (const rule of snapshot.rules) {
      if (
        rule.gameWorldId !== snapshot.gameWorldId ||
        rule.scope.trim() === "" ||
        rule.validFrom > rule.validUntil ||
        ruleIds.has(rule.id) ||
        !Number.isSafeInteger(rule.version) ||
        rule.version < 1
      ) {
        return fail(invalidAutomation("Regra de automação inválida."));
      }
      ruleIds.add(rule.id);
    }
    const decisionIds = new Set<string>();
    for (const proposal of snapshot.proposals) {
      if (
        proposal.gameWorldId !== snapshot.gameWorldId ||
        !ruleIds.has(proposal.ruleId) ||
        decisionIds.has(proposal.id)
      ) {
        return fail(invalidAutomation("Proposta de decisão inválida."));
      }
      decisionIds.add(proposal.id);
    }
    for (const execution of snapshot.executions) {
      if (!decisionIds.has(execution.decisionId)) {
        return fail(invalidAutomation("Execução sem decisão válida."));
      }
    }
    for (const event of snapshot.events) {
      if (event.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidAutomation("Evento de automação inválido."));
      }
    }
    return succeed(new WorldAutomation(snapshot));
  }

  public createAutomationRule(
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
  ): Result<AutomationRuleSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.rules.find(
      (rule) => rule.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (
      input.scope.trim() === "" ||
      input.trigger.trim() === "" ||
      input.action.trim() === "" ||
      !inRange(input.risk) ||
      !Number.isSafeInteger(input.priority)
    ) {
      return fail(
        new DomainError(
          "INVALID_AUTOMATION_RULE",
          "Escopo, gatilho, ação, risco e prioridade devem ser válidos.",
        ),
      );
    }
    const validFrom = WorldDate.parse(input.validFrom);
    if (!validFrom.ok) return validFrom;
    const validUntil = WorldDate.parse(input.validUntil);
    if (!validUntil.ok) return validUntil;
    if (validFrom.value.toString() > validUntil.value.toString()) {
      return fail(
        new DomainError("INVALID_AUTOMATION_RULE", "Vigência inválida."),
      );
    }
    const ruleId = deterministicUuidV7<"AutomationRule">({
      worldSeed: input.worldSeed,
      context: `automation-rule:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(validFrom.value.toString()),
    });
    const rule: AutomationRuleSnapshot = {
      id: ruleId,
      gameWorldId: this.state.gameWorldId,
      controllerId: input.controllerId,
      scope: input.scope.trim(),
      trigger: input.trigger.trim(),
      action: input.action.trim(),
      risk: input.risk,
      priority: input.priority,
      status: RuleStatus.DRAFT,
      validFrom: validFrom.value.toString(),
      validUntil: validUntil.value.toString(),
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    this.state = {
      ...this.state,
      rules: [...this.state.rules, rule],
      revision: this.state.revision + 1,
    };
    return succeed(rule);
  }

  public activateAutomationRule(
    input: RuleTransitionInput,
  ): Result<AutomationRuleSnapshot, DomainError> {
    return this.transitionRule(input, (rule) => {
      if (rule.status === RuleStatus.ACTIVE) return "NOOP";
      if (rule.status === RuleStatus.REVOKED || rule.status === RuleStatus.EXPIRED) {
        return "TERMINAL";
      }
      return RuleStatus.ACTIVE;
    });
  }

  public suspendAutomationRule(
    input: RuleTransitionInput,
  ): Result<AutomationRuleSnapshot, DomainError> {
    return this.transitionRule(input, (rule) => {
      if (rule.status === RuleStatus.SUSPENDED) return "NOOP";
      if (rule.status !== RuleStatus.ACTIVE) return "TERMINAL";
      return RuleStatus.SUSPENDED;
    });
  }

  public revokeAutomationRule(
    input: RuleTransitionInput,
  ): Result<AutomationRuleSnapshot, DomainError> {
    return this.transitionRule(input, (rule) => {
      if (rule.status === RuleStatus.REVOKED) return "NOOP";
      if (rule.status === RuleStatus.EXPIRED) return "TERMINAL";
      return RuleStatus.REVOKED;
    });
  }

  public evaluateDecision(
    input: Readonly<{
      ruleId: string;
      asOf: string;
      seedStream: string;
      options: readonly DecisionOption[];
      factors: readonly string[];
      humanPrecedenceActive?: boolean;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<DecisionProposalSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("DecisionProposed", input.idempotencyKey);
    if (replay !== undefined) {
      const proposal = this.state.proposals.find(
        ({ id }) => id === replay.decisionId,
      );
      if (proposal !== undefined) return succeed(proposal);
    }
    const rule = this.state.rules.find(({ id }) => id === input.ruleId);
    if (rule === undefined) return fail(ruleNotFound(input.ruleId));
    if (rule.status !== RuleStatus.ACTIVE) {
      return fail(
        new DomainError("RULE_NOT_ACTIVE", "A regra não está ativa.", {
          ruleId: rule.id,
        }),
      );
    }
    // Precedência humana: uma decisão humana recente conflitante bloqueia a automação.
    if (input.humanPrecedenceActive === true) {
      return fail(
        new DomainError(
          "HUMAN_PRECEDENCE",
          "Há uma decisão humana recente conflitante; a automação recua.",
          { ruleId: rule.id },
        ),
      );
    }
    // Filtro de conhecimento: só fatos autorizados entram na decisão.
    if (
      input.factors.some((factor) => factor.startsWith("HIDDEN:")) ||
      input.options.some((option) => option.commandDraft.startsWith("HIDDEN:"))
    ) {
      return fail(
        new DomainError(
          "KNOWLEDGE_FORBIDDEN",
          "A decisão referencia conhecimento oculto não autorizado.",
          { ruleId: rule.id },
        ),
      );
    }
    if (input.options.length === 0) {
      return fail(
        new DomainError(
          "NO_VALID_OPTION",
          "Nenhuma opção de decisão disponível.",
          { ruleId: rule.id },
        ),
      );
    }
    const asOf = WorldDate.parse(input.asOf);
    if (!asOf.ok) return asOf;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const ranked = [...input.options].sort((left, right) =>
      compareOptions(input.seedStream, left, right),
    );
    const chosen = ranked[0]!;
    const decisionId = deterministicUuidV7<"AutomationDecision">({
      worldSeed: input.worldSeed,
      context: `automation-decision:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(asOf.value.toString()),
    });
    const proposal: DecisionProposalSnapshot = {
      id: decisionId,
      gameWorldId: this.state.gameWorldId,
      ruleId: rule.id,
      asOf: asOf.value.toString(),
      seedStream: input.seedStream,
      chosenCommand: chosen.commandDraft,
      chosenScore: chosen.score,
      factors: [...input.factors],
      alternatives: ranked.slice(1),
      idempotencyKey: input.idempotencyKey,
    };
    const event: DecisionProposedEvent = {
      id: this.eventId(input.worldSeed, `decision-proposed:${input.idempotencyKey}`, date.value.toString()),
      type: "DecisionProposed",
      gameWorldId: this.state.gameWorldId,
      decisionId,
      ruleId: rule.id,
      chosenCommand: chosen.commandDraft,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      proposals: [...this.state.proposals, proposal],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(proposal);
  }

  public executeDecisionProposal(
    input: Readonly<{
      decisionId: string;
      accept: boolean;
      auto?: boolean;
      riskThreshold?: number;
      reason?: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<AutomationExecutionSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existingExecution = this.state.executions.find(
      (execution) => execution.decisionId === input.decisionId,
    );
    if (existingExecution !== undefined) return succeed(existingExecution);
    const proposal = this.state.proposals.find(
      ({ id }) => id === input.decisionId,
    );
    if (proposal === undefined) {
      return fail(
        new DomainError("DECISION_NOT_FOUND", "Decisão não encontrada.", {
          decisionId: input.decisionId,
        }),
      );
    }
    // Escopo de risco: a submissão automática só cobre ações de baixo risco;
    // alto risco permanece proposta pendente aguardando decisão humana.
    if (input.accept === true && input.auto === true) {
      const rule = this.state.rules.find(({ id }) => id === proposal.ruleId);
      const threshold = input.riskThreshold ?? DEFAULT_RISK_THRESHOLD;
      if (rule !== undefined && rule.risk > threshold) {
        return fail(
          new DomainError(
            "HIGH_RISK_REQUIRES_APPROVAL",
            "Ação de alto risco exige aprovação humana; a proposta fica pendente.",
            { decisionId: proposal.id, risk: rule.risk, threshold },
          ),
        );
      }
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const execution: AutomationExecutionSnapshot = {
      ruleId: proposal.ruleId,
      decisionId: proposal.id,
      commandDraft: proposal.chosenCommand,
      status: input.accept ? ExecutionStatus.SUBMITTED : ExecutionStatus.REJECTED,
      idempotencyKey: input.idempotencyKey,
    };
    const event: AutomationDomainEvent = input.accept
      ? {
          id: this.eventId(input.worldSeed, `decision-submitted:${input.idempotencyKey}`, date.value.toString()),
          type: "DecisionCommandSubmitted",
          gameWorldId: this.state.gameWorldId,
          decisionId: proposal.id,
          commandDraft: proposal.chosenCommand,
          worldDate: date.value.toString(),
          rulesetVersion: input.rulesetVersion,
          idempotencyKey: input.idempotencyKey,
        }
      : {
          id: this.eventId(input.worldSeed, `decision-rejected:${input.idempotencyKey}`, date.value.toString()),
          type: "DecisionRejected",
          gameWorldId: this.state.gameWorldId,
          decisionId: proposal.id,
          reason: input.reason?.trim() ?? "REJECTED",
          worldDate: date.value.toString(),
          rulesetVersion: input.rulesetVersion,
          idempotencyKey: input.idempotencyKey,
        };
    this.state = {
      ...this.state,
      executions: [...this.state.executions, execution],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(execution);
  }

  public disableOnControlChange(
    input: Readonly<{
      controllerId: AutomationControllerRef;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<number, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent(
      "AutomationDisabledOnControlChange",
      input.idempotencyKey,
    );
    if (replay !== undefined) return succeed(replay.disabledCount);
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    let disabledCount = 0;
    const rules = this.state.rules.map((rule) => {
      if (
        rule.controllerId === input.controllerId &&
        (rule.status === RuleStatus.ACTIVE || rule.status === RuleStatus.DRAFT)
      ) {
        disabledCount += 1;
        return { ...rule, status: RuleStatus.SUSPENDED, version: rule.version + 1 };
      }
      return rule;
    });
    const event: AutomationDomainEvent = {
      id: this.eventId(input.worldSeed, `automation-disabled:${input.idempotencyKey}`, date.value.toString()),
      type: "AutomationDisabledOnControlChange",
      gameWorldId: this.state.gameWorldId,
      controllerId: input.controllerId,
      disabledCount,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      rules,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(disabledCount);
  }

  public findRule(ruleId: string): AutomationRuleSnapshot | null {
    return this.state.rules.find(({ id }) => id === ruleId) ?? null;
  }

  /**
   * GetDecisionExplanation (read-only): expõe o porquê da decisão — comando escolhido,
   * fatores e alternativas — sem revelar conhecimento oculto (fatores HIDDEN: são filtrados).
   */
  public explainDecision(decisionId: string): DecisionExplanation | null {
    const proposal = this.state.proposals.find(({ id }) => id === decisionId);
    if (proposal === undefined) return null;
    return {
      decisionId: proposal.id,
      ruleId: proposal.ruleId,
      chosenCommand: proposal.chosenCommand,
      chosenScore: proposal.chosenScore,
      factors: proposal.factors.filter(
        (factor) => !factor.startsWith("HIDDEN:"),
      ),
      alternatives: proposal.alternatives.filter(
        (option) => !option.commandDraft.startsWith("HIDDEN:"),
      ),
      asOf: proposal.asOf,
    };
  }

  public summary(): AutomationSummary {
    return {
      ruleCount: this.state.rules.length,
      activeRuleCount: this.state.rules.filter(
        ({ status }) => status === RuleStatus.ACTIVE,
      ).length,
      proposalCount: this.state.proposals.length,
      executionCount: this.state.executions.length,
    };
  }

  public snapshot(): WorldAutomationSnapshot {
    return this.state;
  }

  private transitionRule(
    input: RuleTransitionInput,
    decide: (rule: AutomationRuleSnapshot) => RuleStatus | "NOOP" | "TERMINAL",
  ): Result<AutomationRuleSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.rules.findIndex(({ id }) => id === input.ruleId);
    if (index < 0) return fail(ruleNotFound(input.ruleId));
    const rule = this.state.rules[index]!;
    const decision = decide(rule);
    if (decision === "NOOP") return succeed(rule);
    if (decision === "TERMINAL") {
      return fail(
        new DomainError(
          "RULE_TRANSITION_INVALID",
          "Transição inválida para o estado atual da regra.",
          { ruleId: rule.id, status: rule.status },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const updated: AutomationRuleSnapshot = {
      ...rule,
      status: decision,
      version: rule.version + 1,
    };
    const rules = [...this.state.rules];
    rules[index] = updated;
    const events =
      decision === RuleStatus.ACTIVE
        ? [
            ...this.state.events,
            this.activatedEvent(input, rule.id, date.value.toString()),
          ]
        : this.state.events;
    this.state = {
      ...this.state,
      rules,
      events,
      revision: this.state.revision + 1,
    };
    return succeed(updated);
  }

  private activatedEvent(
    input: RuleTransitionInput,
    ruleId: AutomationRuleSnapshot["id"],
    worldDate: string,
  ): AutomationRuleActivatedEvent {
    return {
      id: this.eventId(input.worldSeed, `rule-activated:${input.idempotencyKey}`, worldDate),
      type: "AutomationRuleActivated",
      gameWorldId: this.state.gameWorldId,
      ruleId,
      worldDate,
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
  }

  private eventId(
    worldSeed: string,
    context: string,
    worldDate: string,
  ): AutomationDomainEvent["id"] {
    return deterministicUuidV7<"AutomationEvent">({
      worldSeed,
      context,
      timestampMilliseconds: timestampOf(worldDate),
    });
  }

  private findEvent<T extends AutomationDomainEvent["type"]>(
    type: T,
    idempotencyKey: string,
  ): Extract<AutomationDomainEvent, { type: T }> | undefined {
    return this.state.events.find(
      (event): event is Extract<AutomationDomainEvent, { type: T }> =>
        event.type === type && event.idempotencyKey === idempotencyKey,
    );
  }
}

interface RuleTransitionInput {
  readonly ruleId: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
  readonly worldSeed: string;
  readonly worldDate: string;
}

function compareOptions(
  seedStream: string,
  left: DecisionOption,
  right: DecisionOption,
): number {
  if (right.score !== left.score) return right.score - left.score;
  const leftHash = stableHash(`${seedStream}|${left.commandDraft}`);
  const rightHash = stableHash(`${seedStream}|${right.commandDraft}`);
  return leftHash < rightHash ? -1 : leftHash > rightHash ? 1 : 0;
}

function inRange(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 100;
}

function invalidAutomation(message: string): DomainError {
  return new DomainError("INVALID_AUTOMATION_STATE", message);
}

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente da automação.",
  );
}

function ruleNotFound(ruleId: string): DomainError {
  return new DomainError("AUTOMATION_RULE_NOT_FOUND", "Regra não encontrada.", {
    ruleId,
  });
}

