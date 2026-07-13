import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

import type { ClubId } from "../genesis/genesis-types.js";

export type InfrastructureProjectId = EntityId<"InfrastructureProject">;

export interface InfrastructureProjectSnapshot {
  readonly id: InfrastructureProjectId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: ClubId;
  readonly rulesetVersion: RulesetVersion;
  readonly status: string;
  readonly targetAsset: string;
  readonly version: number;
}
