import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { stableHash } from "../matches/match-kernel.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import {
  DeliveryStatus,
  InboxProjectionStatus,
  NotificationPriority,
  NotificationStatus,
  type DeliveryAttemptSnapshot,
  type DeliveryFailedEvent,
  type DigestReadyEvent,
  type DigestResult,
  type InboxProjectionSnapshot,
  type InboxSummary,
  type NotificationCreatedEvent,
  type NotificationDomainEvent,
  type NotificationReadEvent,
  type NotificationSnapshot,
  type ProjectionGapDetectedEvent,
  type ProjectionRebuiltEvent,
  type RecordEstablishedEvent,
  type RecordSnapshot,
  type ReportArtifactSnapshot,
  type ReportGeneratedEvent,
  type TimelineEntrySnapshot,
  type WorldInboxSnapshot,
} from "./notifications-types.js";

export class WorldInbox {
  private constructor(private state: WorldInboxSnapshot) {}

  public static initialize(
    world: GameWorldSnapshot,
  ): Result<WorldInbox, DomainError> {
    return WorldInbox.fromSnapshot({
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      notifications: [],
      timeline: [],
      records: [],
      reports: [],
      events: [],
      revision: 1,
    });
  }

  public static fromSnapshot(
    snapshot: WorldInboxSnapshot,
  ): Result<WorldInbox, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidInbox("A revisão da inbox é inválida."));
    }
    const dedupKeys = new Set<string>();
    for (const notification of snapshot.notifications) {
      if (
        notification.gameWorldId !== snapshot.gameWorldId ||
        dedupKeys.has(notification.dedupKey)
      ) {
        return fail(invalidInbox("Notificação inválida ou dedupKey repetida."));
      }
      dedupKeys.add(notification.dedupKey);
    }
    for (const event of snapshot.events) {
      if (event.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidInbox("Evento de inbox inválido."));
      }
    }
    return succeed(new WorldInbox(snapshot));
  }

  public projectNotification(
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
  ): Result<NotificationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.notifications.find(
      (notification) => notification.dedupKey === input.dedupKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (
      input.dedupKey.trim() === "" ||
      input.recipientScope.trim() === "" ||
      !isPriority(input.priority)
    ) {
      return fail(
        new DomainError(
          "INVALID_NOTIFICATION",
          "dedupKey, destinatário e prioridade devem ser válidos.",
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    let deadline: string | null = null;
    if (input.deadline !== undefined) {
      const parsed = WorldDate.parse(input.deadline);
      if (!parsed.ok) return parsed;
      deadline = parsed.value.toString();
    }
    const notificationId = deterministicUuidV7<"Notification">({
      worldSeed: input.worldSeed,
      context: `notification:${input.dedupKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const notification: NotificationSnapshot = {
      id: notificationId,
      gameWorldId: this.state.gameWorldId,
      recipientScope: input.recipientScope,
      category: input.category,
      priority: input.priority,
      sourceRef: input.sourceRef,
      dedupKey: input.dedupKey,
      createdOn: date.value.toString(),
      deadline,
      status: NotificationStatus.OPEN,
      version: 1,
    };
    const event: NotificationCreatedEvent = {
      id: this.eventId(input.worldSeed, `notification-created:${input.idempotencyKey}`, date.value.toString()),
      type: "NotificationCreated",
      gameWorldId: this.state.gameWorldId,
      notificationId,
      dedupKey: input.dedupKey,
      priority: input.priority,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      notifications: [...this.state.notifications, notification],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(notification);
  }

  public markNotificationRead(
    input: Readonly<{
      notificationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<NotificationSnapshot, DomainError> {
    return this.transition(input, NotificationStatus.READ, [
      NotificationStatus.OPEN,
    ]);
  }

  public dismissNotification(
    input: Readonly<{
      notificationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<NotificationSnapshot, DomainError> {
    return this.transition(input, NotificationStatus.DISMISSED, [
      NotificationStatus.OPEN,
      NotificationStatus.READ,
    ]);
  }

  public buildDigest(
    input: Readonly<{
      recipientScope: string;
      fromOn: string;
      toOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<DigestResult, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const from = WorldDate.parse(input.fromOn);
    if (!from.ok) return from;
    const to = WorldDate.parse(input.toOn);
    if (!to.ok) return to;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const items = this.state.notifications.filter(
      (notification) =>
        notification.recipientScope === input.recipientScope &&
        notification.status === NotificationStatus.OPEN &&
        notification.priority !== NotificationPriority.URGENT &&
        notification.createdOn >= from.value.toString() &&
        notification.createdOn <= to.value.toString(),
    );
    const itemIds = items.map((notification) => notification.id);
    // Idempotência: um digest já construído com esta chave não gera novo efeito.
    const alreadyBuilt = this.state.events.some(
      (candidate) =>
        candidate.type === "DigestReady" &&
        candidate.idempotencyKey === input.idempotencyKey,
    );
    if (alreadyBuilt) {
      return succeed({ recipientScope: input.recipientScope, itemIds });
    }
    const event: DigestReadyEvent = {
      id: this.eventId(input.worldSeed, `digest:${input.idempotencyKey}`, date.value.toString()),
      type: "DigestReady",
      gameWorldId: this.state.gameWorldId,
      recipientScope: input.recipientScope,
      itemCount: itemIds.length,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed({ recipientScope: input.recipientScope, itemIds });
  }

  public appendTimelineEntry(
    input: Readonly<{
      subject: string;
      occurredOn: string;
      factRef: string;
      rulesetVersion: RulesetVersion;
    }>,
  ): Result<TimelineEntrySnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.timeline.find(
      (entry) => entry.factRef === input.factRef,
    );
    if (existing !== undefined) return succeed(existing);
    if (input.subject.trim() === "" || input.factRef.trim() === "") {
      return fail(
        new DomainError("INVALID_TIMELINE_ENTRY", "Assunto/factRef obrigatórios."),
      );
    }
    const occurredOn = WorldDate.parse(input.occurredOn);
    if (!occurredOn.ok) return occurredOn;
    const entry: TimelineEntrySnapshot = {
      subject: input.subject,
      occurredOn: occurredOn.value.toString(),
      factRef: input.factRef,
      sequence: this.state.timeline.length + 1,
    };
    this.state = {
      ...this.state,
      timeline: [...this.state.timeline, entry],
      revision: this.state.revision + 1,
    };
    return succeed(entry);
  }

  public establishRecord(
    input: Readonly<{
      category: string;
      holder: string;
      value: number;
      achievedOn: string;
      factRef: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<RecordSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.records.find(
      (record) => record.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    const achievedOn = WorldDate.parse(input.achievedOn);
    if (!achievedOn.ok) return achievedOn;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const record: RecordSnapshot = {
      category: input.category,
      holder: input.holder,
      value: input.value,
      achievedOn: achievedOn.value.toString(),
      factRef: input.factRef,
      idempotencyKey: input.idempotencyKey,
    };
    const event: RecordEstablishedEvent = {
      id: this.eventId(input.worldSeed, `record:${input.idempotencyKey}`, date.value.toString()),
      type: "RecordEstablished",
      gameWorldId: this.state.gameWorldId,
      category: input.category,
      holder: input.holder,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      records: [...this.state.records, record],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(record);
  }

  public generateReport(
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
  ): Result<ReportArtifactSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.reports.find(
      (report) => report.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    const asOf = WorldDate.parse(input.asOf);
    if (!asOf.ok) return asOf;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const reportHash = stableHash(
      [
        input.definitionId,
        input.version,
        asOf.value.toString(),
        ...[...input.sourceVersions].sort(),
      ].join("|"),
    );
    const reportId = deterministicUuidV7<"ReportArtifact">({
      worldSeed: input.worldSeed,
      context: `report:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(asOf.value.toString()),
    });
    const report: ReportArtifactSnapshot = {
      id: reportId,
      gameWorldId: this.state.gameWorldId,
      definitionId: input.definitionId,
      version: input.version,
      asOf: asOf.value.toString(),
      sourceVersions: [...input.sourceVersions],
      reportHash,
      idempotencyKey: input.idempotencyKey,
    };
    const event: ReportGeneratedEvent = {
      id: this.eventId(input.worldSeed, `report-generated:${input.idempotencyKey}`, date.value.toString()),
      type: "ReportGenerated",
      gameWorldId: this.state.gameWorldId,
      reportId,
      reportHash,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      reports: [...this.state.reports, report],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(report);
  }

  public rebuildProjection(
    input: Readonly<{
      projectionId: string;
      stream: string;
      presentSequences: readonly number[];
      throughSequence?: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<InboxProjectionSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    if (input.projectionId.trim() === "" || input.stream.trim() === "") {
      return fail(
        new DomainError("INVALID_PROJECTION", "projectionId e stream obrigatórios."),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const present = new Set(input.presentSequences);
    let cursor = 0;
    while (present.has(cursor + 1)) cursor += 1;
    if (input.throughSequence !== undefined && input.throughSequence > cursor) {
      const gapEvent: ProjectionGapDetectedEvent = {
        id: this.eventId(input.worldSeed, `projection-gap:${input.idempotencyKey}`, date.value.toString()),
        type: "ProjectionGapDetected",
        gameWorldId: this.state.gameWorldId,
        projectionId: input.projectionId,
        stream: input.stream,
        contiguousThrough: cursor,
        requested: input.throughSequence,
        worldDate: date.value.toString(),
        rulesetVersion: input.rulesetVersion,
        idempotencyKey: input.idempotencyKey,
      };
      this.state = {
        ...this.state,
        events: [...this.state.events, gapEvent],
        revision: this.state.revision + 1,
      };
      return fail(
        new DomainError("PROJECTION_GAP", "Lacuna de sequência bloqueia o checkpoint.", {
          projectionId: input.projectionId,
          contiguousThrough: cursor,
          requested: input.throughSequence,
        }),
      );
    }
    const targetCursor =
      input.throughSequence === undefined ? cursor : input.throughSequence;
    const stateHash = stableHash(
      `${input.projectionId}|${input.stream}|${targetCursor}`,
    );
    const projections = this.state.projections ?? [];
    const index = projections.findIndex(
      (projection) => projection.projectionId === input.projectionId,
    );
    const existing = index >= 0 ? projections[index]! : null;
    const checkpoint: InboxProjectionSnapshot = {
      projectionId: input.projectionId,
      gameWorldId: this.state.gameWorldId,
      stream: input.stream,
      cursor: targetCursor,
      stateHash,
      status: InboxProjectionStatus.ACTIVE,
      updatedOn: date.value.toString(),
    };
    if (
      existing !== null &&
      existing.cursor === checkpoint.cursor &&
      existing.stateHash === checkpoint.stateHash
    ) {
      return succeed(existing);
    }
    const nextProjections =
      index >= 0
        ? projections.map((current, position) =>
            position === index ? checkpoint : current,
          )
        : [...projections, checkpoint];
    const event: ProjectionRebuiltEvent = {
      id: this.eventId(input.worldSeed, `projection-rebuilt:${input.idempotencyKey}`, date.value.toString()),
      type: "ProjectionRebuilt",
      gameWorldId: this.state.gameWorldId,
      projectionId: input.projectionId,
      stream: input.stream,
      cursor: targetCursor,
      stateHash,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      projections: nextProjections,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(checkpoint);
  }

  public retryDelivery(
    input: Readonly<{
      notificationId: string;
      channel: string;
      success: boolean;
      maxAttempts: number;
      providerRef?: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<DeliveryAttemptSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const deliveries = this.state.deliveries ?? [];
    const replay = deliveries.find(
      (attempt) => attempt.idempotencyKey === input.idempotencyKey,
    );
    if (replay !== undefined) return succeed(replay);
    if (
      !this.state.notifications.some(({ id }) => id === input.notificationId) ||
      input.channel.trim() === "" ||
      !Number.isSafeInteger(input.maxAttempts) ||
      input.maxAttempts < 1
    ) {
      return fail(new DomainError("INVALID_DELIVERY", "Dados de entrega inválidos."));
    }
    const forChannel = deliveries.filter(
      (attempt) =>
        attempt.notificationId === input.notificationId &&
        attempt.channel === input.channel,
    );
    const latest = forChannel.at(-1) ?? null;
    if (latest !== null && latest.status === DeliveryStatus.DELIVERED) {
      return succeed(latest);
    }
    if (latest !== null && latest.status === DeliveryStatus.FAILED) {
      return fail(
        new DomainError(
          "DELIVERY_RETRY_EXHAUSTED",
          "As tentativas de entrega já foram esgotadas.",
          { notificationId: input.notificationId, channel: input.channel },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const attemptNumber = forChannel.length + 1;
    let status: DeliveryStatus;
    if (input.success) {
      status = DeliveryStatus.DELIVERED;
    } else if (attemptNumber >= input.maxAttempts) {
      status = DeliveryStatus.FAILED;
    } else {
      status = DeliveryStatus.RETRYING;
    }
    const attempt: DeliveryAttemptSnapshot = {
      id: deterministicUuidV7<"DeliveryAttempt">({
        worldSeed: input.worldSeed,
        context: `delivery:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(date.value.toString()),
      }),
      gameWorldId: this.state.gameWorldId,
      notificationId: input.notificationId as DeliveryAttemptSnapshot["notificationId"],
      channel: input.channel,
      attempt: attemptNumber,
      status,
      providerRef: input.providerRef ?? null,
      idempotencyKey: input.idempotencyKey,
    };
    const events =
      status === DeliveryStatus.FAILED
        ? [
            ...this.state.events,
            {
              id: this.eventId(input.worldSeed, `delivery-failed:${input.idempotencyKey}`, date.value.toString()),
              type: "DeliveryFailed",
              gameWorldId: this.state.gameWorldId,
              notificationId: attempt.notificationId,
              channel: input.channel,
              attempts: attemptNumber,
              worldDate: date.value.toString(),
              rulesetVersion: input.rulesetVersion,
              idempotencyKey: input.idempotencyKey,
            } satisfies DeliveryFailedEvent,
          ]
        : this.state.events;
    this.state = {
      ...this.state,
      deliveries: [...deliveries, attempt],
      events,
      revision: this.state.revision + 1,
    };
    return succeed(attempt);
  }

  public findNotification(notificationId: string): NotificationSnapshot | null {
    return (
      this.state.notifications.find(({ id }) => id === notificationId) ?? null
    );
  }

  public summary(): InboxSummary {
    return {
      openNotificationCount: this.state.notifications.filter(
        ({ status }) => status === NotificationStatus.OPEN,
      ).length,
      timelineCount: this.state.timeline.length,
      recordCount: this.state.records.length,
      reportCount: this.state.reports.length,
      deliveredCount: (this.state.deliveries ?? []).filter(
        ({ status }) => status === DeliveryStatus.DELIVERED,
      ).length,
      projectionCount: (this.state.projections ?? []).length,
    };
  }

  public snapshot(): WorldInboxSnapshot {
    return this.state;
  }

  private transition(
    input: Readonly<{
      notificationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
    target: NotificationStatus,
    allowedFrom: readonly NotificationStatus[],
  ): Result<NotificationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.notifications.findIndex(
      ({ id }) => id === input.notificationId,
    );
    if (index < 0) {
      return fail(
        new DomainError("NOTIFICATION_NOT_FOUND", "Notificação não encontrada.", {
          notificationId: input.notificationId,
        }),
      );
    }
    const notification = this.state.notifications[index]!;
    if (notification.status === target) return succeed(notification);
    if (!allowedFrom.includes(notification.status)) {
      return fail(
        new DomainError(
          "NOTIFICATION_TERMINAL",
          "Transição inválida para o estado atual da notificação.",
          { notificationId: notification.id, status: notification.status },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const updated: NotificationSnapshot = {
      ...notification,
      status: target,
      version: notification.version + 1,
    };
    const notifications = [...this.state.notifications];
    notifications[index] = updated;
    const events =
      target === NotificationStatus.READ
        ? [
            ...this.state.events,
            this.readEvent(input, notification.id, date.value.toString()),
          ]
        : this.state.events;
    this.state = {
      ...this.state,
      notifications,
      events,
      revision: this.state.revision + 1,
    };
    return succeed(updated);
  }

  private readEvent(
    input: Readonly<{
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
    notificationId: NotificationSnapshot["id"],
    worldDate: string,
  ): NotificationReadEvent {
    return {
      id: this.eventId(input.worldSeed, `notification-read:${input.idempotencyKey}`, worldDate),
      type: "NotificationRead",
      gameWorldId: this.state.gameWorldId,
      notificationId,
      worldDate,
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
  }

  private eventId(
    worldSeed: string,
    context: string,
    worldDate: string,
  ): NotificationDomainEvent["id"] {
    return deterministicUuidV7<"NotificationEvent">({
      worldSeed,
      context,
      timestampMilliseconds: timestampOf(worldDate),
    });
  }
}

function isPriority(value: string): value is NotificationPriority {
  return (Object.values(NotificationPriority) as string[]).includes(value);
}

function invalidInbox(message: string): DomainError {
  return new DomainError("INVALID_INBOX_STATE", message);
}

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente da inbox.",
  );
}

function timestampOf(worldDate: string): number {
  return Date.parse(`${worldDate}T00:00:00.000Z`);
}
