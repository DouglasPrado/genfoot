import type { GameWorldId } from "@grinta/shared";

import type { WorldGenesisSnapshot } from "./genesis-types.js";

export interface WorldGenesisRepository {
  findByWorldId(gameWorldId: GameWorldId): Promise<WorldGenesisSnapshot | null>;
  saveGenesis(
    genesis: WorldGenesisSnapshot,
    expectedWorldVersion: number,
  ): Promise<void>;
}
