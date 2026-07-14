import {
  newEntityId,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  AbortInfrastructureProject,
  GameWorld,
  InitializeClubPortfolio,
  ResumeInfrastructureProject,
  StartInfrastructureProject,
  WorldGenesisGenerator,
  WorldInbox,
  WorldLedger,
  type ClubPortfolioRepository,
  type GameWorldSnapshot,
  type InfrastructureFinancingPort,
  type InfrastructureLicensingPort,
  type WorldClubPortfolioSnapshot,
} from "../../src/index.js";
import {
  activeWorldSnapshot,
  schedulingWorldId,
} from "../helpers/scheduling-fixtures.js";

class MemoryClubRepository implements ClubPortfolioRepository {
  public snapshot: WorldClubPortfolioSnapshot | null = null;
  public findClubPortfolioByWorldId() {
    return Promise.resolve(structuredClone(this.snapshot));
  }
  public findClubCommandReceipt() {
    return Promise.resolve(null);
  }
  public saveClubPortfolio(
    snapshot: WorldClubPortfolioSnapshot,
    expectedRevision: number | null,
  ) {
    if (
      expectedRevision !== null &&
      this.snapshot?.revision !== expectedRevision
    )
      throw new Error("revision conflict");
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

// GP-014 · Infrastructure project — convergência C9 (financiamento por fases) +
// C11 (registro de conclusão). A obra (SAGA-04 é owner em C3) é financiada em
// parcelas: cada fase reserva e liquida fundos; a conservação é preservada e a
// conclusão vira um record histórico. A saga de obra em si é do C3.

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-014",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-014 Infrastructure project (convergence)", () => {
  it("financia a obra em parcelas com conservação e registra a conclusão", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const ledgerR = WorldLedger.initialize(gameWorld);
    if (!ledgerR.ok) throw ledgerR.error;
    const ledger = ledgerR.value;

    const cash = ledger.openLedgerAccount({
      name: "Caixa",
      type: "ASSET",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:cash",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    const faucet = ledger.openLedgerAccount({
      name: "Injeção",
      type: "FAUCET",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:faucet",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!cash.ok || !faucet.ok) throw new Error("contas");
    const funded = ledger.postTransaction({
      transactionClass: "SEASON_INJECTION",
      occurredOn: "2026-01-02",
      entries: [
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 6000 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 6000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!funded.ok) throw funded.error;

    // Três parcelas da obra: reservar e liquidar cada fase.
    const phases = [
      { key: "foundation", amount: 2000, on: "2026-02-01" },
      { key: "structure", amount: 2000, on: "2026-03-01" },
      { key: "finishing", amount: 1000, on: "2026-04-01" },
    ];
    for (const phase of phases) {
      const reservation = ledger.reserveFunds({
        accountId: cash.value.id,
        purpose: `PROJECT:${phase.key}`,
        amountMinor: phase.amount,
        expiresOn: phase.on,
        rulesetVersion: ruleset,
        idempotencyKey: `res:${phase.key}`,
        worldSeed: gameWorld.seed,
        worldDate: phase.on,
      });
      if (!reservation.ok) throw reservation.error;
      const settled = ledger.settleReservation({
        reservationId: reservation.value.id,
        rulesetVersion: ruleset,
        idempotencyKey: `settle:${phase.key}`,
        worldSeed: gameWorld.seed,
        worldDate: phase.on,
      });
      expect(settled).toMatchObject({ ok: true, value: { status: "SETTLED" } });
    }

    // Todas as reservas liquidadas; disponível volta ao saldo pleno; conservação.
    expect(ledger.availableBalance(cash.value.id)).toBe(6000);
    expect(ledger.summary().activeReservationCount).toBe(0);
    expect(ledger.summary().residualMinor).toBe(0);

    // C11: conclusão da obra registrada na memória (idempotente).
    const inboxR = WorldInbox.initialize(gameWorld);
    if (!inboxR.ok) throw inboxR.error;
    const inbox = inboxR.value;
    const record = inbox.establishRecord({
      category: "INFRASTRUCTURE_COMPLETED",
      holder: "club-1:stadium-expansion",
      value: 5000,
      achievedOn: "2026-04-01",
      factRef: "project:stadium-expansion",
      rulesetVersion: ruleset,
      idempotencyKey: "record:project",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-01",
    });
    expect(record).toMatchObject({
      ok: true,
      value: { category: "INFRASTRUCTURE_COMPLETED" },
    });
  });

  it("orquestra a SAGA-04 (C3) com liquidações por milestone (C9) e compensação", async () => {
    const repository = new MemoryClubRepository();
    const gameWorld = activeWorldSnapshot(schedulingWorldId());
    const ruleset = gameWorld.rulesetVersion;
    const genesis = new WorldGenesisGenerator().generate(gameWorld);
    const initialized = await new InitializeClubPortfolio(repository).execute(
      gameWorld,
      genesis,
    );
    if (!initialized.ok) throw initialized.error;
    const club = initialized.value.clubs[0]!;

    // C9: caixa financiado; a obra terá liquidações por milestone e receita da capacidade.
    const ledgerR = WorldLedger.initialize(gameWorld);
    if (!ledgerR.ok) throw ledgerR.error;
    const ledger = ledgerR.value;
    const cash = ledger.openLedgerAccount({
      name: "Caixa",
      type: "ASSET",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:cash",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    const faucet = ledger.openLedgerAccount({
      name: "Injeção",
      type: "FAUCET",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:faucet",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    const works = ledger.openLedgerAccount({
      name: "Obras",
      type: "SINK",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:works",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!cash.ok || !faucet.ok || !works.ok) throw new Error("contas");
    const funded = ledger.postTransaction({
      transactionClass: "SEASON_INJECTION",
      occurredOn: "2026-01-01",
      entries: [
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 30_000 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 30_000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!funded.ok) throw funded.error;

    // C3: inicia a obra do estádio com um milestone e a conduz até COMPLETED.
    const started = await new StartInfrastructureProject(repository).execute({
      id: newEntityId<"InfrastructureProject">(),
      gameWorldId: gameWorld.id,
      clubId: club.id,
      expectedClubVersion: 1,
      rulesetVersion: ruleset,
      commandId: "gp014-command",
      idempotencyKey: "gp014:project",
      actorId: "board:1",
      proposedAt: "2026-01-01",
      target: {
        kind: "STADIUM_CAPACITY",
        reference: club.stadium.id,
        targetValue: 25_000,
      },
      fundingRequestRef: "funding:gp014",
      milestones: [
        { id: "M1", name: "Fundações", dueOn: "2026-01-02", amountMinor: 10_000 },
      ],
      maxAttemptsPerStep: 3,
    });
    if (!started.ok) throw started.error;

    const calls: string[] = [];
    const financing: InfrastructureFinancingPort = {
      reserve: (context) => {
        calls.push(context.idempotencyKey);
        return Promise.resolve({ reservationRef: "reservationRef:1" });
      },
      disburseMilestone: (context) => {
        calls.push(context.idempotencyKey);
        // C9: cada liquidação de milestone é uma transação balanceada (sai do caixa).
        const posted = ledger.postTransaction({
          transactionClass: "PROJECT_MILESTONE",
          occurredOn: "2026-01-02",
          entries: [
            { accountId: works.value.id, direction: "DEBIT", amountMinor: 10_000 },
            { accountId: cash.value.id, direction: "CREDIT", amountMinor: 10_000 },
          ],
          rulesetVersion: ruleset,
          idempotencyKey: `ledger:${context.idempotencyKey}`,
          worldSeed: gameWorld.seed,
          worldDate: "2026-01-02",
        });
        if (!posted.ok) throw posted.error;
        return Promise.resolve({ disbursementRef: "disbursementRef:1" });
      },
      releaseRemainder: (context) => {
        calls.push(context.idempotencyKey);
        return Promise.resolve({ releaseFactRef: "releaseFactRef:1" });
      },
    };
    const licensing: InfrastructureLicensingPort = {
      inspect: (context) => {
        calls.push(context.idempotencyKey);
        return Promise.resolve({ approved: true, inspectionRef: "license:1" });
      },
    };
    const resumed = await new ResumeInfrastructureProject(
      repository,
      financing,
      licensing,
      "worker-a",
      () => 1_000,
    ).execute(gameWorld.id, started.value.id, "2026-01-02");
    expect(resumed).toMatchObject({ ok: true, value: { status: "COMPLETED" } });

    // Impacto da obra: capacidade do estádio subiu.
    expect(repository.snapshot?.clubs[0]?.stadium.capacity).toBe(25_000);
    // SAGA-04 emitiu os fatos de obra do contrato C3.
    const types = new Set(repository.snapshot!.events.map((e) => e.type));
    for (const expected of [
      "InfrastructureProjectProposed",
      "StadiumWorksApproved",
      "FinancialReservationAcknowledged",
      "ConstructionMilestoneReached",
      "FacilityLicensed",
      "StadiumWorksCompleted",
    ]) {
      expect(types.has(expected)).toBe(true);
    }
    // Ports idempotentes: cada idempotencyKey foi único.
    expect(new Set(calls).size).toBe(calls.length);

    // C9: a nova capacidade gera receita de bilheteria (transação balanceada).
    const revenue = ledger.postTransaction({
      transactionClass: "GATE_REVENUE",
      occurredOn: "2026-02-01",
      entries: [
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 4_000 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 4_000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:gate",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!revenue.ok) throw revenue.error;
    // conservação monetária preservada após toda a obra + receita.
    expect(ledger.summary().residualMinor).toBe(0);

    // T004: uma segunda obra é abortada → ProjectCancelled + compensação financeira balanceada.
    const second = await new StartInfrastructureProject(repository).execute({
      id: newEntityId<"InfrastructureProject">(),
      gameWorldId: gameWorld.id,
      clubId: repository.snapshot!.clubs[0]!.id,
      expectedClubVersion: repository.snapshot!.clubs[0]!.version,
      rulesetVersion: ruleset,
      commandId: "gp014-abort-command",
      idempotencyKey: "gp014:project:abort",
      actorId: "board:1",
      proposedAt: "2026-03-01",
      target: {
        kind: "DEPARTMENT_LEVEL",
        reference: repository.snapshot!.clubs[0]!.departments[0]!.kind,
        targetValue: 5,
      },
      fundingRequestRef: "funding:gp014:abort",
      milestones: [
        { id: "M1", name: "Início", dueOn: "2026-03-02", amountMinor: 8_000 },
      ],
      maxAttemptsPerStep: 3,
    });
    if (!second.ok) throw second.error;
    const aborted = await new AbortInfrastructureProject(
      repository,
      financing,
      "worker-b",
      () => 2_000,
    ).execute(gameWorld.id, second.value.id, "board-cancelou");
    if (!aborted.ok) throw aborted.error;
    expect(
      repository.snapshot!.events.some((e) => e.type === "ProjectCancelled"),
    ).toBe(true);
    // compensação financeira balanceada (devolve o reservado ao caixa).
    const compensation = ledger.postTransaction({
      transactionClass: "PROJECT_COMPENSATION",
      occurredOn: "2026-03-05",
      entries: [
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 8_000 },
        { accountId: works.value.id, direction: "CREDIT", amountMinor: 8_000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:compensation",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-05",
    });
    if (!compensation.ok) throw compensation.error;
    expect(ledger.summary().residualMinor).toBe(0);
  });
});
