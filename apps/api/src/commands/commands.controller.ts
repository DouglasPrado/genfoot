import { randomUUID } from "node:crypto";

import { Body, Controller, Inject, Post } from "@nestjs/common";
import type { JsonWorldRepository } from "@grinta/persistence";

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
import { resolveCommandHandler } from "./command-registry.js";

@Controller("commands")
export class CommandsController {
  constructor(
    @Inject(WORLD_REPOSITORY) private readonly repository: JsonWorldRepository,
    @Inject(IDEMPOTENCY_STORE) private readonly idempotency: IdempotencyStore,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  @Post()
  async submit(@Body() body: unknown): Promise<CommandResponse> {
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

    const replay = this.idempotency.get(envelope.idempotencyKey);
    if (replay) {
      return {
        commandId: replay.commandId,
        status: "ALREADY_APPLIED",
        correlationId: envelope.correlationId,
        resource: replay.resource ?? null,
      };
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
    const result = await handler({ repository: this.repository, envelope });
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

    // Acelera a entrega dos eventos de domínio via realtime (não autoritativo).
    const mutation = result.value.mutation;
    if (mutation && envelope.worldId !== undefined) {
      this.realtime.publish(
        envelope.worldId,
        envelope.correlationId,
        mutation.events as unknown as Record<string, unknown>[],
      );
    }

    return {
      commandId,
      status: "ACCEPTED",
      correlationId: envelope.correlationId,
      resource: result.value.resource ?? null,
    };
  }
}
