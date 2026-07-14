import type { GameWorldId } from "@grinta/shared";

import type { WorldMatchesSnapshot } from "./match-types.js";

export interface MatchRepository {
  findMatchesByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldMatchesSnapshot | null>;
  saveMatches(
    snapshot: WorldMatchesSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
