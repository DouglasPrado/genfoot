import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  SEASON_ROLLOVER_STEPS,
  SeasonRolloverPhase,
  SeasonRolloverStatus,
  SeasonRolloverStepStatus,
  type SeasonRolloverSnapshot,
  type SeasonRolloverStepContext,
  type SeasonRolloverVerification,
} from "./season-rollover-types.js";

type CreateSeasonRolloverInput = Omit<
  SeasonRolloverSnapshot,
  | "status"
  | "phase"
  | "currentStepIndex"
  | "steps"
  | "leaseOwnerId"
  | "leaseExpiresAtMs"
  | "fencingToken"
  | "verification"
  | "revision"
>;

export class SeasonRollover {
  private constructor(private state: SeasonRolloverSnapshot) {}

  public static create(
    input: CreateSeasonRolloverInput,
  ): Result<SeasonRollover, DomainError> {
    if (
      input.id.trim() === "" ||
      input.seasonId.trim() === "" ||
      input.nextSeason.id.trim() === "" ||
      !Number.isSafeInteger(input.maxAttemptsPerStep) ||
      input.maxAttemptsPerStep < 1
    ) {
      return fail(invalidRollover("Identidade ou retry budget inválido."));
    }
    return succeed(
      new SeasonRollover({
        ...input,
        status: SeasonRolloverStatus.REQUESTED,
        phase: SeasonRolloverPhase.REQUESTED,
        currentStepIndex: 0,
        steps: SEASON_ROLLOVER_STEPS.map((stepId) => ({
          stepId,
          status: SeasonRolloverStepStatus.PENDING,
          attempts: 0,
          fencingToken: null,
          lastError: null,
          evidence: null,
          completedAt: null,
        })),
        leaseOwnerId: null,
        leaseExpiresAtMs: null,
        fencingToken: 0,
        verification: null,
        revision: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: SeasonRolloverSnapshot,
  ): Result<SeasonRollover, DomainError> {
    if (
      snapshot.steps.length !== SEASON_ROLLOVER_STEPS.length ||
      snapshot.steps.some(
        (step, index) => step.stepId !== SEASON_ROLLOVER_STEPS[index],
      ) ||
      !Number.isSafeInteger(snapshot.currentStepIndex) ||
      snapshot.currentStepIndex < 0 ||
      snapshot.currentStepIndex > SEASON_ROLLOVER_STEPS.length ||
      !Number.isSafeInteger(snapshot.revision) ||
      snapshot.revision < 1
    ) {
      return fail(invalidRollover("Snapshot de rollover inválido."));
    }
    return succeed(new SeasonRollover(snapshot));
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
      return fail(invalidRollover("Lease de rollover inválido."));
    }
    if (
      this.state.status === SeasonRolloverStatus.COMPLETED ||
      this.state.status === SeasonRolloverStatus.MANUAL_REVIEW
    ) {
      return fail(
        new DomainError(
          "ROLLOVER_NOT_RESUMABLE",
          "O rollover está em estado terminal.",
        ),
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
          "ROLLOVER_LEASE_HELD",
          "Outro executor possui o lease do rollover.",
        ),
      );
    }
    const token = this.state.fencingToken + 1;
    const steps = [...this.state.steps];
    const current = steps[this.state.currentStepIndex];
    if (current?.status === SeasonRolloverStepStatus.RUNNING) {
      steps[this.state.currentStepIndex] = {
        ...current,
        status: SeasonRolloverStepStatus.FAILED,
        fencingToken: null,
        lastError: "Execução interrompida; retomada por novo fencing token.",
      };
    }
    this.state = {
      ...this.state,
      steps,
      status: SeasonRolloverStatus.RUNNING,
      phase:
        this.state.phase === SeasonRolloverPhase.REQUESTED
          ? SeasonRolloverPhase.FREEZING_INPUTS
          : this.state.phase,
      leaseOwnerId: ownerId,
      leaseExpiresAtMs: nowMs + durationMs,
      fencingToken: token,
      revision: this.state.revision + 1,
    };
    return succeed(token);
  }

  public claimCurrentStep(
    fencingToken: number,
  ): Result<SeasonRolloverStepContext, DomainError> {
    const authority = this.assertFencing(fencingToken);
    if (!authority.ok) return authority;
    if (this.state.phase === SeasonRolloverPhase.VERIFYING) {
      return fail(
        new DomainError(
          "ROLLOVER_VERIFICATION_REQUIRED",
          "As invariantes devem ser verificadas antes do calendário seguinte.",
        ),
      );
    }
    const step = this.state.steps[this.state.currentStepIndex];
    if (step === undefined) {
      return fail(
        new DomainError(
          "ROLLOVER_COMPLETED",
          "Todos os passos foram concluídos.",
        ),
      );
    }
    const claimed = {
      ...step,
      status: SeasonRolloverStepStatus.RUNNING,
      attempts: step.attempts + 1,
      fencingToken,
      lastError: null,
    } as const;
    this.replaceCurrentStep(claimed, SeasonRolloverStatus.RUNNING);
    return succeed({
      rolloverId: this.state.id,
      gameWorldId: this.state.gameWorldId,
      seasonId: this.state.seasonId,
      stepId: claimed.stepId,
      stepNumber: this.state.currentStepIndex + 1,
      idempotencyKey: `season-rollover:${this.state.id}:${claimed.stepId}`,
      fencingToken,
      rulesetVersion: this.state.rulesetVersion,
    });
  }

  public completeCurrentStep(
    fencingToken: number,
    evidence: Readonly<Record<string, unknown>>,
    completedAt: string,
  ): Result<void, DomainError> {
    const step = this.runningStep(fencingToken);
    if (!step.ok) return step;
    const steps = [...this.state.steps];
    steps[this.state.currentStepIndex] = {
      ...step.value,
      status: SeasonRolloverStepStatus.COMPLETED,
      evidence,
      completedAt,
    };
    const nextIndex = this.state.currentStepIndex + 1;
    const completed = nextIndex === SEASON_ROLLOVER_STEPS.length;
    this.state = {
      ...this.state,
      steps,
      currentStepIndex: nextIndex,
      status: completed
        ? SeasonRolloverStatus.COMPLETED
        : SeasonRolloverStatus.RUNNING,
      phase: completed
        ? SeasonRolloverPhase.COMPLETED
        : projectPhase(nextIndex, this.state.verification !== null),
      revision: this.state.revision + 1,
    };
    return succeed(undefined);
  }

  public waitCurrentStep(
    fencingToken: number,
    evidence: Readonly<Record<string, unknown>> = {},
  ): Result<void, DomainError> {
    const step = this.runningStep(fencingToken);
    if (!step.ok) return step;
    this.replaceCurrentStep(
      {
        ...step.value,
        status: SeasonRolloverStepStatus.WAITING,
        evidence,
        fencingToken: null,
      },
      SeasonRolloverStatus.WAITING,
    );
    return succeed(undefined);
  }

  public failCurrentStep(
    fencingToken: number,
    error: string,
  ): Result<void, DomainError> {
    const step = this.runningStep(fencingToken);
    if (!step.ok) return step;
    const exhausted = step.value.attempts >= this.state.maxAttemptsPerStep;
    this.replaceCurrentStep(
      {
        ...step.value,
        status: SeasonRolloverStepStatus.FAILED,
        fencingToken: null,
        lastError: error,
      },
      exhausted
        ? SeasonRolloverStatus.MANUAL_REVIEW
        : SeasonRolloverStatus.WAITING,
    );
    return succeed(undefined);
  }

  public confirmVerification(
    fencingToken: number,
    verification: SeasonRolloverVerification,
  ): Result<void, DomainError> {
    const authority = this.assertFencing(fencingToken);
    if (!authority.ok) return authority;
    if (
      this.state.phase !== SeasonRolloverPhase.VERIFYING ||
      this.state.currentStepIndex !== 17
    ) {
      return fail(
        new DomainError(
          "ROLLOVER_VERIFICATION_NOT_DUE",
          "A verificação não está no checkpoint correto.",
        ),
      );
    }
    if (
      !verification.standingsConsistent ||
      !verification.ledgerBalanced ||
      !verification.populationInBand
    ) {
      this.state = {
        ...this.state,
        status: SeasonRolloverStatus.WAITING,
        revision: this.state.revision + 1,
      };
      return fail(
        new DomainError(
          "ROLLOVER_VERIFICATION_FAILED",
          "INV-5, INV-3a e INV-7 devem passar em conjunto.",
        ),
      );
    }
    this.state = {
      ...this.state,
      verification,
      status: SeasonRolloverStatus.RUNNING,
      phase: SeasonRolloverPhase.PREPARING,
      revision: this.state.revision + 1,
    };
    return succeed(undefined);
  }

  public snapshot(): SeasonRolloverSnapshot {
    return this.state;
  }

  private assertFencing(fencingToken: number): Result<void, DomainError> {
    return this.state.leaseOwnerId !== null &&
      this.state.fencingToken === fencingToken
      ? succeed(undefined)
      : fail(
          new DomainError(
            "STALE_FENCING_TOKEN",
            "O executor não possui autoridade sobre o rollover.",
          ),
        );
  }

  private runningStep(fencingToken: number) {
    const authority = this.assertFencing(fencingToken);
    if (!authority.ok) return authority;
    const step = this.state.steps[this.state.currentStepIndex];
    return step?.status === SeasonRolloverStepStatus.RUNNING &&
      step.fencingToken === fencingToken
      ? succeed(step)
      : fail(
          new DomainError(
            "STALE_FENCING_TOKEN",
            "O checkpoint não está sob este fencing token.",
          ),
        );
  }

  private replaceCurrentStep(
    step: SeasonRolloverSnapshot["steps"][number],
    status: SeasonRolloverSnapshot["status"],
  ): void {
    const steps = [...this.state.steps];
    steps[this.state.currentStepIndex] = step;
    this.state = {
      ...this.state,
      steps,
      status,
      revision: this.state.revision + 1,
    };
  }
}

function projectPhase(
  nextStepIndex: number,
  verificationPassed: boolean,
): SeasonRolloverPhase {
  if (nextStepIndex === 0) return SeasonRolloverPhase.FREEZING_INPUTS;
  if (nextStepIndex <= 3) return SeasonRolloverPhase.CALCULATING;
  if (nextStepIndex === 17 && !verificationPassed)
    return SeasonRolloverPhase.VERIFYING;
  if (nextStepIndex < 17) return SeasonRolloverPhase.APPLYING_RESULTS;
  return SeasonRolloverPhase.PREPARING;
}

function invalidRollover(message: string): DomainError {
  return new DomainError("INVALID_SEASON_ROLLOVER", message);
}
