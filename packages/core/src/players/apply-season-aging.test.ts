import { beforeEach, describe, expect, it } from "vitest";

import { ApplySeasonAging } from "./apply-season-aging.js";
import type {
  SeasonAgingRepositories,
  SeasonAgingUnitOfWork,
  SeasonAgingRoster,
} from "./apply-season-aging.js";
import type {
  PlayerRepository,
  PlayerAggregateSnapshot,
} from "./player-repository.js";
import {
  PlayerAvailability,
  PlayerCareerStatus,
  PlayerGenerationSource,
} from "./player-lifecycle-types.js";
import { DominantFoot, PlayerPosition } from "../genesis/genesis-types.js";
import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "./player-attributes.js";
import type { PlayerLifecycleSnapshot } from "./player-lifecycle-types.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const SEASON = "019b76da-a800-7451-8ea2-7b2378e42070";
const SEED = "mundo-aging";

function snap(id: string, age: number, physical = 70): PlayerAggregateSnapshot {
  const attributes: Record<string, number | null> = {};
  for (const c of [...TECHNICAL_ATTRIBUTES, ...MENTAL_ATTRIBUTES]) attributes[c] = 60;
  for (const c of PHYSICAL_ATTRIBUTES) attributes[c] = physical;
  for (const c of GOALKEEPING_ATTRIBUTES) attributes[c] = null;
  const player: PlayerLifecycleSnapshot = {
    id, gameWorldId: WORLD, personId: `${id}-p`,
    primaryPosition: PlayerPosition.CB, dominantFoot: DominantFoot.RIGHT,
    careerStatus: PlayerCareerStatus.ACTIVE, availability: PlayerAvailability.AVAILABLE,
    generationSource: PlayerGenerationSource.INITIAL_WORLD, generatedAtSeasonNumber: 1,
    attributes, currentAbility: physical, baselineAbility: physical, potentialAbility: 90,
    dynamicState: { morale: 50, confidence: 50, happiness: 50, fatigue: 0, matchSharpness: 50 },
    lastProcessedOn: "2026-01-01", version: 1,
  } as PlayerLifecycleSnapshot;
  return { player, person: { id: `${id}-p`, ageVirtual: age } } as unknown as PlayerAggregateSnapshot;
}

class MemPlayers implements PlayerRepository {
  public store = new Map<string, PlayerAggregateSnapshot>();
  findPlayerById(_w: never, id: never) {
    return Promise.resolve(this.store.get(id as string) ?? null);
  }
  savePlayer(s: PlayerAggregateSnapshot) {
    this.store.set(s.player.id, s);
    return Promise.resolve();
  }
}

class MemRoster implements SeasonAgingRoster {
  constructor(private readonly ages: Map<string, number>) {}
  activePlayers(_w: string) {
    return Promise.resolve(
      [...this.ages].map(([playerId, age]) => ({ playerId, age })),
    );
  }
}

class MemUoW implements SeasonAgingUnitOfWork {
  constructor(private readonly repos: SeasonAgingRepositories) {}
  run<T>(work: (r: SeasonAgingRepositories) => Promise<T>) {
    return work(this.repos);
  }
}

const JOVEM = "019b76da-a800-7451-8ea2-7b2378e42081";
const VETERANO = "019b76da-a800-7451-8ea2-7b2378e42082";
const ANCIAO = "019b76da-a800-7451-8ea2-7b2378e42083";

let players: MemPlayers;
let uc: ApplySeasonAging;
let ages: Map<string, number>;

beforeEach(() => {
  players = new MemPlayers();
  players.store.set(JOVEM, snap(JOVEM, 22));
  players.store.set(VETERANO, snap(VETERANO, 35));
  players.store.set(ANCIAO, snap(ANCIAO, 45));
  ages = new Map([[JOVEM, 22], [VETERANO, 35], [ANCIAO, 45]]);
  uc = new ApplySeasonAging(new MemUoW({ players, roster: new MemRoster(ages) }));
});

const input = { gameWorldId: WORLD, seasonId: SEASON, worldSeed: SEED, worldDate: "2026-12-31", rulesetVersion: "1.0.0" as never };

describe("ApplySeasonAging — declínio + aposentadoria na virada (R-217)", () => {
  it("jovem não decai nem aposenta", async () => {
    const r = await uc.execute(input);
    expect(r.ok).toBe(true);
    const j = players.store.get(JOVEM)!.player;
    expect(j.attributes.strength).toBe(70); // intacto
    expect(j.careerStatus).toBe(PlayerCareerStatus.ACTIVE);
  });

  it("veterano perde atributo físico (delta negativo, respeita clamp)", async () => {
    await uc.execute(input);
    const v = players.store.get(VETERANO)!.player;
    // 35 anos → perda da faixa 34-35; strength cai de 70
    expect(v.attributes.strength).toBeLessThan(70);
    expect(70 - (v.attributes.strength)).toBeLessThanOrEqual(6);
  });

  it("declínio não toca atributo técnico/mental", async () => {
    await uc.execute(input);
    const v = players.store.get(VETERANO)!.player;
    expect(v.attributes.shortPassing).toBe(60); // técnico intacto
  });

  it("ancião de 45 aposenta (prob ~1)", async () => {
    await uc.execute(input);
    expect(players.store.get(ANCIAO)!.player.careerStatus).toBe(
      PlayerCareerStatus.RETIRED,
    );
  });

  it("é determinístico — mesma virada, mesmo resultado", async () => {
    await uc.execute(input);
    const primeiro = players.store.get(VETERANO)!.player.attributes.strength;
    // reroda do zero com o mesmo estado inicial
    players.store.set(VETERANO, snap(VETERANO, 35));
    await uc.execute(input);
    expect(players.store.get(VETERANO)!.player.attributes.strength).toBe(primeiro);
  });

  it("reporta quantos decaíram e quantos aposentaram", async () => {
    const r = await uc.execute(input);
    if (!r.ok) throw r.error;
    expect(r.value.retired).toBeGreaterThanOrEqual(1); // pelo menos o ancião
    expect(r.value.declined).toBeGreaterThanOrEqual(1); // pelo menos o veterano
  });

  it("idempotente na temporada: rodar 2x NÃO declina o sobrevivente em dobro (INV-29)", async () => {
    // O bug que a prova por HTTP pegou (63→61 em duas viradas). O 31a decai 1 e
    // nunca aposenta (p=0), então sobrevive e seria re-declinado sem a trava.
    const P31 = "019b76da-a800-7451-8ea2-7b2378e42099";
    players.store.set(P31, snap(P31, 31, 63));
    ages.set(P31, 31);

    await uc.execute(input);
    const depoisUm = players.store.get(P31)!.player.attributes.strength;
    expect(depoisUm).toBe(62); // 63 - 1 (faixa 30-31)

    await uc.execute(input); // replay da MESMA temporada
    expect(players.store.get(P31)!.player.attributes.strength).toBe(depoisUm);
  });

  it("mundo sem jogadores é no-op bem-sucedido", async () => {
    players.store.clear();
    ages.clear();
    const r = await uc.execute(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ declined: 0, retired: 0 });
  });
});
