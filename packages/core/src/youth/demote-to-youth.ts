import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { Squad } from "../clubs/squad.js";
import type { SquadRepository } from "../clubs/squad-repository.js";
import { MAX_SQUAD_SIZE } from "../genesis/player-generation.js";
import type { PlayerRepository } from "../players/player-repository.js";

/** Até esta idade um profissional pode voltar à base (a pedido do técnico). */
export const MAX_YOUTH_RETURN_AGE = 21;

export interface DemoteToYouthRepositories {
  readonly squads: SquadRepository;
  readonly players: PlayerRepository;
}

export interface DemoteToYouthUnitOfWork {
  run<T>(
    work: (repositories: DemoteToYouthRepositories) => Promise<T>,
  ): Promise<T>;
}

export interface DemoteToYouthInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly worldDate: string;
  readonly occurredOn: string;
}

/**
 * Desce um jovem profissional (≤ 21 anos) de volta à base — mesmo clube, sem
 * dinheiro. O espelho da promoção (`PromoteYouthPlayer`): move a membership do
 * FIRST_TEAM para o YOUTH_ACADEMY, atômico. Recusa quem já passou da idade: base
 * é formação, não depósito de veterano.
 */
export class DemoteToYouthPlayer {
  public constructor(private readonly unitOfWork: DemoteToYouthUnitOfWork) {}

  public execute(
    input: DemoteToYouthInput,
  ): Promise<Result<{ playerId: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const worldId = input.gameWorldId as never;
      const clubId = input.clubId as never;
      const firstTeam = await repos.squads.findFirstTeamSquad(worldId, clubId);
      const youthSquad = await repos.squads.findYouthSquad(worldId, clubId);
      if (firstTeam === null || youthSquad === null) {
        return fail(
          new DomainError("SQUAD_NOT_FOUND", "Elenco profissional ou de base não encontrado."),
        );
      }

      const inFirstTeam = firstTeam.memberships.some(
        (m) => m.playerId === input.playerId,
      );
      if (!inFirstTeam) {
        return fail(
          new DomainError(
            "PLAYER_NOT_IN_FIRST_TEAM",
            "O jogador não está no elenco profissional deste clube.",
          ),
        );
      }

      // A idade arbitra: base é formação. Vem do jogador real, não de fora.
      const aggregate = await repos.players.findPlayerById(
        worldId,
        input.playerId as never,
      );
      if (aggregate === null) {
        return fail(
          new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado."),
        );
      }
      const age = ageOn(aggregate.person.birthDate, input.worldDate);
      if (age > MAX_YOUTH_RETURN_AGE) {
        return fail(
          new DomainError(
            "PLAYER_TOO_OLD_FOR_YOUTH",
            `Só jogadores de até ${MAX_YOUTH_RETURN_AGE} anos podem voltar à base.`,
            { age: age.toString() },
          ),
        );
      }

      // ── Profissional: sai.
      const loadedFirst = Squad.fromSnapshot(firstTeam);
      if (!loadedFirst.ok) return loadedFirst;
      const removed = loadedFirst.value.remove(input.playerId);
      if (!removed.ok) return removed;

      // ── Base: entra, com a próxima camisa livre.
      const loadedYouth = Squad.fromSnapshot(youthSquad);
      if (!loadedYouth.ok) return loadedYouth;
      const shirt = nextFreeShirt(
        youthSquad.memberships.map((m) => m.shirtNumber),
      );
      const assigned = loadedYouth.value.assign({
        playerId: input.playerId as never,
        shirtNumber: shirt,
        role: null,
        effectiveFrom: input.occurredOn,
      });
      if (!assigned.ok) return assigned;

      await repos.squads.saveSquad(loadedFirst.value.snapshot(), firstTeam.version);
      await repos.squads.saveSquad(loadedYouth.value.snapshot(), youthSquad.version);

      return succeed({ playerId: input.playerId });
    });
  }
}

function nextFreeShirt(taken: readonly number[]): number {
  const used = new Set(taken);
  for (let n = 1; n <= MAX_SQUAD_SIZE; n += 1) if (!used.has(n)) return n;
  return MAX_SQUAD_SIZE;
}

function ageOn(birthDate: string, on: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [ny, nm, nd] = on.split("-").map(Number) as [number, number, number];
  const passed = nm > bm || (nm === bm && nd >= bd);
  return ny - by - (passed ? 0 : 1);
}

class Rollback extends Error {
  public constructor(public readonly domainError: DomainError) {
    super(domainError.message);
  }
}

async function run<T>(
  unitOfWork: DemoteToYouthUnitOfWork,
  work: (repositories: DemoteToYouthRepositories) => Promise<Result<T, DomainError>>,
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
