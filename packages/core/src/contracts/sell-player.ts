import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { Squad } from "../clubs/squad.js";
import type { SquadRepository } from "../clubs/squad-repository.js";
import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";
import { BASE_CURRENCY_ID } from "../finance/ledger-bootstrap.js";
import { JournalEntry } from "../finance/journal-entry.js";
import {
  AccountOwnerScope,
  JournalLineDirection,
  MoneyFlowClass,
} from "../finance/ledger-types.js";
import type { LedgerRepository } from "../finance/ledger-repository.js";
import { derivePlayerOverall } from "../players/player-attributes.js";
import type { PlayerRepository } from "../players/player-repository.js";
import { estimatePlayerValueMinor } from "../players/player-value.js";

import {
  ContractStatus,
  type ContractRepository,
} from "./contract-types.js";

/**
 * Vender um jogador ao mercado (C6/C9). O clube tira o jogador do elenco, encerra
 * o contrato e RECEBE o valor estimado (R-41) — o dinheiro entra pelo mesmo
 * faucet do sistema da dotação inicial (`SYS:INITIAL_ENDOWMENT`): o "mercado"
 * (os clubes de IA, coletivamente) paga. É a decisão R-199: sem comprador humano,
 * o mercado absorve o jogador e injeta o valor na economia, como um prêmio.
 *
 * Os quatro efeitos — elenco, contrato, razão — num só commit. Meio efeito é
 * corrupção (dinheiro sem jogador vendido, ou jogador fora sem o dinheiro).
 */
export interface SellRepositories {
  readonly squads: SquadRepository;
  readonly contracts: ContractRepository;
  readonly ledger: LedgerRepository;
  readonly players: PlayerRepository;
}

export interface SellUnitOfWork {
  run<T>(work: (repositories: SellRepositories) => Promise<T>): Promise<T>;
}

export interface SellPlayerInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
  readonly currentSeason: number;
  readonly occurredOn: string;
}

const MARKET_ACCOUNT_CODE = "SYS:INITIAL_ENDOWMENT";

export class SellPlayer {
  public constructor(private readonly unitOfWork: SellUnitOfWork) {}

  public execute(
    input: SellPlayerInput,
  ): Promise<Result<{ playerId: string; valueMinor: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const worldId = input.gameWorldId as never;
      const squad = await repos.squads.findFirstTeamSquad(
        worldId,
        input.clubId as never,
      );
      if (squad === null) {
        return fail(new DomainError("SQUAD_NOT_FOUND", "Elenco não encontrado."));
      }
      if (!squad.memberships.some((m) => m.playerId === input.playerId)) {
        return fail(
          new DomainError(
            "PLAYER_NOT_IN_SQUAD",
            "O jogador não está no elenco deste clube.",
          ),
        );
      }

      // O valor vem do jogador real (R-41).
      const aggregate = await repos.players.findPlayerById(
        worldId,
        input.playerId as never,
      );
      if (aggregate === null) {
        return fail(new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado."));
      }
      const overall = derivePlayerOverall(
        aggregate.player.primaryPosition,
        aggregate.player.attributes,
      );
      const age = ageOn(aggregate.person.birthDate, input.worldDate);
      const valueMinor = estimatePlayerValueMinor(overall, age);

      // As contas: o caixa do clube e o faucet do mercado.
      const cashAccount = await repos.ledger.findAccount(
        worldId,
        AccountOwnerScope.CLUB,
        `CASH:${input.clubId}`,
      );
      const marketAccount = await repos.ledger.findAccount(
        worldId,
        AccountOwnerScope.WORLD,
        MARKET_ACCOUNT_CODE,
      );
      if (cashAccount === null || marketAccount === null) {
        return fail(
          new DomainError("LEDGER_ACCOUNT_MISSING", "Conta de caixa ou de mercado não existe."),
        );
      }

      // ── Elenco: sai.
      const loaded = Squad.fromSnapshot(squad);
      if (!loaded.ok) return loaded;
      const removed = loaded.value.remove(input.playerId);
      if (!removed.ok) return removed;
      await repos.squads.saveSquad(loaded.value.snapshot(), squad.version);

      // ── Contrato: encerra o ativo, se houver.
      const contract = await repos.contracts.findActiveByPlayer(
        worldId,
        input.playerId,
      );
      if (contract !== null) {
        await repos.contracts.saveContract({
          ...contract,
          status: ContractStatus.TERMINATED,
          version: contract.version + 1,
        });
      }

      // ── Dinheiro: o valor entra. DÉBITO no caixa (ativo sobe), CRÉDITO no
      // faucet do mercado — balanceado.
      const entry = JournalEntry.post({
        id: uuid(input, `sale:${input.playerId}`),
        gameWorldId: worldId,
        clubId: input.clubId as never,
        currencyId: BASE_CURRENCY_ID,
        flowClass: MoneyFlowClass.FAUCET,
        description: `Venda de ${input.playerId} ao mercado`,
        sourceEventId: uuid(input, `sale-event:${input.playerId}`),
        seasonNumber: input.currentSeason,
        occurredOn: input.occurredOn,
        lines: [
          {
            financialAccountId: cashAccount.id,
            direction: JournalLineDirection.DEBIT,
            amountMinor: valueMinor,
            currencyId: BASE_CURRENCY_ID,
          },
          {
            financialAccountId: marketAccount.id,
            direction: JournalLineDirection.CREDIT,
            amountMinor: valueMinor,
            currencyId: BASE_CURRENCY_ID,
          },
        ],
      });
      if (!entry.ok) return entry;
      await repos.ledger.appendJournalEntry(entry.value.snapshot());

      return succeed({
        playerId: input.playerId,
        valueMinor: valueMinor.toString(),
      });
    });
  }
}

function uuid(input: SellPlayerInput, context: string): string {
  return deterministicUuidV7({
    worldSeed: input.worldSeed,
    context: `${input.gameWorldId}:${context}:${input.occurredOn}`,
    timestampMilliseconds: timestampOf(input.occurredOn),
  });
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

async function run<T>(
  unitOfWork: SellUnitOfWork,
  work: (repositories: SellRepositories) => Promise<Result<T, DomainError>>,
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
