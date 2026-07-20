import { describe, expect, it } from "vitest";

import { DominantFoot, PlayerPosition } from "../genesis/genesis-types.js";
import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "./player-attributes.js";
import {
  PlayerAvailability,
  PlayerCareerStatus,
  PlayerGenerationSource,
  type PlayerLifecycleSnapshot,
} from "./player-lifecycle-types.js";
import { FORM_MAX } from "./match-form.js";
import type {
  PlayerAggregateSnapshot,
  PlayerRepository,
} from "./player-repository.js";
import { TalkStance, TalkToPlayer } from "./talk-to-player.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const PLAYER = "019b76da-a800-7451-8ea2-7b2378e42051";
const PERSON = "019b76da-a800-7451-8ea2-7b2378e42052";
const CLUB = "019b76da-a800-7451-8ea2-7b2378e42053";

function aggregate(forma = 0): PlayerAggregateSnapshot {
  const attrs: Record<string, number | null> = {};
  for (const c of [...TECHNICAL_ATTRIBUTES, ...PHYSICAL_ATTRIBUTES, ...MENTAL_ATTRIBUTES]) attrs[c] = 50;
  for (const c of GOALKEEPING_ATTRIBUTES) attrs[c] = null;
  return {
    player: {
      id: PLAYER, gameWorldId: WORLD, personId: PERSON,
      primaryPosition: PlayerPosition.CB, dominantFoot: DominantFoot.RIGHT,
      careerStatus: PlayerCareerStatus.ACTIVE, availability: PlayerAvailability.AVAILABLE,
      generationSource: PlayerGenerationSource.INITIAL_WORLD, generatedAtSeasonNumber: 1,
      attributes: attrs, currentAbility: 50, potentialAbility: 80, baselineAbility: 50,
      lastAgedSeasonId: null,
      dynamicState: { morale: 50, confidence: 50, happiness: 50, fatigue: 0, matchSharpness: 50 },
      formaModifier: forma, lastProcessedOn: "2026-01-01", version: 1,
    } as PlayerLifecycleSnapshot,
    person: { id: PERSON, gameWorldId: WORLD, firstName: "T", lastName: "Este", birthDate: "2000-01-01", nationality: "BR", version: 1 } as never,
  };
}

class MemPlayers implements PlayerRepository {
  public constructor(public agg: PlayerAggregateSnapshot | null) {}
  public findPlayerById(): Promise<PlayerAggregateSnapshot | null> {
    return Promise.resolve(this.agg);
  }
  public savePlayer(s: PlayerAggregateSnapshot): Promise<void> {
    this.agg = s;
    return Promise.resolve();
  }
  public decayForma(): Promise<void> {
    return Promise.resolve();
  }
  public nudgeClubForma(): Promise<void> {
    return Promise.resolve();
  }
}

const input = (stance: TalkStance) => ({
  gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER, stance,
});

describe("TalkToPlayer — a decisão move a forma (R-221 Fase 2c)", () => {
  it("elogiar SOBE a forma", async () => {
    const repo = new MemPlayers(aggregate(0));
    const r = await new TalkToPlayer(repo).execute(input(TalkStance.PRAISE));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.formaModifier).toBeGreaterThan(0);
    expect(repo.agg?.player.formaModifier).toBe(r.value.formaModifier);
  });

  it("criticar DESCE a forma", async () => {
    const repo = new MemPlayers(aggregate(0));
    const r = await new TalkToPlayer(repo).execute(input(TalkStance.CRITICIZE));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.formaModifier).toBeLessThan(0);
  });

  it("é tetada em ±FORM_MAX (elogio repetido não estoura)", async () => {
    const repo = new MemPlayers(aggregate(FORM_MAX - 1));
    await new TalkToPlayer(repo).execute(input(TalkStance.PRAISE));
    await new TalkToPlayer(repo).execute(input(TalkStance.PRAISE));
    expect(repo.agg?.player.formaModifier).toBe(FORM_MAX);
  });

  it("jogador inexistente é recusado", async () => {
    const repo = new MemPlayers(null);
    const r = await new TalkToPlayer(repo).execute(input(TalkStance.PRAISE));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("PLAYER_NOT_FOUND");
  });
});
