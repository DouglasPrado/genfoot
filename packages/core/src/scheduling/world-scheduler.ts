import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
} from "@grinta/shared";

import { Season } from "./season.js";
import {
  ScheduledTaskStatus,
  type ScheduledTaskSnapshot,
  type SeasonSnapshot,
  type WorldSchedulerConfig,
  type WorldSchedulerSnapshot,
} from "./scheduling-types.js";

export interface ScheduleTaskInput {
  readonly id: string;
  readonly type: string;
  readonly dueOn: string;
  readonly priority?: number;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string;
  readonly maxAttempts?: number;
  readonly recurrence?: Readonly<{ everyDays: number; untilOn: string }>;
}

export class WorldScheduler {
  private constructor(private state: WorldSchedulerSnapshot) {}

  public static create(
    gameWorldId: WorldSchedulerSnapshot["gameWorldId"],
    config: WorldSchedulerConfig,
  ): Result<WorldScheduler, DomainError> {
    if (
      !Number.isSafeInteger(config.maxTaskAttempts) ||
      config.maxTaskAttempts < 1 ||
      !Number.isSafeInteger(config.clockLeaseDurationMs) ||
      config.clockLeaseDurationMs < 1
    ) {
      return fail(
        new DomainError(
          "INVALID_SCHEDULER_CONFIG",
          "maxTaskAttempts deve ser positivo.",
        ),
      );
    }
    return succeed(
      new WorldScheduler({
        gameWorldId,
        config,
        seasons: [],
        tasks: [],
        clock: {
          leaseOwnerId: null,
          leaseExpiresAtMs: null,
          fencingToken: 0,
        },
        runtimeEpoch: 0,
        revision: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: WorldSchedulerSnapshot,
  ): Result<WorldScheduler, DomainError> {
    if (
      !Number.isSafeInteger(snapshot.revision) ||
      snapshot.revision < 1 ||
      !Number.isSafeInteger(snapshot.runtimeEpoch) ||
      snapshot.runtimeEpoch < 0 ||
      !Number.isSafeInteger(snapshot.clock.fencingToken) ||
      snapshot.clock.fencingToken < 0
    ) {
      return fail(
        new DomainError(
          "INVALID_SCHEDULER_SNAPSHOT",
          "Revisão ou epoch inválido.",
        ),
      );
    }
    const keys = new Set<string>();
    for (const season of snapshot.seasons) {
      const loaded = Season.fromSnapshot(season);
      if (!loaded.ok) return loaded;
    }
    for (const task of snapshot.tasks) {
      const valid = validateTask(task);
      if (!valid.ok) return valid;
      if (keys.has(task.idempotencyKey)) {
        return fail(
          new DomainError(
            "INVALID_SCHEDULER_SNAPSHOT",
            "Há tarefas com idempotencyKey duplicada.",
          ),
        );
      }
      keys.add(task.idempotencyKey);
    }
    return succeed(
      new WorldScheduler({
        ...snapshot,
        tasks: snapshot.tasks.map((task) => ({
          ...task,
          recurrence: task.recurrence ?? null,
        })),
      }),
    );
  }

  public bootstrapSeason(
    input: Omit<SeasonSnapshot, "lifecycleState" | "status" | "version">,
  ): Result<void, DomainError> {
    if (this.state.seasons.some((season) => season.number === input.number)) {
      return fail(
        new DomainError(
          "SEASON_ALREADY_EXISTS",
          "Já existe esta temporada no mundo.",
        ),
      );
    }
    if (this.state.seasons.some((season) => season.status !== "ARCHIVED")) {
      return fail(
        new DomainError(
          "ACTIVE_SEASON_ALREADY_EXISTS",
          "O mundo já possui uma temporada não arquivada.",
        ),
      );
    }
    const season = Season.bootstrap(input);
    if (!season.ok) return season;
    this.state = {
      ...this.state,
      seasons: [...this.state.seasons, season.value.snapshot()],
      revision: this.state.revision + 1,
    };
    return succeed(undefined);
  }

  public schedule(
    input: ScheduleTaskInput,
  ): Result<ScheduledTaskSnapshot, DomainError> {
    const existing = this.state.tasks.find(
      (task) => task.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    const task: ScheduledTaskSnapshot = {
      id: input.id,
      gameWorldId: this.state.gameWorldId,
      type: input.type.trim(),
      dueOn: input.dueOn,
      priority: input.priority ?? 100,
      payload: input.payload ?? {},
      idempotencyKey: input.idempotencyKey.trim(),
      recurrence: input.recurrence ?? null,
      status: ScheduledTaskStatus.PENDING,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? this.state.config.maxTaskAttempts,
      fencingToken: null,
      lastError: null,
      completedOn: null,
      version: 1,
    };
    const valid = validateTask(task);
    if (!valid.ok) return valid;
    this.replaceTasks([...this.state.tasks, task]);
    return succeed(task);
  }

  public dueTasks(on: WorldDate): readonly ScheduledTaskSnapshot[] {
    return this.state.tasks
      .filter(
        (task) =>
          task.status === ScheduledTaskStatus.PENDING &&
          task.dueOn <= on.toString(),
      )
      .sort(
        (left, right) =>
          left.dueOn.localeCompare(right.dueOn) ||
          left.priority - right.priority ||
          left.id.localeCompare(right.id),
      );
  }

  public claim(taskId: string): Result<ScheduledTaskSnapshot, DomainError> {
    const task = this.task(taskId);
    if (!task.ok) return task;
    if (task.value.status !== ScheduledTaskStatus.PENDING) {
      return fail(
        new DomainError("TASK_NOT_CLAIMABLE", "A tarefa não está pendente.", {
          taskId,
          status: task.value.status,
        }),
      );
    }
    const epoch = this.state.runtimeEpoch + 1;
    const claimed = {
      ...task.value,
      status: ScheduledTaskStatus.RUNNING,
      attempts: task.value.attempts + 1,
      fencingToken: epoch,
      version: task.value.version + 1,
    } as const;
    this.state = { ...this.state, runtimeEpoch: epoch };
    this.updateTask(claimed);
    return succeed(claimed);
  }

  public complete(
    taskId: string,
    fencingToken: number,
    on: WorldDate,
  ): Result<void, DomainError> {
    const task = this.runningTask(taskId, fencingToken);
    if (!task.ok) return task;
    let nextDue =
      task.value.recurrence === null
        ? null
        : requiredDate(task.value.dueOn).addDays(
            task.value.recurrence.everyDays,
          );
    while (
      nextDue !== null &&
      task.value.recurrence !== null &&
      nextDue.toString() <= on.toString()
    ) {
      nextDue = nextDue.addDays(task.value.recurrence.everyDays);
    }
    if (
      nextDue !== null &&
      nextDue.toString() <= task.value.recurrence!.untilOn
    ) {
      this.updateTask({
        ...task.value,
        dueOn: nextDue.toString(),
        status: ScheduledTaskStatus.PENDING,
        attempts: 0,
        fencingToken: null,
        lastError: null,
        completedOn: null,
        version: task.value.version + 1,
      });
      return succeed(undefined);
    }
    this.updateTask({
      ...task.value,
      status: ScheduledTaskStatus.COMPLETED,
      completedOn: on.toString(),
      lastError: null,
      version: task.value.version + 1,
    });
    return succeed(undefined);
  }

  public failTask(
    taskId: string,
    fencingToken: number,
    error: string,
  ): Result<void, DomainError> {
    const task = this.runningTask(taskId, fencingToken);
    if (!task.ok) return task;
    this.updateTask({
      ...task.value,
      status: ScheduledTaskStatus.FAILED,
      lastError: error,
      version: task.value.version + 1,
    });
    return succeed(undefined);
  }

  public retry(taskId: string): Result<void, DomainError> {
    const task = this.task(taskId);
    if (!task.ok) return task;
    if (
      task.value.status !== ScheduledTaskStatus.FAILED ||
      task.value.attempts >= task.value.maxAttempts
    ) {
      return fail(
        new DomainError(
          "TASK_NOT_RETRYABLE",
          "A tarefa não pode ser retentada.",
          { taskId, status: task.value.status, attempts: task.value.attempts },
        ),
      );
    }
    this.updateTask({
      ...task.value,
      status: ScheduledTaskStatus.PENDING,
      fencingToken: null,
      lastError: null,
      version: task.value.version + 1,
    });
    return succeed(undefined);
  }

  public cancel(taskId: string): Result<void, DomainError> {
    const task = this.task(taskId);
    if (!task.ok) return task;
    if (
      task.value.status !== ScheduledTaskStatus.PENDING &&
      task.value.status !== ScheduledTaskStatus.FAILED
    ) {
      return fail(
        new DomainError(
          "TASK_NOT_CANCELLABLE",
          "Somente tarefas pendentes ou falhas podem ser canceladas.",
          { taskId, status: task.value.status },
        ),
      );
    }
    this.updateTask({
      ...task.value,
      status: ScheduledTaskStatus.CANCELLED,
      fencingToken: null,
      version: task.value.version + 1,
    });
    return succeed(undefined);
  }

  public acquireClockLease(
    ownerId: string,
    nowMs: number,
  ): Result<number, DomainError> {
    if (ownerId.trim() === "" || !Number.isSafeInteger(nowMs) || nowMs < 0) {
      return fail(
        new DomainError(
          "INVALID_CLOCK_LEASE",
          "Owner ou instante do lease inválido.",
        ),
      );
    }
    const lease = this.state.clock;
    if (
      lease.leaseOwnerId !== null &&
      lease.leaseOwnerId !== ownerId &&
      lease.leaseExpiresAtMs !== null &&
      lease.leaseExpiresAtMs > nowMs
    ) {
      return fail(
        new DomainError(
          "WORLD_CLOCK_LEASE_HELD",
          "Outro executor possui o lease do relógio.",
          {
            leaseOwnerId: lease.leaseOwnerId,
            leaseExpiresAtMs: lease.leaseExpiresAtMs,
          },
        ),
      );
    }
    const fencingToken =
      Math.max(this.state.runtimeEpoch, lease.fencingToken) + 1;
    this.state = {
      ...this.state,
      runtimeEpoch: fencingToken,
      clock: {
        leaseOwnerId: ownerId,
        leaseExpiresAtMs: nowMs + this.state.config.clockLeaseDurationMs,
        fencingToken,
      },
      revision: this.state.revision + 1,
    };
    return succeed(fencingToken);
  }

  public releaseClockLease(
    ownerId: string,
    fencingToken: number,
  ): Result<void, DomainError> {
    if (
      this.state.clock.leaseOwnerId !== ownerId ||
      this.state.clock.fencingToken !== fencingToken
    ) {
      return fail(
        new DomainError(
          "STALE_FENCING_TOKEN",
          "O executor não possui mais o lease do relógio.",
          { ownerId, fencingToken },
        ),
      );
    }
    this.state = {
      ...this.state,
      clock: {
        ...this.state.clock,
        leaseOwnerId: null,
        leaseExpiresAtMs: null,
      },
      revision: this.state.revision + 1,
    };
    return succeed(undefined);
  }

  public recoverInterruptedTasks(): number {
    let recovered = 0;
    const tasks = this.state.tasks.map((task) => {
      if (task.status !== ScheduledTaskStatus.RUNNING) return task;
      recovered += 1;
      if (task.attempts >= task.maxAttempts) {
        return {
          ...task,
          status: ScheduledTaskStatus.FAILED,
          fencingToken: null,
          lastError: "Execução interrompida no limite de tentativas.",
          version: task.version + 1,
        };
      }
      return {
        ...task,
        status: ScheduledTaskStatus.PENDING,
        fencingToken: null,
        lastError: "Execução interrompida; retomada pelo checkpoint.",
        version: task.version + 1,
      };
    });
    if (recovered > 0) this.replaceTasks(tasks);
    return recovered;
  }

  public applySeasonCheck(
    task: ScheduledTaskSnapshot,
    on: WorldDate,
  ): Result<"SeasonStarted" | "SeasonDue", DomainError> {
    const seasonId = task.payload.seasonId;
    const action = task.payload.action;
    if (
      typeof seasonId !== "string" ||
      (action !== "START" && action !== "DUE")
    ) {
      return fail(
        new DomainError(
          "INVALID_SEASON_TASK",
          "Payload da tarefa de temporada inválido.",
        ),
      );
    }
    const index = this.state.seasons.findIndex(
      (season) => season.id === seasonId,
    );
    if (index < 0)
      return fail(
        new DomainError("SEASON_NOT_FOUND", "Temporada não encontrada.", {
          seasonId,
        }),
      );
    const loaded = Season.fromSnapshot(this.state.seasons[index]!);
    if (!loaded.ok) return loaded;
    const transitioned =
      action === "START"
        ? loaded.value.start(on)
        : loaded.value.beginFinalizing(on);
    if (!transitioned.ok) return transitioned;
    const seasons = [...this.state.seasons];
    seasons[index] = loaded.value.snapshot();
    this.state = { ...this.state, seasons, revision: this.state.revision + 1 };
    return succeed(action === "START" ? "SeasonStarted" : "SeasonDue");
  }

  public snapshot(): WorldSchedulerSnapshot {
    return this.state;
  }

  private task(taskId: string): Result<ScheduledTaskSnapshot, DomainError> {
    const task = this.state.tasks.find(({ id }) => id === taskId);
    return task === undefined
      ? fail(
          new DomainError("TASK_NOT_FOUND", "Tarefa não encontrada.", {
            taskId,
          }),
        )
      : succeed(task);
  }

  private runningTask(
    taskId: string,
    fencingToken: number,
  ): Result<ScheduledTaskSnapshot, DomainError> {
    const task = this.task(taskId);
    if (!task.ok) return task;
    if (
      task.value.status !== ScheduledTaskStatus.RUNNING ||
      task.value.fencingToken !== fencingToken
    ) {
      return fail(
        new DomainError(
          "STALE_FENCING_TOKEN",
          "O executor não possui mais autoridade sobre a tarefa.",
          { taskId, fencingToken },
        ),
      );
    }
    return task;
  }

  private updateTask(updated: ScheduledTaskSnapshot): void {
    this.replaceTasks(
      this.state.tasks.map((task) => (task.id === updated.id ? updated : task)),
    );
  }

  private replaceTasks(tasks: readonly ScheduledTaskSnapshot[]): void {
    this.state = { ...this.state, tasks, revision: this.state.revision + 1 };
  }
}

function validateTask(task: ScheduledTaskSnapshot): Result<void, DomainError> {
  if (
    task.id.trim() === "" ||
    task.type.trim() === "" ||
    task.idempotencyKey.trim() === ""
  ) {
    return fail(
      new DomainError(
        "INVALID_SCHEDULED_TASK",
        "ID, tipo e idempotencyKey são obrigatórios.",
      ),
    );
  }
  const dueOn = WorldDate.parse(task.dueOn);
  if (!dueOn.ok) return dueOn;
  if (task.recurrence !== null) {
    const untilOn = WorldDate.parse(task.recurrence.untilOn);
    if (!untilOn.ok) return untilOn;
    if (
      !Number.isSafeInteger(task.recurrence.everyDays) ||
      task.recurrence.everyDays < 1 ||
      task.recurrence.untilOn < task.dueOn
    ) {
      return fail(
        new DomainError(
          "INVALID_SCHEDULED_TASK",
          "A recorrência da tarefa é inválida.",
        ),
      );
    }
  }
  if (
    !Number.isSafeInteger(task.priority) ||
    !Number.isSafeInteger(task.attempts) ||
    !Number.isSafeInteger(task.maxAttempts) ||
    task.maxAttempts < 1 ||
    task.attempts < 0 ||
    task.attempts > task.maxAttempts ||
    !Number.isSafeInteger(task.version) ||
    task.version < 1
  ) {
    return fail(
      new DomainError(
        "INVALID_SCHEDULED_TASK",
        "Contadores da tarefa são inválidos.",
      ),
    );
  }
  return succeed(undefined);
}

function requiredDate(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}
