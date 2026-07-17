import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import type {
  BudgetAllocation,
  BudgetAreaKind,
  BudgetSnapshot,
} from "./budget-types.js";

/**
 * Orçamento do clube — agregado root (R-175: tem `version`).
 *
 * Invariantes (INV-11):
 * - `Σ authorizedMinor ≤ authorizedTotalMinor` — não se autoriza mais do que o
 *   teto total (`BUDGET_OVERALLOCATED`).
 * - `authorizedMinor ≥ committedMinor` por área — rebaixar a autorização abaixo
 *   do que já está comprometido desfinanciaria uma reserva ativa
 *   (`BUDGET_BELOW_COMMITTED`).
 * - valores nunca negativos.
 *
 * O `committedMinor` é gerido pelo sistema (uma reserva o sobe, sua liberação o
 * baixa). `revise` mexe só no que é do gestor — o teto e a autorização por área
 * —, preservando o comprometido.
 */
export interface OpenBudgetInput {
  readonly id: string;
  readonly gameWorldId: BudgetSnapshot["gameWorldId"];
  readonly clubId: BudgetSnapshot["clubId"];
  readonly currencyId: string;
  readonly authorizedTotalMinor: bigint;
  readonly allocations: readonly {
    readonly area: BudgetAreaKind;
    readonly authorizedMinor: bigint;
  }[];
}

export interface ReviseBudgetInput {
  readonly authorizedTotalMinor: bigint;
  readonly allocations: readonly {
    readonly area: BudgetAreaKind;
    readonly authorizedMinor: bigint;
  }[];
}

export class Budget {
  private constructor(private readonly state: BudgetSnapshot) {}

  public static fromSnapshot(
    snapshot: BudgetSnapshot,
  ): Result<Budget, DomainError> {
    const validated = validate(snapshot.authorizedTotalMinor, snapshot.allocations);
    if (!validated.ok) return validated;
    return succeed(new Budget(snapshot));
  }

  /** Abre um orçamento novo (v1), com tudo ainda não comprometido. */
  public static open(input: OpenBudgetInput): Result<Budget, DomainError> {
    const allocations: BudgetAllocation[] = input.allocations.map((allocation) => ({
      area: allocation.area,
      authorizedMinor: allocation.authorizedMinor,
      committedMinor: 0n,
    }));
    const validated = validate(input.authorizedTotalMinor, allocations);
    if (!validated.ok) return validated;
    return succeed(
      new Budget({
        id: input.id,
        gameWorldId: input.gameWorldId,
        clubId: input.clubId,
        currencyId: input.currencyId,
        authorizedTotalMinor: input.authorizedTotalMinor,
        allocations,
        version: 1,
      }),
    );
  }

  /** Reajusta teto e autorizações, preservando o comprometido de cada área. */
  public revise(input: ReviseBudgetInput): Result<Budget, DomainError> {
    const committedByArea = new Map(
      this.state.allocations.map((allocation) => [
        allocation.area,
        allocation.committedMinor,
      ]),
    );
    const allocations: BudgetAllocation[] = input.allocations.map((allocation) => ({
      area: allocation.area,
      authorizedMinor: allocation.authorizedMinor,
      committedMinor: committedByArea.get(allocation.area) ?? 0n,
    }));
    const validated = validate(input.authorizedTotalMinor, allocations);
    if (!validated.ok) return validated;
    return succeed(
      new Budget({
        ...this.state,
        authorizedTotalMinor: input.authorizedTotalMinor,
        allocations,
        version: this.state.version + 1,
      }),
    );
  }

  /** Disponível numa área: autorizado − comprometido (0 se a área não existe). */
  public availableForArea(area: BudgetAreaKind): bigint {
    const allocation = this.state.allocations.find((a) => a.area === area);
    if (allocation === undefined) return 0n;
    return allocation.authorizedMinor - allocation.committedMinor;
  }

  public snapshot(): BudgetSnapshot {
    return this.state;
  }
}

function validate(
  authorizedTotalMinor: bigint,
  allocations: readonly BudgetAllocation[],
): Result<void, DomainError> {
  if (authorizedTotalMinor < 0n) {
    return fail(
      new DomainError("BUDGET_INVALID", "O teto total não pode ser negativo."),
    );
  }
  let sumAuthorized = 0n;
  for (const allocation of allocations) {
    if (allocation.authorizedMinor < 0n || allocation.committedMinor < 0n) {
      return fail(
        new DomainError(
          "BUDGET_INVALID",
          "Valores de orçamento não podem ser negativos.",
          { area: allocation.area },
        ),
      );
    }
    if (allocation.authorizedMinor < allocation.committedMinor) {
      return fail(
        new DomainError(
          "BUDGET_BELOW_COMMITTED",
          "A autorização não pode ficar abaixo do que já está comprometido.",
          {
            area: allocation.area,
            authorizedMinor: allocation.authorizedMinor.toString(),
            committedMinor: allocation.committedMinor.toString(),
          },
        ),
      );
    }
    sumAuthorized += allocation.authorizedMinor;
  }
  if (sumAuthorized > authorizedTotalMinor) {
    return fail(
      new DomainError(
        "BUDGET_OVERALLOCATED",
        "A soma das áreas ultrapassa o teto total autorizado.",
        {
          sumAuthorizedMinor: sumAuthorized.toString(),
          authorizedTotalMinor: authorizedTotalMinor.toString(),
        },
      ),
    );
  }
  return succeed(undefined);
}
