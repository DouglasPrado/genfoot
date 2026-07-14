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

// GP-012 · Injury and recovery — convergência C4 (caso médico) + C11 (inbox). Um
// jogador se lesiona (fica indisponível), o clube recebe a notificação e, após a
// recuperação, o jogador volta a ficar disponível — tudo idempotente por chave.

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-012",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-012 Injury and recovery (convergence)", () => {
  it("lesiona, notifica e recupera a disponibilidade do jogador", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const genesis = new WorldGenesisGenerator().generate(gameWorld);
    const lifecycleR = WorldPlayerLifecycle.fromGenesis(gameWorld, genesis);
    if (!lifecycleR.ok) throw lifecycleR.error;
    const lifecycle = lifecycleR.value;
    const player = lifecycle.snapshot().players[0]!;

    // C4: abre o caso médico → jogador INJURED.
    const injury = lifecycle.openMedicalCase({
      playerId: player.id,
      diagnosis: "Lesão muscular",
      severity: "MODERATE",
      expectedReturnOn: "2026-04-01",
      worldDate: "2026-03-01",
      rulesetVersion: ruleset,
      idempotencyKey: `injury:${player.id}`,
      worldSeed: gameWorld.seed,
    });
    if (!injury.ok) throw injury.error;
    expect(lifecycle.findPlayer(player.id)!.availability).toBe("INJURED");

    // C11: o clube é notificado da lesão (uma vez por chave).
    const inboxR = WorldInbox.initialize(gameWorld);
    if (!inboxR.ok) throw inboxR.error;
    const inbox = inboxR.value;
    const notification = inbox.projectNotification({
      dedupKey: `injury:${player.id}`,
      recipientScope: "manager:club-1",
      category: "MEDICAL",
      priority: "HIGH",
      sourceRef: injury.value.id,
      deadline: "2026-04-01",
      rulesetVersion: ruleset,
      idempotencyKey: `notify:${player.id}`,
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-01",
    });
    expect(notification).toMatchObject({ ok: true, value: { status: "OPEN" } });

    // C4: reavalia e dá alta → disponível de novo.
    const cleared = lifecycle.reassessMedicalCase({
      medicalCaseId: injury.value.id,
      outcome: "CLEAR",
      worldDate: "2026-04-02",
      rulesetVersion: ruleset,
      idempotencyKey: `clear:${player.id}`,
      worldSeed: gameWorld.seed,
    });
    expect(cleared).toMatchObject({ ok: true, value: { status: "CLEARED" } });
    expect(lifecycle.findPlayer(player.id)!.availability).toBe("AVAILABLE");

    // Idempotência: a alta repetida com a mesma chave não gera novo efeito.
    const revision = lifecycle.snapshot().revision;
    const repeated = lifecycle.reassessMedicalCase({
      medicalCaseId: injury.value.id,
      outcome: "CLEAR",
      worldDate: "2026-04-02",
      rulesetVersion: ruleset,
      idempotencyKey: `clear:${player.id}`,
      worldSeed: gameWorld.seed,
    });
    expect(repeated).toEqual(cleared);
    expect(lifecycle.snapshot().revision).toBe(revision);
  });
});
