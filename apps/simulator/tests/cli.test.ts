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
  it("cria, inspeciona e bloqueia o avanço de um mundo ainda em CREATING", async () => {
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

    const advancedOutput = capture();
    const advancedCode = await runCli(
      ["day:simulate", "--world", worldId, "--days", "1"],
      { dataDirectory: directory, io: advancedOutput.io },
    );

    expect(advancedCode).toBe(4);
    expect(
      errorOutputSchema.parse(
        JSON.parse(advancedOutput.stderr.join("")) as unknown,
      ).error.code,
    ).toBe("WORLD_NOT_ACTIVE");
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
