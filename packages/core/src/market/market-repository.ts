import type { GameWorldId } from "@grinta/shared";

import type { WorldMarketSnapshot } from "./market-types.js";

export interface MarketRepository {
  findMarketByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldMarketSnapshot | null>;
  saveMarket(
    snapshot: WorldMarketSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
