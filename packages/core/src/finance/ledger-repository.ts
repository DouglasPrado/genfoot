import type { GameWorldId } from "@grinta/shared";

import type { ClubId } from "../genesis/genesis-types.js";

import type {
  JournalEntrySnapshot,
  LedgerAccountSnapshot,
} from "./ledger-types.js";

/**
 * O razão de C9 (R-175/R-178). Contas e lançamentos são roots por entidade.
 *
 * `sumClubCashMinor` é a projeção do saldo: a soma dos lançamentos POSTADOS na
 * conta de caixa do clube. Não há coluna de saldo — pedir o saldo é somar o
 * razão (R-178). Fica no repositório, não no domínio, porque é uma agregação de
 * banco (`SUM` sobre `JournalLine`), não uma regra.
 */
export interface LedgerRepository {
  findAccount(
    gameWorldId: GameWorldId,
    ownerScope: LedgerAccountSnapshot["ownerScope"],
    accountCode: string,
  ): Promise<LedgerAccountSnapshot | null>;

  saveAccount(
    snapshot: LedgerAccountSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;

  /**
   * Grava um lançamento POSTADO com suas linhas. Idempotente por
   * `sourceEventId`: se já existe lançamento para aquele evento, não duplica
   * (um evento, um lançamento — R-191).
   *
   * Devolve `true` se gravou, `false` se pulou por já existir — a gênese precisa
   * saber se de fato criou algo para não se declarar "criou" numa reexecução.
   */
  appendJournalEntry(snapshot: JournalEntrySnapshot): Promise<boolean>;

  /** O caixa de um clube: Σ lançamentos postados na conta de caixa dele. */
  sumClubCashMinor(
    gameWorldId: GameWorldId,
    clubId: ClubId,
  ): Promise<bigint>;
}
