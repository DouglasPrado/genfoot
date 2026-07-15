import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldNarrative,
  seedFanbaseSize,
  type GameWorldSnapshot,
  type NarrativeClubRef,
} from "../../src/index.js";

const CLUB = "019f0000-0000-7000-8000-0000000000c1" as NarrativeClubRef;

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "rebrand-001"): GameWorldSnapshot {
  const rulesetVersion = parseRulesetVersion("1.0.0");
  if (!rulesetVersion.ok) throw rulesetVersion.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed,
    startDate: date("2026-01-01"),
    rulesetVersion: rulesetVersion.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function narrative(seed = "rebrand-001") {
  const gameWorld = world(seed);
  const created = WorldNarrative.initialize(gameWorld);
  if (!created.ok) throw created.error;
  return { gameWorld, value: created.value };
}

function rebrand(
  ctx: ReturnType<typeof narrative>,
  overrides: {
    factId?: string;
    baseSize?: number;
    idempotencyKey?: string;
  } = {},
) {
  return ctx.value.applyRebrandFact({
    factId: overrides.factId ?? "rebrand:1",
    clubId: CLUB,
    baseSize: overrides.baseSize ?? 100_000,
    changedFields: ["name", "primaryColor"],
    rulesetVersion: ctx.gameWorld.rulesetVersion,
    idempotencyKey: overrides.idempotencyKey ?? "reb:1",
    worldSeed: ctx.gameWorld.seed,
    worldDate: "2026-06-15",
  });
}

describe("club rebrand → fanbase drop (C10)", () => {
  it("reduz a torcida entre 10% e 15% e emite SupporterBaseChanged", () => {
    const ctx = narrative();
    const result = rebrand(ctx, { baseSize: 100_000 });

    expect(result.ok).toBe(true);
    if (!result.ok) throw result.error;
    // 10–15% de queda sobre 100_000 → [85_000, 90_000].
    expect(result.value.fanbaseSize).toBeGreaterThanOrEqual(85_000);
    expect(result.value.fanbaseSize).toBeLessThanOrEqual(90_000);
    expect(result.value.fanbaseSize).toBeLessThan(100_000);

    const event = ctx.value
      .snapshot()
      .events.find((e) => e.type === "SupporterBaseChanged");
    expect(event).toBeDefined();
    if (event?.type !== "SupporterBaseChanged") throw new Error("sem evento");
    expect(event.previousSize).toBe(100_000);
    expect(event.newSize).toBe(result.value.fanbaseSize);
    expect(event.dropPermille).toBeGreaterThanOrEqual(100);
    expect(event.dropPermille).toBeLessThanOrEqual(150);
    expect(event.reason).toBe("REBRAND");
  });

  it("é determinística: mesmo worldSeed + factId ⇒ mesma queda", () => {
    const a = rebrand(narrative("same-seed"));
    const b = rebrand(narrative("same-seed"));
    if (!a.ok || !b.ok) throw new Error("falhou");
    expect(a.value.fanbaseSize).toBe(b.value.fanbaseSize);
  });

  it("é idempotente por factId: reaplicar não muda nada", () => {
    const ctx = narrative();
    const first = rebrand(ctx);
    if (!first.ok) throw first.error;
    const revision = ctx.value.snapshot().revision;

    const retry = rebrand(ctx, { idempotencyKey: "reb:diff" });
    if (!retry.ok) throw retry.error;
    expect(retry.value.fanbaseSize).toBe(first.value.fanbaseSize);
    expect(ctx.value.snapshot().revision).toBe(revision);
    expect(
      ctx.value.snapshot().events.filter((e) => e.type === "SupporterBaseChanged"),
    ).toHaveLength(1);
  });

  it("um segundo rebranding cai sobre o tamanho já gravado, não sobre a base", () => {
    const ctx = narrative();
    const first = rebrand(ctx, { factId: "rebrand:1", baseSize: 100_000 });
    if (!first.ok) throw first.error;
    // baseSize gigante no 2º fato deve ser IGNORADO (usa o size gravado).
    const second = rebrand(ctx, { factId: "rebrand:2", baseSize: 5_000_000 });
    if (!second.ok) throw second.error;
    expect(second.value.fanbaseSize).toBeLessThan(first.value.fanbaseSize!);
    expect(second.value.fanbaseSize).toBeLessThan(100_000);
  });

  it("nunca zera a torcida (piso mínimo)", () => {
    const ctx = narrative();
    const result = rebrand(ctx, { baseSize: 100 });
    if (!result.ok) throw result.error;
    expect(result.value.fanbaseSize).toBeGreaterThanOrEqual(500);
  });
});

describe("seedFanbaseSize", () => {
  it("é determinística e cresce com reputação e capacidade", () => {
    expect(seedFanbaseSize(3, 30_000)).toBe(seedFanbaseSize(3, 30_000));
    expect(seedFanbaseSize(5, 30_000)).toBeGreaterThan(seedFanbaseSize(1, 30_000));
    expect(seedFanbaseSize(3, 60_000)).toBeGreaterThan(seedFanbaseSize(3, 30_000));
  });
});
