import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { runCli, type CliIo } from "../src/cli.js";

const directories: string[] = [];
const createdOutputSchema = z.object({
  data: z.object({ world: z.object({ id: z.string(), status: z.string() }) }),
});
const genesisOutputSchema = z.object({
  data: z.object({
    created: z.boolean(),
    summary: z.object({
      clubCount: z.number(),
      playerCount: z.number(),
      fixtureCount: z.number(),
    }),
  }),
});
const mutationOutputSchema = z.object({
  data: z.object({
    world: z.object({
      id: z.string(),
      status: z.string(),
      currentDate: z.string(),
    }),
    processedTasks: z
      .array(z.object({ type: z.string(), status: z.string() }))
      .optional(),
  }),
});
const schedulerOutputSchema = z.object({
  data: z.object({
    clock: z.object({ leaseOwnerId: z.string().nullable() }),
    seasons: z.array(
      z.object({ lifecycleState: z.string(), status: z.string() }),
    ),
    tasks: z.array(z.object({ status: z.string() })),
  }),
});
const playerSummaryOutputSchema = z.object({
  data: z.object({
    personCount: z.number(),
    playerCount: z.number(),
    generationEventCount: z.number(),
    developmentHistoryCount: z.number(),
    lastProcessedOn: z.string().nullable(),
  }),
});
const inspectedOutputSchema = z.object({ data: z.object({ id: z.string() }) });
const advanceReceiptSchema = z.object({
  data: z.object({
    idempotencyKey: z.string(),
    previousDate: z.string(),
    currentDate: z.string(),
    resultWorldVersion: z.number(),
  }),
});
const errorOutputSchema = z.object({ error: z.object({ code: z.string() }) });

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

function capture(): Readonly<{
  io: CliIo;
  stdout: string[];
  stderr: string[];
}> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
    },
  };
}

describe("simulator CLI", () => {
  it("executa criação, gênese, ativação e avanço do mundo", async () => {
    const directory = await mkdtemp(join(tmpdir(), "grinta-cli-"));
    directories.push(directory);
    const createdOutput = capture();

    const createdCode = await runCli(
      ["world:create", "--seed", "grinta-001", "--start-date", "2026-01-01"],
      { dataDirectory: directory, io: createdOutput.io },
    );
    const created = createdOutputSchema.parse(
      JSON.parse(createdOutput.stdout.join("")) as unknown,
    );
    const worldId = created.data.world.id;

    expect(createdCode).toBe(0);
    expect(created.data.world.status).toBe("CREATING");

    const inspectedOutput = capture();
    const inspectedCode = await runCli(["world:inspect", "--world", worldId], {
      dataDirectory: directory,
      io: inspectedOutput.io,
    });

    expect(inspectedCode).toBe(0);
    expect(
      inspectedOutputSchema.parse(
        JSON.parse(inspectedOutput.stdout.join("")) as unknown,
      ).data.id,
    ).toBe(worldId);

    const prematureActivation = capture();
    expect(
      await runCli(["world:activate", "--world", worldId], {
        dataDirectory: directory,
        io: prematureActivation.io,
      }),
    ).toBe(4);
    expect(
      errorOutputSchema.parse(
        JSON.parse(prematureActivation.stderr.join("")) as unknown,
      ).error.code,
    ).toBe("WORLD_GENESIS_NOT_FOUND");

    const genesisOutput = capture();
    expect(
      await runCli(["world:genesis", "--world", worldId], {
        dataDirectory: directory,
        io: genesisOutput.io,
      }),
    ).toBe(0);
    const genesis = genesisOutputSchema.parse(
      JSON.parse(genesisOutput.stdout.join("")) as unknown,
    );
    expect(genesis.data).toMatchObject({
      created: true,
      summary: { clubCount: 16, playerCount: 368, fixtureCount: 240 },
    });

    const repeatedGenesisOutput = capture();
    await runCli(["world:genesis", "--world", worldId], {
      dataDirectory: directory,
      io: repeatedGenesisOutput.io,
    });
    expect(
      genesisOutputSchema.parse(
        JSON.parse(repeatedGenesisOutput.stdout.join("")) as unknown,
      ).data.created,
    ).toBe(false);

    const activationOutput = capture();
    expect(
      await runCli(["world:activate", "--world", worldId], {
        dataDirectory: directory,
        io: activationOutput.io,
      }),
    ).toBe(0);
    expect(
      mutationOutputSchema.parse(
        JSON.parse(activationOutput.stdout.join("")) as unknown,
      ).data.world.status,
    ).toBe("ACTIVE");

    const clubPortfolioOutput = capture();
    expect(
      await runCli(["club:inspect", "--world", worldId], {
        dataDirectory: directory,
        io: clubPortfolioOutput.io,
      }),
    ).toBe(0);
    const clubPortfolio = JSON.parse(clubPortfolioOutput.stdout.join("")) as {
      data: {
        clubs: Array<{
          id: string;
          version: number;
          identity: { name: string };
        }>;
      };
    };
    expect(clubPortfolio.data.clubs).toHaveLength(16);
    const managedClub = clubPortfolio.data.clubs[0]!;
    const identityArguments = [
      "club:identity:update",
      "--world",
      worldId,
      "--club",
      managedClub.id,
      "--command-id",
      "club-command-001",
      "--idempotency-key",
      "club:identity:001",
      "--expected-version",
      String(managedClub.version),
      "--occurred-at",
      "2026-01-02",
      "--actor",
      "board:validation",
      "--name",
      "Clube Validado",
      "--short-code",
      "VAL",
    ];
    const identityOutput = capture();
    expect(
      await runCli(identityArguments, {
        dataDirectory: directory,
        io: identityOutput.io,
      }),
    ).toBe(0);
    const identityRetry = capture();
    expect(
      await runCli(identityArguments, {
        dataDirectory: directory,
        io: identityRetry.io,
      }),
    ).toBe(0);
    expect(JSON.parse(identityRetry.stdout.join(""))).toEqual(
      JSON.parse(identityOutput.stdout.join("")),
    );
    const managedClubOutput = capture();
    await runCli(
      ["club:inspect", "--world", worldId, "--club", managedClub.id],
      { dataDirectory: directory, io: managedClubOutput.io },
    );
    expect(
      (
        JSON.parse(managedClubOutput.stdout.join("")) as {
          data: { club: { identity: { name: string } } };
        }
      ).data.club.identity.name,
    ).toBe("Clube Validado");

    const advancedOutput = capture();
    const advancedCode = await runCli(
      ["day:simulate", "--world", worldId, "--days", "1"],
      { dataDirectory: directory, io: advancedOutput.io },
    );

    expect(advancedCode).toBe(0);
    expect(
      mutationOutputSchema.parse(
        JSON.parse(advancedOutput.stdout.join("")) as unknown,
      ).data.world.currentDate,
    ).toBe("2026-01-02");

    const startedSeasonOutput = capture();
    expect(
      await runCli(["day:simulate", "--world", worldId, "--days", "2"], {
        dataDirectory: directory,
        io: startedSeasonOutput.io,
      }),
    ).toBe(0);
    const startedSeason = mutationOutputSchema.parse(
      JSON.parse(startedSeasonOutput.stdout.join("")) as unknown,
    );
    expect(startedSeason.data.world.currentDate).toBe("2026-01-04");
    expect(startedSeason.data.processedTasks).toEqual([
      { type: "players:process-day", status: "COMPLETED" },
      { type: "season:check-start-end", status: "COMPLETED" },
      { type: "players:process-day", status: "COMPLETED" },
    ]);

    const schedulerOutput = capture();
    expect(
      await runCli(["scheduler:inspect", "--world", worldId], {
        dataDirectory: directory,
        io: schedulerOutput.io,
      }),
    ).toBe(0);
    const scheduler = schedulerOutputSchema.parse(
      JSON.parse(schedulerOutput.stdout.join("")) as unknown,
    );
    expect(scheduler.data.clock.leaseOwnerId).toBeNull();
    expect(scheduler.data.seasons[0]).toEqual({
      lifecycleState: "IN_PROGRESS",
      status: "ACTIVE",
    });
    expect(scheduler.data.tasks.map(({ status }) => status)).toEqual([
      "COMPLETED",
      "PENDING",
      "PENDING",
    ]);

    const windowOutput = capture();
    expect(
      await runCli(
        [
          "world:window:register",
          "--world",
          worldId,
          "--type",
          "TRANSFER",
          "--name",
          "Janela principal",
          "--opens-on",
          "2026-01-04",
          "--closes-on",
          "2026-01-10",
        ],
        { dataDirectory: directory, io: windowOutput.io },
      ),
    ).toBe(0);
    const listedWindows = capture();
    expect(
      await runCli(
        ["world:windows", "--world", worldId, "--on", "2026-01-04"],
        { dataDirectory: directory, io: listedWindows.io },
      ),
    ).toBe(0);
    expect(
      (JSON.parse(listedWindows.stdout.join("")) as { data: unknown[] }).data,
    ).toHaveLength(1);

    const advanceArguments = [
      "day:advance",
      "--world",
      worldId,
      "--command-id",
      "cli-command-001",
      "--idempotency-key",
      "advance:2026-01-04",
      "--expected-date",
      "2026-01-04",
      "--expected-version",
      "6",
    ];
    const idempotentAdvance = capture();
    expect(
      await runCli(advanceArguments, {
        dataDirectory: directory,
        io: idempotentAdvance.io,
      }),
    ).toBe(0);
    const firstReceipt = advanceReceiptSchema.parse(
      JSON.parse(idempotentAdvance.stdout.join("")) as unknown,
    );
    const repeatedAdvance = capture();
    expect(
      await runCli(advanceArguments, {
        dataDirectory: directory,
        io: repeatedAdvance.io,
      }),
    ).toBe(0);
    expect(
      advanceReceiptSchema.parse(
        JSON.parse(repeatedAdvance.stdout.join("")) as unknown,
      ),
    ).toEqual(firstReceipt);
    expect(firstReceipt.data.currentDate).toBe("2026-01-05");

    const playerSummaryOutput = capture();
    expect(
      await runCli(["players:summary", "--world", worldId], {
        dataDirectory: directory,
        io: playerSummaryOutput.io,
      }),
    ).toBe(0);
    expect(
      playerSummaryOutputSchema.parse(
        JSON.parse(playerSummaryOutput.stdout.join("")) as unknown,
      ).data,
    ).toEqual({
      personCount: 368,
      playerCount: 368,
      generationEventCount: 368,
      developmentHistoryCount: 0,
      lastProcessedOn: "2026-01-05",
    });
  });

  it("rejeita data inválida com código de entrada", async () => {
    const output = capture();
    const code = await runCli(
      ["world:create", "--seed", "grinta-001", "--start-date", "2026-02-30"],
      { dataDirectory: "/tmp/grinta-unused", io: output.io },
    );

    expect(code).toBe(2);
    expect(
      errorOutputSchema.parse(JSON.parse(output.stderr.join("")) as unknown)
        .error.code,
    ).toBe("INVALID_WORLD_DATE");
  });

  it("inicia automaticamente, inspeciona e retoma SAGA-02", async () => {
    const directory = await mkdtemp(join(tmpdir(), "grinta-rollover-cli-"));
    directories.push(directory);
    const createdOutput = capture();
    await runCli(
      ["world:create", "--seed", "rollover-cli", "--start-date", "2026-01-01"],
      { dataDirectory: directory, io: createdOutput.io },
    );
    const worldId = createdOutputSchema.parse(
      JSON.parse(createdOutput.stdout.join("")) as unknown,
    ).data.world.id;
    await runCli(["world:genesis", "--world", worldId], {
      dataDirectory: directory,
      io: capture().io,
    });
    await runCli(["world:activate", "--world", worldId], {
      dataDirectory: directory,
      io: capture().io,
    });
    const advanced = capture();
    expect(
      await runCli(["day:simulate", "--world", worldId, "--days", "90"], {
        dataDirectory: directory,
        io: advanced.io,
      }),
    ).toBe(0);

    const schedulerOutput = capture();
    await runCli(["scheduler:inspect", "--world", worldId], {
      dataDirectory: directory,
      io: schedulerOutput.io,
    });
    const scheduler = JSON.parse(schedulerOutput.stdout.join("")) as {
      data: { rollovers: { id: string; status: string }[]; seasons: unknown[] };
    };
    expect(scheduler.data.rollovers).toHaveLength(1);
    expect(scheduler.data.rollovers[0]?.status).toBe("REQUESTED");
    const rolloverId = scheduler.data.rollovers[0]!.id;

    const inspected = capture();
    expect(
      await runCli(
        [
          "season:rollover:inspect",
          "--world",
          worldId,
          "--rollover",
          rolloverId,
        ],
        { dataDirectory: directory, io: inspected.io },
      ),
    ).toBe(0);
    const resumed = capture();
    expect(
      await runCli(
        [
          "season:rollover:resume",
          "--world",
          worldId,
          "--rollover",
          rolloverId,
          "--approve-all",
        ],
        { dataDirectory: directory, io: resumed.io },
      ),
    ).toBe(0);
    expect(
      JSON.parse(resumed.stdout.join("")) as {
        data: { rollover: { status: string }; events: unknown[] };
      },
    ).toMatchObject({
      data: { rollover: { status: "COMPLETED" } },
    });

    const finalSchedulerOutput = capture();
    await runCli(["scheduler:inspect", "--world", worldId], {
      dataDirectory: directory,
      io: finalSchedulerOutput.io,
    });
    const finalScheduler = JSON.parse(finalSchedulerOutput.stdout.join("")) as {
      data: { seasons: { status: string }[] };
    };
    expect(finalScheduler.data.seasons.map(({ status }) => status)).toEqual([
      "ARCHIVED",
      "PLANNED",
    ]);
  }, 20_000);
});
