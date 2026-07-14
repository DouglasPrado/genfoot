import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldAdmin,
  WorldEventing,
  WorldLedger,
  WorldNarrative,
  type GameWorldSnapshot,
  type NarrativeClubRef,
} from "../../src/index.js";

// GP-016 · Financial crisis — convergência C9 (ledger) → C10 (narrativa). O clube
// entra em aperto financeiro: uma reserva além do disponível é recusada
// (INSUFFICIENT_FUNDS), a crise financeira é aberta e resolvida por um plano de
// austeridade — sem criar dinheiro (conservação preservada).

const CLUB = "019f0000-0000-7000-8000-0000000000c1" as NarrativeClubRef;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-016",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-016 Financial crisis (convergence)", () => {
  it("detecta o aperto financeiro, abre e resolve a crise sem criar dinheiro", () => {
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
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 500 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 500 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!funded.ok) throw funded.error;

    // C9: reservar mais do que há disponível é recusado (aperto financeiro).
    expect(
      ledger.reserveFunds({
        accountId: cash.value.id,
        purpose: "PAYROLL",
        amountMinor: 1500,
        expiresOn: "2026-02-01",
        rulesetVersion: ruleset,
        idempotencyKey: "res:payroll",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-31",
      }),
    ).toMatchObject({ ok: false, error: { code: "INSUFFICIENT_FUNDS" } });
    // A oferta monetária não muda por uma reserva recusada.
    expect(ledger.summary().residualMinor).toBe(0);

    // C10: abre e resolve a crise financeira por austeridade.
    const narrativeR = WorldNarrative.initialize(gameWorld);
    if (!narrativeR.ok) throw narrativeR.error;
    const narrative = narrativeR.value;
    const crisis = narrative.openCrisis({
      clubId: CLUB,
      cause: "CASH_SHORTFALL",
      severity: 90,
      rulesetVersion: ruleset,
      idempotencyKey: "crisis:fin",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    expect(crisis).toMatchObject({ ok: true, value: { status: "OPEN" } });
    if (!crisis.ok) throw crisis.error;
    const recovery = narrative.submitRecoveryPlan({
      crisisId: crisis.value.id,
      plan: "reduzir folha e renegociar dívidas",
      rulesetVersion: ruleset,
      idempotencyKey: "plan:fin",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-10",
    });
    expect(recovery).toMatchObject({ ok: true, value: { status: "RECOVERY" } });
    const resolved = narrative.resolveCrisis({
      crisisId: crisis.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "resolve:fin",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-01",
    });
    expect(resolved).toMatchObject({ ok: true, value: { status: "RESOLVED" } });

    // Depois da austeridade, uma reserva dentro do disponível passa.
    expect(
      ledger.reserveFunds({
        accountId: cash.value.id,
        purpose: "PAYROLL_REDUCED",
        amountMinor: 400,
        expiresOn: "2026-05-01",
        rulesetVersion: ruleset,
        idempotencyKey: "res:reduced",
        worldSeed: gameWorld.seed,
        worldDate: "2026-04-15",
      }),
    ).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(ledger.summary().residualMinor).toBe(0);
  });

  it("insolvência abre caso/sanção fair-play (C12) e consome LedgerPeriodClosed (X-002)", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;

    // C9: fecha o período contábil (o fato financeiro que dispara o consumo).
    const ledgerR = WorldLedger.initialize(gameWorld);
    if (!ledgerR.ok) throw ledgerR.error;
    const ledger = ledgerR.value;
    const period = ledger.closeAccountingPeriod({
      label: "2026-Q1",
      opensOn: "2026-01-01",
      closesOn: "2026-03-31",
      rulesetVersion: ruleset,
      idempotencyKey: "period:q1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-01",
    });
    expect(period).toMatchObject({ ok: true, value: { status: "CLOSED" } });

    // C12: a insolvência abre um caso e uma sanção de fair-play (quatro-olhos).
    const adminR = WorldAdmin.initialize(gameWorld);
    if (!adminR.ok) throw adminR.error;
    const admin = adminR.value;
    const abuseCase = admin.openCase({
      subjects: ["club:1"],
      severity: 85,
      evidenceRefs: ["ledger:q1-insolvent"],
      openedBy: "ffp-officer",
      rulesetVersion: ruleset,
      idempotencyKey: "case:ffp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-02",
    });
    expect(abuseCase).toMatchObject({ ok: true, value: { status: "OPEN" } });
    const proposed = admin.proposeSanction({
      subject: "club:1",
      sanctionType: "FAIR_PLAY_LIMIT",
      severity: 85,
      basis: "insolvency",
      evidenceRefs: ["ledger:q1-insolvent"],
      proposedBy: "ffp-officer",
      rulesetVersion: ruleset,
      idempotencyKey: "sanction:ffp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-02",
    });
    if (!proposed.ok) throw proposed.error;
    const activated = admin.approveSanction({
      sanctionId: proposed.value.id,
      approvedBy: "committee",
      rulesetVersion: ruleset,
      idempotencyKey: "sanction:ffp:approve",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-03",
    });
    expect(activated).toMatchObject({ ok: true, value: { status: "ACTIVE" } });

    // X-002: o fato LedgerPeriodClosed é transportado e a projeção reconstruída.
    const eventingR = WorldEventing.initialize(gameWorld);
    if (!eventingR.ok) throw eventingR.error;
    const eventing = eventingR.value;
    const published = eventing.publishOutboxBatch({
      stream: "finance",
      messages: [
        { eventType: "LedgerPeriodClosed", payloadHash: "q1", occurredOn: "2026-04-01" },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "finance:closed",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-01",
    });
    if (!published.ok) throw published.error;
    const projection = eventing.rebuildProjection({
      projectionId: "ffp-monitor",
      stream: "finance",
      rulesetVersion: ruleset,
      idempotencyKey: "proj:ffp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-04-01",
    });
    expect(projection).toMatchObject({ ok: true, value: { cursor: 1 } });

    // auditoria íntegra após todo o fluxo.
    expect(admin.verifyAuditChain()).toBe(true);
  });
});
