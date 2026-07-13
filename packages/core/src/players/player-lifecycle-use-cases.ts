import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type GameWorldId,
  type Result,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";
import type { ScheduledTaskHandler } from "../scheduling/scheduling-types.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import type { PlayerLifecycleRepository } from "./player-lifecycle-repository.js";
import type {
  PlayerInspection,
  PlayerLifecycleSummary,
  WorldPlayerLifecycleSnapshot,
} from "./player-lifecycle-types.js";
import { WorldPlayerLifecycle } from "./world-player-lifecycle.js";

export class InitializePlayerLifecycle {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public async execute(
    world: GameWorldSnapshot,
    genesis: WorldGenesisSnapshot,
  ): Promise<Result<WorldPlayerLifecycleSnapshot, DomainError>> {
    const existing = await this.repository.findPlayerLifecycleByWorldId(
      world.id,
    );
    if (existing !== null) {
      const validated = WorldPlayerLifecycle.fromSnapshot(existing);
      return validated.ok ? succeed(validated.value.snapshot()) : validated;
    }
    const created = WorldPlayerLifecycle.fromGenesis(world, genesis);
    if (!created.ok) return created;
    await this.repository.savePlayerLifecycle(created.value.snapshot(), null);
    return succeed(created.value.snapshot());
  }
}

export class ProcessPlayerDay {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public async execute(
    gameWorldId: GameWorldId,
    on: WorldDate,
  ): Promise<Result<PlayerLifecycleSummary, DomainError>> {
    const loaded = await loadLifecycle(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    const expectedRevision = loaded.value.snapshot().revision;
    const processed = loaded.value.processDay(on);
    if (!processed.ok) return processed;
    if (processed.value) {
      await this.repository.savePlayerLifecycle(
        loaded.value.snapshot(),
        expectedRevision,
      );
    }
    return succeed(loaded.value.summary());
  }
}

export class InspectPlayerLifecycle {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<PlayerLifecycleSummary, DomainError>> {
    const loaded = await loadLifecycle(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }

  public async player(
    gameWorldId: GameWorldId,
    playerId: string,
    on?: WorldDate,
  ): Promise<Result<PlayerInspection, DomainError>> {
    const loaded = await loadLifecycle(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    const snapshots = loaded.value.snapshot().players;
    const current = snapshots.find(({ id }) => id === playerId);
    if (current === undefined) {
      return fail(
        new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado.", {
          playerId,
        }),
      );
    }
    const fallbackDate = WorldDate.parse(current.lastProcessedOn);
    if (!fallbackDate.ok) return fallbackDate;
    const player = loaded.value.inspectPlayer(
      playerId,
      on ?? fallbackDate.value,
    );
    return player === null
      ? fail(
          new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado.", {
            playerId,
          }),
        )
      : succeed(player);
  }
}

export function createPlayerDayTaskHandler(
  repository: PlayerLifecycleRepository,
): ScheduledTaskHandler {
  return async (context) => {
    const date = WorldDate.parse(context.worldDate);
    if (!date.ok) throw date.error;
    const processed = await new ProcessPlayerDay(repository).execute(
      context.gameWorldId,
      date.value,
    );
    if (!processed.ok) throw processed.error;
  };
}

export function buildPlayerDailyTasks(
  input: Readonly<{
    gameWorldId: GameWorldId;
    worldSeed: string;
    fromExclusive: string;
    throughInclusive: string;
  }>,
) {
  const from = WorldDate.parse(input.fromExclusive);
  if (!from.ok) throw from.error;
  const through = WorldDate.parse(input.throughInclusive);
  if (!through.ok) throw through.error;
  const firstDueOn = from.value.addDays(1).toString();
  if (firstDueOn > through.value.toString()) return [];
  return [
    {
      id: deterministicUuidV7<"ScheduledTask">({
        worldSeed: input.worldSeed,
        context: "players:process-day:recurring",
        timestampMilliseconds: Date.parse(`${firstDueOn}T00:00:00.000Z`),
      }),
      type: "players:process-day",
      dueOn: firstDueOn,
      priority: 20,
      payload: {},
      idempotencyKey: `players:process-day:${input.gameWorldId}`,
      recurrence: { everyDays: 1, untilOn: through.value.toString() },
    },
  ];
}

async function loadLifecycle(
  repository: PlayerLifecycleRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldPlayerLifecycle, DomainError>> {
  const snapshot = await repository.findPlayerLifecycleByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "PLAYER_LIFECYCLE_NOT_FOUND",
        "O lifecycle de jogadores ainda não foi inicializado.",
        { gameWorldId },
      ),
    );
  }
  return WorldPlayerLifecycle.fromSnapshot(snapshot);
}
