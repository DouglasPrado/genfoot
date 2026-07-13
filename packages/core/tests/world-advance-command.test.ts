import { newEntityId } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import { AdvanceWorldDayCommand, WorldScheduler } from "../src/index.js";
import {
  MemoryWorldSchedulingRepository,
  activeWorldSnapshot,
  schedulingRuleset,
  schedulingWorldId,
} from "./helpers/scheduling-fixtures.js";

describe("AdvanceWorldDayCommand", () => {
  it("retorna o mesmo receipt no retry e avança apenas o mundo alvo", async () => {
    const repository = new MemoryWorldSchedulingRepository();
    const worldId = schedulingWorldId();
    const otherWorldId = schedulingWorldId();
    repository.worlds.set(worldId, activeWorldSnapshot(worldId));
    repository.worlds.set(otherWorldId, activeWorldSnapshot(otherWorldId));
    const scheduler = WorldScheduler.create(worldId, {
      rulesetVersion: schedulingRuleset(),
      maxTaskAttempts: 3,
      clockLeaseDurationMs: 100,
    });
    if (!scheduler.ok) throw scheduler.error;
    repository.schedulers.set(worldId, scheduler.value.snapshot());
    const command = new AdvanceWorldDayCommand(
      repository,
      repository,
      {},
      "worker-a",
      () => 1_000,
    );
    const input = {
      commandId: newEntityId<"Command">(),
      idempotencyKey: "advance:2026-01-01",
      expectedDate: "2026-01-01",
      expectedVersion: 3,
      rulesetVersion: schedulingRuleset(),
    };

    const first = await command.execute(worldId, input);
    const repeated = await command.execute(worldId, input);

    expect(first).toEqual(repeated);
    expect(first).toMatchObject({
      ok: true,
      value: { previousDate: "2026-01-01", currentDate: "2026-01-02" },
    });
    expect(repository.worlds.get(worldId)?.currentDate).toBe("2026-01-02");
    expect(repository.worlds.get(otherWorldId)?.currentDate).toBe("2026-01-01");
  });

  it("rejeita data esperada obsoleta sem alterar estado", async () => {
    const repository = new MemoryWorldSchedulingRepository();
    const worldId = schedulingWorldId();
    repository.worlds.set(worldId, activeWorldSnapshot(worldId));
    const scheduler = WorldScheduler.create(worldId, {
      rulesetVersion: schedulingRuleset(),
      maxTaskAttempts: 3,
      clockLeaseDurationMs: 100,
    });
    if (!scheduler.ok) throw scheduler.error;
    repository.schedulers.set(worldId, scheduler.value.snapshot());

    const result = await new AdvanceWorldDayCommand(
      repository,
      repository,
    ).execute(worldId, {
      commandId: newEntityId<"Command">(),
      idempotencyKey: "stale",
      expectedDate: "2025-12-31",
      expectedVersion: 3,
      rulesetVersion: schedulingRuleset(),
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "WORLD_DATE_CONFLICT" },
    });
    expect(repository.worlds.get(worldId)?.currentDate).toBe("2026-01-01");
  });
});
