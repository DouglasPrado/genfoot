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

// GP-008 · Player signing — convergência C6 (mercado/contrato) + C9 (ledger). O
// clube descobre (scouting), negocia (oferta versionada), reserva e liquida os
// fundos (dinheiro conservado) e ativa o contrato/vínculo — um único vínculo,
// uma liquidação balanceada, cada owner aplicando só a sua mudança.

const PLAYER = "019f0000-0000-7000-8000-0000000000p1" as MarketPlayerRef;
const PERSON = "019f0000-0000-7000-8000-0000000000e1" as MarketPersonRef;
const BUYER = "019f0000-0000-7000-8000-0000000000b1" as MarketClubRef;
const SELLER = "019f0000-0000-7000-8000-0000000000s1" as MarketClubRef;
const FEE = 1000;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-008",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-008 Player signing (convergence)", () => {
  it("descobre, negocia, liquida e assina com um único vínculo e caixa balanceado", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;

    // C9: caixa do comprador financiado por um faucet (dinheiro entra na oferta).
    const ledgerR = WorldLedger.initialize(gameWorld);
    if (!ledgerR.ok) throw ledgerR.error;
    const ledger = ledgerR.value;
    const cash = ledger.openLedgerAccount({
      name: "Caixa comprador",
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
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 5000 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 5000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!funded.ok) throw funded.error;

    // C6: scouting → negociação versionada → aceite.
    const marketR = WorldMarket.initialize(gameWorld);
    if (!marketR.ok) throw marketR.error;
    const market = marketR.value;
    const scouting = market.requestScouting({
      playerId: PLAYER,
      observerClubId: BUYER,
      scoutingCapacity: 80,
      observations: ["finalização"],
      validUntil: "2026-06-01",
      rulesetVersion: ruleset,
      idempotencyKey: "scout:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    expect(scouting).toMatchObject({ ok: true, value: { confidence: 80 } });
    const negotiation = market.openNegotiation({
      playerId: PLAYER,
      buyerClubId: BUYER,
      sellerClubId: SELLER,
      rulesetVersion: ruleset,
      idempotencyKey: "neg:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    if (!negotiation.ok) throw negotiation.error;
    const offered = market.submitOffer({
      negotiationId: negotiation.value.id,
      createdByClubId: BUYER,
      feeMinor: FEE,
      wageMinor: 50,
      contractYears: 3,
      expiresOn: "2026-02-01",
      expectedVersion: 0,
      rulesetVersion: ruleset,
      idempotencyKey: "offer:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-07",
    });
    if (!offered.ok) throw offered.error;
    const accepted = market.acceptOffer({
      negotiationId: negotiation.value.id,
      version: 1,
      rulesetVersion: ruleset,
      idempotencyKey: "accept:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    expect(accepted).toMatchObject({ ok: true, value: { status: "ACCEPTED" } });

    // C9: reserva os fundos da taxa e liquida.
    const reservation = ledger.reserveFunds({
      accountId: cash.value.id,
      purpose: "TRANSFER_FEE",
      amountMinor: FEE,
      expiresOn: "2026-02-01",
      rulesetVersion: ruleset,
      idempotencyKey: "res:fee",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    if (!reservation.ok) throw reservation.error;
    expect(ledger.availableBalance(cash.value.id)).toBe(4000);
    const settled = ledger.settleReservation({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "settle:fee",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-09",
    });
    expect(settled).toMatchObject({ ok: true, value: { status: "SETTLED" } });

    // C6: ativa o contrato/vínculo (um único vínculo ativo pelo jogador).
    const contract = market.activateContract({
      personId: PERSON,
      playerId: PLAYER,
      clubId: BUYER,
      feeMinor: FEE,
      wageMinor: 50,
      startsOn: "2026-01-10",
      endsOn: "2029-06-30",
      kind: "PERMANENT",
      rulesetVersion: ruleset,
      idempotencyKey: "contract:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    expect(contract).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(market.activeLinkFor(PLAYER)!.clubId).toBe(BUYER);
    expect(market.summary().activeLinkCount).toBe(1);

    // C9: conservação preservada (residual global zero).
    expect(ledger.summary().residualMinor).toBe(0);
  });

  it("assina via SAGA-01 real com fencing (C6+C9+X-002) e compensa após falha", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const PLAYER2 = "019f0000-0000-7000-8000-0000000000p2" as MarketPlayerRef;

    // C9: caixa comprador + destino do vendedor.
    const ledgerR = WorldLedger.initialize(gameWorld);
    if (!ledgerR.ok) throw ledgerR.error;
    const ledger = ledgerR.value;
    const cash = ledger.openLedgerAccount({
      name: "Caixa",
      type: "ASSET",
      rulesetVersion: ruleset,
      idempotencyKey: "a:cash",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    const faucet = ledger.openLedgerAccount({
      name: "Faucet",
      type: "FAUCET",
      rulesetVersion: ruleset,
      idempotencyKey: "a:faucet",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    const sink = ledger.openLedgerAccount({
      name: "Vendedor",
      type: "SINK",
      rulesetVersion: ruleset,
      idempotencyKey: "a:sink",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!cash.ok || !faucet.ok || !sink.ok) throw new Error("contas");
    const funded = ledger.postTransaction({
      transactionClass: "INJECTION",
      occurredOn: "2026-01-02",
      entries: [
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 5000 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 5000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!funded.ok) throw funded.error;

    const marketR = WorldMarket.initialize(gameWorld);
    const eventingR = WorldEventing.initialize(gameWorld);
    if (!marketR.ok) throw marketR.error;
    if (!eventingR.ok) throw eventingR.error;
    const market = marketR.value;
    const eventing = eventingR.value;

    // Helper: negociação aceita para um jogador.
    const accept = (player: MarketPlayerRef, key: string) => {
      const neg = market.openNegotiation({
        playerId: player,
        buyerClubId: BUYER,
        sellerClubId: SELLER,
        rulesetVersion: ruleset,
        idempotencyKey: `neg:${key}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-05",
      });
      if (!neg.ok) throw neg.error;
      const off = market.submitOffer({
        negotiationId: neg.value.id,
        createdByClubId: BUYER,
        feeMinor: FEE,
        wageMinor: 50,
        contractYears: 3,
        expiresOn: "2026-02-01",
        expectedVersion: 0,
        rulesetVersion: ruleset,
        idempotencyKey: `off:${key}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-06",
      });
      if (!off.ok) throw off.error;
      const acc = market.acceptOffer({
        negotiationId: neg.value.id,
        version: 1,
        rulesetVersion: ruleset,
        idempotencyKey: `acc:${key}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-07",
      });
      if (!acc.ok) throw acc.error;
      return neg.value.id;
    };

    // Caminho feliz: SAGA-01 dirige a transferência com fencing.
    const negId = accept(PLAYER, "1");
    const saga = eventing.startSaga({
      sagaType: "SAGA-01",
      correlationKey: `transfer:${negId}`,
      steps: ["reserve", "register", "settle"],
      rulesetVersion: ruleset,
      idempotencyKey: "saga:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    if (!saga.ok) throw saga.error;
    const claim = eventing.claimSaga({
      sagaId: saga.value.id,
      owner: "transfer-worker",
      nowMs: 1_000,
      leaseMs: 60_000,
      rulesetVersion: ruleset,
    });
    if (!claim.ok) throw claim.error;
    const token = claim.value.fencingToken;
    const transfer = market.startTransfer({
      negotiationId: negId,
      sagaId: saga.value.id,
      personId: PERSON,
      wageMinor: 50,
      startsOn: "2026-02-01",
      endsOn: "2029-06-30",
      rulesetVersion: ruleset,
      idempotencyKey: "tr:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    if (!transfer.ok) throw transfer.error;

    const reservation = ledger.reserveFunds({
      accountId: cash.value.id,
      purpose: "TRANSFER_FEE",
      amountMinor: FEE,
      expiresOn: "2026-03-01",
      rulesetVersion: ruleset,
      idempotencyKey: "res:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    if (!reservation.ok) throw reservation.error;
    for (const step of ["reserve", "register"]) {
      const t = market.advanceTransferStep({
        transferId: transfer.value.id,
        fencingToken: token,
        checkpointHash: `${step}-ok`,
        rulesetVersion: ruleset,
        idempotencyKey: `tr:1:${step}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-08",
      });
      if (!t.ok) throw t.error;
      const s = eventing.advanceSagaStep({
        sagaId: saga.value.id,
        fencingToken: token,
        checkpointHash: `${step}-ok`,
        rulesetVersion: ruleset,
        idempotencyKey: `saga:1:${step}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-08",
      });
      if (!s.ok) throw s.error;
    }
    const settled = ledger.settleReservation({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "settle:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-09",
    });
    if (!settled.ok) throw settled.error;
    const pay = ledger.postTransaction({
      transactionClass: "TRANSFER_FEE",
      occurredOn: "2026-01-09",
      entries: [
        { accountId: sink.value.id, direction: "DEBIT", amountMinor: FEE },
        { accountId: cash.value.id, direction: "CREDIT", amountMinor: FEE },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:pay",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-09",
    });
    if (!pay.ok) throw pay.error;
    const completedTransfer = market.advanceTransferStep({
      transferId: transfer.value.id,
      fencingToken: token,
      checkpointHash: "settle-ok",
      rulesetVersion: ruleset,
      idempotencyKey: "tr:1:settle",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-09",
    });
    const completedSaga = eventing.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: token,
      checkpointHash: "settle-ok",
      rulesetVersion: ruleset,
      idempotencyKey: "saga:1:settle",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-09",
    });
    expect(completedTransfer).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
    expect(completedSaga).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
    // C4/C7: após a assinatura, o vínculo do jogador está no comprador.
    expect(market.activeLinkFor(PLAYER)!.clubId).toBe(BUYER);
    expect(ledger.summary().residualMinor).toBe(0);

    // Caminho de compensação: falha pós-reserva libera a reserva sem vínculo.
    const negId2 = accept(PLAYER2, "2");
    const saga2 = eventing.startSaga({
      sagaType: "SAGA-01",
      correlationKey: `transfer:${negId2}`,
      steps: ["reserve", "register", "settle"],
      rulesetVersion: ruleset,
      idempotencyKey: "saga:2",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!saga2.ok) throw saga2.error;
    const claim2 = eventing.claimSaga({
      sagaId: saga2.value.id,
      owner: "transfer-worker",
      nowMs: 2_000,
      leaseMs: 60_000,
      rulesetVersion: ruleset,
    });
    if (!claim2.ok) throw claim2.error;
    const token2 = claim2.value.fencingToken;
    const transfer2 = market.startTransfer({
      negotiationId: negId2,
      sagaId: saga2.value.id,
      personId: PERSON,
      wageMinor: 50,
      startsOn: "2026-03-01",
      endsOn: "2029-06-30",
      rulesetVersion: ruleset,
      idempotencyKey: "tr:2",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!transfer2.ok) throw transfer2.error;
    const reservation2 = ledger.reserveFunds({
      accountId: cash.value.id,
      purpose: "TRANSFER_FEE",
      amountMinor: FEE,
      expiresOn: "2026-04-01",
      rulesetVersion: ruleset,
      idempotencyKey: "res:2",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!reservation2.ok) throw reservation2.error;
    const stepA = market.advanceTransferStep({
      transferId: transfer2.value.id,
      fencingToken: token2,
      checkpointHash: "reserve-ok",
      rulesetVersion: ruleset,
      idempotencyKey: "tr:2:reserve",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!stepA.ok) throw stepA.error;
    const released = ledger.releaseReservation({
      reservationId: reservation2.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "release:2",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-02",
    });
    const compTransfer = market.compensateTransfer({
      transferId: transfer2.value.id,
      fencingToken: token2,
      reason: "registration-failed",
      rulesetVersion: ruleset,
      idempotencyKey: "tr:2:comp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-02",
    });
    const compSaga = eventing.compensateSaga({
      sagaId: saga2.value.id,
      fencingToken: token2,
      reason: "registration-failed",
      rulesetVersion: ruleset,
      idempotencyKey: "saga:2:comp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-02",
    });
    expect(released).toMatchObject({ ok: true, value: { status: "RELEASED" } });
    expect(compTransfer).toMatchObject({ ok: true, value: { status: "COMPENSATED" } });
    expect(compSaga).toMatchObject({ ok: true, value: { status: "COMPENSATED" } });
    expect(market.activeLinkFor(PLAYER2)).toBeNull();
    // caixa preservado: só a taxa do caminho feliz saiu (5000 - 1000).
    const cashBalance = ledger
      .snapshot()
      .accounts.find((a) => a.id === cash.value.id)!.balanceMinor;
    expect(cashBalance).toBe(4000);
    expect(ledger.summary().residualMinor).toBe(0);
  });
});
