import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
} from "@grinta/shared";

import {
  ActivateWorld,
  type WorldMutationResult,
} from "../world/world-use-cases.js";
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
      return validated.ok
        ? succeed({ created: false, summary: validated.value.summary })
        : validated;
    }

    const genesis = this.generator.generate(world);
    const validated = validateWorldGenesis(world, genesis);
    if (!validated.ok) return validated;

    await this.genesisRepository.saveGenesis(genesis, world.version);
    return succeed({ created: true, summary: validated.value.summary });
  }
}

export class ActivateProvisionedWorld {
  public constructor(
    private readonly worldRepository: WorldRepository,
    private readonly genesisRepository: WorldGenesisRepository,
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

    return new ActivateWorld(this.worldRepository).execute(
      gameWorldId,
      validated.value.evidence,
    );
  }
}
