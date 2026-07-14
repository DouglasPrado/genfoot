import type { GameWorldId } from "@grinta/shared";

import type { WorldAutomationSnapshot } from "./automation-types.js";

export interface AutomationRepository {
  findAutomationByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldAutomationSnapshot | null>;
  saveAutomation(
    snapshot: WorldAutomationSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
