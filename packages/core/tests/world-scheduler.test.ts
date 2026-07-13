import {
  DomainError,
  WorldDate,
  newEntityId,
  newGameWorldId,
  parseRulesetVersion,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it, vi } from "vitest";

import {
  BootstrapWorldScheduler,
  ProcessDueWorldTasks,
  RetryScheduledTask,
  ScheduledTaskStatus,
  Season,
  SeasonLifecycleState,
  SeasonStatus,
  WorldScheduler,
  type SchedulingRepository,
  type WorldSchedulerSnapshot,
} from "../src/index.js";

class MemorySchedulingRepository implements SchedulingRepository {
  public snapshot: WorldSchedulerSnapshot | null = null;

  public findSchedulingByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldSchedulerSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveScheduling(
    snapshot: WorldSchedulerSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("SCHEDULER_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function input(gameWorldId = newGameWorldId()) {
  const rulesetVersion = parseRulesetVersion("1.0.0");
  if (!rulesetVersion.ok) throw rulesetVersion.error;
  return {
    gameWorldId,
    rulesetVersion: rulesetVersion.value,
    season: {
      id: newEntityId<"Season">(),
      number: 1,
      name: "Temporada 1",
      startsOn: "2026-01-04",
      endsOn: "2026-04-01",
    },
    startTaskId: newEntityId<"ScheduledTask">(),
    dueTaskId: newEntityId<"ScheduledTask">(),
  } as const;
}

describe("WorldScheduler", () => {
  it("mantém a máquina de temporada linear até o arquivamento", () => {
    const gameWorldId = newGameWorldId();
    const created = Season.bootstrap({
      id: newEntityId<"Season">(),
      gameWorldId,
      number: 1,
      name: "Temporada 1",
      startsOn: "2026-01-04",
      endsOn: "2026-04-01",
    });
    if (!created.ok) throw created.error;

    expect(created.value.start(date("2026-01-03"))).toMatchObject({
      ok: false,
      error: { code: "SEASON_NOT_DUE" },
    });
    expect(created.value.start(date("2026-01-04"))).toMatchObject({ ok: true });
    expect(created.value.beginFinalizing(date("2026-04-01"))).toMatchObject({
      ok: true,
    });
    expect(created.value.finishSporting()).toMatchObject({ ok: true });
    expect(created.value.complete()).toMatchObject({ ok: true });
    expect(created.value.snapshot()).toMatchObject({
      lifecycleState: SeasonLifecycleState.COMPLETED,
      status: SeasonStatus.ARCHIVED,
      version: 5,
    });
    expect(created.value.complete()).toMatchObject({
      ok: false,
      error: { code: "INVALID_SEASON_TRANSITION" },
    });
  });

  it("inicializa uma única temporada e tarefas idempotentes", async () => {
    const repository = new MemorySchedulingRepository();
    const bootstrap = new BootstrapWorldScheduler(repository);
    const bootstrapInput = input();

    const first = await bootstrap.execute(bootstrapInput);
    const repeated = await bootstrap.execute(bootstrapInput);

    expect(first.ok).toBe(true);
    expect(repeated).toEqual(first);
    if (!first.ok) return;
    expect(first.value.seasons).toHaveLength(1);
    expect(first.value.tasks).toHaveLength(2);
    expect(first.value.seasons[0]).toMatchObject({
      lifecycleState: SeasonLifecycleState.REGISTRATION,
      status: SeasonStatus.PLANNED,
    });
  });

  it("ordena tarefas vencidas por data, prioridade e id", () => {
    const bootstrapInput = input();
    const created = WorldScheduler.create(bootstrapInput.gameWorldId, {
      rulesetVersion: bootstrapInput.rulesetVersion,
      maxTaskAttempts: 3,
      clockLeaseDurationMs: 30_000,
    });
    if (!created.ok) throw created.error;
    const ids = [
      newEntityId<"ScheduledTask">(),
      newEntityId<"ScheduledTask">(),
      newEntityId<"ScheduledTask">(),
    ].sort();
    for (const [id, priority, dueOn] of [
      [ids[2]!, 20, "2026-01-02"],
      [ids[1]!, 10, "2026-01-02"],
      [ids[0]!, 100, "2026-01-01"],
    ] as const) {
      const result = created.value.schedule({
        id,
        type: "test",
        dueOn,
        priority,
        idempotencyKey: id,
      });
      if (!result.ok) throw result.error;
    }

    expect(
      created.value.dueTasks(date("2026-01-02")).map(({ id }) => id),
    ).toEqual([ids[0], ids[1], ids[2]]);
  });

  it("inicia e encerra a fase regular nos marcos agendados", async () => {
    const repository = new MemorySchedulingRepository();
    const bootstrapInput = input();
    await new BootstrapWorldScheduler(repository).execute(bootstrapInput);
    const processor = new ProcessDueWorldTasks(repository);

    expect(
      (await processor.execute(bootstrapInput.gameWorldId, date("2026-01-03")))
        .ok,
    ).toBe(true);
    const started = await processor.execute(
      bootstrapInput.gameWorldId,
      date("2026-01-04"),
    );
    expect(started.ok && started.value).toMatchObject([
      { emittedEvents: [{ type: "SeasonStarted" }] },
    ]);
    expect(repository.snapshot?.seasons[0]).toMatchObject({
      lifecycleState: SeasonLifecycleState.IN_PROGRESS,
      status: SeasonStatus.ACTIVE,
    });

    const due = await processor.execute(
      bootstrapInput.gameWorldId,
      date("2026-04-01"),
    );
    expect(due.ok && due.value).toMatchObject([
      { emittedEvents: [{ type: "SeasonDue" }] },
    ]);
    expect(repository.snapshot?.seasons[0]).toMatchObject({
      lifecycleState: SeasonLifecycleState.FINALIZING,
      status: SeasonStatus.ACTIVE,
    });
    expect(
      repository.snapshot?.tasks.every(
        ({ status }) => status === ScheduledTaskStatus.COMPLETED,
      ),
    ).toBe(true);
  });

  it("registra falha, permite retry limitado e não repete efeito concluído", async () => {
    const repository = new MemorySchedulingRepository();
    const bootstrapInput = input();
    await new BootstrapWorldScheduler(repository).execute(bootstrapInput);
    const loaded = WorldScheduler.fromSnapshot(repository.snapshot!);
    if (!loaded.ok) throw loaded.error;
    const taskId = newEntityId<"ScheduledTask">();
    const scheduled = loaded.value.schedule({
      id: taskId,
      type: "external:test",
      dueOn: "2026-01-01",
      idempotencyKey: "external-once",
      maxAttempts: 2,
    });
    if (!scheduled.ok) throw scheduled.error;
    await repository.saveScheduling(
      loaded.value.snapshot(),
      repository.snapshot!.revision,
    );
    const handler = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("temporário"))
      .mockResolvedValue(undefined);
    const processor = new ProcessDueWorldTasks(repository, {
      "external:test": handler,
    });

    const failed = await processor.execute(
      bootstrapInput.gameWorldId,
      date("2026-01-01"),
    );
    expect(failed.ok && failed.value[0]).toMatchObject({ status: "FAILED" });
    expect(
      await new RetryScheduledTask(repository).execute(
        bootstrapInput.gameWorldId,
        taskId,
      ),
    ).toMatchObject({ ok: true });
    const completed = await processor.execute(
      bootstrapInput.gameWorldId,
      date("2026-01-01"),
    );
    expect(completed.ok && completed.value[0]).toMatchObject({
      status: "COMPLETED",
      attempts: 2,
    });
    await processor.execute(bootstrapInput.gameWorldId, date("2026-01-02"));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(
      await new RetryScheduledTask(repository).execute(
        bootstrapInput.gameWorldId,
        taskId,
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "TASK_NOT_RETRYABLE" },
    });
  });

  it("recupera tarefa interrompida e rejeita fencing token antigo", () => {
    const bootstrapInput = input();
    const created = WorldScheduler.create(bootstrapInput.gameWorldId, {
      rulesetVersion: bootstrapInput.rulesetVersion,
      maxTaskAttempts: 3,
      clockLeaseDurationMs: 30_000,
    });
    if (!created.ok) throw created.error;
    const taskId = newEntityId<"ScheduledTask">();
    const scheduled = created.value.schedule({
      id: taskId,
      type: "test",
      dueOn: "2026-01-01",
      idempotencyKey: "recover",
    });
    if (!scheduled.ok) throw scheduled.error;
    const firstClaim = created.value.claim(taskId);
    if (!firstClaim.ok) throw firstClaim.error;

    expect(created.value.recoverInterruptedTasks()).toBe(1);
    const secondClaim = created.value.claim(taskId);
    if (!secondClaim.ok) throw secondClaim.error;
    expect(secondClaim.value.fencingToken).toBeGreaterThan(
      firstClaim.value.fencingToken!,
    );
    expect(
      created.value.complete(
        taskId,
        firstClaim.value.fencingToken!,
        date("2026-01-01"),
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "STALE_FENCING_TOKEN" },
    });
  });

  it("garante um único lease vivo e invalida o executor anterior", () => {
    const bootstrapInput = input();
    const created = WorldScheduler.create(bootstrapInput.gameWorldId, {
      rulesetVersion: bootstrapInput.rulesetVersion,
      maxTaskAttempts: 3,
      clockLeaseDurationMs: 30_000,
    });
    if (!created.ok) throw created.error;

    const first = created.value.acquireClockLease("replica-a", 1_000);
    expect(first).toMatchObject({ ok: true, value: 1 });
    expect(created.value.acquireClockLease("replica-b", 2_000)).toMatchObject({
      ok: false,
      error: { code: "WORLD_CLOCK_LEASE_HELD" },
    });
    const takeover = created.value.acquireClockLease("replica-b", 31_001);
    expect(takeover).toMatchObject({ ok: true, value: 2 });
    expect(
      created.value.releaseClockLease("replica-a", first.ok ? first.value : 0),
    ).toMatchObject({
      ok: false,
      error: { code: "STALE_FENCING_TOKEN" },
    });
    expect(
      created.value.releaseClockLease(
        "replica-b",
        takeover.ok ? takeover.value : 0,
      ),
    ).toMatchObject({ ok: true });
  });
});
