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

import { LinkMentor, UnlinkMentor } from "./manage-mentorship.js";
import type {
  MentorshipLinkSnapshot,
  MentorshipRepository,
} from "./mentorship-types.js";
import {
  SettleDueMentorships,
  type MentorshipRepositories,
  type MentorshipUnitOfWork,
} from "./settle-due-mentorships.js";
import type { TrainingContextReader } from "./training-types.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const CLUB = "019b76da-a800-7451-8ea2-7b2378e420ff";
const MENTEE = "019b76da-a800-7451-8ea2-7b2378e42051";
const MENTOR = "019b76da-a800-7451-8ea2-7b2378e42052";
const RULESET = "1.0.0" as never;

class MemMentorships implements MentorshipRepository {
  public link: MentorshipLinkSnapshot | null = null;
  public removed = false;
  public findByMentee(): Promise<MentorshipLinkSnapshot | null> {
    return Promise.resolve(this.link);
  }
  public save(link: MentorshipLinkSnapshot): Promise<void> {
    this.link = link;
    return Promise.resolve();
  }
  public remove(): Promise<void> {
    this.removed = true;
    this.link = null;
    return Promise.resolve();
  }
  public findAllActive(): Promise<readonly MentorshipLinkSnapshot[]> {
    return Promise.resolve(this.link === null ? [] : [this.link]);
  }
}

class MemContext implements TrainingContextReader {
  public constructor(private readonly squad: readonly string[]) {}
  public squadPlayerIds(): Promise<readonly string[]> {
    return Promise.resolve(this.squad);
  }
  public medicallyRestrictedPlayerIds(): Promise<readonly string[]> {
    return Promise.resolve([]);
  }
  public trainingCapacity(): Promise<number> {
    return Promise.resolve(2);
  }
}

function link(
  repo: MentorshipRepository,
  ctx: TrainingContextReader,
  over: Partial<Parameters<LinkMentor["execute"]>[0]> = {},
) {
  return new LinkMentor(repo, ctx).execute({
    gameWorldId: WORLD, clubId: CLUB, menteeId: MENTEE, mentorId: MENTOR,
    worldSeed: "seed", occurredOn: "2026-03-02", expectedVersion: null, ...over,
  });
}

describe("LinkMentor / UnlinkMentor (M-MENTORING)", () => {
  it("vincula mentor↔pupilo quando ambos estão no elenco", async () => {
    const repo = new MemMentorships();
    const r = await link(repo, new MemContext([MENTEE, MENTOR]));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.link.mentorId).toBe(MENTOR);
  });

  it("mentor de si mesmo → MENTOR_INVALID", async () => {
    const r = await link(new MemMentorships(), new MemContext([MENTEE]), { mentorId: MENTEE });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("MENTOR_INVALID");
  });

  it("pupilo fora do elenco → PLAYER_NOT_IN_SQUAD", async () => {
    const r = await link(new MemMentorships(), new MemContext([MENTOR]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("PLAYER_NOT_IN_SQUAD");
  });

  it("mentor fora do elenco → MENTOR_INVALID", async () => {
    const r = await link(new MemMentorships(), new MemContext([MENTEE]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("MENTOR_INVALID");
  });

  it("desvincular é idempotente: sem mentor, sucesso sem erro", async () => {
    const repo = new MemMentorships();
    const r = await new UnlinkMentor(repo).execute({ gameWorldId: WORLD, clubId: CLUB, menteeId: MENTEE });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.removed).toBe(false);
  });

  it("desvincula um vínculo existente", async () => {
    const repo = new MemMentorships();
    repo.link = { id: "l", gameWorldId: WORLD, clubId: CLUB, menteeId: MENTEE, mentorId: MENTOR, version: 1 };
    const r = await new UnlinkMentor(repo).execute({ gameWorldId: WORLD, clubId: CLUB, menteeId: MENTEE });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.removed).toBe(true);
    expect(repo.removed).toBe(true);
  });
});

function aggregate(
  availability: PlayerAvailability = PlayerAvailability.AVAILABLE,
): PlayerAggregateSnapshot {
  const attrs: Record<string, number | null> = {};
  for (const c of [...TECHNICAL_ATTRIBUTES, ...PHYSICAL_ATTRIBUTES, ...MENTAL_ATTRIBUTES]) attrs[c] = 50;
  for (const c of GOALKEEPING_ATTRIBUTES) attrs[c] = null;
  attrs.finishing = 30;
  const player: PlayerLifecycleSnapshot = {
    id: MENTEE, gameWorldId: WORLD, personId: `${MENTEE}-p`,
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
    person: { id: `${MENTEE}-p`, gameWorldId: WORLD, firstName: "T", lastName: "Este", birthDate: "2006-01-01", nationality: "BR", version: 1 } as never,
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

function settleUow(mentorships: MentorshipRepository, players: PlayerRepository): MentorshipUnitOfWork {
  const repos: MentorshipRepositories = { mentorships, players };
  return { run: (work) => work(repos) };
}

describe("SettleDueMentorships (evolução acelerada)", () => {
  it("pupilo apto ganha +1 na recomendada mais fraca da posição", async () => {
    const mentorships = new MemMentorships();
    mentorships.link = { id: "l", gameWorldId: WORLD, clubId: CLUB, menteeId: MENTEE, mentorId: MENTOR, version: 1 };
    const players = new MemPlayers(aggregate());
    const r = await new SettleDueMentorships(settleUow(mentorships, players)).execute({
      gameWorldId: WORLD, worldSeed: "seed", worldDate: "2026-03-02", rulesetVersion: RULESET,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.acceleratedCount).toBe(1);
    // finishing (recomendada e mais fraca do ST) subiu +1.
    if (recommendedAttributes("ST").includes("finishing")) {
      expect(players.agg.player.attributes.finishing).toBe(31);
    }
  });

  it("pupilo NÃO apto é pulado", async () => {
    const mentorships = new MemMentorships();
    mentorships.link = { id: "l", gameWorldId: WORLD, clubId: CLUB, menteeId: MENTEE, mentorId: MENTOR, version: 1 };
    const players = new MemPlayers(aggregate(PlayerAvailability.INJURED));
    const r = await new SettleDueMentorships(settleUow(mentorships, players)).execute({
      gameWorldId: WORLD, worldSeed: "seed", worldDate: "2026-03-02", rulesetVersion: RULESET,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.acceleratedCount).toBe(0);
    expect(players.agg.player.attributes.finishing).toBe(30);
  });
});
