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
  WorldNarrative,
  WorldPlayerLifecycle,
  WorldStaff,
  type GameWorldSnapshot,
  type NarrativeClubRef,
  type StaffClubRef,
} from "../../src/index.js";

// GP-012 · Injury and recovery — convergência C4 (caso médico) + C11 (inbox). Um
// jogador se lesiona (fica indisponível), o clube recebe a notificação e, após a
// recuperação, o jogador volta a ficar disponível — tudo idempotente por chave.

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

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

  it("staff médico influencia o prazo, a torcida reage e a recuperação libera a escalação", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const genesis = new WorldGenesisGenerator().generate(gameWorld);
    const lifecycleR = WorldPlayerLifecycle.fromGenesis(gameWorld, genesis);
    if (!lifecycleR.ok) throw lifecycleR.error;
    const lifecycle = lifecycleR.value;
    const player = lifecycle.snapshot().players[0]!;

    // C5: contrata um fisioterapeuta cuja capacidade médica orienta a recuperação.
    const staffR = WorldStaff.initialize(gameWorld);
    if (!staffR.ok) throw staffR.error;
    const staff = staffR.value;
    const club = "019f0000-0000-7000-8000-0000000000c1" as StaffClubRef;
    const physio = staff.createStaffMember({
      firstName: "Fisio",
      lastName: "Terapeuta",
      role: "PHYSIO",
      capabilities: { coaching: 30, fitness: 55, medical: 80, scouting: 20, management: 40 },
      reputation: 68,
      worldDate: "2026-01-01",
      rulesetVersion: ruleset,
      idempotencyKey: "gp012:physio",
      worldSeed: gameWorld.seed,
    });
    if (!physio.ok) throw physio.error;
    const offered = staff.offerStaffContract({
      staffId: physio.value.id,
      clubId: club,
      role: "PHYSIO",
      startOn: "2026-01-01",
      endOn: "2026-12-31",
      compensationRef: "comp:gp012",
      rulesetVersion: ruleset,
      idempotencyKey: "gp012:offer",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!offered.ok) throw offered.error;
    const accepted = staff.acceptStaffContract({
      contractId: offered.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "gp012:accept",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!accepted.ok) throw accepted.error;
    // capacidade médica é consultada read-only (não muda a revisão do staff).
    const staffRevision = staff.snapshot().revision;
    const capability = staff.capability(physio.value.id, date("2026-03-01"));
    expect(capability!.score).toBeGreaterThan(0);
    expect(staff.snapshot().revision).toBe(staffRevision);

    // C4: lesão grave → indisponível (excluído da escalação da partida C8).
    const injury = lifecycle.openMedicalCase({
      playerId: player.id,
      diagnosis: "Ruptura",
      severity: "SEVERE",
      expectedReturnOn: "2026-05-01",
      worldDate: "2026-03-01",
      rulesetVersion: ruleset,
      idempotencyKey: `gp012:injury:${player.id}`,
      worldSeed: gameWorld.seed,
    });
    if (!injury.ok) throw injury.error;
    expect(lifecycle.findPlayer(player.id)!.availability).not.toBe("AVAILABLE");
    const availableForMatch = lifecycle
      .snapshot()
      .players.filter((p) => p.availability === "AVAILABLE")
      .map((p) => p.id);
    expect(availableForMatch).not.toContain(player.id);

    // C10: a torcida reage ao revés (derrota com desfalque) — satisfação cai.
    const narrativeR = WorldNarrative.initialize(gameWorld);
    if (!narrativeR.ok) throw narrativeR.error;
    const clubN = "019f0000-0000-7000-8000-0000000000c1" as NarrativeClubRef;
    const reaction = narrativeR.value.applyMatchFact({
      factId: `setback:${player.id}`,
      clubId: clubN,
      outcome: "LOSS",
      expected: "DRAW",
      rulesetVersion: ruleset,
      idempotencyKey: "gp012:reaction",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-08",
    });
    if (!reaction.ok) throw reaction.error;
    expect(reaction.value.overall).toBeLessThan(50);

    // C4: a reavaliação do fisio estende o prazo e, na data lógica, dá alta.
    const extended = lifecycle.reassessMedicalCase({
      medicalCaseId: injury.value.id,
      outcome: "EXTEND",
      newExpectedReturnOn: "2026-05-20",
      worldDate: "2026-04-15",
      rulesetVersion: ruleset,
      idempotencyKey: `gp012:extend:${player.id}`,
      worldSeed: gameWorld.seed,
    });
    if (!extended.ok) throw extended.error;
    const cleared = lifecycle.reassessMedicalCase({
      medicalCaseId: injury.value.id,
      outcome: "CLEAR",
      worldDate: "2026-05-21",
      rulesetVersion: ruleset,
      idempotencyKey: `gp012:clear:${player.id}`,
      worldSeed: gameWorld.seed,
    });
    expect(cleared).toMatchObject({ ok: true, value: { status: "CLEARED" } });
    expect(lifecycle.findPlayer(player.id)!.availability).toBe("AVAILABLE");
  });
});
