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
import type { PlayerAggregateSnapshot, PlayerRepository } from "../players/player-repository.js";

import { CollectTrainingSession } from "./collect-training-session.js";
import { SettleDueTrainingSessions } from "./settle-due-training-sessions.js";
import { StartTrainingSession } from "./start-training-session.js";
import type {
  TrainingSessionRepositories,
  TrainingSessionRepository,
  TrainingSessionSnapshot,
  TrainingSessionUnitOfWork,
} from "./training-session-types.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const PLAYER = "019b76da-a800-7451-8ea2-7b2378e42051";
const PERSON = "019b76da-a800-7451-8ea2-7b2378e42052";
const CLUB = "019b76da-a800-7451-8ea2-7b2378e42053";
const SEED = "seed-2a";
const RULESET = "1.0.0" as never;

function aggregate(overrides: Partial<PlayerLifecycleSnapshot> = {}): PlayerAggregateSnapshot {
  const attrs: Record<string, number | null> = {};
  for (const c of [...TECHNICAL_ATTRIBUTES, ...PHYSICAL_ATTRIBUTES, ...MENTAL_ATTRIBUTES]) attrs[c] = 50;
  for (const c of GOALKEEPING_ATTRIBUTES) attrs[c] = null;
  const player: PlayerLifecycleSnapshot = {
    id: PLAYER,
    gameWorldId: WORLD,
    personId: PERSON,
    primaryPosition: PlayerPosition.CB,
    dominantFoot: DominantFoot.RIGHT,
    careerStatus: PlayerCareerStatus.ACTIVE,
    availability: PlayerAvailability.AVAILABLE,
    generationSource: PlayerGenerationSource.INITIAL_WORLD,
    generatedAtSeasonNumber: 1,
    attributes: attrs,
    currentAbility: 50,
    potentialAbility: 85,
    baselineAbility: 50,
    lastAgedSeasonId: null,
    dynamicState: { morale: 70, confidence: 50, happiness: 50, fatigue: 0, matchSharpness: 50 },
    lastProcessedOn: "2026-01-01",
    version: 1,
    ...overrides,
  } as PlayerLifecycleSnapshot;
  return {
    player,
    person: {
      id: PERSON,
      gameWorldId: WORLD,
      firstName: "T",
      lastName: "Este",
      birthDate: "2006-01-01", // 20 anos em 2026 — banda de bom desenvolvimento
      nationality: "BR",
      version: 1,
    } as never,
  };
}

class MemPlayers implements PlayerRepository {
  public constructor(public agg: PlayerAggregateSnapshot) {}
  public findPlayerById(): Promise<PlayerAggregateSnapshot | null> {
    return Promise.resolve(this.agg);
  }
  public savePlayer(snapshot: PlayerAggregateSnapshot): Promise<void> {
    this.agg = snapshot;
    return Promise.resolve();
  }
  public decayForma(): Promise<void> {
    return Promise.resolve();
  }
  public nudgeClubForma(): Promise<void> {
    return Promise.resolve();
  }
}
class MemSessions implements TrainingSessionRepository {
  public current: TrainingSessionSnapshot | null = null;
  public findActiveByPlayer(): Promise<TrainingSessionSnapshot | null> {
    return Promise.resolve(this.current?.active ? this.current : null);
  }
  public findAllActive(): Promise<readonly TrainingSessionSnapshot[]> {
    return Promise.resolve(this.current?.active ? [this.current] : []);
  }
  /** Espelha o banco: o id existe mesmo depois da sessão ser coletada. */
  public existsWithId(_gameWorldId: string, id: string): Promise<boolean> {
    return Promise.resolve(this.current?.id === id);
  }
  public save(session: TrainingSessionSnapshot): Promise<void> {
    this.current = session;
    return Promise.resolve();
  }
}
function uowOf(sessions: MemSessions, players: MemPlayers): TrainingSessionUnitOfWork {
  const repos: TrainingSessionRepositories = { sessions, players };
  return { run: (work) => work(repos) };
}

describe("StartTrainingSession", () => {
  it("cria sessão ativa e deixa o jogador INDISPONÍVEL", async () => {
    const players = new MemPlayers(aggregate());
    const sessions = new MemSessions();
    const r = await new StartTrainingSession(uowOf(sessions, players)).execute({
      gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER, attributeCode: "shortPassing",
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    expect(r.ok).toBe(true);
    expect(sessions.current?.active).toBe(true);
    expect(players.agg.player.availability).toBe(PlayerAvailability.UNAVAILABLE);
  });

  /**
   * O id da sessão é determinístico por (mundo, jogador, data lógica). Antes
   * desta guarda, tentar a segunda sessão no MESMO dia — com a primeira já
   * coletada, logo sem sessão ativa — passava pelo domínio e morria na
   * unicidade do Prisma, chegando na tela como COMMAND_EXECUTION_FAILED com
   * stack trace. Erro técnico no lugar de regra de negócio.
   */
  it("recusa segunda sessão no MESMO dia, mesmo com a primeira já coletada", async () => {
    const players = new MemPlayers(aggregate());
    const sessions = new MemSessions();
    const uow = uowOf(sessions, players);
    const args = {
      gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER,
      attributeCode: "shortPassing", worldSeed: SEED, worldDate: "2026-03-01",
    } as const;
    const primeira = await new StartTrainingSession(uow).execute(args);
    expect(primeira.ok).toBe(true);
    // A sessão é encerrada (como a coleta faz) — não há mais sessão ATIVA.
    if (sessions.current !== null) {
      sessions.current = { ...sessions.current, active: false };
    }
    // Jogador de volta ao elenco, disponível: é o estado exato depois da coleta.
    const liberado = new MemPlayers(aggregate());
    const segunda = await new StartTrainingSession(
      uowOf(sessions, liberado),
    ).execute(args);
    expect(segunda.ok).toBe(false);
    if (!segunda.ok) {
      expect(segunda.error.code).toBe("TRAINING_SESSION_ALREADY_TODAY");
    }
  });

  it("no dia SEGUINTE a sessão vale de novo — a guarda é por dia, não para sempre", async () => {
    const players = new MemPlayers(aggregate());
    const sessions = new MemSessions();
    const uow = uowOf(sessions, players);
    const base = {
      gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER,
      attributeCode: "shortPassing", worldSeed: SEED,
    } as const;
    await new StartTrainingSession(uow).execute({ ...base, worldDate: "2026-03-01" });
    if (sessions.current !== null) {
      sessions.current = { ...sessions.current, active: false };
    }
    const liberado = new MemPlayers(aggregate());
    const amanha = await new StartTrainingSession(
      uowOf(sessions, liberado),
    ).execute({ ...base, worldDate: "2026-03-02" });
    expect(amanha.ok).toBe(true);
  });

  it("recusa segunda sessão enquanto uma está ativa", async () => {
    const players = new MemPlayers(aggregate());
    const sessions = new MemSessions();
    const uow = uowOf(sessions, players);
    await new StartTrainingSession(uow).execute({
      gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER, attributeCode: "shortPassing",
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    const r2 = await new StartTrainingSession(uow).execute({
      gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER, attributeCode: "dribbling",
      worldSeed: SEED, worldDate: "2026-03-02",
    });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error.code).toBe("TRAINING_SESSION_ALREADY_ACTIVE");
  });

  it("recusa atributo que não se aplica (grid de goleiro num zagueiro)", async () => {
    const players = new MemPlayers(aggregate());
    const r = await new StartTrainingSession(uowOf(new MemSessions(), players)).execute({
      gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER, attributeCode: GOALKEEPING_ATTRIBUTES[0],
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    expect(r.ok).toBe(false);
  });
});

describe("CollectTrainingSession — aplicação instantânea", () => {
  async function startThenCollect(collectDate: string) {
    const players = new MemPlayers(aggregate());
    const sessions = new MemSessions();
    const uow = uowOf(sessions, players);
    await new StartTrainingSession(uow).execute({
      gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER, attributeCode: "shortPassing",
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    const before = players.agg.player.attributes.shortPassing;
    const r = await new CollectTrainingSession(uow).execute({
      gameWorldId: WORLD, playerId: PLAYER, worldSeed: SEED, worldDate: collectDate, rulesetVersion: RULESET,
    });
    return { players, sessions, before, r };
  }

  it("sessão completa: atributo SOBE na hora, jogador volta disponível e cansado, sessão encerra", async () => {
    const { players, sessions, before, r } = await startThenCollect("2026-03-08"); // 7 dias
    expect(r.ok).toBe(true);
    const after = players.agg.player.attributes.shortPassing;
    expect(after).toBeGreaterThan(before);
    expect(players.agg.player.availability).toBe(PlayerAvailability.AVAILABLE);
    expect(players.agg.player.dynamicState.fatigue).toBeGreaterThan(0);
    expect(sessions.current?.active).toBe(false);
  });

  it("interromper na metade rende PARCIAL (menos que a completa)", async () => {
    const parcial = await startThenCollect("2026-03-04"); // 3 dias
    const cheia = await startThenCollect("2026-03-08"); // 7 dias
    const ganhoParcial = (parcial.players.agg.player.attributes.shortPassing) - parcial.before;
    const ganhoCheio = (cheia.players.agg.player.attributes.shortPassing) - cheia.before;
    expect(ganhoParcial).toBeGreaterThanOrEqual(0);
    expect(ganhoParcial).toBeLessThanOrEqual(ganhoCheio);
    expect(ganhoCheio).toBeGreaterThan(0);
  });

  it("coletar sem sessão ativa falha", async () => {
    const players = new MemPlayers(aggregate());
    const r = await new CollectTrainingSession(uowOf(new MemSessions(), players)).execute({
      gameWorldId: WORLD, playerId: PLAYER, worldSeed: SEED, worldDate: "2026-03-08", rulesetVersion: RULESET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NO_ACTIVE_TRAINING_SESSION");
  });

  it("no teto do potencial, não passa (ganho aparado)", async () => {
    const players = new MemPlayers(aggregate({ currentAbility: 85, baselineAbility: 85 }));
    const sessions = new MemSessions();
    const uow = uowOf(sessions, players);
    await new StartTrainingSession(uow).execute({
      gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER, attributeCode: "shortPassing",
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    const before = players.agg.player.attributes.shortPassing;
    await new CollectTrainingSession(uow).execute({
      gameWorldId: WORLD, playerId: PLAYER, worldSeed: SEED, worldDate: "2026-03-08", rulesetVersion: RULESET,
    });
    const after = players.agg.player.attributes.shortPassing;
    expect(after).toBe(before); // sem headroom, sem ganho
  });
});

describe("SettleDueTrainingSessions — liberação na virada do dia (1 dia lógico)", () => {
  const base = {
    gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER,
    attributeCode: "shortPassing", worldSeed: SEED,
  } as const;

  it("NO MESMO dia a sessão NÃO é settlada — jogador segue indisponível", async () => {
    const players = new MemPlayers(aggregate());
    const sessions = new MemSessions();
    const uow = uowOf(sessions, players);
    await new StartTrainingSession(uow).execute({ ...base, worldDate: "2026-03-01" });
    const r = await new SettleDueTrainingSessions(uow).execute({
      gameWorldId: WORLD, worldSeed: SEED, worldDate: "2026-03-01", rulesetVersion: RULESET,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.settledCount).toBe(0);
    expect(sessions.current?.active).toBe(true);
    expect(players.agg.player.availability).toBe(PlayerAvailability.UNAVAILABLE);
  });

  it("NA VIRADA (dia seguinte) a sessão settla SOZINHA: ganho aplicado, jogador APTO, sessão fechada", async () => {
    const players = new MemPlayers(aggregate());
    const sessions = new MemSessions();
    const uow = uowOf(sessions, players);
    await new StartTrainingSession(uow).execute({ ...base, worldDate: "2026-03-01" });
    const before = players.agg.player.attributes.shortPassing as number;
    const r = await new SettleDueTrainingSessions(uow).execute({
      gameWorldId: WORLD, worldSeed: SEED, worldDate: "2026-03-02", rulesetVersion: RULESET,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.settledCount).toBe(1);
    expect(sessions.current?.active).toBe(false);
    expect(players.agg.player.availability).toBe(PlayerAvailability.AVAILABLE);
    expect(players.agg.player.attributes.shortPassing as number).toBeGreaterThan(before);
  });

  it("reavançar não settla de novo — a sessão já está inativa (idempotente)", async () => {
    const players = new MemPlayers(aggregate());
    const sessions = new MemSessions();
    const uow = uowOf(sessions, players);
    await new StartTrainingSession(uow).execute({ ...base, worldDate: "2026-03-01" });
    await new SettleDueTrainingSessions(uow).execute({
      gameWorldId: WORLD, worldSeed: SEED, worldDate: "2026-03-02", rulesetVersion: RULESET,
    });
    const again = await new SettleDueTrainingSessions(uow).execute({
      gameWorldId: WORLD, worldSeed: SEED, worldDate: "2026-03-03", rulesetVersion: RULESET,
    });
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.value.settledCount).toBe(0);
  });
});
