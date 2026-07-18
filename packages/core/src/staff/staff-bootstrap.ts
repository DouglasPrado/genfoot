import { BASE_CURRENCY_ID } from "../finance/ledger-bootstrap.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";

import { deriveClubStaff } from "./staff-generation.js";
import type { StaffMemberSeed } from "./staff-types.js";

/**
 * A comissão técnica inicial de todos os clubes (C8). Determinística por
 * `(seed, clubIndex)` — o mesmo índice do resto da gênese —, ligada a cada clube
 * por contrato (obrigação registrada, R-197).
 */
export function buildStaffGenesis(
  world: GameWorldSnapshot,
  genesis: WorldGenesisSnapshot,
): readonly StaffMemberSeed[] {
  return genesis.clubs.flatMap((club, index) =>
    deriveClubStaff({
      worldSeed: world.seed,
      gameWorldId: world.id,
      clubId: club.id,
      clubIndex: index,
      currencyId: BASE_CURRENCY_ID,
      worldStartDate: world.startDate,
      currentSeason: 1,
    }),
  );
}
