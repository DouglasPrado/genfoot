import { describe, expect, it } from "vitest";

import { DominantFoot, PlayerPosition } from "../genesis/genesis-types.js";
import type { NotificationItemSnapshot, NotificationRepository } from "../notifications/notification-types.js";
import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "../players/player-attributes.js";
import {
  PlayerAvailability,
  PlayerCareerStatus,
  PlayerGenerationSource,
  type PlayerLifecycleSnapshot,
} from "../players/player-lifecycle-types.js";
import type {
  PlayerAggregateSnapshot,
  PlayerRepository,
} from "../players/player-repository.js";

import { focusAttributes } from "./focus-attributes.js";
import {
  SettleDueCollectiveTraining,
  type CollectiveTrainingRepositories,
  type CollectiveTrainingUnitOfWork,
} from "./settle-due-collective-training.js";
import { TrainingFocus, type TrainingEntrySnapshot, type TrainingPlanRepository, type TrainingPlanSnapshot } from "./training-types.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const CLUB = "019b76da-a800-7451-8ea2-7b2378e420ff";
const PLAYER = "019b76da-a800-7451-8ea2-7b2378e42051";
const RULESET = "1.0.0" as never;

function aggregate(
  availability: PlayerAvailability = PlayerAvailability.AVAILABLE,
): PlayerAggregateSnapshot {
  const attrs: Record<string, number | null> = {};
  for (const c of [...TECHNICAL_ATTRIBUTES, ...PHYSICAL_ATTRIBUTES, ...MENTAL_ATTRIBUTES]) attrs[c] = 50;
  for (const c of GOALKEEPING_ATTRIBUTES) attrs[c] = null;
  attrs.finishing = 30; // técnica mais fraca — entra primeiro no foco TECHNICAL.
  const player: PlayerLifecycleSnapshot = {
    id: PLAYER, gameWorldId: WORLD, personId: `${PLAYER}-p`,
    primaryPosition: PlayerPosition.ST, dominantFoot: DominantFoot.RIGHT,
    careerStatus: PlayerCareerStatus.ACTIVE, availability,
    generationSource: PlayerGenerationSource.INITIAL_WORLD, generatedAtSeasonNumber: 1,
    attributes: attrs, currentAbility: 50, potentialAbility: 85, baselineAbility: 50,
    lastAgedSeasonId: null,
    dynamicState: { morale: 70, confidence: 50, happiness: 50, fatigue: 0, matchSharpness: 50 },
    lastProcessedOn: "2026-01-01", version: 1,
  } as PlayerLifecycleSnapshot;
  return {
    player,
    person: { id: `${PLAYER}-p`, gameWorldId: WORLD, firstName: "T", lastName: "Este", birthDate: "2006-01-01", nationality: "BR", version: 1 } as never,
  };
}

class MemPlayers implements PlayerRepository {
  public constructor(public agg: PlayerAggregateSnapshot) {}
  public findPlayerById(): Promise<PlayerAggregateSnapshot | null> {
    return Promise.resolve(this.agg);
  }
  public savePlayer(s: PlayerAggregateSnapshot): Promise<void> {
    this.agg = s;
    return Promise.resolve();
  }
  public decayForma(): Promise<void> { return Promise.resolve(); }
  public nudgeClubForma(): Promise<void> { return Promise.resolve(); }
}

function planWith(entries: readonly TrainingEntrySnapshot[]): TrainingPlanSnapshot {
  return {
    id: "plan", gameWorldId: WORLD, clubId: CLUB, seasonId: "s", name: "Base",
    focus: TrainingFocus.TECHNICAL, intensity: 60, entries, qualityFactor: 1, version: 1,
  };
}

class MemPlans implements TrainingPlanRepository {
  public constructor(private readonly plan: TrainingPlanSnapshot) {}
  public findByClubSeason(): Promise<TrainingPlanSnapshot | null> { return Promise.resolve(this.plan); }
  public save(): Promise<void> { return Promise.resolve(); }
  public findAllActive(): Promise<readonly TrainingPlanSnapshot[]> { return Promise.resolve([this.plan]); }
}

class MemNotifications implements NotificationRepository {
  public items: NotificationItemSnapshot[] = [];
  public append(item: NotificationItemSnapshot): Promise<void> {
    this.items.push(item);
    return Promise.resolve();
  }
}

function uowOf(repos: CollectiveTrainingRepositories): CollectiveTrainingUnitOfWork {
  return { run: (work) => work(repos) };
}

describe("focusAttributes", () => {
  it("mapeia focos para atributos; RECOVERY é vazio; INDIVIDUAL_ROLE usa a posição", () => {
    expect(focusAttributes(TrainingFocus.TECHNICAL, "ST")).toContain("finishing");
    expect(focusAttributes(TrainingFocus.PHYSICAL, "ST")).toContain("pace");
    expect(focusAttributes(TrainingFocus.RECOVERY, "ST")).toEqual([]);
    expect(focusAttributes(TrainingFocus.INDIVIDUAL_ROLE, "ST").length).toBeGreaterThan(0);
  });
});

describe("SettleDueCollectiveTraining", () => {
  it("desenvolve o jogador apto pelo foco e emite UM aviso-resumo do clube", async () => {
    const players = new MemPlayers(aggregate());
    const notifs = new MemNotifications();
    const plan = planWith([{ playerId: PLAYER, focus: TrainingFocus.TECHNICAL, workload: 80 }]);
    const r = await new SettleDueCollectiveTraining(
      uowOf({ plans: new MemPlans(plan), players, notifications: notifs }),
    ).execute({ gameWorldId: WORLD, worldSeed: "seed", worldDate: "2026-03-02", rulesetVersion: RULESET });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.developedCount).toBeGreaterThan(0);
    // Carga 80 (firme) → orçamento 2 → 2 técnicas mais fracas +1 (finishing entra).
    expect(players.agg.player.attributes.finishing).toBe(31);
    // UM aviso-resumo, club-scoped, tipo TRAINING_REPORT.
    expect(notifs.items).toHaveLength(1);
    expect(notifs.items[0]?.clubId).toBe(CLUB);
    expect(notifs.items[0]?.message).toMatch(/treino coletivo/);
  });

  it("carga 0 (poupando) não desenvolve nem notifica", async () => {
    const players = new MemPlayers(aggregate());
    const notifs = new MemNotifications();
    const plan = planWith([{ playerId: PLAYER, focus: TrainingFocus.TECHNICAL, workload: 0 }]);
    const r = await new SettleDueCollectiveTraining(
      uowOf({ plans: new MemPlans(plan), players, notifications: notifs }),
    ).execute({ gameWorldId: WORLD, worldSeed: "seed", worldDate: "2026-03-02", rulesetVersion: RULESET });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.developedCount).toBe(0);
    expect(players.agg.player.attributes.finishing).toBe(30);
    expect(notifs.items).toHaveLength(0);
  });

  it("RECOVERY não desenvolve (descanso)", async () => {
    const players = new MemPlayers(aggregate());
    const notifs = new MemNotifications();
    const plan = planWith([{ playerId: PLAYER, focus: TrainingFocus.RECOVERY, workload: 100 }]);
    const r = await new SettleDueCollectiveTraining(
      uowOf({ plans: new MemPlans(plan), players, notifications: notifs }),
    ).execute({ gameWorldId: WORLD, worldSeed: "seed", worldDate: "2026-03-02", rulesetVersion: RULESET });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.developedCount).toBe(0);
    expect(players.agg.player.attributes.finishing).toBe(30);
  });
});
