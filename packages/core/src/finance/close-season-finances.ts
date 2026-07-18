import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";

import { BASE_CURRENCY_ID } from "./ledger-bootstrap.js";
import { JournalEntry, type JournalLineInput } from "./journal-entry.js";
import type { LedgerRepository } from "./ledger-repository.js";
import {
  AccountOwnerScope,
  JournalLineDirection,
  MoneyFlowClass,
} from "./ledger-types.js";
import {
  computeSeasonCost,
  SeasonCostCategory,
  type SeasonCostBreakdown,
  type SeasonCostDepartmentInput,
  type SeasonCostStadiumInput,
} from "./season-cost-model.js";

/**
 * Débito de custos no encerramento de temporada — passo 14 do motor de virada
 * (`06-temporada §6`).
 *
 * **O débito é INCONDICIONAL.** Diferente do gasto voluntário (transferência,
 * obra), aqui não há trava de caixa: os salários e a manutenção são devidos, e
 * um clube que não os cobre entra em crise (R-45) — o caixa PODE ficar negativo,
 * e isso é o sinal, não um erro a barrar. `CASH_INSUFFICIENT` não se aplica.
 *
 * Sem faucet de receita materializada, este lançamento só DRENA caixa; repetido
 * a cada temporada, leva à insolvência progressiva — comportamento assumido até
 * a receita (bilheteria/TV/patrocínio) existir. Não se inventa receita para
 * disfarçar o déficit.
 *
 * Idempotente por `sourceEventId = …:close-season:${clubId}:${seasonNumber}`:
 * reprocessar a mesma virada não debita duas vezes (`appendJournalEntry` pula o
 * duplicado). Ids determinísticos (R-182).
 */

export interface SeasonFinancePlayer {
  readonly playerId: string;
  readonly overall: number;
  readonly age: number;
  /** Salário do contrato ACTIVE, ou `null` (jogador da gênese — R-189). */
  readonly salaryPerSeasonMinor: bigint | null;
}

export interface SeasonFinanceStructure {
  readonly departments: readonly SeasonCostDepartmentInput[];
  readonly stadium: SeasonCostStadiumInput;
}

/**
 * A leitura que o encerramento precisa: o elenco (com overall/idade e salário
 * quando há contrato) e a estrutura física do clube. Implementada no app sobre
 * os read models existentes (`SquadReadModel.roster`, `ClubReadModel`).
 */
export interface SeasonFinanceReader {
  loadSquadForCost(
    gameWorldId: string,
    clubId: string,
    occurredOn: string,
  ): Promise<readonly SeasonFinancePlayer[]>;

  loadStructure(
    gameWorldId: string,
    clubId: string,
  ): Promise<SeasonFinanceStructure | null>;
}

export interface SeasonFinanceRepositories {
  readonly ledger: LedgerRepository;
  readonly reader: SeasonFinanceReader;
}

export interface SeasonFinanceUnitOfWork {
  run<T>(
    work: (repositories: SeasonFinanceRepositories) => Promise<T>,
  ): Promise<T>;
}

export interface CloseSeasonFinancesInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly seasonNumber: number;
  readonly worldSeed: string;
  readonly occurredOn: string;
}

export interface CloseSeasonFinancesResult {
  readonly clubId: string;
  readonly seasonNumber: number;
  readonly debitedMinor: string;
  readonly breakdown: SeasonCostBreakdown;
  /** `false` quando o lançamento já existia (idempotência) ou o custo era 0. */
  readonly posted: boolean;
}

/** Soma das linhas de uma categoria (independente da procedência). */
function sumCategory(
  breakdown: SeasonCostBreakdown,
  category: SeasonCostCategory,
): bigint {
  return breakdown.lines
    .filter((line) => line.category === category)
    .reduce((acc, line) => acc + line.amountMinor, 0n);
}

export class CloseSeasonFinances {
  public constructor(private readonly unitOfWork: SeasonFinanceUnitOfWork) {}

  public execute(
    input: CloseSeasonFinancesInput,
  ): Promise<Result<CloseSeasonFinancesResult, DomainError>> {
    return this.unitOfWork.run(async (repos) => {
      const worldId = input.gameWorldId as never;

      const structure = await repos.reader.loadStructure(
        input.gameWorldId,
        input.clubId,
      );
      if (structure === null) {
        return fail(
          new DomainError("CLUB_NOT_FOUND", "Clube não encontrado."),
        );
      }
      const players = await repos.reader.loadSquadForCost(
        input.gameWorldId,
        input.clubId,
        input.occurredOn,
      );

      const breakdown = computeSeasonCost({
        currencyId: BASE_CURRENCY_ID,
        players,
        departments: structure.departments,
        stadium: structure.stadium,
      });

      const wageMinor =
        sumCategory(breakdown, SeasonCostCategory.PLAYER_WAGES) +
        sumCategory(breakdown, SeasonCostCategory.STAFF_WAGES);
      const operatingMinor =
        sumCategory(breakdown, SeasonCostCategory.INFRA_MAINTENANCE) +
        sumCategory(breakdown, SeasonCostCategory.STADIUM_MAINTENANCE) +
        sumCategory(breakdown, SeasonCostCategory.OPERATING);
      const totalMinor = wageMinor + operatingMinor;

      // Custo zero (mundo sem elenco/estrutura): nada a debitar, nada a postar.
      if (totalMinor === 0n) {
        return succeed({
          clubId: input.clubId,
          seasonNumber: input.seasonNumber,
          debitedMinor: "0",
          breakdown,
          posted: false,
        });
      }

      const cashAccount = await repos.ledger.findAccount(
        worldId,
        AccountOwnerScope.CLUB,
        `CASH:${input.clubId}`,
      );
      const wageSink = await repos.ledger.findAccount(
        worldId,
        AccountOwnerScope.WORLD,
        "SYS:WAGE_SINK",
      );
      const operatingSink = await repos.ledger.findAccount(
        worldId,
        AccountOwnerScope.WORLD,
        "SYS:OPERATING_SINK",
      );
      if (cashAccount === null || wageSink === null || operatingSink === null) {
        return fail(
          new DomainError(
            "LEDGER_ACCOUNT_MISSING",
            "Conta de caixa ou de ralo do clube/mundo não existe.",
          ),
        );
      }

      // Dobrada: o dinheiro morre nos ralos (débito) e sai do caixa (crédito).
      // Σ débitos = Σ créditos por construção → conservação preservada.
      const debitLines: JournalLineInput[] = [];
      if (wageMinor > 0n) {
        debitLines.push({
          financialAccountId: wageSink.id,
          direction: JournalLineDirection.DEBIT,
          amountMinor: wageMinor,
          currencyId: BASE_CURRENCY_ID,
        });
      }
      if (operatingMinor > 0n) {
        debitLines.push({
          financialAccountId: operatingSink.id,
          direction: JournalLineDirection.DEBIT,
          amountMinor: operatingMinor,
          currencyId: BASE_CURRENCY_ID,
        });
      }

      const entry = JournalEntry.post({
        id: this.uuid(input, `close-season:${input.clubId}:${input.seasonNumber}`),
        gameWorldId: worldId,
        clubId: input.clubId as never,
        currencyId: BASE_CURRENCY_ID,
        flowClass: MoneyFlowClass.SINK,
        description: `Custos da temporada ${input.seasonNumber}`,
        sourceEventId: this.uuid(
          input,
          `close-season-event:${input.clubId}:${input.seasonNumber}`,
        ),
        seasonNumber: input.seasonNumber,
        occurredOn: input.occurredOn,
        lines: [
          ...debitLines,
          {
            financialAccountId: cashAccount.id,
            direction: JournalLineDirection.CREDIT,
            amountMinor: totalMinor,
            currencyId: BASE_CURRENCY_ID,
          },
        ],
      });
      if (!entry.ok) return entry;

      const posted = await repos.ledger.appendJournalEntry(entry.value.snapshot());

      return succeed({
        clubId: input.clubId,
        seasonNumber: input.seasonNumber,
        debitedMinor: totalMinor.toString(),
        breakdown,
        posted,
      });
    });
  }

  private uuid(input: CloseSeasonFinancesInput, context: string): string {
    return deterministicUuidV7({
      worldSeed: input.worldSeed,
      context: `${input.gameWorldId}:${context}`,
      timestampMilliseconds: timestampOf(input.occurredOn),
    });
  }
}
