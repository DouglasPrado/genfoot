import { newEntityId } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  ResumeSeasonRollover,
  ScheduledTaskStatus,
  StartSeasonRollover,
  WorldScheduler,
  type ScheduledTaskSnapshot,
} from "../src/index.js";
import {
  MemoryWorldSchedulingRepository,
  schedulingDate,
  schedulingRuleset,
  schedulingWorldId,
  seasonRolloverFixture,
  successfulRolloverHandlers,
} from "./helpers/scheduling-fixtures.js";

function dueSeasonScheduler() {
  const gameWorldId = schedulingWorldId();
  const seasonId = newEntityId<"Season">();
  const created = WorldScheduler.create(gameWorldId, {
    rulesetVersion: schedulingRuleset(),
    maxTaskAttempts: 3,
    clockLeaseDurationMs: 100,
  });
  if (!created.ok) throw created.error;
  const bootstrapped = created.value.bootstrapSeason({
    id: seasonId,
    gameWorldId,
    number: 1,
    name: "Temporada 1",
    startsOn: "2026-01-01",
    endsOn: "2026-04-01",
  });
  if (!bootstrapped.ok) throw bootstrapped.error;
  const task = (action: "START" | "DUE"): ScheduledTaskSnapshot => ({
    id: newEntityId<"ScheduledTask">(),
    gameWorldId,
    type: "season:check-start-end",
    dueOn: action === "START" ? "2026-01-01" : "2026-04-01",
    priority: 10,
    payload: { seasonId, action },
    idempotencyKey: `${seasonId}:${action}`,
    recurrence: null,
    status: ScheduledTaskStatus.RUNNING,
    attempts: 1,
    maxAttempts: 3,
    fencingToken: 1,
    lastError: null,
    completedOn: null,
    version: 1,
  });
  const started = created.value.applySeasonCheck(
    task("START"),
    schedulingDate("2026-01-01"),
  );
  if (!started.ok) throw started.error;
  const due = created.value.applySeasonCheck(
    task("DUE"),
    schedulingDate("2026-04-01"),
  );
  if (!due.ok) throw due.error;
  return { gameWorldId, seasonId, scheduler: created.value };
}

describe("season rollover use cases", () => {
  it("persiste cada checkpoint e abre a próxima temporada uma vez", async () => {
    const repository = new MemoryWorldSchedulingRepository();
    const fixture = dueSeasonScheduler();
    repository.schedulers.set(
      fixture.gameWorldId,
      fixture.scheduler.snapshot(),
    );
    const input = seasonRolloverFixture(fixture.gameWorldId, {
      seasonId: fixture.seasonId,
    });
    const started = await new StartSeasonRollover(repository).execute(
      fixture.gameWorldId,
      input,
    );
    if (!started.ok) throw started.error;
    const calls: string[] = [];

    const resumed = await new ResumeSeasonRollover(
      repository,
      successfulRolloverHandlers(calls),
      () =>
        Promise.resolve({
          standingsConsistent: true,
          ledgerBalanced: true,
          populationInBand: true,
        }),
      "worker-a",
      () => 1_000,
    ).execute(fixture.gameWorldId, started.value.id);

    expect(resumed).toMatchObject({
      ok: true,
      value: { rollover: { status: "COMPLETED" } },
    });
    expect(calls).toHaveLength(20);
    expect(new Set(calls).size).toBe(20);
    expect(
      repository.schedulers.get(fixture.gameWorldId)?.seasons,
    ).toMatchObject([
      { id: fixture.seasonId, status: "ARCHIVED" },
      { id: input.nextSeason.id, status: "PLANNED" },
    ]);
  });

  it("rejeita rollover cujo worldId diverge do scheduler", async () => {
    const repository = new MemoryWorldSchedulingRepository();
    const fixture = dueSeasonScheduler();
    repository.schedulers.set(
      fixture.gameWorldId,
      fixture.scheduler.snapshot(),
    );

    expect(
      await new StartSeasonRollover(repository).execute(
        fixture.gameWorldId,
        seasonRolloverFixture(schedulingWorldId(), {
          seasonId: fixture.seasonId,
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "WORLD_SCOPE_MISMATCH" },
    });
  });
});
