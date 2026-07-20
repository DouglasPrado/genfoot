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
import type { CohesionWriter } from "./train-formation-cohesion.js";

import { CollectGroupTrainingSession } from "./collect-group-training-session.js";
import { StartGroupTrainingSession } from "./start-group-training-session.js";
import type {
  GroupTrainingSessionRepositories,
  GroupTrainingSessionRepository,
  GroupTrainingSessionSnapshot,
  GroupTrainingSessionUnitOfWork,
} from "./group-training-session-types.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const CLUB = "019b76da-a800-7451-8ea2-7b2378e42053";
const SEED = "seed-grp";

function makeSnapshot(
  id: string,
  availability: PlayerAvailability,
): PlayerAggregateSnapshot {
  const attrs: Record<string, number | null> = {};
  for (const c of [...TECHNICAL_ATTRIBUTES, ...PHYSICAL_ATTRIBUTES, ...MENTAL_ATTRIBUTES]) attrs[c] = 50;
  for (const c of GOALKEEPING_ATTRIBUTES) attrs[c] = null;
  const player: PlayerLifecycleSnapshot = {
    id,
    gameWorldId: WORLD,
    personId: `${id}-p`,
    primaryPosition: PlayerPosition.CB,
    dominantFoot: DominantFoot.RIGHT,
    careerStatus: PlayerCareerStatus.ACTIVE,
    availability,
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
  } as PlayerLifecycleSnapshot;
  return {
    player,
    person: { id: `${id}-p`, gameWorldId: WORLD, firstName: "T", lastName: id, birthDate: "2004-01-01", nationality: "BR", version: 1 } as never,
  };
}

class MemPlayers implements PlayerRepository {
  public constructor(private readonly byId: Map<string, PlayerAggregateSnapshot>) {}
  public findPlayerById(_w: never, id: never): Promise<PlayerAggregateSnapshot | null> {
    return Promise.resolve(this.byId.get(id as unknown as string) ?? null);
  }
  public savePlayer(snapshot: PlayerAggregateSnapshot): Promise<void> {
    this.byId.set(snapshot.player.id, snapshot);
    return Promise.resolve();
  }
  public decayForma(): Promise<void> { return Promise.resolve(); }
  public nudgeClubForma(): Promise<void> { return Promise.resolve(); }
}

class MemGroupSessions implements GroupTrainingSessionRepository {
  public current: GroupTrainingSessionSnapshot | null = null;
  public findActiveByClub(): Promise<GroupTrainingSessionSnapshot | null> {
    return Promise.resolve(this.current?.active ? this.current : null);
  }
  public save(session: GroupTrainingSessionSnapshot): Promise<void> {
    this.current = session;
    return Promise.resolve();
  }
}

class MemCohesion implements CohesionWriter {
  public raises = 0;
  public raiseByFormationTraining(): Promise<void> {
    this.raises += 1;
    return Promise.resolve();
  }
}

function uowOf(
  sessions: MemGroupSessions,
  players: MemPlayers,
  cohesion: MemCohesion,
): GroupTrainingSessionUnitOfWork {
  const repos: GroupTrainingSessionRepositories = { sessions, players, cohesion };
  return { run: (work) => work(repos) };
}

const A = "019b76da-a800-7451-8ea2-7b2378e42101";
const B = "019b76da-a800-7451-8ea2-7b2378e42102";

describe("StartGroupTrainingSession", () => {
  it("inicia com participantes disponíveis, que ficam INDISPONÍVEIS", async () => {
    const players = new MemPlayers(new Map([
      [A, makeSnapshot(A, PlayerAvailability.AVAILABLE)],
      [B, makeSnapshot(B, PlayerAvailability.AVAILABLE)],
    ]));
    const sessions = new MemGroupSessions();
    const r = await new StartGroupTrainingSession(uowOf(sessions, players, new MemCohesion())).execute({
      gameWorldId: WORLD, clubId: CLUB, formation: "4-4-2", participantIds: [A, B],
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    expect(r.ok).toBe(true);
    expect(sessions.current?.active).toBe(true);
    expect(sessions.current?.participantIds).toEqual([A, B]);
  });

  it("RECUSA se um participante não está disponível (exclusão do individual)", async () => {
    const players = new MemPlayers(new Map([
      [A, makeSnapshot(A, PlayerAvailability.AVAILABLE)],
      // B já treina individualmente → indisponível.
      [B, makeSnapshot(B, PlayerAvailability.UNAVAILABLE)],
    ]));
    const sessions = new MemGroupSessions();
    const r = await new StartGroupTrainingSession(uowOf(sessions, players, new MemCohesion())).execute({
      gameWorldId: WORLD, clubId: CLUB, formation: "4-4-2", participantIds: [A, B],
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("PLAYER_NOT_AVAILABLE");
  });

  it("RECUSA sem participantes", async () => {
    const r = await new StartGroupTrainingSession(uowOf(new MemGroupSessions(), new MemPlayers(new Map()), new MemCohesion())).execute({
      gameWorldId: WORLD, clubId: CLUB, formation: "4-4-2", participantIds: [],
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("GROUP_TRAINING_NO_PARTICIPANTS");
  });

  it("RECUSA segunda sessão de grupo enquanto uma está ativa", async () => {
    const players = new MemPlayers(new Map([[A, makeSnapshot(A, PlayerAvailability.AVAILABLE)]]));
    const sessions = new MemGroupSessions();
    const uow = uowOf(sessions, players, new MemCohesion());
    await new StartGroupTrainingSession(uow).execute({
      gameWorldId: WORLD, clubId: CLUB, formation: "4-4-2", participantIds: [A],
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    const players2 = new MemPlayers(new Map([[B, makeSnapshot(B, PlayerAvailability.AVAILABLE)]]));
    const r2 = await new StartGroupTrainingSession(uowOf(sessions, players2, new MemCohesion())).execute({
      gameWorldId: WORLD, clubId: CLUB, formation: "4-3-3", participantIds: [B],
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error.code).toBe("GROUP_TRAINING_ALREADY_ACTIVE");
  });
});

describe("CollectGroupTrainingSession", () => {
  it("coleta, sobe a coesão e LIBERA os participantes", async () => {
    const players = new MemPlayers(new Map([
      [A, makeSnapshot(A, PlayerAvailability.AVAILABLE)],
      [B, makeSnapshot(B, PlayerAvailability.AVAILABLE)],
    ]));
    const sessions = new MemGroupSessions();
    const cohesion = new MemCohesion();
    const uow = uowOf(sessions, players, cohesion);
    await new StartGroupTrainingSession(uow).execute({
      gameWorldId: WORLD, clubId: CLUB, formation: "4-4-2", participantIds: [A, B],
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    const r = await new CollectGroupTrainingSession(uow).execute({
      gameWorldId: WORLD, clubId: CLUB, worldDate: "2026-03-05",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.participantCount).toBe(2);
    expect(cohesion.raises).toBe(1);
    expect(sessions.current?.active).toBe(false);
  });

  it("RECUSA coletar sem sessão ativa", async () => {
    const r = await new CollectGroupTrainingSession(uowOf(new MemGroupSessions(), new MemPlayers(new Map()), new MemCohesion())).execute({
      gameWorldId: WORLD, clubId: CLUB, worldDate: "2026-03-05",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NO_ACTIVE_GROUP_TRAINING");
  });

  it("RECUSA coletar no mesmo dia (ainda não rendeu)", async () => {
    const players = new MemPlayers(new Map([[A, makeSnapshot(A, PlayerAvailability.AVAILABLE)]]));
    const sessions = new MemGroupSessions();
    const uow = uowOf(sessions, players, new MemCohesion());
    await new StartGroupTrainingSession(uow).execute({
      gameWorldId: WORLD, clubId: CLUB, formation: "4-4-2", participantIds: [A],
      worldSeed: SEED, worldDate: "2026-03-01",
    });
    const r = await new CollectGroupTrainingSession(uow).execute({
      gameWorldId: WORLD, clubId: CLUB, worldDate: "2026-03-01",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("GROUP_TRAINING_TOO_EARLY");
  });
});
