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
import {
  InboxStatus,
  type EventingSummary,
  type InboxRecordSnapshot,
  type MessageDeadLetteredEvent,
  type OutboxMessageSnapshot,
  type OutboxPublishedEvent,
  type WorldEventingSnapshot,
} from "./eventing-types.js";

const DEFAULT_MAX_ATTEMPTS = 3;

export class WorldEventing {
  private constructor(private state: WorldEventingSnapshot) {}

  public static initialize(
    world: GameWorldSnapshot,
    maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  ): Result<WorldEventing, DomainError> {
    return WorldEventing.fromSnapshot({
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      maxAttempts,
      outbox: [],
      inbox: [],
      events: [],
      revision: 1,
    });
  }

  public static fromSnapshot(
    snapshot: WorldEventingSnapshot,
  ): Result<WorldEventing, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidEventing("A revisão do eventing é inválida."));
    }
    if (!Number.isSafeInteger(snapshot.maxAttempts) || snapshot.maxAttempts < 1) {
      return fail(invalidEventing("maxAttempts inválido."));
    }
    const messageIds = new Set<string>();
    for (const message of snapshot.outbox) {
      if (
        message.gameWorldId !== snapshot.gameWorldId ||
        message.stream.trim() === "" ||
        message.sequence < 1 ||
        messageIds.has(message.id)
      ) {
        return fail(invalidEventing("Mensagem de outbox inválida."));
      }
      messageIds.add(message.id);
    }
    for (const record of snapshot.inbox) {
      if (!messageIds.has(record.messageId) || record.consumerId.trim() === "") {
        return fail(invalidEventing("Registro de inbox inválido."));
      }
    }
    for (const event of snapshot.events) {
      if (event.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidEventing("Evento de eventing inválido."));
      }
    }
    return succeed(new WorldEventing(snapshot));
  }

  public publishOutboxBatch(
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
  ): Result<readonly OutboxMessageSnapshot[], DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const already = this.state.outbox.filter(
      (message) => message.batchKey === input.idempotencyKey,
    );
    if (already.length > 0) return succeed(already);
    if (input.stream.trim() === "" || input.messages.length === 0) {
      return fail(
        new DomainError(
          "INVALID_OUTBOX_BATCH",
          "Stream e ao menos uma mensagem são obrigatórios.",
        ),
      );
    }
    for (const message of input.messages) {
      if (
        message.eventType.trim() === "" ||
        message.payloadHash.trim() === "" ||
        !WorldDate.parse(message.occurredOn).ok
      ) {
        return fail(
          new DomainError(
            "INVALID_OUTBOX_BATCH",
            "eventType, payloadHash e occurredOn devem ser válidos.",
          ),
        );
      }
    }
    let sequence = this.state.outbox
      .filter((message) => message.stream === input.stream)
      .reduce((max, message) => Math.max(max, message.sequence), 0);
    const published: OutboxMessageSnapshot[] = input.messages.map(
      (message, index) => {
        sequence += 1;
        return {
          id: deterministicUuidV7<"OutboxMessage">({
            worldSeed: input.worldSeed,
            context: `outbox:${input.idempotencyKey}:${index}`,
            timestampMilliseconds: timestampOf(message.occurredOn),
          }),
          gameWorldId: this.state.gameWorldId,
          stream: input.stream,
          sequence,
          eventType: message.eventType,
          payloadHash: message.payloadHash,
          occurredOn: message.occurredOn,
          batchKey: input.idempotencyKey,
        };
      },
    );
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const event: OutboxPublishedEvent = {
      id: deterministicUuidV7<"EventingEvent">({
        worldSeed: input.worldSeed,
        context: `outbox-published:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(date.value.toString()),
      }),
      type: "OutboxPublished",
      gameWorldId: this.state.gameWorldId,
      stream: input.stream,
      messageCount: published.length,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      outbox: [...this.state.outbox, ...published],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(published);
  }

  public consumeEvent(
    input: Readonly<{
      consumerId: string;
      messageId: string;
      success: boolean;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<InboxRecordSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const message = this.state.outbox.find(({ id }) => id === input.messageId);
    if (message === undefined) {
      return fail(
        new DomainError("OUTBOX_MESSAGE_NOT_FOUND", "Mensagem inexistente.", {
          messageId: input.messageId,
        }),
      );
    }
    const index = this.state.inbox.findIndex(
      (record) =>
        record.consumerId === input.consumerId &&
        record.messageId === input.messageId,
    );
    const existing = index >= 0 ? this.state.inbox[index]! : null;
    if (existing !== null && existing.status === InboxStatus.CONSUMED) {
      return succeed(existing);
    }
    if (existing !== null && existing.status === InboxStatus.DEAD_LETTERED) {
      return fail(
        new DomainError(
          "MESSAGE_DEAD_LETTERED",
          "A mensagem está na DLQ; use retryDeadLetter antes de reconsumir.",
          { consumerId: input.consumerId, messageId: input.messageId },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const attempts = (existing?.attempts ?? 0) + 1;
    const deadLettered = !input.success && attempts >= this.state.maxAttempts;
    const status: InboxStatus = input.success
      ? InboxStatus.CONSUMED
      : deadLettered
        ? InboxStatus.DEAD_LETTERED
        : InboxStatus.FAILED;
    const record: InboxRecordSnapshot = {
      consumerId: input.consumerId,
      messageId: message.id,
      status,
      attempts,
      lastOn: date.value.toString(),
    };
    const inbox =
      index >= 0
        ? this.state.inbox.map((current, position) =>
            position === index ? record : current,
          )
        : [...this.state.inbox, record];
    const events = deadLettered
      ? [
          ...this.state.events,
          this.deadLetterEvent(input, message.id, attempts, date.value.toString()),
        ]
      : this.state.events;
    this.state = {
      ...this.state,
      inbox,
      events,
      revision: this.state.revision + 1,
    };
    return succeed(record);
  }

  public retryDeadLetter(
    input: Readonly<{
      consumerId: string;
      messageId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<InboxRecordSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.inbox.findIndex(
      (record) =>
        record.consumerId === input.consumerId &&
        record.messageId === input.messageId,
    );
    if (index < 0 || this.state.inbox[index]!.status !== InboxStatus.DEAD_LETTERED) {
      return fail(
        new DomainError(
          "DEAD_LETTER_NOT_FOUND",
          "Não há mensagem na DLQ para esse consumer.",
          { consumerId: input.consumerId, messageId: input.messageId },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const reset: InboxRecordSnapshot = {
      ...this.state.inbox[index]!,
      status: InboxStatus.FAILED,
      attempts: 0,
      lastOn: date.value.toString(),
    };
    const inbox = this.state.inbox.map((record, position) =>
      position === index ? reset : record,
    );
    this.state = {
      ...this.state,
      inbox,
      revision: this.state.revision + 1,
    };
    return succeed(reset);
  }

  public summary(): EventingSummary {
    return {
      outboxCount: this.state.outbox.length,
      consumedCount: this.state.inbox.filter(
        ({ status }) => status === InboxStatus.CONSUMED,
      ).length,
      deadLetteredCount: this.state.inbox.filter(
        ({ status }) => status === InboxStatus.DEAD_LETTERED,
      ).length,
      eventCount: this.state.events.length,
    };
  }

  public snapshot(): WorldEventingSnapshot {
    return this.state;
  }

  private deadLetterEvent(
    input: Readonly<{
      consumerId: string;
      idempotencyKey: string;
      worldSeed: string;
    }>,
    messageId: OutboxMessageSnapshot["id"],
    attempts: number,
    worldDate: string,
  ): MessageDeadLetteredEvent {
    return {
      id: deterministicUuidV7<"EventingEvent">({
        worldSeed: input.worldSeed,
        context: `message-dead-lettered:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(worldDate),
      }),
      type: "MessageDeadLettered",
      gameWorldId: this.state.gameWorldId,
      consumerId: input.consumerId,
      messageId,
      attempts,
      worldDate,
      rulesetVersion: this.state.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
  }
}

function invalidEventing(message: string): DomainError {
  return new DomainError("INVALID_EVENTING_STATE", message);
}

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente do eventing.",
  );
}

function timestampOf(worldDate: string): number {
  return Date.parse(`${worldDate}T00:00:00.000Z`);
}
