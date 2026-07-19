import { beforeEach, describe, expect, it } from "vitest";

import { AccrueClubTraining } from "./accrue-club-training.js";
import {
  TrainingFocus,
  type TrainingPlanSnapshot,
} from "./training-types.js";
import type {
  AccrualContextReader,
  AccrualBufferWriter,
  TrainingPlanReader,
  PlayerAccrualContext,
  BufferIncrement,
} from "./accrue-club-training.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const CLUB = "019b76da-a800-7451-8ea2-7b2378e42060";
const SEASON = "019b76da-a800-7451-8ea2-7b2378e42070";
const P1 = "019b76da-a800-7451-8ea2-7b2378e42081";
const P2 = "019b76da-a800-7451-8ea2-7b2378e42082";

class MemoryPlanReader implements TrainingPlanReader {
  public plan: TrainingPlanSnapshot | null = {
    id: "019b76da-a800-7c86-b6d6-3794302bed3e",
    gameWorldId: WORLD,
    clubId: CLUB,
    seasonId: SEASON,
    name: "Base",
    focus: TrainingFocus.TECHNICAL,
    intensity: 60,
    entries: [
      { playerId: P1, focus: TrainingFocus.TECHNICAL, workload: 80 },
      { playerId: P2, focus: TrainingFocus.RECOVERY, workload: 100 },
    ],
    qualityFactor: 1,
    version: 1,
  };
  findByClubSeason() {
    return Promise.resolve(this.plan);
  }
}

class MemoryContextReader implements AccrualContextReader {
  public byId: Record<string, PlayerAccrualContext> = {
    [P1]: {
      playerId: P1,
      age: 19,
      baselineAbility: 50,
      currentAbility: 50,
      naturalPotential: 90,
      applicableAttributes: ["shortPassing", "longPassing", "firstTouch", "dribbling", "vision"],
    },
    [P2]: {
      playerId: P2,
      age: 24,
      baselineAbility: 60,
      currentAbility: 60,
      naturalPotential: 80,
      applicableAttributes: ["shortPassing", "vision"],
    },
  };
  contextFor(_w: string, _c: string, playerIds: readonly string[]) {
    return Promise.resolve(playerIds.map((id) => this.byId[id]).filter(Boolean) as PlayerAccrualContext[]);
  }
}

class MemoryBufferWriter implements AccrualBufferWriter {
  public increments: BufferIncrement[] = [];
  addToBuffer(increments: readonly BufferIncrement[]) {
    this.increments.push(...increments);
    return Promise.resolve();
  }
}

let plans: MemoryPlanReader;
let ctx: MemoryContextReader;
let writer: MemoryBufferWriter;
let uc: AccrueClubTraining;

beforeEach(() => {
  plans = new MemoryPlanReader();
  ctx = new MemoryContextReader();
  writer = new MemoryBufferWriter();
  uc = new AccrueClubTraining(plans, ctx, writer);
});

describe("AccrueClubTraining — um dia de treino do clube", () => {
  it("acumula buffer para quem tem foco produtivo", async () => {
    const r = await uc.execute({ gameWorldId: WORLD, clubId: CLUB, seasonId: SEASON });
    expect(r.ok).toBe(true);
    // P1 (TECHNICAL) gera buffer; P2 (RECOVERY) não.
    const jogadores = new Set(writer.increments.map((i) => i.playerId));
    expect(jogadores.has(P1)).toBe(true);
    expect(jogadores.has(P2)).toBe(false);
  });

  it("cada incremento carrega seasonId e delta positivo em pontos-base", async () => {
    await uc.execute({ gameWorldId: WORLD, clubId: CLUB, seasonId: SEASON });
    for (const inc of writer.increments) {
      expect(inc.seasonId).toBe(SEASON);
      expect(inc.gameWorldId).toBe(WORLD);
      expect(Number.isInteger(inc.pendingDelta)).toBe(true);
      expect(inc.pendingDelta).toBeGreaterThan(0);
    }
  });

  it("sem plano na temporada é no-op, não erro", async () => {
    plans.plan = null;
    const r = await uc.execute({ gameWorldId: WORLD, clubId: CLUB, seasonId: SEASON });
    expect(r.ok).toBe(true);
    expect(writer.increments).toEqual([]);
  });

  it("aplica o qualityFactor do plano (R-13)", async () => {
    await uc.execute({ gameWorldId: WORLD, clubId: CLUB, seasonId: SEASON });
    const cheio = writer.increments.reduce((s, i) => s + i.pendingDelta, 0);

    writer.increments = [];
    plans.plan = { ...plans.plan!, qualityFactor: 0.5 };
    await uc.execute({ gameWorldId: WORLD, clubId: CLUB, seasonId: SEASON });
    const meio = writer.increments.reduce((s, i) => s + i.pendingDelta, 0);

    expect(meio).toBeLessThan(cheio);
  });

  it("ignora entrada de jogador sem contexto (saiu do elenco)", async () => {
    plans.plan = {
      ...plans.plan!,
      entries: [
        { playerId: P1, focus: TrainingFocus.TECHNICAL, workload: 80 },
        { playerId: "fantasma", focus: TrainingFocus.TECHNICAL, workload: 80 },
      ],
    };
    const r = await uc.execute({ gameWorldId: WORLD, clubId: CLUB, seasonId: SEASON });
    expect(r.ok).toBe(true);
    expect(writer.increments.every((i) => i.playerId === P1)).toBe(true);
  });
});
