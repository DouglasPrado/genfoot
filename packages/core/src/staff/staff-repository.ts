import type { GameWorldId } from "@grinta/shared";

import type { WorldStaffSnapshot } from "./staff-types.js";

export interface StaffRepository {
  findStaffByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldStaffSnapshot | null>;
  saveStaff(
    snapshot: WorldStaffSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
