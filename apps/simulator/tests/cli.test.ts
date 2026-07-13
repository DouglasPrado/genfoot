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
      lastProcessedOn: "2026-01-04",
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
});
