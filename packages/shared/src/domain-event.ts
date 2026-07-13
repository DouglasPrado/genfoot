import type { GameWorldId } from "./identifiers.js";
import type { RulesetVersion } from "./ruleset-version.js";

export interface DomainEvent<
  TType extends string = string,
  TPayload extends object = Readonly<Record<string, unknown>>,
> {
  readonly type: TType;
  readonly eventVersion: 1;
  readonly gameWorldId: GameWorldId;
  readonly aggregateType: "GameWorld";
  readonly aggregateVersion: number;
  readonly worldSequence: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly payload: TPayload;
}
