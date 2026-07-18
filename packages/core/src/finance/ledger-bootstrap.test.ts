import { describe, expect, it } from "vitest";

import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";
import type { GameWorldSnapshot } from "../world/world-types.js";

import { buildLedgerGenesis } from "./ledger-bootstrap.js";
import { accountBalanceMinor } from "./journal-entry.js";
import {
  AccountNormalSide,
  FinancialAccountType,
  SystemAccount,
} from "./ledger-types.js";

// A gênese só lê id/seed/startDate do mundo e o id de cada clube; o resto do
// snapshot é irrelevante para o razão. Casts mínimos, no estilo dos testes de C9.
const world = {
  id: "world-1",
  seed: "seed-1",
  startDate: "2026-01-01",
} as unknown as GameWorldSnapshot;

const genesis = {
  clubs: [{ id: "club-1" }, { id: "club-2" }],
} as unknown as WorldGenesisSnapshot;

describe("buildLedgerGenesis — sinks", () => {
  const ledger = buildLedgerGenesis(world, genesis);

  it("materializa SYS_WAGE_SINK e SYS_OPERATING_SINK, lado DÉBITO", () => {
    for (const sink of [
      SystemAccount.SYS_WAGE_SINK,
      SystemAccount.SYS_OPERATING_SINK,
    ]) {
      const account = ledger.accounts.find((a) => a.systemAccount === sink);
      expect(account).toBeDefined();
      expect(account?.accountType).toBe(FinancialAccountType.SYSTEM_SINK);
      expect(account?.normalSide).toBe(AccountNormalSide.DEBIT);
    }
  });

  it("nascem vazios: sem nenhum lançamento na gênese, saldo do sink é 0", () => {
    for (const sink of [
      SystemAccount.SYS_WAGE_SINK,
      SystemAccount.SYS_OPERATING_SINK,
    ]) {
      const account = ledger.accounts.find((a) => a.systemAccount === sink)!;
      const lines = ledger.entries.flatMap((entry) => entry.lines);
      expect(accountBalanceMinor(account, lines)).toBe(0n);
    }
  });

  it("é aditivo: a conta de caixa de cada clube continua existindo", () => {
    for (const club of ["club-1", "club-2"]) {
      expect(
        ledger.accounts.some((a) => a.accountCode === `CASH:${club}`),
      ).toBe(true);
    }
  });
});
