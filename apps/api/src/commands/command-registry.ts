import {
  ActivateProvisionedWorld,
  ConfirmOnboarding,
  CreateWorld,
  EndClubControl,
  GenerateWorldGenesis,
  InspectWorld,
  JoinWorld,
  ReleaseClubReservation,
  RequestClubSwitch,
  ReserveClub,
  type ClubRepository,
  type IdentityUnitOfWork,
  type WorldMutationResult,
  type WorldRepository,
} from "@grinta/core";
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

/**
 * O barramento de commands depois do extermínio da arquitetura morta (R-175).
 *
 * Eram ~148 commands sobre 16 mega-agregados e o adapter JSON. **Sobraram 9** —
 * os que uma vertical viva exige hoje: o admin criando um mundo, gerando os
 * clubes e ativando; e o jogador entrando e escolhendo clube.
 *
 * Os outros não foram adiados: foram APAGADOS, com os contextos que os serviam.
 * Voltam um a um, já em agregado por entidade sobre Postgres, quando uma tela
 * precisar deles — e aí nascem certos na primeira vez. Construir 148 commands
 * antes de qualquer cliente provar que eram os certos foi o que produziu 16
 * contextos completos convivendo com 11 de 114 telas.
 *
 * Não há mais `repository: JsonWorldRepository` no contexto. Só Postgres.
 */

export interface CommandOutcome {
  readonly resource: string | null;
  readonly mutation?: WorldMutationResult;
}

export interface CommandContext {
  /** Escopo transacional de C1 (R-175/R-176): agregado e evento no mesmo commit. */
  readonly identityUnitOfWork: IdentityUnitOfWork;
  /** O mundo é tabela, sempre (R-173/R-182). Raiz de tudo: todo command o lê. */
  readonly worlds: WorldRepository;
  /** C3 — o clube é tabela. É o que destrava `identity:reserve-club`. */
  readonly clubs: ClubRepository;
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

function requireWorldId(
  rawWorldId: string | undefined,
): Result<string, DomainError> {
  return rawWorldId === undefined
    ? fail(new DomainError("COMMAND_PAYLOAD_INVALID", "worldId é obrigatório."))
    : succeed(rawWorldId);
}

async function loadWorld(
  worlds: CommandContext["worlds"],
  rawWorldId: string | undefined,
) {
  const raw = requireWorldId(rawWorldId);
  if (!raw.ok) return raw;
  const worldId = parseGameWorldId(raw.value);
  if (!worldId.ok) return worldId;
  const world = await new InspectWorld(worlds).execute(worldId.value);
  if (!world.ok) return world;
  return succeed({ worldId: worldId.value, snapshot: world.value });
}

interface IdentityUseCase {
  execute(input: never): Promise<Result<unknown, DomainError>>;
}

/**
 * Adapter dos commands de C1.
 *
 * Sem `idempotencyKey` no input: cada comando é naturalmente idempotente pela
 * chave natural do banco. O `idempotencyKey` do envelope entra como
 * `attemptKey` — semente do id determinístico dos roots que são 1-por-VEZ
 * (reserva, controle), e é o que faz o retry devolver o mesmo id em vez de
 * criar uma segunda reserva.
 *
 * A tabela `IdempotencyKey` (R-176/R-184) é do barramento, não do caso de uso, e
 * ainda não está ligada aqui — pendência declarada.
 */
function ic(
  build: (unitOfWork: IdentityUnitOfWork) => IdentityUseCase,
): CommandHandler {
  return async ({ worlds, identityUnitOfWork, envelope }) => {
    // O mundo é tabela (R-182): `seed` e `currentDate` vêm do Postgres, e o
    // mundo enfim é reproduzível a partir do banco.
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const payload =
      typeof envelope.payload === "object" && envelope.payload !== null
        ? (envelope.payload as Record<string, unknown>)
        : {};
    const input = {
      ...payload,
      gameWorldId: world.value.worldId,
      worldSeed: world.value.snapshot.seed,
      occurredOn: world.value.snapshot.currentDate,
      attemptKey: envelope.idempotencyKey,
      correlationId: envelope.correlationId,
    };
    try {
      const result = await build(identityUnitOfWork).execute(input as never);
      if (!result.ok) return result;
      return succeed({ resource: `identity:${world.value.worldId}` });
    } catch (error) {
      return fail(
        new DomainError(
          "COMMAND_EXECUTION_FAILED",
          error instanceof Error ? error.message : "Falha ao executar command.",
        ),
      );
    }
  };
}

const handlers: Record<string, CommandHandler> = {
  "world:create": async ({ worlds, envelope }) => {
    const parsed = createWorldPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const startDate = WorldDate.parse(parsed.data.startDate);
    if (!startDate.ok) return startDate;
    const ruleset = parseRulesetVersion(parsed.data.rulesetVersion);
    if (!ruleset.ok) return ruleset;
    const result = await new CreateWorld(worlds).execute({
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

  /**
   * A gênese não é guardada (R-185): é função pura do `seed`, que R-182 tornou
   * coluna. O que este command persiste é o EFEITO dela — as linhas de `Club`.
   */
  "world:genesis": async ({ worlds, clubs, envelope }) => {
    const raw = requireWorldId(envelope.worldId);
    if (!raw.ok) return raw;
    const worldId = parseGameWorldId(raw.value);
    if (!worldId.ok) return worldId;
    const result = await new GenerateWorldGenesis(worlds, clubs).execute(
      worldId.value,
    );
    if (!result.ok) return result;
    return succeed({ resource: `world:${worldId.value}` });
  },

  "world:activate": async ({ worlds, clubs, envelope }) => {
    const raw = requireWorldId(envelope.worldId);
    if (!raw.ok) return raw;
    const worldId = parseGameWorldId(raw.value);
    if (!worldId.ok) return worldId;
    const result = await new ActivateProvisionedWorld(worlds, clubs).execute(
      worldId.value,
    );
    if (!result.ok) return result;
    return succeed({
      resource: `world:${worldId.value}`,
      mutation: result.value,
    });
  },

  "identity:join-world": ic((u) => new JoinWorld(u)),
  "identity:reserve-club": ic((u) => new ReserveClub(u)),
  "identity:confirm-onboarding": ic((u) => new ConfirmOnboarding(u)),
  "identity:release-club-reservation": ic((u) => new ReleaseClubReservation(u)),
  "identity:end-club-control": ic((u) => new EndClubControl(u)),
  "identity:request-switch": ic((u) => new RequestClubSwitch(u)),
};

export function resolveCommandHandler(
  commandType: string,
): CommandHandler | undefined {
  return handlers[commandType];
}

export function registeredCommandTypes(): readonly string[] {
  return Object.keys(handlers);
}
