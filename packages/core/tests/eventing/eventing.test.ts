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

  it("executa saga durável: start → claim(lease/fencing) → advance → complete", () => {
    const { gameWorld, value } = publishedEventing();
    const saga = value.startSaga({
      sagaType: "SAGA-01",
      correlationKey: "transfer:1",
      steps: ["reserve", "settle"],
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "saga:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!saga.ok) throw saga.error;
    expect(
      value.snapshot().events.filter((e) => e.type === "SagaStarted"),
    ).toHaveLength(1);

    const claim = value.claimSaga({
      sagaId: saga.value.id,
      owner: "worker-a",
      nowMs: 1_000,
      leaseMs: 30_000,
      rulesetVersion: gameWorld.rulesetVersion,
    });
    if (!claim.ok) throw claim.error;
    expect(claim.value.fencingToken).toBe(1);

    // lease detido por outro worker enquanto válido
    expect(
      value.claimSaga({
        sagaId: saga.value.id,
        owner: "worker-b",
        nowMs: 2_000,
        leaseMs: 30_000,
        rulesetVersion: gameWorld.rulesetVersion,
      }),
    ).toMatchObject({ ok: false, error: { code: "SAGA_LEASE_HELD" } });

    // fencing obsoleto rejeitado
    expect(
      value.advanceSagaStep({
        sagaId: saga.value.id,
        fencingToken: 99,
        checkpointHash: "cp",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "bad",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-03",
      }),
    ).toMatchObject({ ok: false, error: { code: "FENCING_TOKEN_STALE" } });

    const step0 = value.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      checkpointHash: "cp-0",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "step:0",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    });
    expect(step0).toMatchObject({ ok: true, value: { status: "RUNNING", currentStep: 1 } });

    // retomada do mesmo step = efeito único
    const revision = value.snapshot().revision;
    const replay = value.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      checkpointHash: "cp-0",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "step:0",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    });
    expect(replay).toMatchObject({ ok: true, value: { currentStep: 1 } });
    expect(value.snapshot().revision).toBe(revision);

    const step1 = value.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      checkpointHash: "cp-1",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "step:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-04",
    });
    expect(step1).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
    expect(
      value.snapshot().events.filter((e) => e.type === "SagaCompleted"),
    ).toHaveLength(1);
  });

  it("compensa a saga e rejeita transição terminal", () => {
    const { gameWorld, value } = publishedEventing();
    const saga = value.startSaga({
      sagaType: "SAGA-01",
      correlationKey: "transfer:2",
      steps: ["reserve", "settle"],
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "saga:2",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!saga.ok) throw saga.error;
    const claim = value.claimSaga({
      sagaId: saga.value.id,
      owner: "worker-a",
      nowMs: 1_000,
      leaseMs: 30_000,
      rulesetVersion: gameWorld.rulesetVersion,
    });
    if (!claim.ok) throw claim.error;
    const step0 = value.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      checkpointHash: "cp-0",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "step:0",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    });
    if (!step0.ok) throw step0.error;

    const compensated = value.compensateSaga({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      reason: "settle-failed",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "comp:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-04",
    });
    expect(compensated).toMatchObject({ ok: true, value: { status: "COMPENSATED" } });
    expect(compensated.ok && compensated.value.steps[0]!.status).toBe("COMPENSATED");

    expect(
      value.advanceSagaStep({
        sagaId: saga.value.id,
        fencingToken: claim.value.fencingToken,
        checkpointHash: "cp",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "step:after",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-05",
      }),
    ).toMatchObject({ ok: false, error: { code: "SAGA_TERMINAL" } });
  });

  it("reconstrói projeção por cursor contíguo e detecta gap", () => {
    const { gameWorld, value } = publishedEventing();
    const rebuilt = value.rebuildProjection({
      projectionId: "clubs-view",
      stream: "clubs",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "proj:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    });
    expect(rebuilt).toMatchObject({ ok: true, value: { cursor: 2 } });
    expect(
      value.snapshot().events.filter((e) => e.type === "ProjectionAdvanced"),
    ).toHaveLength(1);

    // idempotente: reconstruir para o mesmo cursor/hash não muda a revisão
    const revision = value.snapshot().revision;
    const again = value.rebuildProjection({
      projectionId: "clubs-view",
      stream: "clubs",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "proj:1:again",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    });
    expect(again).toMatchObject({ ok: true, value: { cursor: 2 } });
    expect(value.snapshot().revision).toBe(revision);

    // gap: alvo além do contíguo publicado
    expect(
      value.rebuildProjection({
        projectionId: "clubs-view",
        stream: "clubs",
        throughSequence: 5,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "proj:gap",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-03",
      }),
    ).toMatchObject({ ok: false, error: { code: "SEQUENCE_GAP" } });
  });

  it("retoma realtime por sequence/resume token e rejeita além do publicado", () => {
    const { gameWorld, value } = publishedEventing();
    const resume = value.resumeRealtimeStream({
      audience: "web",
      stream: "clubs",
      fromSequence: 1,
      expiresOn: "2026-01-10",
      rulesetVersion: gameWorld.rulesetVersion,
    });
    expect(resume).toMatchObject({ ok: true, value: { lastSequence: 1 } });
    expect(resume.ok && resume.value.resumeToken).toMatch(/^[0-9a-f]{16}$/);

    // idempotente: mesma retomada não muda a revisão
    const revision = value.snapshot().revision;
    const same = value.resumeRealtimeStream({
      audience: "web",
      stream: "clubs",
      fromSequence: 1,
      expiresOn: "2026-01-10",
      rulesetVersion: gameWorld.rulesetVersion,
    });
    expect(same).toEqual(resume);
    expect(value.snapshot().revision).toBe(revision);

    expect(
      value.resumeRealtimeStream({
        audience: "web",
        stream: "clubs",
        fromSequence: 9,
        expiresOn: "2026-01-10",
        rulesetVersion: gameWorld.rulesetVersion,
      }),
    ).toMatchObject({ ok: false, error: { code: "SEQUENCE_GAP" } });
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
