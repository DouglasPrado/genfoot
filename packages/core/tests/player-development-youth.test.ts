import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldGenesisGenerator,
  WorldPlayerLifecycle,
  type GameWorldSnapshot,
  type ProspectSpec,
} from "../src/index.js";

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "c4-dev"): GameWorldSnapshot {
  const rulesetVersion = parseRulesetVersion("1.0.0");
  if (!rulesetVersion.ok) throw rulesetVersion.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed,
    startDate: date("2026-01-01"),
    rulesetVersion: rulesetVersion.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function lifecycle(seed = "c4-dev") {
  const gameWorld = world(seed);
  const genesis = new WorldGenesisGenerator().generate(gameWorld);
  const created = WorldPlayerLifecycle.fromGenesis(gameWorld, genesis);
  if (!created.ok) throw created.error;
  return { gameWorld, value: created.value };
}

const PROSPECT: ProspectSpec = {
  firstName: "Novo",
  lastName: "Talento",
  birthDate: "2008-05-01",
  nationality: "BR",
  primaryPosition: "ST",
  dominantFoot: "RIGHT",
  attributes: { technical: 55, physical: 50, mental: 48, goalkeeping: 20 },
  potentialAbility: 88,
  seasonNumber: 2,
};

describe("Player development, youth and generation (C4 US2)", () => {
  it("gera jogador explicitamente e é idempotente por chave", () => {
    const { gameWorld, value } = lifecycle();
    const before = value.snapshot().players.length;
    const generated = value.generatePlayer({
      prospect: PROSPECT,
      source: "SCOUT_FOUND",
      worldDate: "2026-02-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "gen:1",
      worldSeed: gameWorld.seed,
    });
    expect(generated).toMatchObject({
      ok: true,
      value: { generationSource: "SCOUT_FOUND", careerStatus: "ACTIVE" },
    });
    if (!generated.ok) throw generated.error;
    expect(value.snapshot().players).toHaveLength(before + 1);
    expect(
      value
        .snapshot()
        .generationEvents.filter((e) => e.idempotencyKey === "gen:1"),
    ).toHaveLength(1);

    const revision = value.snapshot().revision;
    const repeated = value.generatePlayer({
      prospect: PROSPECT,
      source: "SCOUT_FOUND",
      worldDate: "2026-02-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "gen:1",
      worldSeed: gameWorld.seed,
    });
    expect(repeated).toMatchObject({ ok: true, value: { id: generated.value.id } });
    expect(value.snapshot().revision).toBe(revision);
  });

  it("aplica direção de treino e desenvolvimento diário idempotente (PlayerDeveloped)", () => {
    const { gameWorld, value } = lifecycle();
    const generated = value.generatePlayer({
      prospect: PROSPECT,
      source: "SCOUT_FOUND",
      worldDate: "2026-02-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "gen:dev",
      worldSeed: gameWorld.seed,
    });
    if (!generated.ok) throw generated.error;
    const playerId = generated.value.id;
    const startTech = generated.value.attributes.technical;

    const focus = value.setTrainingDirection({
      playerId,
      focus: "technical",
      rulesetVersion: gameWorld.rulesetVersion,
    });
    expect(focus).toMatchObject({ ok: true, value: { trainingFocus: "technical" } });

    const developed = value.applyDailyDevelopment({
      playerId,
      worldDate: "2026-02-02",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "dev:1",
      worldSeed: gameWorld.seed,
    });
    if (!developed.ok) throw developed.error;
    expect(developed.value.attributes.technical).toBeGreaterThan(startTech);
    expect(
      value.snapshot().lifecycleEvents!.filter((e) => e.type === "PlayerDeveloped"),
    ).toHaveLength(1);

    // idempotência por chave: mesmo dia = efeito único
    const revision = value.snapshot().revision;
    const repeated = value.applyDailyDevelopment({
      playerId,
      worldDate: "2026-02-02",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "dev:1",
      worldSeed: gameWorld.seed,
    });
    expect(repeated).toMatchObject({ ok: true });
    expect(value.snapshot().revision).toBe(revision);
  });

  it("gera coorte de base e promove um prospecto (YouthPromoted)", () => {
    const { gameWorld, value } = lifecycle();
    const cohort = value.generateYouthCohort({
      prospects: [
        { ...PROSPECT, firstName: "Base", lastName: "Um" },
        { ...PROSPECT, firstName: "Base", lastName: "Dois", primaryPosition: "CM" },
      ],
      seasonNumber: 2,
      worldDate: "2026-02-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "cohort:1",
      worldSeed: gameWorld.seed,
    });
    if (!cohort.ok) throw cohort.error;
    expect(cohort.value).toHaveLength(2);
    expect(cohort.value.every((p) => p.youthProspect === true)).toBe(true);

    // coorte idempotente
    const revision = value.snapshot().revision;
    const repeated = value.generateYouthCohort({
      prospects: [
        { ...PROSPECT, firstName: "Base", lastName: "Um" },
        { ...PROSPECT, firstName: "Base", lastName: "Dois", primaryPosition: "CM" },
      ],
      seasonNumber: 2,
      worldDate: "2026-02-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "cohort:1",
      worldSeed: gameWorld.seed,
    });
    expect(repeated).toMatchObject({ ok: true });
    expect(value.snapshot().revision).toBe(revision);

    const prospect = cohort.value[0]!;
    const promoted = value.promoteYouth({
      playerId: prospect.id,
      worldDate: "2026-07-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "promote:1",
      worldSeed: gameWorld.seed,
    });
    expect(promoted).toMatchObject({
      ok: true,
      value: { youthProspect: false, careerStatus: "ACTIVE" },
    });
    expect(
      value.snapshot().lifecycleEvents!.filter((e) => e.type === "YouthPromoted"),
    ).toHaveLength(1);

    // replay com a mesma chave = efeito único
    const afterPromote = value.snapshot().revision;
    const replay = value.promoteYouth({
      playerId: prospect.id,
      worldDate: "2026-07-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "promote:1",
      worldSeed: gameWorld.seed,
    });
    expect(replay).toMatchObject({ ok: true, value: { youthProspect: false } });
    expect(value.snapshot().revision).toBe(afterPromote);

    // promover novamente (chave nova) quem já não é da base é rejeitado
    expect(
      value.promoteYouth({
        playerId: prospect.id,
        worldDate: "2026-07-02",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "promote:again",
        worldSeed: gameWorld.seed,
      }),
    ).toMatchObject({ ok: false, error: { code: "PLAYER_NOT_YOUTH" } });
  });
});
