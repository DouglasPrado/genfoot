import { beforeEach, describe, expect, it } from "vitest";

import { ApplySeasonAccruals } from "./apply-season-accruals.js";
import type {
  SeasonAccrualRepositories,
  SeasonAccrualStore,
  SeasonAccrualUnitOfWork,
  SeasonAccrualRow,
} from "./apply-season-accruals.js";
import type { PlayerRepository, PlayerAggregateSnapshot } from "../players/player-repository.js";
import {
  PlayerAvailability,
  PlayerCareerStatus,
  PlayerGenerationSource,
} from "../players/player-lifecycle-types.js";
import { DominantFoot, PlayerPosition } from "../genesis/genesis-types.js";
import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "../players/player-attributes.js";
import type { PlayerLifecycleSnapshot } from "../players/player-lifecycle-types.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const SEASON = "019b76da-a800-7451-8ea2-7b2378e42070";
const P1 = "019b76da-a800-7451-8ea2-7b2378e42081";

function snapshot(): PlayerLifecycleSnapshot {
  const attributes: Record<string, number | null> = {};
  for (const c of [...TECHNICAL_ATTRIBUTES, ...PHYSICAL_ATTRIBUTES, ...MENTAL_ATTRIBUTES])
    attributes[c] = 50;
  for (const c of GOALKEEPING_ATTRIBUTES) attributes[c] = null;
  return {
    id: P1,
    gameWorldId: WORLD,
    personId: "019b76da-a800-7451-8ea2-7b2378e42052",
    primaryPosition: PlayerPosition.CB,
    dominantFoot: DominantFoot.RIGHT,
    careerStatus: PlayerCareerStatus.ACTIVE,
    availability: PlayerAvailability.AVAILABLE,
    generationSource: PlayerGenerationSource.INITIAL_WORLD,
    generatedAtSeasonNumber: 1,
    attributes,
    currentAbility: 50,
    baselineAbility: 40,
    potentialAbility: 90,
    dynamicState: { morale: 50, confidence: 50, happiness: 50, fatigue: 0, matchSharpness: 50 },
    lastProcessedOn: "2026-01-01",
    version: 1,
  } as PlayerLifecycleSnapshot;
}

class MemoryPlayerRepo implements PlayerRepository {
  public store = new Map<string, PlayerAggregateSnapshot>();
  public saves = 0;
  findPlayerById(_w: never, id: never) {
    return Promise.resolve(this.store.get(id as string) ?? null);
  }
  savePlayer(snap: PlayerAggregateSnapshot) {
    this.saves += 1;
    this.store.set(snap.player.id, snap);
    return Promise.resolve();
  }
  decayForma() {
    return Promise.resolve();
  }
  nudgeClubForma() {
    return Promise.resolve();
  }
}

class MemoryAccrualStore implements SeasonAccrualStore {
  public rows: SeasonAccrualRow[] = [];
  public cleared: { playerId: string; codes: string[] }[] = [];
  listForSeason() {
    return Promise.resolve(this.rows);
  }
  clearConsumed(playerId: string, _seasonId: string, codes: readonly string[]) {
    this.cleared.push({ playerId, codes: [...codes] });
    this.rows = this.rows.filter(
      (r) => !(r.playerId === playerId && codes.includes(r.attributeCode)),
    );
    return Promise.resolve();
  }
}

class MemoryUoW implements SeasonAccrualUnitOfWork {
  constructor(private readonly repos: SeasonAccrualRepositories) {}
  run<T>(work: (r: SeasonAccrualRepositories) => Promise<T>) {
    return work(this.repos);
  }
}

let players: MemoryPlayerRepo;
let store: MemoryAccrualStore;
let uc: ApplySeasonAccruals;

beforeEach(() => {
  players = new MemoryPlayerRepo();
  store = new MemoryAccrualStore();
  const snap: PlayerAggregateSnapshot = {
    player: snapshot(),
    person: { id: "019b76da-a800-7451-8ea2-7b2378e42052" },
  } as unknown as PlayerAggregateSnapshot;
  players.store.set(P1, snap);
  uc = new ApplySeasonAccruals(new MemoryUoW({ players, accruals: store }));
});

const input = {
  gameWorldId: WORLD,
  seasonId: SEASON,
  worldSeed: "seed",
  worldDate: "2026-12-31",
  rulesetVersion: "1.0.0" as never,
};

describe("ApplySeasonAccruals — a virada aplica e zera", () => {
  it("aplica o buffer ao atributo e salva o jogador", async () => {
    store.rows = [
      { playerId: P1, attributeCode: "shortPassing", pendingDeltaMinor: 30000n },
    ];
    const r = await uc.execute(input);
    expect(r.ok).toBe(true);
    expect(players.store.get(P1)!.player.attributes.shortPassing).toBe(53); // +3
    expect(players.saves).toBe(1);
  });

  it("ZERA o buffer consumido — replay não reaplica", async () => {
    store.rows = [
      { playerId: P1, attributeCode: "shortPassing", pendingDeltaMinor: 30000n },
    ];
    await uc.execute(input);
    expect(store.rows).toEqual([]); // buffer limpo
    // segundo apply: nada a fazer, atributo não muda de novo
    const antes = players.store.get(P1)!.player.attributes.shortPassing;
    const r2 = await uc.execute(input);
    expect(r2.ok).toBe(true);
    expect(players.store.get(P1)!.player.attributes.shortPassing).toBe(antes);
  });

  it("reescreve a baselineAbility na virada (R-216)", async () => {
    store.rows = [
      { playerId: P1, attributeCode: "shortPassing", pendingDeltaMinor: 30000n },
    ];
    await uc.execute(input);
    const p = players.store.get(P1)!.player;
    expect(p.baselineAbility).toBe(p.currentAbility);
  });

  it("temporada sem buffer é no-op bem-sucedido", async () => {
    const r = await uc.execute(input);
    expect(r.ok).toBe(true);
    expect(players.saves).toBe(0);
  });

  it("agrupa vários atributos do mesmo jogador num só save", async () => {
    store.rows = [
      { playerId: P1, attributeCode: "shortPassing", pendingDeltaMinor: 30000n },
      { playerId: P1, attributeCode: "vision", pendingDeltaMinor: 20000n },
    ];
    await uc.execute(input);
    // um jogador, um save — não um por atributo.
    expect(players.saves).toBe(1);
    const p = players.store.get(P1)!.player;
    expect(p.attributes.shortPassing).toBe(53);
    expect(p.attributes.vision).toBe(52);
  });

  it("jogador com buffer mas ausente do repositório não derruba a virada", async () => {
    store.rows = [
      { playerId: "sumido", attributeCode: "vision", pendingDeltaMinor: 20000n },
      { playerId: P1, attributeCode: "vision", pendingDeltaMinor: 20000n },
    ];
    const r = await uc.execute(input);
    expect(r.ok).toBe(true);
    expect(players.store.get(P1)!.player.attributes.vision).toBe(52);
  });
});
