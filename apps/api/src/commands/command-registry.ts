import { randomUUID } from "node:crypto";

import {
  ActivateProvisionedWorld,
  AdvanceWorldDays,
  CreateWorld,
  ExecuteClubCommand,
  GenerateWorldGenesis,
  InitializeMarket,
  InspectWorld,
  PublishListing,
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

export function resolveCommandHandler(
  commandType: string,
): CommandHandler | undefined {
  return handlers[commandType];
}

export function registeredCommandTypes(): readonly string[] {
  return Object.keys(handlers);
}
