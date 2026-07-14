import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
} from "@grinta/shared";

import {
  INFRASTRUCTURE_PROJECT_STEPS,
  InfrastructureMilestoneStatus,
  InfrastructureProjectStatus,
  InfrastructureProjectStepStatus,
  type CreateInfrastructureProjectInput,
  type InfrastructureProjectSnapshot,
  type InfrastructureProjectStepContext,
} from "./infrastructure-project-types.js";

export class InfrastructureProject {
  private constructor(private state: InfrastructureProjectSnapshot) {}

  public static create(
    input: CreateInfrastructureProjectInput,
  ): Result<InfrastructureProject, DomainError> {
    if (
      input.commandId.trim() === "" ||
      input.idempotencyKey.trim() === "" ||
      input.actorId.trim() === "" ||
      !WorldDate.parse(input.proposedAt).ok ||
      input.fundingRequestRef.trim() === "" ||
      input.target.reference.trim() === "" ||
      !Number.isSafeInteger(input.target.targetValue) ||
      input.target.targetValue < 1 ||
      input.milestones.length === 0 ||
      !Number.isSafeInteger(input.maxAttemptsPerStep) ||
      input.maxAttemptsPerStep < 1
    ) {
      return fail(invalidProject("Entrada do projeto inválida."));
    }
    const milestoneIds = new Set<string>();
    for (const milestone of input.milestones) {
      if (
        milestoneIds.has(milestone.id) ||
        milestone.name.trim() === "" ||
        !WorldDate.parse(milestone.dueOn).ok ||
        !Number.isSafeInteger(milestone.amountMinor) ||
        milestone.amountMinor < 1
      ) {
        return fail(invalidProject("Marco de obra inválido."));
      }
      milestoneIds.add(milestone.id);
    }
    return succeed(
      new InfrastructureProject({
        ...input,
        status: InfrastructureProjectStatus.CREATED,
        financingEvidence: null,
        milestones: input.milestones.map((milestone) => ({
          ...milestone,
          status: InfrastructureMilestoneStatus.PENDING,
          disbursementFactRef: null,
          completedAt: null,
        })),
        inspection: null,
        currentStepIndex: 0,
        steps: INFRASTRUCTURE_PROJECT_STEPS.map((stepId) => ({
          stepId,
          status: InfrastructureProjectStepStatus.PENDING,
          attempts: 0,
          fencingToken: null,
          lastError: null,
          evidence: null,
          completedAt: null,
        })),
        leaseOwnerId: null,
        leaseExpiresAtMs: null,
        fencingToken: 0,
        compensationEvidence: null,
        version: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: InfrastructureProjectSnapshot,
  ): Result<InfrastructureProject, DomainError> {
    if (
      snapshot.steps.length !== INFRASTRUCTURE_PROJECT_STEPS.length ||
      snapshot.steps.some(
        (step, index) => step.stepId !== INFRASTRUCTURE_PROJECT_STEPS[index],
      ) ||
      snapshot.currentStepIndex < 0 ||
      snapshot.currentStepIndex > INFRASTRUCTURE_PROJECT_STEPS.length ||
      snapshot.version < 1
    ) {
      return fail(invalidProject("Snapshot do projeto inválido."));
    }
    return succeed(new InfrastructureProject(snapshot));
  }

  public acquireLease(
    ownerId: string,
    nowMs: number,
    durationMs: number,
  ): Result<number, DomainError> {
    if (
      ownerId.trim() === "" ||
      !Number.isSafeInteger(nowMs) ||
      nowMs < 0 ||
      !Number.isSafeInteger(durationMs) ||
      durationMs < 1
    ) {
      return fail(invalidProject("Lease inválido."));
    }
    if (
      this.state.status === InfrastructureProjectStatus.COMPLETED ||
      this.state.status === InfrastructureProjectStatus.FAILED ||
      this.state.status === InfrastructureProjectStatus.MANUAL_REVIEW
    ) {
      return fail(
        new DomainError("PROJECT_NOT_RESUMABLE", "Projeto terminal."),
      );
    }
    if (
      this.state.leaseOwnerId !== null &&
      this.state.leaseOwnerId !== ownerId &&
      this.state.leaseExpiresAtMs !== null &&
      this.state.leaseExpiresAtMs > nowMs
    ) {
      return fail(
        new DomainError(
          "PROJECT_LEASE_HELD",
          "Lease pertence a outro executor.",
        ),
      );
    }
    const steps = [...this.state.steps];
    const current = steps[this.state.currentStepIndex];
    if (current?.status === InfrastructureProjectStepStatus.RUNNING) {
      steps[this.state.currentStepIndex] = {
        ...current,
        status: InfrastructureProjectStepStatus.FAILED,
        fencingToken: null,
        lastError: "Execução interrompida; retomada por novo fencing token.",
      };
    }
    const token = this.state.fencingToken + 1;
    this.state = {
      ...this.state,
      steps,
      status: InfrastructureProjectStatus.RUNNING,
      leaseOwnerId: ownerId,
      leaseExpiresAtMs: nowMs + durationMs,
      fencingToken: token,
      version: this.state.version + 1,
    };
    return succeed(token);
  }

  public claimCurrentStep(
    fencingToken: number,
  ): Result<InfrastructureProjectStepContext, DomainError> {
    const authority = this.assertFencing(fencingToken);
    if (!authority.ok) return authority;
    const step = this.state.steps[this.state.currentStepIndex];
    if (step === undefined) {
      return fail(new DomainError("PROJECT_COMPLETED", "Projeto concluído."));
    }
    const claimed = {
      ...step,
      status: InfrastructureProjectStepStatus.RUNNING,
      attempts: step.attempts + 1,
      fencingToken,
      lastError: null,
    } as const;
    this.replaceCurrentStep(claimed, InfrastructureProjectStatus.RUNNING);
    return succeed(this.stepContext(claimed.stepId, fencingToken));
  }

  public completeMilestone(
    fencingToken: number,
    milestoneId: string,
    disbursementFactRef: string,
    completedAt: string,
  ): Result<void, DomainError> {
    const running = this.runningStep(fencingToken);
    if (!running.ok) return running;
    if (running.value.stepId !== "EXECUTE_MILESTONES") {
      return fail(
        new DomainError(
          "PROJECT_INVALID_TRANSITION",
          "Marcos fora da execução.",
        ),
      );
    }
    const index = this.state.milestones.findIndex(
      ({ id }) => id === milestoneId,
    );
    if (
      index < 0 ||
      disbursementFactRef.trim() === "" ||
      !WorldDate.parse(completedAt).ok
    ) {
      return fail(invalidProject("Conclusão de marco inválida."));
    }
    if (
      this.state.milestones[index]!.status ===
      InfrastructureMilestoneStatus.COMPLETED
    ) {
      return succeed(undefined);
    }
    const milestones = [...this.state.milestones];
    milestones[index] = {
      ...milestones[index]!,
      status: InfrastructureMilestoneStatus.COMPLETED,
      disbursementFactRef,
      completedAt,
    };
    this.state = { ...this.state, milestones, version: this.state.version + 1 };
    return succeed(undefined);
  }

  public completeCurrentStep(
    fencingToken: number,
    evidence: Readonly<Record<string, unknown>>,
    completedAt: string,
  ): Result<void, DomainError> {
    const running = this.runningStep(fencingToken);
    if (!running.ok) return running;
    if (
      running.value.stepId === "EXECUTE_MILESTONES" &&
      this.state.milestones.some(
        ({ status }) => status !== InfrastructureMilestoneStatus.COMPLETED,
      )
    ) {
      return fail(
        new DomainError("PROJECT_MILESTONES_PENDING", "Há marcos pendentes."),
      );
    }
    if (
      running.value.stepId === "OPERATE" &&
      this.state.inspection?.approved !== true
    ) {
      return fail(
        new DomainError(
          "LICENSE_PENDING",
          "A instalação ainda não foi licenciada.",
        ),
      );
    }
    const steps = [...this.state.steps];
    steps[this.state.currentStepIndex] = {
      ...running.value,
      status: InfrastructureProjectStepStatus.COMPLETED,
      evidence,
      completedAt,
    };
    const nextIndex = this.state.currentStepIndex + 1;
    const completed = nextIndex === INFRASTRUCTURE_PROJECT_STEPS.length;
    this.state = {
      ...this.state,
      steps,
      currentStepIndex: nextIndex,
      status: completed
        ? InfrastructureProjectStatus.COMPLETED
        : InfrastructureProjectStatus.RUNNING,
      financingEvidence:
        running.value.stepId === "FINANCE"
          ? evidence
          : this.state.financingEvidence,
      inspection:
        running.value.stepId === "LICENSE"
          ? {
              approved: evidence.approved !== false,
              inspectionRef:
                typeof evidence.inspectionRef === "string"
                  ? evidence.inspectionRef
                  : null,
            }
          : this.state.inspection,
      version: this.state.version + 1,
    };
    return succeed(undefined);
  }

  public waitCurrentStep(
    fencingToken: number,
    evidence: Readonly<Record<string, unknown>> = {},
  ): Result<void, DomainError> {
    const running = this.runningStep(fencingToken);
    if (!running.ok) return running;
    this.replaceCurrentStep(
      {
        ...running.value,
        status: InfrastructureProjectStepStatus.WAITING,
        fencingToken: null,
        evidence,
      },
      InfrastructureProjectStatus.WAITING,
    );
    return succeed(undefined);
  }

  public failCurrentStep(
    fencingToken: number,
    error: string,
  ): Result<void, DomainError> {
    const running = this.runningStep(fencingToken);
    if (!running.ok) return running;
    const exhausted = running.value.attempts >= this.state.maxAttemptsPerStep;
    this.replaceCurrentStep(
      {
        ...running.value,
        status: InfrastructureProjectStepStatus.FAILED,
        fencingToken: null,
        lastError: error,
      },
      exhausted
        ? InfrastructureProjectStatus.MANUAL_REVIEW
        : InfrastructureProjectStatus.WAITING,
    );
    return succeed(undefined);
  }

  public beginCompensation(
    fencingToken: number,
    reason: string,
  ): Result<void, DomainError> {
    const authority = this.assertFencing(fencingToken);
    if (!authority.ok) return authority;
    if (reason.trim() === "")
      return fail(invalidProject("Motivo obrigatório."));
    this.state = {
      ...this.state,
      status: InfrastructureProjectStatus.COMPENSATING,
      compensationEvidence: { reason },
      version: this.state.version + 1,
    };
    return succeed(undefined);
  }

  public completeCompensation(
    fencingToken: number,
    evidence: Readonly<Record<string, unknown>>,
  ): Result<void, DomainError> {
    const authority = this.assertFencing(fencingToken);
    if (!authority.ok) return authority;
    if (this.state.status !== InfrastructureProjectStatus.COMPENSATING) {
      return fail(
        new DomainError(
          "PROJECT_INVALID_TRANSITION",
          "Compensação não iniciada.",
        ),
      );
    }
    const steps = this.state.steps.map((step) =>
      step.status === InfrastructureProjectStepStatus.COMPLETED &&
      step.stepId !== "EXECUTE_MILESTONES"
        ? { ...step, status: InfrastructureProjectStepStatus.COMPENSATED }
        : step,
    );
    this.state = {
      ...this.state,
      steps,
      status: InfrastructureProjectStatus.FAILED,
      compensationEvidence: { ...this.state.compensationEvidence, ...evidence },
      version: this.state.version + 1,
    };
    return succeed(undefined);
  }

  public contextForMilestone(fencingToken: number, milestoneId: string) {
    const milestone = this.state.milestones.find(
      ({ id }) => id === milestoneId,
    );
    const step = this.state.steps[this.state.currentStepIndex];
    return milestone === undefined || step?.stepId !== "EXECUTE_MILESTONES"
      ? null
      : {
          ...this.stepContext(step.stepId, fencingToken),
          idempotencyKey: `saga:${this.state.id}:step:3:milestone:${milestone.id}`,
          milestone,
        };
  }

  public stepContext(
    stepId: (typeof INFRASTRUCTURE_PROJECT_STEPS)[number],
    fencingToken: number,
  ): InfrastructureProjectStepContext {
    const stepNumber = INFRASTRUCTURE_PROJECT_STEPS.indexOf(stepId) + 1;
    return {
      projectId: this.state.id,
      gameWorldId: this.state.gameWorldId,
      clubId: this.state.clubId,
      stepId,
      stepNumber,
      idempotencyKey: `saga:${this.state.id}:step:${stepNumber}`,
      fencingToken,
      rulesetVersion: this.state.rulesetVersion,
    };
  }

  public snapshot(): InfrastructureProjectSnapshot {
    return this.state;
  }

  private assertFencing(token: number): Result<void, DomainError> {
    return this.state.leaseOwnerId !== null && this.state.fencingToken === token
      ? succeed(undefined)
      : fail(new DomainError("STALE_FENCING_TOKEN", "Fencing token obsoleto."));
  }

  private runningStep(token: number) {
    const authority = this.assertFencing(token);
    if (!authority.ok) return authority;
    const step = this.state.steps[this.state.currentStepIndex];
    return step?.status === InfrastructureProjectStepStatus.RUNNING &&
      step.fencingToken === token
      ? succeed(step)
      : fail(
          new DomainError(
            "PROJECT_STEP_NOT_RUNNING",
            "Passo não está em execução.",
          ),
        );
  }

  private replaceCurrentStep(
    step: InfrastructureProjectSnapshot["steps"][number],
    status: InfrastructureProjectStatus,
  ): void {
    const steps = [...this.state.steps];
    steps[this.state.currentStepIndex] = step;
    this.state = {
      ...this.state,
      steps,
      status,
      version: this.state.version + 1,
    };
  }
}

function invalidProject(message: string): DomainError {
  return new DomainError("INVALID_INFRASTRUCTURE_PROJECT", message);
}
