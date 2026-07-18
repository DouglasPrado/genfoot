import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { Squad } from "../clubs/squad.js";
import type { SquadRepository } from "../clubs/squad-repository.js";

import {
  ContractStatus,
  type ContractRepository,
} from "./contract-types.js";

/**
 * Dispensar um jogador (C6): o clube encerra o vínculo e o jogador deixa o
 * elenco, de graça (sem taxa, sem comprador). É o oposto da contratação —
 * termina o contrato e tira a membership, no MESMO commit. Meio efeito seria um
 * jogador sem contrato ainda no elenco, ou fora do elenco com contrato ativo.
 */
export interface ReleaseRepositories {
  readonly squads: SquadRepository;
  readonly contracts: ContractRepository;
}

export interface ReleaseUnitOfWork {
  run<T>(work: (repositories: ReleaseRepositories) => Promise<T>): Promise<T>;
}

export interface ReleasePlayerInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly occurredOn: string;
}

export class ReleasePlayer {
  public constructor(private readonly unitOfWork: ReleaseUnitOfWork) {}

  public execute(
    input: ReleasePlayerInput,
  ): Promise<Result<{ playerId: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const worldId = input.gameWorldId as never;
      const squad = await repos.squads.findFirstTeamSquad(
        worldId,
        input.clubId as never,
      );
      if (squad === null) {
        return fail(new DomainError("SQUAD_NOT_FOUND", "Elenco não encontrado."));
      }
      if (!squad.memberships.some((m) => m.playerId === input.playerId)) {
        return fail(
          new DomainError(
            "PLAYER_NOT_IN_SQUAD",
            "O jogador não está no elenco deste clube.",
          ),
        );
      }

      // Tira do elenco.
      const loaded = Squad.fromSnapshot(squad);
      if (!loaded.ok) return loaded;
      const removed = loaded.value.remove(input.playerId);
      if (!removed.ok) return removed;
      await repos.squads.saveSquad(loaded.value.snapshot(), squad.version);

      // Encerra o contrato ativo, se houver (o jovem da gênese pode não ter, R-189).
      const contract = await repos.contracts.findActiveByPlayer(
        worldId,
        input.playerId,
      );
      if (contract !== null) {
        await repos.contracts.saveContract({
          ...contract,
          status: ContractStatus.TERMINATED,
          version: contract.version + 1,
        });
      }

      return succeed({ playerId: input.playerId });
    });
  }
}

class Rollback extends Error {
  public constructor(public readonly domainError: DomainError) {
    super(domainError.message);
  }
}

async function run<T>(
  unitOfWork: ReleaseUnitOfWork,
  work: (repositories: ReleaseRepositories) => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    return await unitOfWork.run(async (repositories) => {
      const result = await work(repositories);
      if (!result.ok) throw new Rollback(result.error);
      return result;
    });
  } catch (error) {
    if (error instanceof Rollback) return fail(error.domainError);
    throw error;
  }
}
