import type { SquadSnapshot } from "../clubs/club-types.js";
import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";
import type { PlayerAggregateSnapshot } from "../players/player-repository.js";
import type { GameWorldSnapshot } from "../world/world-types.js";

import { deriveClubYouth } from "./youth-generation.js";

export interface YouthGenesis {
  readonly players: readonly PlayerAggregateSnapshot[];
  readonly squads: readonly SquadSnapshot[];
}

/**
 * A base de todos os clubes (C8). Uma YOUTH_ACADEMY por clube, determinística por
 * `(seed, clubIndex)`. Reaproveita os repositórios de Player e Squad da gênese —
 * jovem é jogador, base é elenco —, então não precisa de porta nova.
 */
export function buildYouthGenesis(
  world: GameWorldSnapshot,
  genesis: WorldGenesisSnapshot,
): YouthGenesis {
  const clubName = new Map(genesis.clubs.map((club) => [club.id, club.name]));
  const players: PlayerAggregateSnapshot[] = [];
  const squads: SquadSnapshot[] = [];

  genesis.clubs.forEach((club, index) => {
    const youth = deriveClubYouth({
      worldSeed: world.seed,
      gameWorldId: world.id,
      clubId: club.id,
      clubName: clubName.get(club.id) ?? "",
      clubIndex: index,
      worldStartDate: world.startDate,
    });
    players.push(...youth.players);
    squads.push(youth.squad);
  });

  return { players, squads };
}
