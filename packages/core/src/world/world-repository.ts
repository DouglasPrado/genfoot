import type { GameWorldId } from "@grinta/shared";

import type { GameWorldSnapshot } from "./world-types.js";

export interface WorldRepository {
  findById(id: GameWorldId): Promise<GameWorldSnapshot | null>;
  save(
    snapshot: GameWorldSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
}
