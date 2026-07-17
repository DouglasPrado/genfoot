import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";

import { JournalEntry } from "./journal-entry.js";
import {
  AccountNormalSide,
  AccountOwnerScope,
  FinancialAccountType,
  JournalLineDirection,
  MoneyFlowClass,
  SystemAccount,
  type JournalEntrySnapshot,
  type LedgerAccountSnapshot,
} from "./ledger-types.js";

/**
 * A moeda-base do mundo — R-191.
 *
 * Constante por ora: o `GameWorldSnapshot` ainda não carrega `currencyId` (é
 * coluna pendente do config de economia). Quando carregar, isto lê de lá. O id é
 * o da moeda semeada pela migração `20260717160000_moeda_catalogo`.
 */
export const BASE_CURRENCY_ID = "019b76da-a800-7787-9462-49c009becccc";

/**
 * A dotação inicial — ECO-001: R$ 5.000.000 = 500000000 minor, igual para todo
 * clube, na moeda-base. Não é um número mágico numa coluna: é o crédito da
 * torneira `SYS_INITIAL_ENDOWMENT` (ver abaixo).
 */
export const INITIAL_ENDOWMENT_MINOR = 500_000_000n;

export interface LedgerGenesis {
  readonly accounts: readonly LedgerAccountSnapshot[];
  readonly entries: readonly JournalEntrySnapshot[];
}

/**
 * O razão inicial do mundo: o plano de contas mínimo e a dotação de cada clube.
 *
 * A dotação NÃO é `club.cashMinor = 500000000`. É um lançamento de partida
 * dobrada: DEBITA a conta de caixa do clube (ativo sobe) e CREDITA a torneira
 * `SYS_INITIAL_ENDOWMENT` (o dinheiro nasce por ela, contabilizado). A oferta
 * monetária do mundo segue sendo `Σ faucets − Σ sinks`, auditável (ECO-003) — um
 * número solto quebraria a economia fechada que o GDD §1 exige.
 *
 * Determinístico (R-182): todo id sai do seed do mundo. Reexecutar produz os
 * mesmos ids, e a idempotência por `sourceEventId` impede dinheiro duplicado.
 */
export function buildLedgerGenesis(
  world: GameWorldSnapshot,
  genesis: WorldGenesisSnapshot,
): LedgerGenesis {
  const timestampMilliseconds = Date.parse(`${world.startDate}T00:00:00.000Z`);
  const uuid = (context: string) =>
    deterministicUuidV7({ worldSeed: world.seed, context, timestampMilliseconds });

  // A torneira da dotação: uma por mundo, lado crédito (o dinheiro que ela cria
  // aparece como crédito). É conta de SISTEMA (scope WORLD), sem clube.
  const faucet: LedgerAccountSnapshot = {
    id: uuid(`${world.id}:ledger:faucet:initial-endowment`),
    gameWorldId: world.id,
    ownerScope: AccountOwnerScope.WORLD,
    clubId: null,
    systemAccount: SystemAccount.SYS_INITIAL_ENDOWMENT,
    accountCode: "SYS:INITIAL_ENDOWMENT",
    accountType: FinancialAccountType.SYSTEM_FAUCET,
    normalSide: AccountNormalSide.CREDIT,
    currencyId: BASE_CURRENCY_ID,
    version: 1,
  };

  const accounts: LedgerAccountSnapshot[] = [faucet];
  const entries: JournalEntrySnapshot[] = [];

  for (const club of genesis.clubs) {
    // Caixa do clube: ativo, lado débito. O código carrega o clube porque o
    // unique do plano de contas é (mundo, escopo, código) — dois clubes não
    // podem dividir "CASH".
    const cash: LedgerAccountSnapshot = {
      id: uuid(`${world.id}:ledger:cash:${club.id}`),
      gameWorldId: world.id,
      ownerScope: AccountOwnerScope.CLUB,
      clubId: club.id,
      systemAccount: null,
      accountCode: `CASH:${club.id}`,
      accountType: FinancialAccountType.ASSET,
      normalSide: AccountNormalSide.DEBIT,
      currencyId: BASE_CURRENCY_ID,
      version: 1,
    };
    accounts.push(cash);

    const posted = JournalEntry.post({
      id: uuid(`${world.id}:ledger:endowment:${club.id}`),
      gameWorldId: world.id,
      clubId: club.id,
      currencyId: BASE_CURRENCY_ID,
      flowClass: MoneyFlowClass.FAUCET,
      description: "Dotação inicial (ECO-001)",
      // Idempotência de projeção: reexecutar a gênese não credita duas vezes.
      sourceEventId: uuid(`${world.id}:ledger:endowment-event:${club.id}`),
      seasonNumber: 1,
      occurredOn: world.startDate,
      lines: [
        {
          financialAccountId: cash.id,
          direction: JournalLineDirection.DEBIT,
          amountMinor: INITIAL_ENDOWMENT_MINOR,
          currencyId: BASE_CURRENCY_ID,
        },
        {
          financialAccountId: faucet.id,
          direction: JournalLineDirection.CREDIT,
          amountMinor: INITIAL_ENDOWMENT_MINOR,
          currencyId: BASE_CURRENCY_ID,
        },
      ],
    });
    // `post` só falha por regra de balanço, e este lançamento é balanceado por
    // construção. Se falhar, é bug de programação, não de dado — estoura.
    if (!posted.ok) throw posted.error;
    entries.push(posted.value.snapshot());
  }

  return { accounts, entries };
}
