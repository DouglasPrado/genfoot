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

// GP-005 · Weekly management cycle — convergência C4 (desenvolvimento diário
// reproduzível/idempotente) + C11 (digest semanal de tarefas). A semana avança
// dia a dia sem duplicar o tick e o gestor recebe um resumo priorizado.

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-005",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

describe("GP-005 Weekly management cycle (convergence)", () => {
  it("processa a semana dia a dia sem duplicar e entrega um digest", () => {
    const gameWorld = world();
    const genesis = new WorldGenesisGenerator().generate(gameWorld);
    const lifecycleR = WorldPlayerLifecycle.fromGenesis(gameWorld, genesis);
    if (!lifecycleR.ok) throw lifecycleR.error;
    const lifecycle = lifecycleR.value;

    // C4: avança sete dias, um tick por dia.
    const week = [
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
    ];
    for (const day of week) {
      expect(lifecycle.processDay(date(day))).toEqual({ ok: true, value: true });
    }
    // Re-processar um dia já consumido não altera o estado (idempotente).
    const revision = lifecycle.snapshot().revision;
    expect(lifecycle.processDay(date("2026-01-08"))).toEqual({
      ok: true,
      value: false,
    });
    expect(lifecycle.snapshot().revision).toBe(revision);
    expect(lifecycle.summary().lastProcessedOn).toBe("2026-01-08");

    // C11: digest semanal de tarefas do gestor, sem urgentes/duplicatas.
    const inboxR = WorldInbox.initialize(gameWorld);
    if (!inboxR.ok) throw inboxR.error;
    const inbox = inboxR.value;
    const recipient = "manager:club-1";
    for (const [key, priority] of [
      ["train", "NORMAL"],
      ["scout", "HIGH"],
      ["injury", "URGENT"],
    ] as const) {
      const created = inbox.projectNotification({
        dedupKey: `week:${key}`,
        recipientScope: recipient,
        category: "WEEKLY",
        priority,
        sourceRef: `fact:${key}`,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: `proj:${key}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-08",
      });
      if (!created.ok) throw created.error;
    }
    const digest = inbox.buildDigest({
      recipientScope: recipient,
      fromOn: "2026-01-02",
      toOn: "2026-01-08",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "digest:week",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    if (!digest.ok) throw digest.error;
    expect(digest.value.itemIds).toHaveLength(2); // NORMAL + HIGH, sem o URGENT
  });
});
