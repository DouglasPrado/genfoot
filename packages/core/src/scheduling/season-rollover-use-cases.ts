import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
} from "@grinta/shared";

import type { SchedulingRepository } from "./scheduling-repository.js";
import { SeasonRollover } from "./season-rollover.js";
import {
  SeasonRolloverPhase,
  SeasonRolloverStatus,
  type SeasonRolloverSnapshot,
  type SeasonRolloverStepHandler,
  type SeasonRolloverVerifier,
} from "./season-rollover-types.js";
import { WorldScheduler } from "./world-scheduler.js";

type StartInput = Parameters<typeof SeasonRollover.create>[0];

export class StartSeasonRollover {
  public constructor(private readonly repository: SchedulingRepository) {}

  public async execute(
    gameWorldId: GameWorldId,
    input: StartInput,
  ): Promise<Result<SeasonRolloverSnapshot, DomainError>> {
    const scheduler = await load(this.repository, gameWorldId);
    if (!scheduler.ok) return scheduler;
    const revision = scheduler.value.snapshot().revision;
    const started = scheduler.value.startRollover(input);
    if (!started.ok) return started;
    if (scheduler.value.snapshot().revision !== revision) {
      await this.repository.saveScheduling(
        scheduler.value.snapshot(),
        revision,
      );
    }
    return started;
  }
}

export class InspectSeasonRollover {
  public constructor(private readonly repository: SchedulingRepository) {}

  public async execute(
    gameWorldId: GameWorldId,
    rolloverId: string,
  ): Promise<Result<SeasonRolloverSnapshot, DomainError>> {
    const scheduler = await load(this.repository, gameWorldId);
    if (!scheduler.ok) return scheduler;
    const rollover = scheduler.value.rollover(rolloverId);
    return rollover === null
      ? fail(new DomainError("ROLLOVER_NOT_FOUND", "Rollover não encontrado."))
      : succeed(rollover);
  }
}

export interface ResumeSeasonRolloverResult {
  readonly rollover: SeasonRolloverSnapshot;
  readonly events: readonly Readonly<{
    type: "SeasonRolloverCheckpointed" | "SeasonClosed" | "SeasonStarted";
    payload: Readonly<Record<string, unknown>>;
  }>[];
}

export class ResumeSeasonRollover {
  public constructor(
    private readonly repository: SchedulingRepository,
    private readonly handlers: Readonly<
      Record<string, SeasonRolloverStepHandler>
    >,
    private readonly verifier: SeasonRolloverVerifier,
    private readonly executorId = "season-rollover-worker",
    private readonly now: () => number = Date.now,
    private readonly leaseDurationMs = 30_000,
  ) {}

  public async execute(
    gameWorldId: GameWorldId,
    rolloverId: string,
  ): Promise<Result<ResumeSeasonRolloverResult, DomainError>> {
    let scheduler = await load(this.repository, gameWorldId);
    if (!scheduler.ok) return scheduler;
    const snapshot = scheduler.value.rollover(rolloverId);
    if (snapshot === null) {
      return fail(
        new DomainError("ROLLOVER_NOT_FOUND", "Rollover não encontrado."),
      );
    }
    if (snapshot.status === SeasonRolloverStatus.COMPLETED) {
      return succeed({ rollover: snapshot, events: [] });
    }
    const aggregate = SeasonRollover.fromSnapshot(snapshot);
    if (!aggregate.ok) return aggregate;
    const lease = aggregate.value.acquireLease(
      this.executorId,
      this.now(),
      this.leaseDurationMs,
    );
    if (!lease.ok) return lease;
    let revision = scheduler.value.snapshot().revision;
    const savedLease = scheduler.value.saveRollover(aggregate.value.snapshot());
    if (!savedLease.ok) return savedLease;
    await this.repository.saveScheduling(scheduler.value.snapshot(), revision);

    const events: ResumeSeasonRolloverResult["events"][number][] = [];
    while (
      aggregate.value.snapshot().status !== SeasonRolloverStatus.COMPLETED
    ) {
      if (aggregate.value.snapshot().phase === SeasonRolloverPhase.VERIFYING) {
        const verification = await this.verifier(aggregate.value.snapshot());
        const confirmed = aggregate.value.confirmVerification(
          lease.value,
          verification,
        );
        if (!confirmed.ok) {
          await this.persist(gameWorldId, aggregate.value.snapshot());
          return confirmed;
        }
        await this.persist(gameWorldId, aggregate.value.snapshot());
      }

      const claimed = aggregate.value.claimCurrentStep(lease.value);
      if (!claimed.ok) return claimed;
      await this.persist(gameWorldId, aggregate.value.snapshot());
      const handler = this.handlers[claimed.value.stepId];
      if (handler === undefined) {
        aggregate.value.failCurrentStep(
          lease.value,
          `Handler ausente para ${claimed.value.stepId}.`,
        );
        await this.persist(gameWorldId, aggregate.value.snapshot());
        return fail(
          new DomainError(
            "ROLLOVER_HANDLER_NOT_FOUND",
            "Um checkpoint não possui handler.",
            { stepId: claimed.value.stepId },
          ),
        );
      }
      try {
        const result = await handler(claimed.value);
        if (result.status === "WAITING") {
          const waiting = aggregate.value.waitCurrentStep(
            lease.value,
            result.evidence,
          );
          if (!waiting.ok) return waiting;
          await this.persist(gameWorldId, aggregate.value.snapshot());
          return succeed({ rollover: aggregate.value.snapshot(), events });
        }
        const completed = aggregate.value.completeCurrentStep(
          lease.value,
          result.evidence ?? {},
          new Date(this.now()).toISOString(),
        );
        if (!completed.ok) return completed;
        events.push({
          type: "SeasonRolloverCheckpointed",
          payload: {
            rolloverId,
            seasonId: claimed.value.seasonId,
            stepId: claimed.value.stepId,
            stepNumber: claimed.value.stepNumber,
          },
        });
        await this.persist(gameWorldId, aggregate.value.snapshot());
      } catch (error: unknown) {
        const failed = aggregate.value.failCurrentStep(
          lease.value,
          error instanceof Error ? error.message : String(error),
        );
        if (!failed.ok) return failed;
        await this.persist(gameWorldId, aggregate.value.snapshot());
        return succeed({ rollover: aggregate.value.snapshot(), events });
      }
    }

    scheduler = await load(this.repository, gameWorldId);
    if (!scheduler.ok) return scheduler;
    revision = scheduler.value.snapshot().revision;
    const finalized = scheduler.value.finalizeCompletedRollover(rolloverId);
    if (!finalized.ok) return finalized;
    await this.repository.saveScheduling(scheduler.value.snapshot(), revision);
    const final = scheduler.value.rollover(rolloverId)!;
    events.push(
      {
        type: "SeasonClosed",
        payload: { rolloverId, seasonId: final.seasonId },
      },
      {
        type: "SeasonStarted",
        payload: { rolloverId, seasonId: final.nextSeason.id },
      },
    );
    return succeed({ rollover: final, events });
  }

  private async persist(
    gameWorldId: GameWorldId,
    rollover: SeasonRolloverSnapshot,
  ): Promise<void> {
    const scheduler = await load(this.repository, gameWorldId);
    if (!scheduler.ok) throw scheduler.error;
    const revision = scheduler.value.snapshot().revision;
    const saved = scheduler.value.saveRollover(rollover);
    if (!saved.ok) throw saved.error;
    await this.repository.saveScheduling(scheduler.value.snapshot(), revision);
  }
}

async function load(
  repository: SchedulingRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldScheduler, DomainError>> {
  const snapshot = await repository.findSchedulingByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError("SCHEDULER_NOT_FOUND", "Scheduler não encontrado."),
    );
  }
  return WorldScheduler.fromSnapshot(snapshot);
}
