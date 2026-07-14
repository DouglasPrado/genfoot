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
  ProposeSanction,
  WorldAdmin,
  type GameWorldSnapshot,
  type AdminRepository,
  type WorldAdminSnapshot,
} from "../../src/index.js";

class MemoryAdminRepository implements AdminRepository {
  public snapshot: WorldAdminSnapshot | null = null;

  public findAdminByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldAdminSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveAdmin(
    snapshot: WorldAdminSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("ADMIN_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

const SUBJECT = "account:suspect-1";

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "admin-001"): GameWorldSnapshot {
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

function admin() {
  const gameWorld = world();
  const created = WorldAdmin.initialize(gameWorld);
  if (!created.ok) throw created.error;
  return { gameWorld, value: created.value };
}

function signal(
  ctx: ReturnType<typeof admin>,
  dedupKey: string,
  weight: number,
) {
  return ctx.value.recordRiskSignal({
    dedupKey,
    subject: SUBJECT,
    kind: "MULTI_ACCOUNT",
    weight,
    source: "heuristic",
    observedOn: "2026-02-01",
    actor: "system",
    rulesetVersion: ctx.gameWorld.rulesetVersion,
    idempotencyKey: `sig:${dedupKey}`,
    worldSeed: ctx.gameWorld.seed,
    worldDate: "2026-02-01",
  });
}

function proposedSevere(ctx: ReturnType<typeof admin>) {
  return ctx.value.proposeSanction({
    subject: SUBJECT,
    sanctionType: "SUSPENSION",
    severity: 80,
    basis: "collusion",
    evidenceRefs: ["case:1"],
    proposedBy: "analyst:A",
    rulesetVersion: ctx.gameWorld.rulesetVersion,
    idempotencyKey: "sanction:1",
    worldSeed: ctx.gameWorld.seed,
    worldDate: "2026-02-05",
  });
}

describe("Anti-abuse and admin", () => {
  it("consolida sinais versionados, atinge o limiar e é idempotente por chave", () => {
    const ctx = admin();
    const low = signal(ctx, "s1", 40);
    expect(low).toMatchObject({ ok: true, value: { score: 40, flagged: false } });

    const high = signal(ctx, "s2", 40);
    expect(high).toMatchObject({ ok: true, value: { score: 80, flagged: true } });
    expect(
      ctx.value.snapshot().events.some((e) => e.type === "RiskThresholdReached"),
    ).toBe(true);

    const revision = ctx.value.snapshot().revision;
    const duplicate = signal(ctx, "s2", 40);
    expect(duplicate).toMatchObject({ ok: true, value: { score: 80 } });
    expect(ctx.value.snapshot().revision).toBe(revision);
    expect(ctx.value.snapshot().signals).toHaveLength(2);
    expect(ctx.value.verifyAuditChain()).toBe(true);
  });

  it("exige evidência para sanção grave e aprovação por quatro olhos", () => {
    const ctx = admin();
    expect(
      ctx.value.proposeSanction({
        subject: SUBJECT,
        sanctionType: "BAN",
        severity: 90,
        basis: "cheating",
        evidenceRefs: [],
        proposedBy: "analyst:A",
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "sanction:noev",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-02-05",
      }),
    ).toMatchObject({ ok: false, error: { code: "EVIDENCE_INSUFFICIENT" } });

    const proposed = proposedSevere(ctx);
    expect(proposed).toMatchObject({ ok: true, value: { status: "PROPOSED" } });
    if (!proposed.ok) throw proposed.error;

    expect(
      ctx.value.approveSanction({
        sanctionId: proposed.value.id,
        approvedBy: "analyst:A",
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "approve:self",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-02-06",
      }),
    ).toMatchObject({ ok: false, error: { code: "SEGREGATION_CONFLICT" } });

    const approved = ctx.value.approveSanction({
      sanctionId: proposed.value.id,
      approvedBy: "manager:B",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "approve:ok",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-06",
    });
    expect(approved).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(
      ctx.value.snapshot().events.some((e) => e.type === "SanctionActivated"),
    ).toBe(true);
    expect(ctx.value.verifyAuditChain()).toBe(true);
  });

  it("permite recurso independente que reverte a sanção", () => {
    const ctx = admin();
    const proposed = proposedSevere(ctx);
    if (!proposed.ok) throw proposed.error;
    const approved = ctx.value.approveSanction({
      sanctionId: proposed.value.id,
      approvedBy: "manager:B",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "approve:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-06",
    });
    if (!approved.ok) throw approved.error;

    const filed = ctx.value.fileAppeal({
      sanctionId: proposed.value.id,
      grounds: "identidade equivocada",
      appellant: SUBJECT,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "appeal:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-07",
    });
    expect(filed).toMatchObject({ ok: true, value: { appealStatus: "FILED" } });

    expect(
      ctx.value.decideAppeal({
        sanctionId: proposed.value.id,
        upheld: true,
        reviewer: "analyst:A",
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "decide:self",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-02-10",
      }),
    ).toMatchObject({ ok: false, error: { code: "SEGREGATION_CONFLICT" } });

    const reversed = ctx.value.decideAppeal({
      sanctionId: proposed.value.id,
      upheld: true,
      reviewer: "ombuds:C",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "decide:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-10",
    });
    expect(reversed).toMatchObject({
      ok: true,
      value: { status: "REVERSED", appealStatus: "UPHELD" },
    });
    expect(
      ctx.value.snapshot().events.some((e) => e.type === "SanctionReversed"),
    ).toBe(true);
    expect(ctx.value.verifyAuditChain()).toBe(true);
  });

  it("detecta adulteração na cadeia de auditoria", () => {
    const ctx = admin();
    signal(ctx, "s1", 40);
    const snapshot = ctx.value.snapshot();
    const tampered = {
      ...snapshot,
      auditChain: snapshot.auditChain.map((entry) =>
        entry.sequence === 1 ? { ...entry, actor: "attacker" } : entry,
      ),
    };
    expect(WorldAdmin.fromSnapshot(tampered)).toMatchObject({
      ok: false,
      error: { code: "AUDIT_CHAIN_INVALID" },
    });
  });

  it("propõe sanção idempotente via caso de uso", async () => {
    const ctx = admin();
    const repository = new MemoryAdminRepository();
    repository.snapshot = ctx.value.snapshot();
    const useCase = new ProposeSanction(repository);
    const input = {
      subject: SUBJECT,
      sanctionType: "SUSPENSION",
      severity: 80,
      basis: "collusion",
      evidenceRefs: ["case:1"],
      proposedBy: "analyst:A",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "sanction:uc",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-05",
    };
    const first = await useCase.execute(ctx.gameWorld.id, input);
    const revision = repository.snapshot.revision;
    const repeated = await useCase.execute(ctx.gameWorld.id, input);

    expect(first).toMatchObject({ ok: true, value: { status: "PROPOSED" } });
    expect(repeated).toEqual(first);
    expect(repository.snapshot.revision).toBe(revision);
    expect(repository.snapshot.sanctions).toHaveLength(1);
  });

  it("abre caso e coloca quarentena com escopo", () => {
    const ctx = admin();
    const abuseCase = ctx.value.openCase({
      subjects: [SUBJECT],
      severity: 75,
      evidenceRefs: ["ev:1"],
      openedBy: "mod:A",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "case:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-05",
    });
    expect(abuseCase).toMatchObject({ ok: true, value: { status: "OPEN" } });
    if (!abuseCase.ok) throw abuseCase.error;
    expect(
      ctx.value.snapshot().events.filter((e) => e.type === "CaseOpened"),
    ).toHaveLength(1);

    const quarantine = ctx.value.placeQuarantine({
      caseId: abuseCase.value.id,
      scope: SUBJECT,
      reason: "collusion",
      startsOn: "2026-02-05",
      expiresOn: "2026-02-12",
      placedBy: "mod:A",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "quar:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-05",
    });
    expect(quarantine).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(
      ctx.value.snapshot().events.filter((e) => e.type === "QuarantinePlaced"),
    ).toHaveLength(1);
    // quarentena com caso inexistente é rejeitada
    expect(
      ctx.value.placeQuarantine({
        caseId: newGameWorldId(),
        scope: SUBJECT,
        reason: "x",
        startsOn: "2026-02-05",
        expiresOn: "2026-02-12",
        placedBy: "mod:A",
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "quar:bad",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-02-05",
      }),
    ).toMatchObject({ ok: false, error: { code: "CASE_NOT_FOUND" } });
  });

  it("solicita e aprova correção compensatória com quatro-olhos", () => {
    const ctx = admin();
    const correction = ctx.value.requestCorrection({
      targetOwner: "C9",
      targetId: "ledger-tx:9",
      targetVersion: 3,
      reasonCode: "DOUBLE_POST",
      expectedEffect: "reverse-entry",
      requestedBy: "mod:A",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "corr:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-05",
    });
    expect(correction).toMatchObject({ ok: true, value: { status: "REQUESTED" } });
    if (!correction.ok) throw correction.error;

    // o mesmo autor não aprova (segregação)
    expect(
      ctx.value.approveCorrection({
        correctionId: correction.value.id,
        approvedBy: "mod:A",
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "corr:1:self",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-02-06",
      }),
    ).toMatchObject({ ok: false, error: { code: "SEGREGATION_CONFLICT" } });

    const approved = ctx.value.approveCorrection({
      correctionId: correction.value.id,
      approvedBy: "mod:B",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "corr:1:approve",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-06",
    });
    expect(approved).toMatchObject({ ok: true, value: { status: "EXECUTED" } });
    expect(approved.ok && approved.value.compensatingFactRef).not.toBeNull();
    expect(
      ctx.value.snapshot().events.filter((e) => e.type === "CorrectionApproved"),
    ).toHaveLength(1);
    expect(
      ctx.value.snapshot().events.filter((e) => e.type === "CorrectionExecuted"),
    ).toHaveLength(1);
  });

  it("reprocessa a DLQ com guarda de integridade de auditoria e idempotência", () => {
    const ctx = admin();
    // registra um sinal para ter uma cadeia de auditoria não vazia
    const first = signal(ctx, "d1", 10);
    if (!first.ok) throw first.error;
    const head = ctx.value.auditHead();

    // head divergente → AuditIntegrityFailed + aborta
    expect(
      ctx.value.requestReprocessing({
        stream: "ledger",
        fromSequence: 1,
        toSequence: 5,
        reason: "poison-message",
        requestedBy: "ops:A",
        expectedAuditHead: "WRONG",
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "rep:bad",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-02-06",
      }),
    ).toMatchObject({ ok: false, error: { code: "AUDIT_CHAIN_INVALID" } });
    expect(
      ctx.value.snapshot().events.filter((e) => e.type === "AuditIntegrityFailed"),
    ).toHaveLength(1);

    const reprocessed = ctx.value.requestReprocessing({
      stream: "ledger",
      fromSequence: 1,
      toSequence: 5,
      reason: "poison-message",
      requestedBy: "ops:A",
      expectedAuditHead: head,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "rep:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-06",
    });
    expect(reprocessed).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
    expect(
      ctx.value.snapshot().events.filter((e) => e.type === "ReprocessingCompleted"),
    ).toHaveLength(1);

    // retry idempotente (poison message não duplica)
    const revision = ctx.value.snapshot().revision;
    const retry = ctx.value.requestReprocessing({
      stream: "ledger",
      fromSequence: 1,
      toSequence: 5,
      reason: "poison-message",
      requestedBy: "ops:A",
      expectedAuditHead: ctx.value.auditHead(),
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "rep:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-06",
    });
    expect(retry).toMatchObject({ ok: true });
    expect(ctx.value.snapshot().revision).toBe(revision);
  });

  it("abre e resolve caso de suporte com PII minimizada", () => {
    const ctx = admin();
    const supportCase = ctx.value.openSupportCase({
      requester: "account:z",
      category: "PAYMENT",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "sup:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-05",
    });
    expect(supportCase).toMatchObject({ ok: true, value: { status: "OPEN" } });
    if (!supportCase.ok) throw supportCase.error;

    const resolved = ctx.value.resolveSupportCase({
      supportCaseId: supportCase.value.id,
      resolution: "refunded",
      resolvedBy: "support:A",
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "sup:1:resolve",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-02-06",
    });
    expect(resolved).toMatchObject({ ok: true, value: { status: "RESOLVED" } });
    // audit chain permanece íntegra após todo o fluxo
    expect(ctx.value.verifyAuditChain()).toBe(true);
  });
});
