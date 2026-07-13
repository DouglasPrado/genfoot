import type { GameWorldId } from "@grinta/shared";

import type { WorldPlayerLifecycleSnapshot } from "./player-lifecycle-types.js";

export interface PlayerLifecycleRepository {
  findPlayerLifecycleByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldPlayerLifecycleSnapshot | null>;
  savePlayerLifecycle(
    snapshot: WorldPlayerLifecycleSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
