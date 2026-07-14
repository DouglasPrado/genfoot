import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import { simulateMatch, stableHash } from "./match-kernel.js";
import {
  MatchStatus,
  type MatchClubRef,
  type MatchDomainEvent,
  type MatchFinishedEvent,
  type MatchFixtureRef,
  type MatchResult,
  type MatchResultOfficialEvent,
  type MatchSnapshot,
  type MatchStartedEvent,
  type MatchSummary,
  type SimulationManifest,
  type WorldMatchesSnapshot,
} from "./match-types.js";

export interface MatchReplayOutcome {
  readonly deterministic: boolean;
  readonly resultHash: string;
  readonly statsHash: string;
}

export class WorldMatches {
  private constructor(private state: WorldMatchesSnapshot) {}

  public static initialize(
    world: GameWorldSnapshot,
  ): Result<WorldMatches, DomainError> {
    return WorldMatches.fromSnapshot({
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      matches: [],
      events: [],
      revision: 1,
    });
  }

  public static fromSnapshot(
    snapshot: WorldMatchesSnapshot,
  ): Result<WorldMatches, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidMatches("A revisão de partidas é inválida."));
    }
    const matchIds = new Set<string>();
    for (const match of snapshot.matches) {
      if (
        match.gameWorldId !== snapshot.gameWorldId ||
        match.homeClubId === match.awayClubId ||
        !validStrength(match.manifest.homeStrength) ||
        !validStrength(match.manifest.awayStrength) ||
        match.manifest.timestepChances < 1 ||
        matchIds.has(match.id) ||
        !Number.isSafeInteger(match.version) ||
        match.version < 1
      ) {
        return fail(invalidMatches("Partida inválida."));
      }
      matchIds.add(match.id);
    }
    for (const event of snapshot.events) {
      if (
        event.gameWorldId !== snapshot.gameWorldId ||
        !matchIds.has(event.matchId)
      ) {
        return fail(invalidMatches("Evento de partida inválido."));
      }
    }
    return succeed(new WorldMatches(snapshot));
  }

  public createMatchManifest(
    input: Readonly<{
      fixtureRef: MatchFixtureRef;
      homeClubId: MatchClubRef;
      awayClubId: MatchClubRef;
      kickoffOn: string;
      seed: string;
      engineBuild: string;
      timestepChances: number;
      homeStrength: number;
      awayStrength: number;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Result<MatchSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.matches.find(
      (match) => match.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (
      input.homeClubId === input.awayClubId ||
      !validStrength(input.homeStrength) ||
      !validStrength(input.awayStrength) ||
      !Number.isSafeInteger(input.timestepChances) ||
      input.timestepChances < 1 ||
      input.timestepChances > 500 ||
      input.seed.trim() === "" ||
      input.engineBuild.trim() === ""
    ) {
      return fail(
        new DomainError(
          "INVALID_MATCH_MANIFEST",
          "Times, forças (0-100), timestep e seed/engine devem ser válidos.",
        ),
      );
    }
    const kickoff = WorldDate.parse(input.kickoffOn);
    if (!kickoff.ok) return kickoff;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const matchId = deterministicUuidV7<"Match">({
      worldSeed: input.worldSeed,
      context: `match:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(kickoff.value.toString()),
    });
    const inputHash = stableHash(
      [
        matchId,
        input.fixtureRef,
        input.homeClubId,
        input.awayClubId,
        input.homeStrength,
        input.awayStrength,
        input.seed,
        input.engineBuild,
        input.timestepChances,
      ].join("|"),
    );
    const manifest: SimulationManifest = {
      seed: input.seed,
      engineBuild: input.engineBuild,
      timestepChances: input.timestepChances,
      homeStrength: input.homeStrength,
      awayStrength: input.awayStrength,
      inputHash,
    };
    const match: MatchSnapshot = {
      id: matchId,
      gameWorldId: this.state.gameWorldId,
      fixtureRef: input.fixtureRef,
      homeClubId: input.homeClubId,
      awayClubId: input.awayClubId,
      kickoffOn: kickoff.value.toString(),
      status: MatchStatus.CREATED,
      manifest,
      result: null,
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    this.state = {
      ...this.state,
      matches: [...this.state.matches, match],
      revision: this.state.revision + 1,
    };
    return succeed(match);
  }

  public startMatch(
    input: Readonly<{
      matchId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<MatchSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("MatchStarted", input.idempotencyKey);
    if (replay !== undefined) {
      const started = this.state.matches.find(({ id }) => id === replay.matchId);
      if (started !== undefined) return succeed(started);
    }
    const index = this.state.matches.findIndex(
      ({ id }) => id === input.matchId,
    );
    if (index < 0) return fail(matchNotFound(input.matchId));
    const match = this.state.matches[index]!;
    if (match.status !== MatchStatus.CREATED) {
      return fail(
        new DomainError(
          "MATCH_ALREADY_STARTED",
          "A partida já foi iniciada ou finalizada.",
          { matchId: match.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const started: MatchSnapshot = {
      ...match,
      status: MatchStatus.IN_PROGRESS,
      version: match.version + 1,
    };
    const matches = [...this.state.matches];
    matches[index] = started;
    const event: MatchStartedEvent = {
      id: deterministicUuidV7<"MatchEvent">({
        worldSeed: input.worldSeed,
        context: `match-started:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(date.value.toString()),
      }),
      type: "MatchStarted",
      gameWorldId: this.state.gameWorldId,
      matchId: match.id,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      matches,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(started);
  }

  public finalizeMatch(
    input: Readonly<{
      matchId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<MatchSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.matches.findIndex(
      ({ id }) => id === input.matchId,
    );
    if (index < 0) return fail(matchNotFound(input.matchId));
    const match = this.state.matches[index]!;
    if (match.status === MatchStatus.FINAL) {
      return succeed(match);
    }
    if (match.status !== MatchStatus.IN_PROGRESS) {
      return fail(
        new DomainError(
          "MATCH_NOT_STARTED",
          "Somente partidas em andamento podem ser finalizadas.",
          { matchId: match.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const kernel = simulateMatch(match.id, match.manifest);
    const result: MatchResult = {
      homeGoals: kernel.homeGoals,
      awayGoals: kernel.awayGoals,
      homeShots: kernel.homeShots,
      awayShots: kernel.awayShots,
      homePossession: kernel.homePossession,
      resultHash: kernel.resultHash,
      statsHash: kernel.statsHash,
      finalizedOn: date.value.toString(),
    };
    const finalized: MatchSnapshot = {
      ...match,
      status: MatchStatus.FINAL,
      result,
      version: match.version + 1,
    };
    const matches = [...this.state.matches];
    matches[index] = finalized;
    const finishedEvent: MatchFinishedEvent = {
      id: deterministicUuidV7<"MatchEvent">({
        worldSeed: input.worldSeed,
        context: `match-finished:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(date.value.toString()),
      }),
      type: "MatchFinished",
      gameWorldId: this.state.gameWorldId,
      matchId: match.id,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    const officialEvent: MatchResultOfficialEvent = {
      id: deterministicUuidV7<"MatchEvent">({
        worldSeed: input.worldSeed,
        context: `match-result-official:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(date.value.toString()),
      }),
      type: "MatchResultOfficial",
      gameWorldId: this.state.gameWorldId,
      matchId: match.id,
      fixtureRef: match.fixtureRef,
      resultHash: result.resultHash,
      statsHash: result.statsHash,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      matches,
      events: [...this.state.events, finishedEvent, officialEvent],
      revision: this.state.revision + 1,
    };
    return succeed(finalized);
  }

  public replayMatch(matchId: string): Result<MatchReplayOutcome, DomainError> {
    const match = this.state.matches.find(({ id }) => id === matchId);
    if (match === undefined) return fail(matchNotFound(matchId));
    if (match.status !== MatchStatus.FINAL || match.result === null) {
      return fail(
        new DomainError(
          "MATCH_NOT_FINAL",
          "Apenas partidas finalizadas podem ser reprocessadas.",
          { matchId },
        ),
      );
    }
    const kernel = simulateMatch(match.id, match.manifest);
    return succeed({
      deterministic:
        kernel.resultHash === match.result.resultHash &&
        kernel.statsHash === match.result.statsHash,
      resultHash: kernel.resultHash,
      statsHash: kernel.statsHash,
    });
  }

  public findMatch(matchId: string): MatchSnapshot | null {
    return this.state.matches.find(({ id }) => id === matchId) ?? null;
  }

  public summary(): MatchSummary {
    return {
      matchCount: this.state.matches.length,
      finalCount: this.state.matches.filter(
        ({ status }) => status === MatchStatus.FINAL,
      ).length,
      eventCount: this.state.events.length,
    };
  }

  public snapshot(): WorldMatchesSnapshot {
    return this.state;
  }

  private findEvent<T extends MatchDomainEvent["type"]>(
    type: T,
    idempotencyKey: string,
  ): Extract<MatchDomainEvent, { type: T }> | undefined {
    return this.state.events.find(
      (event): event is Extract<MatchDomainEvent, { type: T }> =>
        event.type === type && event.idempotencyKey === idempotencyKey,
    );
  }
}

function invalidMatches(message: string): DomainError {
  return new DomainError("INVALID_MATCH_STATE", message);
}

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente das partidas.",
  );
}

function matchNotFound(matchId: string): DomainError {
  return new DomainError("MATCH_NOT_FOUND", "Partida não encontrada.", {
    matchId,
  });
}

function validStrength(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 100;
}

function timestampOf(worldDate: string): number {
  return Date.parse(`${worldDate}T00:00:00.000Z`);
}
