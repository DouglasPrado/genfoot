import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import type { ClubId } from "../genesis/genesis-types.js";

import type { Budget } from "./budget.js";
import type { BudgetAreaKind } from "./budget-types.js";
import type { LedgerRepository } from "./ledger-repository.js";

/**
 * A trava do gasto voluntário — "ter dinheiro em caixa não é o mesmo que poder
 * gastá-lo" (economia §15). Duas checagens independentes, ambas obrigatórias
 * antes de comprometer dinheiro numa transferência/obra/salário:
 *
 * - `assertCashAvailable`: o caixa real (Σ do razão, INV-8) cobre o valor?
 * - `assertBudgetAvailable`: a área do orçamento tem autorização disponível?
 *
 * Extraído do padrão embutido em `transfer-player.ts` para ser reusado por todo
 * gasto. NÃO se aplica ao débito de encerramento de temporada, que é devido e
 * incondicional (`close-season-finances.ts`).
 */
/** No sucesso devolve o caixa atual, para o chamador reusar (ex.: caixa após). */
export async function assertCashAvailable(
  ledger: LedgerRepository,
  gameWorldId: Parameters<LedgerRepository["sumClubCashMinor"]>[0],
  clubId: ClubId,
  amountMinor: bigint,
): Promise<Result<bigint, DomainError>> {
  const cash = await ledger.sumClubCashMinor(gameWorldId, clubId);
  if (cash < amountMinor) {
    return fail(
      new DomainError("CASH_INSUFFICIENT", "Caixa insuficiente para o gasto.", {
        cashMinor: cash.toString(),
        amountMinor: amountMinor.toString(),
      }),
    );
  }
  return succeed(cash);
}

export function assertBudgetAvailable(
  budget: Budget,
  area: BudgetAreaKind,
  amountMinor: bigint,
): Result<void, DomainError> {
  const available = budget.availableForArea(area);
  if (available < amountMinor) {
    // Folha tem código próprio no contrato UX (WAGE_BUDGET_EXCEEDED); as demais
    // áreas caem em BUDGET_INSUFFICIENT.
    const code = area === "WAGES" ? "WAGE_BUDGET_EXCEEDED" : "BUDGET_INSUFFICIENT";
    return fail(
      new DomainError(code, "Orçamento da área insuficiente para o gasto.", {
        area,
        availableMinor: available.toString(),
        amountMinor: amountMinor.toString(),
      }),
    );
  }
  return succeed(undefined);
}
