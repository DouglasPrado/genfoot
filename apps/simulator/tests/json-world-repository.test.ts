import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  OpenLedgerAccount,
  PostTransaction,
  WorldLedger,
  WorldScheduler,
  SeasonRollover,
  WorldGenesisGenerator,
  WorldPlayerLifecycle,
  WorldStatus,
  buildClubPortfolioFromGenesis,
  type GameWorldSnapshot,
} from "@grinta/core";
import {
  newEntityId,
  newGameWorldId,
  parseRulesetVersion,
} from "@grinta/shared";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { JsonWorldRepository } from "../src/json-world-repository.js";

const directories: string[] = [];
const envelopeSchema = z.object({ schemaVersion: z.literal(7) });

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function repository(): Promise<
  Readonly<{ directory: string; value: JsonWorldRepository }>
> {
  const directory = await mkdtemp(join(tmpdir(), "grinta-repository-"));
  directories.push(directory);
  return { directory, value: new JsonWorldRepository(directory) };
}

function snapshot(): GameWorldSnapshot {
  const parsedRuleset = parseRulesetVersion("1.0.0");
  if (!parsedRuleset.ok) throw parsedRuleset.error;

  return {
    id: newGameWorldId(),
    seed: "repository-seed",
    startDate: "2026-01-01",
    currentDate: "2026-01-01",
    rulesetVersion: parsedRuleset.value,
    status: WorldStatus.CREATING,
    worldSequence: 0,
    version: 1,
  };
}

describe("JsonWorldRepository", () => {
  it("faz round-trip em um envelope versionado", async () => {
    const store = await repository();
    const world = snapshot();

    await store.value.save(world, null);

    expect(await store.value.findById(world.id)).toEqual(world);
    const file = envelopeSchema.parse(
      JSON.parse(
        await readFile(join(store.directory, `${world.id}.json`), "utf8"),
      ) as unknown,
    );
    expect(file.schemaVersion).toBe(7);
  });

  it("persiste e recupera a gênese sem alterar o mundo", async () => {
    const store = await repository();
    const world = snapshot();
    const genesis = new WorldGenesisGenerator().generate(world);
    await store.value.save(world, null);

    await store.value.saveGenesis(genesis, world.version);

    expect(await store.value.findByWorldId(world.id)).toEqual(genesis);
    expect(await store.value.findById(world.id)).toEqual(world);
  });

  it("persiste lifecycle de jogadores com controle de revisão", async () => {
    const store = await repository();
    const world = snapshot();
    const genesis = new WorldGenesisGenerator().generate(world);
    const lifecycle = WorldPlayerLifecycle.fromGenesis(world, genesis);
    if (!lifecycle.ok) throw lifecycle.error;
    await store.value.save(world, null);
    await store.value.saveGenesis(genesis, world.version);

    await store.value.savePlayerLifecycle(lifecycle.value.snapshot(), null);

    expect(await store.value.findPlayerLifecycleByWorldId(world.id)).toEqual(
      lifecycle.value.snapshot(),
    );
    await expect(
      store.value.savePlayerLifecycle(lifecycle.value.snapshot(), 99),
    ).rejects.toMatchObject({ code: "PLAYER_LIFECYCLE_REVISION_CONFLICT" });
  });

  it("persiste o ledger C9 com dívida e período fechado (round-trip)", async () => {
    const store = await repository();
    const world = snapshot();
    await store.value.save(world, null);
    const created = WorldLedger.initialize(world);
    if (!created.ok) throw created.error;
    const ledger = created.value;
    const cash = ledger.openLedgerAccount({
      name: "Caixa",
      type: "ASSET",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "a:cash",
      worldSeed: world.seed,
      worldDate: "2026-01-01",
    });
    const faucet = ledger.openLedgerAccount({
      name: "Faucet",
      type: "FAUCET",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "a:faucet",
      worldSeed: world.seed,
      worldDate: "2026-01-01",
    });
    if (!cash.ok || !faucet.ok) throw new Error("contas");
    const tx = ledger.postTransaction({
      transactionClass: "INJ",
      occurredOn: "2026-01-02",
      entries: [
        { accountId: cash.value.id, direction: "DEBIT", amountMinor: 1000 },
        { accountId: faucet.value.id, direction: "CREDIT", amountMinor: 1000 },
      ],
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "tx:1",
      worldSeed: world.seed,
      worldDate: "2026-01-02",
    });
    if (!tx.ok) throw tx.error;
    const debt = ledger.accrueDebt({
      creditorRef: "bank",
      debtorRef: "club",
      principalMinor: 5000,
      scheduleMonths: 12,
      interestRateBps: 300,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "d:1",
      worldSeed: world.seed,
      worldDate: "2026-01-03",
    });
    if (!debt.ok) throw debt.error;
    const period = ledger.closeAccountingPeriod({
      label: "2026-01",
      opensOn: "2026-01-01",
      closesOn: "2026-01-31",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "p:1",
      worldSeed: world.seed,
      worldDate: "2026-02-01",
    });
    if (!period.ok) throw period.error;

    await store.value.saveLedger(ledger.snapshot(), null);
    // round-trip: debts, accountingPeriods e events preservados sem stripping
    expect(await store.value.findLedgerByWorldId(world.id)).toEqual(
      ledger.snapshot(),
    );
    await expect(
      store.value.saveLedger(ledger.snapshot(), 99),
    ).rejects.toMatchObject({ code: "LEDGER_REVISION_CONFLICT" });
  });

  it("retoma o ledger após restart sem duplicar (recovery/replay)", async () => {
    const store = await repository();
    const world = snapshot();
    await store.value.save(world, null);
    const created = WorldLedger.initialize(world);
    if (!created.ok) throw created.error;
    await store.value.saveLedger(created.value.snapshot(), null);

    // "Restart": nova instância do repositório sobre o mesmo diretório.
    const restarted = new JsonWorldRepository(store.directory);
    const openAccount = new OpenLedgerAccount(restarted);
    const cash = await openAccount.execute(world.id, {
      name: "Caixa",
      type: "ASSET",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "a:cash",
      worldSeed: world.seed,
      worldDate: "2026-01-01",
    });
    const faucet = await openAccount.execute(world.id, {
      name: "Faucet",
      type: "FAUCET",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "a:faucet",
      worldSeed: world.seed,
      worldDate: "2026-01-01",
    });
    if (!cash.ok || !faucet.ok) throw new Error("contas");
    const post = new PostTransaction(restarted);
    const input = {
      transactionClass: "INJ",
      occurredOn: "2026-01-02",
      entries: [
        {
          accountId: cash.value.id,
          direction: "DEBIT" as const,
          amountMinor: 1000,
        },
        {
          accountId: faucet.value.id,
          direction: "CREDIT" as const,
          amountMinor: 1000,
        },
      ],
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "tx:1",
      worldSeed: world.seed,
      worldDate: "2026-01-02",
    };
    const first = await post.execute(world.id, input);
    // resposta perdida → retry da mesma chave contra o estado persistido = efeito único
    const retry = await post.execute(world.id, input);
    expect(first).toMatchObject({ ok: true });
    expect(retry).toEqual(first);
    const persisted = await restarted.findLedgerByWorldId(world.id);
    expect(persisted!.transactions).toHaveLength(1);
    expect(
      persisted!.accounts.reduce((sum, account) => sum + account.balanceMinor, 0),
    ).toBe(0);
  });

  it("persiste o portfólio C3 com restart e revisão otimista", async () => {
    const store = await repository();
    const world = snapshot();
    const genesis = new WorldGenesisGenerator().generate(world);
    const portfolio = buildClubPortfolioFromGenesis(world, genesis);
    await store.value.save(world, null);
    await store.value.saveGenesis(genesis, world.version);

    await store.value.saveClubPortfolio(portfolio, null);

    expect(await store.value.findClubPortfolioByWorldId(world.id)).toEqual(
      portfolio,
    );
    await expect(
      store.value.saveClubPortfolio(portfolio, 99),
    ).rejects.toMatchObject({ code: "CLUB_PORTFOLIO_REVISION_CONFLICT" });
  });

  it("lê snapshots v1 e os migra na próxima escrita", async () => {
    const store = await repository();
    const world = snapshot();
    await writeFile(
      join(store.directory, `${world.id}.json`),
      JSON.stringify({ schemaVersion: 1, world }),
      "utf8",
    );

    expect(await store.value.findById(world.id)).toEqual(world);
    expect(await store.value.findByWorldId(world.id)).toBeNull();
    await store.value.save({ ...world, version: 2 }, 1);
    const migrated = envelopeSchema.parse(
      JSON.parse(
        await readFile(join(store.directory, `${world.id}.json`), "utf8"),
      ) as unknown,
    );
    expect(migrated.schemaVersion).toBe(7);
  });

  it("persiste scheduler v2 e materializa campos novos ao ler legado", async () => {
    const store = await repository();
    const world = snapshot();
    await store.value.save(world, null);
    const scheduler = WorldScheduler.create(world.id, {
      rulesetVersion: world.rulesetVersion,
      maxTaskAttempts: 3,
      clockLeaseDurationMs: 30_000,
    });
    if (!scheduler.ok) throw scheduler.error;
    const receipt = {
      commandId: newEntityId<"Command">(),
      idempotencyKey: "advance:legacy",
      commandType: "AdvanceWorldDay" as const,
      gameWorldId: world.id,
      expectedDate: "2026-01-01",
      resultDate: "2026-01-02",
      resultWorldVersion: 2,
      fencingToken: 1,
      rulesetVersion: world.rulesetVersion,
      processedTaskIds: [],
    };
    const recorded = scheduler.value.recordCommandReceipt(receipt);
    if (!recorded.ok) throw recorded.error;

    await store.value.saveScheduling(scheduler.value.snapshot(), null);

    expect(
      await store.value.findSchedulingCommandReceipt(
        world.id,
        receipt.idempotencyKey,
      ),
    ).toEqual(receipt);
    expect(await store.value.findSchedulingByWorldId(world.id)).toMatchObject({
      schemaVersion: 2,
      windows: [],
      rollovers: [],
    });
  });

  it("persiste rollover interrompido para retomada por checkpoint", async () => {
    const store = await repository();
    const world = snapshot();
    await store.value.save(world, null);
    const scheduler = WorldScheduler.create(world.id, {
      rulesetVersion: world.rulesetVersion,
      maxTaskAttempts: 3,
      clockLeaseDurationMs: 30_000,
    });
    if (!scheduler.ok) throw scheduler.error;
    const rollover = SeasonRollover.create({
      id: newEntityId<"SeasonRollover">(),
      gameWorldId: world.id,
      seasonId: newEntityId<"Season">(),
      nextSeason: {
        id: newEntityId<"Season">(),
        number: 2,
        name: "Temporada 2",
        startsOn: "2026-04-15",
        endsOn: "2026-07-15",
      },
      rulesetVersion: world.rulesetVersion,
      maxAttemptsPerStep: 3,
    });
    if (!rollover.ok) throw rollover.error;
    const lease = rollover.value.acquireLease("worker-a", 1_000, 100);
    if (!lease.ok) throw lease.error;
    const claimed = rollover.value.claimCurrentStep(lease.value);
    if (!claimed.ok) throw claimed.error;

    await store.value.saveScheduling(
      {
        ...scheduler.value.snapshot(),
        rollovers: [rollover.value.snapshot()],
      },
      null,
    );

    const persisted = await store.value.findSchedulingByWorldId(world.id);
    expect(persisted?.rollovers).toHaveLength(1);
    expect(persisted?.rollovers[0]).toMatchObject({
      currentStepIndex: 0,
      status: "RUNNING",
    });
    expect(persisted?.rollovers[0]?.steps[0]).toMatchObject({
      stepId: "FINISH_PENDING_MATCHES",
      status: "RUNNING",
    });
  });

  it("retorna null para mundo inexistente", async () => {
    const store = await repository();
    expect(await store.value.findById(newGameWorldId())).toBeNull();
  });

  it("rejeita conflito de versão otimista", async () => {
    const store = await repository();
    const world = snapshot();
    await store.value.save(world, null);

    await expect(
      store.value.save({ ...world, version: 2 }, 99),
    ).rejects.toMatchObject({
      code: "AGGREGATE_VERSION_CONFLICT",
    });
  });

  it("rejeita snapshot corrompido", async () => {
    const store = await repository();
    const world = snapshot();
    await writeFile(
      join(store.directory, `${world.id}.json`),
      "{invalid",
      "utf8",
    );

    await expect(store.value.findById(world.id)).rejects.toMatchObject({
      code: "SNAPSHOT_CORRUPTED",
    });
  });
});
