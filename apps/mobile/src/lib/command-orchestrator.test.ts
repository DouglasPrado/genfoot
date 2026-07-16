import { describe, expect, it, vi } from "vitest";
import { CommandTrackingStatus } from "@grinta/core";

import {
  incompatibleContract,
  submitTrackedCommand,
} from "./command-orchestrator";

describe("orquestrador de command mobile", () => {
  it("bloqueia major de contrato incompatível antes de enviar", async () => {
    const command = vi.fn();

    const result = await submitTrackedCommand(
      { command },
      {
        clientContractVersion: "v1",
        serverContractVersion: "v2",
        commandType: "identity:join-world",
        worldId: "world-1",
        payload: {},
        idempotencyKey: "join-1",
        correlationId: "corr-1",
      },
    );

    expect(result).toMatchObject({
      status: CommandTrackingStatus.REJECTED,
      errorCode: "CONTRACT_UPGRADE_REQUIRED",
    });
    expect(command).not.toHaveBeenCalled();
  });

  it("envia IDs estáveis e mantém ACCEPTED até a projeção confirmar", async () => {
    const command = vi.fn().mockResolvedValue({
      commandId: "cmd-1",
      status: "ACCEPTED",
      correlationId: "corr-1",
      resource: "participation:1",
    });

    const result = await submitTrackedCommand(
      { command },
      {
        clientContractVersion: "v1",
        serverContractVersion: "v1",
        commandType: "identity:join-world",
        worldId: "world-1",
        payload: { accountId: "account-1" },
        expectedVersion: 3,
        idempotencyKey: "join-1",
        correlationId: "corr-1",
      },
    );

    expect(command).toHaveBeenCalledWith({
      commandType: "identity:join-world",
      worldId: "world-1",
      payload: { accountId: "account-1" },
      expectedVersion: 3,
      idempotencyKey: "join-1",
      correlationId: "corr-1",
      contractVersion: "v1",
    });
    expect(result.status).toBe(CommandTrackingStatus.ACCEPTED);
  });

  it("trata falha de rede após envio como estado desconhecido, nunca sucesso", async () => {
    const command = vi.fn().mockRejectedValue(new Error("network"));

    const result = await submitTrackedCommand(
      { command },
      {
        clientContractVersion: "v1",
        serverContractVersion: "v1",
        commandType: "world:advance-day",
        worldId: "world-1",
        payload: {},
        idempotencyKey: "advance-1",
        correlationId: "corr-advance-1",
      },
    );

    expect(result.status).toBe(CommandTrackingStatus.UNKNOWN_RECOVERING);
    expect(result.errorCode).toBe("COMMAND_RESULT_UNKNOWN");
  });

  it("compara a major versionada explicitamente", () => {
    expect(incompatibleContract("v1", "v1.4")).toBe(false);
    expect(incompatibleContract("v1", "v2")).toBe(true);
    expect(incompatibleContract("v1", null)).toBe(false);
  });
});
