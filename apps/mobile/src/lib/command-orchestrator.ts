import {
  CommandTrackingStatus,
  type CommandTrackingStatus as CommandTrackingStatusValue,
} from "@grinta/core";
import {
  GrintaApiError,
  type CommandEnvelope,
  type CommandResponse,
} from "@grinta/api-client";

interface CommandClient {
  command(envelope: CommandEnvelope): Promise<CommandResponse>;
}

export interface TrackedCommandInput {
  readonly clientContractVersion: string;
  readonly serverContractVersion: string | null;
  readonly commandType: string;
  readonly worldId: string;
  readonly payload: Record<string, unknown>;
  readonly expectedVersion?: number;
  readonly idempotencyKey: string;
  readonly correlationId: string;
}

export interface TrackedCommandResult {
  readonly status: CommandTrackingStatusValue;
  readonly commandId: string | null;
  readonly resource: string | null;
  readonly correlationId: string;
  readonly errorCode: string | null;
}

function contractMajor(version: string): string {
  return version.trim().replace(/^v/i, "").split(".")[0] ?? "";
}

export function incompatibleContract(
  clientVersion: string,
  serverVersion: string | null,
): boolean {
  return (
    serverVersion !== null &&
    contractMajor(clientVersion) !== contractMajor(serverVersion)
  );
}

/**
 * Envia um command oficial sem presumir aplicação. ACCEPTED permanece pendente
 * até uma query/evento confirmar o efeito; falha técnica após envio é UNKNOWN.
 */
export async function submitTrackedCommand(
  client: CommandClient,
  input: TrackedCommandInput,
): Promise<TrackedCommandResult> {
  if (
    incompatibleContract(
      input.clientContractVersion,
      input.serverContractVersion,
    )
  ) {
    return {
      status: CommandTrackingStatus.REJECTED,
      commandId: null,
      resource: null,
      correlationId: input.correlationId,
      errorCode: "CONTRACT_UPGRADE_REQUIRED",
    };
  }

  try {
    const response = await client.command({
      contractVersion: input.clientContractVersion,
      commandType: input.commandType,
      worldId: input.worldId,
      payload: input.payload,
      ...(input.expectedVersion !== undefined
        ? { expectedVersion: input.expectedVersion }
        : {}),
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
    });
    const status =
      response.status === "ALREADY_APPLIED"
        ? CommandTrackingStatus.APPLIED
        : response.status === "REJECTED"
          ? CommandTrackingStatus.REJECTED
          : CommandTrackingStatus.ACCEPTED;
    return {
      status,
      commandId: response.commandId,
      resource: response.resource ?? null,
      correlationId: response.correlationId,
      errorCode: response.error?.code ?? null,
    };
  } catch (error) {
    if (error instanceof GrintaApiError && error.status < 500) {
      return {
        status: CommandTrackingStatus.REJECTED,
        commandId: null,
        resource: null,
        correlationId: error.standard.correlationId || input.correlationId,
        errorCode: error.standard.code,
      };
    }
    return {
      status: CommandTrackingStatus.UNKNOWN_RECOVERING,
      commandId: null,
      resource: null,
      correlationId: input.correlationId,
      errorCode: "COMMAND_RESULT_UNKNOWN",
    };
  }
}
