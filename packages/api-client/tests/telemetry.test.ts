import { describe, expect, it } from "vitest";

import { commandTelemetry, redactForTelemetry } from "../src/index.js";

describe("telemetria segura (FR-013)", () => {
  it("mascara segredos e PII", () => {
    const out = redactForTelemetry({
      token: "abc",
      adminKey: "k",
      payload: { seed: "x" },
      correlationId: "corr-1",
      commandType: "world:create",
    });
    expect(out.token).toBe("[redacted]");
    expect(out.adminKey).toBe("[redacted]");
    expect(out.payload).toBe("[redacted]");
    expect(out.correlationId).toBe("corr-1");
    expect(out.commandType).toBe("world:create");
  });

  it("evento de command carrega só IDs seguros — nunca payload", () => {
    const event = commandTelemetry({
      commandType: "admin:place-quarantine",
      status: "ACCEPTED",
      correlationId: "corr-2",
      commandId: "cmd-9",
    });
    expect(event).not.toHaveProperty("payload");
    expect(event.correlationId).toBe("corr-2");
    expect(event.commandType).toBe("admin:place-quarantine");
    expect(Object.keys(event)).toEqual([
      "type",
      "commandType",
      "status",
      "correlationId",
      "commandId",
    ]);
  });
});
