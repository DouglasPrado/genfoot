import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  AdvanceSagaStep,
  AdvanceTransferStep,
  ApproveCorrection,
  CheckpointMatch,
  OpenLedgerAccount,
  PostTransaction,
  RecordOfficialResult,
  WorldAdmin,
  WorldCompetitions,
  WorldEventing,
  WorldLedger,
  WorldMarket,
  WorldInbox,
  WorldMatches,
  WorldNarrative,
  WorldScheduler,
  WorldStaff,
  WorldAutomation,
  ApplyDailyDevelopment,
  CancelPromise,
  EndStaffContract,
  ExecuteDecisionProposal,
  RetryDelivery,
  SeasonRollover,
  WorldGenesisGenerator,
  WorldPlayerLifecycle,
  WorldStatus,
  buildClubPortfolioFromGenesis,
  type AutomationControllerRef,
  type CompetitionClubRef,
  type CompetitionSeasonRef,
  type GameWorldSnapshot,
  type MarketClubRef,
  type MarketPersonRef,
  type MarketPlayerRef,
  type MatchClubRef,
  type MatchFixtureRef,
  type NarrativeClubRef,
  type StaffClubRef,
  type StaffDepartmentRef,
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
const envelopeSchema = z.object({ schemaVersion: z.literal(17) });

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
  /**
   * O envelope era criado por `save(world)`. Com o mundo em tabela
   * (R-173/R-182), a porta `WorldRepository` saiu daqui e o arquivo passa a
   * nascer quando o PRIMEIRO contexto grava. O round-trip do mundo mudou de
   * casa: vive em `prisma-world-repository.test.ts`, contra o Postgres.
   */
  it("o arquivo nasce quando o primeiro contexto grava — não com o mundo", async () => {
    const store = await repository();
    const world = snapshot();

    const ledger = WorldLedger.initialize(world);
    if (!ledger.ok) throw ledger.error;
    await store.value.saveLedger(ledger.value.snapshot(), null);

    const file = envelopeSchema.parse(
      JSON.parse(
        await readFile(join(store.directory, `${world.id}.json`), "utf8"),
      ) as unknown,
    );
    expect(file.schemaVersion).toBe(17);
    expect(await store.value.findLedgerByWorldId(world.id)).not.toBeNull();
  });

  it("preserva seções inicializadas concorrentemente no mesmo mundo", async () => {
    const store = await repository();
    const world = snapshot();

    const ledger = WorldLedger.initialize(world);
    const market = WorldMarket.initialize(world);
    const competitions = WorldCompetitions.initialize(world);
    if (!ledger.ok) throw ledger.error;
    if (!market.ok) throw market.error;
    if (!competitions.ok) throw competitions.error;

    await Promise.all([
      store.value.saveLedger(ledger.value.snapshot(), null),
      store.value.saveMarket(market.value.snapshot(), null),
      store.value.saveCompetitions(competitions.value.snapshot(), null),
    ]);

    expect(await store.value.findLedgerByWorldId(world.id)).not.toBeNull();
    expect(await store.value.findMarketByWorldId(world.id)).not.toBeNull();
    expect(
      await store.value.findCompetitionsByWorldId(world.id),
    ).not.toBeNull();
  });

  it("persiste e recupera a gênese", async () => {
    const store = await repository();
    const world = snapshot();
    const genesis = new WorldGenesisGenerator().generate(world);

    await store.value.saveGenesis(genesis, world.version);

    expect(await store.value.findByWorldId(world.id)).toEqual(genesis);
  });

  it("persiste lifecycle de jogadores com controle de revisão", async () => {
    const store = await repository();
    const world = snapshot();
    const genesis = new WorldGenesisGenerator().generate(world);
    const lifecycle = WorldPlayerLifecycle.fromGenesis(world, genesis);
    if (!lifecycle.ok) throw lifecycle.error;
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
      persisted!.accounts.reduce(
        (sum, account) => sum + account.balanceMinor,
        0,
      ),
    ).toBe(0);
  });

  it("persiste as competições C7 com standings e resultado (round-trip + recovery)", async () => {
    const store = await repository();
    const world = snapshot();
    const created = WorldCompetitions.initialize(world);
    if (!created.ok) throw created.error;
    const competitions = created.value;
    const season =
      "019f0000-0000-7000-8000-0000000000aa" as CompetitionSeasonRef;
    const clubs = [
      "019f0000-0000-7000-8000-0000000000c1",
      "019f0000-0000-7000-8000-0000000000c2",
    ].map((id) => id as CompetitionClubRef);
    const edition = competitions.createCompetitionEdition({
      seasonRef: season,
      name: "Liga",
      formatVersion: "league@1",
      maxParticipants: 2,
      startOn: "2026-02-01",
      roundIntervalDays: 7,
      worldDate: "2026-01-15",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "edition:1",
      worldSeed: world.seed,
    });
    if (!edition.ok) throw edition.error;
    clubs.forEach((clubId, index) => {
      const registered = competitions.registerParticipant({
        editionId: edition.value.id,
        clubId,
        rulesetVersion: world.rulesetVersion,
        idempotencyKey: `reg:${index}`,
        worldSeed: world.seed,
        worldDate: "2026-01-16",
      });
      if (!registered.ok) throw registered.error;
    });
    const fixtures = competitions.generateFixtures({
      editionId: edition.value.id,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "fixtures:1",
      worldSeed: world.seed,
      worldDate: "2026-01-20",
    });
    if (!fixtures.ok) throw fixtures.error;
    const first = competitions.recordOfficialResult({
      fixtureId: fixtures.value[0]!.id,
      matchRef: "match:0",
      homeGoals: 3,
      awayGoals: 1,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "res:0",
      worldSeed: world.seed,
      worldDate: "2026-02-01",
    });
    if (!first.ok) throw first.error;

    await store.value.saveCompetitions(competitions.snapshot(), null);
    // round-trip: standings + fixture com resultRef preservados sem stripping
    expect(await store.value.findCompetitionsByWorldId(world.id)).toEqual(
      competitions.snapshot(),
    );

    // recovery: retry do mesmo resultado após restart = efeito único
    const restarted = new JsonWorldRepository(store.directory);
    const record = new RecordOfficialResult(restarted);
    const retryInput = {
      fixtureId: fixtures.value[0]!.id,
      matchRef: "match:0",
      homeGoals: 3,
      awayGoals: 1,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "res:0:retry",
      worldSeed: world.seed,
      worldDate: "2026-02-01",
    };
    const retry = await record.execute(world.id, retryInput);
    expect(retry).toMatchObject({ ok: true, value: { status: "FINAL" } });
    const reloaded = await restarted.findCompetitionsByWorldId(world.id);
    expect(reloaded!.fixtures.filter((f) => f.status === "FINAL")).toHaveLength(
      1,
    );
    await expect(
      store.value.saveCompetitions(competitions.snapshot(), 99),
    ).rejects.toMatchObject({ code: "COMPETITIONS_REVISION_CONFLICT" });
  });

  it("persiste a partida C8 ao vivo com command log e checkpoint (round-trip + recovery)", async () => {
    const store = await repository();
    const world = snapshot();
    const created = WorldMatches.initialize(world);
    if (!created.ok) throw created.error;
    const matches = created.value;
    const manifest = matches.createMatchManifest({
      fixtureRef: "019f0000-0000-7000-8000-0000000000f1" as MatchFixtureRef,
      homeClubId: "019f0000-0000-7000-8000-0000000000a1" as MatchClubRef,
      awayClubId: "019f0000-0000-7000-8000-0000000000a2" as MatchClubRef,
      kickoffOn: "2026-02-01",
      seed: world.seed,
      engineBuild: "kernel@1",
      timestepChances: 30,
      homeStrength: 70,
      awayStrength: 50,
      worldDate: "2026-02-01",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "m:1",
      worldSeed: world.seed,
    });
    if (!manifest.ok) throw manifest.error;
    const matchId = manifest.value.id;
    const start = matches.startMatch({
      matchId,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "start:1",
      worldSeed: world.seed,
      worldDate: "2026-02-01",
    });
    if (!start.ok) throw start.error;
    const command = matches.submitMatchCommand({
      matchId,
      actor: "coach-home",
      commandType: "TACTIC_SHIFT",
      side: "HOME",
      delta: 6,
      payloadHash: "attack",
      expectedSequence: 1,
      rulesetVersion: world.rulesetVersion,
      commandId: "c1",
      idempotencyKey: "cmd:1",
      worldSeed: world.seed,
      worldDate: "2026-02-01",
    });
    if (!command.ok) throw command.error;
    const advanced = matches.advanceMatchTicks({
      matchId,
      ticks: 15,
      rulesetVersion: world.rulesetVersion,
    });
    if (!advanced.ok) throw advanced.error;
    const checkpoint = matches.checkpointMatch({
      matchId,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "cp:15",
      worldSeed: world.seed,
      worldDate: "2026-02-01",
    });
    if (!checkpoint.ok) throw checkpoint.error;

    await store.value.saveMatches(matches.snapshot(), null);
    // round-trip: runtime, commandLog, checkpoints e events preservados sem stripping
    expect(await store.value.findMatchesByWorldId(world.id)).toEqual(
      matches.snapshot(),
    );

    // recovery: retry do mesmo checkpoint após restart = efeito único
    const restarted = new JsonWorldRepository(store.directory);
    const useCase = new CheckpointMatch(restarted);
    const retry = await useCase.execute(world.id, {
      matchId,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "cp:15",
      worldSeed: world.seed,
      worldDate: "2026-02-01",
    });
    expect(retry).toMatchObject({ ok: true });
    const reloaded = await restarted.findMatchesByWorldId(world.id);
    expect(reloaded!.matches[0]!.checkpoints).toHaveLength(1);
    expect(reloaded!.matches[0]!.commandLog).toHaveLength(1);
    await expect(
      store.value.saveMatches(matches.snapshot(), 99),
    ).rejects.toMatchObject({ code: "MATCHES_REVISION_CONFLICT" });
  });

  it("persiste eventing X-002 com saga durável e projeção (round-trip + recovery)", async () => {
    const store = await repository();
    const world = snapshot();
    const created = WorldEventing.initialize(world, 2);
    if (!created.ok) throw created.error;
    const eventing = created.value;
    const published = eventing.publishOutboxBatch({
      stream: "transfers",
      messages: [
        {
          eventType: "TransferOpened",
          payloadHash: "h1",
          occurredOn: "2026-01-02",
        },
        {
          eventType: "TransferAgreed",
          payloadHash: "h2",
          occurredOn: "2026-01-02",
        },
      ],
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "batch:1",
      worldSeed: world.seed,
      worldDate: "2026-01-02",
    });
    if (!published.ok) throw published.error;
    const saga = eventing.startSaga({
      sagaType: "SAGA-01",
      correlationKey: "transfer:1",
      steps: ["reserve", "settle"],
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "saga:1",
      worldSeed: world.seed,
      worldDate: "2026-01-02",
    });
    if (!saga.ok) throw saga.error;
    const claim = eventing.claimSaga({
      sagaId: saga.value.id,
      owner: "worker-a",
      nowMs: 1_000,
      leaseMs: 30_000,
      rulesetVersion: world.rulesetVersion,
    });
    if (!claim.ok) throw claim.error;
    const advanced = eventing.advanceSagaStep({
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      checkpointHash: "cp-1",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "step:0",
      worldSeed: world.seed,
      worldDate: "2026-01-03",
    });
    if (!advanced.ok) throw advanced.error;
    const projection = eventing.rebuildProjection({
      projectionId: "transfers-view",
      stream: "transfers",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "proj:1",
      worldSeed: world.seed,
      worldDate: "2026-01-03",
    });
    if (!projection.ok) throw projection.error;

    await store.value.saveEventing(eventing.snapshot(), null);
    // round-trip: sagas, projections, registry e events preservados sem stripping
    expect(await store.value.findEventingByWorldId(world.id)).toEqual(
      eventing.snapshot(),
    );

    // recovery: retry do mesmo step após restart = efeito único
    const restarted = new JsonWorldRepository(store.directory);
    const step = new AdvanceSagaStep(restarted);
    const retry = await step.execute(world.id, {
      sagaId: saga.value.id,
      fencingToken: claim.value.fencingToken,
      checkpointHash: "cp-1",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "step:0",
      worldSeed: world.seed,
      worldDate: "2026-01-03",
    });
    expect(retry).toMatchObject({ ok: true });
    const reloaded = await restarted.findEventingByWorldId(world.id);
    expect(
      reloaded!.sagas!.find((s) => s.id === saga.value.id)!.steps[0]!.status,
    ).toBe("DONE");
    await expect(
      store.value.saveEventing(eventing.snapshot(), 99),
    ).rejects.toMatchObject({ code: "EVENTING_REVISION_CONFLICT" });
  });

  it("persiste o mercado C6 com transferência ao vivo (round-trip + recovery)", async () => {
    const store = await repository();
    const world = snapshot();
    const created = WorldMarket.initialize(world);
    if (!created.ok) throw created.error;
    const market = created.value;
    const player = "019f0000-0000-7000-8000-0000000000d1" as MarketPlayerRef;
    const person = "019f0000-0000-7000-8000-0000000000e1" as MarketPersonRef;
    const buyer = "019f0000-0000-7000-8000-0000000000b1" as MarketClubRef;
    const seller = "019f0000-0000-7000-8000-0000000000b2" as MarketClubRef;
    const negotiation = market.openNegotiation({
      playerId: player,
      buyerClubId: buyer,
      sellerClubId: seller,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "neg:1",
      worldSeed: world.seed,
      worldDate: "2026-01-05",
    });
    if (!negotiation.ok) throw negotiation.error;
    const offer = market.submitOffer({
      negotiationId: negotiation.value.id,
      createdByClubId: buyer,
      feeMinor: 1_000_000,
      wageMinor: 20_000,
      contractYears: 3,
      expiresOn: "2026-02-01",
      expectedVersion: 0,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "off:1",
      worldSeed: world.seed,
      worldDate: "2026-01-06",
    });
    if (!offer.ok) throw offer.error;
    const accepted = market.acceptOffer({
      negotiationId: negotiation.value.id,
      version: 1,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "acc:1",
      worldSeed: world.seed,
      worldDate: "2026-01-07",
    });
    if (!accepted.ok) throw accepted.error;
    const transfer = market.startTransfer({
      negotiationId: negotiation.value.id,
      sagaId: "saga-1",
      personId: person,
      wageMinor: 20_000,
      startsOn: "2026-02-01",
      endsOn: "2029-06-30",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "tr:1",
      worldSeed: world.seed,
      worldDate: "2026-01-08",
    });
    if (!transfer.ok) throw transfer.error;
    const step0 = market.advanceTransferStep({
      transferId: transfer.value.id,
      fencingToken: 1,
      checkpointHash: "reserve-ok",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "tr:1:s0",
      worldSeed: world.seed,
      worldDate: "2026-01-08",
    });
    if (!step0.ok) throw step0.error;

    await store.value.saveMarket(market.snapshot(), null);
    // round-trip: negotiations/offers, transfers (steps/processedStepKeys) e events preservados
    expect(await store.value.findMarketByWorldId(world.id)).toEqual(
      market.snapshot(),
    );

    // recovery: retry do mesmo passo da saga após restart = efeito único
    const restarted = new JsonWorldRepository(store.directory);
    const advance = new AdvanceTransferStep(restarted);
    const retry = await advance.execute(world.id, {
      transferId: transfer.value.id,
      fencingToken: 1,
      checkpointHash: "reserve-ok",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "tr:1:s0",
      worldSeed: world.seed,
      worldDate: "2026-01-08",
    });
    expect(retry).toMatchObject({ ok: true });
    const reloaded = await restarted.findMarketByWorldId(world.id);
    expect(reloaded!.transfers![0]!.currentStep).toBe(1);
    await expect(
      store.value.saveMarket(market.snapshot(), 99),
    ).rejects.toMatchObject({ code: "MARKET_REVISION_CONFLICT" });
  });

  it("persiste o admin C12 com caso, correção e audit chain (round-trip + recovery)", async () => {
    const store = await repository();
    const world = snapshot();
    const created = WorldAdmin.initialize(world);
    if (!created.ok) throw created.error;
    const admin = created.value;
    const abuseCase = admin.openCase({
      subjects: ["account:x"],
      severity: 80,
      evidenceRefs: ["ev:1"],
      openedBy: "mod-a",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "case:1",
      worldSeed: world.seed,
      worldDate: "2026-01-05",
    });
    if (!abuseCase.ok) throw abuseCase.error;
    admin.placeQuarantine({
      caseId: abuseCase.value.id,
      scope: "account:x",
      reason: "abuse",
      startsOn: "2026-01-05",
      expiresOn: "2026-01-12",
      placedBy: "mod-a",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "quar:1",
      worldSeed: world.seed,
      worldDate: "2026-01-05",
    });
    const correction = admin.requestCorrection({
      targetOwner: "C9",
      targetId: "ledger-tx:9",
      targetVersion: 3,
      reasonCode: "DOUBLE_POST",
      expectedEffect: "reverse-entry",
      requestedBy: "mod-a",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "corr:1",
      worldSeed: world.seed,
      worldDate: "2026-01-06",
    });
    if (!correction.ok) throw correction.error;

    await store.value.saveAdmin(admin.snapshot(), null);
    // round-trip: cases, quarantines, corrections, auditChain e events preservados
    expect(await store.value.findAdminByWorldId(world.id)).toEqual(
      admin.snapshot(),
    );

    // recovery: aprovar a correção após restart (quatro-olhos) = efeito único no retry
    const restarted = new JsonWorldRepository(store.directory);
    const approve = new ApproveCorrection(restarted);
    const approveInput = {
      correctionId: correction.value.id,
      approvedBy: "mod-b",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "corr:1:approve",
      worldSeed: world.seed,
      worldDate: "2026-01-07",
    };
    const first = await approve.execute(world.id, approveInput);
    const retry = await approve.execute(world.id, approveInput);
    expect(first).toMatchObject({ ok: true, value: { status: "EXECUTED" } });
    expect(retry).toEqual(first);
    const reloaded = await restarted.findAdminByWorldId(world.id);
    expect(
      reloaded!.corrections!.filter((c) => c.status === "EXECUTED"),
    ).toHaveLength(1);
    await expect(
      store.value.saveAdmin(admin.snapshot(), 99),
    ).rejects.toMatchObject({ code: "ADMIN_REVISION_CONFLICT" });
  });

  it("persiste a narrativa C10 com promessa e mídia (round-trip + recovery)", async () => {
    const store = await repository();
    const world = snapshot();
    const created = WorldNarrative.initialize(world);
    if (!created.ok) throw created.error;
    const narrative = created.value;
    const club = "019f0000-0000-7000-8000-0000000000c1" as NarrativeClubRef;
    const promise = narrative.makePublicPromise({
      clubId: club,
      metric: "TOP_4",
      targetValue: 4,
      deadline: "2026-06-30",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "prom:1",
      worldSeed: world.seed,
      worldDate: "2026-01-05",
    });
    if (!promise.ok) throw promise.error;
    const story = narrative.chooseConversationOption({
      clubId: club,
      context: "press-conference",
      options: ["calm", "defiant"],
      choice: "calm",
      frame: "measured-tone",
      factRefs: ["match:1"],
      reputationEffect: 3,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "conv:1",
      worldSeed: world.seed,
      worldDate: "2026-01-06",
    });
    if (!story.ok) throw story.error;

    await store.value.saveNarrative(narrative.snapshot(), null);
    // round-trip: promises, conversations, mediaStories e events preservados
    expect(await store.value.findNarrativeByWorldId(world.id)).toEqual(
      narrative.snapshot(),
    );

    // recovery: cancelar a promessa após restart = efeito único no retry
    const restarted = new JsonWorldRepository(store.directory);
    const cancel = new CancelPromise(restarted);
    const cancelInput = {
      promiseId: promise.value.id,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "prom:1:cancel",
      worldSeed: world.seed,
      worldDate: "2026-02-01",
    };
    const first = await cancel.execute(world.id, cancelInput);
    const retry = await cancel.execute(world.id, cancelInput);
    expect(first).toMatchObject({ ok: true, value: { status: "CANCELLED" } });
    expect(retry).toEqual(first);
    const reloaded = await restarted.findNarrativeByWorldId(world.id);
    expect(reloaded!.mediaStories).toHaveLength(1);
    await expect(
      store.value.saveNarrative(narrative.snapshot(), 99),
    ).rejects.toMatchObject({ code: "NARRATIVE_REVISION_CONFLICT" });
  });

  it("persiste a inbox C11 com notificação, entrega e projeção (round-trip + recovery)", async () => {
    const store = await repository();
    const world = snapshot();
    const created = WorldInbox.initialize(world);
    if (!created.ok) throw created.error;
    const inbox = created.value;
    const notification = inbox.projectNotification({
      dedupKey: "match:1:result",
      recipientScope: "club:1",
      category: "MATCH",
      priority: "HIGH",
      sourceRef: "match:1",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "notif:1",
      worldSeed: world.seed,
      worldDate: "2026-01-05",
    });
    if (!notification.ok) throw notification.error;
    const delivery = inbox.retryDelivery({
      notificationId: notification.value.id,
      channel: "push",
      success: false,
      maxAttempts: 3,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "deliv:1",
      worldSeed: world.seed,
      worldDate: "2026-01-05",
    });
    if (!delivery.ok) throw delivery.error;
    const projection = inbox.rebuildProjection({
      projectionId: "inbox-view",
      stream: "notifications",
      presentSequences: [1, 2, 3],
      throughSequence: 3,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "proj:1",
      worldSeed: world.seed,
      worldDate: "2026-01-05",
    });
    if (!projection.ok) throw projection.error;

    await store.value.saveInbox(inbox.snapshot(), null);
    // round-trip: notifications, deliveries, projections e events preservados
    expect(await store.value.findInboxByWorldId(world.id)).toEqual(
      inbox.snapshot(),
    );

    // recovery: retry idempotente após restart = efeito único
    const restarted = new JsonWorldRepository(store.directory);
    const retry = new RetryDelivery(restarted);
    const retryInput = {
      notificationId: notification.value.id,
      channel: "push",
      success: false,
      maxAttempts: 3,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "deliv:1",
      worldSeed: world.seed,
      worldDate: "2026-01-05",
    };
    const first = await retry.execute(world.id, retryInput);
    const repeated = await retry.execute(world.id, retryInput);
    expect(first).toMatchObject({ ok: true });
    expect(repeated).toEqual(first);
    const reloaded = await restarted.findInboxByWorldId(world.id);
    expect(reloaded!.deliveries).toHaveLength(1);
    expect(reloaded!.projections).toHaveLength(1);
    await expect(
      store.value.saveInbox(inbox.snapshot(), 99),
    ).rejects.toMatchObject({ code: "INBOX_REVISION_CONFLICT" });
  });

  it("persiste o staff C5 com contrato e alocação (round-trip + recovery)", async () => {
    const store = await repository();
    const world = snapshot();
    const created = WorldStaff.initialize(world);
    if (!created.ok) throw created.error;
    const staff = created.value;
    const club = "019f0000-0000-7000-8000-0000000000c1" as StaffClubRef;
    const member = staff.createStaffMember({
      firstName: "Ana",
      lastName: "Treinadora",
      role: "HEAD_COACH",
      capabilities: {
        coaching: 70,
        fitness: 40,
        medical: 30,
        scouting: 50,
        management: 55,
      },
      reputation: 72,
      worldDate: "2026-01-01",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "staff:1",
      worldSeed: world.seed,
    });
    if (!member.ok) throw member.error;
    const offered = staff.offerStaffContract({
      staffId: member.value.id,
      clubId: club,
      role: "HEAD_COACH",
      startOn: "2026-01-01",
      endOn: "2026-12-31",
      compensationRef: "comp:1",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "offer:1",
      worldSeed: world.seed,
      worldDate: "2026-01-01",
    });
    if (!offered.ok) throw offered.error;
    const accepted = staff.acceptStaffContract({
      contractId: offered.value.id,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "accept:1",
      worldSeed: world.seed,
      worldDate: "2026-01-02",
    });
    if (!accepted.ok) throw accepted.error;
    const assigned = staff.assignStaff({
      contractId: accepted.value.id,
      departmentRef:
        "019f0000-0000-7000-8000-0000000000d9" as StaffDepartmentRef,
      workload: 80,
      startOn: "2026-01-03",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "assign:1",
      worldSeed: world.seed,
      worldDate: "2026-01-03",
    });
    if (!assigned.ok) throw assigned.error;

    await store.value.saveStaff(staff.snapshot(), null);
    // round-trip: members, contracts, assignments e events preservados
    expect(await store.value.findStaffByWorldId(world.id)).toEqual(
      staff.snapshot(),
    );

    // recovery: encerrar o contrato após restart = efeito único no retry
    const restarted = new JsonWorldRepository(store.directory);
    const end = new EndStaffContract(restarted);
    const endInput = {
      contractId: accepted.value.id,
      endedOn: "2026-06-30",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "end:1",
      worldSeed: world.seed,
      worldDate: "2026-06-30",
    };
    const first = await end.execute(world.id, endInput);
    const retry = await end.execute(world.id, endInput);
    expect(first).toMatchObject({ ok: true, value: { status: "ENDED" } });
    expect(retry).toEqual(first);
    const reloaded = await restarted.findStaffByWorldId(world.id);
    expect(
      reloaded!.contracts.filter((c) => c.status === "ENDED"),
    ).toHaveLength(1);
    await expect(
      store.value.saveStaff(staff.snapshot(), 99),
    ).rejects.toMatchObject({ code: "STAFF_REVISION_CONFLICT" });
  });

  it("persiste C4 com geração/desenvolvimento/youth (round-trip + recovery)", async () => {
    const store = await repository();
    const world = snapshot();
    const genesis = new WorldGenesisGenerator().generate(world);
    await store.value.saveGenesis(genesis, world.version);
    const created = WorldPlayerLifecycle.fromGenesis(world, genesis);
    if (!created.ok) throw created.error;
    const lifecycle = created.value;
    const prospect = {
      firstName: "Novo",
      lastName: "Talento",
      birthDate: "2008-05-01",
      nationality: "BR",
      primaryPosition: "ST" as const,
      dominantFoot: "RIGHT" as const,
      attributes: { technical: 55, physical: 50, mental: 48, goalkeeping: 20 },
      potentialAbility: 88,
      seasonNumber: 2,
    };
    const generated = lifecycle.generatePlayer({
      prospect,
      source: "SCOUT_FOUND",
      worldDate: "2026-02-01",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "gen:1",
      worldSeed: world.seed,
    });
    if (!generated.ok) throw generated.error;
    const focus = lifecycle.setTrainingDirection({
      playerId: generated.value.id,
      focus: "technical",
      rulesetVersion: world.rulesetVersion,
    });
    if (!focus.ok) throw focus.error;
    const developed = lifecycle.applyDailyDevelopment({
      playerId: generated.value.id,
      worldDate: "2026-02-02",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "dev:1",
      worldSeed: world.seed,
    });
    if (!developed.ok) throw developed.error;

    await store.value.savePlayerLifecycle(lifecycle.snapshot(), null);
    // round-trip: trainingFocus, youthProspect e lifecycleEvents (PlayerDeveloped) preservados
    expect(await store.value.findPlayerLifecycleByWorldId(world.id)).toEqual(
      lifecycle.snapshot(),
    );

    // recovery: retry do mesmo desenvolvimento após restart = efeito único
    const restarted = new JsonWorldRepository(store.directory);
    const develop = new ApplyDailyDevelopment(restarted);
    const devInput = {
      playerId: generated.value.id,
      worldDate: "2026-02-02",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "dev:1",
      worldSeed: world.seed,
    };
    const first = await develop.execute(world.id, devInput);
    const retry = await develop.execute(world.id, devInput);
    expect(first).toMatchObject({ ok: true });
    expect(retry).toEqual(first);
    const reloaded = await restarted.findPlayerLifecycleByWorldId(world.id);
    const reloadedPlayer = reloaded!.players.find(
      (p) => p.id === generated.value.id,
    )!;
    expect(reloadedPlayer.trainingFocus).toBe("technical");
    expect(
      reloaded!.lifecycleEvents!.filter((e) => e.type === "PlayerDeveloped"),
    ).toHaveLength(1);
  });

  it("persiste a automação X-001 com regra e proposta (round-trip + recovery)", async () => {
    const store = await repository();
    const world = snapshot();
    const created = WorldAutomation.initialize(world);
    if (!created.ok) throw created.error;
    const automation = created.value;
    const controller =
      "019f0000-0000-7000-8000-0000000000c7" as AutomationControllerRef;
    const rule = automation.createAutomationRule({
      controllerId: controller,
      scope: "SQUAD",
      trigger: "MATCHDAY",
      action: "SET_LINEUP",
      risk: 20,
      priority: 1,
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "rule:1",
      worldSeed: world.seed,
      worldDate: "2026-01-01",
    });
    if (!rule.ok) throw rule.error;
    automation.activateAutomationRule({
      ruleId: rule.value.id,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "act:1",
      worldSeed: world.seed,
      worldDate: "2026-01-02",
    });
    const decision = automation.evaluateDecision({
      ruleId: rule.value.id,
      asOf: "2026-03-01",
      seedStream: "squad",
      options: [
        { commandDraft: "A", score: 50 },
        { commandDraft: "B", score: 80 },
      ],
      factors: ["forma"],
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "dec:1",
      worldSeed: world.seed,
      worldDate: "2026-03-01",
    });
    if (!decision.ok) throw decision.error;

    await store.value.saveAutomation(automation.snapshot(), null);
    // round-trip: rules, proposals (com alternatives) e events preservados
    expect(await store.value.findAutomationByWorldId(world.id)).toEqual(
      automation.snapshot(),
    );

    // recovery: submeter a decisão após restart = efeito único no retry
    const restarted = new JsonWorldRepository(store.directory);
    const execute = new ExecuteDecisionProposal(restarted);
    const execInput = {
      decisionId: decision.value.id,
      accept: true,
      rulesetVersion: world.rulesetVersion,
      idempotencyKey: "exec:1",
      worldSeed: world.seed,
      worldDate: "2026-03-02",
    };
    const first = await execute.execute(world.id, execInput);
    const retry = await execute.execute(world.id, execInput);
    expect(first).toMatchObject({ ok: true, value: { status: "SUBMITTED" } });
    expect(retry).toEqual(first);
    const reloaded = await restarted.findAutomationByWorldId(world.id);
    expect(reloaded!.executions).toHaveLength(1);
    await expect(
      store.value.saveAutomation(automation.snapshot(), 99),
    ).rejects.toMatchObject({ code: "AUTOMATION_REVISION_CONFLICT" });
  });

  it("persiste o portfólio C3 com restart e revisão otimista", async () => {
    const store = await repository();
    const world = snapshot();
    const genesis = new WorldGenesisGenerator().generate(world);
    const portfolio = buildClubPortfolioFromGenesis(world, genesis);
    await store.value.saveGenesis(genesis, world.version);

    await store.value.saveClubPortfolio(portfolio, null);

    expect(await store.value.findClubPortfolioByWorldId(world.id)).toEqual(
      portfolio,
    );
    await expect(
      store.value.saveClubPortfolio(portfolio, 99),
    ).rejects.toMatchObject({ code: "CLUB_PORTFOLIO_REVISION_CONFLICT" });
  });

  /**
   * O arquivo v1 tem `world` dentro. Ele é IGNORADO na leitura: o mundo é do
   * Postgres agora (R-173/R-182), e um arquivo antigo não é fonte dele. O que a
   * migração de schema ainda faz é trazer os CONTEXTOS que não migraram.
   */
  it("lê snapshots v1 e os migra na próxima escrita, ignorando o mundo do arquivo", async () => {
    const store = await repository();
    const world = snapshot();
    await writeFile(
      join(store.directory, `${world.id}.json`),
      JSON.stringify({ schemaVersion: 1, world }),
      "utf8",
    );

    expect(await store.value.findByWorldId(world.id)).toBeNull();

    const ledger = WorldLedger.initialize(world);
    if (!ledger.ok) throw ledger.error;
    await store.value.saveLedger(ledger.value.snapshot(), null);

    const migrated = envelopeSchema.parse(
      JSON.parse(
        await readFile(join(store.directory, `${world.id}.json`), "utf8"),
      ) as unknown,
    );
    expect(migrated.schemaVersion).toBe(17);
    expect(migrated).not.toHaveProperty("world");
  });

  it("persiste scheduler v2 e materializa campos novos ao ler legado", async () => {
    const store = await repository();
    const world = snapshot();
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

  // "mundo inexistente" e "conflito de versão do mundo" mudaram de casa: a
  // porta WorldRepository saiu daqui e vive no Postgres
  // (prisma-world-repository.test.ts).

  it("rejeita snapshot corrompido", async () => {
    const store = await repository();
    const world = snapshot();
    await writeFile(
      join(store.directory, `${world.id}.json`),
      "{invalid",
      "utf8",
    );

    // Arquivo ilegível é corrupção, e qualquer leitura tem de acusar — não
    // devolver "vazio", que o chamador leria como "este contexto não existe".
    await expect(store.value.findLedgerByWorldId(world.id)).rejects.toMatchObject({
      code: "SNAPSHOT_CORRUPTED",
    });
  });
});
