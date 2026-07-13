import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { WorldRepository } from "../world/world-repository.js";
import {
  AdvanceWorldDays,
  type WorldMutationResult,
} from "../world/world-use-cases.js";
import type { SchedulingRepository } from "./scheduling-repository.js";
import type {
  ScheduledTaskHandler,
  TaskExecutionReport,
  WorldSchedulerSnapshot,
} from "./scheduling-types.js";
import { WorldScheduler, type ScheduleTaskInput } from "./world-scheduler.js";

export interface BootstrapWorldSchedulerInput {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly season: Readonly<{
    id: string;
    number: number;
    name: string;
    startsOn: string;
    endsOn: string;
  }>;
  readonly startTaskId: string;
  readonly dueTaskId: string;
}

export class BootstrapWorldScheduler {
  public constructor(private readonly repository: SchedulingRepository) {}

  public async execute(
    input: BootstrapWorldSchedulerInput,
  ): Promise<Result<WorldSchedulerSnapshot, DomainError>> {
    const existing = await this.repository.findSchedulingByWorldId(
      input.gameWorldId,
    );
    if (existing !== null) return succeed(existing);

    const created = WorldScheduler.create(input.gameWorldId, {
      rulesetVersion: input.rulesetVersion,
      maxTaskAttempts: 3,
      clockLeaseDurationMs: 30_000,
    });
    if (!created.ok) return created;
    const season = created.value.bootstrapSeason({
      ...input.season,
      gameWorldId: input.gameWorldId,
    });
    if (!season.ok) return season;

    const start = created.value.schedule({
      id: input.startTaskId,
      type: "season:check-start-end",
      dueOn: input.season.startsOn,
      priority: 10,
      payload: { seasonId: input.season.id, action: "START" },
      idempotencyKey: `season:${input.season.id}:start`,
    });
    if (!start.ok) return start;
    const due = created.value.schedule({
      id: input.dueTaskId,
      type: "season:check-start-end",
      dueOn: input.season.endsOn,
      priority: 10,
      payload: { seasonId: input.season.id, action: "DUE" },
      idempotencyKey: `season:${input.season.id}:due`,
    });
    if (!due.ok) return due;

    await this.repository.saveScheduling(created.value.snapshot(), null);
    return succeed(created.value.snapshot());
  }
}

export class InspectWorldScheduler {
  public constructor(private readonly repository: SchedulingRepository) {}

  public async execute(
    gameWorldId: GameWorldId,
  ): Promise<Result<WorldSchedulerSnapshot, DomainError>> {
    const snapshot = await this.repository.findSchedulingByWorldId(gameWorldId);
    return snapshot === null
      ? fail(
          new DomainError(
            "SCHEDULER_NOT_FOUND",
            "O mundo ainda não possui scheduler.",
            { gameWorldId },
          ),
        )
      : succeed(snapshot);
  }
}

export class ScheduleWorldTask {
  public constructor(private readonly repository: SchedulingRepository) {}

  public async execute(
    gameWorldId: GameWorldId,
    input: ScheduleTaskInput,
  ): Promise<Result<WorldSchedulerSnapshot, DomainError>> {
    const loaded = await loadScheduler(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    const expectedRevision = loaded.value.snapshot().revision;
    const scheduled = loaded.value.schedule(input);
    if (!scheduled.ok) return scheduled;
    if (loaded.value.snapshot().revision !== expectedRevision) {
      await this.repository.saveScheduling(
        loaded.value.snapshot(),
        expectedRevision,
      );
    }
    return succeed(loaded.value.snapshot());
  }
}

export class RetryScheduledTask {
  public constructor(private readonly repository: SchedulingRepository) {}

  public async execute(
    gameWorldId: GameWorldId,
    taskId: string,
  ): Promise<Result<WorldSchedulerSnapshot, DomainError>> {
    const loaded = await loadScheduler(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    const expectedRevision = loaded.value.snapshot().revision;
    const retried = loaded.value.retry(taskId);
    if (!retried.ok) return retried;
    await this.repository.saveScheduling(
      loaded.value.snapshot(),
      expectedRevision,
    );
    return succeed(loaded.value.snapshot());
  }
}

export class CancelScheduledTask {
  public constructor(private readonly repository: SchedulingRepository) {}

  public async execute(
    gameWorldId: GameWorldId,
    taskId: string,
  ): Promise<Result<WorldSchedulerSnapshot, DomainError>> {
    const loaded = await loadScheduler(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    const expectedRevision = loaded.value.snapshot().revision;
    const cancelled = loaded.value.cancel(taskId);
    if (!cancelled.ok) return cancelled;
    await this.repository.saveScheduling(
      loaded.value.snapshot(),
      expectedRevision,
    );
    return succeed(loaded.value.snapshot());
  }
}

export class ProcessDueWorldTasks {
  public constructor(
    private readonly repository: SchedulingRepository,
    private readonly handlers: Readonly<
      Record<string, ScheduledTaskHandler>
    > = {},
  ) {}

  public async execute(
    gameWorldId: GameWorldId,
    on: WorldDate,
  ): Promise<Result<readonly TaskExecutionReport[], DomainError>> {
    const loaded = await loadScheduler(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    let persistedRevision = loaded.value.snapshot().revision;

    const reports: TaskExecutionReport[] = [];
    for (const pending of loaded.value.dueTasks(on)) {
      const claimed = loaded.value.claim(pending.id);
      if (!claimed.ok) return claimed;
      await this.repository.saveScheduling(
        loaded.value.snapshot(),
        persistedRevision,
      );
      persistedRevision = loaded.value.snapshot().revision;

      let emittedEvents: TaskExecutionReport["emittedEvents"];
      try {
        if (claimed.value.type === "season:check-start-end") {
          const applied = loaded.value.applySeasonCheck(claimed.value, on);
          if (!applied.ok) throw applied.error;
          emittedEvents = [
            {
              type: applied.value,
              payload: {
                seasonId: claimed.value.payload.seasonId,
                worldDate: on.toString(),
              },
            },
          ];
        } else {
          const handler = this.handlers[claimed.value.type];
          if (handler === undefined) {
            throw new DomainError(
              "TASK_HANDLER_NOT_FOUND",
              "Nenhum handler foi registrado para a tarefa.",
              { type: claimed.value.type },
            );
          }
          await handler({
            gameWorldId,
            taskId: claimed.value.id,
            idempotencyKey: claimed.value.idempotencyKey,
            fencingToken: claimed.value.fencingToken!,
            worldDate: on.toString(),
            payload: claimed.value.payload,
          });
        }
        const completed = loaded.value.complete(
          claimed.value.id,
          claimed.value.fencingToken!,
          on,
        );
        if (!completed.ok) return completed;
        const report: TaskExecutionReport = {
          taskId: claimed.value.id,
          type: claimed.value.type,
          status: "COMPLETED",
          attempts: claimed.value.attempts,
          ...(emittedEvents === undefined ? {} : { emittedEvents }),
        };
        reports.push(report);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const failed = loaded.value.failTask(
          claimed.value.id,
          claimed.value.fencingToken!,
          message,
        );
        if (!failed.ok) return failed;
        reports.push({
          taskId: claimed.value.id,
          type: claimed.value.type,
          status: "FAILED",
          attempts: claimed.value.attempts,
          error: message,
        });
      }

      await this.repository.saveScheduling(
        loaded.value.snapshot(),
        persistedRevision,
      );
      persistedRevision = loaded.value.snapshot().revision;
    }
    return succeed(reports);
  }
}

export interface ScheduledWorldMutationResult extends WorldMutationResult {
  readonly processedTasks: readonly TaskExecutionReport[];
}

export class AdvanceScheduledWorldDays {
  public constructor(
    private readonly worldRepository: WorldRepository,
    private readonly schedulingRepository: SchedulingRepository,
    private readonly handlers: Readonly<
      Record<string, ScheduledTaskHandler>
    > = {},
    private readonly executorId = "in-process-world-scheduler",
    private readonly now: () => number = Date.now,
  ) {}

  public async execute(
    gameWorldId: GameWorldId,
    days: number,
  ): Promise<Result<ScheduledWorldMutationResult, DomainError>> {
    if (!Number.isSafeInteger(days) || days < 1) {
      return fail(
        new DomainError(
          "INVALID_DAY_COUNT",
          "days deve ser um inteiro positivo.",
          { days },
        ),
      );
    }
    const events: WorldMutationResult["events"][number][] = [];
    const processedTasks: TaskExecutionReport[] = [];
    let world: WorldMutationResult["world"] | null = null;
    const processor = new ProcessDueWorldTasks(
      this.schedulingRepository,
      this.handlers,
    );

    const leaseScheduler = await loadScheduler(
      this.schedulingRepository,
      gameWorldId,
    );
    if (!leaseScheduler.ok) return leaseScheduler;
    let schedulerRevision = leaseScheduler.value.snapshot().revision;
    const lease = leaseScheduler.value.acquireClockLease(
      this.executorId,
      this.now(),
    );
    if (!lease.ok) return lease;
    leaseScheduler.value.recoverInterruptedTasks();
    await this.schedulingRepository.saveScheduling(
      leaseScheduler.value.snapshot(),
      schedulerRevision,
    );
    const fencingToken = lease.value;

    try {
      for (let index = 0; index < days; index += 1) {
        const advanced = await new AdvanceWorldDays(
          this.worldRepository,
        ).execute(gameWorldId, 1);
        if (!advanced.ok) return advanced;
        world = advanced.value.world;
        events.push(...advanced.value.events);
        const date = WorldDate.parse(world.currentDate);
        if (!date.ok) return date;
        const processed = await processor.execute(gameWorldId, date.value);
        if (!processed.ok) return processed;
        processedTasks.push(...processed.value);
      }
    } finally {
      const latest = await loadScheduler(
        this.schedulingRepository,
        gameWorldId,
      );
      if (latest.ok) {
        schedulerRevision = latest.value.snapshot().revision;
        const released = latest.value.releaseClockLease(
          this.executorId,
          fencingToken,
        );
        if (released.ok) {
          await this.schedulingRepository.saveScheduling(
            latest.value.snapshot(),
            schedulerRevision,
          );
        }
      }
    }

    return succeed({ world: world!, events, processedTasks });
  }
}

export class ResumeWorldScheduler {
  public constructor(
    private readonly worldRepository: WorldRepository,
    private readonly schedulingRepository: SchedulingRepository,
    private readonly handlers: Readonly<
      Record<string, ScheduledTaskHandler>
    > = {},
    private readonly executorId = "in-process-world-scheduler-resume",
    private readonly now: () => number = Date.now,
  ) {}

  public async execute(
    gameWorldId: GameWorldId,
  ): Promise<Result<readonly TaskExecutionReport[], DomainError>> {
    const world = await this.worldRepository.findById(gameWorldId);
    if (world === null) {
      return fail(
        new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.", {
          gameWorldId,
        }),
      );
    }
    const date = WorldDate.parse(world.currentDate);
    if (!date.ok) return date;
    const scheduler = await loadScheduler(
      this.schedulingRepository,
      gameWorldId,
    );
    if (!scheduler.ok) return scheduler;
    let revision = scheduler.value.snapshot().revision;
    const lease = scheduler.value.acquireClockLease(
      this.executorId,
      this.now(),
    );
    if (!lease.ok) return lease;
    scheduler.value.recoverInterruptedTasks();
    await this.schedulingRepository.saveScheduling(
      scheduler.value.snapshot(),
      revision,
    );

    try {
      return await new ProcessDueWorldTasks(
        this.schedulingRepository,
        this.handlers,
      ).execute(gameWorldId, date.value);
    } finally {
      const latest = await loadScheduler(
        this.schedulingRepository,
        gameWorldId,
      );
      if (latest.ok) {
        revision = latest.value.snapshot().revision;
        const released = latest.value.releaseClockLease(
          this.executorId,
          lease.value,
        );
        if (released.ok) {
          await this.schedulingRepository.saveScheduling(
            latest.value.snapshot(),
            revision,
          );
        }
      }
    }
  }
}

async function loadScheduler(
  repository: SchedulingRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldScheduler, DomainError>> {
  const snapshot = await repository.findSchedulingByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError("SCHEDULER_NOT_FOUND", "Scheduler não encontrado.", {
        gameWorldId,
      }),
    );
  }
  return WorldScheduler.fromSnapshot(snapshot);
}
