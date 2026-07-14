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

// GP-010 · Player loan — convergência C6: o jogador é emprestado (vínculo LOAN no
// destino durante a janela) e retorna exatamente uma vez ao clube de origem. Em
// todo momento há um único vínculo ativo. (A propriedade suspensa da origem é
// simplificada em nível de convergência.)

const PLAYER = "019f0000-0000-7000-8000-0000000000p1" as MarketPlayerRef;
const PERSON = "019f0000-0000-7000-8000-0000000000e1" as MarketPersonRef;
const ORIGIN = "019f0000-0000-7000-8000-0000000000o1" as MarketClubRef;
const DEST = "019f0000-0000-7000-8000-0000000000d1" as MarketClubRef;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-010",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-010 Player loan (convergence)", () => {
  it("empresta e retorna exatamente uma vez com um único vínculo ativo", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const marketR = WorldMarket.initialize(gameWorld);
    if (!marketR.ok) throw marketR.error;
    const market = marketR.value;

    // Origem detém o jogador.
    const originContract = market.activateContract({
      personId: PERSON,
      playerId: PLAYER,
      clubId: ORIGIN,
      feeMinor: 0,
      wageMinor: 30,
      startsOn: "2025-07-01",
      endsOn: "2028-06-30",
      kind: "PERMANENT",
      rulesetVersion: ruleset,
      idempotencyKey: "contract:origin",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!originContract.ok) throw originContract.error;

    // Empresta: a janela de origem se encerra e o destino ativa um vínculo LOAN.
    const originPaused = market.terminateContract({
      contractId: originContract.value.id,
      endedOn: "2026-01-31",
      rulesetVersion: ruleset,
      idempotencyKey: "pause:origin",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-31",
    });
    if (!originPaused.ok) throw originPaused.error;
    const loan = market.activateContract({
      personId: PERSON,
      playerId: PLAYER,
      clubId: DEST,
      feeMinor: 0,
      wageMinor: 30,
      startsOn: "2026-02-01",
      endsOn: "2026-06-30",
      kind: "LOAN",
      rulesetVersion: ruleset,
      idempotencyKey: "contract:loan",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    expect(loan).toMatchObject({ ok: true, value: { kind: "LOAN", status: "ACTIVE" } });
    expect(market.activeLinkFor(PLAYER)!.clubId).toBe(DEST);
    if (!loan.ok) throw loan.error;

    // Retorna: o vínculo LOAN encerra exatamente uma vez.
    const returned = market.terminateContract({
      contractId: loan.value.id,
      endedOn: "2026-06-30",
      rulesetVersion: ruleset,
      idempotencyKey: "return:loan",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-30",
    });
    expect(returned).toMatchObject({ ok: true, value: { status: "TERMINATED" } });
    const revision = market.snapshot().revision;
    const returnAgain = market.terminateContract({
      contractId: loan.value.id,
      endedOn: "2026-07-01",
      rulesetVersion: ruleset,
      idempotencyKey: "return:again",
      worldSeed: gameWorld.seed,
      worldDate: "2026-07-01",
    });
    expect(returnAgain).toMatchObject({ ok: true, value: { status: "TERMINATED" } });
    expect(market.snapshot().revision).toBe(revision); // idempotente: retorno único

    // Reativa o vínculo de origem após o retorno (único ativo).
    const restored = market.activateContract({
      personId: PERSON,
      playerId: PLAYER,
      clubId: ORIGIN,
      feeMinor: 0,
      wageMinor: 30,
      startsOn: "2026-07-01",
      endsOn: "2028-06-30",
      kind: "PERMANENT",
      rulesetVersion: ruleset,
      idempotencyKey: "contract:restore",
      worldSeed: gameWorld.seed,
      worldDate: "2026-07-01",
    });
    expect(restored).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(market.activeLinkFor(PLAYER)!.clubId).toBe(ORIGIN);
    expect(market.summary().activeLinkCount).toBe(1);
  });

  it("empréstimo dedicado (C6) com custos no ledger (C9): retorno e compra da opção", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const marketR = WorldMarket.initialize(gameWorld);
    if (!marketR.ok) throw marketR.error;
    const market = marketR.value;

    // C9: caixa do destino, financiado por um faucet (paga taxa e opção).
    const ledgerR = WorldLedger.initialize(gameWorld);
    if (!ledgerR.ok) throw ledgerR.error;
    const ledger = ledgerR.value;
    const cash = ledger.openLedgerAccount({
      name: "Caixa destino",
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
    const origin = ledger.openLedgerAccount({
      name: "Origem",
      type: "SINK",
      rulesetVersion: ruleset,
      idempotencyKey: "acc:origin",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!cash.ok || !faucet.ok || !origin.ok) throw new Error("contas");
    const funded = ledger.postTransaction({
      transactionClass: "INJECTION",
      occurredOn: "2026-01-02",
      entries: [
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 900_000 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 900_000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:fund",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    if (!funded.ok) throw funded.error;

    // C6 US3: empréstimo dedicado com opção de compra → vínculo LOAN no destino.
    const loan = market.startLoan({
      playerId: PLAYER,
      personId: PERSON,
      originClubId: ORIGIN,
      destinationClubId: DEST,
      startsOn: "2026-02-01",
      endsOn: "2026-12-31",
      wageMinor: 10_000,
      optionFeeMinor: 500_000,
      rulesetVersion: ruleset,
      idempotencyKey: "loan:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    expect(loan).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    if (!loan.ok) throw loan.error;
    expect(market.activeLinkFor(PLAYER)!.kind).toBe("LOAN");

    // C9: taxa de empréstimo liquidada (dinheiro conservado).
    const loanFee = ledger.postTransaction({
      transactionClass: "LOAN_FEE",
      occurredOn: "2026-02-01",
      entries: [
        { accountId: origin.value.id, direction: "DEBIT", amountMinor: 100_000 },
        { accountId: cash.value.id, direction: "CREDIT", amountMinor: 100_000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:loan-fee",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    if (!loanFee.ok) throw loanFee.error;

    // Retorno exatamente uma vez (idempotente por chave).
    const returned = market.returnLoanedPlayer({
      loanId: loan.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "loan:1:return",
      worldSeed: gameWorld.seed,
      worldDate: "2027-01-05",
    });
    expect(returned).toMatchObject({ ok: true, value: { status: "RETURNED" } });
    expect(market.activeLinkFor(PLAYER)).toBeNull();
    const revision = market.snapshot().revision;
    const again = market.returnLoanedPlayer({
      loanId: loan.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "loan:1:return:again",
      worldSeed: gameWorld.seed,
      worldDate: "2027-01-06",
    });
    expect(again).toMatchObject({ ok: true, value: { status: "RETURNED" } });
    expect(market.snapshot().revision).toBe(revision);

    // Segundo empréstimo → exerce a opção de compra → vínculo PERMANENTE.
    const loan2 = market.startLoan({
      playerId: PLAYER,
      personId: PERSON,
      originClubId: ORIGIN,
      destinationClubId: DEST,
      startsOn: "2027-02-01",
      endsOn: "2027-12-31",
      wageMinor: 10_000,
      optionFeeMinor: 500_000,
      rulesetVersion: ruleset,
      idempotencyKey: "loan:2",
      worldSeed: gameWorld.seed,
      worldDate: "2027-01-20",
    });
    if (!loan2.ok) throw loan2.error;
    const purchased = market.exerciseLoanOption({
      loanId: loan2.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "loan:2:buy",
      worldSeed: gameWorld.seed,
      worldDate: "2027-06-01",
    });
    expect(purchased).toMatchObject({ ok: true, value: { status: "PURCHASED" } });
    expect(market.activeLinkFor(PLAYER)!.kind).toBe("PERMANENT");

    // C9: custo da opção de compra liquidado, ledger conservado (residual 0).
    const optionCost = ledger.postTransaction({
      transactionClass: "OPTION_PURCHASE",
      occurredOn: "2027-06-01",
      entries: [
        { accountId: origin.value.id, direction: "DEBIT", amountMinor: 500_000 },
        { accountId: cash.value.id, direction: "CREDIT", amountMinor: 500_000 },
      ],
      rulesetVersion: ruleset,
      idempotencyKey: "tx:option",
      worldSeed: gameWorld.seed,
      worldDate: "2027-06-01",
    });
    if (!optionCost.ok) throw optionCost.error;
    const residual = ledger
      .snapshot()
      .accounts.reduce((sum, account) => sum + account.balanceMinor, 0);
    expect(residual).toBe(0);
  });
});
