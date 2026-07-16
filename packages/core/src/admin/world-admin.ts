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
  AppealStatus,
  CaseStatus,
  CorrectionStatus,
  QuarantineStatus,
  ReprocessingStatus,
  SanctionStatus,
  SupportStatus,
  type AbuseCaseSnapshot,
  type AdminDomainEvent,
  type AdminSummary,
  type AuditEventSnapshot,
  type AuditIntegrityFailedEvent,
  type CaseOpenedEvent,
  type CorrectionApprovedEvent,
  type CorrectionExecutedEvent,
  type CorrectionRequestSnapshot,
  type QuarantinePlacedEvent,
  type QuarantineSnapshot,
  type ReprocessingCompletedEvent,
  type ReprocessingRequestSnapshot,
  type RiskAssessmentSnapshot,
  type RiskSignalSnapshot,
  type RiskThresholdReachedEvent,
  type SanctionActivatedEvent,
  type SanctionReversedEvent,
  type SanctionSnapshot,
  type SupportCaseSnapshot,
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
    return succeed(sanctions[index]);
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

  public openCase(
    input: Readonly<{
      subjects: readonly string[];
      severity: number;
      evidenceRefs: readonly string[];
      openedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<AbuseCaseSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const cases = this.state.cases ?? [];
    const existing = cases.find(
      (abuseCase) => abuseCase.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (
      input.subjects.length === 0 ||
      input.openedBy.trim() === "" ||
      !clampable(input.severity)
    ) {
      return fail(new DomainError("INVALID_CASE", "Dados do caso inválidos."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const caseId = deterministicUuidV7<"AbuseCase">({
      worldSeed: input.worldSeed,
      context: `abuse-case:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const abuseCase: AbuseCaseSnapshot = {
      id: caseId,
      gameWorldId: this.state.gameWorldId,
      subjects: [...input.subjects],
      severity: input.severity,
      status: CaseStatus.OPEN,
      evidenceRefs: [...input.evidenceRefs],
      openedBy: input.openedBy,
      openedOn: date.value.toString(),
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: CaseOpenedEvent = {
      id: this.eventId(input.worldSeed, `case-opened:${input.idempotencyKey}`, date.value.toString()),
      type: "CaseOpened",
      gameWorldId: this.state.gameWorldId,
      caseId,
      severity: input.severity,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      cases: [...cases, abuseCase],
      auditChain: this.appendAudit(input.openedBy, "OPEN_CASE", caseId),
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(abuseCase);
  }

  public placeQuarantine(
    input: Readonly<{
      caseId?: string;
      scope: string;
      reason: string;
      startsOn: string;
      expiresOn: string;
      placedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<QuarantineSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const quarantines = this.state.quarantines ?? [];
    const existing = quarantines.find(
      (quarantine) => quarantine.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (input.scope.trim() === "" || input.placedBy.trim() === "") {
      return fail(new DomainError("INVALID_QUARANTINE", "Escopo/autor inválidos."));
    }
    if (
      input.caseId !== undefined &&
      !(this.state.cases ?? []).some(({ id }) => id === input.caseId)
    ) {
      return fail(
        new DomainError("CASE_NOT_FOUND", "Caso vinculado não encontrado.", {
          caseId: input.caseId,
        }),
      );
    }
    const startsOn = WorldDate.parse(input.startsOn);
    if (!startsOn.ok) return startsOn;
    const expiresOn = WorldDate.parse(input.expiresOn);
    if (!expiresOn.ok) return expiresOn;
    if (expiresOn.value.toString() < startsOn.value.toString()) {
      return fail(new DomainError("INVALID_QUARANTINE", "Período inválido."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const quarantineId = deterministicUuidV7<"Quarantine">({
      worldSeed: input.worldSeed,
      context: `quarantine:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const quarantine: QuarantineSnapshot = {
      id: quarantineId,
      gameWorldId: this.state.gameWorldId,
      caseId: (input.caseId as QuarantineSnapshot["caseId"]) ?? null,
      scope: input.scope,
      reason: input.reason,
      status: QuarantineStatus.ACTIVE,
      startsOn: startsOn.value.toString(),
      expiresOn: expiresOn.value.toString(),
      placedBy: input.placedBy,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: QuarantinePlacedEvent = {
      id: this.eventId(input.worldSeed, `quarantine-placed:${input.idempotencyKey}`, date.value.toString()),
      type: "QuarantinePlaced",
      gameWorldId: this.state.gameWorldId,
      quarantineId,
      scope: input.scope,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      quarantines: [...quarantines, quarantine],
      auditChain: this.appendAudit(input.placedBy, "PLACE_QUARANTINE", quarantineId),
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(quarantine);
  }

  public requestCorrection(
    input: Readonly<{
      targetOwner: string;
      targetId: string;
      targetVersion: number;
      reasonCode: string;
      expectedEffect: string;
      requestedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<CorrectionRequestSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const corrections = this.state.corrections ?? [];
    const existing = corrections.find(
      (correction) => correction.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (
      input.targetOwner.trim() === "" ||
      input.targetId.trim() === "" ||
      input.reasonCode.trim() === "" ||
      input.requestedBy.trim() === "" ||
      !Number.isSafeInteger(input.targetVersion) ||
      input.targetVersion < 1
    ) {
      return fail(new DomainError("INVALID_CORRECTION", "Dados da correção inválidos."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const correctionId = deterministicUuidV7<"CorrectionRequest">({
      worldSeed: input.worldSeed,
      context: `correction:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const correction: CorrectionRequestSnapshot = {
      id: correctionId,
      gameWorldId: this.state.gameWorldId,
      targetOwner: input.targetOwner,
      targetId: input.targetId,
      targetVersion: input.targetVersion,
      reasonCode: input.reasonCode,
      expectedEffect: input.expectedEffect,
      requestedBy: input.requestedBy,
      approvedBy: null,
      status: CorrectionStatus.REQUESTED,
      compensatingFactRef: null,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    this.state = {
      ...this.state,
      corrections: [...corrections, correction],
      auditChain: this.appendAudit(input.requestedBy, "REQUEST_CORRECTION", correctionId),
      revision: this.state.revision + 1,
    };
    return succeed(correction);
  }

  public approveCorrection(
    input: Readonly<{
      correctionId: string;
      approvedBy: string;
      reject?: boolean;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<CorrectionRequestSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const corrections = this.state.corrections ?? [];
    const index = corrections.findIndex(({ id }) => id === input.correctionId);
    if (index < 0) {
      return fail(
        new DomainError("CORRECTION_NOT_FOUND", "Correção não encontrada.", {
          correctionId: input.correctionId,
        }),
      );
    }
    const correction = corrections[index]!;
    if (
      correction.status === CorrectionStatus.EXECUTED ||
      correction.status === CorrectionStatus.REJECTED
    ) {
      return succeed(correction);
    }
    if (correction.status !== CorrectionStatus.REQUESTED) {
      return fail(
        new DomainError("CORRECTION_TERMINAL", "Correção não está pendente.", {
          correctionId: correction.id,
        }),
      );
    }
    if (input.approvedBy.trim() === "" || input.approvedBy === correction.requestedBy) {
      return fail(
        new DomainError(
          "SEGREGATION_CONFLICT",
          "A aprovação da correção exige um segundo revisor.",
          { correctionId: correction.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const corrections2 = [...corrections];
    if (input.reject === true) {
      const rejected: CorrectionRequestSnapshot = {
        ...correction,
        approvedBy: input.approvedBy,
        status: CorrectionStatus.REJECTED,
        version: correction.version + 1,
      };
      corrections2[index] = rejected;
      this.state = {
        ...this.state,
        corrections: corrections2,
        auditChain: this.appendAudit(input.approvedBy, "REJECT_CORRECTION", correction.id),
        revision: this.state.revision + 1,
      };
      return succeed(rejected);
    }
    // Aprovação publica o fato compensatório (referência) para o owner aplicar.
    const compensatingFactRef = stableHash(
      `${correction.targetOwner}|${correction.targetId}|${correction.targetVersion}|${correction.reasonCode}`,
    );
    const executed: CorrectionRequestSnapshot = {
      ...correction,
      approvedBy: input.approvedBy,
      status: CorrectionStatus.EXECUTED,
      compensatingFactRef,
      version: correction.version + 1,
    };
    corrections2[index] = executed;
    const approvedEvent: CorrectionApprovedEvent = {
      id: this.eventId(input.worldSeed, `correction-approved:${input.idempotencyKey}`, date.value.toString()),
      type: "CorrectionApproved",
      gameWorldId: this.state.gameWorldId,
      correctionId: correction.id,
      targetOwner: correction.targetOwner,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    const executedEvent: CorrectionExecutedEvent = {
      id: this.eventId(input.worldSeed, `correction-executed:${input.idempotencyKey}`, date.value.toString()),
      type: "CorrectionExecuted",
      gameWorldId: this.state.gameWorldId,
      correctionId: correction.id,
      targetOwner: correction.targetOwner,
      compensatingFactRef,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      corrections: corrections2,
      auditChain: this.appendAudit(input.approvedBy, "APPROVE_CORRECTION", correction.id),
      events: [...this.state.events, approvedEvent, executedEvent],
      revision: this.state.revision + 1,
    };
    return succeed(executed);
  }

  public requestReprocessing(
    input: Readonly<{
      stream: string;
      fromSequence: number;
      toSequence: number;
      reason: string;
      requestedBy: string;
      expectedAuditHead: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<ReprocessingRequestSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const reprocessings = this.state.reprocessings ?? [];
    const existing = reprocessings.find(
      (request) => request.idempotencyKey === input.idempotencyKey,
    );
    // idempotência: poison message reprocessada não duplica efeito
    if (existing !== undefined) return succeed(existing);
    if (
      input.stream.trim() === "" ||
      !Number.isSafeInteger(input.fromSequence) ||
      input.fromSequence < 1 ||
      !Number.isSafeInteger(input.toSequence) ||
      input.toSequence < input.fromSequence
    ) {
      return fail(new DomainError("INVALID_REPROCESSING", "Intervalo inválido."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    // guarda de integridade: o head de auditoria precisa bater antes de reprocessar
    const actualHead = this.auditHead();
    if (input.expectedAuditHead !== actualHead) {
      const failure: AuditIntegrityFailedEvent = {
        id: this.eventId(input.worldSeed, `audit-integrity-failed:${input.idempotencyKey}`, date.value.toString()),
        type: "AuditIntegrityFailed",
        gameWorldId: this.state.gameWorldId,
        expectedHead: input.expectedAuditHead,
        actualHead,
        worldDate: date.value.toString(),
        rulesetVersion: input.rulesetVersion,
        idempotencyKey: input.idempotencyKey,
      };
      this.state = {
        ...this.state,
        events: [...this.state.events, failure],
        revision: this.state.revision + 1,
      };
      return fail(
        new DomainError(
          "AUDIT_CHAIN_INVALID",
          "O head da cadeia de auditoria não confere; reprocessamento abortado.",
          { expectedHead: input.expectedAuditHead, actualHead },
        ),
      );
    }
    const reprocessingId = deterministicUuidV7<"ReprocessingRequest">({
      worldSeed: input.worldSeed,
      context: `reprocessing:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const request: ReprocessingRequestSnapshot = {
      id: reprocessingId,
      gameWorldId: this.state.gameWorldId,
      stream: input.stream,
      fromSequence: input.fromSequence,
      toSequence: input.toSequence,
      reason: input.reason,
      status: ReprocessingStatus.COMPLETED,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: ReprocessingCompletedEvent = {
      id: this.eventId(input.worldSeed, `reprocessing-completed:${input.idempotencyKey}`, date.value.toString()),
      type: "ReprocessingCompleted",
      gameWorldId: this.state.gameWorldId,
      reprocessingId,
      stream: input.stream,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      reprocessings: [...reprocessings, request],
      auditChain: this.appendAudit(input.requestedBy, "REQUEST_REPROCESSING", reprocessingId),
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(request);
  }

  public openSupportCase(
    input: Readonly<{
      requester: string;
      category: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<SupportCaseSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const supportCases = this.state.supportCases ?? [];
    const existing = supportCases.find(
      (supportCase) => supportCase.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (input.requester.trim() === "" || input.category.trim() === "") {
      return fail(new DomainError("INVALID_SUPPORT_CASE", "Requester/category inválidos."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const supportId = deterministicUuidV7<"SupportCase">({
      worldSeed: input.worldSeed,
      context: `support-case:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    // PII minimizada: só a categoria é retida, nunca o conteúdo bruto.
    const supportCase: SupportCaseSnapshot = {
      id: supportId,
      gameWorldId: this.state.gameWorldId,
      requester: input.requester,
      category: input.category,
      status: SupportStatus.OPEN,
      resolution: null,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    this.state = {
      ...this.state,
      supportCases: [...supportCases, supportCase],
      auditChain: this.appendAudit(input.requester, "OPEN_SUPPORT_CASE", supportId),
      revision: this.state.revision + 1,
    };
    return succeed(supportCase);
  }

  public resolveSupportCase(
    input: Readonly<{
      supportCaseId: string;
      resolution: string;
      resolvedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<SupportCaseSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const supportCases = this.state.supportCases ?? [];
    const index = supportCases.findIndex(({ id }) => id === input.supportCaseId);
    if (index < 0) {
      return fail(
        new DomainError("SUPPORT_CASE_NOT_FOUND", "Caso de suporte não encontrado.", {
          supportCaseId: input.supportCaseId,
        }),
      );
    }
    const supportCase = supportCases[index]!;
    if (supportCase.status === SupportStatus.RESOLVED) return succeed(supportCase);
    if (input.resolution.trim() === "" || input.resolvedBy.trim() === "") {
      return fail(new DomainError("INVALID_SUPPORT_CASE", "Resolução inválida."));
    }
    const resolved: SupportCaseSnapshot = {
      ...supportCase,
      status: SupportStatus.RESOLVED,
      resolution: input.resolution,
      version: supportCase.version + 1,
    };
    const next = [...supportCases];
    next[index] = resolved;
    this.state = {
      ...this.state,
      supportCases: next,
      auditChain: this.appendAudit(input.resolvedBy, "RESOLVE_SUPPORT_CASE", supportCase.id),
      revision: this.state.revision + 1,
    };
    return succeed(resolved);
  }

  public auditHead(): string {
    return this.state.auditChain.at(-1)?.eventHash ?? "GENESIS";
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
      openCaseCount: (this.state.cases ?? []).filter(
        ({ status }) => status !== CaseStatus.CLOSED,
      ).length,
      activeQuarantineCount: (this.state.quarantines ?? []).filter(
        ({ status }) => status === QuarantineStatus.ACTIVE,
      ).length,
      executedCorrectionCount: (this.state.corrections ?? []).filter(
        ({ status }) => status === CorrectionStatus.EXECUTED,
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

