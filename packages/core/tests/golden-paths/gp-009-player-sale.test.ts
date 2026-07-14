import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldEventing,
  WorldLedger,
  WorldMarket,
  type GameWorldSnapshot,
  type MarketClubRef,
  type MarketPersonRef,
  type MarketPlayerRef,
} from "../../src/index.js";

// GP-009 · Player sale — convergência C6 (vínculo) + C9 (ledger). O clube vende:
// encerra o vínculo atual, o comprador ativa um novo (um único vínculo ativo) e
// a taxa transita entre os caixas com conservação (dinheiro não é criado/destruído).

const PLAYER = "019f0000-0000-7000-8000-0000000000p1" as MarketPlayerRef;
const PERSON = "019f0000-0000-7000-8000-0000000000e1" as MarketPersonRef;
const SELLER = "019f0000-0000-7000-8000-0000000000s1" as MarketClubRef;
const BUYER = "019f0000-0000-7000-8000-0000000000b1" as MarketClubRef;
const FEE = 1200;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-009",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-009 Player sale (convergence)", () => {
  it("transfere o vínculo do vendedor ao comprador com caixa conservado", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const marketR = WorldMarket.initialize(gameWorld);
    const ledgerR = WorldLedger.initialize(gameWorld);
    if (!marketR.ok) throw marketR.error;
    if (!ledgerR.ok) throw ledgerR.error;
    const market = marketR.value;
    const ledger = ledgerR.value;

    // O jogador já pertence ao vendedor (vínculo ativo).
    const original = market.activateContract({
      personId: PERSON,
      playerId: PLAYER,
      clubId: SELLER,
      feeMinor: 0,
      wageMinor: 40,
      startsOn: "2025-07-01",
      endsOn: "2027-06-30",
      kind: "PERMANENT",
      rulesetVersion: ruleset,
      idempotencyKey: "contract:seller",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!original.ok) throw original.error;
    expect(market.activeLinkFor(PLAYER)!.clubId).toBe(SELLER);

    // C9: caixas dos dois clubes, comprador financiado.
    const buyerCash = ledger.openLedgerAccount({
      name: "Caixa comprador",
      type: "ASSET",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:buyer",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    const sellerCash = ledger.openLedgerAccount({
      name: "Caixa vendedor",
      type: "ASSET",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:seller",
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
    if (!buyerCash.ok || !sellerCash.ok || !faucet.ok) throw new Error("contas");
    const funded = ledger.postTransaction({
      transactionClass: "SEASON_INJECTION",
      occurredOn: "2026-01-02",
      entries: [
        { accountId: buyerCash.value.id, direction: "DEBIT", amountMinor: 5000 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 5000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!funded.ok) throw funded.error;

    // A taxa transita do comprador ao vendedor (transfer, não faucet/sink).
    const feeTransfer = ledger.postTransaction({
      transactionClass: "TRANSFER_FEE",
      occurredOn: "2026-01-10",
      entries: [
        { accountId: sellerCash.value.id, direction: "DEBIT", amountMinor: FEE },
        { accountId: buyerCash.value.id, direction: "CREDIT", amountMinor: FEE },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fee",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    if (!feeTransfer.ok) throw feeTransfer.error;

    // C6: encerra o vínculo com o vendedor e ativa o do comprador (único ativo).
    const terminated = market.terminateContract({
      contractId: original.value.id,
      endedOn: "2026-01-10",
      rulesetVersion: ruleset,
      idempotencyKey: "terminate:seller",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    expect(terminated).toMatchObject({ ok: true, value: { status: "TERMINATED" } });
    const bought = market.activateContract({
      personId: PERSON,
      playerId: PLAYER,
      clubId: BUYER,
      feeMinor: FEE,
      wageMinor: 60,
      startsOn: "2026-01-11",
      endsOn: "2029-06-30",
      kind: "PERMANENT",
      rulesetVersion: ruleset,
      idempotencyKey: "contract:buyer",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-11",
    });
    expect(bought).toMatchObject({ ok: true, value: { status: "ACTIVE" } });

    // Resultado: um único vínculo ativo (comprador) e caixas conservados.
    expect(market.activeLinkFor(PLAYER)!.clubId).toBe(BUYER);
    expect(market.summary().activeLinkCount).toBe(1);
    expect(ledger.accountBalance(buyerCash.value.id)).toBe(5000 - FEE);
    expect(ledger.accountBalance(sellerCash.value.id)).toBe(FEE);
    expect(ledger.summary().residualMinor).toBe(0);
  });

  it("vende via SAGA X-002: libera vínculo, liquida com sell-on e conclui", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const marketR = WorldMarket.initialize(gameWorld);
    const ledgerR = WorldLedger.initialize(gameWorld);
    const eventingR = WorldEventing.initialize(gameWorld);
    if (!marketR.ok) throw marketR.error;
    if (!ledgerR.ok) throw ledgerR.error;
    if (!eventingR.ok) throw eventingR.error;
    const market = marketR.value;
    const ledger = ledgerR.value;
    const eventing = eventingR.value;

    // C6: o jogador pertence ao vendedor.
    const original = market.activateContract({
      personId: PERSON,
      playerId: PLAYER,
      clubId: SELLER,
      feeMinor: 0,
      wageMinor: 40,
      startsOn: "2025-07-01",
      endsOn: "2027-06-30",
      kind: "PERMANENT",
      rulesetVersion: ruleset,
      idempotencyKey: "contract:seller",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!original.ok) throw original.error;

    // C9: caixas + faucet + fundo de imposto/sell-on (SINK).
    const buyerCash = ledger.openLedgerAccount({
      name: "Caixa comprador",
      type: "ASSET",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:buyer",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    const sellerCash = ledger.openLedgerAccount({
      name: "Caixa vendedor",
      type: "ASSET",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:seller",
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
    const levy = ledger.openLedgerAccount({
      name: "Fisco/Sell-on",
      type: "SINK",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:levy",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!buyerCash.ok || !sellerCash.ok || !faucet.ok || !levy.ok)
      throw new Error("contas");
    const funded = ledger.postTransaction({
      transactionClass: "SEASON_INJECTION",
      occurredOn: "2026-01-02",
      entries: [
        { accountId: buyerCash.value.id, direction: "DEBIT", amountMinor: 5000 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 5000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!funded.ok) throw funded.error;

    // X-002: a venda roda como saga durável.
    const saga = eventing.startSaga({
      sagaType: "SAGA-SALE",
      correlationKey: `sale:${PLAYER}`,
      steps: ["release", "settle", "deregister"],
      rulesetVersion: ruleset,
      idempotencyKey: "sale:saga",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-09",
    });
    if (!saga.ok) throw saga.error;
    const claim = eventing.claimSaga({
      sagaId: saga.value.id,
      owner: "sale-worker",
      nowMs: 1_000,
      leaseMs: 60_000,
      rulesetVersion: ruleset,
    });
    if (!claim.ok) throw claim.error;
    const token = claim.value.fencingToken;

    // Passo release: C6 encerra o vínculo do vendedor.
    const terminated = market.terminateContract({
      contractId: original.value.id,
      endedOn: "2026-01-10",
      rulesetVersion: ruleset,
      idempotencyKey: "terminate:seller",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    if (!terminated.ok) throw terminated.error;
    const s1 = eventing.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: token,
      checkpointHash: "release-ok",
      rulesetVersion: ruleset,
      idempotencyKey: "sale:release",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    if (!s1.ok) throw s1.error;

    // Passo settle: C9 paga o vendedor e retém sell-on/imposto (ambas balanceadas).
    const fee = ledger.postTransaction({
      transactionClass: "TRANSFER_FEE",
      occurredOn: "2026-01-10",
      entries: [
        { accountId: sellerCash.value.id, direction: "DEBIT", amountMinor: FEE },
        { accountId: buyerCash.value.id, direction: "CREDIT", amountMinor: FEE },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fee",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    if (!fee.ok) throw fee.error;
    const sellOn = ledger.postTransaction({
      transactionClass: "SELL_ON_LEVY",
      occurredOn: "2026-01-10",
      entries: [
        { accountId: levy.value.id, direction: "DEBIT", amountMinor: 120 },
        { accountId: sellerCash.value.id, direction: "CREDIT", amountMinor: 120 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:sellon",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    if (!sellOn.ok) throw sellOn.error;
    const s2 = eventing.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: token,
      checkpointHash: "settle-ok",
      rulesetVersion: ruleset,
      idempotencyKey: "sale:settle",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    if (!s2.ok) throw s2.error;

    // Passo deregister (C7 desinscrição, conceitual) → conclui a saga.
    const s3 = eventing.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: token,
      checkpointHash: "deregister-ok",
      rulesetVersion: ruleset,
      idempotencyKey: "sale:deregister",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-11",
    });
    expect(s3).toMatchObject({ ok: true, value: { status: "COMPLETED" } });

    // O vendedor não tem mais vínculo ativo; caixa conservado (residual 0).
    expect(market.activeLinkFor(PLAYER)).toBeNull();
    expect(eventing.findSaga(saga.value.id)!.status).toBe("COMPLETED");
    expect(ledger.summary().residualMinor).toBe(0);
    expect(ledger.accountBalance(sellerCash.value.id)).toBe(FEE - 120);
  });

  it("compensa a venda após falha pós-liberação sem desbalancear o ledger", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const ledgerR = WorldLedger.initialize(gameWorld);
    const eventingR = WorldEventing.initialize(gameWorld);
    if (!ledgerR.ok) throw ledgerR.error;
    if (!eventingR.ok) throw eventingR.error;
    const ledger = ledgerR.value;
    const eventing = eventingR.value;

    const buyerCash = ledger.openLedgerAccount({
      name: "Caixa comprador",
      type: "ASSET",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:buyer",
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
    if (!buyerCash.ok || !faucet.ok) throw new Error("contas");
    const funded = ledger.postTransaction({
      transactionClass: "SEASON_INJECTION",
      occurredOn: "2026-01-02",
      entries: [
        { accountId: buyerCash.value.id, direction: "DEBIT", amountMinor: 5000 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 5000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!funded.ok) throw funded.error;

    const saga = eventing.startSaga({
      sagaType: "SAGA-SALE",
      correlationKey: `sale:${PLAYER}:comp`,
      steps: ["release", "settle", "deregister"],
      rulesetVersion: ruleset,
      idempotencyKey: "sale:saga:comp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-09",
    });
    if (!saga.ok) throw saga.error;
    const claim = eventing.claimSaga({
      sagaId: saga.value.id,
      owner: "sale-worker",
      nowMs: 1_000,
      leaseMs: 60_000,
      rulesetVersion: ruleset,
    });
    if (!claim.ok) throw claim.error;
    const s1 = eventing.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      checkpointHash: "release-ok",
      rulesetVersion: ruleset,
      idempotencyKey: "sale:release",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    if (!s1.ok) throw s1.error;

    // Falha no settle → compensa a saga; sem liquidação, o ledger segue balanceado.
    const compensated = eventing.compensateSaga({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      reason: "settle-failed",
      rulesetVersion: ruleset,
      idempotencyKey: "sale:comp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-11",
    });
    expect(compensated).toMatchObject({ ok: true, value: { status: "COMPENSATED" } });
    expect(ledger.summary().residualMinor).toBe(0);
  });
});
