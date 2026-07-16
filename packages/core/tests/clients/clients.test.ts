import { describe, expect, it } from "vitest";

import {
  advanceCommandTracking,
  classifyRealtimeEvent,
  isOfflineCommandAllowed,
  OfflineIntentQueue,
  RealtimeRecoveryCursor,
} from "../../src/index.js";

describe("Client contract runtime", () => {
  it("aplica a whitelist offline (ausência = proibido)", () => {
    expect(isOfflineCommandAllowed("SET_LINEUP_DRAFT")).toBe(true);
    expect(isOfflineCommandAllowed("MARK_NOTIFICATION_READ")).toBe(true);
    expect(isOfflineCommandAllowed("START_TRANSFER")).toBe(false);
    expect(isOfflineCommandAllowed("RECORD_OFFICIAL_RESULT")).toBe(false);

    const queue = new OfflineIntentQueue();
    expect(
      queue.enqueue({
        id: "i1",
        commandType: "START_TRANSFER",
        idempotencyKey: "k1",
        createdOn: "2026-03-01",
        expiresOn: "2026-03-02",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "COMMAND_FORBIDDEN_OFFLINE" },
    });
  });

  it("deduplica e detecta gap no cursor de realtime", () => {
    expect(classifyRealtimeEvent(5, 4)).toEqual({
      result: "DUPLICATE",
      lastSequence: 5,
    });
    expect(classifyRealtimeEvent(5, 5)).toEqual({
      result: "DUPLICATE",
      lastSequence: 5,
    });
    expect(classifyRealtimeEvent(5, 6)).toEqual({
      result: "APPLIED",
      lastSequence: 6,
    });
    expect(classifyRealtimeEvent(5, 8)).toEqual({
      result: "GAP",
      lastSequence: 5,
    });
  });

  it("recupera realtime por delta sem aplicar duplicata", () => {
    const cursor = new RealtimeRecoveryCursor(4);

    expect(cursor.receive(5)).toMatchObject({ result: "APPLIED" });
    expect(cursor.receive(5)).toMatchObject({ result: "DUPLICATE" });
    expect(cursor.receive(8)).toMatchObject({ result: "GAP" });
    expect(cursor.snapshot()).toEqual({ status: "GAP", lastSequence: 5 });

    cursor.startRecovery();
    expect(cursor.applyDelta([6, 7, 8])).toEqual({
      status: "LIVE",
      lastSequence: 8,
    });
    expect(cursor.receive(9)).toMatchObject({
      result: "APPLIED",
      lastSequence: 9,
    });
  });

  it("mantém gap em delta descontínuo e aceita snapshot oficial", () => {
    const cursor = new RealtimeRecoveryCursor(10);
    cursor.receive(13);
    cursor.startRecovery();

    expect(cursor.applyDelta([11, 13])).toEqual({
      status: "GAP",
      lastSequence: 11,
    });
    expect(cursor.replaceFromSnapshot(20)).toEqual({
      status: "LIVE",
      lastSequence: 20,
    });
    expect(() => cursor.replaceFromSnapshot(19)).toThrow(/retroceder/i);
  });

  it("não presume sucesso no timeout do tracking de command", () => {
    const submitting = advanceCommandTracking("DRAFT", "SUBMIT");
    expect(submitting).toEqual({ ok: true, value: "SUBMITTING" });

    const recovering = advanceCommandTracking("SUBMITTING", "TIMEOUT");
    expect(recovering).toEqual({ ok: true, value: "UNKNOWN_RECOVERING" });

    // do estado de recuperação, o estado oficial resolve
    expect(advanceCommandTracking("UNKNOWN_RECOVERING", "APPLY")).toEqual({
      ok: true,
      value: "APPLIED",
    });

    // timeout não pode saltar direto para sucesso
    expect(advanceCommandTracking("DRAFT", "APPLY")).toMatchObject({
      ok: false,
      error: { code: "INVALID_COMMAND_TRANSITION" },
    });
  });

  it("revalida intents offline por TTL e submete uma única vez", () => {
    const queue = new OfflineIntentQueue();
    const valid = queue.enqueue({
      id: "i1",
      commandType: "SET_LINEUP_DRAFT",
      idempotencyKey: "k-valid",
      createdOn: "2026-03-01",
      expiresOn: "2026-03-10",
    });
    const expired = queue.enqueue({
      id: "i2",
      commandType: "TOGGLE_TRAINING_FOCUS",
      idempotencyKey: "k-exp",
      createdOn: "2026-03-01",
      expiresOn: "2026-03-02",
    });
    expect(valid).toMatchObject({ ok: true, value: { status: "QUEUED" } });
    expect(expired).toMatchObject({ ok: true, value: { status: "QUEUED" } });

    // dedup por idempotencyKey
    const duplicate = queue.enqueue({
      id: "i3",
      commandType: "SET_LINEUP_DRAFT",
      idempotencyKey: "k-valid",
      createdOn: "2026-03-01",
      expiresOn: "2026-03-10",
    });
    expect(duplicate).toMatchObject({ ok: true, value: { id: "i1" } });
    expect(queue.snapshot()).toHaveLength(2);

    const submitted = queue.revalidate("2026-03-05");
    expect(submitted.map((i) => i.idempotencyKey)).toEqual(["k-valid"]);
    expect(
      queue.snapshot().find((i) => i.idempotencyKey === "k-exp")!.status,
    ).toBe("EXPIRED");

    // segunda revalidação não reenvia o já submetido
    const again = queue.revalidate("2026-03-06");
    expect(again).toHaveLength(0);
  });

  it("restaura somente intents persistidos permitidos sem perder o status", () => {
    const restored = new OfflineIntentQueue(undefined, [
      {
        id: "i-restored",
        commandType: "MARK_NOTIFICATION_READ",
        idempotencyKey: "read:1",
        createdOn: "2026-01-01T00:00:00.000Z",
        expiresOn: "2026-01-02T00:00:00.000Z",
        status: "SUBMITTED",
      },
      {
        id: "i-forbidden",
        commandType: "market:submit-offer",
        idempotencyKey: "offer:1",
        createdOn: "2026-01-01T00:00:00.000Z",
        expiresOn: "2026-01-02T00:00:00.000Z",
        status: "QUEUED",
      },
    ]);

    expect(restored.snapshot()).toEqual([
      expect.objectContaining({ id: "i-restored", status: "SUBMITTED" }),
    ]);
  });
});
