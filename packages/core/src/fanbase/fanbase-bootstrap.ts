import type { GameWorldSnapshot } from "../world/world-types.js";
import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";

import {
  NEUTRAL_BOARD_PATIENCE,
  NEUTRAL_PRESSURE_LEVEL,
  deriveFanbaseHeadcount,
} from "./fanbase-model.js";
import type { FanbaseSeed } from "./fanbase-repository.js";

/**
 * A torcida inicial de cada clube (C10). O headcount é determinístico por
 * `(seed, clubIndex)` — o mesmo índice que o resto da gênese usa —; paciência e
 * pressão nascem neutras (mundo sem histórico, R-69).
 */
export function buildFanbaseGenesis(
  world: GameWorldSnapshot,
  genesis: WorldGenesisSnapshot,
): readonly FanbaseSeed[] {
  return genesis.clubs.map((club, index) => ({
    clubId: club.id,
    headcount: deriveFanbaseHeadcount(world.seed, index),
    boardPatience: NEUTRAL_BOARD_PATIENCE,
    pressureLevel: NEUTRAL_PRESSURE_LEVEL,
  }));
}
