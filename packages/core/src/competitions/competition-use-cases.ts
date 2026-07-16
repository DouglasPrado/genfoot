import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import type { CompetitionRepository } from "./competition-repository.js";
import type {
  CompetitionClubRef,
  CompetitionEditionSnapshot,
  CompetitionFixtureSnapshot,
  CompetitionHomologationSnapshot,
  CompetitionParticipantSnapshot,
  CompetitionSeasonRef,
  CompetitionSummary,
  StandingEntrySnapshot,
  WorldCompetitionsSnapshot,
} from "./competition-types.js";
import { WorldCompetitions } from "./world-competitions.js";

async function loadCompetitions(
  repository: CompetitionRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldCompetitions, DomainError>> {
  const snapshot = await repository.findCompetitionsByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "COMPETITIONS_NOT_FOUND",
        "As competições do mundo ainda não foram inicializadas.",
        { gameWorldId },
      ),
    );
  }
  return WorldCompetitions.fromSnapshot(snapshot);
}

async function mutate<T>(
  repository: CompetitionRepository,
  gameWorldId: GameWorldId,
  apply: (competitions: WorldCompetitions) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadCompetitions(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.saveCompetitions(
      loaded.value.snapshot(),
      expectedRevision,
    );
  }
  return result;
}

export class InitializeCompetitions {
  public constructor(private readonly repository: CompetitionRepository) {}

  public async execute(
    world: GameWorldSnapshot,
    genesis?: WorldGenesisSnapshot,
  ): Promise<Result<WorldCompetitionsSnapshot, DomainError>> {
    const existing = await this.repository.findCompetitionsByWorldId(world.id);
    const loaded =
      existing === null
        ? WorldCompetitions.initialize(world)
        : WorldCompetitions.fromSnapshot(existing);
    if (!loaded.ok) return loaded;
    const competitions = loaded.value;
    const expectedRevision = existing?.revision ?? null;

    if (
      genesis !== undefined &&
      competitions.snapshot().editions.length === 0
    ) {
      if (genesis.gameWorldId !== world.id) {
        return fail(
          new DomainError(
            "COMPETITIONS_GENESIS_WORLD_MISMATCH",
            "As competições e a gênese pertencem a mundos diferentes.",
          ),
        );
      }
      const start = WorldDate.parse(world.startDate);
      if (!start.ok) return start;
      const seasonRef = deterministicUuidV7<"Season">({
        worldSeed: world.seed,
        context: `${world.id}:season:1`,
        timestampMilliseconds: Date.parse(`${world.startDate}T00:00:00.000Z`),
      });
      const edition = competitions.createCompetitionEdition({
        seasonRef,
        name: genesis.competition.name,
        formatVersion: "league-double-round-robin@1",
        maxParticipants: genesis.clubs.length,
        startOn: start.value.addDays(7).toString(),
        roundIntervalDays: 3,
        worldDate: world.startDate,
        rulesetVersion: world.rulesetVersion,
        idempotencyKey: "genesis:initial-league",
        worldSeed: world.seed,
      });
      if (!edition.ok) return edition;
      for (const club of genesis.clubs) {
        const registered = competitions.registerParticipant({
          editionId: edition.value.id,
          clubId: club.id,
          rulesetVersion: world.rulesetVersion,
          idempotencyKey: `genesis:initial-league:club:${club.id}`,
          worldSeed: world.seed,
          worldDate: world.startDate,
        });
        if (!registered.ok) return registered;
      }
      const fixtures = competitions.generateFixtures({
        editionId: edition.value.id,
        rulesetVersion: world.rulesetVersion,
        idempotencyKey: "genesis:initial-league:fixtures",
        worldSeed: world.seed,
        worldDate: world.startDate,
      });
      if (!fixtures.ok) return fixtures;
    }

    if (
      expectedRevision === null ||
      competitions.snapshot().revision !== expectedRevision
    ) {
      await this.repository.saveCompetitions(
        competitions.snapshot(),
        expectedRevision,
      );
    }
    return succeed(competitions.snapshot());
  }
}

export class CreateCompetitionEdition {
  public constructor(private readonly repository: CompetitionRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      seasonRef: CompetitionSeasonRef;
      name: string;
      formatVersion: string;
      maxParticipants: number;
      startOn: string;
      roundIntervalDays: number;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Promise<Result<CompetitionEditionSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (competitions) =>
      competitions.createCompetitionEdition(input),
    );
  }
}

export class RegisterParticipant {
  public constructor(private readonly repository: CompetitionRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      editionId: string;
      clubId: CompetitionClubRef;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<CompetitionParticipantSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (competitions) =>
      competitions.registerParticipant(input),
    );
  }
}

export class GenerateFixtures {
  public constructor(private readonly repository: CompetitionRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      editionId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<readonly CompetitionFixtureSnapshot[], DomainError>> {
    return mutate(this.repository, gameWorldId, (competitions) =>
      competitions.generateFixtures(input),
    );
  }
}

export class RecordOfficialResult {
  public constructor(private readonly repository: CompetitionRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      fixtureId: string;
      matchRef: string;
      homeGoals: number;
      awayGoals: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<CompetitionFixtureSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (competitions) =>
      competitions.recordOfficialResult(input),
    );
  }
}

export class ApplyDiscipline {
  public constructor(private readonly repository: CompetitionRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      editionId: string;
      clubId: CompetitionClubRef;
      disciplinaryPoints: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<StandingEntrySnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (competitions) =>
      competitions.applyDiscipline(input),
    );
  }
}

export class HomologateCompetition {
  public constructor(private readonly repository: CompetitionRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      editionId: string;
      decidedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<CompetitionHomologationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (competitions) =>
      competitions.homologateCompetition(input),
    );
  }
}

export class InspectCompetitions {
  public constructor(private readonly repository: CompetitionRepository) {}

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<CompetitionSummary, DomainError>> {
    const loaded = await loadCompetitions(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }

  public async world(
    gameWorldId: GameWorldId,
  ): Promise<Result<WorldCompetitionsSnapshot, DomainError>> {
    const loaded = await loadCompetitions(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.snapshot()) : loaded;
  }
}
