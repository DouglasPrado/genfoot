import type { GameWorldId } from "@grinta/shared";

import type { WorldSchedulerSnapshot } from "./scheduling-types.js";

export interface SchedulingRepository {
  findSchedulingByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldSchedulerSnapshot | null>;
  saveScheduling(
    snapshot: WorldSchedulerSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
