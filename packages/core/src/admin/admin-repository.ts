import type { GameWorldId } from "@grinta/shared";

import type { WorldAdminSnapshot } from "./admin-types.js";

export interface AdminRepository {
  findAdminByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldAdminSnapshot | null>;
  saveAdmin(
    snapshot: WorldAdminSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
