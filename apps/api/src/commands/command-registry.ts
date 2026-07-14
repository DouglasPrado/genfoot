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
  ConsumeEvent,
  CreateAutomationRule,
  CreateCompetitionEdition,
  CreateStaffMember,
  CreateWorld,
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
  HomologateCompetition,
  InitializeLedger,
  InitializeMarket,
  InspectWorld,
  JoinWorld,
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
  ResumeRealtimeStream,
  RetirePlayer,
  RetryDeadLetter,
  RetryDelivery,
  RevokeAutomationRule,
  RevokeSessionFamily,
  SetTrainingDirection,
  SettleReservation,
  StartLoan,
  StartSaga,
  StartSession,
  StartTransfer,
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
