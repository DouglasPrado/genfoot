import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import {
  DominantFoot,
  PlayerPosition,
  type WorldGenesisSnapshot,
} from "../genesis/genesis-types.js";
import type { ScheduledTaskHandler } from "../scheduling/scheduling-types.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import type { PlayerLifecycleRepository } from "./player-lifecycle-repository.js";
import {
  PlayerGenerationSource,
  type PlayerAttributeCode,
  type PlayerInspection,
  type PlayerLifecycleSnapshot,
  type PlayerLifecycleSummary,
  type WorldPlayerLifecycleSnapshot,
} from "./player-lifecycle-types.js";
import {
  WorldPlayerLifecycle,
  type ProspectSpec,
} from "./world-player-lifecycle.js";

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

const MARKET_PLAYERS_PER_CLUB = 10;
const MARKET_POSITIONS = Object.values(PlayerPosition);

export class InitializeMarketPopulation {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public async execute(
    world: GameWorldSnapshot,
    clubCount: number,
  ): Promise<Result<WorldPlayerLifecycleSnapshot, DomainError>> {
    if (!Number.isSafeInteger(clubCount) || clubCount < 1) {
      return fail(
        new DomainError(
          "INVALID_MARKET_POPULATION",
          "A população do mercado exige ao menos um clube.",
        ),
      );
    }
    const loaded = await loadLifecycle(this.repository, world.id);
    if (!loaded.ok) return loaded;
    const lifecycle = loaded.value;
    const expectedRevision = lifecycle.snapshot().revision;
    const target = clubCount * MARKET_PLAYERS_PER_CLUB;
    const existing = lifecycle
      .snapshot()
      .generationEvents.filter(
        ({ source }) => source === PlayerGenerationSource.MARKET_BALANCE,
      ).length;
    const startYear = Number(world.startDate.slice(0, 4));

    for (let index = existing; index < target; index += 1) {
      const position = MARKET_POSITIONS[index % MARKET_POSITIONS.length]!;
      const attribute = 48 + (index % 13);
      const generated = lifecycle.generatePlayer({
        prospect: {
          firstName: `Jogador ${String(index + 1).padStart(3, "0")}`,
          lastName: "Livre",
          birthDate: `${startYear - (19 + (index % 15))}-${String(
            (index % 12) + 1,
          ).padStart(2, "0")}-15`,
          nationality: "BR",
          primaryPosition: position,
          dominantFoot:
            index % 5 === 0 ? DominantFoot.LEFT : DominantFoot.RIGHT,
          attributes: {
            technical: position === PlayerPosition.GK ? 45 : attribute,
            physical: attribute,
            mental: 50 + (index % 11),
            goalkeeping: position === PlayerPosition.GK ? attribute : 0,
          },
          potentialAbility: 65 + (index % 21),
          seasonNumber: 1,
        },
        source: PlayerGenerationSource.MARKET_BALANCE,
        worldDate: world.startDate,
        rulesetVersion: world.rulesetVersion,
        idempotencyKey: `market-balance:season:1:${index}`,
        worldSeed: world.seed,
      });
      if (!generated.ok) return generated;
    }
    if (lifecycle.snapshot().revision !== expectedRevision) {
      await this.repository.savePlayerLifecycle(
        lifecycle.snapshot(),
        expectedRevision,
      );
    }
    return succeed(lifecycle.snapshot());
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

async function mutateLifecycle<T>(
  repository: PlayerLifecycleRepository,
  gameWorldId: GameWorldId,
  apply: (lifecycle: WorldPlayerLifecycle) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadLifecycle(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.savePlayerLifecycle(
      loaded.value.snapshot(),
      expectedRevision,
    );
  }
  return result;
}

export class GeneratePlayer {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      prospect: ProspectSpec;
      source: PlayerGenerationSource;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Promise<Result<PlayerLifecycleSnapshot, DomainError>> {
    return mutateLifecycle(this.repository, gameWorldId, (lifecycle) =>
      lifecycle.generatePlayer(input),
    );
  }
}

export class SetTrainingDirection {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      playerId: string;
      focus: PlayerAttributeCode;
      rulesetVersion: RulesetVersion;
    }>,
  ): Promise<Result<PlayerLifecycleSnapshot, DomainError>> {
    return mutateLifecycle(this.repository, gameWorldId, (lifecycle) =>
      lifecycle.setTrainingDirection(input),
    );
  }
}

export class ApplyDailyDevelopment {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      playerId: string;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Promise<Result<PlayerLifecycleSnapshot, DomainError>> {
    return mutateLifecycle(this.repository, gameWorldId, (lifecycle) =>
      lifecycle.applyDailyDevelopment(input),
    );
  }
}

export class GenerateYouthCohort {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      prospects: readonly ProspectSpec[];
      seasonNumber: number;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Promise<Result<readonly PlayerLifecycleSnapshot[], DomainError>> {
    return mutateLifecycle(this.repository, gameWorldId, (lifecycle) =>
      lifecycle.generateYouthCohort(input),
    );
  }
}

export class PromoteYouth {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      playerId: string;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Promise<Result<PlayerLifecycleSnapshot, DomainError>> {
    return mutateLifecycle(this.repository, gameWorldId, (lifecycle) =>
      lifecycle.promoteYouth(input),
    );
  }
}

export class InspectPlayerLifecycle {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public async world(
    gameWorldId: GameWorldId,
  ): Promise<Result<WorldPlayerLifecycleSnapshot, DomainError>> {
    const loaded = await loadLifecycle(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.snapshot()) : loaded;
  }

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
