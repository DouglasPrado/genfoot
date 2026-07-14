import { describe, expect, it } from "vitest";

import { QueryCache, type QueryEnvelope } from "../src/index.js";

function envelope<T>(
  data: T,
  projectionVersion: number,
): QueryEnvelope<T> {
  return {
    data,
    asOf: "2026-01-01",
    projectionVersion,
    pagination: { limit: 50, offset: 0, returned: 1, total: 1, hasMore: false },
    scope: {},
  };
}

describe("QueryCache (FR-009)", () => {
  it("segrega por escopo — nunca mistura mundos", () => {
    const cache = new QueryCache();
    cache.put("world-A", "club", envelope({ n: "A" }, 1));
    cache.put("world-B", "club", envelope({ n: "B" }, 1));
    expect(cache.get<{ n: string }>("world-A", "club")?.data.n).toBe("A");
    expect(cache.get<{ n: string }>("world-B", "club")?.data.n).toBe("B");
  });

  it("imutável por versão — não regride para uma projectionVersion mais antiga", () => {
    const cache = new QueryCache();
    cache.put("w", "ledger", envelope({ v: "new" }, 5));
    cache.put("w", "ledger", envelope({ v: "old" }, 3)); // versão antiga
    expect(cache.get<{ v: string }>("w", "ledger")?.data.v).toBe("new");
    expect(cache.get("w", "ledger")?.projectionVersion).toBe(5);
  });

  it("aceita versão igual ou mais nova", () => {
    const cache = new QueryCache();
    cache.put("w", "market", envelope({ v: 1 }, 2));
    cache.put("w", "market", envelope({ v: 2 }, 4));
    expect(cache.get<{ v: number }>("w", "market")?.data.v).toBe(2);
  });

  it("clearScope apaga só o escopo trocado", () => {
    const cache = new QueryCache();
    cache.put("world-A", "club", envelope({}, 1));
    cache.put("world-A", "ledger", envelope({}, 1));
    cache.put("world-B", "club", envelope({}, 1));
    cache.clearScope("world-A");
    expect(cache.get("world-A", "club")).toBeUndefined();
    expect(cache.get("world-A", "ledger")).toBeUndefined();
    expect(cache.get("world-B", "club")).toBeDefined();
  });
});
