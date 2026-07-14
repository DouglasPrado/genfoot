import {
  DomainError,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  ActivateContract,
  GameWorld,
  WorldMarket,
  type GameWorldSnapshot,
  type MarketClubRef,
  type MarketPersonRef,
  type MarketPlayerRef,
  type MarketRepository,
  type WorldMarketSnapshot,
} from "../../src/index.js";

class MemoryMarketRepository implements MarketRepository {
  public snapshot: WorldMarketSnapshot | null = null;

  public findMarketByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldMarketSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveMarket(
    snapshot: WorldMarketSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("MARKET_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

const PLAYER = "019f0000-0000-7000-8000-0000000000p1" as MarketPlayerRef;
const PERSON = "019f0000-0000-7000-8000-0000000000e1" as MarketPersonRef;
const BUYER = "019f0000-0000-7000-8000-0000000000b1" as MarketClubRef;
const SELLER = "019f0000-0000-7000-8000-0000000000s1" as MarketClubRef;

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "market-001"): GameWorldSnapshot {
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

function market() {
  const gameWorld = world();
  const created = WorldMarket.initialize(gameWorld);
  if (!created.ok) throw created.error;
  return { gameWorld, value: created.value };
}

function openNegotiation(value: WorldMarket, gameWorld: GameWorldSnapshot) {
  const negotiation = value.openNegotiation({
    playerId: PLAYER,
    buyerClubId: BUYER,
    sellerClubId: SELLER,
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: "neg:1",
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-05",
  });
  if (!negotiation.ok) throw negotiation.error;
  return negotiation.value;
}

describe("Market, scouting and contracts", () => {
  it("recusa scouting insuficiente e produz relatório idempotente", () => {
    const { gameWorld, value } = market();
    expect(
      value.requestScouting({
        playerId: PLAYER,
        observerClubId: BUYER,
        scoutingCapacity: 10,
        observations: ["ritmo"],
        validUntil: "2026-06-01",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "scout:bad",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-05",
      }),
    ).toMatchObject({ ok: false, error: { code: "INSUFFICIENT_SCOUTING" } });

    const first = value.requestScouting({
      playerId: PLAYER,
      observerClubId: BUYER,
      scoutingCapacity: 80,
      observations: ["finalização", "velocidade"],
      validUntil: "2026-06-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "scout:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    expect(first).toMatchObject({ ok: true, value: { confidence: 80 } });
    const revision = value.snapshot().revision;
    const repeated = value.requestScouting({
      playerId: PLAYER,
      observerClubId: BUYER,
      scoutingCapacity: 80,
      observations: ["finalização", "velocidade"],
      validUntil: "2026-06-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "scout:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    expect(repeated).toEqual(first);
    expect(value.snapshot().revision).toBe(revision);
  });

  it("versiona ofertas e recusa aceite de versão obsoleta", () => {
    const { gameWorld, value } = market();
    const negotiation = openNegotiation(value, gameWorld);

    const offered = value.submitOffer({
      negotiationId: negotiation.id,
      createdByClubId: BUYER,
      feeMinor: 1000,
      wageMinor: 50,
      contractYears: 3,
      expiresOn: "2026-12-31",
      expectedVersion: 0,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "offer:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    expect(offered).toMatchObject({
      ok: true,
      value: { status: "OFFERED", currentVersion: 1 },
    });

    const countered = value.submitOffer({
      negotiationId: negotiation.id,
      createdByClubId: SELLER,
      feeMinor: 1500,
      wageMinor: 60,
      contractYears: 3,
      expiresOn: "2026-12-31",
      expectedVersion: 1,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "offer:2",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-07",
    });
    expect(countered).toMatchObject({
      ok: true,
      value: { status: "COUNTERED", currentVersion: 2 },
    });

    expect(
      value.acceptOffer({
        negotiationId: negotiation.id,
        version: 1,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "accept:stale",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-08",
      }),
    ).toMatchObject({ ok: false, error: { code: "STALE_OFFER_VERSION" } });

    const accepted = value.acceptOffer({
      negotiationId: negotiation.id,
      version: 2,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "accept:ok",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    expect(accepted).toMatchObject({ ok: true, value: { status: "ACCEPTED" } });

    expect(
      value.submitOffer({
        negotiationId: negotiation.id,
        createdByClubId: BUYER,
        feeMinor: 2000,
        wageMinor: 70,
        contractYears: 2,
        expiresOn: "2026-12-31",
        expectedVersion: 2,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "offer:late",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-09",
      }),
    ).toMatchObject({ ok: false, error: { code: "NEGOTIATION_TERMINAL" } });
  });

  it("recusa aceite de oferta expirada", () => {
    const { gameWorld, value } = market();
    const negotiation = openNegotiation(value, gameWorld);
    const offered = value.submitOffer({
      negotiationId: negotiation.id,
      createdByClubId: BUYER,
      feeMinor: 1000,
      wageMinor: 50,
      contractYears: 3,
      expiresOn: "2026-01-10",
      expectedVersion: 0,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "offer:exp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    if (!offered.ok) throw offered.error;
    expect(
      value.acceptOffer({
        negotiationId: negotiation.id,
        version: 1,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "accept:exp",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-15",
      }),
    ).toMatchObject({ ok: false, error: { code: "OFFER_EXPIRED" } });
  });

  it("garante vínculo único ativo por jogador e libera após término", () => {
    const { gameWorld, value } = market();
    const contract = value.activateContract({
      personId: PERSON,
      playerId: PLAYER,
      clubId: BUYER,
      feeMinor: 1000,
      wageMinor: 50,
      startsOn: "2026-01-10",
      endsOn: "2028-06-30",
      kind: "PERMANENT",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "contract:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    expect(contract).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(value.activeLinkFor(PLAYER)!.clubId).toBe(BUYER);

    expect(
      value.activateContract({
        personId: PERSON,
        playerId: PLAYER,
        clubId: SELLER,
        feeMinor: 2000,
        wageMinor: 60,
        startsOn: "2027-01-01",
        endsOn: "2029-06-30",
        kind: "PERMANENT",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "contract:conflict",
        worldSeed: gameWorld.seed,
        worldDate: "2027-01-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "PLAYER_LINK_CONFLICT" } });

    if (!contract.ok) throw contract.error;
    const terminated = value.terminateContract({
      contractId: contract.value.id,
      endedOn: "2026-12-31",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "terminate:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-12-31",
    });
    expect(terminated).toMatchObject({ ok: true, value: { status: "TERMINATED" } });
    expect(value.activeLinkFor(PLAYER)).toBeNull();

    expect(
      value.activateContract({
        personId: PERSON,
        playerId: PLAYER,
        clubId: SELLER,
        feeMinor: 2000,
        wageMinor: 60,
        startsOn: "2027-01-01",
        endsOn: "2029-06-30",
        kind: "PERMANENT",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "contract:2",
        worldSeed: gameWorld.seed,
        worldDate: "2027-01-01",
      }),
    ).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
  });

  function acceptedNegotiation(
    value: WorldMarket,
    gameWorld: GameWorldSnapshot,
    key = "neg:t",
  ) {
    const negotiation = value.openNegotiation({
      playerId: PLAYER,
      buyerClubId: BUYER,
      sellerClubId: SELLER,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: key,
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!negotiation.ok) throw negotiation.error;
    const offer = value.submitOffer({
      negotiationId: negotiation.value.id,
      createdByClubId: BUYER,
      feeMinor: 1_000_000,
      wageMinor: 20_000,
      contractYears: 3,
      expiresOn: "2026-02-01",
      expectedVersion: 0,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `${key}:offer`,
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    if (!offer.ok) throw offer.error;
    const accepted = value.acceptOffer({
      negotiationId: negotiation.value.id,
      version: 1,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `${key}:accept`,
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-07",
    });
    if (!accepted.ok) throw accepted.error;
    return negotiation.value;
  }

  it("executa a SAGA-01 de transferência: start → 3 passos → vínculo único", () => {
    const { gameWorld, value } = market();
    const negotiation = acceptedNegotiation(value, gameWorld);
    const transfer = value.startTransfer({
      negotiationId: negotiation.id,
      sagaId: "saga-1",
      personId: PERSON,
      wageMinor: 20_000,
      startsOn: "2026-02-01",
      endsOn: "2029-06-30",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "tr:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    expect(transfer).toMatchObject({
      ok: true,
      value: { status: "RUNNING", currentStep: 0 },
    });
    if (!transfer.ok) throw transfer.error;

    // fencing obsoleto rejeitado
    expect(
      value.advanceTransferStep({
        transferId: transfer.value.id,
        fencingToken: 99,
        checkpointHash: "x",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "tr:1:bad",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-08",
      }),
    ).toMatchObject({ ok: false, error: { code: "SAGA_FENCED" } });

    const steps = ["reserve", "register", "settle"];
    let last = transfer.value;
    steps.forEach((label, index) => {
      const advanced = value.advanceTransferStep({
        transferId: transfer.value.id,
        fencingToken: 1,
        checkpointHash: `${label}-ok`,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: `tr:1:s${index}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-08",
      });
      if (!advanced.ok) throw advanced.error;
      last = advanced.value;
    });
    expect(last.status).toBe("COMPLETED");
    expect(value.activeLinkFor(PLAYER)!.clubId).toBe(BUYER);
    expect(
      value.snapshot().events.filter((e) => e.type === "TransferCompleted"),
    ).toHaveLength(1);

    // retry do passo final (resposta perdida) = efeito único
    const revision = value.snapshot().revision;
    const retry = value.advanceTransferStep({
      transferId: transfer.value.id,
      fencingToken: 1,
      checkpointHash: "settle-ok",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "tr:1:s2",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    expect(retry).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
    expect(value.snapshot().revision).toBe(revision);
  });

  it("compensa a transferência após falha e rejeita terminal", () => {
    const { gameWorld, value } = market();
    const negotiation = acceptedNegotiation(value, gameWorld);
    const transfer = value.startTransfer({
      negotiationId: negotiation.id,
      sagaId: "saga-2",
      personId: PERSON,
      wageMinor: 20_000,
      startsOn: "2026-02-01",
      endsOn: "2029-06-30",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "tr:2",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    if (!transfer.ok) throw transfer.error;
    const step0 = value.advanceTransferStep({
      transferId: transfer.value.id,
      fencingToken: 1,
      checkpointHash: "reserve-ok",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "tr:2:s0",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-08",
    });
    if (!step0.ok) throw step0.error;

    const compensated = value.compensateTransfer({
      transferId: transfer.value.id,
      fencingToken: 1,
      reason: "settle-failed",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "tr:2:comp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-09",
    });
    expect(compensated).toMatchObject({ ok: true, value: { status: "COMPENSATED" } });
    expect(value.activeLinkFor(PLAYER)).toBeNull();
    expect(
      value.advanceTransferStep({
        transferId: transfer.value.id,
        fencingToken: 1,
        checkpointHash: "x",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "tr:2:after",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-09",
      }),
    ).toMatchObject({ ok: false, error: { code: "TRANSFER_TERMINAL" } });
  });

  it("empresta e retorna/compra o jogador exatamente uma vez", () => {
    const { gameWorld, value } = market();
    const loan = value.startLoan({
      playerId: PLAYER,
      personId: PERSON,
      originClubId: SELLER,
      destinationClubId: BUYER,
      startsOn: "2026-02-01",
      endsOn: "2026-12-31",
      wageMinor: 10_000,
      optionFeeMinor: 500_000,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "loan:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    expect(loan).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    if (!loan.ok) throw loan.error;
    expect(value.activeLinkFor(PLAYER)!.kind).toBe("LOAN");

    const returned = value.returnLoanedPlayer({
      loanId: loan.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "loan:1:return",
      worldSeed: gameWorld.seed,
      worldDate: "2027-01-01",
    });
    expect(returned).toMatchObject({ ok: true, value: { status: "RETURNED" } });
    expect(value.activeLinkFor(PLAYER)).toBeNull();

    // retorno repetido = efeito único
    const revision = value.snapshot().revision;
    const again = value.returnLoanedPlayer({
      loanId: loan.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "loan:1:return:again",
      worldSeed: gameWorld.seed,
      worldDate: "2027-01-02",
    });
    expect(again).toMatchObject({ ok: true, value: { status: "RETURNED" } });
    expect(value.snapshot().revision).toBe(revision);

    // outro empréstimo pode ser comprado (opção) → vínculo permanente
    const loan2 = value.startLoan({
      playerId: PLAYER,
      personId: PERSON,
      originClubId: SELLER,
      destinationClubId: BUYER,
      startsOn: "2027-02-01",
      endsOn: "2027-12-31",
      wageMinor: 10_000,
      optionFeeMinor: 800_000,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "loan:2",
      worldSeed: gameWorld.seed,
      worldDate: "2027-01-20",
    });
    if (!loan2.ok) throw loan2.error;
    const purchased = value.exerciseLoanOption({
      loanId: loan2.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "loan:2:buy",
      worldSeed: gameWorld.seed,
      worldDate: "2027-06-01",
    });
    expect(purchased).toMatchObject({ ok: true, value: { status: "PURCHASED" } });
    expect(value.activeLinkFor(PLAYER)!.kind).toBe("PERMANENT");
    expect(
      value.snapshot().events.filter((e) => e.type === "LoanPurchased"),
    ).toHaveLength(1);
  });

  it("publica listing única e cancela negociação com evento", () => {
    const { gameWorld, value } = market();
    const listing = value.publishListing({
      playerId: PLAYER,
      sellerClubId: SELLER,
      askingFeeMinor: 2_000_000,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "list:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-04",
    });
    expect(listing).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(
      value.publishListing({
        playerId: PLAYER,
        sellerClubId: SELLER,
        askingFeeMinor: 3_000_000,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "list:dup",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-04",
      }),
    ).toMatchObject({ ok: false, error: { code: "PLAYER_LINK_CONFLICT" } });

    const negotiation = openNegotiation(value, gameWorld);
    const cancelled = value.cancelNegotiation({
      negotiationId: negotiation.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "cancel:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-09",
    });
    expect(cancelled).toMatchObject({ ok: true, value: { status: "CANCELLED" } });
    expect(
      value.snapshot().events.filter((e) => e.type === "NegotiationExpired"),
    ).toHaveLength(1);
    expect(
      value.cancelNegotiation({
        negotiationId: negotiation.id,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "cancel:again",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-10",
      }),
    ).toMatchObject({ ok: false, error: { code: "NEGOTIATION_TERMINAL" } });
  });

  it("ativa contrato idempotente via caso de uso", async () => {
    const { gameWorld, value } = market();
    const repository = new MemoryMarketRepository();
    repository.snapshot = value.snapshot();
    const useCase = new ActivateContract(repository);
    const input = {
      personId: PERSON,
      playerId: PLAYER,
      clubId: BUYER,
      feeMinor: 1000,
      wageMinor: 50,
      startsOn: "2026-01-10",
      endsOn: "2028-06-30",
      kind: "PERMANENT" as const,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "contract:uc",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    };
    const first = await useCase.execute(gameWorld.id, input);
    const revision = repository.snapshot.revision;
    const repeated = await useCase.execute(gameWorld.id, input);

    expect(first).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(repeated).toEqual(first);
    expect(repository.snapshot.revision).toBe(revision);
    expect(repository.snapshot.contracts).toHaveLength(1);
  });
});
