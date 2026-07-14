import {
  ActivateProvisionedWorld,
  AdvanceWorldDays,
  CreateWorld,
  GenerateWorldGenesis,
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

export function resolveCommandHandler(
  commandType: string,
): CommandHandler | undefined {
  return handlers[commandType];
}

export function registeredCommandTypes(): readonly string[] {
  return Object.keys(handlers);
}
