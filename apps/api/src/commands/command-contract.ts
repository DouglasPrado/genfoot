import { z } from "zod";

/** Envelope de command HTTP do X-003 (contracts/README). */
export const commandEnvelopeSchema = z.object({
  contractVersion: z.string().min(1),
  commandType: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  worldId: z.string().uuid().optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
  idempotencyKey: z.string().min(1),
  correlationId: z.string().min(1),
});

export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;

export const CommandStatus = {
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  ALREADY_APPLIED: "ALREADY_APPLIED",
} as const;

export type CommandStatus =
  (typeof CommandStatus)[keyof typeof CommandStatus];

export interface CommandAccepted {
  readonly commandId: string;
  readonly status: "ACCEPTED" | "ALREADY_APPLIED";
  readonly correlationId: string;
  readonly resource: string | null;
}

export interface CommandRejected {
  readonly commandId: string;
  readonly status: "REJECTED";
  readonly correlationId: string;
  readonly error: {
    readonly code: string;
    readonly messageKey: string;
  };
}

export type CommandResponse = CommandAccepted | CommandRejected;
