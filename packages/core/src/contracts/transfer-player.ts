import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { AccountOwnerScope } from "../finance/ledger-types.js";
import { JournalEntry } from "../finance/journal-entry.js";
import {
  JournalLineDirection,
  MoneyFlowClass,
} from "../finance/ledger-types.js";
import type { LedgerRepository } from "../finance/ledger-repository.js";
import { BASE_CURRENCY_ID } from "../finance/ledger-bootstrap.js";
import { MAX_SQUAD_SIZE } from "../genesis/player-generation.js";
import { assertCashAvailable } from "../finance/spend-guard.js";
import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";
import type { SquadRepository } from "../clubs/squad-repository.js";
import { Squad } from "../clubs/squad.js";
import type { PlayerRepository } from "../players/player-repository.js";
import { derivePlayerOverall } from "../players/player-attributes.js";
import type { NarrativeRepository } from "../narrative/narrative-types.js";
import { buildTransferNarrative } from "../narrative/transfer-narrative.js";
import type { NotificationRepository } from "../notifications/notification-types.js";
import { buildTransferNotification } from "../notifications/transfer-notification.js";
import {
  estimatePlayerValueMinor,
  estimateSalaryPerSeasonMinor,
  isTransferFeeInRange,
} from "../players/player-value.js";

import {
  ContractStatus,
  type ContractRepository,
  type PlayerContractSnapshot,
} from "./contract-types.js";

/**
 * Os repositórios que uma transferência toca, na MESMA transação (R-192).
 * Dinheiro (C9), contrato (C6) e elenco (C3): ou os três, ou nenhum.
 */
export interface TransferRepositories {
  readonly players: PlayerRepository;
  readonly squads: SquadRepository;
  readonly ledger: LedgerRepository;
  readonly contracts: ContractRepository;
  /** C11 — a imprensa narra a contratação no mesmo commit do fato. */
  readonly narratives: NarrativeRepository;
  /** C12 — a caixa de entrada do clube recebe a pendência, no mesmo commit. */
  readonly notifications: NotificationRepository;
  /** R-220 Fase 3 — o entrosamento do comprador leva um baque: cara nova desajusta. */
  readonly clubCohesion: ClubCohesionRepository;
}

/** Escreve o entrosamento (coesão) de um clube — o baque da transferência (R-220.1). */
export interface ClubCohesionRepository {
  applyTransferHit(gameWorldId: string, clubId: string): Promise<void>;
}

export interface TransferUnitOfWork {
  run<T>(work: (repositories: TransferRepositories) => Promise<T>): Promise<T>;
}

export interface SignPlayerInput {
  readonly gameWorldId: string;
  readonly buyingClubId: string;
  readonly sellerClubId: string;
  readonly playerId: string;
  readonly feeMinor: bigint;
  readonly currentSeason: number;
  readonly worldSeed: string;
  readonly occurredOn: string;
}

export interface SignPlayerResult {
  readonly playerId: string;
  readonly feeMinor: string;
  readonly buyerCashAfterMinor: string;
}

const CONTRACT_LENGTH_SEASONS = 3;

/**
 * A compra de verdade — R-192.
 *
 * Recusa ANTES de gravar qualquer coisa: jogador que não é do vendedor, taxa fora
 * da faixa da R-26, caixa insuficiente. E quando grava, grava os três efeitos no
 * mesmo commit pelo UnitOfWork — meio efeito é corrupção (jogador pago e não
 * entregue, ou entregue e não pago).
 */
export class SignPlayer {
  public constructor(private readonly unitOfWork: TransferUnitOfWork) {}

  public execute(
    input: SignPlayerInput,
  ): Promise<Result<SignPlayerResult, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      if (input.buyingClubId === input.sellerClubId) {
        return fail(
          new DomainError(
            "TRANSFER_SAME_CLUB",
            "O jogador já é do clube comprador.",
          ),
        );
      }

      const worldId = input.gameWorldId as never;
      const sellerSquad = await repos.squads.findFirstTeamSquad(
        worldId,
        input.sellerClubId as never,
      );
      const buyerSquad = await repos.squads.findFirstTeamSquad(
        worldId,
        input.buyingClubId as never,
      );
      if (sellerSquad === null || buyerSquad === null) {
        return fail(
          new DomainError("SQUAD_NOT_FOUND", "Elenco não encontrado."),
        );
      }

      const membership = sellerSquad.memberships.find(
        (m) => m.playerId === input.playerId,
      );
      if (membership === undefined) {
        return fail(
          new DomainError(
            "PLAYER_NOT_IN_SELLER_SQUAD",
            "O jogador não está no elenco do clube vendedor.",
          ),
        );
      }

      // O valor arbitra a faixa da taxa (R-26). Vem do jogador real, não de fora.
      const aggregate = await repos.players.findPlayerById(
        worldId,
        input.playerId as never,
      );
      if (aggregate === null) {
        return fail(
          new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado."),
        );
      }
      const overall = derivePlayerOverall(
        aggregate.player.primaryPosition,
        aggregate.player.attributes,
      );
      const age = ageOn(aggregate.person.birthDate, input.occurredOn);
      const valueMinor = estimatePlayerValueMinor(overall, age);
      if (!isTransferFeeInRange(input.feeMinor, valueMinor)) {
        return fail(
          new DomainError(
            "TRANSFER_FEE_OUT_OF_RANGE",
            "A proposta está fora da faixa de 40% a 250% do valor (R-26).",
            { valueMinor: valueMinor.toString(), feeMinor: input.feeMinor.toString() },
          ),
        );
      }

      // Caixa do comprador — projeção do razão (R-178). Não se compra fiado. A
      // trava é o helper canônico de gasto voluntário (`spend-guard`), que
      // recusa com `CASH_INSUFFICIENT` e devolve o caixa para reuso.
      const cashGuard = await assertCashAvailable(
        repos.ledger,
        worldId,
        input.buyingClubId as never,
        input.feeMinor,
      );
      if (!cashGuard.ok) return cashGuard;
      const buyerCash = cashGuard.value;

      // As contas de caixa dos dois clubes (o razão as criou na gênese).
      const buyerCashAccount = await repos.ledger.findAccount(
        worldId,
        AccountOwnerScope.CLUB,
        `CASH:${input.buyingClubId}`,
      );
      const sellerCashAccount = await repos.ledger.findAccount(
        worldId,
        AccountOwnerScope.CLUB,
        `CASH:${input.sellerClubId}`,
      );
      if (buyerCashAccount === null || sellerCashAccount === null) {
        return fail(
          new DomainError(
            "LEDGER_ACCOUNT_MISSING",
            "Conta de caixa de um dos clubes não existe.",
          ),
        );
      }

      // ── Efeito 3: a projeção (C3). Move a membership do vendedor ao comprador.
      const loadedSeller = Squad.fromSnapshot(sellerSquad);
      if (!loadedSeller.ok) return loadedSeller;
      const removed = loadedSeller.value.remove(input.playerId);
      if (!removed.ok) return removed;

      const loadedBuyer = Squad.fromSnapshot(buyerSquad);
      if (!loadedBuyer.ok) return loadedBuyer;
      const shirt = nextFreeShirt(buyerSquad.memberships.map((m) => m.shirtNumber));
      const assigned = loadedBuyer.value.assign({
        playerId: input.playerId as never,
        shirtNumber: shirt,
        role: null,
        effectiveFrom: input.occurredOn,
      });
      if (!assigned.ok) return assigned;

      await repos.squads.saveSquad(loadedSeller.value.snapshot(), sellerSquad.version);
      await repos.squads.saveSquad(loadedBuyer.value.snapshot(), buyerSquad.version);

      // ── Efeito 2: o contrato (C6). O vínculo autoritativo nasce — paga a R-189.
      const previous = await repos.contracts.findActiveByPlayer(
        worldId,
        input.playerId,
      );
      if (previous !== null) {
        await repos.contracts.saveContract({
          ...previous,
          status: ContractStatus.TRANSFERRED,
          version: previous.version + 1,
        });
      }
      const contract: PlayerContractSnapshot = {
        id: uuid(input, `contract:${input.playerId}:${input.occurredOn}`),
        gameWorldId: worldId,
        playerId: input.playerId,
        clubId: input.buyingClubId,
        currencyId: BASE_CURRENCY_ID,
        status: ContractStatus.ACTIVE,
        startSeason: input.currentSeason,
        endSeason: input.currentSeason + CONTRACT_LENGTH_SEASONS,
        salaryPerSeasonMinor: estimateSalaryPerSeasonMinor(valueMinor),
        signingBonusMinor: 0n,
        releaseClauseMinor: null,
        version: 1,
      };
      await repos.contracts.saveContract(contract);

      // ── Efeito 1: o dinheiro (C9). A taxa anda comprador→vendedor. TRANSFER: o
      // caixa do comprador cai (crédito) e o do vendedor sobe (débito), balanceado.
      const entry = JournalEntry.post({
        id: uuid(input, `transfer:${input.playerId}:${input.occurredOn}`),
        gameWorldId: worldId,
        clubId: input.buyingClubId as never,
        currencyId: BASE_CURRENCY_ID,
        flowClass: MoneyFlowClass.TRANSFER,
        description: `Transferência de ${input.playerId}`,
        sourceEventId: uuid(input, `transfer-event:${input.playerId}:${input.occurredOn}`),
        seasonNumber: input.currentSeason,
        occurredOn: input.occurredOn,
        lines: [
          {
            financialAccountId: sellerCashAccount.id,
            direction: JournalLineDirection.DEBIT,
            amountMinor: input.feeMinor,
            currencyId: BASE_CURRENCY_ID,
          },
          {
            financialAccountId: buyerCashAccount.id,
            direction: JournalLineDirection.CREDIT,
            amountMinor: input.feeMinor,
            currencyId: BASE_CURRENCY_ID,
          },
        ],
      });
      if (!entry.ok) return entry;
      await repos.ledger.appendJournalEntry(entry.value.snapshot());

      // ── C11: a imprensa narra o fato, no MESMO commit. Idempotente por id
      // determinístico — reprocessar a transferência não duplica a manchete.
      await repos.narratives.append(
        buildTransferNarrative({
          gameWorldId: input.gameWorldId,
          worldSeed: input.worldSeed,
          buyingClubId: input.buyingClubId,
          playerId: input.playerId,
          playerName:
            `${aggregate.person.firstName} ${aggregate.person.lastName}`.trim(),
          feeMinor: input.feeMinor,
          currencyId: BASE_CURRENCY_ID,
          occurredOn: input.occurredOn,
        }),
      );

      // ── C12: a caixa de entrada do clube ganha a pendência, no MESMO commit.
      // Também idempotente por id determinístico.
      await repos.notifications.append(
        buildTransferNotification({
          gameWorldId: input.gameWorldId,
          worldSeed: input.worldSeed,
          buyingClubId: input.buyingClubId,
          playerId: input.playerId,
          playerName:
            `${aggregate.person.firstName} ${aggregate.person.lastName}`.trim(),
          feeMinor: input.feeMinor,
          occurredOn: input.occurredOn,
        }),
      );

      // ── R-220 Fase 3: a contratação sacode o coletivo do comprador — a coesão
      // cai (cohesionAfterTransfer), no MESMO commit. O time reentrosa jogando.
      await repos.clubCohesion.applyTransferHit(
        input.gameWorldId,
        input.buyingClubId,
      );

      return succeed({
        playerId: input.playerId,
        feeMinor: input.feeMinor.toString(),
        buyerCashAfterMinor: (buyerCash - input.feeMinor).toString(),
      });
    });
  }
}

// ─── auxiliares ──────────────────────────────────────────────────────────────

function uuid(input: SignPlayerInput, context: string): string {
  return deterministicUuidV7({
    worldSeed: input.worldSeed,
    context: `${input.gameWorldId}:${context}`,
    timestampMilliseconds: timestampOf(input.occurredOn),
  });
}

/** O menor número de camisa livre (1..MAX_SQUAD_SIZE) no elenco do comprador. */
function nextFreeShirt(taken: readonly number[]): number {
  const used = new Set(taken);
  for (let n = 1; n <= MAX_SQUAD_SIZE; n += 1) if (!used.has(n)) return n;
  return MAX_SQUAD_SIZE;
}

function ageOn(birthDate: string, on: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [ny, nm, nd] = on.split("-").map(Number) as [number, number, number];
  const passed = nm > bm || (nm === bm && nd >= bd);
  return ny - by - (passed ? 0 : 1);
}

class Rollback extends Error {
  public constructor(public readonly domainError: DomainError) {
    super(domainError.message);
  }
}

/**
 * Falha de DOMÍNIO desfaz a transação inteira — senão sobra dinheiro movido sem
 * jogador, ou jogador movido sem dinheiro. Prisma só desfaz por exceção; embrulha,
 * lança, desembrulha fora.
 */
async function run<T>(
  unitOfWork: TransferUnitOfWork,
  work: (repositories: TransferRepositories) => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    return await unitOfWork.run(async (repositories) => {
      const result = await work(repositories);
      if (!result.ok) throw new Rollback(result.error);
      return result;
    });
  } catch (error) {
    if (error instanceof Rollback) return fail(error.domainError);
    throw error;
  }
}
