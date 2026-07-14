import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type GameWorldId,
  type Result,
} from "@grinta/shared";

import {
  ActivateWorld,
  type WorldMutationResult,
} from "../world/world-use-cases.js";
import type { ClubPortfolioRepository } from "../clubs/club-repository.js";
import { buildClubDailyTasks } from "../clubs/club-maintenance.js";
import { InitializeClubPortfolio } from "../clubs/club-use-cases.js";
import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { PlayerLifecycleRepository } from "../players/player-lifecycle-repository.js";
import {
  InitializePlayerLifecycle,
  buildPlayerDailyTasks,
} from "../players/player-lifecycle-use-cases.js";
import type { SchedulingRepository } from "../scheduling/scheduling-repository.js";
import {
  BootstrapWorldScheduler,
  ScheduleWorldTasks,
} from "../scheduling/scheduling-use-cases.js";
import type { WorldRepository } from "../world/world-repository.js";
import { WorldStatus } from "../world/world-types.js";
import type { WorldGenesisSummary } from "./genesis-types.js";
import { WorldGenesisGenerator } from "./world-genesis-generator.js";
import type { WorldGenesisRepository } from "./world-genesis-repository.js";
import { validateWorldGenesis } from "./world-genesis-validator.js";

export interface GenerateWorldGenesisResult {
  readonly created: boolean;
  readonly summary: WorldGenesisSummary;
}

export class GenerateWorldGenesis {
  public constructor(
    private readonly worldRepository: WorldRepository,
    private readonly genesisRepository: WorldGenesisRepository,
    private readonly generator = new WorldGenesisGenerator(),
    private readonly playerLifecycleRepository?: PlayerLifecycleRepository,
    private readonly clubPortfolioRepository?: ClubPortfolioRepository,
  ) {}

  public async execute(
    gameWorldId: GameWorldId,
  ): Promise<Result<GenerateWorldGenesisResult, DomainError>> {
    const world = await this.worldRepository.findById(gameWorldId);
    if (world === null) {
      return fail(
        new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.", {
          gameWorldId,
        }),
      );
    }
    if (world.status !== WorldStatus.CREATING) {
      return fail(
        new DomainError(
          "WORLD_GENESIS_NOT_ALLOWED",
          "A gênese só pode ser executada enquanto o mundo está CREATING.",
          { status: world.status },
        ),
      );
    }

    const existing = await this.genesisRepository.findByWorldId(gameWorldId);
    if (existing !== null) {
      const validated = validateWorldGenesis(world, existing);
      if (!validated.ok) return validated;
      const initialized = await this.initializePlayers(world, existing);
      if (!initialized.ok) return initialized;
      const clubs = await this.initializeClubs(world, existing);
      if (!clubs.ok) return clubs;
      return succeed({ created: false, summary: validated.value.summary });
    }

    const genesis = this.generator.generate(world);
    const validated = validateWorldGenesis(world, genesis);
    if (!validated.ok) return validated;

    await this.genesisRepository.saveGenesis(genesis, world.version);
    const initialized = await this.initializePlayers(world, genesis);
    if (!initialized.ok) return initialized;
    const clubs = await this.initializeClubs(world, genesis);
    if (!clubs.ok) return clubs;
    return succeed({ created: true, summary: validated.value.summary });
  }

  private async initializePlayers(
    world: Parameters<InitializePlayerLifecycle["execute"]>[0],
    genesis: Parameters<InitializePlayerLifecycle["execute"]>[1],
  ): Promise<Result<void, DomainError>> {
    if (this.playerLifecycleRepository === undefined) return succeed(undefined);
    const initialized = await new InitializePlayerLifecycle(
      this.playerLifecycleRepository,
    ).execute(world, genesis);
    return initialized.ok ? succeed(undefined) : initialized;
  }

  private async initializeClubs(
    world: Parameters<InitializeClubPortfolio["execute"]>[0],
    genesis: Parameters<InitializeClubPortfolio["execute"]>[1],
  ): Promise<Result<void, DomainError>> {
    if (this.clubPortfolioRepository === undefined) return succeed(undefined);
    const initialized = await new InitializeClubPortfolio(
      this.clubPortfolioRepository,
    ).execute(world, genesis);
    return initialized.ok ? succeed(undefined) : initialized;
  }
}

export class ActivateProvisionedWorld {
  public constructor(
    private readonly worldRepository: WorldRepository,
    private readonly genesisRepository: WorldGenesisRepository,
    private readonly schedulingRepository?: SchedulingRepository,
    private readonly playerLifecycleRepository?: PlayerLifecycleRepository,
    private readonly clubPortfolioRepository?: ClubPortfolioRepository,
  ) {}

  public async execute(
    gameWorldId: GameWorldId,
  ): Promise<Result<WorldMutationResult, DomainError>> {
    const world = await this.worldRepository.findById(gameWorldId);
    if (world === null) {
      return fail(
        new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.", {
          gameWorldId,
        }),
      );
    }
    const genesis = await this.genesisRepository.findByWorldId(gameWorldId);
    if (genesis === null) {
      return fail(
        new DomainError(
          "WORLD_GENESIS_NOT_FOUND",
          "Execute world:genesis antes de ativar o mundo.",
          { gameWorldId },
        ),
      );
    }

    const validated = validateWorldGenesis(world, genesis);
    if (!validated.ok) return validated;

    if (this.playerLifecycleRepository !== undefined) {
      const initialized = await new InitializePlayerLifecycle(
        this.playerLifecycleRepository,
      ).execute(world, genesis);
      if (!initialized.ok) return initialized;
    }

    if (this.clubPortfolioRepository !== undefined) {
      const initialized = await new InitializeClubPortfolio(
        this.clubPortfolioRepository,
      ).execute(world, genesis);
      if (!initialized.ok) return initialized;
    }

    if (this.schedulingRepository !== undefined) {
      const fixtureDates = genesis.fixtures.map(
        ({ scheduledWorldDate }) => scheduledWorldDate,
      );
      const startsOn = fixtureDates.reduce((left, right) =>
        left < right ? left : right,
      );
      const endsOn = fixtureDates.reduce((left, right) =>
        left > right ? left : right,
      );
      const timestampMilliseconds = Date.parse(`${world.startDate}T00:00:00Z`);
      const parsedEnd = WorldDate.parse(endsOn);
      if (!parsedEnd.ok) return parsedEnd;
      const nextStartsOn = parsedEnd.value.addDays(14);
      const seasonDurationDays = Math.round(
        (Date.parse(`${endsOn}T00:00:00Z`) -
          Date.parse(`${startsOn}T00:00:00Z`)) /
          86_400_000,
      );
      const nextEndsOn = nextStartsOn.addDays(seasonDurationDays);
      const scheduler = await new BootstrapWorldScheduler(
        this.schedulingRepository,
      ).execute({
        gameWorldId,
        rulesetVersion: world.rulesetVersion,
        season: {
          id: deterministicUuidV7<"Season">({
            worldSeed: world.seed,
            context: "season:1",
            timestampMilliseconds,
          }),
          number: 1,
          name: "Temporada 1",
          startsOn,
          endsOn,
        },
        startTaskId: deterministicUuidV7<"ScheduledTask">({
          worldSeed: world.seed,
          context: "season:1:start",
          timestampMilliseconds,
        }),
        dueTaskId: deterministicUuidV7<"ScheduledTask">({
          worldSeed: world.seed,
          context: "season:1:due",
          timestampMilliseconds,
        }),
        rollover: {
          id: deterministicUuidV7<"SeasonRollover">({
            worldSeed: world.seed,
            context: "season:1:rollover",
            timestampMilliseconds,
          }),
          nextSeason: {
            id: deterministicUuidV7<"Season">({
              worldSeed: world.seed,
              context: "season:2",
              timestampMilliseconds: Date.parse(
                `${nextStartsOn.toString()}T00:00:00Z`,
              ),
            }),
            number: 2,
            name: "Temporada 2",
            startsOn: nextStartsOn.toString(),
            endsOn: nextEndsOn.toString(),
          },
        },
      });
      if (!scheduler.ok) return scheduler;
      const playerTasks = await new ScheduleWorldTasks(
        this.schedulingRepository,
      ).execute(
        gameWorldId,
        buildPlayerDailyTasks({
          gameWorldId,
          worldSeed: world.seed,
          fromExclusive: world.startDate,
          throughInclusive: endsOn,
        }),
      );
      if (!playerTasks.ok) return playerTasks;
      const clubTasks = await new ScheduleWorldTasks(
        this.schedulingRepository,
      ).execute(
        gameWorldId,
        buildClubDailyTasks({
          gameWorldId,
          worldSeed: world.seed,
          fromExclusive: world.startDate,
          throughInclusive: endsOn,
        }),
      );
      if (!clubTasks.ok) return clubTasks;
    }

    return new ActivateWorld(this.worldRepository).execute(
      gameWorldId,
      validated.value.evidence,
    );
  }
}
