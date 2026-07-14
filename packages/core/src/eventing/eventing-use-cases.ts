import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GameWorldSnapshot } from "../world/world-types.js";
import type { EventingRepository } from "./eventing-repository.js";
import type {
  EventingSummary,
  InboxRecordSnapshot,
  OutboxMessageSnapshot,
  WorldEventingSnapshot,
} from "./eventing-types.js";
import { WorldEventing } from "./world-eventing.js";

async function loadEventing(
  repository: EventingRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldEventing, DomainError>> {
  const snapshot = await repository.findEventingByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "EVENTING_NOT_FOUND",
        "O eventing do mundo ainda não foi inicializado.",
        { gameWorldId },
      ),
    );
  }
  return WorldEventing.fromSnapshot(snapshot);
}

async function mutate<T>(
  repository: EventingRepository,
  gameWorldId: GameWorldId,
  apply: (eventing: WorldEventing) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadEventing(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.saveEventing(loaded.value.snapshot(), expectedRevision);
  }
  return result;
}

export class InitializeEventing {
  public constructor(private readonly repository: EventingRepository) {}

  public async execute(
    world: GameWorldSnapshot,
    maxAttempts?: number,
  ): Promise<Result<WorldEventingSnapshot, DomainError>> {
    const existing = await this.repository.findEventingByWorldId(world.id);
    if (existing !== null) {
      const validated = WorldEventing.fromSnapshot(existing);
      return validated.ok ? succeed(validated.value.snapshot()) : validated;
    }
    const created =
      maxAttempts === undefined
        ? WorldEventing.initialize(world)
        : WorldEventing.initialize(world, maxAttempts);
    if (!created.ok) return created;
    await this.repository.saveEventing(created.value.snapshot(), null);
    return succeed(created.value.snapshot());
  }
}

export class PublishOutboxBatch {
  public constructor(private readonly repository: EventingRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      stream: string;
      messages: readonly Readonly<{
        eventType: string;
        payloadHash: string;
        occurredOn: string;
      }>[];
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<readonly OutboxMessageSnapshot[], DomainError>> {
    return mutate(this.repository, gameWorldId, (eventing) =>
      eventing.publishOutboxBatch(input),
    );
  }
}

export class ConsumeEvent {
  public constructor(private readonly repository: EventingRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      consumerId: string;
      messageId: string;
      success: boolean;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<InboxRecordSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (eventing) =>
      eventing.consumeEvent(input),
    );
  }
}

export class RetryDeadLetter {
  public constructor(private readonly repository: EventingRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      consumerId: string;
      messageId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<InboxRecordSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (eventing) =>
      eventing.retryDeadLetter(input),
    );
  }
}

export class InspectEventing {
  public constructor(private readonly repository: EventingRepository) {}

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<EventingSummary, DomainError>> {
    const loaded = await loadEventing(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }
}
