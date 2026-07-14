import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldCompetitions,
  WorldGenesisGenerator,
  WorldInbox,
  WorldMatches,
  WorldPlayerLifecycle,
  WorldStaff,
  type CompetitionClubRef,
  type CompetitionSeasonRef,
  type GameWorldSnapshot,
  type StaffClubRef,
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

  it("encadeia treino/staff (C5+C4) e a partida da rodada (C8→C7)", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const genesis = new WorldGenesisGenerator().generate(gameWorld);
    const lifecycleR = WorldPlayerLifecycle.fromGenesis(gameWorld, genesis);
    if (!lifecycleR.ok) throw lifecycleR.error;
    const lifecycle = lifecycleR.value;

    // C5: contrata um treinador ativo (prepara a semana).
    const staffR = WorldStaff.initialize(gameWorld);
    if (!staffR.ok) throw staffR.error;
    const staff = staffR.value;
    const club = "019f0000-0000-7000-8000-0000000000c1" as StaffClubRef;
    const coach = staff.createStaffMember({
      firstName: "Téc",
      lastName: "Nico",
      role: "HEAD_COACH",
      capabilities: { coaching: 75, fitness: 40, medical: 30, scouting: 50, management: 55 },
      reputation: 70,
      worldDate: "2026-01-01",
      rulesetVersion: ruleset,
      idempotencyKey: "gp005:coach",
      worldSeed: gameWorld.seed,
    });
    if (!coach.ok) throw coach.error;
    const offered = staff.offerStaffContract({
      staffId: coach.value.id,
      clubId: club,
      role: "HEAD_COACH",
      startOn: "2026-01-01",
      endOn: "2026-12-31",
      compensationRef: "comp:gp005",
      rulesetVersion: ruleset,
      idempotencyKey: "gp005:offer",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!offered.ok) throw offered.error;
    const accepted = staff.acceptStaffContract({
      contractId: offered.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "gp005:accept",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    expect(accepted).toMatchObject({ ok: true, value: { status: "ACTIVE" } });

    // C4: direção de treino do técnico eleva o atributo do jogador na semana.
    const player = lifecycle.snapshot().players.find(
      (p) => p.potentialAbility > p.currentAbility,
    )!;
    lifecycle.setTrainingDirection({
      playerId: player.id,
      focus: "technical",
      rulesetVersion: ruleset,
    });
    const developed = lifecycle.applyDailyDevelopment({
      playerId: player.id,
      worldDate: "2026-01-05",
      rulesetVersion: ruleset,
      idempotencyKey: "gp005:dev",
      worldSeed: gameWorld.seed,
    });
    if (!developed.ok) throw developed.error;
    expect(developed.value.attributes.technical).toBeGreaterThan(
      player.attributes.technical,
    );

    // C7: a rodada tem fixtures; C8: a partida é jogada e o resultado é oficial.
    const season = "019f0000-0000-7000-8000-0000000000aa" as CompetitionSeasonRef;
    const clubs = [
      "019f0000-0000-7000-8000-0000000000c1",
      "019f0000-0000-7000-8000-0000000000c2",
    ].map((id) => id as CompetitionClubRef);
    const competitionsR = WorldCompetitions.initialize(gameWorld);
    if (!competitionsR.ok) throw competitionsR.error;
    const competitions = competitionsR.value;
    const edition = competitions.createCompetitionEdition({
      seasonRef: season,
      name: "Liga",
      formatVersion: "league@1",
      maxParticipants: 2,
      startOn: "2026-02-01",
      roundIntervalDays: 7,
      worldDate: "2026-01-15",
      rulesetVersion: ruleset,
      idempotencyKey: "gp005:edition",
      worldSeed: gameWorld.seed,
    });
    if (!edition.ok) throw edition.error;
    clubs.forEach((clubId, index) => {
      const reg = competitions.registerParticipant({
        editionId: edition.value.id,
        clubId,
        rulesetVersion: ruleset,
        idempotencyKey: `gp005:reg:${index}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-16",
      });
      if (!reg.ok) throw reg.error;
    });
    const fixtures = competitions.generateFixtures({
      editionId: edition.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "gp005:fixtures",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    if (!fixtures.ok) throw fixtures.error;
    const fixture = fixtures.value[0]!;

    const matchesR = WorldMatches.initialize(gameWorld);
    if (!matchesR.ok) throw matchesR.error;
    const matches = matchesR.value;
    const manifest = matches.createMatchManifest({
      fixtureRef: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      kickoffOn: fixture.kickoffOn,
      seed: gameWorld.seed,
      engineBuild: "kernel@1",
      timestepChances: 40,
      homeStrength: 74,
      awayStrength: 50,
      worldDate: fixture.kickoffOn,
      rulesetVersion: ruleset,
      idempotencyKey: "gp005:manifest",
      worldSeed: gameWorld.seed,
    });
    if (!manifest.ok) throw manifest.error;
    const started = matches.startMatch({
      matchId: manifest.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "gp005:start",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!started.ok) throw started.error;
    const finalized = matches.finalizeMatch({
      matchId: manifest.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "gp005:final",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    if (!finalized.ok) throw finalized.error;

    // C8 → C7: o resultado oficial atualiza os standings da rodada.
    const recorded = competitions.recordOfficialResult({
      fixtureId: fixture.id,
      matchRef: finalized.value.id,
      homeGoals: finalized.value.result!.homeGoals,
      awayGoals: finalized.value.result!.awayGoals,
      rulesetVersion: ruleset,
      idempotencyKey: "gp005:official",
      worldSeed: gameWorld.seed,
      worldDate: fixture.kickoffOn,
    });
    expect(recorded).toMatchObject({ ok: true, value: { status: "FINAL" } });
    const standings = competitions.standingsFor(fixture.editionId);
    expect(standings.reduce((sum, e) => sum + e.played, 0)).toBe(2);
  });
});
