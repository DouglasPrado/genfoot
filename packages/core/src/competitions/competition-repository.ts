import type { GameWorldId } from "@grinta/shared";

import type { WorldCompetitionsSnapshot } from "./competition-types.js";

export interface CompetitionRepository {
  findCompetitionsByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldCompetitionsSnapshot | null>;
  saveCompetitions(
    snapshot: WorldCompetitionsSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
