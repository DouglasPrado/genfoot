import { resolve } from "node:path";

import { AdvanceWorldDays, CreateWorld, InspectWorld } from "@grinta/core";
import {
  DomainError,
  WorldDate,
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
        await new AdvanceWorldDays(repository).execute(id.value, days.data),
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
    code === "AGGREGATE_VERSION_CONFLICT" ||
    code === "WORLD_ALREADY_EXISTS"
  ) {
    return 4;
  }
  return 1;
}

function invalidArguments(message: string): DomainError {
  return new DomainError("INVALID_ARGUMENT", message);
}
