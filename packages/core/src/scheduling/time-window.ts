import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { TemporalWindowSnapshot } from "./scheduling-types.js";

export class TemporalWindow {
  private constructor(private readonly state: TemporalWindowSnapshot) {}

  public static create(
    snapshot: TemporalWindowSnapshot,
  ): Result<TemporalWindow, DomainError> {
    const opensOn = WorldDate.parse(snapshot.opensOn);
    if (!opensOn.ok) return opensOn;
    const closesOn = WorldDate.parse(snapshot.closesOn);
    if (!closesOn.ok) return closesOn;
    if (
      snapshot.id.trim() === "" ||
      snapshot.name.trim() === "" ||
      snapshot.closesOn < snapshot.opensOn ||
      !Number.isSafeInteger(snapshot.configVersion) ||
      snapshot.configVersion < 1 ||
      !Number.isSafeInteger(snapshot.version) ||
      snapshot.version < 1
    ) {
      return fail(
        new DomainError(
          "INVALID_TEMPORAL_WINDOW",
          "A janela temporal possui limites, identidade ou versão inválidos.",
        ),
      );
    }
    return succeed(new TemporalWindow(snapshot));
  }

  public isOpen(on: WorldDate): boolean {
    const value = on.toString();
    return value >= this.state.opensOn && value <= this.state.closesOn;
  }

  public assertRuleset(
    rulesetVersion: RulesetVersion,
  ): Result<void, DomainError> {
    return rulesetVersion === this.state.rulesetVersion
      ? succeed(undefined)
      : fail(
          new DomainError(
            "RULESET_VERSION_MISMATCH",
            "A janela pertence a outra versão de ruleset.",
          ),
        );
  }

  public snapshot(): TemporalWindowSnapshot {
    return this.state;
  }
}
