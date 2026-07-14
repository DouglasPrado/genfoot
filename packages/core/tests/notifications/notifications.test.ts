import {
  DomainError,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  ProjectNotification,
  WorldInbox,
  type GameWorldSnapshot,
  type InboxRepository,
  type NotificationPriority,
  type WorldInboxSnapshot,
} from "../../src/index.js";

class MemoryInboxRepository implements InboxRepository {
  public snapshot: WorldInboxSnapshot | null = null;

  public findInboxByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldInboxSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveInbox(
    snapshot: WorldInboxSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("INBOX_REVISION_CONFLICT", "Conflito.");
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

function world(seed = "inbox-001"): GameWorldSnapshot {
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

function inbox() {
  const gameWorld = world();
  const created = WorldInbox.initialize(gameWorld);
  if (!created.ok) throw created.error;
  return { gameWorld, value: created.value };
}

function project(
  ctx: ReturnType<typeof inbox>,
  dedupKey: string,
  priority: NotificationPriority,
) {
  return ctx.value.projectNotification({
    dedupKey,
    recipientScope: "manager:club-1",
    category: "TRANSFER",
    priority,
    sourceRef: `fact:${dedupKey}`,
    rulesetVersion: ctx.gameWorld.rulesetVersion,
    idempotencyKey: `proj:${dedupKey}`,
    worldSeed: ctx.gameWorld.seed,
    worldDate: "2026-03-01",
  });
}

describe("Notifications and history", () => {
  it("cria notificação uma vez por chave e transiciona read/dismiss", () => {
    const ctx = inbox();
    const first = project(ctx, "n1", "NORMAL");
    expect(first).toMatchObject({ ok: true, value: { status: "OPEN" } });
    const revision = ctx.value.snapshot().revision;

    const repeated = project(ctx, "n1", "NORMAL");
    expect(repeated).toEqual(first);
    expect(ctx.value.snapshot().notifications).toHaveLength(1);
    expect(ctx.value.snapshot().revision).toBe(revision);

    if (!first.ok) throw first.error;
    const read = ctx.value.markNotificationRead({
      notificationId: first.value.id,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "read:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-03-02",
    });
    expect(read).toMatchObject({ ok: true, value: { status: "READ" } });
    // idempotente: marcar lido de novo devolve READ sem novo efeito
    const readRevision = ctx.value.snapshot().revision;
    const readAgain = ctx.value.markNotificationRead({
      notificationId: first.value.id,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "read:2",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-03-03",
    });
    expect(readAgain).toMatchObject({ ok: true, value: { status: "READ" } });
    expect(ctx.value.snapshot().revision).toBe(readRevision);
  });

  it("gera digest sem itens urgentes e sem duplicar", () => {
    const ctx = inbox();
    const normal = project(ctx, "d-normal", "NORMAL");
    const high = project(ctx, "d-high", "HIGH");
    const urgent = project(ctx, "d-urgent", "URGENT");
    if (!normal.ok || !high.ok || !urgent.ok) throw new Error("falhou");

    const digest = ctx.value.buildDigest({
      recipientScope: "manager:club-1",
      fromOn: "2026-01-01",
      toOn: "2026-12-31",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "digest:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-03-05",
    });
    if (!digest.ok) throw digest.error;
    expect(digest.value.itemIds).toContain(normal.value.id);
    expect(digest.value.itemIds).toContain(high.value.id);
    expect(digest.value.itemIds).not.toContain(urgent.value.id);
    expect(new Set(digest.value.itemIds).size).toBe(digest.value.itemIds.length);
  });

  it("gera relatório reconstruível com o mesmo hash canônico", () => {
    const ctx = inbox();
    const input = (key: string) => ({
      definitionId: "season-finance",
      version: "1.0.0",
      asOf: "2026-06-30",
      sourceVersions: ["ledger@12", "clubs@8"],
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: key,
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-07-01",
    });
    const first = ctx.value.generateReport(input("rep:1"));
    const rebuilt = ctx.value.generateReport(input("rep:2"));
    if (!first.ok || !rebuilt.ok) throw new Error("falhou");
    expect(first.value.reportHash).toBe(rebuilt.value.reportHash);
    expect(first.value.reportHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("mantém timeline append-only e records idempotentes", () => {
    const ctx = inbox();
    const a = ctx.value.appendTimelineEntry({
      subject: "TITLE_WON",
      occurredOn: "2026-05-01",
      factRef: "fact:title",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
    });
    const b = ctx.value.appendTimelineEntry({
      subject: "PROMOTION",
      occurredOn: "2026-05-15",
      factRef: "fact:promo",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
    });
    expect(a).toMatchObject({ ok: true, value: { sequence: 1 } });
    expect(b).toMatchObject({ ok: true, value: { sequence: 2 } });
    // mesmo factRef não duplica
    const dup = ctx.value.appendTimelineEntry({
      subject: "TITLE_WON",
      occurredOn: "2026-05-01",
      factRef: "fact:title",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
    });
    expect(dup).toEqual(a);
    expect(ctx.value.snapshot().timeline).toHaveLength(2);

    const record = ctx.value.establishRecord({
      category: "GOALS",
      holder: "player-9",
      value: 40,
      achievedOn: "2026-05-20",
      factRef: "fact:goals",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "rec:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-05-20",
    });
    expect(record).toMatchObject({ ok: true, value: { value: 40 } });
    const revision = ctx.value.snapshot().revision;
    const repeated = ctx.value.establishRecord({
      category: "GOALS",
      holder: "player-9",
      value: 40,
      achievedOn: "2026-05-20",
      factRef: "fact:goals",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "rec:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-05-20",
    });
    expect(repeated).toEqual(record);
    expect(ctx.value.snapshot().revision).toBe(revision);
  });

  it("projeta notificação idempotente via caso de uso", async () => {
    const ctx = inbox();
    const repository = new MemoryInboxRepository();
    repository.snapshot = ctx.value.snapshot();
    const useCase = new ProjectNotification(repository);
    const input = {
      dedupKey: "uc-1",
      recipientScope: "manager:club-1",
      category: "ALERT",
      priority: "HIGH" as const,
      sourceRef: "fact:uc",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "proj:uc",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-03-01",
    };
    const first = await useCase.execute(ctx.gameWorld.id, input);
    const revision = repository.snapshot.revision;
    const repeated = await useCase.execute(ctx.gameWorld.id, input);

    expect(first).toMatchObject({ ok: true, value: { status: "OPEN" } });
    expect(repeated).toEqual(first);
    expect(repository.snapshot.revision).toBe(revision);
    expect(repository.snapshot.notifications).toHaveLength(1);
  });

  it("gera digest idempotente por chave (sem evento/revisão duplicados)", () => {
    const ctx = inbox();
    project(ctx, "d1", "NORMAL");
    const args = {
      recipientScope: "manager:club-1",
      fromOn: "2026-01-01",
      toOn: "2026-12-31",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "digest:once",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-03-05",
    };
    const first = ctx.value.buildDigest(args);
    const revision = ctx.value.snapshot().revision;
    const repeated = ctx.value.buildDigest(args);

    expect(first).toEqual(repeated);
    expect(ctx.value.snapshot().revision).toBe(revision);
    expect(
      ctx.value.snapshot().events.filter((e) => e.type === "DigestReady"),
    ).toHaveLength(1);
  });
});
