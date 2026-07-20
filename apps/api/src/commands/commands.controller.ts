import { randomUUID } from "node:crypto";

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
  ClubControlRepository,
  ClubReadModel,
  ClubRepository,
  ClubUnitOfWork,
  GenesisUnitOfWork,
  IdentityUnitOfWork,
  MatchPlayRepository,
  PresenceRepository,
  WorldClockRepository,
  SeasonFinanceUnitOfWork,
  TransferUnitOfWork,
  PromoteYouthUnitOfWork,
  DemoteToYouthUnitOfWork,
  ReleaseUnitOfWork,
  SellUnitOfWork,
  ListUnitOfWork,
  CompetitionUnitOfWork,
  CompetitionReadModel,
  TrainingPlanRepository,
  TrainingContextReader,
  AccrualContextReader,
  AccrualBufferWriter,
  SeasonAccrualUnitOfWork,
  SeasonAgingUnitOfWork,
  SeasonLifecycleRepository,
  TrainingSessionUnitOfWork,
  CohesionTrainingUnitOfWork,
  LineupRepository,
  LineupContextReader,
  PlayerRepository,
  AutomationUnitOfWork,
  WorldRepository,
} from "@grinta/core";
import type { Request } from "express";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { registeredQueryNames } from "../queries/query-registry.js";

import { ApiException } from "../common/standard-error.js";
import { IdempotencyStore } from "../core/idempotency-store.js";
import {
  CLUB_CONTROL_REPOSITORY,
  CLUB_READ_MODEL,
  CLUB_REPOSITORY,
  CLUB_UNIT_OF_WORK,
  GENESIS_UNIT_OF_WORK,
  MATCH_PLAY_REPOSITORY,
  PRESENCE_REPOSITORY,
  WORLD_CLOCK_REPOSITORY,
  TRANSFER_UNIT_OF_WORK,
  PROMOTE_YOUTH_UNIT_OF_WORK,
  DEMOTE_TO_YOUTH_UNIT_OF_WORK,
  RELEASE_UNIT_OF_WORK,
  SELL_UNIT_OF_WORK,
  LIST_UNIT_OF_WORK,
  COMPETITION_UNIT_OF_WORK,
  COMPETITION_READ_MODEL,
  TRAINING_PLAN_REPOSITORY,
  TRAINING_CONTEXT_READER,
  TRAINING_ACCRUAL_CONTEXT_READER,
  TRAINING_ACCRUAL_BUFFER_WRITER,
  SEASON_ACCRUAL_UNIT_OF_WORK,
  SEASON_AGING_UNIT_OF_WORK,
  SEASON_LIFECYCLE_REPOSITORY,
  TRAINING_SESSION_UNIT_OF_WORK,
  COHESION_TRAINING_UNIT_OF_WORK,
  CLUB_LINEUP_REPOSITORY,
  LINEUP_CONTEXT_READER,
  PLAYER_REPOSITORY,
  AUTOMATION_UNIT_OF_WORK,
  SEASON_FINANCE_UNIT_OF_WORK,
  GAME_WORLD_REPOSITORY,
  IDEMPOTENCY_STORE,
  IDENTITY_UNIT_OF_WORK,
  REALTIME_PUBLISHER,
} from "../core/tokens.js";
import type { RealtimePublisher } from "../realtime/realtime-publisher.js";
import {
  commandEnvelopeSchema,
  type CommandResponse,
} from "./command-contract.js";
import {
  registeredCommandTypes,
  resolveCommandHandler,
} from "./command-registry.js";

/** Versões de contrato suportadas (FR-014). Aditivo dentro da major. */
const SUPPORTED_CONTRACT_VERSIONS = new Set(["v1"]);

@ApiTags("commands")
@Controller("commands")
export class CommandsController {
  constructor(
    @Inject(CLUB_REPOSITORY) private readonly clubs: ClubRepository,
    @Inject(CLUB_CONTROL_REPOSITORY)
    private readonly controls: ClubControlRepository,
    @Inject(CLUB_UNIT_OF_WORK)
    private readonly clubUnitOfWork: ClubUnitOfWork,
    @Inject(GENESIS_UNIT_OF_WORK)
    private readonly genesisUnitOfWork: GenesisUnitOfWork,
    @Inject(MATCH_PLAY_REPOSITORY)
    private readonly matchPlay: MatchPlayRepository,
    @Inject(PRESENCE_REPOSITORY)
    private readonly presence: PresenceRepository,
    @Inject(WORLD_CLOCK_REPOSITORY)
    private readonly worldClock: WorldClockRepository,
    @Inject(TRANSFER_UNIT_OF_WORK)
    private readonly transferUnitOfWork: TransferUnitOfWork,
    @Inject(PROMOTE_YOUTH_UNIT_OF_WORK)
    private readonly promoteYouthUnitOfWork: PromoteYouthUnitOfWork,
    @Inject(DEMOTE_TO_YOUTH_UNIT_OF_WORK)
    private readonly demoteToYouthUnitOfWork: DemoteToYouthUnitOfWork,
    @Inject(RELEASE_UNIT_OF_WORK)
    private readonly releaseUnitOfWork: ReleaseUnitOfWork,
    @Inject(SELL_UNIT_OF_WORK)
    private readonly sellUnitOfWork: SellUnitOfWork,
    @Inject(LIST_UNIT_OF_WORK)
    private readonly listUnitOfWork: ListUnitOfWork,
    @Inject(COMPETITION_UNIT_OF_WORK)
    private readonly competitionUnitOfWork: CompetitionUnitOfWork,
    @Inject(COMPETITION_READ_MODEL)
    private readonly competitionReadModel: CompetitionReadModel,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(TRAINING_CONTEXT_READER)
    private readonly trainingContextReader: TrainingContextReader,
    @Inject(TRAINING_ACCRUAL_CONTEXT_READER)
    private readonly accrualContextReader: AccrualContextReader,
    @Inject(TRAINING_ACCRUAL_BUFFER_WRITER)
    private readonly accrualBufferWriter: AccrualBufferWriter,
    @Inject(SEASON_ACCRUAL_UNIT_OF_WORK)
    private readonly seasonAccrualUnitOfWork: SeasonAccrualUnitOfWork,
    @Inject(SEASON_AGING_UNIT_OF_WORK)
    private readonly seasonAgingUnitOfWork: SeasonAgingUnitOfWork,
    @Inject(SEASON_LIFECYCLE_REPOSITORY)
    private readonly seasonLifecycle: SeasonLifecycleRepository,
    @Inject(TRAINING_SESSION_UNIT_OF_WORK)
    private readonly trainingSessionUnitOfWork: TrainingSessionUnitOfWork,
    @Inject(COHESION_TRAINING_UNIT_OF_WORK)
    private readonly cohesionTrainingUnitOfWork: CohesionTrainingUnitOfWork,
    @Inject(CLUB_LINEUP_REPOSITORY)
    private readonly clubLineupRepository: LineupRepository,
    @Inject(LINEUP_CONTEXT_READER)
    private readonly lineupContextReader: LineupContextReader,
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
    @Inject(AUTOMATION_UNIT_OF_WORK)
    private readonly automationUnitOfWork: AutomationUnitOfWork,
    @Inject(SEASON_FINANCE_UNIT_OF_WORK)
    private readonly seasonFinanceUnitOfWork: SeasonFinanceUnitOfWork,
    @Inject(CLUB_READ_MODEL) private readonly clubReadModel: ClubReadModel,
    @Inject(IDEMPOTENCY_STORE) private readonly idempotency: IdempotencyStore,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
    @Inject(IDENTITY_UNIT_OF_WORK)
    private readonly identityUnitOfWork: IdentityUnitOfWork,
    // O mundo é tabela, sempre (R-173/R-182) — raiz de tudo.
    @Inject(GAME_WORLD_REPOSITORY) private readonly worlds: WorldRepository,
  ) {}

  @ApiOperation({
    summary: "Catálogo de commands e queries disponíveis",
    description:
      "Lista os commandTypes e queryTypes registrados para descoberta pelo cliente.",
  })
  @Get("catalog")
  catalog(): {
    commands: readonly string[];
    queries: readonly string[];
    commandCount: number;
  } {
    const commands = registeredCommandTypes();
    return {
      commands,
      queries: registeredQueryNames(),
      commandCount: commands.length,
    };
  }

  @ApiOperation({
    summary: "Envia um command (envelope idempotente)",
    description:
      "commandType roteia para o caso de uso. Resposta: ACCEPTED | " +
      "ALREADY_APPLIED | REJECTED. Veja GET /commands/catalog.",
  })
  @ApiBody({
    schema: {
      example: {
        contractVersion: "v1",
        commandType: "world:create",
        payload: { seed: "meu-mundo", startDate: "2026-01-01" },
        idempotencyKey: "create-1",
        correlationId: "corr-1",
      },
    },
  })
  @Post()
  async submit(
    @Body() body: unknown,
    @Req() request: Request & AuthenticatedRequest,
  ): Promise<CommandResponse> {
    const parsed = commandEnvelopeSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiException({
        code: "REQUEST_INVALID",
        messageKey: "error.command.envelope",
        correlationId:
          typeof (body as { correlationId?: unknown })?.correlationId ===
          "string"
            ? (body as { correlationId: string }).correlationId
            : "unknown",
        retryable: false,
        fieldErrors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          messageKey: issue.message,
        })),
        blockingReason: "REQUEST_INVALID",
        recoveryAction: null,
      });
    }
    const envelope = parsed.data;

    // FR-014: upgrade incompatível de contrato é bloqueado com recuperação segura.
    if (!SUPPORTED_CONTRACT_VERSIONS.has(envelope.contractVersion)) {
      throw new ApiException({
        code: "CONTRACT_INCOMPATIBLE",
        messageKey: "error.contract.incompatible",
        correlationId: envelope.correlationId,
        retryable: false,
        fieldErrors: [
          { field: "contractVersion", messageKey: envelope.contractVersion },
        ],
        blockingReason: "CONTRACT_INCOMPATIBLE",
        recoveryAction: "UPGRADE_CLIENT",
      });
    }

    const replay = this.idempotency.get(envelope.idempotencyKey);
    if (replay) {
      return {
        commandId: replay.commandId,
        status: "ALREADY_APPLIED",
        correlationId: envelope.correlationId,
        resource: replay.resource ?? null,
      };
    }

    // RBAC: comandos de administração exigem papel admin (SoD — FR-012).
    if (
      envelope.commandType.startsWith("admin:") &&
      request.session?.role !== "admin"
    ) {
      throw new ApiException(
        {
          code: "FORBIDDEN",
          messageKey: "error.auth.adminRequired",
          correlationId: envelope.correlationId,
          retryable: false,
          fieldErrors: [
            { field: "commandType", messageKey: envelope.commandType },
          ],
          blockingReason: "FORBIDDEN",
          recoveryAction: null,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const handler = resolveCommandHandler(envelope.commandType);
    if (!handler) {
      throw new ApiException({
        code: "COMMAND_UNKNOWN",
        messageKey: "error.command.unknown",
        correlationId: envelope.correlationId,
        retryable: false,
        fieldErrors: [{ field: "commandType", messageKey: envelope.commandType }],
        blockingReason: "COMMAND_UNKNOWN",
        recoveryAction: null,
      });
    }

    const commandId = randomUUID();
    let result;
    try {
      result = await handler({
        clubs: this.clubs,
        controls: this.controls,
        clubUnitOfWork: this.clubUnitOfWork,
        genesisUnitOfWork: this.genesisUnitOfWork,
        matchPlay: this.matchPlay,
        presence: this.presence,
        worldClock: this.worldClock,
        transferUnitOfWork: this.transferUnitOfWork,
        promoteYouthUnitOfWork: this.promoteYouthUnitOfWork,
        demoteToYouthUnitOfWork: this.demoteToYouthUnitOfWork,
        releaseUnitOfWork: this.releaseUnitOfWork,
        sellUnitOfWork: this.sellUnitOfWork,
        listUnitOfWork: this.listUnitOfWork,
        competitionUnitOfWork: this.competitionUnitOfWork,
        competitionReadModel: this.competitionReadModel,
        trainingPlanRepository: this.trainingPlanRepository,
        trainingContextReader: this.trainingContextReader,
        accrualContextReader: this.accrualContextReader,
        accrualBufferWriter: this.accrualBufferWriter,
        seasonAccrualUnitOfWork: this.seasonAccrualUnitOfWork,
        seasonAgingUnitOfWork: this.seasonAgingUnitOfWork,
        seasonLifecycle: this.seasonLifecycle,
        trainingSessionUnitOfWork: this.trainingSessionUnitOfWork,
        cohesionTrainingUnitOfWork: this.cohesionTrainingUnitOfWork,
        clubLineupRepository: this.clubLineupRepository,
        lineupContextReader: this.lineupContextReader,
        playerRepository: this.playerRepository,
        automationUnitOfWork: this.automationUnitOfWork,
        seasonFinanceUnitOfWork: this.seasonFinanceUnitOfWork,
        clubReadModel: this.clubReadModel,
        // Quem agiu vem do TOKEN, não do corpo. O evento grava isso.
        actorId: request.session?.accountId ?? null,
        identityUnitOfWork: this.identityUnitOfWork,
        worlds: this.worlds,
        envelope,
      });
    } catch (error) {
      // Rede de segurança: nenhum command derruba a API com 500. Qualquer
      // exceção do domínio/adapter vira REJECTED com correlationId preservado.
      return {
        commandId,
        status: "REJECTED",
        correlationId: envelope.correlationId,
        error: {
          code: "COMMAND_EXECUTION_FAILED",
          messageKey:
            error instanceof Error ? error.message : "Falha ao executar command.",
        },
      };
    }
    if (!result.ok) {
      return {
        commandId,
        status: "REJECTED",
        correlationId: envelope.correlationId,
        error: {
          code: result.error.code,
          messageKey: result.error.message,
        },
      };
    }

    this.idempotency.remember(envelope.idempotencyKey, {
      commandId,
      resource: result.value.resource ?? undefined,
    });

    // Realtime (não autoritativo): publica os eventos de domínio quando houver,
    // e sempre um CommandAccepted — assim o feed reflete toda a atividade do mundo.
    if (envelope.worldId !== undefined) {
      const mutation = result.value.mutation;
      const domainEvents =
        mutation !== undefined
          ? (mutation.events as unknown as Record<string, unknown>[])
          : [];
      this.realtime.publish(envelope.worldId, envelope.correlationId, [
        {
          type: "CommandAccepted",
          commandType: envelope.commandType,
          resource: result.value.resource ?? null,
          commandId,
        },
        ...domainEvents,
      ]);
    }

    return {
      commandId,
      status: "ACCEPTED",
      correlationId: envelope.correlationId,
      resource: result.value.resource ?? null,
    };
  }
}
