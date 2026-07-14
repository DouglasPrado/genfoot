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
  WorldMatches,
  type GameWorldSnapshot,
  type MatchClubRef,
  type MatchFixtureRef,
  type MatchRepository,
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
    expect(started).toMatchObject({ ok: true, value: { status: "IN_PROGRESS" } });
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
