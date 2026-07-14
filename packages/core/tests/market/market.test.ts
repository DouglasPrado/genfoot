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
