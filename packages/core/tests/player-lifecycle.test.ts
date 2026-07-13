import {
  DomainError,
  WorldDate,
  newGameWorldId,
  parseRulesetVersion,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  ProcessPlayerDay,
  WorldGenesisGenerator,
  WorldPlayerLifecycle,
  buildPlayerDailyTasks,
  type GameWorldSnapshot,
  type PlayerLifecycleRepository,
  type WorldPlayerLifecycleSnapshot,
} from "../src/index.js";

class MemoryPlayerRepository implements PlayerLifecycleRepository {
  public snapshot: WorldPlayerLifecycleSnapshot | null = null;

  public findPlayerLifecycleByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldPlayerLifecycleSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public savePlayerLifecycle(
    snapshot: WorldPlayerLifecycleSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("PLAYER_LIFECYCLE_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(): GameWorldSnapshot {
  const rulesetVersion = parseRulesetVersion("1.0.0");
  if (!rulesetVersion.ok) throw rulesetVersion.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "player-lifecycle-001",
    startDate: date("2026-01-01"),
    rulesetVersion: rulesetVersion.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function lifecycle() {
  const gameWorld = world();
  const genesis = new WorldGenesisGenerator().generate(gameWorld);
  const created = WorldPlayerLifecycle.fromGenesis(gameWorld, genesis);
  if (!created.ok) throw created.error;
  return { gameWorld, genesis, value: created.value };
}

describe("Player lifecycle", () => {
  it("materializa 368 pessoas/jogadores com uma origem única por atleta", () => {
    const { value } = lifecycle();
    const snapshot = value.snapshot();

    expect(snapshot.persons).toHaveLength(368);
    expect(snapshot.players).toHaveLength(368);
    expect(snapshot.generationEvents).toHaveLength(368);
    expect(
      new Set(snapshot.generationEvents.map(({ playerId }) => playerId)),
    ).toHaveLength(368);
    expect(
      snapshot.generationEvents.every(
        ({ type, source }) =>
          type === "PlayerGenerated" && source === "INITIAL_WORLD",
      ),
    ).toBe(true);
    expect("clubId" in snapshot.players[0]!).toBe(false);
  });

  it("rejeita qualquer jogador sem PlayerGenerated", () => {
    const { value } = lifecycle();
    const snapshot = value.snapshot();
    const corrupted = {
      ...snapshot,
      generationEvents: snapshot.generationEvents.slice(1),
    };

    expect(WorldPlayerLifecycle.fromSnapshot(corrupted)).toMatchObject({
      ok: false,
      error: { code: "INVALID_PLAYER_LIFECYCLE" },
    });
  });

  it("processa dias em ordem, recupera estado dinâmico e não duplica o tick", () => {
    const { value } = lifecycle();
    const snapshot = value.snapshot();
    const players = [...snapshot.players];
    players[0] = {
      ...players[0]!,
      dynamicState: {
        morale: 45,
        confidence: 55,
        happiness: 40,
        fatigue: 10,
        matchSharpness: 50,
      },
    };
    const loaded = WorldPlayerLifecycle.fromSnapshot({ ...snapshot, players });
    if (!loaded.ok) throw loaded.error;

    expect(loaded.value.processDay(date("2026-01-04"))).toEqual({
      ok: true,
      value: true,
    });
    expect(loaded.value.snapshot().players[0]!.dynamicState).toEqual({
      morale: 48,
      confidence: 52,
      happiness: 43,
      fatigue: 4,
      matchSharpness: 47,
    });
    const revision = loaded.value.snapshot().revision;
    expect(loaded.value.processDay(date("2026-01-04"))).toEqual({
      ok: true,
      value: false,
    });
    expect(loaded.value.snapshot().revision).toBe(revision);
    expect(loaded.value.processDay(date("2026-01-03"))).toMatchObject({
      ok: false,
      error: { code: "PLAYER_DAY_OUT_OF_ORDER" },
    });
  });

  it("persiste checkpoint diário idempotente no repositório", async () => {
    const { value } = lifecycle();
    const repository = new MemoryPlayerRepository();
    repository.snapshot = value.snapshot();
    const processor = new ProcessPlayerDay(repository);

    const first = await processor.execute(
      value.snapshot().gameWorldId,
      date("2026-01-02"),
    );
    const revision = repository.snapshot.revision;
    const repeated = await processor.execute(
      value.snapshot().gameWorldId,
      date("2026-01-02"),
    );

    expect(first).toMatchObject({
      ok: true,
      value: { playerCount: 368, lastProcessedOn: "2026-01-02" },
    });
    expect(repeated).toEqual(first);
    expect(repository.snapshot.revision).toBe(revision);
  });

  it("registra evolução completa, limita delta a 6 e respeita o potencial", () => {
    const { gameWorld, value } = lifecycle();
    const candidate = value
      .snapshot()
      .players.find(
        ({ currentAbility, potentialAbility }) =>
          potentialAbility > currentAbility,
      )!;
    const previous = candidate.attributes.technical;
    const changed = value.changeAttribute({
      playerId: candidate.id,
      attributeCode: "technical",
      requestedValue: previous + 20,
      cause: "SEASON_DEVELOPMENT",
      worldDate: "2026-04-01",
      rulesetVersion: gameWorld.rulesetVersion,
      historyContext: `development:${candidate.id}:1:technical`,
      worldSeed: gameWorld.seed,
    });

    expect(changed).toMatchObject({
      ok: true,
      value: {
        playerId: candidate.id,
        attributeCode: "technical",
        previousValue: previous,
        cause: "SEASON_DEVELOPMENT",
        worldDate: "2026-04-01",
        rulesetVersion: "1.0.0",
      },
    });
    if (!changed.ok || changed.value === null) return;
    expect(
      changed.value.nextValue - changed.value.previousValue,
    ).toBeLessThanOrEqual(6);
    expect(value.findPlayer(candidate.id)!.currentAbility).toBeLessThanOrEqual(
      candidate.potentialAbility,
    );
    const revisionAfterChange = value.snapshot().revision;
    const repeated = value.changeAttribute({
      playerId: candidate.id,
      attributeCode: "technical",
      requestedValue: previous + 20,
      cause: "SEASON_DEVELOPMENT",
      worldDate: "2026-04-01",
      rulesetVersion: gameWorld.rulesetVersion,
      historyContext: `development:${candidate.id}:1:technical`,
      worldSeed: gameWorld.seed,
    });
    expect(repeated).toEqual(changed);
    expect(value.snapshot().revision).toBe(revisionAfterChange);
    expect(value.snapshot().developmentHistory).toHaveLength(1);

    const cappedSnapshot = value.snapshot();
    const cappedPlayers = cappedSnapshot.players.map((player) =>
      player.id === candidate.id
        ? { ...player, potentialAbility: player.currentAbility }
        : player,
    );
    const capped = WorldPlayerLifecycle.fromSnapshot({
      ...cappedSnapshot,
      players: cappedPlayers,
    });
    if (!capped.ok) throw capped.error;
    const current = capped.value.findPlayer(candidate.id)!;
    expect(
      capped.value.changeAttribute({
        playerId: candidate.id,
        attributeCode: "technical",
        requestedValue: current.attributes.technical + 6,
        cause: "SEASON_DEVELOPMENT",
        worldDate: "2027-04-01",
        rulesetVersion: gameWorld.rulesetVersion,
        historyContext: `development:${candidate.id}:2:technical`,
        worldSeed: gameWorld.seed,
      }),
    ).toEqual({ ok: true, value: null });
  });

  it("deriva idade da data do mundo sem persistir envelhecimento destrutivo", () => {
    const { value } = lifecycle();
    const player = value.snapshot().players[0]!;
    const atStart = value.inspectPlayer(player.id, date("2026-01-01"))!;
    const later = value.inspectPlayer(player.id, date("2027-01-01"))!;

    expect(later.age - atStart.age).toBeGreaterThanOrEqual(0);
    expect(later.age - atStart.age).toBeLessThanOrEqual(1);
    expect(atStart.person.birthDate).toBe(later.person.birthDate);
  });

  it("agenda um job diário determinístico até o fim da temporada", () => {
    const gameWorldId = newGameWorldId();
    const tasks = buildPlayerDailyTasks({
      gameWorldId,
      worldSeed: "daily-tasks",
      fromExclusive: "2026-01-01",
      throughInclusive: "2026-04-01",
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      type: "players:process-day",
      dueOn: "2026-01-02",
      recurrence: { everyDays: 1, untilOn: "2026-04-01" },
    });
    expect(tasks).toEqual(
      buildPlayerDailyTasks({
        gameWorldId,
        worldSeed: "daily-tasks",
        fromExclusive: "2026-01-01",
        throughInclusive: "2026-04-01",
      }),
    );
  });
});
