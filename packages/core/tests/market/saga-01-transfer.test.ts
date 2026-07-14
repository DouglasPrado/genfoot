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

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "saga-01"): GameWorldSnapshot {
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

const PLAYER = "019f0000-0000-7000-8000-0000000000d1" as MarketPlayerRef;
const PERSON = "019f0000-0000-7000-8000-0000000000e1" as MarketPersonRef;
const BUYER = "019f0000-0000-7000-8000-0000000000b1" as MarketClubRef;
const SELLER = "019f0000-0000-7000-8000-0000000000b2" as MarketClubRef;
const FEE = 1_000_000;

/**
 * T014/T015 — golden path SAGA-01: a máquina durável de X-002 orquestra a transferência de C6
 * consumindo reserve/settle/release de C9. Prova coordenação cross-context (sem escrita cruzada:
 * cada owner muda só o seu estado), fencing e conservação monetária (residual 0).
 */
describe("SAGA-01 transferência (C6 + C9 + X-002)", () => {
  function setup(seed: string) {
    const gameWorld = world(seed);
    const ledgerInit = WorldLedger.initialize(gameWorld);
    const marketInit = WorldMarket.initialize(gameWorld);
    const eventingInit = WorldEventing.initialize(gameWorld);
    if (!ledgerInit.ok) throw ledgerInit.error;
    if (!marketInit.ok) throw marketInit.error;
    if (!eventingInit.ok) throw eventingInit.error;
    const ledger = ledgerInit.value;
    const market = marketInit.value;
    const eventing = eventingInit.value;

    // C9: caixa do comprador com fundos injetados de uma torneira.
    const cash = ledger.openLedgerAccount({
      name: "Caixa comprador",
      type: "ASSET",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "a:cash",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    const faucet = ledger.openLedgerAccount({
      name: "Faucet",
      type: "FAUCET",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "a:faucet",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    const sink = ledger.openLedgerAccount({
      name: "Vendedor",
      type: "SINK",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "a:sink",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!cash.ok || !faucet.ok || !sink.ok) throw new Error("contas");
    const funded = ledger.postTransaction({
      transactionClass: "INJECTION",
      occurredOn: "2026-01-02",
      entries: [
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: FEE },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: FEE },
      ],
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!funded.ok) throw funded.error;

    // C6: negociação aceita.
    const negotiation = market.openNegotiation({
      playerId: PLAYER,
      buyerClubId: BUYER,
      sellerClubId: SELLER,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "neg:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!negotiation.ok) throw negotiation.error;
    const offer = market.submitOffer({
      negotiationId: negotiation.value.id,
      createdByClubId: BUYER,
      feeMinor: FEE,
      wageMinor: 20_000,
      contractYears: 3,
      expiresOn: "2026-02-01",
      expectedVersion: 0,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "off:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    if (!offer.ok) throw offer.error;
    const accepted = market.acceptOffer({
      negotiationId: negotiation.value.id,
      version: 1,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "acc:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-07",
    });
    if (!accepted.ok) throw accepted.error;

    // X-002: saga durável arrendada.
    const saga = eventing.startSaga({
      sagaType: "SAGA-01",
      correlationKey: `transfer:${negotiation.value.id}`,
      steps: ["reserve", "register", "settle"],
      rulesetVersion: gameWorld.rulesetVersion,
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
      rulesetVersion: gameWorld.rulesetVersion,
    });
    if (!claim.ok) throw claim.error;

    // C6: transferência iniciada, referenciando a saga.
    const transfer = market.startTransfer({
      negotiationId: negotiation.value.id,
      sagaId: saga.value.id,
      personId: PERSON,
      wageMinor: 20_000,
      startsOn: "2026-02-01",
      endsOn: "2029-06-30",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "tr:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    if (!transfer.ok) throw transfer.error;

    return {
      gameWorld,
      ledger,
      market,
      eventing,
      cash: cash.value,
      sink: sink.value,
      saga: saga.value,
      fencingToken: claim.value.fencingToken,
      transfer: transfer.value,
    };
  }

  it("completa a transferência: reserve → register → settle com residual 0", () => {
    const ctx = setup("happy");
    const ruleset = ctx.gameWorld.rulesetVersion;
    const seed = ctx.gameWorld.seed;

    // Step reserve — C9 reserva os fundos, C6 e a saga avançam.
    const reservation = ctx.ledger.reserveFunds({
      accountId: ctx.cash.id,
      purpose: "transfer-fee",
      amountMinor: FEE,
      expiresOn: "2026-03-01",
      rulesetVersion: ruleset,
      idempotencyKey: "res:1",
      worldSeed: seed,
      worldDate: "2026-01-08",
    });
    if (!reservation.ok) throw reservation.error;
    for (const step of ["reserve", "register"]) {
      const advTransfer = ctx.market.advanceTransferStep({
        transferId: ctx.transfer.id,
        fencingToken: ctx.fencingToken,
        checkpointHash: `${step}-ok`,
        rulesetVersion: ruleset,
        idempotencyKey: `tr:1:${step}`,
        worldSeed: seed,
        worldDate: "2026-01-08",
      });
      if (!advTransfer.ok) throw advTransfer.error;
      const advSaga = ctx.eventing.advanceSagaStep({
        sagaId: ctx.saga.id,
        fencingToken: ctx.fencingToken,
        checkpointHash: `${step}-ok`,
        rulesetVersion: ruleset,
        idempotencyKey: `saga:1:${step}`,
        worldSeed: seed,
        worldDate: "2026-01-08",
      });
      if (!advSaga.ok) throw advSaga.error;
    }

    // Step settle — C9 liquida a reserva (paga o vendedor) e a transferência conclui.
    const settled = ctx.ledger.settleReservation({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "settle:1",
      worldSeed: seed,
      worldDate: "2026-01-09",
    });
    if (!settled.ok) throw settled.error;
    const pay = ctx.ledger.postTransaction({
      transactionClass: "TRANSFER_FEE",
      occurredOn: "2026-01-09",
      entries: [
        { accountId: ctx.sink.id, direction: "DEBIT", amountMinor: FEE },
        { accountId: ctx.cash.id, direction: "CREDIT", amountMinor: FEE },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:pay",
      worldSeed: seed,
      worldDate: "2026-01-09",
    });
    if (!pay.ok) throw pay.error;
    const completedTransfer = ctx.market.advanceTransferStep({
      transferId: ctx.transfer.id,
      fencingToken: ctx.fencingToken,
      checkpointHash: "settle-ok",
      rulesetVersion: ruleset,
      idempotencyKey: "tr:1:settle",
      worldSeed: seed,
      worldDate: "2026-01-09",
    });
    const completedSaga = ctx.eventing.advanceSagaStep({
      sagaId: ctx.saga.id,
      fencingToken: ctx.fencingToken,
      checkpointHash: "settle-ok",
      rulesetVersion: ruleset,
      idempotencyKey: "saga:1:settle",
      worldSeed: seed,
      worldDate: "2026-01-09",
    });

    expect(completedTransfer).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
    expect(completedSaga).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
    expect(ctx.market.activeLinkFor(PLAYER)!.clubId).toBe(BUYER);
    // conservação: soma algébrica de todas as contas é zero.
    const residual = ctx.ledger
      .snapshot()
      .accounts.reduce((sum, account) => sum + account.balanceMinor, 0);
    expect(residual).toBe(0);
  });

  it("compensa a transferência liberando a reserva sem vínculo criado", () => {
    const ctx = setup("compensate");
    const ruleset = ctx.gameWorld.rulesetVersion;
    const seed = ctx.gameWorld.seed;

    const reservation = ctx.ledger.reserveFunds({
      accountId: ctx.cash.id,
      purpose: "transfer-fee",
      amountMinor: FEE,
      expiresOn: "2026-03-01",
      rulesetVersion: ruleset,
      idempotencyKey: "res:1",
      worldSeed: seed,
      worldDate: "2026-01-08",
    });
    if (!reservation.ok) throw reservation.error;
    const advTransfer = ctx.market.advanceTransferStep({
      transferId: ctx.transfer.id,
      fencingToken: ctx.fencingToken,
      checkpointHash: "reserve-ok",
      rulesetVersion: ruleset,
      idempotencyKey: "tr:1:reserve",
      worldSeed: seed,
      worldDate: "2026-01-08",
    });
    if (!advTransfer.ok) throw advTransfer.error;

    // Falha no registro → compensação em cascata: C9 libera, C6 e a saga compensam.
    const released = ctx.ledger.releaseReservation({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "release:1",
      worldSeed: seed,
      worldDate: "2026-01-09",
    });
    const compTransfer = ctx.market.compensateTransfer({
      transferId: ctx.transfer.id,
      fencingToken: ctx.fencingToken,
      reason: "registration-failed",
      rulesetVersion: ruleset,
      idempotencyKey: "tr:1:comp",
      worldSeed: seed,
      worldDate: "2026-01-09",
    });
    const compSaga = ctx.eventing.compensateSaga({
      sagaId: ctx.saga.id,
      fencingToken: ctx.fencingToken,
      reason: "registration-failed",
      rulesetVersion: ruleset,
      idempotencyKey: "saga:1:comp",
      worldSeed: seed,
      worldDate: "2026-01-09",
    });

    expect(released).toMatchObject({ ok: true, value: { status: "RELEASED" } });
    expect(compTransfer).toMatchObject({ ok: true, value: { status: "COMPENSATED" } });
    expect(compSaga).toMatchObject({ ok: true, value: { status: "COMPENSATED" } });
    // sem vínculo criado e fundos preservados no caixa (reserva liberada).
    expect(ctx.market.activeLinkFor(PLAYER)).toBeNull();
    const cashBalance = ctx.ledger
      .snapshot()
      .accounts.find((account) => account.id === ctx.cash.id)!.balanceMinor;
    expect(cashBalance).toBe(FEE);
  });
});
