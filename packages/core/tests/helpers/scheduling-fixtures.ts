import {
  DomainError,
  WorldDate,
  newEntityId,
  newGameWorldId,
  parseRulesetVersion,
  type GameWorldId,
  type RulesetVersion,
} from "@grinta/shared";

import {
  SEASON_ROLLOVER_STEPS,
  TemporalWindowType,
  WorldStatus,
  type GameWorldSnapshot,
  type SchedulingRepository,
  type SeasonRolloverStepHandler,
  type SeasonRolloverSnapshot,
  type TemporalWindowSnapshot,
  type WorldRepository,
  type WorldSchedulerSnapshot,
} from "../../src/index.js";

export class MemoryWorldSchedulingRepository
  implements WorldRepository, SchedulingRepository
{
  public worlds = new Map<GameWorldId, GameWorldSnapshot>();
  public schedulers = new Map<GameWorldId, WorldSchedulerSnapshot>();

  public findById(id: GameWorldId): Promise<GameWorldSnapshot | null> {
    return Promise.resolve(structuredClone(this.worlds.get(id) ?? null));
  }

  public save(
    snapshot: GameWorldSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const current = this.worlds.get(snapshot.id);
    if (
      (expectedVersion === null && current !== undefined) ||
      (expectedVersion !== null && current?.version !== expectedVersion)
    ) {
      throw new DomainError("AGGREGATE_VERSION_CONFLICT", "Conflito.");
    }
    this.worlds.set(snapshot.id, structuredClone(snapshot));
    return Promise.resolve();
  }

  public findSchedulingByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldSchedulerSnapshot | null> {
    return Promise.resolve(
      structuredClone(this.schedulers.get(gameWorldId) ?? null),
    );
  }

  public saveScheduling(
    snapshot: WorldSchedulerSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    const current = this.schedulers.get(snapshot.gameWorldId);
    if (
      (expectedRevision === null && current !== undefined) ||
      (expectedRevision !== null && current?.revision !== expectedRevision)
    ) {
      throw new DomainError("SCHEDULER_REVISION_CONFLICT", "Conflito.");
    }
    this.schedulers.set(snapshot.gameWorldId, structuredClone(snapshot));
    return Promise.resolve();
  }
}

export function activeWorldSnapshot(
  id: GameWorldId,
  currentDate = "2026-01-01",
): GameWorldSnapshot {
  return {
    id,
    seed: "bc-002-test",
    startDate: "2026-01-01",
    currentDate,
    rulesetVersion: schedulingRuleset(),
    status: WorldStatus.ACTIVE,
    worldSequence: 2,
    version: 3,
  };
}

export function schedulingRuleset(value = "1.0.0"): RulesetVersion {
  const parsed = parseRulesetVersion(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

export function schedulingDate(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

export function schedulingWorldId(): GameWorldId {
  return newGameWorldId();
}

export function temporalWindowFixture(
  gameWorldId: GameWorldId,
  overrides: Partial<TemporalWindowSnapshot> = {},
): TemporalWindowSnapshot {
  return {
    id: newEntityId<"TemporalWindow">(),
    gameWorldId,
    type: TemporalWindowType.TRANSFER,
    name: "Janela principal",
    opensOn: "2026-01-01",
    closesOn: "2026-01-03",
    rulesetVersion: schedulingRuleset(),
    configVersion: 1,
    version: 1,
    ...overrides,
  };
}

export function successfulRolloverHandlers(
  calls: string[] = [],
): Readonly<Record<string, SeasonRolloverStepHandler>> {
  return Object.fromEntries(
    SEASON_ROLLOVER_STEPS.map((stepId) => [
      stepId,
      (context) => {
        calls.push(context.idempotencyKey);
        return Promise.resolve({ status: "COMPLETED" as const });
      },
    ]),
  );
}

export function seasonRolloverFixture(
  gameWorldId: GameWorldId,
  overrides: Partial<SeasonRolloverSnapshot> = {},
): Omit<
  SeasonRolloverSnapshot,
  | "status"
  | "phase"
  | "currentStepIndex"
  | "steps"
  | "leaseOwnerId"
  | "leaseExpiresAtMs"
  | "fencingToken"
  | "verification"
  | "revision"
> {
  return {
    id: newEntityId<"SeasonRollover">(),
    gameWorldId,
    seasonId: newEntityId<"Season">(),
    nextSeason: {
      id: newEntityId<"Season">(),
      number: 2,
      name: "Temporada 2",
      startsOn: "2026-04-15",
      endsOn: "2026-07-15",
    },
    rulesetVersion: schedulingRuleset(),
    maxAttemptsPerStep: 3,
    ...overrides,
  };
}
