import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import type { SquadRepository } from "../clubs/squad-repository.js";
import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";
import { BASE_CURRENCY_ID } from "../finance/ledger-bootstrap.js";
import { derivePlayerOverall } from "../players/player-attributes.js";
import type { PlayerRepository } from "../players/player-repository.js";
import { estimatePlayerValueMinor } from "../players/player-value.js";

/**
 * C6 — colocar um jogador à venda. NÃO é a venda: é a LISTAGEM. O jogador entra
 * na `TransferListing` (status LISTED) com um preço pedido e passa a APARECER no
 * mercado, disponível para outro clube comprar (via `market:sign-player`). Fica
 * no elenco e no clube até alguém comprar — listar não move ninguém nem dinheiro.
 */
export interface TransferListingSnapshot {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly currencyId: string;
  readonly status: "LISTED";
  readonly type: "PERMANENT";
  readonly askingPriceMinor: bigint;
  readonly listedOn: string;
  readonly version: number;
}

export interface TransferListingRepository {
  /** Lista o jogador (idempotente por jogador: relistar atualiza o preço). */
  listPlayer(snapshot: TransferListingSnapshot): Promise<void>;
  /** Tira o jogador do mercado (CANCELLED). No-op se não estava listado. */
  unlistPlayer(gameWorldId: string, playerId: string): Promise<void>;
}

export interface ListRepositories {
  readonly squads: SquadRepository;
  readonly players: PlayerRepository;
  readonly listings: TransferListingRepository;
}

export interface ListUnitOfWork {
  run<T>(work: (repositories: ListRepositories) => Promise<T>): Promise<T>;
}

export interface ListPlayerInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
  readonly occurredOn: string;
}

export class ListPlayer {
  public constructor(private readonly unitOfWork: ListUnitOfWork) {}

  public execute(
    input: ListPlayerInput,
  ): Promise<Result<{ playerId: string; askingPriceMinor: string }, DomainError>> {
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
            "Só dá para listar jogador do próprio elenco.",
          ),
        );
      }

      // O preço pedido é o valor de mercado estimado (R-41).
      const aggregate = await repos.players.findPlayerById(
        worldId,
        input.playerId as never,
      );
      if (aggregate === null) {
        return fail(new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado."));
      }
      const overall = derivePlayerOverall(
        aggregate.player.primaryPosition,
        aggregate.player.attributes,
      );
      const age = ageOn(aggregate.person.birthDate, input.worldDate);
      const askingPriceMinor = estimatePlayerValueMinor(overall, age);

      await repos.listings.listPlayer({
        id: deterministicUuidV7({
          worldSeed: input.worldSeed,
          context: `${input.gameWorldId}:listing:${input.playerId}`,
          timestampMilliseconds: timestampOf(input.occurredOn),
        }),
        gameWorldId: input.gameWorldId,
        clubId: input.clubId,
        playerId: input.playerId,
        currencyId: BASE_CURRENCY_ID,
        status: "LISTED",
        type: "PERMANENT",
        askingPriceMinor,
        listedOn: input.occurredOn,
        version: 1,
      });

      return succeed({
        playerId: input.playerId,
        askingPriceMinor: askingPriceMinor.toString(),
      });
    });
  }
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
  unitOfWork: ListUnitOfWork,
  work: (repositories: ListRepositories) => Promise<Result<T, DomainError>>,
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
