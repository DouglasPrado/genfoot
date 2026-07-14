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
  type GameWorldSnapshot,
  type NarrativeClubRef,
  type ProspectSpec,
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

  it("gera coorte de base, promove estreante e a torcida/imprensa reage", () => {
    const gameWorld = world();
    const genesis = new WorldGenesisGenerator().generate(gameWorld);
    const lifecycleR = WorldPlayerLifecycle.fromGenesis(gameWorld, genesis);
    if (!lifecycleR.ok) throw lifecycleR.error;
    const lifecycle = lifecycleR.value;
    const beforeCount = lifecycle.snapshot().players.length;

    // C4 US2: coorte da base real gera o jogador.
    const prospect: ProspectSpec = {
      firstName: "Cria",
      lastName: "Da Base",
      birthDate: "2009-03-01",
      nationality: "BR",
      primaryPosition: "CAM",
      dominantFoot: "LEFT",
      attributes: { technical: 52, physical: 46, mental: 50, goalkeeping: 18 },
      potentialAbility: 90,
      seasonNumber: 2,
    };
    const cohort = lifecycle.generateYouthCohort({
      prospects: [prospect],
      seasonNumber: 2,
      worldDate: "2026-07-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "gp011:cohort",
      worldSeed: gameWorld.seed,
    });
    if (!cohort.ok) throw cohort.error;
    const talent = cohort.value[0]!;
    expect(talent.youthProspect).toBe(true);

    const promoted = lifecycle.promoteYouth({
      playerId: talent.id,
      worldDate: "2027-01-15",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "gp011:promote",
      worldSeed: gameWorld.seed,
    });
    expect(promoted).toMatchObject({ ok: true, value: { youthProspect: false } });
    // controlador demográfico: a base repôs o portfólio de jogadores.
    expect(lifecycle.snapshot().players.length).toBe(beforeCount + 1);

    // C10: a torcida reage à estreia; C11: a imprensa/inbox registra.
    const club = "019f0000-0000-7000-8000-0000000000c1" as NarrativeClubRef;
    const narrativeR = WorldNarrative.initialize(gameWorld);
    if (!narrativeR.ok) throw narrativeR.error;
    const narrative = narrativeR.value;
    const story = narrative.chooseConversationOption({
      clubId: club,
      context: "youth-debut",
      options: ["celebrate", "downplay"],
      choice: "celebrate",
      frame: "academy-pride",
      factRefs: [`youth-promoted:${talent.id}`],
      reputationEffect: 4,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "gp011:debut-story",
      worldSeed: gameWorld.seed,
      worldDate: "2027-01-16",
    });
    expect(story).toMatchObject({ ok: true, value: { status: "PUBLISHED" } });

    const inboxR = WorldInbox.initialize(gameWorld);
    if (!inboxR.ok) throw inboxR.error;
    const notification = inboxR.value.projectNotification({
      dedupKey: `youth-debut:${talent.id}`,
      recipientScope: "manager:club-1",
      category: "YOUTH",
      priority: "NORMAL",
      sourceRef: `youth-promoted:${talent.id}`,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "gp011:debut-notif",
      worldSeed: gameWorld.seed,
      worldDate: "2027-01-16",
    });
    expect(notification).toMatchObject({ ok: true, value: { category: "YOUTH" } });
  });
});
