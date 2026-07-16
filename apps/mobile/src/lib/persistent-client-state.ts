import { OfflineIntentQueue, type OfflineIntent } from "@grinta/core";

export interface KeyValueStorage {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
}

export interface PersistentCachedQuery<T = unknown> {
  readonly data: T;
  readonly asOf: string;
  readonly projectionVersion: number;
}

export function mobileScopeKey(
  accountId: string,
  worldId: string,
  controlId: string | null,
): string {
  return [accountId, worldId, controlId ?? "no-control"]
    .map(encodeURIComponent)
    .join(":");
}

function cacheKey(scopeKey: string, queryType: string): string {
  return `grinta:v1:query:${scopeKey}:${encodeURIComponent(queryType)}`;
}

function intentsKey(scopeKey: string): string {
  return `grinta:v1:intents:${scopeKey}`;
}

export async function readCachedQuery<T>(
  storage: KeyValueStorage,
  scopeKey: string,
  queryType: string,
): Promise<PersistentCachedQuery<T> | null> {
  try {
    const raw = await storage.getItem(cacheKey(scopeKey, queryType));
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<PersistentCachedQuery<T>>;
    if (
      typeof parsed.asOf !== "string" ||
      typeof parsed.projectionVersion !== "number" ||
      !("data" in parsed)
    ) {
      return null;
    }
    return parsed as PersistentCachedQuery<T>;
  } catch {
    return null;
  }
}

export async function writeCachedQuery<T>(
  storage: KeyValueStorage,
  scopeKey: string,
  queryType: string,
  entry: PersistentCachedQuery<T>,
): Promise<void> {
  const current = await readCachedQuery<T>(storage, scopeKey, queryType);
  if (current !== null && current.projectionVersion > entry.projectionVersion) {
    return;
  }
  await storage.setItem(cacheKey(scopeKey, queryType), JSON.stringify(entry));
}

/** Fila persistida que delega whitelist, TTL e deduplicação ao kernel oficial. */
export class PersistentOfflineIntentQueue {
  private constructor(
    private readonly storage: KeyValueStorage,
    private readonly scopeKey: string,
    private readonly queue: OfflineIntentQueue,
  ) {}

  static async load(
    storage: KeyValueStorage,
    scopeKey: string,
  ): Promise<PersistentOfflineIntentQueue> {
    let restored: readonly OfflineIntent[] = [];
    try {
      const raw = await storage.getItem(intentsKey(scopeKey));
      if (raw !== null) restored = JSON.parse(raw) as readonly OfflineIntent[];
    } catch {
      restored = [];
    }
    return new PersistentOfflineIntentQueue(
      storage,
      scopeKey,
      new OfflineIntentQueue(undefined, restored),
    );
  }

  async enqueue(input: Parameters<OfflineIntentQueue["enqueue"]>[0]) {
    const result = this.queue.enqueue(input);
    await this.persist();
    return result;
  }

  async revalidate(now: string): Promise<readonly OfflineIntent[]> {
    const submitted = this.queue.revalidate(now);
    await this.persist();
    return submitted;
  }

  snapshot(): readonly OfflineIntent[] {
    return this.queue.snapshot();
  }

  private async persist(): Promise<void> {
    await this.storage.setItem(
      intentsKey(this.scopeKey),
      JSON.stringify(this.queue.snapshot()),
    );
  }
}
