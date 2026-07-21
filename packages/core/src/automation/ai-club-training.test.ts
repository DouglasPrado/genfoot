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
import type { CohesionWriter } from "../training/train-formation-cohesion.js";
import {
  RunAiClubsTraining,
  type AiTrainingReader,
  type AiTrainingRepositories,
  type AiTrainingUnitOfWork,
} from "./ai-club-training.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const PLAYER = "019b76da-a800-7451-8ea2-7b2378e42051";
const AI_CLUB = "019b76da-a800-7451-8ea2-7b2378e420ff";
const RULESET = "1.0.0" as never;

function aggregate(overrides: Partial<PlayerLifecycleSnapshot> = {}): PlayerAggregateSnapshot {
  const attrs: Record<string, number | null> = {};
  for (const c of [...TECHNICAL_ATTRIBUTES, ...PHYSICAL_ATTRIBUTES, ...MENTAL_ATTRIBUTES]) attrs[c] = 50;
  for (const c of GOALKEEPING_ATTRIBUTES) attrs[c] = null;
  // O ST recomenda 'finishing' — deixo baixo para ser o alvo (mais fraco).
  attrs.finishing = 30;
  const player: PlayerLifecycleSnapshot = {
    id: PLAYER, gameWorldId: WORLD, personId: `${PLAYER}-p`,
    primaryPosition: PlayerPosition.ST, dominantFoot: DominantFoot.RIGHT,
    careerStatus: PlayerCareerStatus.ACTIVE, availability: PlayerAvailability.AVAILABLE,
    generationSource: PlayerGenerationSource.INITIAL_WORLD, generatedAtSeasonNumber: 1,
    attributes: attrs, currentAbility: 50, potentialAbility: 85, baselineAbility: 50,
    lastAgedSeasonId: null,
    dynamicState: { morale: 70, confidence: 50, happiness: 50, fatigue: 0, matchSharpness: 50 },
    lastProcessedOn: "2026-01-01", version: 1, ...overrides,
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
class MemCohesion implements CohesionWriter {
  public raises: string[] = [];
  public raiseByFormationTraining(_w: string, clubId: string): Promise<void> {
    this.raises.push(clubId);
    return Promise.resolve();
  }
}
class MemReader implements AiTrainingReader {
  public constructor(private readonly playerId: string | null) {}
  public aiClubIds(): Promise<readonly string[]> {
    return Promise.resolve([AI_CLUB]);
  }
  public availablePlayerIds(): Promise<readonly string[]> {
    return Promise.resolve(this.playerId === null ? [] : [this.playerId]);
  }
}
function uowOf(repos: AiTrainingRepositories): AiTrainingUnitOfWork {
  return { run: (work) => work(repos) };
}

describe("RunAiClubsTraining", () => {
  it("desenvolve a habilidade recomendada mais fraca e sobe o entrosamento do clube de IA", async () => {
    const players = new MemPlayers(aggregate());
    const cohesion = new MemCohesion();
    const uow = uowOf({ reader: new MemReader(PLAYER), players, cohesion });
    const before = players.agg.player.attributes.finishing;

    const r = await new RunAiClubsTraining(uow).execute({
      gameWorldId: WORLD, worldSeed: "seed", worldDate: "2026-03-02", rulesetVersion: RULESET,
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.clubsTrained).toBe(1);
      expect(r.value.playersDeveloped).toBe(1);
    }
    // 'finishing' (recomendada e mais fraca do ST) subiu.
    expect(players.agg.player.attributes.finishing).toBeGreaterThan(before);
    // Entrosamento do clube de IA subiu.
    expect(cohesion.raises).toEqual([AI_CLUB]);
  });

  it("clube sem jogadores aptos: sobe só o entrosamento, ninguém desenvolvido", async () => {
    const players = new MemPlayers(aggregate());
    const cohesion = new MemCohesion();
    const uow = uowOf({ reader: new MemReader(null), players, cohesion });
    const r = await new RunAiClubsTraining(uow).execute({
      gameWorldId: WORLD, worldSeed: "seed", worldDate: "2026-03-02", rulesetVersion: RULESET,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.playersDeveloped).toBe(0);
    expect(cohesion.raises).toEqual([AI_CLUB]);
  });
});
