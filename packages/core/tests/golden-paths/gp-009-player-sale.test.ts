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
});
