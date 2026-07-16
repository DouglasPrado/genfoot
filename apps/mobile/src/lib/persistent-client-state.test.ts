import { describe, expect, it } from "vitest";

import {
  mobileScopeKey,
  PersistentOfflineIntentQueue,
  readCachedQuery,
  writeCachedQuery,
  type KeyValueStorage,
} from "./persistent-client-state";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

describe("estado persistente do cliente mobile", () => {
  it("segrega cache por conta, mundo e controle", async () => {
    const storage = new MemoryStorage();
    const first = mobileScopeKey("account-a", "world-1", "control-a");
    const second = mobileScopeKey("account-a", "world-1", "control-b");
    await writeCachedQuery(storage, first, "club", {
      data: { club: "A" },
      asOf: "2026-01-01",
      projectionVersion: 3,
    });

    expect((await readCachedQuery(storage, first, "club"))?.data).toEqual({
      club: "A",
    });
    expect(await readCachedQuery(storage, second, "club")).toBeNull();
  });

  it("persiste fila permitida e não restaura ação irreversível", async () => {
    const storage = new MemoryStorage();
    const scope = mobileScopeKey("account-a", "world-1", "control-a");
    const queue = await PersistentOfflineIntentQueue.load(storage, scope);
    const allowed = await queue.enqueue({
      id: "read-1",
      commandType: "MARK_NOTIFICATION_READ",
      idempotencyKey: "read:1",
      createdOn: "2026-01-01",
      expiresOn: "2026-01-02",
    });
    const forbidden = await queue.enqueue({
      id: "offer-1",
      commandType: "market:submit-offer",
      idempotencyKey: "offer:1",
      createdOn: "2026-01-01",
      expiresOn: "2026-01-02",
    });

    expect(allowed.ok).toBe(true);
    expect(forbidden).toMatchObject({
      ok: false,
      error: { code: "COMMAND_FORBIDDEN_OFFLINE" },
    });
    const restored = await PersistentOfflineIntentQueue.load(storage, scope);
    expect(restored.snapshot()).toHaveLength(1);
  });
});
