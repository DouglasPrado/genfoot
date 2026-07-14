import {
  DomainError,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  ApplyNarrativeFact,
  GameWorld,
  WorldNarrative,
  type GameWorldSnapshot,
  type NarrativeClubRef,
  type NarrativeRepository,
  type WorldNarrativeSnapshot,
} from "../../src/index.js";

class MemoryNarrativeRepository implements NarrativeRepository {
  public snapshot: WorldNarrativeSnapshot | null = null;

  public findNarrativeByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldNarrativeSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveNarrative(
    snapshot: WorldNarrativeSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("NARRATIVE_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

const CLUB = "019f0000-0000-7000-8000-0000000000c1" as NarrativeClubRef;

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "narrative-001"): GameWorldSnapshot {
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

function narrative(seed = "narrative-001") {
  const gameWorld = world(seed);
  const created = WorldNarrative.initialize(gameWorld);
  if (!created.ok) throw created.error;
  return { gameWorld, value: created.value };
}

function applyWin(
  ctx: ReturnType<typeof narrative>,
  factId = "fact:1",
  key = "sat:1",
) {
  return ctx.value.applyMatchFact({
    factId,
    clubId: CLUB,
    outcome: "WIN",
    expected: "DRAW",
    rulesetVersion: ctx.gameWorld.rulesetVersion,
    idempotencyKey: key,
    worldSeed: ctx.gameWorld.seed,
    worldDate: "2026-03-01",
  });
}

describe("Supporters and narrative", () => {
  it("aplica fato oficial de forma determinística e idempotente", () => {
    const first = narrative("det");
    const firstFanbase = applyWin(first);
    const second = narrative("det");
    const secondFanbase = applyWin(second);
    if (!firstFanbase.ok || !secondFanbase.ok) throw new Error("falhou");

    expect(firstFanbase.value.overall).toBe(53);
    expect(firstFanbase.value.overall).toBe(secondFanbase.value.overall);

    const revision = first.value.snapshot().revision;
    const duplicate = applyWin(first, "fact:1", "sat:dup");
    if (!duplicate.ok) throw duplicate.error;
    expect(duplicate.value.overall).toBe(53);
    expect(first.value.snapshot().revision).toBe(revision);
    expect(first.value.snapshot().appliedFactIds).toHaveLength(1);
  });

  it("cria, bloqueia conflito e avalia promessa uma única vez", () => {
    const ctx = narrative();
    const promise = ctx.value.makePublicPromise({
      clubId: CLUB,
      metric: "wins",
      targetValue: 10,
      deadline: "2026-06-30",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "promise:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-01-05",
    });
    expect(promise).toMatchObject({ ok: true, value: { status: "ACTIVE" } });

    expect(
      ctx.value.makePublicPromise({
        clubId: CLUB,
        metric: "wins",
        targetValue: 12,
        deadline: "2026-06-30",
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "promise:2",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-01-06",
      }),
    ).toMatchObject({ ok: false, error: { code: "PROMISE_CONFLICT" } });

    if (!promise.ok) throw promise.error;
    const fulfilled = ctx.value.evaluatePromise({
      promiseId: promise.value.id,
      achievedValue: 12,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "eval:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-07-01",
    });
    expect(fulfilled).toMatchObject({ ok: true, value: { status: "FULFILLED" } });
    expect(ctx.value.reputationFor(CLUB)).toBe(55);

    const revision = ctx.value.snapshot().revision;
    const again = ctx.value.evaluatePromise({
      promiseId: promise.value.id,
      achievedValue: 0,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "eval:again",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-07-02",
    });
    expect(again).toEqual(fulfilled);
    expect(ctx.value.snapshot().revision).toBe(revision);
  });

  it("marca promessa quebrada quando o alvo não é atingido", () => {
    const ctx = narrative();
    const promise = ctx.value.makePublicPromise({
      clubId: CLUB,
      metric: "trophies",
      targetValue: 1,
      deadline: "2026-06-30",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "promise:t",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!promise.ok) throw promise.error;
    expect(
      ctx.value.evaluatePromise({
        promiseId: promise.value.id,
        achievedValue: 0,
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "eval:t",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-07-01",
      }),
    ).toMatchObject({ ok: true, value: { status: "BROKEN" } });
    expect(ctx.value.reputationFor(CLUB)).toBe(42);
  });

  it("percorre a crise WATCH/OPEN -> RECOVERY -> RESOLVED", () => {
    const ctx = narrative();
    const crisis = ctx.value.openCrisis({
      clubId: CLUB,
      cause: "RELEGATION_RISK",
      severity: 80,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "crisis:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-04-01",
    });
    expect(crisis).toMatchObject({ ok: true, value: { status: "OPEN" } });
    if (!crisis.ok) throw crisis.error;

    const recovery = ctx.value.submitRecoveryPlan({
      crisisId: crisis.value.id,
      plan: "contratar atacantes",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "plan:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-04-10",
    });
    expect(recovery).toMatchObject({ ok: true, value: { status: "RECOVERY" } });

    const resolved = ctx.value.resolveCrisis({
      crisisId: crisis.value.id,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "resolve:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-05-01",
    });
    expect(resolved).toMatchObject({ ok: true, value: { status: "RESOLVED" } });

    expect(
      ctx.value.resolveCrisis({
        crisisId: crisis.value.id,
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "resolve:again",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-05-02",
      }),
    ).toMatchObject({ ok: false, error: { code: "CRISIS_NOT_OPEN" } });
  });

  it("aplica fato idempotente via caso de uso", async () => {
    const ctx = narrative();
    const repository = new MemoryNarrativeRepository();
    repository.snapshot = ctx.value.snapshot();
    const useCase = new ApplyNarrativeFact(repository);
    const input = {
      factId: "fact:uc",
      clubId: CLUB,
      outcome: "LOSS" as const,
      expected: "WIN" as const,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "sat:uc",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-03-01",
    };
    const firstRun = await useCase.execute(ctx.gameWorld.id, input);
    const revision = repository.snapshot.revision;
    const repeated = await useCase.execute(ctx.gameWorld.id, {
      ...input,
      idempotencyKey: "sat:uc:dup",
    });

    expect(firstRun).toMatchObject({ ok: true });
    expect(repeated).toEqual(firstRun);
    expect(repository.snapshot.revision).toBe(revision);
  });

  it("responde à imprensa publicando mídia só com opções aprovadas", () => {
    const ctx = narrative();
    // opção fora do conjunto aprovado é rejeitada
    expect(
      ctx.value.chooseConversationOption({
        clubId: CLUB,
        context: "press-conference",
        options: ["calm", "defiant"],
        choice: "insult",
        frame: "aggressive",
        factRefs: ["match:1"],
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "conv:bad",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-03-02",
      }),
    ).toMatchObject({ ok: false, error: { code: "OPTION_NOT_AVAILABLE" } });

    const story = ctx.value.chooseConversationOption({
      clubId: CLUB,
      context: "press-conference",
      options: ["calm", "defiant"],
      choice: "calm",
      frame: "measured-tone",
      factRefs: ["match:1"],
      reputationEffect: 3,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "conv:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-03-02",
    });
    expect(story).toMatchObject({ ok: true, value: { status: "PUBLISHED" } });
    expect(
      ctx.value.snapshot().events.filter((e) => e.type === "MediaStoryPublished"),
    ).toHaveLength(1);
    expect(ctx.value.reputationFor(CLUB)).toBe(53);

    // idempotência por chave: mesma escolha não republica
    const revision = ctx.value.snapshot().revision;
    const repeated = ctx.value.chooseConversationOption({
      clubId: CLUB,
      context: "press-conference",
      options: ["calm", "defiant"],
      choice: "calm",
      frame: "measured-tone",
      factRefs: ["match:1"],
      reputationEffect: 3,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "conv:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-03-02",
    });
    expect(repeated).toMatchObject({ ok: true });
    expect(ctx.value.snapshot().revision).toBe(revision);
  });

  it("cancela promessa ativa e bloqueia cancelamento após o prazo", () => {
    const ctx = narrative();
    const promise = ctx.value.makePublicPromise({
      clubId: CLUB,
      metric: "TOP_4",
      targetValue: 4,
      deadline: "2026-06-30",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "prom:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!promise.ok) throw promise.error;

    // cancelar após o prazo é bloqueado
    expect(
      ctx.value.cancelPromise({
        promiseId: promise.value.id,
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "prom:late",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-07-15",
      }),
    ).toMatchObject({ ok: false, error: { code: "PROMISE_EXPIRED" } });

    const cancelled = ctx.value.cancelPromise({
      promiseId: promise.value.id,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "prom:cancel",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-01",
    });
    expect(cancelled).toMatchObject({ ok: true, value: { status: "CANCELLED" } });

    // rivalidade simétrica registra o par normalizado
    const rival = ctx.value.setRivalry({
      clubA: CLUB,
      clubB: "019f0000-0000-7000-8000-0000000000c2" as NarrativeClubRef,
      intensity: 80,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
    });
    expect(rival).toMatchObject({ ok: true, value: { intensity: 80 } });
    expect(ctx.value.summary().rivalryCount).toBe(1);
  });
});
