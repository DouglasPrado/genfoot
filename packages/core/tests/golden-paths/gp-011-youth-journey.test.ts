import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldGenesisGenerator,
  WorldInbox,
  WorldPlayerLifecycle,
  type GameWorldSnapshot,
} from "../../src/index.js";

// GP-011 · Youth journey — convergência C4 (desenvolvimento limitado por
// potencial) + C11 (record histórico). Um talento evolui deterministicamente sem
// ultrapassar o potencial e o marco entra na memória do mundo (append-only).

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-011",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-011 Youth journey (convergence)", () => {
  it("desenvolve o talento sem ultrapassar o potencial e registra o marco", () => {
    const gameWorld = world();
    const genesis = new WorldGenesisGenerator().generate(gameWorld);
    const lifecycleR = WorldPlayerLifecycle.fromGenesis(gameWorld, genesis);
    if (!lifecycleR.ok) throw lifecycleR.error;
    const lifecycle = lifecycleR.value;

    // Um talento com margem de evolução (potencial > atual).
    const talent = lifecycle
      .snapshot()
      .players.find((p) => p.potentialAbility > p.currentAbility)!;
    const potential = talent.potentialAbility;

    // Evolui por várias temporadas; o overall nunca ultrapassa o potencial.
    for (let season = 1; season <= 4; season += 1) {
      const before = lifecycle.findPlayer(talent.id)!;
      lifecycle.changeAttribute({
        playerId: talent.id,
        attributeCode: "technical",
        requestedValue: before.attributes.technical + 6,
        cause: "YOUTH_DEVELOPMENT",
        worldDate: `${2026 + season}-04-01`,
        rulesetVersion: gameWorld.rulesetVersion,
        historyContext: `youth:${talent.id}:${season}:technical`,
        worldSeed: gameWorld.seed,
      });
      expect(lifecycle.findPlayer(talent.id)!.currentAbility).toBeLessThanOrEqual(
        potential,
      );
    }
    expect(lifecycle.snapshot().developmentHistory.length).toBeGreaterThan(0);

    // C11: o marco de formação entra na memória (record idempotente).
    const inboxR = WorldInbox.initialize(gameWorld);
    if (!inboxR.ok) throw inboxR.error;
    const inbox = inboxR.value;
    const record = inbox.establishRecord({
      category: "YOUTH_GRADUATE",
      holder: talent.id,
      value: lifecycle.findPlayer(talent.id)!.currentAbility,
      achievedOn: "2027-06-30",
      factRef: `youth-graduate:${talent.id}`,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `record:youth:${talent.id}`,
      worldSeed: gameWorld.seed,
      worldDate: "2027-06-30",
    });
    expect(record).toMatchObject({ ok: true, value: { category: "YOUTH_GRADUATE" } });
    const revision = inbox.snapshot().revision;
    const repeated = inbox.establishRecord({
      category: "YOUTH_GRADUATE",
      holder: talent.id,
      value: 0,
      achievedOn: "2027-06-30",
      factRef: `youth-graduate:${talent.id}`,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `record:youth:${talent.id}`,
      worldSeed: gameWorld.seed,
      worldDate: "2027-06-30",
    });
    expect(repeated).toEqual(record);
    expect(inbox.snapshot().revision).toBe(revision);
  });
});
