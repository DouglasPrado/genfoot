import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldNarrative,
  type GameWorldSnapshot,
  type NarrativeClubRef,
} from "../../src/index.js";

// GP-015 · Sporting crisis — convergência C8 (resultados) → C10 (narrativa). Uma
// sequência de derrotas frustra a torcida, abre uma crise esportiva e o clube
// percorre um arco recuperável (WATCH/OPEN → RECOVERY → RESOLVED) determinístico.

const CLUB = "019f0000-0000-7000-8000-0000000000c1" as NarrativeClubRef;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-015",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-015 Sporting crisis (convergence)", () => {
  it("derrotas frustram a torcida, abrem e resolvem a crise", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const narrativeR = WorldNarrative.initialize(gameWorld);
    if (!narrativeR.ok) throw narrativeR.error;
    const narrative = narrativeR.value;

    const baseline = narrative.fanbaseFor(CLUB).overall;

    // C8 → C10: derrotas contra a expectativa derrubam a satisfação.
    for (let round = 1; round <= 4; round += 1) {
      const applied = narrative.applyMatchFact({
        factId: `loss:${round}`,
        clubId: CLUB,
        outcome: "LOSS",
        expected: "WIN",
        rulesetVersion: ruleset,
        idempotencyKey: `sat:${round}`,
        worldSeed: gameWorld.seed,
        worldDate: `2026-0${round}-10`,
      });
      if (!applied.ok) throw applied.error;
    }
    expect(narrative.fanbaseFor(CLUB).overall).toBeLessThan(baseline);

    // C10: abre a crise esportiva.
    const crisis = narrative.openCrisis({
      clubId: CLUB,
      cause: "LOSING_STREAK",
      severity: 75,
      rulesetVersion: ruleset,
      idempotencyKey: "crisis:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-15",
    });
    expect(crisis).toMatchObject({ ok: true, value: { status: "OPEN" } });
    if (!crisis.ok) throw crisis.error;

    // Arco recuperável: plano de recuperação → resolução.
    const recovery = narrative.submitRecoveryPlan({
      crisisId: crisis.value.id,
      plan: "trocar comissão técnica e reforçar o meio-campo",
      rulesetVersion: ruleset,
      idempotencyKey: "plan:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-20",
    });
    expect(recovery).toMatchObject({ ok: true, value: { status: "RECOVERY" } });
    const resolved = narrative.resolveCrisis({
      crisisId: crisis.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "resolve:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-05-30",
    });
    expect(resolved).toMatchObject({ ok: true, value: { status: "RESOLVED" } });

    // Transição inválida após resolver é rejeitada (arco íntegro).
    expect(
      narrative.resolveCrisis({
        crisisId: crisis.value.id,
        rulesetVersion: ruleset,
        idempotencyKey: "resolve:again",
        worldSeed: gameWorld.seed,
        worldDate: "2026-06-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "CRISIS_NOT_OPEN" } });
  });
});
