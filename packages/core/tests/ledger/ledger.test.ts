import {
  DomainError,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  PostTransaction,
  WorldLedger,
  type GameWorldSnapshot,
  type LedgerRepository,
  type WorldLedgerSnapshot,
} from "../../src/index.js";

class MemoryLedgerRepository implements LedgerRepository {
  public snapshot: WorldLedgerSnapshot | null = null;

  public findLedgerByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldLedgerSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveLedger(
    snapshot: WorldLedgerSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("LEDGER_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "ledger-001"): GameWorldSnapshot {
  const rulesetVersion = parseRulesetVersion("1.0.0");
  if (!rulesetVersion.ok) throw rulesetVersion.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed,
    startDate: date("2026-01-01"),
    rulesetVersion: rulesetVersion.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function fundedLedger() {
  const gameWorld = world();
  const created = WorldLedger.initialize(gameWorld);
  if (!created.ok) throw created.error;
  const value = created.value;
  const faucet = value.openLedgerAccount({
    name: "Injeção de temporada",
    type: "FAUCET",
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: "acc:faucet",
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-01",
  });
  const cash = value.openLedgerAccount({
    name: "Caixa do clube",
    type: "ASSET",
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: "acc:cash",
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-01",
  });
  if (!faucet.ok || !cash.ok) throw new Error("falha ao abrir contas");
  const posted = value.postTransaction({
    transactionClass: "SEASON_INJECTION",
    occurredOn: "2026-01-02",
    entries: [
      { accountId: cash.value.id, direction: "DEBIT", amountMinor: 1000 },
      { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 1000 },
    ],
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: "tx:injection",
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-02",
  });
  if (!posted.ok) throw posted.error;
  return { gameWorld, value, cashId: cash.value.id, faucetId: faucet.value.id };
}

describe("Economy and ledger", () => {
  it("abre conta e produz um único efeito ao repetir a chave", () => {
    const gameWorld = world();
    const created = WorldLedger.initialize(gameWorld);
    if (!created.ok) throw created.error;
    const value = created.value;
    const first = value.openLedgerAccount({
      name: "Caixa",
      type: "ASSET",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "acc:x",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    expect(first).toMatchObject({ ok: true, value: { normalBalance: "DEBIT" } });
    const revision = value.snapshot().revision;
    const repeated = value.openLedgerAccount({
      name: "Caixa",
      type: "ASSET",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "acc:x",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    expect(repeated).toEqual(first);
    expect(value.snapshot().accounts).toHaveLength(1);
    expect(value.snapshot().revision).toBe(revision);
  });

  it("lança dobrado com conservação e rejeita transação desbalanceada", () => {
    const { gameWorld, value, cashId, faucetId } = fundedLedger();
    expect(value.accountBalance(cashId)).toBe(1000);
    expect(value.accountBalance(faucetId)).toBe(1000);
    expect(value.summary().residualMinor).toBe(0);

    expect(
      value.postTransaction({
        transactionClass: "BROKEN",
        occurredOn: "2026-01-03",
        entries: [
          { accountId: cashId, direction: "DEBIT", amountMinor: 1000 },
          { accountId: faucetId, direction: "CREDIT", amountMinor: 900 },
        ],
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "tx:broken",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-03",
      }),
    ).toMatchObject({ ok: false, error: { code: "TRANSACTION_UNBALANCED" } });

    const revision = value.snapshot().revision;
    const repeated = value.postTransaction({
      transactionClass: "SEASON_INJECTION",
      occurredOn: "2026-01-02",
      entries: [
        { accountId: cashId, direction: "DEBIT", amountMinor: 1000 },
        { accountId: faucetId, direction: "CREDIT", amountMinor: 1000 },
      ],
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "tx:injection",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    expect(repeated).toMatchObject({ ok: true });
    expect(value.snapshot().transactions).toHaveLength(1);
    expect(value.snapshot().revision).toBe(revision);
  });

  it("reserva reduz o disponível sem alterar a razão e liquida uma única vez", () => {
    const { gameWorld, value, cashId } = fundedLedger();
    const reservation = value.reserveFunds({
      accountId: cashId,
      purpose: "Folha",
      amountMinor: 300,
      expiresOn: "2026-02-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "res:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!reservation.ok) throw reservation.error;
    expect(value.accountBalance(cashId)).toBe(1000);
    expect(value.availableBalance(cashId)).toBe(700);

    expect(
      value.reserveFunds({
        accountId: cashId,
        purpose: "Excesso",
        amountMinor: 800,
        expiresOn: "2026-02-01",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "res:2",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-05",
      }),
    ).toMatchObject({ ok: false, error: { code: "INSUFFICIENT_FUNDS" } });

    const settled = value.settleReservation({
      reservationId: reservation.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "settle:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    expect(settled).toMatchObject({ ok: true, value: { status: "SETTLED" } });
    expect(value.availableBalance(cashId)).toBe(1000);

    const revision = value.snapshot().revision;
    const repeated = value.settleReservation({
      reservationId: reservation.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "settle:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    expect(repeated).toEqual(settled);
    expect(value.snapshot().revision).toBe(revision);

    expect(
      value.releaseReservation({
        reservationId: reservation.value.id,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "release:late",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-21",
      }),
    ).toMatchObject({ ok: false, error: { code: "RESERVATION_TERMINAL" } });
  });

  it("reconcilia com residual zero e mede a oferta em ativos", () => {
    const { gameWorld, value } = fundedLedger();
    const reconciled = value.reconcileWorldLedger({
      asOf: "2026-01-31",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "recon:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-31",
    });
    expect(reconciled).toMatchObject({
      ok: true,
      value: { residualMinor: 0, supplyMinor: 1000 },
    });
    expect(
      value.snapshot().events.some((e) => e.type === "LedgerReconciled"),
    ).toBe(true);
  });

  it("persiste lançamento idempotente via caso de uso", async () => {
    const { gameWorld, value, cashId, faucetId } = fundedLedger();
    const repository = new MemoryLedgerRepository();
    repository.snapshot = value.snapshot();
    const useCase = new PostTransaction(repository);
    const input = {
      transactionClass: "BONUS",
      occurredOn: "2026-01-10",
      entries: [
        { accountId: cashId, direction: "DEBIT" as const, amountMinor: 250 },
        { accountId: faucetId, direction: "CREDIT" as const, amountMinor: 250 },
      ],
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "tx:bonus",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    };
    const first = await useCase.execute(gameWorld.id, input);
    const revision = repository.snapshot.revision;
    const repeated = await useCase.execute(gameWorld.id, input);

    expect(first).toMatchObject({ ok: true, value: { transactionClass: "BONUS" } });
    expect(repeated).toEqual(first);
    expect(repository.snapshot.revision).toBe(revision);
    expect(repository.snapshot.transactions).toHaveLength(2);
  });

  it("não confunde settle e release ao reutilizar a chave em reservas distintas", () => {
    const { gameWorld, value, cashId } = fundedLedger();
    const a = value.reserveFunds({
      accountId: cashId,
      purpose: "A",
      amountMinor: 300,
      expiresOn: "2026-02-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "res:a",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    const b = value.reserveFunds({
      accountId: cashId,
      purpose: "B",
      amountMinor: 200,
      expiresOn: "2026-02-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "res:b",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!a.ok || !b.ok) throw new Error("reservas");

    const settledA = value.settleReservation({
      reservationId: a.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "shared-key",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    expect(settledA).toMatchObject({ ok: true, value: { status: "SETTLED" } });

    // Mesma chave, mas RELEASE de OUTRA reserva: B deve ser liberada de fato.
    const releasedB = value.releaseReservation({
      reservationId: b.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "shared-key",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-10",
    });
    expect(releasedB).toMatchObject({
      ok: true,
      value: { id: b.value.id, status: "RELEASED" },
    });
    // Ambas encerradas → disponível volta ao saldo pleno; nenhuma confusão de alvo.
    expect(value.availableBalance(cashId)).toBe(1000);
    expect(value.summary().activeReservationCount).toBe(0);
  });

  it("registra dívida (AccrueDebt) sem tocar a razão e é idempotente", () => {
    const { gameWorld, value } = fundedLedger();
    const input = {
      creditorRef: "bank:1",
      debtorRef: "club:1",
      principalMinor: 10000,
      scheduleMonths: 24,
      interestRateBps: 500,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "debt:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    };
    const debt = value.accrueDebt(input);
    expect(debt).toMatchObject({
      ok: true,
      value: { status: "ACTIVE", principalMinor: 10000, outstandingMinor: 11000 },
    });
    // conservação preservada — dívida não é partida na razão
    expect(value.summary().residualMinor).toBe(0);
    expect(value.summary().activeDebtCount).toBe(1);

    const revision = value.snapshot().revision;
    const repeated = value.accrueDebt(input);
    expect(repeated).toEqual(debt);
    expect(value.snapshot().revision).toBe(revision);

    expect(
      value.accrueDebt({
        ...input,
        creditorRef: "x",
        debtorRef: "x",
        idempotencyKey: "debt:bad",
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_DEBT" } });
  });

  it("fecha período contábil e bloqueia lançamentos dentro dele", () => {
    const { gameWorld, value, cashId, faucetId } = fundedLedger();
    const closed = value.closeAccountingPeriod({
      label: "2026-01",
      opensOn: "2026-01-01",
      closesOn: "2026-01-31",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "period:jan",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    expect(closed).toMatchObject({
      ok: true,
      value: { status: "CLOSED", closingResidualMinor: 0 },
    });

    // lançar dentro do período fechado é rejeitado
    expect(
      value.postTransaction({
        transactionClass: "LATE",
        occurredOn: "2026-01-15",
        entries: [
          { accountId: cashId, direction: "DEBIT", amountMinor: 100 },
          { accountId: faucetId, direction: "CREDIT", amountMinor: 100 },
        ],
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "tx:late",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-15",
      }),
    ).toMatchObject({ ok: false, error: { code: "ACCOUNTING_PERIOD_CLOSED" } });

    // fora do período fechado, lança normalmente
    expect(
      value.postTransaction({
        transactionClass: "FEB",
        occurredOn: "2026-02-05",
        entries: [
          { accountId: cashId, direction: "DEBIT", amountMinor: 100 },
          { accountId: faucetId, direction: "CREDIT", amountMinor: 100 },
        ],
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "tx:feb",
        worldSeed: gameWorld.seed,
        worldDate: "2026-02-05",
      }),
    ).toMatchObject({ ok: true });

    // período fechado sobreposto é rejeitado
    expect(
      value.closeAccountingPeriod({
        label: "overlap",
        opensOn: "2026-01-15",
        closesOn: "2026-02-15",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "period:ov",
        worldSeed: gameWorld.seed,
        worldDate: "2026-02-20",
      }),
    ).toMatchObject({ ok: false, error: { code: "ACCOUNTING_PERIOD_OVERLAP" } });
  });

  it("expira reservas vencidas por data lógica, uma única vez", () => {
    const { gameWorld, value, cashId } = fundedLedger();
    const reservation = value.reserveFunds({
      accountId: cashId,
      purpose: "Folha",
      amountMinor: 300,
      expiresOn: "2026-02-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "res:exp",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!reservation.ok) throw reservation.error;
    expect(value.availableBalance(cashId)).toBe(700);

    const expired = value.expireReservations({
      asOf: "2026-03-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "expire:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-01",
    });
    if (!expired.ok) throw expired.error;
    expect(expired.value).toHaveLength(1);
    expect(expired.value[0]!.status).toBe("EXPIRED");
    expect(value.availableBalance(cashId)).toBe(1000);

    // idempotente: re-rodar não muda nada
    const revision = value.snapshot().revision;
    const again = value.expireReservations({
      asOf: "2026-03-02",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "expire:2",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-02",
    });
    expect(again).toEqual({ ok: true, value: [] });
    expect(value.snapshot().revision).toBe(revision);
  });

  it("preserva a conservação sob sequências aleatórias de transações (property)", () => {
    const { gameWorld, value, cashId, faucetId } = fundedLedger();
    // gerador determinístico (sem Math.random) para o teste de propriedade
    let seed = 123456789;
    const next = (n: number): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    const accounts = [cashId, faucetId];
    for (let i = 0; i < 60; i += 1) {
      const amount = 1 + next(500);
      const first = accounts[next(2)]!;
      const second = accounts[first === cashId ? 1 : 0]!;
      const posted = value.postTransaction({
        transactionClass: "RANDOM",
        occurredOn: "2026-05-01",
        entries: [
          { accountId: first, direction: "DEBIT", amountMinor: amount },
          { accountId: second, direction: "CREDIT", amountMinor: amount },
        ],
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: `rnd:${i}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-05-01",
      });
      expect(posted.ok).toBe(true);
      // invariante após cada lançamento: residual global == 0
      expect(value.summary().residualMinor).toBe(0);
    }
  });
});
