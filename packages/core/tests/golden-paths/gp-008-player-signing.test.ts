import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
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
});
