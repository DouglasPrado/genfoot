import {
  DomainError,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  ConsumeEvent,
  GameWorld,
  WorldEventing,
  type GameWorldSnapshot,
  type EventingRepository,
  type WorldEventingSnapshot,
} from "../../src/index.js";

class MemoryEventingRepository implements EventingRepository {
  public snapshot: WorldEventingSnapshot | null = null;

  public findEventingByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldEventingSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveEventing(
    snapshot: WorldEventingSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("EVENTING_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "eventing-001"): GameWorldSnapshot {
  const rulesetVersion = parseRulesetVersion("1.0.0");
  if (!rulesetVersion.ok) throw rulesetVersion.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed,
    startDate: date("2026-01-01"),
    rulesetVersion: rulesetVersion.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function publishedEventing(maxAttempts = 2) {
  const gameWorld = world();
  const created = WorldEventing.initialize(gameWorld, maxAttempts);
  if (!created.ok) throw created.error;
  const value = created.value;
  const messages = value.publishOutboxBatch({
    stream: "clubs",
    messages: [
      {
        eventType: "ClubRegistered",
        payloadHash: "h1",
        occurredOn: "2026-01-02",
      },
      { eventType: "SquadUpdated", payloadHash: "h2", occurredOn: "2026-01-02" },
    ],
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: "batch:1",
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-02",
  });
  if (!messages.ok) throw messages.error;
  return { gameWorld, value, messages: messages.value };
}

describe("Eventing outbox/inbox/DLQ", () => {
  it("publica com sequência por stream e é idempotente por batch", () => {
    const { gameWorld, value, messages } = publishedEventing();
    expect(messages.map((m) => m.sequence)).toEqual([1, 2]);
    const revision = value.snapshot().revision;

    const repeated = value.publishOutboxBatch({
      stream: "clubs",
      messages: [
        {
          eventType: "ClubRegistered",
          payloadHash: "h1",
          occurredOn: "2026-01-02",
        },
        {
          eventType: "SquadUpdated",
          payloadHash: "h2",
          occurredOn: "2026-01-02",
        },
      ],
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "batch:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    expect(repeated).toEqual({ ok: true, value: messages });
    expect(value.snapshot().outbox).toHaveLength(2);
    expect(value.snapshot().revision).toBe(revision);
  });

  it("consome uma única vez mesmo com entregas duplicadas", () => {
    const { gameWorld, value, messages } = publishedEventing();
    const first = value.consumeEvent({
      consumerId: "projections",
      messageId: messages[0]!.id,
      success: true,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "consume:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    });
    expect(first).toMatchObject({ ok: true, value: { status: "CONSUMED", attempts: 1 } });
    const revision = value.snapshot().revision;

    const duplicate = value.consumeEvent({
      consumerId: "projections",
      messageId: messages[0]!.id,
      success: true,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "consume:1:dup",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    });
    expect(duplicate).toEqual(first);
    expect(value.snapshot().revision).toBe(revision);
    expect(value.summary().consumedCount).toBe(1);
  });

  it("move para a DLQ após esgotar tentativas e retorna via retry", () => {
    const { gameWorld, value, messages } = publishedEventing(2);
    const failInput = (key: string) => ({
      consumerId: "projections",
      messageId: messages[1]!.id,
      success: false,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: key,
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    });

    expect(value.consumeEvent(failInput("f1"))).toMatchObject({
      ok: true,
      value: { status: "FAILED", attempts: 1 },
    });
    expect(value.consumeEvent(failInput("f2"))).toMatchObject({
      ok: true,
      value: { status: "DEAD_LETTERED", attempts: 2 },
    });
    expect(
      value.snapshot().events.some((e) => e.type === "MessageDeadLettered"),
    ).toBe(true);

    expect(
      value.consumeEvent({
        consumerId: "projections",
        messageId: messages[1]!.id,
        success: true,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "consume:after-dlq",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-04",
      }),
    ).toMatchObject({ ok: false, error: { code: "MESSAGE_DEAD_LETTERED" } });

    const retried = value.retryDeadLetter({
      consumerId: "projections",
      messageId: messages[1]!.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "retry:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    expect(retried).toMatchObject({ ok: true, value: { status: "FAILED", attempts: 0 } });

    expect(
      value.consumeEvent({
        consumerId: "projections",
        messageId: messages[1]!.id,
        success: true,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "consume:recovered",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-06",
      }),
    ).toMatchObject({ ok: true, value: { status: "CONSUMED" } });
  });

  it("consome de forma idempotente via caso de uso", async () => {
    const { gameWorld, value, messages } = publishedEventing();
    const repository = new MemoryEventingRepository();
    repository.snapshot = value.snapshot();
    const useCase = new ConsumeEvent(repository);
    const input = {
      consumerId: "ledger",
      messageId: messages[0]!.id,
      success: true,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "uc:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    };
    const first = await useCase.execute(gameWorld.id, input);
    const revision = repository.snapshot.revision;
    const repeated = await useCase.execute(gameWorld.id, {
      ...input,
      idempotencyKey: "uc:1:dup",
    });

    expect(first).toMatchObject({ ok: true, value: { status: "CONSUMED" } });
    expect(repeated).toEqual(first);
    expect(repository.snapshot.revision).toBe(revision);
  });
});
