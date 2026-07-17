import { DomainError, WorldDate, fail, succeed, type Result } from "@grinta/shared";

import {
  AccountNormalSide,
  JournalEntryStatus,
  JournalLineDirection,
  type JournalEntrySnapshot,
  type JournalLineSnapshot,
  type LedgerAccountSnapshot,
  type MoneyFlowClass,
} from "./ledger-types.js";

export interface JournalLineInput {
  readonly financialAccountId: string;
  readonly direction: JournalLineDirection;
  readonly amountMinor: bigint;
  readonly currencyId: string;
}

export interface PostJournalEntryInput {
  readonly id: string;
  readonly gameWorldId: JournalEntrySnapshot["gameWorldId"];
  readonly clubId: JournalEntrySnapshot["clubId"];
  readonly currencyId: string;
  readonly flowClass: MoneyFlowClass;
  readonly description?: string | null;
  readonly sourceEventId?: string | null;
  readonly seasonNumber?: number | null;
  readonly occurredOn: string;
  readonly lines: readonly JournalLineInput[];
}

/**
 * Um lançamento no razão (R-178).
 *
 * `post` é a única porta de criação, e ela recusa antes de gravar:
 *
 * - **valor não-positivo** — o sinal vem da `direction`, então `amountMinor` é
 *   sempre > 0. Um valor negativo seria dois sinais para o mesmo fato.
 * - **desbalanceado** — `Σ débitos ≠ Σ créditos` (por moeda). É a invariante do
 *   razão dobrado: dinheiro não some nem aparece, só troca de conta.
 * - **moeda misturada** — toda linha na moeda do lançamento. A invariante do
 *   balanço é "por moeda", e um lançamento é de uma moeda só (câmbio é dois
 *   lançamentos ligados, não um).
 * - **menos de duas linhas** — uma partida precisa de dois lados.
 *
 * Nasce POSTED: neste estágio de C9 não há rascunho editável. O ciclo
 * DRAFT→POSTING→POSTED existe no físico e volta quando um fluxo precisar dele.
 */
export class JournalEntry {
  private constructor(private readonly state: JournalEntrySnapshot) {}

  public static post(
    input: PostJournalEntryInput,
  ): Result<JournalEntry, DomainError> {
    const occurredOn = WorldDate.parse(input.occurredOn);
    if (!occurredOn.ok) return occurredOn;

    if (input.lines.length < 2) {
      return fail(
        new DomainError(
          "JOURNAL_ENTRY_INCOMPLETE",
          "Uma partida dobrada precisa de ao menos duas linhas.",
        ),
      );
    }

    let debit = 0n;
    let credit = 0n;
    const lines: JournalLineSnapshot[] = [];
    for (let index = 0; index < input.lines.length; index += 1) {
      const line = input.lines[index]!;
      if (line.amountMinor <= 0n) {
        return fail(
          new DomainError(
            "JOURNAL_LINE_NON_POSITIVE",
            "O valor da linha é sempre positivo; o sinal vem da direção.",
            { lineNumber: index + 1 },
          ),
        );
      }
      if (line.currencyId !== input.currencyId) {
        return fail(
          new DomainError(
            "JOURNAL_LINE_CURRENCY_MISMATCH",
            "Toda linha do lançamento é da moeda do lançamento.",
            { lineNumber: index + 1 },
          ),
        );
      }
      if (line.direction === JournalLineDirection.DEBIT) debit += line.amountMinor;
      else credit += line.amountMinor;
      lines.push({
        lineNumber: index + 1,
        financialAccountId: line.financialAccountId,
        direction: line.direction,
        amountMinor: line.amountMinor,
        currencyId: line.currencyId,
      });
    }

    if (debit !== credit) {
      return fail(
        new DomainError(
          "JOURNAL_ENTRY_UNBALANCED",
          "Σ débitos deve ser igual a Σ créditos.",
          { debitMinor: debit.toString(), creditMinor: credit.toString() },
        ),
      );
    }

    return succeed(
      new JournalEntry({
        id: input.id,
        gameWorldId: input.gameWorldId,
        clubId: input.clubId,
        currencyId: input.currencyId,
        flowClass: input.flowClass,
        status: JournalEntryStatus.POSTED,
        description: input.description ?? null,
        reversalOfJournalEntryId: null,
        sourceEventId: input.sourceEventId ?? null,
        seasonNumber: input.seasonNumber ?? null,
        occurredOn: input.occurredOn,
        postedOn: input.occurredOn,
        lines,
        version: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: JournalEntrySnapshot,
  ): Result<JournalEntry, DomainError> {
    let debit = 0n;
    let credit = 0n;
    for (const line of snapshot.lines) {
      if (line.direction === JournalLineDirection.DEBIT) debit += line.amountMinor;
      else credit += line.amountMinor;
    }
    if (snapshot.lines.length < 2 || debit !== credit || snapshot.version < 1) {
      return fail(
        new DomainError(
          "INVALID_JOURNAL_ENTRY",
          "O lançamento viola o balanço ou a versão.",
          { journalEntryId: snapshot.id },
        ),
      );
    }
    return succeed(new JournalEntry(snapshot));
  }

  public snapshot(): JournalEntrySnapshot {
    return this.state;
  }
}

/**
 * O saldo de uma conta é a soma dos lançamentos POSTADOS nela, com o sinal dado
 * pelo LADO NORMAL da conta — não é coluna, é projeção (R-178).
 *
 * Ativo/despesa crescem no débito; passivo/patrimônio/receita, no crédito. Então
 * o caixa de um clube (ativo) é `Σ débitos − Σ créditos`, e uma faucet
 * (`SYSTEM_FAUCET`, lado crédito) fica POSITIVA no valor que já criou — a cada
 * dotação ela é creditada. A oferta monetária do mundo é `Σ faucets − Σ sinks`,
 * e é igual ao dinheiro que os clubes de fato têm.
 */
export function accountBalanceMinor(
  account: Pick<LedgerAccountSnapshot, "id" | "normalSide">,
  postedLines: readonly Pick<
    JournalLineSnapshot,
    "financialAccountId" | "direction" | "amountMinor"
  >[],
): bigint {
  let debit = 0n;
  let credit = 0n;
  for (const line of postedLines) {
    if (line.financialAccountId !== account.id) continue;
    if (line.direction === JournalLineDirection.DEBIT) debit += line.amountMinor;
    else credit += line.amountMinor;
  }
  return account.normalSide === AccountNormalSide.DEBIT
    ? debit - credit
    : credit - debit;
}
