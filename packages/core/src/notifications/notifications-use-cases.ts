import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GameWorldSnapshot } from "../world/world-types.js";
import type { InboxRepository } from "./notifications-repository.js";
import type {
  DigestResult,
  InboxSummary,
  NotificationPriority,
  NotificationSnapshot,
  ReportArtifactSnapshot,
  WorldInboxSnapshot,
} from "./notifications-types.js";
import { WorldInbox } from "./world-inbox.js";

async function loadInbox(
  repository: InboxRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldInbox, DomainError>> {
  const snapshot = await repository.findInboxByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "INBOX_NOT_FOUND",
        "A inbox do mundo ainda não foi inicializada.",
        { gameWorldId },
      ),
    );
  }
  return WorldInbox.fromSnapshot(snapshot);
}

async function mutate<T>(
  repository: InboxRepository,
  gameWorldId: GameWorldId,
  apply: (inbox: WorldInbox) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadInbox(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.saveInbox(loaded.value.snapshot(), expectedRevision);
  }
  return result;
}

export class InitializeInbox {
  public constructor(private readonly repository: InboxRepository) {}

  public async execute(
    world: GameWorldSnapshot,
  ): Promise<Result<WorldInboxSnapshot, DomainError>> {
    const existing = await this.repository.findInboxByWorldId(world.id);
    if (existing !== null) {
      const validated = WorldInbox.fromSnapshot(existing);
      return validated.ok ? succeed(validated.value.snapshot()) : validated;
    }
    const created = WorldInbox.initialize(world);
    if (!created.ok) return created;
    await this.repository.saveInbox(created.value.snapshot(), null);
    return succeed(created.value.snapshot());
  }
}

export class ProjectNotification {
  public constructor(private readonly repository: InboxRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      dedupKey: string;
      recipientScope: string;
      category: string;
      priority: NotificationPriority;
      sourceRef: string;
      deadline?: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NotificationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (inbox) =>
      inbox.projectNotification(input),
    );
  }
}

export class MarkNotificationRead {
  public constructor(private readonly repository: InboxRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      notificationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NotificationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (inbox) =>
      inbox.markNotificationRead(input),
    );
  }
}

export class DismissNotification {
  public constructor(private readonly repository: InboxRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      notificationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NotificationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (inbox) =>
      inbox.dismissNotification(input),
    );
  }
}

export class BuildDigest {
  public constructor(private readonly repository: InboxRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      recipientScope: string;
      fromOn: string;
      toOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<DigestResult, DomainError>> {
    return mutate(this.repository, gameWorldId, (inbox) =>
      inbox.buildDigest(input),
    );
  }
}

export class GenerateReport {
  public constructor(private readonly repository: InboxRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      definitionId: string;
      version: string;
      asOf: string;
      sourceVersions: readonly string[];
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<ReportArtifactSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (inbox) =>
      inbox.generateReport(input),
    );
  }
}

export class InspectInbox {
  public constructor(private readonly repository: InboxRepository) {}

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<InboxSummary, DomainError>> {
    const loaded = await loadInbox(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }
}
