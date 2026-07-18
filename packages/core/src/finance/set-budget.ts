import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";

import { Budget } from "./budget.js";
import type { BudgetAreaKind, BudgetRepository, BudgetSnapshot } from "./budget-types.js";

/**
 * Definir o orçamento do clube — command `SetBudget` (M-BUDGET, doc 23 linha 34).
 *
 * Concorrência otimista por `expectedVersion` (R-175): `null` abre o orçamento
 * (primeira vez); um número exige bater com a versão atual, senão recusa. As
 * invariantes de sobre-alocação/comprometimento vivem no agregado `Budget`; aqui
 * só orquestra a porta e a concorrência. Os eventos `BudgetSet`/
 * `BudgetRevisionCreated` são materializados pela borda.
 */
export interface SetBudgetInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly currencyId: string;
  readonly authorizedTotalMinor: bigint;
  readonly allocations: readonly {
    readonly area: BudgetAreaKind;
    readonly authorizedMinor: bigint;
  }[];
  /** Versão esperada; `null` quando o clube ainda não tem orçamento. */
  readonly expectedVersion: number | null;
}

export class SetBudget {
  public constructor(private readonly repository: BudgetRepository) {}

  public async execute(
    input: SetBudgetInput,
  ): Promise<Result<BudgetSnapshot, DomainError>> {
    const worldId = input.gameWorldId as never;
    const clubId = input.clubId as never;
    const existing = await this.repository.findByClub(worldId, clubId);

    if (existing === null) {
      if (input.expectedVersion !== null) {
        return fail(
          new DomainError(
            "BUDGET_VERSION_CONFLICT",
            "Orçamento inexistente não tem versão a comparar.",
            { expectedVersion: input.expectedVersion },
          ),
        );
      }
      const opened = Budget.open({
        id: deterministicUuidV7({
          worldSeed: input.worldSeed,
          context: `${input.gameWorldId}:budget:${input.clubId}`,
          timestampMilliseconds: timestampOf(input.occurredOn),
        }),
        gameWorldId: worldId,
        clubId,
        currencyId: input.currencyId,
        authorizedTotalMinor: input.authorizedTotalMinor,
        allocations: input.allocations,
      });
      if (!opened.ok) return opened;
      await this.repository.save(opened.value.snapshot(), null);
      return succeed(opened.value.snapshot());
    }

    if (input.expectedVersion !== existing.version) {
      return fail(
        new DomainError(
          "BUDGET_VERSION_CONFLICT",
          "A versão do orçamento mudou; recarregue e tente de novo.",
          {
            expectedVersion: input.expectedVersion,
            actualVersion: existing.version,
          },
        ),
      );
    }

    const loaded = Budget.fromSnapshot(existing);
    if (!loaded.ok) return loaded;
    const revised = loaded.value.revise({
      authorizedTotalMinor: input.authorizedTotalMinor,
      allocations: input.allocations,
    });
    if (!revised.ok) return revised;
    await this.repository.save(revised.value.snapshot(), existing.version);
    return succeed(revised.value.snapshot());
  }
}
