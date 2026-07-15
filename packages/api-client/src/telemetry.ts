/**
 * Telemetria segura (FR-013): eventos correlacionados por IDs seguros, sem
 * segredos nem PII. `redactForTelemetry` mascara campos sensíveis; os eventos
 * de command/erro carregam apenas identificadores (nunca payload/token).
 */
const SENSITIVE = [
  "token",
  "authorization",
  "adminkey",
  "password",
  "secret",
  "payload",
  "email",
  "cpf",
];

export function redactForTelemetry(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const lower = key.toLowerCase();
    out[key] = SENSITIVE.some((needle) => lower.includes(needle))
      ? "[redacted]"
      : value;
  }
  return out;
}

export interface CommandTelemetryEvent {
  readonly type: "command";
  readonly commandType: string;
  readonly status: string;
  readonly correlationId: string;
  readonly commandId: string;
  readonly errorCode?: string;
}

/** Constrói um evento de telemetria de command sem payload nem PII. */
export function commandTelemetry(input: {
  commandType: string;
  status: string;
  correlationId: string;
  commandId: string;
  errorCode?: string;
}): CommandTelemetryEvent {
  return {
    type: "command",
    commandType: input.commandType,
    status: input.status,
    correlationId: input.correlationId,
    commandId: input.commandId,
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
  };
}
