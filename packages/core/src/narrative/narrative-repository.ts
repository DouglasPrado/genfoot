import type { GameWorldId } from "@grinta/shared";

import type { WorldNarrativeSnapshot } from "./narrative-types.js";

export interface NarrativeRepository {
  findNarrativeByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldNarrativeSnapshot | null>;
  saveNarrative(
    snapshot: WorldNarrativeSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
