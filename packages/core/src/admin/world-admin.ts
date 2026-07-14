import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { stableHash } from "../matches/match-kernel.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import {
  AppealStatus,
  SanctionStatus,
  type AdminDomainEvent,
  type AdminSummary,
  type AuditEventSnapshot,
  type RiskAssessmentSnapshot,
  type RiskSignalSnapshot,
  type RiskThresholdReachedEvent,
  type SanctionActivatedEvent,
  type SanctionReversedEvent,
  type SanctionSnapshot,
  type WorldAdminSnapshot,
} from "./admin-types.js";

const DEFAULTS = {
  policyVersion: "risk-policy@1",
  riskThreshold: 70,
  severeThreshold: 70,
};

export class WorldAdmin {
  private constructor(private state: WorldAdminSnapshot) {}

  public static initialize(
    world: GameWorldSnapshot,
    options: Readonly<{
      policyVersion?: string;
      riskThreshold?: number;
      severeThreshold?: number;
    }> = {},
  ): Result<WorldAdmin, DomainError> {
    return WorldAdmin.fromSnapshot({
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      policyVersion: options.policyVersion ?? DEFAULTS.policyVersion,
      riskThreshold: options.riskThreshold ?? DEFAULTS.riskThreshold,
      severeThreshold: options.severeThreshold ?? DEFAULTS.severeThreshold,
      signals: [],
      assessments: [],
      sanctions: [],
      auditChain: [],
      events: [],
      revision: 1,
    });
  }

  public static fromSnapshot(
    snapshot: WorldAdminSnapshot,
  ): Result<WorldAdmin, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidAdmin("A revisão do admin é inválida."));
    }
    const dedupKeys = new Set<string>();
    for (const signal of snapshot.signals) {
      if (dedupKeys.has(signal.dedupKey)) {
        return fail(invalidAdmin("Sinal de risco duplicado."));
      }
      dedupKeys.add(signal.dedupKey);
    }
    if (!verifyChain(snapshot.auditChain)) {
      return fail(
        new DomainError("AUDIT_CHAIN_INVALID", "A cadeia de auditoria é inválida."),
      );
    }
    for (const event of snapshot.events) {
      if (event.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidAdmin("Evento de admin inválido."));
      }
    }
    return succeed(new WorldAdmin(snapshot));
  }

  public recordRiskSignal(
    input: Readonly<{
      dedupKey: string;
      subject: string;
      kind: string;
      weight: number;
      source: string;
      observedOn: string;
      actor: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<RiskAssessmentSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existingSignal = this.state.signals.find(
      (signal) => signal.dedupKey === input.dedupKey,
    );
    if (existingSignal !== undefined) {
      return succeed(this.assessmentFor(existingSignal.subject));
    }
    if (
      input.subject.trim() === "" ||
      !Number.isSafeInteger(input.weight) ||
      input.weight < 0 ||
      input.weight > 100
    ) {
      return fail(
        new DomainError("INVALID_RISK_SIGNAL", "Subject/weight inválidos."),
      );
    }
    const observedOn = WorldDate.parse(input.observedOn);
    if (!observedOn.ok) return observedOn;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const signal: RiskSignalSnapshot = {
      dedupKey: input.dedupKey,
      subject: input.subject,
      kind: input.kind,
      weight: input.weight,
      source: input.source,
      observedOn: observedOn.value.toString(),
    };
    const signals = [...this.state.signals, signal];
    const subjectSignals = signals.filter((s) => s.subject === input.subject);
    const score = clampScore(
      subjectSignals.reduce((sum, s) => sum + s.weight, 0),
    );
    const wasFlagged = this.assessmentFor(input.subject).flagged;
    const flagged = score >= this.state.riskThreshold;
    const assessment: RiskAssessmentSnapshot = {
      subject: input.subject,
      policyVersion: this.state.policyVersion,
      score,
      factors: subjectSignals.map((s) => `${s.kind}:${s.weight}`),
      flagged,
    };
    const audit = this.appendAudit(input.actor, "RECORD_RISK_SIGNAL", input.subject);
    const events =
      flagged && !wasFlagged
        ? [
            ...this.state.events,
            this.thresholdEvent(input, input.subject, score, date.value.toString()),
          ]
        : this.state.events;
    this.state = {
      ...this.state,
      signals,
      assessments: this.upsertAssessment(assessment),
      auditChain: audit,
      events,
      revision: this.state.revision + 1,
    };
    return succeed(assessment);
  }

  public proposeSanction(
    input: Readonly<{
      subject: string;
      sanctionType: string;
      severity: number;
      basis: string;
      evidenceRefs: readonly string[];
      proposedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<SanctionSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.sanctions.find(
      (sanction) => sanction.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (
      input.subject.trim() === "" ||
      input.proposedBy.trim() === "" ||
      !clampable(input.severity)
    ) {
      return fail(new DomainError("INVALID_SANCTION", "Dados de sanção inválidos."));
    }
    if (input.severity >= this.state.severeThreshold && input.evidenceRefs.length === 0) {
      return fail(
        new DomainError(
          "EVIDENCE_INSUFFICIENT",
          "Sanções graves exigem evidência.",
          { subject: input.subject, severity: input.severity },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const sanctionId = deterministicUuidV7<"Sanction">({
      worldSeed: input.worldSeed,
      context: `sanction:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const sanction: SanctionSnapshot = {
      id: sanctionId,
      gameWorldId: this.state.gameWorldId,
      subject: input.subject,
      sanctionType: input.sanctionType,
      severity: input.severity,
      basis: input.basis,
      evidenceRefs: [...input.evidenceRefs],
      proposedBy: input.proposedBy,
      approvedBy: null,
      status: SanctionStatus.PROPOSED,
      appealStatus: AppealStatus.NONE,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    this.state = {
      ...this.state,
      sanctions: [...this.state.sanctions, sanction],
      auditChain: this.appendAudit(input.proposedBy, "PROPOSE_SANCTION", sanctionId),
      revision: this.state.revision + 1,
    };
    return succeed(sanction);
  }

  public approveSanction(
    input: Readonly<{
      sanctionId: string;
      approvedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<SanctionSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.sanctions.findIndex(
      ({ id }) => id === input.sanctionId,
    );
    if (index < 0) return fail(sanctionNotFound(input.sanctionId));
    const sanction = this.state.sanctions[index]!;
    if (sanction.status === SanctionStatus.ACTIVE) return succeed(sanction);
    if (sanction.status !== SanctionStatus.PROPOSED) {
      return fail(
        new DomainError("SANCTION_TERMINAL", "Sanção não está proposta.", {
          sanctionId: sanction.id,
        }),
      );
    }
    if (input.approvedBy.trim() === "" || input.approvedBy === sanction.proposedBy) {
      return fail(
        new DomainError(
          "SEGREGATION_CONFLICT",
          "A aprovação exige um segundo revisor (quatro olhos).",
          { sanctionId: sanction.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const activated: SanctionSnapshot = {
      ...sanction,
      approvedBy: input.approvedBy,
      status: SanctionStatus.ACTIVE,
      version: sanction.version + 1,
    };
    const sanctions = [...this.state.sanctions];
    sanctions[index] = activated;
    const event: SanctionActivatedEvent = {
      id: this.eventId(input.worldSeed, `sanction-activated:${input.idempotencyKey}`, date.value.toString()),
      type: "SanctionActivated",
      gameWorldId: this.state.gameWorldId,
      sanctionId: sanction.id,
      subject: sanction.subject,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      sanctions,
      auditChain: this.appendAudit(input.approvedBy, "APPROVE_SANCTION", sanction.id),
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(activated);
  }

  public fileAppeal(
    input: Readonly<{
      sanctionId: string;
      grounds: string;
      appellant: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<SanctionSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.sanctions.findIndex(
      ({ id }) => id === input.sanctionId,
    );
    if (index < 0) return fail(sanctionNotFound(input.sanctionId));
    const sanction = this.state.sanctions[index]!;
    if (sanction.status !== SanctionStatus.ACTIVE || sanction.appealStatus !== AppealStatus.NONE) {
      return fail(
        new DomainError("APPEAL_NOT_ALLOWED", "Não é possível recorrer neste estado.", {
          sanctionId: sanction.id,
        }),
      );
    }
    if (input.grounds.trim() === "") {
      return fail(new DomainError("INVALID_APPEAL", "Fundamentos obrigatórios."));
    }
    const sanctions = [...this.state.sanctions];
    sanctions[index] = { ...sanction, appealStatus: AppealStatus.FILED, version: sanction.version + 1 };
    this.state = {
      ...this.state,
      sanctions,
      auditChain: this.appendAudit(input.appellant, "FILE_APPEAL", sanction.id),
      revision: this.state.revision + 1,
    };
    return succeed(sanctions[index]!);
  }

  public decideAppeal(
    input: Readonly<{
      sanctionId: string;
      upheld: boolean;
      reviewer: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<SanctionSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.sanctions.findIndex(
      ({ id }) => id === input.sanctionId,
    );
    if (index < 0) return fail(sanctionNotFound(input.sanctionId));
    const sanction = this.state.sanctions[index]!;
    if (sanction.appealStatus !== AppealStatus.FILED) {
      return fail(
        new DomainError("APPEAL_NOT_ALLOWED", "Não há recurso pendente.", {
          sanctionId: sanction.id,
        }),
      );
    }
    if (input.reviewer === sanction.proposedBy || input.reviewer === sanction.approvedBy) {
      return fail(
        new DomainError(
          "SEGREGATION_CONFLICT",
          "O revisor do recurso deve ser independente.",
          { sanctionId: sanction.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const decided: SanctionSnapshot = {
      ...sanction,
      appealStatus: input.upheld ? AppealStatus.UPHELD : AppealStatus.REJECTED,
      status: input.upheld ? SanctionStatus.REVERSED : sanction.status,
      version: sanction.version + 1,
    };
    const sanctions = [...this.state.sanctions];
    sanctions[index] = decided;
    const events = input.upheld
      ? [
          ...this.state.events,
          this.reversedEvent(input, sanction.id, date.value.toString()),
        ]
      : this.state.events;
    this.state = {
      ...this.state,
      sanctions,
      auditChain: this.appendAudit(input.reviewer, "DECIDE_APPEAL", sanction.id),
      events,
      revision: this.state.revision + 1,
    };
    return succeed(decided);
  }

  public verifyAuditChain(): boolean {
    return verifyChain(this.state.auditChain);
  }

  public assessmentFor(subject: string): RiskAssessmentSnapshot {
    return (
      this.state.assessments.find((a) => a.subject === subject) ?? {
        subject,
        policyVersion: this.state.policyVersion,
        score: 0,
        factors: [],
        flagged: false,
      }
    );
  }

  public findSanction(sanctionId: string): SanctionSnapshot | null {
    return this.state.sanctions.find(({ id }) => id === sanctionId) ?? null;
  }

  public summary(): AdminSummary {
    return {
      signalCount: this.state.signals.length,
      flaggedSubjectCount: this.state.assessments.filter((a) => a.flagged).length,
      activeSanctionCount: this.state.sanctions.filter(
        ({ status }) => status === SanctionStatus.ACTIVE,
      ).length,
      auditChainLength: this.state.auditChain.length,
    };
  }

  public snapshot(): WorldAdminSnapshot {
    return this.state;
  }

  private appendAudit(
    actor: string,
    action: string,
    target: string,
  ): AuditEventSnapshot[] {
    const sequence = this.state.auditChain.length + 1;
    const prevHash =
      this.state.auditChain.at(-1)?.eventHash ?? "GENESIS";
    const eventHash = auditHash(sequence, actor, action, target, prevHash);
    return [
      ...this.state.auditChain,
      { sequence, actor, action, target, prevHash, eventHash },
    ];
  }

  private upsertAssessment(assessment: RiskAssessmentSnapshot) {
    const others = this.state.assessments.filter(
      (a) => a.subject !== assessment.subject,
    );
    return [...others, assessment];
  }

  private thresholdEvent(
    input: Readonly<{
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
    subject: string,
    score: number,
    worldDate: string,
  ): RiskThresholdReachedEvent {
    return {
      id: this.eventId(input.worldSeed, `risk-threshold:${input.idempotencyKey}`, worldDate),
      type: "RiskThresholdReached",
      gameWorldId: this.state.gameWorldId,
      subject,
      score,
      worldDate,
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
  }

  private reversedEvent(
    input: Readonly<{
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
    sanctionId: SanctionSnapshot["id"],
    worldDate: string,
  ): SanctionReversedEvent {
    return {
      id: this.eventId(input.worldSeed, `sanction-reversed:${input.idempotencyKey}`, worldDate),
      type: "SanctionReversed",
      gameWorldId: this.state.gameWorldId,
      sanctionId,
      worldDate,
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
  }

  private eventId(
    worldSeed: string,
    context: string,
    worldDate: string,
  ): AdminDomainEvent["id"] {
    return deterministicUuidV7<"AdminEvent">({
      worldSeed,
      context,
      timestampMilliseconds: timestampOf(worldDate),
    });
  }
}

function auditHash(
  sequence: number,
  actor: string,
  action: string,
  target: string,
  prevHash: string,
): string {
  return stableHash(`${sequence}|${actor}|${action}|${target}|${prevHash}`);
}

function verifyChain(chain: readonly AuditEventSnapshot[]): boolean {
  let prevHash = "GENESIS";
  for (let index = 0; index < chain.length; index += 1) {
    const entry = chain[index]!;
    if (entry.sequence !== index + 1 || entry.prevHash !== prevHash) return false;
    if (entry.eventHash !== auditHash(entry.sequence, entry.actor, entry.action, entry.target, entry.prevHash)) {
      return false;
    }
    prevHash = entry.eventHash;
  }
  return true;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampable(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function invalidAdmin(message: string): DomainError {
  return new DomainError("INVALID_ADMIN_STATE", message);
}

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente do admin.",
  );
}

function sanctionNotFound(sanctionId: string): DomainError {
  return new DomainError("SANCTION_NOT_FOUND", "Sanção não encontrada.", {
    sanctionId,
  });
}

function timestampOf(worldDate: string): number {
  return Date.parse(`${worldDate}T00:00:00.000Z`);
}
