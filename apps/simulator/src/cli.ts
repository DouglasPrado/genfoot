import { resolve } from "node:path";

import {
  ActivateProvisionedWorld,
  AdvanceScheduledWorldDays,
  CancelScheduledTask,
  CreateWorld,
  GenerateWorldGenesis,
  InspectWorld,
  InspectWorldScheduler,
  InspectPlayerLifecycle,
  ResumeWorldScheduler,
  RetryScheduledTask,
  ScheduleWorldTask,
  createPlayerDayTaskHandler,
} from "@grinta/core";
import {
  DomainError,
  WorldDate,
  newEntityId,
  parseGameWorldId,
  parseRulesetVersion,
  type Result,
} from "@grinta/shared";
import { Command, CommanderError } from "commander";
import { z } from "zod";

import { JsonWorldRepository } from "./json-world-repository.js";

export interface CliIo {
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}

export interface RunCliOptions {
  readonly cwd?: string;
  readonly dataDirectory?: string;
  readonly io?: CliIo;
}

const defaultIo: CliIo = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value),
};

export async function runCli(
  arguments_: readonly string[],
  options: RunCliOptions = {},
): Promise<number> {
  const io = options.io ?? defaultIo;
  const dataDirectory =
    options.dataDirectory ??
    process.env.GRINTA_SIMULATOR_DATA_DIR ??
    resolve(options.cwd ?? process.cwd(), ".grinta/simulator/worlds");
  const repository = new JsonWorldRepository(dataDirectory);
  const program = new Command();
  let exitCode = 0;

  program
    .name("grinta-simulator")
    .description("Simulador headless do Grinta")
    .showHelpAfterError()
    .exitOverride()
    .configureOutput({
      writeOut: (value) => io.stdout(value),
      writeErr: (value) => io.stderr(value),
    });

  program
    .command("world:create")
    .description("Cria um snapshot local de mundo no estado CREATING")
    .requiredOption("--seed <seed>")
    .requiredOption("--start-date <YYYY-MM-DD>")
    .option("--ruleset-version <version>", "Versão SemVer do ruleset", "1.0.0")
    .action(async (raw: Record<string, unknown>) => {
      const input = z
        .object({
          seed: z.string().trim().min(1),
          startDate: z.string(),
          rulesetVersion: z.string(),
        })
        .safeParse(raw);
      if (!input.success) {
        exitCode = writeError(io, invalidArguments(input.error.message));
        return;
      }

      const startDate = WorldDate.parse(input.data.startDate);
      if (!startDate.ok) {
        exitCode = writeError(io, startDate.error);
        return;
      }

      const rulesetVersion = parseRulesetVersion(input.data.rulesetVersion);
      if (!rulesetVersion.ok) {
        exitCode = writeError(io, rulesetVersion.error);
        return;
      }

      const result = await new CreateWorld(repository).execute({
        seed: input.data.seed,
        startDate: startDate.value,
        rulesetVersion: rulesetVersion.value,
      });
      exitCode = writeResult(io, result);
    });

  program
    .command("world:inspect")
    .description("Exibe o snapshot corrente de um mundo")
    .requiredOption("--world <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }

      exitCode = writeResult(
        io,
        await new InspectWorld(repository).execute(id.value),
      );
    });

  program
    .command("world:genesis")
    .description("Gera clubes, pessoas, jogadores, elencos e calendário")
    .requiredOption("--world <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }

      exitCode = writeResult(
        io,
        await new GenerateWorldGenesis(
          repository,
          repository,
          undefined,
          repository,
        ).execute(id.value),
      );
    });

  program
    .command("world:activate")
    .description("Ativa um mundo que possui gênese válida")
    .requiredOption("--world <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }

      exitCode = writeResult(
        io,
        await new ActivateProvisionedWorld(
          repository,
          repository,
          repository,
          repository,
        ).execute(id.value),
      );
    });

  program
    .command("day:simulate")
    .description("Avança dias de um mundo ACTIVE")
    .requiredOption("--world <uuid>")
    .requiredOption("--days <number>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }

      const days = z.coerce.number().int().positive().safeParse(raw.days);
      if (!days.success) {
        exitCode = writeError(
          io,
          invalidArguments("days deve ser um inteiro positivo."),
        );
        return;
      }

      exitCode = writeResult(
        io,
        await new AdvanceScheduledWorldDays(
          repository,
          repository,
          { "players:process-day": createPlayerDayTaskHandler(repository) },
          newEntityId<"WorldClockExecutor">(),
        ).execute(id.value, days.data),
      );
    });

  program
    .command("players:summary")
    .description("Exibe integridade e checkpoint do lifecycle de jogadores")
    .requiredOption("--world <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      exitCode = writeResult(
        io,
        await new InspectPlayerLifecycle(repository).summary(id.value),
      );
    });

  program
    .command("player:inspect")
    .description("Exibe o estado autoritativo de um jogador")
    .requiredOption("--world <uuid>")
    .requiredOption("--player <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      if (typeof raw.player !== "string") {
        exitCode = writeError(io, invalidArguments("player é obrigatório."));
        return;
      }
      exitCode = writeResult(
        io,
        await new InspectPlayerLifecycle(repository).player(
          id.value,
          raw.player,
        ),
      );
    });

  program
    .command("scheduler:inspect")
    .description("Exibe temporadas, agenda e estado do scheduler")
    .requiredOption("--world <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      exitCode = writeResult(
        io,
        await new InspectWorldScheduler(repository).execute(id.value),
      );
    });

  program
    .command("scheduler:run")
    .description("Retoma e processa tarefas devidas na data atual")
    .requiredOption("--world <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      exitCode = writeResult(
        io,
        await new ResumeWorldScheduler(
          repository,
          repository,
          { "players:process-day": createPlayerDayTaskHandler(repository) },
          newEntityId<"WorldClockExecutor">(),
        ).execute(id.value),
      );
    });

  program
    .command("scheduler:schedule")
    .description("Agenda uma tarefa persistente no mundo")
    .requiredOption("--world <uuid>")
    .requiredOption("--type <type>")
    .requiredOption("--due-on <YYYY-MM-DD>")
    .requiredOption("--idempotency-key <key>")
    .option("--priority <number>", "Menor número executa primeiro", "100")
    .option("--payload <json>", "Payload JSON", "{}")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      const input = z
        .object({
          type: z.string().trim().min(1),
          dueOn: z.string(),
          idempotencyKey: z.string().trim().min(1),
          priority: z.coerce.number().int(),
          payload: z.string().transform((value, context) => {
            try {
              const parsed: unknown = JSON.parse(value);
              if (
                typeof parsed !== "object" ||
                parsed === null ||
                Array.isArray(parsed)
              ) {
                context.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "payload deve ser um objeto JSON.",
                });
                return z.NEVER;
              }
              return parsed as Record<string, unknown>;
            } catch {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                message: "payload deve ser JSON válido.",
              });
              return z.NEVER;
            }
          }),
        })
        .safeParse(raw);
      if (!input.success) {
        exitCode = writeError(io, invalidArguments(input.error.message));
        return;
      }
      const dueOn = WorldDate.parse(input.data.dueOn);
      if (!dueOn.ok) {
        exitCode = writeError(io, dueOn.error);
        return;
      }
      exitCode = writeResult(
        io,
        await new ScheduleWorldTask(repository).execute(id.value, {
          id: newEntityId<"ScheduledTask">(),
          type: input.data.type,
          dueOn: dueOn.value.toString(),
          idempotencyKey: input.data.idempotencyKey,
          priority: input.data.priority,
          payload: input.data.payload,
        }),
      );
    });

  program
    .command("scheduler:retry")
    .description("Recoloca uma tarefa falha e elegível na fila")
    .requiredOption("--world <uuid>")
    .requiredOption("--task <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      if (typeof raw.task !== "string") {
        exitCode = writeError(io, invalidArguments("task é obrigatório."));
        return;
      }
      exitCode = writeResult(
        io,
        await new RetryScheduledTask(repository).execute(id.value, raw.task),
      );
    });

  program
    .command("scheduler:cancel")
    .description("Cancela uma tarefa pendente ou falha")
    .requiredOption("--world <uuid>")
    .requiredOption("--task <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      if (typeof raw.task !== "string") {
        exitCode = writeError(io, invalidArguments("task é obrigatório."));
        return;
      }
      exitCode = writeResult(
        io,
        await new CancelScheduledTask(repository).execute(id.value, raw.task),
      );
    });

  try {
    await program.parseAsync(["node", "grinta-simulator", ...arguments_]);
  } catch (error: unknown) {
    if (error instanceof CommanderError) {
      if (
        error.code === "commander.helpDisplayed" ||
        error.code === "commander.version"
      )
        return 0;
      return 2;
    }
    if (error instanceof DomainError) return writeError(io, error);

    return writeError(
      io,
      new DomainError("UNEXPECTED_ERROR", "Falha inesperada no simulador.", {
        cause: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  return exitCode;
}

function parseWorldOption(raw: Record<string, unknown>) {
  return typeof raw.world === "string"
    ? parseGameWorldId(raw.world)
    : ({ ok: false, error: invalidArguments("world é obrigatório.") } as const);
}

function writeResult<T>(io: CliIo, result: Result<T, DomainError>): number {
  if (!result.ok) return writeError(io, result.error);
  io.stdout(`${JSON.stringify({ ok: true, data: result.value }, null, 2)}\n`);
  return 0;
}

function writeError(io: CliIo, error: DomainError): number {
  io.stderr(
    `${JSON.stringify({ ok: false, error: error.toJSON() }, null, 2)}\n`,
  );
  return errorCode(error.code);
}

function errorCode(code: string): number {
  if (code.startsWith("INVALID_")) return 2;
  if (code === "WORLD_NOT_FOUND") return 3;
  if (
    code === "WORLD_NOT_ACTIVE" ||
    code === "WORLD_GENESIS_NOT_FOUND" ||
    code === "WORLD_GENESIS_NOT_ALLOWED" ||
    code === "WORLD_GENESIS_ALREADY_EXISTS" ||
    code === "AGGREGATE_VERSION_CONFLICT" ||
    code === "SCHEDULER_REVISION_CONFLICT" ||
    code === "SCHEDULER_NOT_FOUND" ||
    code === "TASK_NOT_RETRYABLE" ||
    code === "TASK_NOT_CANCELLABLE" ||
    code === "WORLD_CLOCK_LEASE_HELD" ||
    code === "PLAYER_LIFECYCLE_NOT_FOUND" ||
    code === "PLAYER_LIFECYCLE_REVISION_CONFLICT" ||
    code === "PLAYER_NOT_FOUND" ||
    code === "WORLD_ALREADY_EXISTS"
  ) {
    return 4;
  }
  return 1;
}

function invalidArguments(message: string): DomainError {
  return new DomainError("INVALID_ARGUMENT", message);
}
