import type { GameWorldId } from "@grinta/shared";

import type { WorldInboxSnapshot } from "./notifications-types.js";

export interface InboxRepository {
  findInboxByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldInboxSnapshot | null>;
  saveInbox(
    snapshot: WorldInboxSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
