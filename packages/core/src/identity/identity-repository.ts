import type { GameWorldId } from "@grinta/shared";

import type { WorldIdentitySnapshot } from "./identity-types.js";

export interface IdentityRepository {
  findIdentityByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldIdentitySnapshot | null>;
  saveIdentity(
    snapshot: WorldIdentitySnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
