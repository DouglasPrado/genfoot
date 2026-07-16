import {
  DomainError,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  FinalizeMatch,
  GameWorld,
  InitializeMatches,
  InspectMatches,
  WorldMatches,
  type GameWorldSnapshot,
  type MatchClubRef,
  type MatchFixtureRef,
  type MatchRepository,
  type WorldCompetitionsSnapshot,
  type WorldMatchesSnapshot,
} from "../../src/index.js";

class MemoryMatchRepository implements MatchRepository {
  public snapshot: WorldMatchesSnapshot | null = null;

  public findMatchesByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldMatchesSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveMatches(
    snapshot: WorldMatchesSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("MATCHES_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

const FIXTURE = "019f0000-0000-7000-8000-0000000000f1" as MatchFixtureRef;
const HOME = "019f0000-0000-7000-8000-0000000000a1" as MatchClubRef;
const AWAY = "019f0000-0000-7000-8000-0000000000a2" as MatchClubRef;

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "match-001"): GameWorldSnapshot {
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

function manifestInput(gameWorld: GameWorldSnapshot, key = "m1") {
  return {
    fixtureRef: FIXTURE,
    homeClubId: HOME,
    awayClubId: AWAY,
    kickoffOn: "2026-02-01",
    seed: gameWorld.seed,
    engineBuild: "kernel@1",
    timestepChances: 30,
    homeStrength: 72,
    awayStrength: 48,
    worldDate: "2026-02-01",
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: key,
    worldSeed: gameWorld.seed,
  };
}

function createdMatch(seed = "match-001", key = "m1") {
  const gameWorld = world(seed);
  const created = WorldMatches.initialize(gameWorld);
  if (!created.ok) throw created.error;
  const value = created.value;
  const match = value.createMatchManifest(manifestInput(gameWorld, key));
  if (!match.ok) throw match.error;
  return { gameWorld, value, matchId: match.value.id };
}

function started(seed = "match-001", key = "m1") {
  const ctx = createdMatch(seed, key);
  const start = ctx.value.startMatch({
    matchId: ctx.matchId,
    rulesetVersion: ctx.gameWorld.rulesetVersion,
    idempotencyKey: `start:${ctx.matchId}`,
    worldSeed: ctx.gameWorld.seed,
    worldDate: "2026-02-01",
  });
  if (!start.ok) throw start.error;
  return ctx;
}

function submit(
  ctx: ReturnType<typeof createdMatch>,
  over: Partial<{
    actor: string;
    side: string;
    delta: number;
    expectedSequence: number;
    idempotencyKey: string;
    commandId: string;
  }> = {},
) {
  return ctx.value.submitMatchCommand({
    matchId: ctx.matchId,
    actor: over.actor ?? "coach-home",
    commandType: "TACTIC_SHIFT",
    side: over.side ?? "HOME",
    delta: over.delta ?? 8,
    payloadHash: "payload-hash",
    expectedSequence: over.expectedSequence ?? 1,
    rulesetVersion: ctx.gameWorld.rulesetVersion,
    commandId: over.commandId ?? "cmd-1",
    idempotencyKey: over.idempotencyKey ?? "cmd:1",
    worldSeed: ctx.gameWorld.seed,
    worldDate: "2026-02-01",
  });
}

function advance(ctx: ReturnType<typeof createdMatch>, ticks: number) {
  return ctx.value.advanceMatchTicks({
    matchId: ctx.matchId,
    ticks,
    rulesetVersion: ctx.gameWorld.rulesetVersion,
  });
}

function startAndFinalize(ctx: ReturnType<typeof createdMatch>) {
  const started = ctx.value.startMatch({
    matchId: ctx.matchId,
    rulesetVersion: ctx.gameWorld.rulesetVersion,
    idempotencyKey: `start:${ctx.matchId}`,
    worldSeed: ctx.gameWorld.seed,
    worldDate: "2026-02-01",
  });
  if (!started.ok) throw started.error;
  const finalized = ctx.value.finalizeMatch({
    matchId: ctx.matchId,
    rulesetVersion: ctx.gameWorld.rulesetVersion,
    idempotencyKey: `final:${ctx.matchId}`,
    worldSeed: ctx.gameWorld.seed,
    worldDate: "2026-02-01",
  });
  if (!finalized.ok) throw finalized.error;
  return finalized.value;
}

describe("Match runtime kernel", () => {
  it("materializa fixtures oficiais ao inicializar e não duplica no retry", async () => {
    const gameWorld = world("competition-bootstrap");
    const repository = new MemoryMatchRepository();
    const competitions = {
      fixtures: [
        {
          id: FIXTURE,
          homeClubId: HOME,
          awayClubId: AWAY,
          kickoffOn: "2026-01-08",
        },
      ],
    } as unknown as WorldCompetitionsSnapshot;

    const initialized = await new InitializeMatches(repository).execute(
      gameWorld,
      competitions,
    );
    const retried = await new InitializeMatches(repository).execute(
      gameWorld,
      competitions,
    );

    expect(initialized).toMatchObject({
      ok: true,
      value: {
        matches: [
          {
            fixtureRef: FIXTURE,
            status: "CREATED",
            kickoffOn: "2026-01-08",
          },
        ],
      },
    });
    expect(retried).toMatchObject({ ok: true });
    expect(repository.snapshot?.matches).toHaveLength(1);
  });

  it("entrega o snapshot oficial completo para clientes de partida", async () => {
    const ctx = createdMatch();
    const repository = new MemoryMatchRepository();
    repository.snapshot = ctx.value.snapshot();

    const inspected = await new InspectMatches(repository).world(
      ctx.gameWorld.id,
    );

    expect(inspected).toMatchObject({
      ok: true,
      value: { matches: [{ id: ctx.matchId, status: "CREATED" }] },
    });
  });

  it("cria manifesto e produz um único efeito ao repetir a chave", () => {
    const { gameWorld, value, matchId } = createdMatch();
    expect(value.findMatch(matchId)!.status).toBe("CREATED");
    const revision = value.snapshot().revision;
    const repeated = value.createMatchManifest(manifestInput(gameWorld, "m1"));
    expect(repeated).toMatchObject({ ok: true, value: { id: matchId } });
    expect(value.snapshot().matches).toHaveLength(1);
    expect(value.snapshot().revision).toBe(revision);
  });

  it("inicia e finaliza a partida com hashes e eventos oficiais", () => {
    const { gameWorld, value, matchId } = createdMatch();

    const started = value.startMatch({
      matchId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "start:m1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    expect(started).toMatchObject({
      ok: true,
      value: { status: "IN_PROGRESS" },
    });
    expect(
      value.startMatch({
        matchId,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "start:again",
        worldSeed: gameWorld.seed,
        worldDate: "2026-02-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "MATCH_ALREADY_STARTED" } });

    const finalized = value.finalizeMatch({
      matchId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "final:m1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!finalized.ok) throw finalized.error;
    expect(finalized.value.status).toBe("FINAL");
    expect(finalized.value.result).not.toBeNull();
    expect(finalized.value.result!.resultHash).toMatch(/^[0-9a-f]{16}$/);
    expect(
      value.snapshot().events.filter((e) => e.type === "MatchResultOfficial"),
    ).toHaveLength(1);

    const revision = value.snapshot().revision;
    const again = value.finalizeMatch({
      matchId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "final:again",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-02",
    });
    expect(again).toEqual(finalized);
    expect(value.snapshot().revision).toBe(revision);
  });

  it("prova determinismo online ≡ offline ≡ replay via resultHash/statsHash", () => {
    const first = createdMatch("determinismo", "shared");
    const firstFinal = startAndFinalize(first);

    const second = createdMatch("determinismo", "shared");
    const secondFinal = startAndFinalize(second);

    expect(firstFinal.result!.resultHash).toBe(secondFinal.result!.resultHash);
    expect(firstFinal.result!.statsHash).toBe(secondFinal.result!.statsHash);

    const replay = first.value.replayMatch(first.matchId);
    expect(replay).toMatchObject({ ok: true, value: { deterministic: true } });
  });

  it("rejeita finalizar antes de iniciar e ruleset divergente", () => {
    const { gameWorld, value, matchId } = createdMatch();
    expect(
      value.finalizeMatch({
        matchId,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "final:early",
        worldSeed: gameWorld.seed,
        worldDate: "2026-02-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "MATCH_NOT_STARTED" } });

    const otherRuleset = parseRulesetVersion("2.0.0");
    if (!otherRuleset.ok) throw otherRuleset.error;
    expect(
      value.startMatch({
        matchId,
        rulesetVersion: otherRuleset.value,
        idempotencyKey: "start:bad",
        worldSeed: gameWorld.seed,
        worldDate: "2026-02-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "RULESET_VERSION_MISMATCH" } });
  });

  it("aceita command log com ordem, cooldown, janela e idempotência", () => {
    const ctx = started();

    const first = submit(ctx, { idempotencyKey: "cmd:1", commandId: "c1" });
    expect(first).toMatchObject({
      ok: true,
      value: { matchSequence: 1, tick: 0, accepted: true },
    });

    // idempotência: mesma chave = efeito único (sem novo evento nem revisão)
    const revisionAfterFirst = ctx.value.snapshot().revision;
    const replay = submit(ctx, { idempotencyKey: "cmd:1", commandId: "c1" });
    expect(replay).toMatchObject({ ok: true, value: { matchSequence: 1 } });
    expect(ctx.value.snapshot().revision).toBe(revisionAfterFirst);
    expect(
      ctx.value
        .snapshot()
        .events.filter((e) => e.type === "MatchCommandAccepted"),
    ).toHaveLength(1);

    // cooldown: mesmo actor no mesmo tick é rejeitado
    expect(
      submit(ctx, {
        actor: "coach-home",
        expectedSequence: 2,
        idempotencyKey: "cmd:cooldown",
        commandId: "c-cd",
      }),
    ).toMatchObject({ ok: false, error: { code: "MATCH_COMMAND_COOLDOWN" } });

    // outro actor: aceito na sequência 2
    expect(
      submit(ctx, {
        actor: "coach-away",
        side: "AWAY",
        expectedSequence: 2,
        idempotencyKey: "cmd:2",
        commandId: "c2",
      }),
    ).toMatchObject({ ok: true, value: { matchSequence: 2 } });

    // sequência atrasada e lacuna
    expect(
      submit(ctx, {
        actor: "coach-x",
        expectedSequence: 1,
        idempotencyKey: "cmd:stale",
        commandId: "c-st",
      }),
    ).toMatchObject({ ok: false, error: { code: "MATCH_COMMAND_STALE" } });
    expect(
      submit(ctx, {
        actor: "coach-y",
        expectedSequence: 9,
        idempotencyKey: "cmd:gap",
        commandId: "c-gap",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "MATCH_COMMAND_SEQUENCE_GAP" },
    });

    // fora da janela: após esgotar os ticks nenhum command é aceito
    const done = advance(ctx, 30);
    if (!done.ok) throw done.error;
    expect(
      submit(ctx, {
        actor: "coach-z",
        expectedSequence: 3,
        idempotencyKey: "cmd:late",
        commandId: "c-late",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "MATCH_COMMAND_OUT_OF_WINDOW" },
    });
  });

  it("avança ticks: online (incremental) ≡ offline (uma vez) ≡ finalize", () => {
    // mesmo (worldSeed, chave) ⇒ mesmo matchId ⇒ mesma âncora determinística
    const oneShot = started("live", "same");
    const incremental = started("live", "same");
    const wholeMatch = started("live", "same");

    const full = advance(oneShot, 30);
    if (!full.ok) throw full.error;

    for (const step of [10, 10, 10]) {
      const partial = advance(incremental, step);
      if (!partial.ok) throw partial.error;
    }
    const inc = incremental.value.findMatch(incremental.matchId)!;

    expect(inc.runtime).toEqual(full.value.runtime);
    expect(inc.runtime!.currentTick).toBe(30);

    const finalized = wholeMatch.value.finalizeMatch({
      matchId: wholeMatch.matchId,
      rulesetVersion: wholeMatch.gameWorld.rulesetVersion,
      idempotencyKey: "final:whole",
      worldSeed: wholeMatch.gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!finalized.ok) throw finalized.error;
    expect(inc.runtime!.homeGoals).toBe(finalized.value.result!.homeGoals);
    expect(inc.runtime!.awayGoals).toBe(finalized.value.result!.awayGoals);
  });

  it("faz checkpoint e retoma sem duplicação (resume idempotente)", () => {
    const ctx = started("resume", "cp");
    const to15 = advance(ctx, 15);
    if (!to15.ok) throw to15.error;
    const stateAt15 = { ...to15.value.runtime! };

    const checkpoint = ctx.value.checkpointMatch({
      matchId: ctx.matchId,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "cp:15",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!checkpoint.ok) throw checkpoint.error;
    expect(checkpoint.value.checkpoints).toHaveLength(1);

    const to30 = advance(ctx, 15);
    if (!to30.ok) throw to30.error;
    expect(to30.value.runtime!.currentTick).toBe(30);

    const resumed = ctx.value.resumeMatch({
      matchId: ctx.matchId,
      checkpointTick: 15,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
    });
    if (!resumed.ok) throw resumed.error;
    expect(resumed.value.runtime).toEqual(stateAt15);

    // resume de novo no mesmo checkpoint é no-op (sem nova revisão)
    const revision = ctx.value.snapshot().revision;
    const again = ctx.value.resumeMatch({
      matchId: ctx.matchId,
      checkpointTick: 15,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
    });
    expect(again).toMatchObject({ ok: true });
    expect(ctx.value.snapshot().revision).toBe(revision);
    expect(
      ctx.value.snapshot().events.filter((e) => e.type === "MatchCheckpointed"),
    ).toHaveLength(1);

    expect(
      ctx.value.resumeMatch({
        matchId: ctx.matchId,
        checkpointTick: 7,
        rulesetVersion: ctx.gameWorld.rulesetVersion,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "MATCH_CHECKPOINT_NOT_FOUND" },
    });
  });

  it("command log altera o resultado e mantém replay ≡ execução com log", () => {
    const plain = started("influence", "plain");
    const withCommand = started("influence", "cmd");

    const submitted = withCommand.value.submitMatchCommand({
      matchId: withCommand.matchId,
      actor: "coach-home",
      commandType: "TACTIC_SHIFT",
      side: "HOME",
      delta: 8,
      payloadHash: "attack",
      expectedSequence: 1,
      rulesetVersion: withCommand.gameWorld.rulesetVersion,
      commandId: "c1",
      idempotencyKey: "cmd:influence",
      worldSeed: withCommand.gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!submitted.ok) throw submitted.error;

    const plainFinal = plain.value.finalizeMatch({
      matchId: plain.matchId,
      rulesetVersion: plain.gameWorld.rulesetVersion,
      idempotencyKey: "final:plain",
      worldSeed: plain.gameWorld.seed,
      worldDate: "2026-02-01",
    });
    const cmdFinal = withCommand.value.finalizeMatch({
      matchId: withCommand.matchId,
      rulesetVersion: withCommand.gameWorld.rulesetVersion,
      idempotencyKey: "final:cmd",
      worldSeed: withCommand.gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!plainFinal.ok || !cmdFinal.ok) throw new Error("finalize falhou");

    expect(cmdFinal.value.result!.resultHash).not.toBe(
      plainFinal.value.result!.resultHash,
    );

    const replay = withCommand.value.replayMatch(withCommand.matchId);
    expect(replay).toMatchObject({ ok: true, value: { deterministic: true } });
  });

  it("finaliza de forma idempotente e determinística via caso de uso", async () => {
    const { gameWorld, value, matchId } = createdMatch();
    const started = value.startMatch({
      matchId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "start:uc",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!started.ok) throw started.error;
    const repository = new MemoryMatchRepository();
    repository.snapshot = value.snapshot();
    const useCase = new FinalizeMatch(repository);
    const input = {
      matchId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "final:uc",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    };

    const first = await useCase.execute(gameWorld.id, input);
    const revision = repository.snapshot.revision;
    const repeated = await useCase.execute(gameWorld.id, input);

    expect(first).toMatchObject({ ok: true, value: { status: "FINAL" } });
    expect(repeated).toEqual(first);
    expect(repository.snapshot.revision).toBe(revision);
  });
});
