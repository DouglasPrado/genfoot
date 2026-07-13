import { newGameWorldId } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import { TemporalWindow } from "../src/index.js";
import {
  schedulingDate,
  schedulingRuleset,
  temporalWindowFixture,
} from "./helpers/scheduling-fixtures.js";

describe("TemporalWindow", () => {
  it("usa limites inclusivos e preserva versão de configuração/ruleset", () => {
    const created = TemporalWindow.create(
      temporalWindowFixture(newGameWorldId()),
    );
    if (!created.ok) throw created.error;

    expect(created.value.isOpen(schedulingDate("2026-01-01"))).toBe(true);
    expect(created.value.isOpen(schedulingDate("2026-01-03"))).toBe(true);
    expect(created.value.isOpen(schedulingDate("2026-01-04"))).toBe(false);
    expect(created.value.snapshot()).toMatchObject({
      rulesetVersion: "1.0.0",
      configVersion: 1,
    });
  });

  it("rejeita intervalo invertido e ruleset incompatível", () => {
    const worldId = newGameWorldId();
    expect(
      TemporalWindow.create(
        temporalWindowFixture(worldId, {
          opensOn: "2026-01-04",
          closesOn: "2026-01-03",
        }),
      ),
    ).toMatchObject({ ok: false, error: { code: "INVALID_TEMPORAL_WINDOW" } });

    const created = TemporalWindow.create(temporalWindowFixture(worldId));
    if (!created.ok) throw created.error;
    expect(
      created.value.assertRuleset(schedulingRuleset("2.0.0")),
    ).toMatchObject({ ok: false, error: { code: "RULESET_VERSION_MISMATCH" } });
  });
});
