import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GameWorldSnapshot } from "../world/world-types.js";
import type { NarrativeRepository } from "./narrative-repository.js";
import type {
  ClubFanbaseSnapshot,
  MatchOutcome,
  MediaStorySnapshot,
  NarrativeClubRef,
  NarrativeCrisisSnapshot,
  NarrativePromiseSnapshot,
  NarrativeSummary,
  WorldNarrativeSnapshot,
} from "./narrative-types.js";
import { WorldNarrative } from "./world-narrative.js";

async function loadNarrative(
  repository: NarrativeRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldNarrative, DomainError>> {
  const snapshot = await repository.findNarrativeByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "NARRATIVE_NOT_FOUND",
        "A narrativa do mundo ainda não foi inicializada.",
        { gameWorldId },
      ),
    );
  }
  return WorldNarrative.fromSnapshot(snapshot);
}

async function mutate<T>(
  repository: NarrativeRepository,
  gameWorldId: GameWorldId,
  apply: (narrative: WorldNarrative) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadNarrative(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.saveNarrative(loaded.value.snapshot(), expectedRevision);
  }
  return result;
}

export class InitializeNarrative {
  public constructor(private readonly repository: NarrativeRepository) {}

  public async execute(
    world: GameWorldSnapshot,
  ): Promise<Result<WorldNarrativeSnapshot, DomainError>> {
    const existing = await this.repository.findNarrativeByWorldId(world.id);
    if (existing !== null) {
      const validated = WorldNarrative.fromSnapshot(existing);
      return validated.ok ? succeed(validated.value.snapshot()) : validated;
    }
    const created = WorldNarrative.initialize(world);
    if (!created.ok) return created;
    await this.repository.saveNarrative(created.value.snapshot(), null);
    return succeed(created.value.snapshot());
  }
}

export class ApplyNarrativeFact {
  public constructor(private readonly repository: NarrativeRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      factId: string;
      clubId: NarrativeClubRef;
      outcome: MatchOutcome;
      expected: MatchOutcome;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<ClubFanbaseSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (narrative) =>
      narrative.applyMatchFact(input),
    );
  }
}

export class ApplyNarrativeRebrandFact {
  public constructor(private readonly repository: NarrativeRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      factId: string;
      clubId: NarrativeClubRef;
      baseSize: number;
      changedFields?: readonly string[];
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<ClubFanbaseSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (narrative) =>
      narrative.applyRebrandFact(input),
    );
  }
}

export class MakePublicPromise {
  public constructor(private readonly repository: NarrativeRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      clubId: NarrativeClubRef;
      metric: string;
      targetValue: number;
      deadline: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NarrativePromiseSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (narrative) =>
      narrative.makePublicPromise(input),
    );
  }
}

export class EvaluatePromise {
  public constructor(private readonly repository: NarrativeRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      promiseId: string;
      achievedValue: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NarrativePromiseSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (narrative) =>
      narrative.evaluatePromise(input),
    );
  }
}

export class OpenNarrativeCrisis {
  public constructor(private readonly repository: NarrativeRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      clubId: NarrativeClubRef;
      cause: string;
      severity: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NarrativeCrisisSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (narrative) =>
      narrative.openCrisis(input),
    );
  }
}

export class SubmitRecoveryPlan {
  public constructor(private readonly repository: NarrativeRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      crisisId: string;
      plan: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NarrativeCrisisSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (narrative) =>
      narrative.submitRecoveryPlan(input),
    );
  }
}

export class ResolveNarrativeCrisis {
  public constructor(private readonly repository: NarrativeRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      crisisId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NarrativeCrisisSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (narrative) =>
      narrative.resolveCrisis(input),
    );
  }
}

export class ChooseConversationOption {
  public constructor(private readonly repository: NarrativeRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      clubId: NarrativeClubRef;
      context: string;
      options: readonly string[];
      choice: string;
      frame: string;
      factRefs: readonly string[];
      visibility?: string;
      reputationEffect?: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<MediaStorySnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (narrative) =>
      narrative.chooseConversationOption(input),
    );
  }
}

export class CancelPromise {
  public constructor(private readonly repository: NarrativeRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      promiseId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NarrativePromiseSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (narrative) =>
      narrative.cancelPromise(input),
    );
  }
}

export class InspectNarrative {
  public constructor(private readonly repository: NarrativeRepository) {}

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<NarrativeSummary, DomainError>> {
    const loaded = await loadNarrative(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }

  public async world(
    gameWorldId: GameWorldId,
  ): Promise<Result<WorldNarrativeSnapshot, DomainError>> {
    const loaded = await loadNarrative(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.snapshot()) : loaded;
  }
}
