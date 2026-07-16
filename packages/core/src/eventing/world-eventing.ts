import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";
import { stableHash } from "../matches/match-kernel.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import {
  InboxStatus,
  SagaStatus,
  SagaStepStatus,
  type EventingDomainEvent,
  type EventingSummary,
  type EventRegistryEntrySnapshot,
  type InboxRecordSnapshot,
  type MessageDeadLetteredEvent,
  type OutboxMessageSnapshot,
  type OutboxPublishedEvent,
  type ProjectionAdvancedEvent,
  type ProjectionCheckpointSnapshot,
  type RealtimeCursorSnapshot,
  type SagaCheckpointedEvent,
  type SagaCompletedEvent,
  type SagaInstanceSnapshot,
  type SagaStartedEvent,
  type SagaStepSnapshot,
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
    const sagaIds = new Set<string>();
    for (const saga of snapshot.sagas ?? []) {
      if (
        saga.gameWorldId !== snapshot.gameWorldId ||
        sagaIds.has(saga.id) ||
        saga.steps.length === 0 ||
        saga.currentStep < 0 ||
        saga.currentStep > saga.steps.length ||
        saga.fencingToken < 0 ||
        !Number.isSafeInteger(saga.version) ||
        saga.version < 1
      ) {
        return fail(invalidEventing("Instância de saga inválida."));
      }
      sagaIds.add(saga.id);
    }
    const projectionIds = new Set<string>();
    for (const projection of snapshot.projections ?? []) {
      if (
        projection.gameWorldId !== snapshot.gameWorldId ||
        projectionIds.has(projection.projectionId) ||
        projection.cursor < 0
      ) {
        return fail(invalidEventing("Checkpoint de projeção inválido."));
      }
      projectionIds.add(projection.projectionId);
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

  public registerEventType(
    input: Readonly<{
      eventType: string;
      version: number;
      owner: string;
      schemaHash: string;
      compatibility?: "ADDITIVE" | "BREAKING";
      rulesetVersion: RulesetVersion;
    }>,
  ): Result<EventRegistryEntrySnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    if (
      input.eventType.trim() === "" ||
      input.owner.trim() === "" ||
      input.schemaHash.trim() === "" ||
      !Number.isSafeInteger(input.version) ||
      input.version < 1
    ) {
      return fail(
        new DomainError(
          "INVALID_EVENT_REGISTRY",
          "eventType/owner/schemaHash/version devem ser válidos.",
        ),
      );
    }
    const registry = this.state.registry ?? [];
    const existing = registry.find(
      (entry) =>
        entry.eventType === input.eventType && entry.version === input.version,
    );
    if (existing !== undefined) {
      if (existing.schemaHash !== input.schemaHash) {
        return fail(
          new DomainError(
            "EVENT_SCHEMA_CONFLICT",
            "O tipo/versão já foi registrado com outro schemaHash (fato imutável).",
            { eventType: input.eventType, version: input.version },
          ),
        );
      }
      return succeed(existing);
    }
    const entry: EventRegistryEntrySnapshot = {
      eventType: input.eventType,
      version: input.version,
      owner: input.owner,
      schemaHash: input.schemaHash,
      compatibility: input.compatibility ?? "ADDITIVE",
    };
    this.state = {
      ...this.state,
      registry: [...registry, entry],
      revision: this.state.revision + 1,
    };
    return succeed(entry);
  }

  public startSaga(
    input: Readonly<{
      sagaType: string;
      correlationKey: string;
      steps: readonly string[];
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<SagaInstanceSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = (this.state.sagas ?? []).find(
      (saga) => saga.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (
      input.sagaType.trim() === "" ||
      input.correlationKey.trim() === "" ||
      input.steps.length === 0 ||
      input.steps.some((name) => name.trim() === "")
    ) {
      return fail(
        new DomainError(
          "INVALID_SAGA",
          "sagaType, correlationKey e ao menos um passo nomeado são obrigatórios.",
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const sagaId = deterministicUuidV7<"SagaInstance">({
      worldSeed: input.worldSeed,
      context: `saga:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const steps: SagaStepSnapshot[] = input.steps.map((name, index) => ({
      index,
      name,
      status: SagaStepStatus.PENDING,
      attempts: 0,
      checkpointHash: null,
      completedOn: null,
    }));
    const saga: SagaInstanceSnapshot = {
      id: sagaId,
      gameWorldId: this.state.gameWorldId,
      sagaType: input.sagaType,
      correlationKey: input.correlationKey,
      status: SagaStatus.RUNNING,
      currentStep: 0,
      steps,
      leaseOwnerId: null,
      leaseExpiresAtMs: null,
      fencingToken: 0,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: SagaStartedEvent = {
      id: this.eventId(input.worldSeed, `saga-started:${input.idempotencyKey}`, date.value.toString()),
      type: "SagaStarted",
      gameWorldId: this.state.gameWorldId,
      sagaId,
      sagaType: input.sagaType,
      correlationKey: input.correlationKey,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      sagas: [...(this.state.sagas ?? []), saga],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(saga);
  }

  public claimSaga(
    input: Readonly<{
      sagaId: string;
      owner: string;
      nowMs: number;
      leaseMs: number;
      rulesetVersion: RulesetVersion;
    }>,
  ): Result<SagaInstanceSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const found = this.locateSaga(input.sagaId);
    if (!found.ok) return found;
    const { saga, index } = found.value;
    if (saga.status !== SagaStatus.RUNNING) {
      return fail(sagaTerminal(saga.id));
    }
    if (
      input.owner.trim() === "" ||
      !Number.isSafeInteger(input.nowMs) ||
      input.nowMs < 0 ||
      !Number.isSafeInteger(input.leaseMs) ||
      input.leaseMs < 1
    ) {
      return fail(new DomainError("INVALID_SAGA_LEASE", "owner/nowMs/leaseMs inválidos."));
    }
    const heldByOther =
      saga.leaseOwnerId !== null &&
      saga.leaseOwnerId !== input.owner &&
      saga.leaseExpiresAtMs !== null &&
      saga.leaseExpiresAtMs > input.nowMs;
    if (heldByOther) {
      return fail(
        new DomainError(
          "SAGA_LEASE_HELD",
          "A saga está arrendada por outro worker e o lease não expirou.",
          { sagaId: saga.id, leaseOwnerId: saga.leaseOwnerId },
        ),
      );
    }
    const claimed: SagaInstanceSnapshot = {
      ...saga,
      leaseOwnerId: input.owner,
      leaseExpiresAtMs: input.nowMs + input.leaseMs,
      fencingToken: saga.fencingToken + 1,
      version: saga.version + 1,
    };
    this.replaceSaga(index, claimed);
    return succeed(claimed);
  }

  public advanceSagaStep(
    input: Readonly<{
      sagaId: string;
      fencingToken: number;
      checkpointHash: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<SagaInstanceSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    if (
      this.findEvent("SagaCheckpointed", input.idempotencyKey) !== undefined ||
      this.findEvent("SagaCompleted", input.idempotencyKey) !== undefined
    ) {
      const replayed = (this.state.sagas ?? []).find(
        ({ id }) => id === input.sagaId,
      );
      if (replayed !== undefined) return succeed(replayed);
    }
    const found = this.locateSaga(input.sagaId);
    if (!found.ok) return found;
    const { saga, index } = found.value;
    if (saga.status !== SagaStatus.RUNNING) {
      return fail(sagaTerminal(saga.id));
    }
    const fencing = this.checkFencing(saga, input.fencingToken);
    if (!fencing.ok) return fencing;
    if (input.checkpointHash.trim() === "") {
      return fail(new DomainError("INVALID_SAGA", "checkpointHash é obrigatório."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const stepIndex = saga.currentStep;
    const steps = saga.steps.map((step) =>
      step.index === stepIndex
        ? {
            ...step,
            status: SagaStepStatus.DONE,
            attempts: step.attempts + 1,
            checkpointHash: input.checkpointHash,
            completedOn: date.value.toString(),
          }
        : step,
    );
    const nextStep = stepIndex + 1;
    const completed = nextStep >= steps.length;
    const advanced: SagaInstanceSnapshot = {
      ...saga,
      steps,
      currentStep: completed ? steps.length : nextStep,
      status: completed ? SagaStatus.COMPLETED : SagaStatus.RUNNING,
      version: saga.version + 1,
    };
    this.replaceSaga(index, advanced);
    const event: SagaCheckpointedEvent | SagaCompletedEvent = completed
      ? {
          id: this.eventId(input.worldSeed, `saga-completed:${input.idempotencyKey}`, date.value.toString()),
          type: "SagaCompleted",
          gameWorldId: this.state.gameWorldId,
          sagaId: saga.id,
          outcome: "COMPLETED",
          worldDate: date.value.toString(),
          rulesetVersion: input.rulesetVersion,
          idempotencyKey: input.idempotencyKey,
        }
      : {
          id: this.eventId(input.worldSeed, `saga-checkpointed:${input.idempotencyKey}`, date.value.toString()),
          type: "SagaCheckpointed",
          gameWorldId: this.state.gameWorldId,
          sagaId: saga.id,
          stepIndex,
          checkpointHash: input.checkpointHash,
          fencingToken: saga.fencingToken,
          worldDate: date.value.toString(),
          rulesetVersion: input.rulesetVersion,
          idempotencyKey: input.idempotencyKey,
        };
    this.state = {
      ...this.state,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(advanced);
  }

  public compensateSaga(
    input: Readonly<{
      sagaId: string;
      fencingToken: number;
      reason: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<SagaInstanceSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    if (this.findEvent("SagaCompleted", input.idempotencyKey) !== undefined) {
      const replayed = (this.state.sagas ?? []).find(
        ({ id }) => id === input.sagaId,
      );
      if (replayed !== undefined) return succeed(replayed);
    }
    const found = this.locateSaga(input.sagaId);
    if (!found.ok) return found;
    const { saga, index } = found.value;
    if (
      saga.status === SagaStatus.COMPLETED ||
      saga.status === SagaStatus.COMPENSATED
    ) {
      return fail(sagaTerminal(saga.id));
    }
    const fencing = this.checkFencing(saga, input.fencingToken);
    if (!fencing.ok) return fencing;
    if (input.reason.trim() === "") {
      return fail(new DomainError("INVALID_SAGA", "reason é obrigatório."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const steps = saga.steps.map((step) =>
      step.status === SagaStepStatus.DONE
        ? { ...step, status: SagaStepStatus.COMPENSATED }
        : step,
    );
    const compensated: SagaInstanceSnapshot = {
      ...saga,
      steps,
      status: SagaStatus.COMPENSATED,
      version: saga.version + 1,
    };
    this.replaceSaga(index, compensated);
    const event: SagaCompletedEvent = {
      id: this.eventId(input.worldSeed, `saga-compensated:${input.idempotencyKey}`, date.value.toString()),
      type: "SagaCompleted",
      gameWorldId: this.state.gameWorldId,
      sagaId: saga.id,
      outcome: "COMPENSATED",
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(compensated);
  }

  public rebuildProjection(
    input: Readonly<{
      projectionId: string;
      stream: string;
      throughSequence?: number;
      schemaVersion?: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<ProjectionCheckpointSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    if (input.projectionId.trim() === "" || input.stream.trim() === "") {
      return fail(
        new DomainError("INVALID_PROJECTION", "projectionId e stream são obrigatórios."),
      );
    }
    const ordered = this.state.outbox
      .filter((message) => message.stream === input.stream)
      .sort((a, b) => a.sequence - b.sequence);
    // cursor contíguo a partir de 1 (detecção de gap)
    let cursor = 0;
    const replayed: string[] = [];
    for (const message of ordered) {
      if (message.sequence !== cursor + 1) break;
      cursor += 1;
      replayed.push(message.payloadHash);
    }
    if (
      input.throughSequence !== undefined &&
      input.throughSequence > cursor
    ) {
      return fail(
        new DomainError(
          "SEQUENCE_GAP",
          "Há uma lacuna de sequência antes do alvo solicitado.",
          { stream: input.stream, contiguousThrough: cursor, requested: input.throughSequence },
        ),
      );
    }
    const targetCursor =
      input.throughSequence === undefined ? cursor : input.throughSequence;
    const stateHash = stableHash(
      `${input.projectionId}|${input.stream}|${replayed.slice(0, targetCursor).join(",")}`,
    );
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const projections = this.state.projections ?? [];
    const index = projections.findIndex(
      (checkpoint) => checkpoint.projectionId === input.projectionId,
    );
    const existing = index >= 0 ? projections[index]! : null;
    const checkpoint: ProjectionCheckpointSnapshot = {
      projectionId: input.projectionId,
      gameWorldId: this.state.gameWorldId,
      stream: input.stream,
      cursor: targetCursor,
      schemaVersion: input.schemaVersion ?? 1,
      stateHash,
      updatedOn: date.value.toString(),
    };
    if (
      existing !== null &&
      existing.cursor === checkpoint.cursor &&
      existing.stateHash === checkpoint.stateHash &&
      existing.stream === checkpoint.stream
    ) {
      return succeed(existing);
    }
    const nextProjections =
      index >= 0
        ? projections.map((current, position) =>
            position === index ? checkpoint : current,
          )
        : [...projections, checkpoint];
    const event: ProjectionAdvancedEvent = {
      id: this.eventId(input.worldSeed, `projection-advanced:${input.idempotencyKey}`, date.value.toString()),
      type: "ProjectionAdvanced",
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

  public resumeRealtimeStream(
    input: Readonly<{
      audience: string;
      stream: string;
      fromSequence: number;
      expiresOn: string;
      rulesetVersion: RulesetVersion;
    }>,
  ): Result<RealtimeCursorSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    if (
      input.audience.trim() === "" ||
      input.stream.trim() === "" ||
      !Number.isSafeInteger(input.fromSequence) ||
      input.fromSequence < 0
    ) {
      return fail(
        new DomainError(
          "INVALID_REALTIME_CURSOR",
          "audience/stream/fromSequence devem ser válidos.",
        ),
      );
    }
    const maxSequence = this.state.outbox
      .filter((message) => message.stream === input.stream)
      .reduce((max, message) => Math.max(max, message.sequence), 0);
    if (input.fromSequence > maxSequence) {
      return fail(
        new DomainError(
          "SEQUENCE_GAP",
          "Não é possível retomar além da última sequência publicada.",
          { stream: input.stream, maxSequence, requested: input.fromSequence },
        ),
      );
    }
    const expires = WorldDate.parse(input.expiresOn);
    if (!expires.ok) return expires;
    const resumeToken = stableHash(
      `${input.audience}|${input.stream}|${input.fromSequence}`,
    );
    const cursor: RealtimeCursorSnapshot = {
      audience: input.audience,
      stream: input.stream,
      lastSequence: input.fromSequence,
      resumeToken,
      expiresOn: expires.value.toString(),
    };
    const cursors = this.state.cursors ?? [];
    const index = cursors.findIndex(
      (current) =>
        current.audience === input.audience && current.stream === input.stream,
    );
    const existing = index >= 0 ? cursors[index]! : null;
    if (
      existing !== null &&
      existing.lastSequence === cursor.lastSequence &&
      existing.resumeToken === cursor.resumeToken &&
      existing.expiresOn === cursor.expiresOn
    ) {
      return succeed(existing);
    }
    const nextCursors =
      index >= 0
        ? cursors.map((current, position) =>
            position === index ? cursor : current,
          )
        : [...cursors, cursor];
    this.state = {
      ...this.state,
      cursors: nextCursors,
      revision: this.state.revision + 1,
    };
    return succeed(cursor);
  }

  public findSaga(sagaId: string): SagaInstanceSnapshot | null {
    return (this.state.sagas ?? []).find(({ id }) => id === sagaId) ?? null;
  }

  public projectionFor(projectionId: string): ProjectionCheckpointSnapshot | null {
    return (
      (this.state.projections ?? []).find(
        (checkpoint) => checkpoint.projectionId === projectionId,
      ) ?? null
    );
  }

  public summary(): EventingSummary {
    const sagas = this.state.sagas ?? [];
    return {
      outboxCount: this.state.outbox.length,
      consumedCount: this.state.inbox.filter(
        ({ status }) => status === InboxStatus.CONSUMED,
      ).length,
      deadLetteredCount: this.state.inbox.filter(
        ({ status }) => status === InboxStatus.DEAD_LETTERED,
      ).length,
      eventCount: this.state.events.length,
      sagaCount: sagas.length,
      completedSagaCount: sagas.filter(
        ({ status }) => status === SagaStatus.COMPLETED,
      ).length,
      projectionCount: (this.state.projections ?? []).length,
      cursorCount: (this.state.cursors ?? []).length,
    };
  }

  public snapshot(): WorldEventingSnapshot {
    return this.state;
  }

  private eventId(
    worldSeed: string,
    context: string,
    worldDate: string,
  ): SagaStartedEvent["id"] {
    return deterministicUuidV7<"EventingEvent">({
      worldSeed,
      context,
      timestampMilliseconds: timestampOf(worldDate),
    });
  }

  private findEvent<T extends EventingDomainEvent["type"]>(
    type: T,
    idempotencyKey: string,
  ): Extract<EventingDomainEvent, { type: T }> | undefined {
    return this.state.events.find(
      (event): event is Extract<EventingDomainEvent, { type: T }> =>
        event.type === type && event.idempotencyKey === idempotencyKey,
    );
  }

  private locateSaga(
    sagaId: string,
  ): Result<{ saga: SagaInstanceSnapshot; index: number }, DomainError> {
    const index = (this.state.sagas ?? []).findIndex(
      ({ id }) => id === sagaId,
    );
    if (index < 0) {
      return fail(
        new DomainError("SAGA_NOT_FOUND", "Saga não encontrada.", { sagaId }),
      );
    }
    return succeed({ saga: this.state.sagas![index]!, index });
  }

  private replaceSaga(index: number, saga: SagaInstanceSnapshot): void {
    const sagas = [...(this.state.sagas ?? [])];
    sagas[index] = saga;
    this.state = { ...this.state, sagas };
  }

  private checkFencing(
    saga: SagaInstanceSnapshot,
    fencingToken: number,
  ): Result<true, DomainError> {
    if (fencingToken !== saga.fencingToken || saga.leaseOwnerId === null) {
      return fail(
        new DomainError(
          "FENCING_TOKEN_STALE",
          "Fencing token obsoleto ou saga não arrendada; readquira o lease.",
          { sagaId: saga.id, expected: saga.fencingToken, received: fencingToken },
        ),
      );
    }
    return succeed(true);
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

function sagaTerminal(sagaId: string): DomainError {
  return new DomainError(
    "SAGA_TERMINAL",
    "A saga já está em estado terminal e não aceita esta transição.",
    { sagaId },
  );
}

