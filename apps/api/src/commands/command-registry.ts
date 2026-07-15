import { randomUUID } from "node:crypto";

import {
  AcceptOffer,
  AcceptStaffContract,
  AccrueDebt,
  ActivateAutomationRule,
  ActivateContract,
  ActivateProvisionedWorld,
  AdvanceSagaStep,
  AdvanceTransferStep,
  AdvanceWorldDays,
  ApplyDailyDevelopment,
  ApplyDiscipline,
  ApplyNarrativeFact,
  ApproveCorrection,
  ApproveSanction,
  AssignStaff,
  BuildDigest,
  CancelNegotiation,
  CancelPromise,
  ChooseConversationOption,
  ClaimSaga,
  CloseAccountingPeriod,
  CompensateSaga,
  CompensateTransfer,
  AbortInfrastructureProject,
  AdvanceMatchTicks,
  AdvanceScheduledWorldDays,
  AdvanceWorldDayCommand,
  BootstrapWorldScheduler,
  CancelScheduledTask,
  CheckpointMatch,
  ConsumeEvent,
  CreateAutomationRule,
  CreateCompetitionEdition,
  CreateMatchManifest,
  CreateStaffMember,
  CreateWorld,
  FinalizeMatch,
  DecideAppeal,
  DismissNotification,
  EndClubControl,
  EndStaffContract,
  EvaluateDecision,
  EvaluatePromise,
  ExecuteClubCommand,
  ExecuteDecisionProposal,
  ExerciseLoanOption,
  ExpireReservations,
  FileAppeal,
  GenerateFixtures,
  GeneratePlayer,
  GenerateReport,
  GenerateWorldGenesis,
  GenerateYouthCohort,
  GetDecisionExplanation,
  HomologateCompetition,
  InitializeAdmin,
  InitializeAutomation,
  InitializeCompetitions,
  InitializeEventing,
  InitializeIdentity,
  InitializeInbox,
  InitializeLedger,
  InitializeMarket,
  InitializeMatches,
  InitializeNarrative,
  InitializeStaff,
  InspectWorld,
  JoinWorld,
  ProcessDueWorldTasks,
  RegisterTemporalWindow,
  ResumeInfrastructureProject,
  ResumeSeasonRollover,
  ResumeWorldScheduler,
  ScheduleWorldTask,
  ScheduleWorldTasks,
  RetryScheduledTask,
  SEASON_ROLLOVER_STEPS,
  StartInfrastructureProject,
  StartSeasonRollover,
  createClubMaintenanceTaskHandler,
  createPlayerDayTaskHandler,
  type InfrastructureFinancingPort,
  type InfrastructureLicensingPort,
  MakePublicPromise,
  MarkNotificationRead,
  OfferStaffContract,
  OpenCase,
  OpenLedgerAccount,
  OpenMedicalCase,
  OpenNarrativeCrisis,
  OpenNegotiation,
  OpenSupportCase,
  PlaceQuarantine,
  PostTransaction,
  ProcessPlayerDay,
  ProjectNotification,
  PromoteYouth,
  ProposeSanction,
  PublishListing,
  PublishOutboxBatch,
  ReassessMedicalCase,
  RebuildInboxProjection,
  RebuildProjection,
  ReconcileWorldLedger,
  RecordOfficialResult,
  RecordRiskSignal,
  RefreshSession,
  RegisterAccount,
  RegisterEventType,
  RegisterParticipant,
  ReleaseClubReservation,
  ReleaseReservation,
  RequestClubSwitch,
  RequestCorrection,
  RequestReprocessing,
  RequestScouting,
  ReserveClub,
  ReserveFunds,
  ResolveNarrativeCrisis,
  ResolveSupportCase,
  ResumeMatch,
  ResumeRealtimeStream,
  RetirePlayer,
  RetryDeadLetter,
  RetryDelivery,
  RevokeAutomationRule,
  RevokeSessionFamily,
  SetTrainingDirection,
  SettleReservation,
  StartLoan,
  StartMatch,
  StartSaga,
  StartSession,
  StartTransfer,
  SubmitMatchCommand,
  SubmitOffer,
  SubmitRecoveryPlan,
  SuspendAutomationRule,
  TerminateContract,
  ConfirmOnboarding,
  DisableAutomationOnControlChange,
  ReturnLoanedPlayer,
  type ClubCommand,
  type WorldMutationResult,
} from "@grinta/core";
import type { JsonWorldRepository } from "@grinta/persistence";
import {
  DomainError,
  WorldDate,
  fail,
  parseGameWorldId,
  parseRulesetVersion,
  succeed,
  type Result,
} from "@grinta/shared";
import { z } from "zod";

import type { CommandEnvelope } from "./command-contract.js";
import { applyRebrandReaction } from "./rebrand-reaction.js";

export interface CommandOutcome {
  readonly resource: string | null;
  readonly mutation?: WorldMutationResult;
}

export interface CommandContext {
  readonly repository: JsonWorldRepository;
  readonly envelope: CommandEnvelope;
}

export type CommandHandler = (
  context: CommandContext,
) => Promise<Result<CommandOutcome, DomainError>>;

function invalidPayload(error: z.ZodError): DomainError {
  return new DomainError("COMMAND_PAYLOAD_INVALID", error.message);
}

const createWorldPayload = z.object({
  seed: z.string().min(1),
  startDate: z.string(),
  rulesetVersion: z.string().default("1.0.0"),
});

const advanceDaysPayload = z.object({
  days: z.number().int().positive(),
});

const clubCommandPayload = z.object({
  clubId: z.string().uuid(),
  actorId: z.string().min(1),
  occurredAt: z.string(),
  rulesetVersion: z.string().default("1.0.0"),
  command: z.record(z.unknown()),
});

const publishListingPayload = z.object({
  playerId: z.string().min(1),
  sellerClubId: z.string().min(1),
  askingFeeMinor: z.number().int().nonnegative(),
  rulesetVersion: z.string().default("1.0.0"),
});

async function loadWorld(
  repository: CommandContext["repository"],
  rawWorldId: string | undefined,
) {
  if (rawWorldId === undefined) {
    return fail(
      new DomainError("COMMAND_PAYLOAD_INVALID", "worldId é obrigatório."),
    );
  }
  const worldId = parseGameWorldId(rawWorldId);
  if (!worldId.ok) return worldId;
  const world = await new InspectWorld(repository).execute(worldId.value);
  if (!world.ok) return world;
  return succeed({ worldId: worldId.value, snapshot: world.value });
}

/** Caso de uso com o shape uniforme `execute(worldId, input)`. */
interface WorldInputUseCase {
  execute(
    worldId: import("@grinta/shared").GameWorldId,
    input: never,
  ): Promise<Result<unknown, DomainError>>;
}

/**
 * Factory genérico para os commands com shape `execute(worldId, input)`: carrega o
 * snapshot do mundo, injeta o contexto determinístico (idempotencyKey, rulesetVersion,
 * worldSeed, worldDate) e mescla o payload específico. Erros de domínio viram REJECTED;
 * exceções inesperadas viram COMMAND_EXECUTION_FAILED (nunca 500).
 */
function wc(
  build: (repository: CommandContext["repository"]) => WorldInputUseCase,
  resourceKind = "world",
): CommandHandler {
  return async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const payload =
      typeof envelope.payload === "object" && envelope.payload !== null
        ? (envelope.payload as Record<string, unknown>)
        : {};
    const input = {
      ...payload,
      idempotencyKey: envelope.idempotencyKey,
      rulesetVersion: world.value.snapshot.rulesetVersion,
      worldSeed: world.value.snapshot.seed,
      worldDate: world.value.snapshot.currentDate,
    };
    try {
      const result = await build(repository).execute(
        world.value.worldId,
        input as never,
      );
      if (!result.ok) return result;
      return succeed({ resource: `${resourceKind}:${world.value.worldId}` });
    } catch (error) {
      return fail(
        new DomainError(
          "COMMAND_EXECUTION_FAILED",
          error instanceof Error ? error.message : "Falha ao executar command.",
        ),
      );
    }
  };
}

// --- Portas/handlers sintéticos (adapter) para os use cases com dependências ---
const API_WORKER = "api-worker";
const nowMs = (): number => Date.now();

function financingPort(): InfrastructureFinancingPort {
  return {
    reserve: (context) =>
      Promise.resolve({ reservationRef: `api:${context.idempotencyKey}:reservation` }),
    disburseMilestone: (context) =>
      Promise.resolve({ disbursementRef: `api:${context.idempotencyKey}:disbursement` }),
    releaseRemainder: (context) =>
      Promise.resolve({ releaseFactRef: `api:${context.idempotencyKey}:release` }),
  };
}

function licensingPort(): InfrastructureLicensingPort {
  return {
    inspect: (context) =>
      Promise.resolve({ approved: true, inspectionRef: `api:${context.idempotencyKey}:license` }),
  };
}

function taskHandlers(repository: CommandContext["repository"]) {
  return {
    "players:process-day": createPlayerDayTaskHandler(repository),
    "clubs:process-day": createClubMaintenanceTaskHandler(repository),
  };
}

function rolloverHandlers() {
  return Object.fromEntries(
    SEASON_ROLLOVER_STEPS.map((stepId) => [
      stepId,
      () =>
        Promise.resolve({
          status: "COMPLETED" as const,
          evidence: { source: "api" },
        }),
    ]),
  );
}

function rolloverVerifier() {
  return () =>
    Promise.resolve({
      standingsConsistent: true,
      ledgerBalanced: true,
      populationInBand: true,
      evidence: { source: "api" },
    });
}

/** Use case com shape `execute(input)` (input carrega o gameWorldId). */
interface SingleInputUseCase {
  execute(input: never): Promise<Result<unknown, DomainError>>;
}

/** Inicializador de contexto com shape `execute(worldSnapshot)`. */
interface WorldSnapshotUseCase {
  execute(world: never): Promise<Result<unknown, DomainError>>;
}

/** Factory para inicializadores de contexto `<ctx>:initialize`. */
function wInit(
  build: (repository: CommandContext["repository"]) => WorldSnapshotUseCase,
  resourceKind: string,
): CommandHandler {
  return async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    return guardRun(
      () => build(repository).execute(world.value.snapshot as never),
      `${resourceKind}:${world.value.worldId}`,
    );
  };
}

/** Factory para use cases `execute(input)` — injeta gameWorldId + contexto. */
function wc1(
  build: (repository: CommandContext["repository"]) => SingleInputUseCase,
  resourceKind = "world",
): CommandHandler {
  return async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const payload =
      typeof envelope.payload === "object" && envelope.payload !== null
        ? (envelope.payload as Record<string, unknown>)
        : {};
    const input = {
      ...payload,
      gameWorldId: world.value.worldId,
      idempotencyKey: envelope.idempotencyKey,
      rulesetVersion: world.value.snapshot.rulesetVersion,
      worldSeed: world.value.snapshot.seed,
      worldDate: world.value.snapshot.currentDate,
    };
    try {
      const result = await build(repository).execute(input as never);
      if (!result.ok) return result;
      return succeed({ resource: `${resourceKind}:${world.value.worldId}` });
    } catch (error) {
      return fail(
        new DomainError(
          "COMMAND_EXECUTION_FAILED",
          error instanceof Error ? error.message : "Falha ao executar command.",
        ),
      );
    }
  };
}

/** Executa um caso de uso e converte exceções em REJECTED (nunca 500). */
async function guardRun(
  run: () => Promise<Result<unknown, DomainError>>,
  resource: string,
): Promise<Result<CommandOutcome, DomainError>> {
  try {
    const result = await run();
    if (!result.ok) return result;
    return succeed({ resource });
  } catch (error) {
    return fail(
      new DomainError(
        "COMMAND_EXECUTION_FAILED",
        error instanceof Error ? error.message : "Falha ao executar command.",
      ),
    );
  }
}

function requireString(
  payload: unknown,
  field: string,
): Result<string, DomainError> {
  const value =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)[field]
      : undefined;
  return typeof value === "string"
    ? succeed(value)
    : fail(
        new DomainError("COMMAND_PAYLOAD_INVALID", `${field} é obrigatório.`),
      );
}

const handlers: Record<string, CommandHandler> = {
  "world:create": async ({ repository, envelope }) => {
    const parsed = createWorldPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const startDate = WorldDate.parse(parsed.data.startDate);
    if (!startDate.ok) return startDate;
    const ruleset = parseRulesetVersion(parsed.data.rulesetVersion);
    if (!ruleset.ok) return ruleset;
    const result = await new CreateWorld(repository).execute({
      seed: parsed.data.seed,
      startDate: startDate.value,
      rulesetVersion: ruleset.value,
    });
    if (!result.ok) return result;
    return succeed({
      resource: `world:${result.value.world.id}`,
      mutation: result.value,
    });
  },

  "world:genesis": async ({ repository, envelope }) => {
    if (envelope.worldId === undefined) {
      return fail(
        new DomainError("COMMAND_PAYLOAD_INVALID", "worldId é obrigatório."),
      );
    }
    const worldId = parseGameWorldId(envelope.worldId);
    if (!worldId.ok) return worldId;
    const result = await new GenerateWorldGenesis(
      repository,
      repository,
      undefined,
      repository,
      repository,
    ).execute(worldId.value);
    if (!result.ok) return result;
    return succeed({ resource: `world:${worldId.value}` });
  },

  "world:activate": async ({ repository, envelope }) => {
    if (envelope.worldId === undefined) {
      return fail(
        new DomainError("COMMAND_PAYLOAD_INVALID", "worldId é obrigatório."),
      );
    }
    const worldId = parseGameWorldId(envelope.worldId);
    if (!worldId.ok) return worldId;
    const result = await new ActivateProvisionedWorld(
      repository,
      repository,
      repository,
      repository,
      repository,
    ).execute(worldId.value);
    if (!result.ok) return result;
    return succeed({
      resource: `world:${worldId.value}`,
      mutation: result.value,
    });
  },

  "club:command": async ({ repository, envelope }) => {
    if (envelope.worldId === undefined) {
      return fail(
        new DomainError("COMMAND_PAYLOAD_INVALID", "worldId é obrigatório."),
      );
    }
    if (envelope.expectedVersion === undefined) {
      return fail(
        new DomainError(
          "COMMAND_PAYLOAD_INVALID",
          "expectedVersion é obrigatório para club:command.",
        ),
      );
    }
    const worldId = parseGameWorldId(envelope.worldId);
    if (!worldId.ok) return worldId;
    const parsed = clubCommandPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const ruleset = parseRulesetVersion(parsed.data.rulesetVersion);
    if (!ruleset.ok) return ruleset;
    const command = {
      commandId: randomUUID(),
      idempotencyKey: envelope.idempotencyKey,
      gameWorldId: worldId.value,
      clubId: parsed.data.clubId as ClubCommand["clubId"],
      expectedVersion: envelope.expectedVersion,
      occurredAt: parsed.data.occurredAt,
      rulesetVersion: ruleset.value,
      actorId: parsed.data.actorId,
      ...parsed.data.command,
    } as ClubCommand;
    const result = await new ExecuteClubCommand(repository).execute(command);
    if (!result.ok) return result;
    // Rebranding (C3) → reação da torcida (C10): queda de 10–15% no headcount.
    if (parsed.data.command.type === "UpdateClubVisualIdentity") {
      await applyRebrandReaction(
        repository,
        worldId.value,
        parsed.data.clubId,
        envelope.idempotencyKey,
      );
    }
    return succeed({ resource: `club:${parsed.data.clubId}` });
  },

  "market:initialize": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const result = await new InitializeMarket(repository).execute(
      world.value.snapshot,
    );
    if (!result.ok) return result;
    return succeed({ resource: `market:${world.value.worldId}` });
  },

  "ledger:initialize": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const result = await new InitializeLedger(repository).execute(
      world.value.snapshot,
    );
    if (!result.ok) return result;
    return succeed({ resource: `ledger:${world.value.worldId}` });
  },

  // Inicializadores de contexto (execute(worldSnapshot))
  "competition:initialize": wInit((r) => new InitializeCompetitions(r), "competitions"),
  "match:initialize": wInit((r) => new InitializeMatches(r), "matches"),
  "staff:initialize": wInit((r) => new InitializeStaff(r), "staff"),
  "narrative:initialize": wInit((r) => new InitializeNarrative(r), "narrative"),
  "inbox:initialize": wInit((r) => new InitializeInbox(r), "inbox"),
  "admin:initialize": wInit((r) => new InitializeAdmin(r), "admin"),
  "automation:initialize": wInit((r) => new InitializeAutomation(r), "automation"),
  "identity:initialize": wInit((r) => new InitializeIdentity(r), "identity"),
  "eventing:initialize": wInit((r) => new InitializeEventing(r), "eventing"),

  // Infraestrutura de estádio (SAGA-04) — portas sintéticas de financiamento/licença
  "infrastructure:start": wc1(
    (r) => new StartInfrastructureProject(r),
    "infrastructure",
  ),
  "infrastructure:resume": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const projectId = requireString(envelope.payload, "projectId");
    if (!projectId.ok) return projectId;
    return guardRun(
      () =>
        new ResumeInfrastructureProject(
          repository,
          financingPort(),
          licensingPort(),
          API_WORKER,
          nowMs,
        ).execute(
          world.value.worldId,
          projectId.value,
          world.value.snapshot.currentDate,
        ),
      `infrastructure:${projectId.value}`,
    );
  },
  "infrastructure:abort": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const projectId = requireString(envelope.payload, "projectId");
    if (!projectId.ok) return projectId;
    const payload = (envelope.payload ?? {}) as Record<string, unknown>;
    const reason =
      typeof payload.reason === "string" ? payload.reason : "aborted-via-api";
    return guardRun(
      () =>
        new AbortInfrastructureProject(
          repository,
          financingPort(),
          API_WORKER,
          nowMs,
        ).execute(world.value.worldId, projectId.value, reason),
      `infrastructure:${projectId.value}`,
    );
  },

  // Scheduler do mundo (C2)
  "scheduler:bootstrap": wc1(
    (r) => new BootstrapWorldScheduler(r),
    "scheduler",
  ),
  "scheduler:cancel-task": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const taskId = requireString(envelope.payload, "taskId");
    if (!taskId.ok) return taskId;
    return guardRun(
      () =>
        new CancelScheduledTask(repository).execute(
          world.value.worldId,
          taskId.value,
        ),
      `scheduler:${world.value.worldId}`,
    );
  },
  "scheduler:retry-task": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const taskId = requireString(envelope.payload, "taskId");
    if (!taskId.ok) return taskId;
    return guardRun(
      () =>
        new RetryScheduledTask(repository).execute(
          world.value.worldId,
          taskId.value,
        ),
      `scheduler:${world.value.worldId}`,
    );
  },
  "scheduler:schedule-tasks": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const inputs = (envelope.payload as Record<string, unknown> | undefined)
      ?.inputs;
    if (!Array.isArray(inputs)) {
      return fail(
        new DomainError("COMMAND_PAYLOAD_INVALID", "inputs[] é obrigatório."),
      );
    }
    return guardRun(
      () =>
        new ScheduleWorldTasks(repository).execute(
          world.value.worldId,
          inputs as never,
        ),
      `scheduler:${world.value.worldId}`,
    );
  },
  "scheduler:resume": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    return guardRun(
      () =>
        new ResumeWorldScheduler(
          repository,
          repository,
          taskHandlers(repository),
          API_WORKER,
          nowMs,
        ).execute(world.value.worldId),
      `scheduler:${world.value.worldId}`,
    );
  },
  "scheduler:process-due": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const on = WorldDate.parse(world.value.snapshot.currentDate);
    if (!on.ok) return on;
    return guardRun(
      () =>
        new ProcessDueWorldTasks(repository, taskHandlers(repository)).execute(
          world.value.worldId,
          on.value,
        ),
      `scheduler:${world.value.worldId}`,
    );
  },
  "scheduler:advance-days": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const payload = (envelope.payload ?? {}) as Record<string, unknown>;
    const days = typeof payload.days === "number" ? payload.days : 1;
    return guardRun(
      () =>
        new AdvanceScheduledWorldDays(
          repository,
          repository,
          taskHandlers(repository),
          API_WORKER,
          nowMs,
        ).execute(world.value.worldId, days),
      `world:${world.value.worldId}`,
    );
  },
  "world:advance-day": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const payload = (envelope.payload ?? {}) as Record<string, unknown>;
    const input = {
      ...payload,
      idempotencyKey: envelope.idempotencyKey,
      rulesetVersion: world.value.snapshot.rulesetVersion,
    };
    return guardRun(
      () =>
        new AdvanceWorldDayCommand(
          repository,
          repository,
          taskHandlers(repository),
          API_WORKER,
          nowMs,
        ).execute(world.value.worldId, input as never),
      `world:${world.value.worldId}`,
    );
  },

  // Virada de temporada (SAGA-02) — resume com handlers/verifier sintéticos
  "season:rollover:resume": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const rolloverId = requireString(envelope.payload, "rolloverId");
    if (!rolloverId.ok) return rolloverId;
    return guardRun(
      () =>
        new ResumeSeasonRollover(
          repository,
          rolloverHandlers() as never,
          rolloverVerifier() as never,
          API_WORKER,
          nowMs,
        ).execute(world.value.worldId, rolloverId.value),
      `rollover:${rolloverId.value}`,
    );
  },

  // Explicação de decisão de automação (X-001)
  "automation:get-explanation": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const decisionId = requireString(envelope.payload, "decisionId");
    if (!decisionId.ok) return decisionId;
    return guardRun(
      () =>
        new GetDecisionExplanation(repository).execute(
          world.value.worldId,
          decisionId.value,
        ),
      `decision:${decisionId.value}`,
    );
  },

  "market:publish-listing": async ({ repository, envelope }) => {
    const world = await loadWorld(repository, envelope.worldId);
    if (!world.ok) return world;
    const parsed = publishListingPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const ruleset = parseRulesetVersion(parsed.data.rulesetVersion);
    if (!ruleset.ok) return ruleset;
    const input = {
      playerId: parsed.data.playerId,
      sellerClubId: parsed.data.sellerClubId,
      askingFeeMinor: parsed.data.askingFeeMinor,
      rulesetVersion: ruleset.value,
      idempotencyKey: envelope.idempotencyKey,
      worldSeed: world.value.snapshot.seed,
      worldDate: world.value.snapshot.currentDate,
    } as Parameters<PublishListing["execute"]>[1];
    const result = await new PublishListing(repository).execute(
      world.value.worldId,
      input,
    );
    if (!result.ok) return result;
    return succeed({ resource: `listing:${parsed.data.playerId}` });
  },

  "world:advance-days": async ({ repository, envelope }) => {
    if (envelope.worldId === undefined) {
      return fail(
        new DomainError("COMMAND_PAYLOAD_INVALID", "worldId é obrigatório."),
      );
    }
    const worldId = parseGameWorldId(envelope.worldId);
    if (!worldId.ok) return worldId;
    const parsed = advanceDaysPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new AdvanceWorldDays(repository).execute(
      worldId.value,
      parsed.data.days,
    );
    if (!result.ok) return result;
    return succeed({
      resource: `world:${worldId.value}`,
      mutation: result.value,
    });
  },
};

/**
 * Catálogo de gameplay com shape uniforme `execute(worldId, input)`, wirado pelo
 * factory `wc`. Cobre staff, competições, ledger, jogador/médico, narrativa,
 * notificações, admin, identidade, automação, eventing e o restante do mercado.
 */
const gameplayHandlers: Record<string, CommandHandler> = {
  // Staff (C5)
  "staff:create": wc((r) => new CreateStaffMember(r), "staff"),
  "staff:offer-contract": wc((r) => new OfferStaffContract(r), "staff"),
  "staff:accept-contract": wc((r) => new AcceptStaffContract(r), "staff"),
  "staff:assign": wc((r) => new AssignStaff(r), "staff"),
  "staff:end-contract": wc((r) => new EndStaffContract(r), "staff"),

  // Competições (C7)
  "competition:create-edition": wc((r) => new CreateCompetitionEdition(r), "competition"),
  "competition:register-participant": wc((r) => new RegisterParticipant(r), "competition"),
  "competition:generate-fixtures": wc((r) => new GenerateFixtures(r), "competition"),
  "competition:record-result": wc((r) => new RecordOfficialResult(r), "competition"),
  "competition:apply-discipline": wc((r) => new ApplyDiscipline(r), "competition"),
  "competition:homologate": wc((r) => new HomologateCompetition(r), "competition"),

  // Ledger (C9)
  "ledger:open-account": wc((r) => new OpenLedgerAccount(r), "ledger"),
  "ledger:post-transaction": wc((r) => new PostTransaction(r), "ledger"),
  "ledger:reserve": wc((r) => new ReserveFunds(r), "ledger"),
  "ledger:settle-reservation": wc((r) => new SettleReservation(r), "ledger"),
  "ledger:release-reservation": wc((r) => new ReleaseReservation(r), "ledger"),
  "ledger:reconcile": wc((r) => new ReconcileWorldLedger(r), "ledger"),
  "ledger:accrue-debt": wc((r) => new AccrueDebt(r), "ledger"),
  "ledger:close-period": wc((r) => new CloseAccountingPeriod(r), "ledger"),
  "ledger:expire-reservations": wc((r) => new ExpireReservations(r), "ledger"),

  // Jogador + médico (C4)
  "player:process-day": wc((r) => new ProcessPlayerDay(r), "player"),
  "player:generate": wc((r) => new GeneratePlayer(r), "player"),
  "player:set-training": wc((r) => new SetTrainingDirection(r), "player"),
  "player:apply-development": wc((r) => new ApplyDailyDevelopment(r), "player"),
  "player:generate-youth": wc((r) => new GenerateYouthCohort(r), "player"),
  "player:promote-youth": wc((r) => new PromoteYouth(r), "player"),
  "player:open-medical-case": wc((r) => new OpenMedicalCase(r), "player"),
  "player:reassess-medical": wc((r) => new ReassessMedicalCase(r), "player"),
  "player:retire": wc((r) => new RetirePlayer(r), "player"),

  // Narrativa (C10)
  "narrative:apply-fact": wc((r) => new ApplyNarrativeFact(r), "narrative"),
  "narrative:make-promise": wc((r) => new MakePublicPromise(r), "narrative"),
  "narrative:evaluate-promise": wc((r) => new EvaluatePromise(r), "narrative"),
  "narrative:open-crisis": wc((r) => new OpenNarrativeCrisis(r), "narrative"),
  "narrative:submit-recovery": wc((r) => new SubmitRecoveryPlan(r), "narrative"),
  "narrative:resolve-crisis": wc((r) => new ResolveNarrativeCrisis(r), "narrative"),
  "narrative:choose-conversation": wc((r) => new ChooseConversationOption(r), "narrative"),
  "narrative:cancel-promise": wc((r) => new CancelPromise(r), "narrative"),

  // Notificações (C11)
  "inbox:project": wc((r) => new ProjectNotification(r), "inbox"),
  "inbox:mark-read": wc((r) => new MarkNotificationRead(r), "inbox"),
  "inbox:dismiss": wc((r) => new DismissNotification(r), "inbox"),
  "inbox:build-digest": wc((r) => new BuildDigest(r), "inbox"),
  "inbox:generate-report": wc((r) => new GenerateReport(r), "inbox"),
  "inbox:rebuild-projection": wc((r) => new RebuildInboxProjection(r), "inbox"),
  "inbox:retry-delivery": wc((r) => new RetryDelivery(r), "inbox"),

  // Admin / anti-abuso (C12)
  "admin:record-risk": wc((r) => new RecordRiskSignal(r), "admin"),
  "admin:propose-sanction": wc((r) => new ProposeSanction(r), "admin"),
  "admin:approve-sanction": wc((r) => new ApproveSanction(r), "admin"),
  "admin:file-appeal": wc((r) => new FileAppeal(r), "admin"),
  "admin:decide-appeal": wc((r) => new DecideAppeal(r), "admin"),
  "admin:open-case": wc((r) => new OpenCase(r), "admin"),
  "admin:place-quarantine": wc((r) => new PlaceQuarantine(r), "admin"),
  "admin:request-correction": wc((r) => new RequestCorrection(r), "admin"),
  "admin:approve-correction": wc((r) => new ApproveCorrection(r), "admin"),
  "admin:request-reprocessing": wc((r) => new RequestReprocessing(r), "admin"),
  "admin:open-support": wc((r) => new OpenSupportCase(r), "admin"),
  "admin:resolve-support": wc((r) => new ResolveSupportCase(r), "admin"),

  // Identidade (C1)
  "identity:register-account": wc((r) => new RegisterAccount(r), "identity"),
  "identity:join-world": wc((r) => new JoinWorld(r), "identity"),
  "identity:revoke-session": wc((r) => new RevokeSessionFamily(r), "identity"),
  "identity:reserve-club": wc((r) => new ReserveClub(r), "identity"),
  "identity:confirm-onboarding": wc((r) => new ConfirmOnboarding(r), "identity"),
  "identity:release-club-reservation": wc((r) => new ReleaseClubReservation(r), "identity"),
  "identity:end-club-control": wc((r) => new EndClubControl(r), "identity"),
  "identity:request-switch": wc((r) => new RequestClubSwitch(r), "identity"),
  "identity:start-session": wc((r) => new StartSession(r), "identity"),
  "identity:refresh-session": wc((r) => new RefreshSession(r), "identity"),

  // Automação / IA (X-001)
  "automation:create-rule": wc((r) => new CreateAutomationRule(r), "automation"),
  "automation:activate-rule": wc((r) => new ActivateAutomationRule(r), "automation"),
  "automation:suspend-rule": wc((r) => new SuspendAutomationRule(r), "automation"),
  "automation:revoke-rule": wc((r) => new RevokeAutomationRule(r), "automation"),
  "automation:evaluate-decision": wc((r) => new EvaluateDecision(r), "automation"),
  "automation:execute-proposal": wc((r) => new ExecuteDecisionProposal(r), "automation"),
  "automation:disable-on-control-change": wc((r) => new DisableAutomationOnControlChange(r), "automation"),

  // Eventing / sagas (X-002)
  "eventing:publish-outbox": wc((r) => new PublishOutboxBatch(r), "eventing"),
  "eventing:consume-event": wc((r) => new ConsumeEvent(r), "eventing"),
  "eventing:retry-dead-letter": wc((r) => new RetryDeadLetter(r), "eventing"),
  "eventing:register-event-type": wc((r) => new RegisterEventType(r), "eventing"),
  "eventing:start-saga": wc((r) => new StartSaga(r), "eventing"),
  "eventing:claim-saga": wc((r) => new ClaimSaga(r), "eventing"),
  "eventing:advance-saga-step": wc((r) => new AdvanceSagaStep(r), "eventing"),
  "eventing:compensate-saga": wc((r) => new CompensateSaga(r), "eventing"),
  "eventing:rebuild-projection": wc((r) => new RebuildProjection(r), "eventing"),
  "eventing:resume-realtime": wc((r) => new ResumeRealtimeStream(r), "eventing"),

  // Scheduler + temporada — shape uniforme (C2 / SAGA-02)
  "scheduler:schedule-task": wc((r) => new ScheduleWorldTask(r), "scheduler"),
  "scheduler:register-window": wc((r) => new RegisterTemporalWindow(r), "scheduler"),
  "season:rollover:start": wc((r) => new StartSeasonRollover(r), "rollover"),

  // Partida ao vivo (C8)
  "match:create-manifest": wc((r) => new CreateMatchManifest(r), "match"),
  "match:start": wc((r) => new StartMatch(r), "match"),
  "match:submit-command": wc((r) => new SubmitMatchCommand(r), "match"),
  "match:advance-ticks": wc((r) => new AdvanceMatchTicks(r), "match"),
  "match:checkpoint": wc((r) => new CheckpointMatch(r), "match"),
  "match:resume": wc((r) => new ResumeMatch(r), "match"),
  "match:finalize": wc((r) => new FinalizeMatch(r), "match"),

  // Mercado — restante (C6)
  "market:request-scouting": wc((r) => new RequestScouting(r), "market"),
  "market:open-negotiation": wc((r) => new OpenNegotiation(r), "market"),
  "market:submit-offer": wc((r) => new SubmitOffer(r), "market"),
  "market:accept-offer": wc((r) => new AcceptOffer(r), "market"),
  "market:activate-contract": wc((r) => new ActivateContract(r), "market"),
  "market:terminate-contract": wc((r) => new TerminateContract(r), "market"),
  "market:cancel-negotiation": wc((r) => new CancelNegotiation(r), "market"),
  "market:start-transfer": wc((r) => new StartTransfer(r), "market"),
  "market:advance-transfer-step": wc((r) => new AdvanceTransferStep(r), "market"),
  "market:compensate-transfer": wc((r) => new CompensateTransfer(r), "market"),
  "market:start-loan": wc((r) => new StartLoan(r), "market"),
  "market:exercise-loan-option": wc((r) => new ExerciseLoanOption(r), "market"),
  "market:return-loaned-player": wc((r) => new ReturnLoanedPlayer(r), "market"),
};

export function resolveCommandHandler(
  commandType: string,
): CommandHandler | undefined {
  return handlers[commandType] ?? gameplayHandlers[commandType];
}

export function registeredCommandTypes(): readonly string[] {
  return [...Object.keys(handlers), ...Object.keys(gameplayHandlers)];
}
