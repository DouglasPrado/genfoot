import { describe, expect, it } from "vitest";

import { DominantFoot, PlayerPosition } from "../genesis/genesis-types.js";
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
import { recommendedAttributes } from "../players/position-attributes.js";
import { derivePotentialLayers } from "../players/potential-layers.js";

import type {
  IndividualTrainingPlanRepository,
  IndividualTrainingPlanSnapshot,
  IndividualTrainingTarget,
} from "./individual-training-plan-types.js";
import { sessionRawGainPoints } from "./session-gain.js";
import {
  SettleDueIndividualTrainingPlans,
  type IndividualTrainingRepositories,
  type IndividualTrainingUnitOfWork,
} from "./settle-due-individual-training-plans.js";

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
  attrs.finishing = 30; // recomendada do ST e a mais fraca — o alvo.
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

class MemPlans implements IndividualTrainingPlanRepository {
  public constructor(private readonly target: IndividualTrainingTarget) {}
  public findByPlayer(): Promise<IndividualTrainingPlanSnapshot | null> {
    return Promise.resolve(null);
  }
  public save(): Promise<void> { return Promise.resolve(); }
  public findAllActive(): Promise<readonly IndividualTrainingPlanSnapshot[]> {
    return Promise.resolve([
      { id: "plan", gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER, target: this.target, intensity: 70, version: 1 },
    ]);
  }
}

function uowOf(repos: IndividualTrainingRepositories): IndividualTrainingUnitOfWork {
  return { run: (work) => work(repos) };
}

const budget = sessionRawGainPoints({
  usableCeiling: derivePotentialLayers({ natural: 85, baselineAbility: 50, currentAbility: 50 }).usable,
  currentAbility: 50, morale: 70, fatigue: 0, age: 20, elapsedDays: 1, durationDays: 1,
});

function settle(target: IndividualTrainingTarget, players: MemPlayers) {
  return new SettleDueIndividualTrainingPlans(
    uowOf({ plans: new MemPlans(target), players }),
  ).execute({ gameWorldId: WORLD, worldSeed: "seed", worldDate: "2026-03-02", rulesetVersion: RULESET });
}

describe("SettleDueIndividualTrainingPlans (M-TRAINING-INDIV)", () => {
  it("orçamento > 0 no cenário de teste (senão os asserts não medem nada)", () => {
    expect(budget).toBeGreaterThan(1);
  });

  it("alvo ATRIBUTO: concentra o orçamento CHEIO no atributo, sem tocar os outros", async () => {
    const players = new MemPlayers(aggregate());
    const r = await settle({ kind: "ATTRIBUTE", attributeCode: "finishing" }, players);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.developedCount).toBe(1);
    // finishing subiu o orçamento inteiro (concentrado), não só +1.
    expect(players.agg.player.attributes.finishing).toBe(30 + budget);
    // um atributo qualquer não-alvo ficou parado.
    expect(players.agg.player.attributes.dribbling).toBe(50);
  });

  it("alvo POSIÇÃO: espalha +1 nas recomendadas mais fracas, gastando o orçamento", async () => {
    const players = new MemPlayers(aggregate());
    const before: Record<string, number | null> = { ...players.agg.player.attributes };
    const r = await settle({ kind: "POSITION", position: "ST" }, players);
    expect(r.ok).toBe(true);

    const after = players.agg.player.attributes as Record<string, number | null>;
    const raised = Object.keys(after).filter(
      (k) => after[k] !== null && before[k] !== null && (after[k] as number) > (before[k] as number),
    );
    const recs = new Set(recommendedAttributes("ST"));
    // Gastou exatamente o orçamento, +1 em cada — espalhado, não concentrado.
    expect(raised.length).toBe(budget);
    for (const k of raised) {
      expect(after[k]).toBe((before[k] as number) + 1);
      // Só tocou habilidades RECOMENDADAS da posição.
      expect(recs.has(k)).toBe(true);
    }
    // A mais fraca recomendada (finishing=30) entrou.
    expect(after.finishing).toBe(31);
  });

  it("jogador NÃO apto (lesionado) é pulado — a sessão manual/lesão tem precedência", async () => {
    const players = new MemPlayers(aggregate(PlayerAvailability.INJURED));
    const r = await settle({ kind: "ATTRIBUTE", attributeCode: "finishing" }, players);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.developedCount).toBe(0);
      expect(r.value.skippedCount).toBe(1);
    }
    expect(players.agg.player.attributes.finishing).toBe(30);
  });
});
