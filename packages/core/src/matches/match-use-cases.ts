import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GameWorldSnapshot } from "../world/world-types.js";
import type { WorldCompetitionsSnapshot } from "../competitions/competition-types.js";
import type { MatchRepository } from "./match-repository.js";
import type {
  MatchClubRef,
  MatchCommandLogEntry,
  MatchFixtureRef,
  MatchSnapshot,
  MatchSummary,
  WorldMatchesSnapshot,
} from "./match-types.js";
import { WorldMatches } from "./world-matches.js";

async function loadMatches(
  repository: MatchRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldMatches, DomainError>> {
  const snapshot = await repository.findMatchesByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "MATCHES_NOT_FOUND",
        "As partidas do mundo ainda não foram inicializadas.",
        { gameWorldId },
      ),
    );
  }
  return WorldMatches.fromSnapshot(snapshot);
}

async function mutate<T>(
  repository: MatchRepository,
  gameWorldId: GameWorldId,
  apply: (matches: WorldMatches) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadMatches(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.saveMatches(loaded.value.snapshot(), expectedRevision);
  }
  return result;
}

export class InitializeMatches {
  public constructor(private readonly repository: MatchRepository) {}

  public async execute(
    world: GameWorldSnapshot,
    competitions?: WorldCompetitionsSnapshot,
  ): Promise<Result<WorldMatchesSnapshot, DomainError>> {
    const existing = await this.repository.findMatchesByWorldId(world.id);
    const loaded =
      existing === null
        ? WorldMatches.initialize(world)
        : WorldMatches.fromSnapshot(existing);
    if (!loaded.ok) return loaded;

    if (competitions !== undefined) {
      for (const fixture of competitions.fixtures) {
        const created = loaded.value.createMatchManifest({
          fixtureRef: fixture.id,
          homeClubId: fixture.homeClubId,
          awayClubId: fixture.awayClubId,
          kickoffOn: fixture.kickoffOn,
          seed: `${world.seed}:fixture:${fixture.id}`,
          engineBuild: "kernel@1",
          timestepChances: 90,
          homeStrength: 60,
          awayStrength: 60,
          worldDate: world.currentDate,
          rulesetVersion: world.rulesetVersion,
          idempotencyKey: `competition-fixture:${fixture.id}`,
          worldSeed: world.seed,
        });
        if (!created.ok) return created;
      }
    }

    const snapshot = loaded.value.snapshot();
    if (existing === null || snapshot.revision !== existing.revision) {
      await this.repository.saveMatches(snapshot, existing?.revision ?? null);
    }
    return succeed(snapshot);
  }
}

export class CreateMatchManifest {
  public constructor(private readonly repository: MatchRepository) {}

  public execute(
    gameWorldId: GameWorldId,
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
  ): Promise<Result<MatchSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (matches) =>
      matches.createMatchManifest(input),
    );
  }
}

export class StartMatch {
  public constructor(private readonly repository: MatchRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      matchId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<MatchSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (matches) =>
      matches.startMatch(input),
    );
  }
}

export class FinalizeMatch {
  public constructor(private readonly repository: MatchRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      matchId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<MatchSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (matches) =>
      matches.finalizeMatch(input),
    );
  }
}

export class SubmitMatchCommand {
  public constructor(private readonly repository: MatchRepository) {}

  public execute(
    gameWorldId: GameWorldId,
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
  ): Promise<Result<MatchCommandLogEntry, DomainError>> {
    return mutate(this.repository, gameWorldId, (matches) =>
      matches.submitMatchCommand(input),
    );
  }
}

export class AdvanceMatchTicks {
  public constructor(private readonly repository: MatchRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      matchId: string;
      ticks: number;
      rulesetVersion: RulesetVersion;
    }>,
  ): Promise<Result<MatchSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (matches) =>
      matches.advanceMatchTicks(input),
    );
  }
}

export class CheckpointMatch {
  public constructor(private readonly repository: MatchRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      matchId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<MatchSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (matches) =>
      matches.checkpointMatch(input),
    );
  }
}

export class ResumeMatch {
  public constructor(private readonly repository: MatchRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      matchId: string;
      checkpointTick: number;
      rulesetVersion: RulesetVersion;
    }>,
  ): Promise<Result<MatchSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (matches) =>
      matches.resumeMatch(input),
    );
  }
}

export class InspectMatches {
  public constructor(private readonly repository: MatchRepository) {}

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<MatchSummary, DomainError>> {
    const loaded = await loadMatches(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }

  public async world(
    gameWorldId: GameWorldId,
  ): Promise<Result<WorldMatchesSnapshot, DomainError>> {
    const loaded = await loadMatches(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.snapshot()) : loaded;
  }
}
