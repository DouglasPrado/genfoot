import type { GameWorldId } from "@grinta/shared";

import type { WorldLedgerSnapshot } from "./ledger-types.js";

export interface LedgerRepository {
  findLedgerByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldLedgerSnapshot | null>;
  saveLedger(
    snapshot: WorldLedgerSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
