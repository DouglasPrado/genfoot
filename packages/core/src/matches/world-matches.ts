import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import {
  simulateMatch,
  simulateUpTo,
  stableHash,
  type KernelCommand,
} from "./match-kernel.js";
import {
  MatchCommandSide,
  MatchStatus,
  type MatchCheckpointedEvent,
  type MatchCheckpointSnapshot,
  type MatchClubRef,
  type MatchCommandAcceptedEvent,
  type MatchCommandLogEntry,
  type MatchDomainEvent,
  type MatchFinishedEvent,
  type MatchFixtureRef,
  type MatchResult,
  type MatchResultOfficialEvent,
  type MatchRuntimeState,
  type MatchSnapshot,
  type MatchStartedEvent,
  type MatchSummary,
  type SimulationManifest,
  type WorldMatchesSnapshot,
} from "./match-types.js";

const COMMAND_MAX_DELTA = 8;

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
      const runtime = match.runtime;
      if (runtime !== undefined) {
        if (
          runtime.totalTicks !== match.manifest.timestepChances ||
          runtime.currentTick < 0 ||
          runtime.currentTick > runtime.totalTicks ||
          runtime.nextSequence < 1 ||
          !Number.isSafeInteger(runtime.rngCursor) ||
          runtime.rngCursor < 0
        ) {
          return fail(invalidMatches("Runtime de partida inválido."));
        }
      }
      const sequences = new Set<number>();
      for (const entry of match.commandLog ?? []) {
        if (
          sequences.has(entry.matchSequence) ||
          entry.tick < 0 ||
          entry.tick >= match.manifest.timestepChances ||
          Math.abs(entry.delta) > COMMAND_MAX_DELTA
        ) {
          return fail(invalidMatches("Command log de partida inválido."));
        }
        sequences.add(entry.matchSequence);
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
    const runtime: MatchRuntimeState = {
      currentTick: 0,
      totalTicks: match.manifest.timestepChances,
      homeGoals: 0,
      awayGoals: 0,
      homeShots: 0,
      awayShots: 0,
      rngCursor: 0,
      nextSequence: 1,
    };
    const started: MatchSnapshot = {
      ...match,
      status: MatchStatus.IN_PROGRESS,
      runtime,
      commandLog: [],
      checkpoints: [],
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
    const kernel = simulateMatch(
      match.id,
      match.manifest,
      toKernelCommands(match.commandLog),
    );
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

  public submitMatchCommand(
    input: Readonly<{
      matchId: string;
      actor: string;
      commandType: string;
      side: string;
      delta: number;
      payloadHash: string;
      expectedSequence: number;
      rulesetVersion: RulesetVersion;
      commandId: string;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<MatchCommandLogEntry, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("MatchCommandAccepted", input.idempotencyKey);
    if (replay !== undefined) {
      const match = this.state.matches.find(({ id }) => id === replay.matchId);
      const logged = match?.commandLog?.find(
        (entry) => entry.matchSequence === replay.matchSequence,
      );
      if (logged !== undefined) return succeed(logged);
    }
    const index = this.state.matches.findIndex(
      ({ id }) => id === input.matchId,
    );
    if (index < 0) return fail(matchNotFound(input.matchId));
    const match = this.state.matches[index]!;
    const runtime = match.runtime;
    if (match.status !== MatchStatus.IN_PROGRESS || runtime === undefined) {
      return fail(matchNotStarted(match.id));
    }
    if (
      input.side !== MatchCommandSide.HOME &&
      input.side !== MatchCommandSide.AWAY
    ) {
      return fail(invalidCommand("O lado do command deve ser HOME ou AWAY."));
    }
    if (
      !Number.isSafeInteger(input.delta) ||
      Math.abs(input.delta) > COMMAND_MAX_DELTA ||
      input.actor.trim() === "" ||
      input.commandType.trim() === "" ||
      input.payloadHash.trim() === "" ||
      input.commandId.trim() === ""
    ) {
      return fail(
        invalidCommand(
          "actor/commandType/payloadHash/commandId e delta (±8) devem ser válidos.",
        ),
      );
    }
    if (runtime.currentTick >= runtime.totalTicks) {
      return fail(
        new DomainError(
          "MATCH_COMMAND_OUT_OF_WINDOW",
          "A partida já esgotou os ticks; nenhum command é aceito.",
          { matchId: match.id, tick: runtime.currentTick },
        ),
      );
    }
    if (input.expectedSequence !== runtime.nextSequence) {
      return fail(
        input.expectedSequence < runtime.nextSequence
          ? new DomainError(
              "MATCH_COMMAND_STALE",
              "Sequência já consumida (command atrasado/duplicado).",
              { expected: runtime.nextSequence, received: input.expectedSequence },
            )
          : new DomainError(
              "MATCH_COMMAND_SEQUENCE_GAP",
              "Lacuna na sequência de commands.",
              { expected: runtime.nextSequence, received: input.expectedSequence },
            ),
      );
    }
    const lastForActor = [...(match.commandLog ?? [])]
      .reverse()
      .find((entry) => entry.actor === input.actor);
    if (lastForActor !== undefined && lastForActor.tick === runtime.currentTick) {
      return fail(
        new DomainError(
          "MATCH_COMMAND_COOLDOWN",
          "O actor já submeteu um command neste tick (cooldown).",
          { matchId: match.id, actor: input.actor, tick: runtime.currentTick },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const entry: MatchCommandLogEntry = {
      matchSequence: runtime.nextSequence,
      tick: runtime.currentTick,
      actor: input.actor,
      commandType: input.commandType,
      side: input.side,
      delta: input.delta,
      payloadHash: input.payloadHash,
      accepted: true,
      commandId: input.commandId,
      idempotencyKey: input.idempotencyKey,
    };
    const updated: MatchSnapshot = {
      ...match,
      commandLog: [...(match.commandLog ?? []), entry],
      runtime: { ...runtime, nextSequence: runtime.nextSequence + 1 },
      version: match.version + 1,
    };
    const matches = [...this.state.matches];
    matches[index] = updated;
    const event: MatchCommandAcceptedEvent = {
      id: deterministicUuidV7<"MatchEvent">({
        worldSeed: input.worldSeed,
        context: `match-command:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(date.value.toString()),
      }),
      type: "MatchCommandAccepted",
      gameWorldId: this.state.gameWorldId,
      matchId: match.id,
      matchSequence: entry.matchSequence,
      tick: entry.tick,
      actor: entry.actor,
      commandType: entry.commandType,
      payloadHash: entry.payloadHash,
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
    return succeed(entry);
  }

  public advanceMatchTicks(
    input: Readonly<{
      matchId: string;
      ticks: number;
      rulesetVersion: RulesetVersion;
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
    const runtime = match.runtime;
    if (match.status !== MatchStatus.IN_PROGRESS || runtime === undefined) {
      return fail(matchNotStarted(match.id));
    }
    if (!Number.isSafeInteger(input.ticks) || input.ticks < 1) {
      return fail(invalidCommand("O número de ticks deve ser inteiro ≥ 1."));
    }
    const nextTick = Math.min(
      runtime.currentTick + input.ticks,
      runtime.totalTicks,
    );
    if (nextTick === runtime.currentTick) return succeed(match);
    const progress = simulateUpTo(
      match.id,
      match.manifest,
      nextTick,
      toKernelCommands(match.commandLog),
    );
    const advanced: MatchSnapshot = {
      ...match,
      runtime: {
        ...runtime,
        currentTick: nextTick,
        homeGoals: progress.homeGoals,
        awayGoals: progress.awayGoals,
        homeShots: progress.homeShots,
        awayShots: progress.awayShots,
        rngCursor: progress.rngCursor,
      },
      version: match.version + 1,
    };
    const matches = [...this.state.matches];
    matches[index] = advanced;
    this.state = {
      ...this.state,
      matches,
      revision: this.state.revision + 1,
    };
    return succeed(advanced);
  }

  public checkpointMatch(
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
    if (this.findEvent("MatchCheckpointed", input.idempotencyKey) !== undefined) {
      const existing = this.state.matches.find(
        ({ id }) => id === input.matchId,
      );
      if (existing !== undefined) return succeed(existing);
    }
    const index = this.state.matches.findIndex(
      ({ id }) => id === input.matchId,
    );
    if (index < 0) return fail(matchNotFound(input.matchId));
    const match = this.state.matches[index]!;
    const runtime = match.runtime;
    if (match.status !== MatchStatus.IN_PROGRESS || runtime === undefined) {
      return fail(matchNotStarted(match.id));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const checkpoint: MatchCheckpointSnapshot = {
      tick: runtime.currentTick,
      stateHash: runtimeStateHash(match.id, runtime),
      rngCursor: runtime.rngCursor,
      commandSequence: runtime.nextSequence - 1,
      idempotencyKey: input.idempotencyKey,
    };
    const updated: MatchSnapshot = {
      ...match,
      checkpoints: [...(match.checkpoints ?? []), checkpoint],
      version: match.version + 1,
    };
    const matches = [...this.state.matches];
    matches[index] = updated;
    const event: MatchCheckpointedEvent = {
      id: deterministicUuidV7<"MatchEvent">({
        worldSeed: input.worldSeed,
        context: `match-checkpoint:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(date.value.toString()),
      }),
      type: "MatchCheckpointed",
      gameWorldId: this.state.gameWorldId,
      matchId: match.id,
      tick: checkpoint.tick,
      stateHash: checkpoint.stateHash,
      commandSequence: checkpoint.commandSequence,
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
    return succeed(updated);
  }

  public resumeMatch(
    input: Readonly<{
      matchId: string;
      checkpointTick: number;
      rulesetVersion: RulesetVersion;
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
    const runtime = match.runtime;
    if (match.status !== MatchStatus.IN_PROGRESS || runtime === undefined) {
      return fail(matchNotStarted(match.id));
    }
    const checkpoint = (match.checkpoints ?? []).find(
      ({ tick }) => tick === input.checkpointTick,
    );
    if (checkpoint === undefined) {
      return fail(
        new DomainError(
          "MATCH_CHECKPOINT_NOT_FOUND",
          "Nenhum checkpoint no tick informado.",
          { matchId: match.id, checkpointTick: input.checkpointTick },
        ),
      );
    }
    const progress = simulateUpTo(
      match.id,
      match.manifest,
      checkpoint.tick,
      toKernelCommands(match.commandLog),
    );
    const restored: MatchRuntimeState = {
      ...runtime,
      currentTick: checkpoint.tick,
      homeGoals: progress.homeGoals,
      awayGoals: progress.awayGoals,
      homeShots: progress.homeShots,
      awayShots: progress.awayShots,
      rngCursor: progress.rngCursor,
    };
    if (runtimeStateHash(match.id, restored) !== checkpoint.stateHash) {
      return fail(
        new DomainError(
          "MATCH_CHECKPOINT_INCOMPATIBLE",
          "O estado recomputado diverge do checkpoint (incompatível).",
          { matchId: match.id, checkpointTick: input.checkpointTick },
        ),
      );
    }
    if (
      runtime.currentTick === restored.currentTick &&
      runtime.rngCursor === restored.rngCursor
    ) {
      return succeed(match);
    }
    const resumed: MatchSnapshot = {
      ...match,
      runtime: restored,
      version: match.version + 1,
    };
    const matches = [...this.state.matches];
    matches[index] = resumed;
    this.state = {
      ...this.state,
      matches,
      revision: this.state.revision + 1,
    };
    return succeed(resumed);
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
    const kernel = simulateMatch(
      match.id,
      match.manifest,
      toKernelCommands(match.commandLog),
    );
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
      commandCount: this.state.matches.reduce(
        (total, match) => total + (match.commandLog?.length ?? 0),
        0,
      ),
      checkpointCount: this.state.matches.reduce(
        (total, match) => total + (match.checkpoints?.length ?? 0),
        0,
      ),
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

function matchNotStarted(matchId: string): DomainError {
  return new DomainError(
    "MATCH_NOT_STARTED",
    "A partida precisa estar em andamento para esta operação.",
    { matchId },
  );
}

function invalidCommand(message: string): DomainError {
  return new DomainError("INVALID_MATCH_COMMAND", message);
}

function runtimeStateHash(
  matchId: string,
  runtime: MatchRuntimeState,
): string {
  return stableHash(
    [
      matchId,
      runtime.currentTick,
      `${runtime.homeGoals}-${runtime.awayGoals}`,
      `${runtime.homeShots}-${runtime.awayShots}`,
      runtime.rngCursor,
    ].join("|"),
  );
}

function toKernelCommands(
  commandLog: readonly MatchCommandLogEntry[] | undefined,
): readonly KernelCommand[] {
  return (commandLog ?? []).map((entry) => ({
    tick: entry.tick,
    matchSequence: entry.matchSequence,
    side: entry.side,
    delta: entry.delta,
    payloadHash: entry.payloadHash,
  }));
}

function validStrength(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 100;
}

