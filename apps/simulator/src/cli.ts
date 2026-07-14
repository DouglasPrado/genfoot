import { resolve } from "node:path";

import {
  ActivateProvisionedWorld,
  AdvanceWorldDayCommand,
  AdvanceScheduledWorldDays,
  CancelScheduledTask,
  ClubDepartmentKind,
  CreateWorld,
  ExecuteClubCommand,
  GenerateWorldGenesis,
  InspectClubPortfolio,
  InspectInfrastructureProject,
  InspectWorld,
  InspectWorldScheduler,
  ListTemporalWindows,
  InspectPlayerLifecycle,
  ResumeWorldScheduler,
  RegisterTemporalWindow,
  ResumeSeasonRollover,
  RetryScheduledTask,
  ResumeInfrastructureProject,
  ScheduleWorldTask,
  SEASON_ROLLOVER_STEPS,
  StartSeasonRollover,
  StartInfrastructureProject,
  AbortInfrastructureProject,
  InspectSeasonRollover,
  TemporalWindowType,
  createPlayerDayTaskHandler,
  createClubMaintenanceTaskHandler,
  type ClubCommand,
  type ClubCommandBase,
  type InfrastructureFinancingPort,
  type InfrastructureLicensingPort,
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
          {
            "players:process-day": createPlayerDayTaskHandler(repository),
            "clubs:process-day": createClubMaintenanceTaskHandler(repository),
          },
          newEntityId<"WorldClockExecutor">(),
        ).execute(id.value, days.data),
      );
    });

  program
    .command("day:advance")
    .description("Avança exatamente um dia com command idempotente")
    .requiredOption("--world <uuid>")
    .requiredOption("--command-id <id>")
    .requiredOption("--idempotency-key <key>")
    .requiredOption("--expected-date <YYYY-MM-DD>")
    .requiredOption("--expected-version <number>")
    .option("--ruleset-version <version>", "Versão SemVer do ruleset", "1.0.0")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      const input = z
        .object({
          commandId: z.string().trim().min(1),
          idempotencyKey: z.string().trim().min(1),
          expectedDate: z.string(),
          expectedVersion: z.coerce.number().int().positive(),
          rulesetVersion: z.string(),
        })
        .safeParse(raw);
      if (!input.success) {
        exitCode = writeError(io, invalidArguments(input.error.message));
        return;
      }
      const expectedDate = WorldDate.parse(input.data.expectedDate);
      const rulesetVersion = parseRulesetVersion(input.data.rulesetVersion);
      if (!expectedDate.ok) {
        exitCode = writeError(io, expectedDate.error);
        return;
      }
      if (!rulesetVersion.ok) {
        exitCode = writeError(io, rulesetVersion.error);
        return;
      }
      exitCode = writeResult(
        io,
        await new AdvanceWorldDayCommand(
          repository,
          repository,
          {
            "players:process-day": createPlayerDayTaskHandler(repository),
            "clubs:process-day": createClubMaintenanceTaskHandler(repository),
          },
          `cli:${input.data.commandId}`,
        ).execute(id.value, {
          ...input.data,
          expectedDate: expectedDate.value.toString(),
          rulesetVersion: rulesetVersion.value,
        }),
      );
    });

  program
    .command("world:window:register")
    .description("Registra uma janela temporal versionada")
    .requiredOption("--world <uuid>")
    .requiredOption("--type <type>")
    .requiredOption("--name <name>")
    .requiredOption("--opens-on <YYYY-MM-DD>")
    .requiredOption("--closes-on <YYYY-MM-DD>")
    .option("--ruleset-version <version>", "Versão SemVer", "1.0.0")
    .option("--config-version <number>", "Versão da configuração", "1")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      const input = z
        .object({
          type: z.nativeEnum(TemporalWindowType),
          name: z.string().trim().min(1),
          opensOn: z.string(),
          closesOn: z.string(),
          rulesetVersion: z.string(),
          configVersion: z.coerce.number().int().positive(),
        })
        .safeParse(raw);
      if (!input.success) {
        exitCode = writeError(io, invalidArguments(input.error.message));
        return;
      }
      const opensOn = WorldDate.parse(input.data.opensOn);
      const closesOn = WorldDate.parse(input.data.closesOn);
      const rulesetVersion = parseRulesetVersion(input.data.rulesetVersion);
      if (!opensOn.ok) {
        exitCode = writeError(io, opensOn.error);
        return;
      }
      if (!closesOn.ok) {
        exitCode = writeError(io, closesOn.error);
        return;
      }
      if (!rulesetVersion.ok) {
        exitCode = writeError(io, rulesetVersion.error);
        return;
      }
      exitCode = writeResult(
        io,
        await new RegisterTemporalWindow(repository).execute(id.value, {
          id: newEntityId<"TemporalWindow">(),
          gameWorldId: id.value,
          ...input.data,
          opensOn: opensOn.value.toString(),
          closesOn: closesOn.value.toString(),
          rulesetVersion: rulesetVersion.value,
          version: 1,
        }),
      );
    });

  program
    .command("world:windows")
    .description("Lista janelas abertas na data lógica")
    .requiredOption("--world <uuid>")
    .requiredOption("--on <YYYY-MM-DD>")
    .option("--type <type>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      const input = z
        .object({
          on: z.string(),
          type: z.nativeEnum(TemporalWindowType).optional(),
        })
        .safeParse(raw);
      if (!input.success) {
        exitCode = writeError(io, invalidArguments(input.error.message));
        return;
      }
      const on = WorldDate.parse(input.data.on);
      if (!on.ok) {
        exitCode = writeError(io, on.error);
        return;
      }
      exitCode = writeResult(
        io,
        await new ListTemporalWindows(repository).execute(
          id.value,
          on.value,
          input.data.type,
        ),
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
    .command("club:inspect")
    .description("Exibe o portfólio C3 ou um clube específico")
    .requiredOption("--world <uuid>")
    .option("--club <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      const inspector = new InspectClubPortfolio(repository);
      exitCode =
        typeof raw.club === "string"
          ? writeResult(io, await inspector.club(id.value, raw.club))
          : writeResult(io, await inspector.world(id.value));
    });

  addClubMutationOptions(
    program
      .command("club:identity:update")
      .description("Atualiza a identidade oficial do clube")
      .requiredOption("--name <name>")
      .requiredOption("--short-code <code>"),
  ).action(async (raw: Record<string, unknown>) => {
    exitCode = await runClubMutation(
      raw,
      io,
      repository,
      z.object({
        name: z.string().trim().min(1),
        shortCode: z.string().regex(/^[A-Z0-9]{2,5}$/u),
      }),
      (base, payload) => ({ type: "UpdateClubIdentity", ...base, ...payload }),
    );
  });

  program
    .command("infrastructure:project:propose")
    .description("Propõe uma obra C3 e abre SAGA-04")
    .requiredOption("--world <uuid>")
    .requiredOption("--club <uuid>")
    .requiredOption("--project <uuid>")
    .requiredOption("--command-id <id>")
    .requiredOption("--idempotency-key <key>")
    .requiredOption("--expected-version <number>")
    .requiredOption("--actor <id>")
    .requiredOption("--proposed-at <YYYY-MM-DD>")
    .requiredOption("--target-kind <kind>")
    .requiredOption("--target-reference <ref>")
    .requiredOption("--target-value <number>")
    .requiredOption("--funding-ref <ref>")
    .requiredOption("--milestones <json>")
    .option("--ruleset-version <version>", "Versão SemVer", "1.0.0")
    .action(async (raw: Record<string, unknown>) => {
      const world = parseWorldOption(raw);
      if (!world.ok) {
        exitCode = writeError(io, world.error);
        return;
      }
      const input = z
        .object({
          club: z.string().uuid(),
          project: z.string().uuid(),
          commandId: z.string().trim().min(1),
          idempotencyKey: z.string().trim().min(1),
          expectedVersion: z.coerce.number().int().positive(),
          actor: z.string().trim().min(1),
          proposedAt: z.string(),
          targetKind: z.enum(["STADIUM_CAPACITY", "DEPARTMENT_LEVEL"]),
          targetReference: z.string().trim().min(1),
          targetValue: z.coerce.number().int().positive(),
          fundingRef: z.string().trim().min(1),
          milestones: z.string().transform((value, context) => {
            try {
              return z
                .array(
                  z.object({
                    id: z.string().min(1),
                    name: z.string().min(1),
                    dueOn: z.string(),
                    amountMinor: z.number().int().positive(),
                  }),
                )
                .min(1)
                .parse(JSON.parse(value) as unknown);
            } catch {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                message: "milestones deve ser um array JSON válido.",
              });
              return z.NEVER;
            }
          }),
          rulesetVersion: z.string(),
        })
        .safeParse(raw);
      if (!input.success) {
        exitCode = writeError(io, invalidArguments(input.error.message));
        return;
      }
      const proposedAt = WorldDate.parse(input.data.proposedAt);
      const ruleset = parseRulesetVersion(input.data.rulesetVersion);
      if (!proposedAt.ok) {
        exitCode = writeError(io, proposedAt.error);
        return;
      }
      if (!ruleset.ok) {
        exitCode = writeError(io, ruleset.error);
        return;
      }
      exitCode = writeResult(
        io,
        await new StartInfrastructureProject(repository).execute({
          id: input.data.project as never,
          gameWorldId: world.value,
          clubId: input.data.club as never,
          rulesetVersion: ruleset.value,
          commandId: input.data.commandId,
          idempotencyKey: input.data.idempotencyKey,
          actorId: input.data.actor,
          proposedAt: proposedAt.value.toString(),
          expectedClubVersion: input.data.expectedVersion,
          target: {
            kind: input.data.targetKind,
            reference: input.data.targetReference,
            targetValue: input.data.targetValue,
          },
          fundingRequestRef: input.data.fundingRef,
          milestones: input.data.milestones,
          maxAttemptsPerStep: 3,
        }),
      );
    });

  program
    .command("infrastructure:project:inspect")
    .description("Exibe o checkpoint da SAGA-04")
    .requiredOption("--world <uuid>")
    .requiredOption("--project <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const world = parseWorldOption(raw);
      if (!world.ok || typeof raw.project !== "string") {
        exitCode = writeError(
          io,
          world.ok ? invalidArguments("project é obrigatório.") : world.error,
        );
        return;
      }
      exitCode = writeResult(
        io,
        await new InspectInfrastructureProject(repository).execute(
          world.value,
          raw.project,
        ),
      );
    });

  program
    .command("infrastructure:project:resume")
    .description("Retoma SAGA-04; --approve-all usa ports sintéticos")
    .requiredOption("--world <uuid>")
    .requiredOption("--project <uuid>")
    .requiredOption("--world-date <YYYY-MM-DD>")
    .option("--approve-all")
    .action(async (raw: Record<string, unknown>) => {
      const parsed = parseInfrastructureAction(raw);
      if (!parsed.ok) {
        exitCode = writeError(io, parsed.error);
        return;
      }
      if (raw.approveAll !== true) {
        exitCode = writeError(
          io,
          new DomainError(
            "PROJECT_EXTERNAL_EVIDENCE_REQUIRED",
            "O simulador exige --approve-all para ports sintéticos.",
          ),
        );
        return;
      }
      exitCode = writeResult(
        io,
        await new ResumeInfrastructureProject(
          repository,
          syntheticFinancingPort(),
          syntheticLicensingPort(),
          "simulator-infrastructure-worker",
        ).execute(
          parsed.value.world,
          parsed.value.project,
          parsed.value.worldDate,
        ),
      );
    });

  program
    .command("infrastructure:project:abort")
    .description("Compensa a parte reversível de SAGA-04")
    .requiredOption("--world <uuid>")
    .requiredOption("--project <uuid>")
    .requiredOption("--reason <text>")
    .option("--approve-all")
    .action(async (raw: Record<string, unknown>) => {
      const world = parseWorldOption(raw);
      const input = z
        .object({
          project: z.string().uuid(),
          reason: z.string().trim().min(1),
        })
        .safeParse(raw);
      if (!world.ok || !input.success) {
        exitCode = writeError(
          io,
          world.ok
            ? invalidArguments(input.error?.message ?? "payload inválido")
            : world.error,
        );
        return;
      }
      if (raw.approveAll !== true) {
        exitCode = writeError(
          io,
          new DomainError(
            "PROJECT_EXTERNAL_EVIDENCE_REQUIRED",
            "O simulador exige --approve-all para compensar C9 sinteticamente.",
          ),
        );
        return;
      }
      exitCode = writeResult(
        io,
        await new AbortInfrastructureProject(
          repository,
          syntheticFinancingPort(),
          "simulator-infrastructure-worker",
        ).execute(world.value, input.data.project, input.data.reason),
      );
    });

  program
    .command("club:maintenance:summary")
    .description("Resume condição e pendências de manutenção C3")
    .requiredOption("--world <uuid>")
    .action(async (raw: Record<string, unknown>) => {
      const world = parseWorldOption(raw);
      if (!world.ok) {
        exitCode = writeError(io, world.error);
        return;
      }
      const inspected = await new InspectClubPortfolio(repository).world(
        world.value,
      );
      if (!inspected.ok) {
        exitCode = writeError(io, inspected.error);
        return;
      }
      const conditions = inspected.value.clubs.flatMap((club) => [
        club.stadium.condition,
        ...club.departments.map(({ condition }) => condition),
      ]);
      io.stdout(
        `${JSON.stringify(
          {
            ok: true,
            data: {
              minimumCondition: Math.min(...conditions),
              maintenanceDueCount: inspected.value.clubs.reduce(
                (count, club) =>
                  count +
                  Number(club.stadium.maintenanceDueOn !== null) +
                  club.departments.filter(
                    ({ maintenanceDueOn }) => maintenanceDueOn !== null,
                  ).length,
                0,
              ),
              processedDayCount:
                inspected.value.processedMaintenanceDayKeys.length,
            },
          },
          null,
          2,
        )}\n`,
      );
      exitCode = 0;
    });

  addClubMutationOptions(
    program
      .command("club:squad:assign")
      .description("Atribui uma referência de jogador a um slot do elenco")
      .requiredOption("--squad <uuid>")
      .requiredOption("--player <uuid>")
      .requiredOption("--slot <slot>")
      .option("--category <category>", "SENIOR, RESERVE ou YOUTH", "SENIOR"),
  ).action(async (raw: Record<string, unknown>) => {
    exitCode = await runClubMutation(
      raw,
      io,
      repository,
      z.object({
        squad: z.string().uuid(),
        player: z.string().uuid(),
        slot: z.string().trim().min(1),
        category: z.enum(["SENIOR", "RESERVE", "YOUTH"]),
      }),
      (base, payload) => ({
        type: "AssignSquadSlot",
        ...base,
        squadId: payload.squad as never,
        playerId: payload.player as never,
        slot: payload.slot,
        category: payload.category,
      }),
    );
  });

  addClubMutationOptions(
    program
      .command("club:squad:remove")
      .description("Remove uma referência de jogador do elenco")
      .requiredOption("--squad <uuid>")
      .requiredOption("--player <uuid>"),
  ).action(async (raw: Record<string, unknown>) => {
    exitCode = await runClubMutation(
      raw,
      io,
      repository,
      z.object({ squad: z.string().uuid(), player: z.string().uuid() }),
      (base, payload) => ({
        type: "RemoveSquadMember",
        ...base,
        squadId: payload.squad as never,
        playerId: payload.player as never,
      }),
    );
  });

  addClubMutationOptions(
    program
      .command("club:department:plan")
      .description("Define o plano versionado de um departamento")
      .requiredOption("--kind <kind>")
      .requiredOption("--target-level <number>")
      .requiredOption("--capacity <number>"),
  ).action(async (raw: Record<string, unknown>) => {
    exitCode = await runClubMutation(
      raw,
      io,
      repository,
      z.object({
        kind: z.nativeEnum(ClubDepartmentKind),
        targetLevel: z.coerce.number().int().min(1).max(10),
        capacity: z.coerce.number().int().positive(),
      }),
      (base, payload) => ({ type: "SetDepartmentPlan", ...base, ...payload }),
    );
  });

  addClubMutationOptions(
    program
      .command("club:tickets:set")
      .description("Registra uma política histórica de preço de ingresso")
      .requiredOption("--price-minor <number>")
      .requiredOption("--effective-on <YYYY-MM-DD>"),
  ).action(async (raw: Record<string, unknown>) => {
    exitCode = await runClubMutation(
      raw,
      io,
      repository,
      z.object({
        priceMinor: z.coerce.number().int().positive(),
        effectiveOn: z.string(),
      }),
      (base, payload) => ({ type: "SetTicketPrices", ...base, ...payload }),
    );
  });

  addClubMutationOptions(
    program
      .command("club:commercial:sign")
      .description("Registra a referência de um acordo comercial")
      .requiredOption("--asset <asset>")
      .requiredOption("--starts-on <YYYY-MM-DD>")
      .requiredOption("--ends-on <YYYY-MM-DD>")
      .requiredOption("--agreement-ref <ref>")
      .option("--exclusive", "Direito exclusivo"),
  ).action(async (raw: Record<string, unknown>) => {
    exitCode = await runClubMutation(
      raw,
      io,
      repository,
      z.object({
        asset: z.string().trim().min(1),
        startsOn: z.string(),
        endsOn: z.string(),
        agreementRef: z.string().trim().min(1),
        exclusive: z.boolean().optional().default(false),
      }),
      (base, payload) => ({
        type: "SignCommercialDeal",
        ...base,
        asset: payload.asset,
        exclusive: payload.exclusive ?? false,
        startsOn: payload.startsOn,
        endsOn: payload.endsOn,
        externalAgreementRef: payload.agreementRef,
      }),
    );
  });

  addClubMutationOptions(
    program
      .command("club:board:record")
      .description("Registra decisão auditável da diretoria")
      .requiredOption("--decision-type <type>")
      .requiredOption("--justification <text>")
      .requiredOption("--effective-from <YYYY-MM-DD>")
      .option("--effective-through <YYYY-MM-DD>"),
  ).action(async (raw: Record<string, unknown>) => {
    exitCode = await runClubMutation(
      raw,
      io,
      repository,
      z.object({
        decisionType: z.string().trim().min(1),
        justification: z.string().trim().min(1),
        effectiveFrom: z.string(),
        effectiveThrough: z.string().optional(),
      }),
      (base, payload) => ({
        type: "RecordBoardDecision",
        ...base,
        decisionType: payload.decisionType,
        justification: payload.justification,
        effectiveFrom: payload.effectiveFrom,
        effectiveThrough: payload.effectiveThrough ?? null,
      }),
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
          {
            "players:process-day": createPlayerDayTaskHandler(repository),
            "clubs:process-day": createClubMaintenanceTaskHandler(repository),
          },
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

  program
    .command("season:rollover:start")
    .description("Inicia SAGA-02 para uma temporada FINALIZING")
    .requiredOption("--world <uuid>")
    .requiredOption("--rollover <id>")
    .requiredOption("--season <id>")
    .requiredOption("--next-season <id>")
    .requiredOption("--next-number <number>")
    .requiredOption("--next-name <name>")
    .requiredOption("--next-starts-on <YYYY-MM-DD>")
    .requiredOption("--next-ends-on <YYYY-MM-DD>")
    .option("--ruleset-version <version>", "Versão SemVer", "1.0.0")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      const input = z
        .object({
          rollover: z.string().min(1),
          season: z.string().min(1),
          nextSeason: z.string().min(1),
          nextNumber: z.coerce.number().int().positive(),
          nextName: z.string().min(1),
          nextStartsOn: z.string(),
          nextEndsOn: z.string(),
          rulesetVersion: z.string(),
        })
        .safeParse(raw);
      if (!input.success) {
        exitCode = writeError(io, invalidArguments(input.error.message));
        return;
      }
      const ruleset = parseRulesetVersion(input.data.rulesetVersion);
      const starts = WorldDate.parse(input.data.nextStartsOn);
      const ends = WorldDate.parse(input.data.nextEndsOn);
      if (!ruleset.ok) {
        exitCode = writeError(io, ruleset.error);
        return;
      }
      if (!starts.ok) {
        exitCode = writeError(io, starts.error);
        return;
      }
      if (!ends.ok) {
        exitCode = writeError(io, ends.error);
        return;
      }
      exitCode = writeResult(
        io,
        await new StartSeasonRollover(repository).execute(id.value, {
          id: input.data.rollover,
          gameWorldId: id.value,
          seasonId: input.data.season,
          nextSeason: {
            id: input.data.nextSeason,
            number: input.data.nextNumber,
            name: input.data.nextName,
            startsOn: starts.value.toString(),
            endsOn: ends.value.toString(),
          },
          rulesetVersion: ruleset.value,
          maxAttemptsPerStep: 3,
        }),
      );
    });

  program
    .command("season:rollover:inspect")
    .description("Exibe checkpoint e estado da SAGA-02")
    .requiredOption("--world <uuid>")
    .requiredOption("--rollover <id>")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      if (typeof raw.rollover !== "string") {
        exitCode = writeError(io, invalidArguments("rollover é obrigatório."));
        return;
      }
      exitCode = writeResult(
        io,
        await new InspectSeasonRollover(repository).execute(
          id.value,
          raw.rollover,
        ),
      );
    });

  program
    .command("season:rollover:resume")
    .description("Retoma SAGA-02; --approve-all é somente harness headless")
    .requiredOption("--world <uuid>")
    .requiredOption("--rollover <id>")
    .option("--approve-all", "Confirma handlers simulados e invariantes")
    .action(async (raw: Record<string, unknown>) => {
      const id = parseWorldOption(raw);
      if (!id.ok) {
        exitCode = writeError(io, id.error);
        return;
      }
      if (typeof raw.rollover !== "string") {
        exitCode = writeError(io, invalidArguments("rollover é obrigatório."));
        return;
      }
      if (raw.approveAll !== true) {
        exitCode = writeError(
          io,
          new DomainError(
            "ROLLOVER_EXTERNAL_EVIDENCE_REQUIRED",
            "O simulador exige --approve-all para usar handlers sintéticos.",
          ),
        );
        return;
      }
      const handlers = Object.fromEntries(
        SEASON_ROLLOVER_STEPS.map((stepId) => [
          stepId,
          () =>
            Promise.resolve({
              status: "COMPLETED" as const,
              evidence: { source: "simulator-approve-all" },
            }),
        ]),
      );
      exitCode = writeResult(
        io,
        await new ResumeSeasonRollover(
          repository,
          handlers,
          () =>
            Promise.resolve({
              standingsConsistent: true,
              ledgerBalanced: true,
              populationInBand: true,
              evidence: { source: "simulator-approve-all" },
            }),
          newEntityId<"SeasonRolloverExecutor">(),
        ).execute(id.value, raw.rollover),
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

function addClubMutationOptions(command: Command): Command {
  return command
    .requiredOption("--world <uuid>")
    .requiredOption("--club <uuid>")
    .requiredOption("--command-id <id>")
    .requiredOption("--idempotency-key <key>")
    .requiredOption("--expected-version <number>")
    .requiredOption("--occurred-at <YYYY-MM-DD>")
    .requiredOption("--actor <id>")
    .option("--ruleset-version <version>", "Versão SemVer", "1.0.0");
}

function parseInfrastructureAction(raw: Record<string, unknown>) {
  const world = parseWorldOption(raw);
  if (!world.ok) return world;
  const input = z
    .object({ project: z.string().uuid(), worldDate: z.string() })
    .safeParse(raw);
  if (!input.success) {
    return { ok: false, error: invalidArguments(input.error.message) } as const;
  }
  const worldDate = WorldDate.parse(input.data.worldDate);
  return worldDate.ok
    ? ({
        ok: true,
        value: {
          world: world.value,
          project: input.data.project,
          worldDate: worldDate.value.toString(),
        },
      } as const)
    : worldDate;
}

function syntheticFinancingPort(): InfrastructureFinancingPort {
  return {
    reserve: (context) =>
      Promise.resolve({
        reservationRef: `simulator:${context.idempotencyKey}:reservation`,
      }),
    disburseMilestone: (context) =>
      Promise.resolve({
        disbursementRef: `simulator:${context.idempotencyKey}:disbursement`,
      }),
    releaseRemainder: (context) =>
      Promise.resolve({
        releaseFactRef: `simulator:${context.idempotencyKey}:release`,
      }),
  };
}

function syntheticLicensingPort(): InfrastructureLicensingPort {
  return {
    inspect: (context) =>
      Promise.resolve({
        approved: true,
        inspectionRef: `simulator:${context.idempotencyKey}:license`,
      }),
  };
}

async function runClubMutation<TPayload>(
  raw: Record<string, unknown>,
  io: CliIo,
  repository: JsonWorldRepository,
  payloadSchema: z.ZodType<TPayload>,
  build: (base: ClubCommandBase, payload: TPayload) => ClubCommand,
): Promise<number> {
  const world = parseWorldOption(raw);
  if (!world.ok) return writeError(io, world.error);
  const base = z
    .object({
      club: z.string().uuid(),
      commandId: z.string().trim().min(1),
      idempotencyKey: z.string().trim().min(1),
      expectedVersion: z.coerce.number().int().positive(),
      occurredAt: z.string(),
      rulesetVersion: z.string(),
      actor: z.string().trim().min(1),
    })
    .safeParse(raw);
  const payload = payloadSchema.safeParse(raw);
  if (!base.success || !payload.success) {
    return writeError(
      io,
      invalidArguments(
        !base.success
          ? base.error.message
          : (payload.error?.message ?? "payload inválido"),
      ),
    );
  }
  const occurredAt = WorldDate.parse(base.data.occurredAt);
  const ruleset = parseRulesetVersion(base.data.rulesetVersion);
  if (!occurredAt.ok) return writeError(io, occurredAt.error);
  if (!ruleset.ok) return writeError(io, ruleset.error);
  const commandBase = {
    commandId: base.data.commandId,
    idempotencyKey: base.data.idempotencyKey,
    gameWorldId: world.value,
    clubId: base.data.club as ClubCommand["clubId"],
    expectedVersion: base.data.expectedVersion,
    occurredAt: occurredAt.value.toString(),
    rulesetVersion: ruleset.value,
    actorId: base.data.actor,
  };
  return writeResult(
    io,
    await new ExecuteClubCommand(repository).execute(
      build(commandBase, payload.data),
    ),
  );
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
    code === "WORLD_DATE_CONFLICT" ||
    code === "IDEMPOTENCY_KEY_CONFLICT" ||
    code === "TEMPORAL_WINDOW_CONFLICT" ||
    code === "ROLLOVER_LEASE_HELD" ||
    code === "ROLLOVER_NOT_FOUND" ||
    code === "ROLLOVER_EXTERNAL_EVIDENCE_REQUIRED" ||
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
