import { describe, expect, it } from "vitest";

import type { SquadSnapshot } from "../clubs/club-types.js";
import { SquadCategory } from "../clubs/club-types.js";
import { MAX_SQUAD_SIZE } from "../genesis/player-generation.js";
import type { SquadRepository } from "../clubs/squad-repository.js";
import type { LedgerRepository } from "../finance/ledger-repository.js";
import {
  AccountNormalSide,
  AccountOwnerScope,
  FinancialAccountType,
  type JournalEntrySnapshot,
  type LedgerAccountSnapshot,
} from "../finance/ledger-types.js";
import { generateSquadAttributes } from "../genesis/player-generation.js";
import { derivePlayerOverall } from "../players/player-attributes.js";
import type {
  PlayerAggregateSnapshot,
  PlayerRepository,
} from "../players/player-repository.js";
import { estimatePlayerValueMinor } from "../players/player-value.js";

import type {
  NarrativeItemSnapshot,
  NarrativeRepository,
} from "../narrative/narrative-types.js";
import type {
  NotificationItemSnapshot,
  NotificationRepository,
} from "../notifications/notification-types.js";

import {
  ContractStatus,
  type ContractRepository,
  type PlayerContractSnapshot,
} from "./contract-types.js";
import {
  SignPlayer,
  type TransferRepositories,
  type TransferUnitOfWork,
} from "./transfer-player.js";

const WORLD = "019f0000-0000-7000-8000-000000000001";
const SEED = "grinta-demo";
const SELLER = "019f0000-0000-7000-8000-0000000000a1";
const BUYER = "019f0000-0000-7000-8000-0000000000b2";
const OCCURRED = "2026-07-17";

/**
 * O mundo em memória: o mesmo dado que os quatro adapters de Prisma tocariam,
 * num objeto só. `checkpoint`/`restore` modela o `$transaction`: se o trabalho
 * lança, tudo volta ao que era — é o que prova a atomicidade da R-192.
 */
class FakeWorld {
  public players = new Map<string, PlayerAggregateSnapshot>();
  public squads = new Map<string, SquadSnapshot>();
  public accounts: LedgerAccountSnapshot[] = [];
  public journal: JournalEntrySnapshot[] = [];
  public contracts: PlayerContractSnapshot[] = [];
  public narratives: NarrativeItemSnapshot[] = [];
  public notifications: NotificationItemSnapshot[] = [];
  public cashByClub = new Map<string, bigint>();

  public checkpoint(): () => void {
    const squads = new Map(this.squads);
    const journal = [...this.journal];
    const contracts = [...this.contracts];
    const narratives = [...this.narratives];
    const notifications = [...this.notifications];
    return () => {
      this.squads = squads;
      this.journal = journal;
      this.contracts = contracts;
      this.narratives = narratives;
      this.notifications = notifications;
    };
  }
}

function fakePlayers(world: FakeWorld): PlayerRepository {
  return {
    findPlayerById: (_w, id) => Promise.resolve(world.players.get(id) ?? null),
    savePlayer: () => Promise.resolve(),
    decayForma: () => Promise.resolve(),
    nudgeClubForma: () => Promise.resolve(),
  };
}

function fakeSquads(world: FakeWorld): SquadRepository {
  return {
    findFirstTeamSquad: (_w, clubId) =>
      Promise.resolve(world.squads.get(clubId) ?? null),
    findSquadById: () => Promise.resolve(null),
    findYouthSquad: () => Promise.resolve(null),
    saveSquad: (snapshot) => {
      world.squads.set(snapshot.clubId, snapshot);
      return Promise.resolve();
    },
  };
}

function fakeLedger(world: FakeWorld): LedgerRepository {
  return {
    findAccount: (_w, scope, code) =>
      Promise.resolve(
        world.accounts.find(
          (a) => a.ownerScope === scope && a.accountCode === code,
        ) ?? null,
      ),
    saveAccount: () => Promise.resolve(),
    appendJournalEntry: (snapshot) => {
      world.journal.push(snapshot);
      return Promise.resolve(true);
    },
    sumClubCashMinor: (_w, clubId) =>
      Promise.resolve(world.cashByClub.get(clubId) ?? 0n),
  };
}

function fakeContracts(world: FakeWorld): ContractRepository {
  return {
    findActiveByPlayer: (_w, playerId) =>
      Promise.resolve(
        world.contracts.find(
          (c) => c.playerId === playerId && c.status === ContractStatus.ACTIVE,
        ) ?? null,
      ),
    saveContract: (snapshot) => {
      const at = world.contracts.findIndex((c) => c.id === snapshot.id);
      if (at >= 0) world.contracts[at] = snapshot;
      else world.contracts.push(snapshot);
      return Promise.resolve();
    },
  };
}

function fakeNarratives(world: FakeWorld): NarrativeRepository {
  return {
    append: (item) => {
      world.narratives.push(item);
      return Promise.resolve();
    },
  };
}

function fakeNotifications(world: FakeWorld): NotificationRepository {
  return {
    append: (item) => {
      world.notifications.push(item);
      return Promise.resolve();
    },
  };
}

/** UnitOfWork que desfaz por exceção — o mesmo contrato do `$transaction`. */
function fakeUnitOfWork(world: FakeWorld): TransferUnitOfWork {
  const repos: TransferRepositories = {
    players: fakePlayers(world),
    squads: fakeSquads(world),
    ledger: fakeLedger(world),
    contracts: fakeContracts(world),
    narratives: fakeNarratives(world),
    notifications: fakeNotifications(world),
    clubCohesion: { applyTransferHit: () => Promise.resolve() },
  };
  return {
    run: async (work) => {
      const rollback = world.checkpoint();
      try {
        return await work(repos);
      } catch (error) {
        rollback();
        throw error;
      }
    },
  };
}

function cashAccount(clubId: string): LedgerAccountSnapshot {
  return {
    id: `acc-cash-${clubId}`,
    gameWorldId: WORLD as never,
    ownerScope: AccountOwnerScope.CLUB,
    clubId: clubId as never,
    systemAccount: null,
    accountCode: `CASH:${clubId}`,
    accountType: FinancialAccountType.ASSET,
    normalSide: AccountNormalSide.DEBIT,
    currencyId: "019b76da-a800-7787-9462-49c009becccc",
    version: 1,
  };
}

function squadOf(
  clubId: string,
  playerIds: readonly string[],
): SquadSnapshot {
  return {
    id: `squad-${clubId}` as never,
    gameWorldId: WORLD as never,
    clubId: clubId as never,
    name: `Elenco ${clubId}`,
    category: SquadCategory.FIRST_TEAM,
    seasonNumber: 1,
    version: 1,
    memberships: playerIds.map((playerId, index) => ({
      playerId: playerId as never,
      shirtNumber: index + 1,
      role: null,
      effectiveFrom: OCCURRED,
    })),
  };
}

/**
 * Monta um mundo com dois clubes: o vendedor com 23 jogadores reais da gênese, o
 * comprador com 22 (uma vaga livre para receber). Devolve o jogador-alvo, seu
 * valor estimado e a taxa de 100% (dentro da faixa 40–250% da R-26).
 */
function arrange(buyerCashMultiplier: number) {
  const world = new FakeWorld();
  const generated = generateSquadAttributes({ worldSeed: SEED, clubIndex: 0 });

  const sellerIds = generated.map((_p, i) => `p-seller-${i}`);
  const buyerIds = generated.slice(0, 22).map((_p, i) => `p-buyer-${i}`);

  // O agregado do jogador-alvo (o primeiro do vendedor), com atributos reais.
  const target = generated[0]!;
  const targetId = sellerIds[0]!;
  const overall = derivePlayerOverall(target.position, target.attributes);
  const valueMinor = estimatePlayerValueMinor(overall, 25);

  world.players.set(targetId, {
    person: {
      id: "person-target" as never,
      gameWorldId: WORLD as never,
      firstName: "Alvo",
      lastName: "Da Transferência",
      birthDate: "2001-07-17", // 25 anos em 2026-07-17
      nationality: "BR",
      version: 1,
    },
    player: {
      id: targetId as never,
      gameWorldId: WORLD as never,
      personId: "person-target" as never,
      primaryPosition: target.position,
      dominantFoot: "RIGHT",
      careerStatus: "ACTIVE",
      availability: "AVAILABLE",
      generationSource: "INITIAL_WORLD",
      generatedAtSeasonNumber: 1,
      attributes: target.attributes,
      currentAbility: overall,
      baselineAbility: overall,
      lastAgedSeasonId: null,
      potentialAbility: overall,
      dynamicState: {
        morale: 50,
        confidence: 50,
        happiness: 50,
        fatigue: 0,
        matchSharpness: 50,
      },
      lastProcessedOn: OCCURRED,
      version: 1,
    },
  });

  world.squads.set(SELLER, squadOf(SELLER, sellerIds));
  world.squads.set(BUYER, squadOf(BUYER, buyerIds));
  world.accounts.push(cashAccount(SELLER), cashAccount(BUYER));
  world.cashByClub.set(BUYER, valueMinor * BigInt(buyerCashMultiplier));
  world.cashByClub.set(SELLER, 0n);

  return { world, targetId, valueMinor };
}

function inputFor(targetId: string, feeMinor: bigint) {
  return {
    gameWorldId: WORLD,
    buyingClubId: BUYER,
    sellerClubId: SELLER,
    playerId: targetId,
    feeMinor,
    currentSeason: 1,
    worldSeed: SEED,
    occurredOn: OCCURRED,
  };
}

describe("SignPlayer — a compra de verdade (R-192)", () => {
  it("move elenco, cria contrato e lança o dinheiro num só commit", async () => {
    const { world, targetId, valueMinor } = arrange(3);
    const fee = valueMinor; // 100% — dentro da faixa

    const result = await new SignPlayer(fakeUnitOfWork(world)).execute(
      inputFor(targetId, fee),
    );

    expect(result.ok).toBe(true);

    // Efeito 3 — elenco: saiu do vendedor, entrou no comprador.
    const seller = world.squads.get(SELLER)!;
    const buyer = world.squads.get(BUYER)!;
    expect(seller.memberships.some((m) => m.playerId === targetId)).toBe(false);
    expect(buyer.memberships.some((m) => m.playerId === targetId)).toBe(true);

    // Efeito 2 — contrato: nasce ACTIVE, ligado ao comprador (paga a R-189).
    expect(world.contracts).toHaveLength(1);
    const contract = world.contracts[0]!;
    expect(contract.status).toBe(ContractStatus.ACTIVE);
    expect(contract.clubId).toBe(BUYER);
    expect(contract.salaryPerSeasonMinor).toBe(valueMinor / 20n);

    // Efeito 1 — dinheiro: um lançamento TRANSFER, débito no vendedor,
    // crédito no comprador, e as duas linhas somam igual (Σdébito=Σcrédito).
    expect(world.journal).toHaveLength(1);
    const lines = world.journal[0]!.lines;
    expect(lines).toHaveLength(2);
    const debit = lines.find((l) => l.direction === "DEBIT")!;
    const credit = lines.find((l) => l.direction === "CREDIT")!;
    expect(debit.financialAccountId).toBe(`acc-cash-${SELLER}`);
    expect(credit.financialAccountId).toBe(`acc-cash-${BUYER}`);
    expect(debit.amountMinor).toBe(fee);
    expect(credit.amountMinor).toBe(fee);

    // Efeito 4 (C11) — a imprensa narra a contratação, no mesmo commit.
    expect(world.narratives).toHaveLength(1);
    expect(world.narratives[0]!.playerId).toBe(targetId);
    expect(world.narratives[0]!.clubId).toBe(BUYER);

    // Efeito 5 (C12) — a caixa de entrada do clube comprador ganha a pendência.
    expect(world.notifications).toHaveLength(1);
    expect(world.notifications[0]!.clubId).toBe(BUYER);
    expect(world.notifications[0]!.userId).toBeNull();
  });

  it("recusa a taxa fora da faixa da R-26 sem gravar nada", async () => {
    const { world, targetId, valueMinor } = arrange(10);
    const fee = valueMinor * 3n; // 300% > 250% — fora da faixa

    const result = await new SignPlayer(fakeUnitOfWork(world)).execute(
      inputFor(targetId, fee),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("TRANSFER_FEE_OUT_OF_RANGE");
    expect(world.contracts).toHaveLength(0);
    expect(world.journal).toHaveLength(0);
    expect(
      world.squads.get(SELLER)!.memberships.some((m) => m.playerId === targetId),
    ).toBe(true);
  });

  it("caixa insuficiente desfaz a transação inteira — nada meio-feito", async () => {
    const { world, targetId, valueMinor } = arrange(1);
    // Comprador tem exatamente o valor; a taxa de 150% não cabe.
    const fee = (valueMinor * 3n) / 2n;

    const result = await new SignPlayer(fakeUnitOfWork(world)).execute(
      inputFor(targetId, fee),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CASH_INSUFFICIENT");
    // Atomicidade: nem elenco movido, nem contrato, nem lançamento.
    expect(world.contracts).toHaveLength(0);
    expect(world.journal).toHaveLength(0);
    expect(
      world.squads.get(BUYER)!.memberships.some((m) => m.playerId === targetId),
    ).toBe(false);
  });

  it("recusa comprar o jogador que não é do vendedor", async () => {
    const { world } = arrange(3);
    const result = await new SignPlayer(fakeUnitOfWork(world)).execute(
      inputFor("p-buyer-0", 1_000_000n),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PLAYER_NOT_IN_SELLER_SQUAD");
  });

  it("elenco cheio no teto de registro (R-193) recusa a contratação", async () => {
    const { world, targetId, valueMinor } = arrange(3);
    // Enche o comprador até o teto (MAX_SQUAD_SIZE), sem vaga.
    world.squads.set(
      BUYER,
      squadOf(
        BUYER,
        Array.from({ length: MAX_SQUAD_SIZE }, (_v, i) => `p-buyer-full-${i}`),
      ),
    );
    const result = await new SignPlayer(fakeUnitOfWork(world)).execute(
      inputFor(targetId, valueMinor),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SQUAD_CAPACITY_EXCEEDED");
    // Atomicidade: recusa não deixou rastro — o jogador segue no vendedor.
    expect(
      world.squads.get(SELLER)!.memberships.some((m) => m.playerId === targetId),
    ).toBe(true);
    expect(world.journal).toHaveLength(0);
  });
});
