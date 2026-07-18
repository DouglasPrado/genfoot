import { describe, expect, it } from "vitest";

import {
  JournalEntry,
  accountBalanceMinor,
  type JournalLineInput,
} from "./journal-entry.js";
import {
  AccountNormalSide,
  JournalEntryStatus,
  JournalLineDirection,
  MoneyFlowClass,
} from "./ledger-types.js";

const CURRENCY = "019b76da-a800-7787-9462-49c009becccc";
const CLUB_CASH = "acc-club-cash";
const ENDOWMENT_FAUCET = "acc-sys-endowment";

/** A dotação inicial de ECO-001: R$ 5.000.000 = 500000000 minor. */
const ENDOWMENT = 500_000_000n;

function post(lines: readonly JournalLineInput[]) {
  return JournalEntry.post({
    id: "entry-1",
    gameWorldId: "world-1" as never,
    clubId: "club-1" as never,
    currencyId: CURRENCY,
    flowClass: MoneyFlowClass.FAUCET,
    occurredOn: "2026-01-01",
    lines,
  });
}

const endowmentLines: readonly JournalLineInput[] = [
  {
    financialAccountId: CLUB_CASH,
    direction: JournalLineDirection.DEBIT,
    amountMinor: ENDOWMENT,
    currencyId: CURRENCY,
  },
  {
    financialAccountId: ENDOWMENT_FAUCET,
    direction: JournalLineDirection.CREDIT,
    amountMinor: ENDOWMENT,
    currencyId: CURRENCY,
  },
];

describe("JournalEntry.post — a partida dobrada (R-178)", () => {
  it("aceita um lançamento balanceado e nasce POSTED", () => {
    const result = post(endowmentLines);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.snapshot().status).toBe(JournalEntryStatus.POSTED);
      expect(result.value.snapshot().lines).toHaveLength(2);
    }
  });

  it("recusa Σ débitos ≠ Σ créditos", () => {
    const result = post([
      { ...endowmentLines[0]! },
      { ...endowmentLines[1]!, amountMinor: ENDOWMENT - 1n },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("JOURNAL_ENTRY_UNBALANCED");
  });

  it("recusa valor não-positivo — o sinal vem da direção", () => {
    const result = post([
      { ...endowmentLines[0]!, amountMinor: 0n },
      { ...endowmentLines[1]! },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("JOURNAL_LINE_NON_POSITIVE");
  });

  it("recusa moeda diferente da do lançamento", () => {
    const result = post([
      { ...endowmentLines[0]!, currencyId: "outra-moeda" },
      { ...endowmentLines[1]! },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe("JOURNAL_LINE_CURRENCY_MISMATCH");
  });

  it("recusa lançamento com menos de duas linhas", () => {
    const result = post([endowmentLines[0]!]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("JOURNAL_ENTRY_INCOMPLETE");
  });

  /** Dinheiro real: a oferta monetária de um mundo inteiro cabe em bigint, não em double. */
  it("soma valores grandes sem perder precisão (bigint, R-181)", () => {
    const big = 9_000_000_000_000_000n; // > 2^53, estouraria double
    const result = post([
      { ...endowmentLines[0]!, amountMinor: big },
      { ...endowmentLines[1]!, amountMinor: big },
    ]);
    expect(result.ok).toBe(true);
  });
});

describe("accountBalanceMinor — saldo é projeção, não coluna (R-178)", () => {
  const lines = endowmentLines.map((l, i) => ({ ...l, lineNumber: i + 1 }));

  it("o caixa do clube (ativo) sobe com o débito da dotação", () => {
    const balance = accountBalanceMinor(
      { id: CLUB_CASH, normalSide: AccountNormalSide.DEBIT },
      lines,
    );
    expect(balance).toBe(ENDOWMENT);
  });

  /** A faucet (lado crédito) fica POSITIVA: é o quanto de dinheiro ela já criou. */
  it("a faucet fica positiva no valor que criou", () => {
    const balance = accountBalanceMinor(
      { id: ENDOWMENT_FAUCET, normalSide: AccountNormalSide.CREDIT },
      lines,
    );
    expect(balance).toBe(ENDOWMENT);
  });

  /**
   * Economia fechada: o dinheiro que o clube TEM é exatamente o que a faucet
   * CRIOU — nada surgiu do nada. A oferta monetária (Σ faucets − Σ sinks) é igual
   * ao caixa dos clubes.
   */
  it("o caixa do clube é igual ao que a faucet criou", () => {
    const cash = accountBalanceMinor(
      { id: CLUB_CASH, normalSide: AccountNormalSide.DEBIT },
      lines,
    );
    const faucet = accountBalanceMinor(
      { id: ENDOWMENT_FAUCET, normalSide: AccountNormalSide.CREDIT },
      lines,
    );
    expect(cash).toBe(faucet);
  });
});
