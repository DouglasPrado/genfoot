import { DomainError } from "./domain-error.js";
import { fail, succeed, type Result } from "./result.js";
import type { Brand } from "./identifiers.js";

export type RulesetVersion = Brand<string, "RulesetVersion">;

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

export function parseRulesetVersion(
  value: string,
): Result<RulesetVersion, DomainError> {
  if (!SEMVER_PATTERN.test(value)) {
    return fail(
      new DomainError(
        "INVALID_RULESET_VERSION",
        "rulesetVersion deve seguir SemVer, por exemplo 1.0.0.",
        { value },
      ),
    );
  }

  return succeed(value as RulesetVersion);
}
