import type { GameWorldId } from "@grinta/shared";

import type {
  WorldCommandReceipt,
  WorldSchedulerSnapshot,
} from "./scheduling-types.js";

export interface SchedulingRepository {
  findSchedulingByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldSchedulerSnapshot | null>;
  saveScheduling(
    snapshot: WorldSchedulerSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
  /** Optional indexed lookup; implementations may fall back to the snapshot. */
  findSchedulingCommandReceipt?(
    gameWorldId: GameWorldId,
    idempotencyKey: string,
  ): Promise<WorldCommandReceipt | null>;
}
