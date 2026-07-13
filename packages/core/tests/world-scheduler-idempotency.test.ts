import { newEntityId, newGameWorldId } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import { TemporalWindowType, WorldScheduler } from "../src/index.js";
import {
  schedulingDate,
  schedulingRuleset,
  temporalWindowFixture,
} from "./helpers/scheduling-fixtures.js";

describe("WorldScheduler idempotency", () => {
  it("registra janela única e filtra por mundo/data/tipo", () => {
    const worldId = newGameWorldId();
    const created = WorldScheduler.create(worldId, {
      rulesetVersion: schedulingRuleset(),
      maxTaskAttempts: 3,
      clockLeaseDurationMs: 100,
    });
    if (!created.ok) throw created.error;
    const window = temporalWindowFixture(worldId);

    expect(created.value.registerWindow(window)).toMatchObject({ ok: true });
    expect(created.value.registerWindow(window)).toMatchObject({ ok: true });
    expect(
      created.value.openWindows(
        schedulingDate("2026-01-02"),
        TemporalWindowType.TRANSFER,
      ),
    ).toHaveLength(1);
    expect(
      created.value.registerWindow({ ...window, name: "payload divergente" }),
    ).toMatchObject({
      ok: false,
      error: { code: "TEMPORAL_WINDOW_CONFLICT" },
    });
  });

  it("persiste um receipt por chave e rejeita payload divergente", () => {
    const worldId = newGameWorldId();
    const created = WorldScheduler.create(worldId, {
      rulesetVersion: schedulingRuleset(),
      maxTaskAttempts: 3,
      clockLeaseDurationMs: 100,
    });
    if (!created.ok) throw created.error;
    const receipt = {
      commandId: newEntityId<"Command">(),
      idempotencyKey: "advance:2026-01-01",
      commandType: "AdvanceWorldDay" as const,
      gameWorldId: worldId,
      expectedDate: "2026-01-01",
      resultDate: "2026-01-02",
      resultWorldVersion: 4,
      fencingToken: 1,
      rulesetVersion: schedulingRuleset(),
      processedTaskIds: [],
    };

    expect(created.value.recordCommandReceipt(receipt)).toMatchObject({
      ok: true,
    });
    expect(created.value.recordCommandReceipt(receipt)).toMatchObject({
      ok: true,
    });
    expect(created.value.commandReceipt(receipt.idempotencyKey)).toEqual(
      receipt,
    );
    expect(
      created.value.recordCommandReceipt({
        ...receipt,
        resultDate: "2026-01-03",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "IDEMPOTENCY_KEY_CONFLICT" },
    });
  });
});
