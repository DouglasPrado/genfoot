import type { GameWorldId } from "@grinta/shared";

import type { WorldEventingSnapshot } from "./eventing-types.js";

export interface EventingRepository {
  findEventingByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldEventingSnapshot | null>;
  saveEventing(
    snapshot: WorldEventingSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
