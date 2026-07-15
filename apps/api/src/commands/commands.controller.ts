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
import type { JsonWorldRepository } from "@grinta/persistence";
import type { Request } from "express";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { registeredQueryTypes } from "../queries/query-registry.js";

import { ApiException } from "../common/standard-error.js";
import { IdempotencyStore } from "../core/idempotency-store.js";
import {
  IDEMPOTENCY_STORE,
  REALTIME_PUBLISHER,
  WORLD_REPOSITORY,
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
    @Inject(WORLD_REPOSITORY) private readonly repository: JsonWorldRepository,
    @Inject(IDEMPOTENCY_STORE) private readonly idempotency: IdempotencyStore,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
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
      queries: registeredQueryTypes(),
      commandCount: commands.length,
    };
  }

  @ApiOperation({
    summary: "Envia um command (envelope idempotente)",
    description:
      "commandType roteia para o caso de uso. Resposta: ACCEPTED | " +
      "ALREADY_APPLIED | REJECTED. 127 tipos em 17 contextos (world, club, " +
      "market, ledger, infrastructure, scheduler, season, automation, staff, " +
      "competition, player, narrative, inbox, admin, identity, eventing, match). " +
      "Veja GET /commands/catalog.",
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
      result = await handler({ repository: this.repository, envelope });
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
