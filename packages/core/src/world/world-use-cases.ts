import {
  DomainError,
  newGameWorldId,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
  type WorldDate,
} from "@grinta/shared";

import { GameWorld } from "./game-world.js";
import type { WorldRepository } from "./world-repository.js";
import type {
  GameWorldSnapshot,
  WorldDomainEvent,
  WorldProvisioningEvidence,
} from "./world-types.js";

export interface WorldMutationResult {
  readonly world: GameWorldSnapshot;
  readonly events: readonly WorldDomainEvent[];
}

export class CreateWorld {
  public constructor(
    private readonly repository: WorldRepository,
    private readonly idFactory: () => GameWorldId = newGameWorldId,
  ) {}

  public async execute(
    input: Readonly<{
      seed: string;
      startDate: WorldDate;
      rulesetVersion: RulesetVersion;
    }>,
  ): Promise<Result<WorldMutationResult, DomainError>> {
    const created = GameWorld.create({ id: this.idFactory(), ...input });
    if (!created.ok) return created;

    await this.repository.save(created.value.snapshot(), null);
    return succeed({
      world: created.value.snapshot(),
      events: created.value.pullDomainEvents(),
    });
  }
}

export class InspectWorld {
  public constructor(private readonly repository: WorldRepository) {}

  public async execute(
    id: GameWorldId,
  ): Promise<Result<GameWorldSnapshot, DomainError>> {
    const snapshot = await this.repository.findById(id);
    return snapshot === null
      ? fail(
          new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.", { id }),
        )
      : succeed(snapshot);
  }
}

export class AdvanceWorldDays {
  public constructor(private readonly repository: WorldRepository) {}

  public async execute(
    id: GameWorldId,
    days: number,
  ): Promise<Result<WorldMutationResult, DomainError>> {
    const loaded = await this.load(id);
    if (!loaded.ok) return loaded;

    const expectedVersion = loaded.value.snapshot().version;
    const advanced = loaded.value.advanceDays(days);
    if (!advanced.ok) return advanced;

    await this.repository.save(loaded.value.snapshot(), expectedVersion);
    return succeed({
      world: loaded.value.snapshot(),
      events: loaded.value.pullDomainEvents(),
    });
  }

  private async load(id: GameWorldId): Promise<Result<GameWorld, DomainError>> {
    const snapshot = await this.repository.findById(id);
    if (snapshot === null) {
      return fail(
        new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.", { id }),
      );
    }

    return GameWorld.fromSnapshot(snapshot);
  }
}

export class ActivateWorld {
  public constructor(private readonly repository: WorldRepository) {}

  public async execute(
    id: GameWorldId,
    evidence: WorldProvisioningEvidence,
  ): Promise<Result<WorldMutationResult, DomainError>> {
    const snapshot = await this.repository.findById(id);
    if (snapshot === null) {
      return fail(
        new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.", { id }),
      );
    }

    const loaded = GameWorld.fromSnapshot(snapshot);
    if (!loaded.ok) return loaded;

    const activated = loaded.value.activate(evidence);
    if (!activated.ok) return activated;

    await this.repository.save(loaded.value.snapshot(), snapshot.version);
    return succeed({
      world: loaded.value.snapshot(),
      events: loaded.value.pullDomainEvents(),
    });
  }
}

export interface DeleteWorldInput {
  readonly gameWorldId: GameWorldId;
  /**
   * O `seed` do mundo, digitado por quem confirma.
   *
   * A confirmação é checada NO SERVIDOR, não só na tela. Uma confirmação que
   * mora só no cliente não protege nada: quem chama a API direto — script,
   * curl, um bug de outra tela — apaga o mundo sem digitar coisa alguma. Aqui
   * ela é pré-condição do comando.
   */
  readonly confirmSeed: string;
}

/**
 * Apaga o mundo e tudo que pende dele. Irreversível.
 *
 * **Recusa mundo com gestor ativo.** Não é zelo excessivo: a R-56 exige 30 dias
 * de aviso prévio para ARQUIVAR um mundo — operação que preserva tudo e é
 * reversível. Apagar sem aviso o mundo onde alguém tem clube é estritamente pior
 * que o que a decisão já protege. Quem quiser mesmo apagar encerra os controles
 * primeiro, e aí a intenção está explícita.
 */
export class DeleteWorld {
  public constructor(
    private readonly worlds: WorldRepository,
    private readonly controls: { countActiveControls(gameWorldId: GameWorldId): Promise<number> },
  ) {}

  public async execute(
    input: DeleteWorldInput,
  ): Promise<Result<{ readonly seed: string }, DomainError>> {
    const world = await this.worlds.findById(input.gameWorldId);
    if (world === null) {
      return fail(
        new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.", {
          gameWorldId: input.gameWorldId,
        }),
      );
    }

    if (input.confirmSeed !== world.seed) {
      return fail(
        new DomainError(
          "WORLD_DELETE_CONFIRMATION_MISMATCH",
          "A confirmação não bate com o seed do mundo.",
          { expected: world.seed },
        ),
      );
    }

    const ativos = await this.controls.countActiveControls(input.gameWorldId);
    if (ativos > 0) {
      return fail(
        new DomainError(
          "WORLD_HAS_ACTIVE_CONTROLS",
          `O mundo tem ${ativos} clube(s) com gestor ativo. Encerre os controles antes de apagar.`,
          { activeControls: ativos },
        ),
      );
    }

    await this.worlds.delete(input.gameWorldId);
    return succeed({ seed: world.seed });
  }
}
