import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  WorldGenesisGenerator,
  WorldStatus,
  type GameWorldSnapshot,
} from "@grinta/core";
import { newGameWorldId, parseRulesetVersion } from "@grinta/shared";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { JsonWorldRepository } from "../src/json-world-repository.js";

const directories: string[] = [];
const envelopeSchema = z.object({ schemaVersion: z.literal(3) });

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function repository(): Promise<
  Readonly<{ directory: string; value: JsonWorldRepository }>
> {
  const directory = await mkdtemp(join(tmpdir(), "grinta-repository-"));
  directories.push(directory);
  return { directory, value: new JsonWorldRepository(directory) };
}

function snapshot(): GameWorldSnapshot {
  const parsedRuleset = parseRulesetVersion("1.0.0");
  if (!parsedRuleset.ok) throw parsedRuleset.error;

  return {
    id: newGameWorldId(),
    seed: "repository-seed",
    startDate: "2026-01-01",
    currentDate: "2026-01-01",
    rulesetVersion: parsedRuleset.value,
    status: WorldStatus.CREATING,
    worldSequence: 0,
    version: 1,
  };
}

describe("JsonWorldRepository", () => {
  it("faz round-trip em um envelope versionado", async () => {
    const store = await repository();
    const world = snapshot();

    await store.value.save(world, null);

    expect(await store.value.findById(world.id)).toEqual(world);
    const file = envelopeSchema.parse(
      JSON.parse(
        await readFile(join(store.directory, `${world.id}.json`), "utf8"),
      ) as unknown,
    );
    expect(file.schemaVersion).toBe(3);
  });

  it("persiste e recupera a gênese sem alterar o mundo", async () => {
    const store = await repository();
    const world = snapshot();
    const genesis = new WorldGenesisGenerator().generate(world);
    await store.value.save(world, null);

    await store.value.saveGenesis(genesis, world.version);

    expect(await store.value.findByWorldId(world.id)).toEqual(genesis);
    expect(await store.value.findById(world.id)).toEqual(world);
  });

  it("lê snapshots v1 e os migra na próxima escrita", async () => {
    const store = await repository();
    const world = snapshot();
    await writeFile(
      join(store.directory, `${world.id}.json`),
      JSON.stringify({ schemaVersion: 1, world }),
      "utf8",
    );

    expect(await store.value.findById(world.id)).toEqual(world);
    expect(await store.value.findByWorldId(world.id)).toBeNull();
    await store.value.save({ ...world, version: 2 }, 1);
    const migrated = envelopeSchema.parse(
      JSON.parse(
        await readFile(join(store.directory, `${world.id}.json`), "utf8"),
      ) as unknown,
    );
    expect(migrated.schemaVersion).toBe(3);
  });

  it("retorna null para mundo inexistente", async () => {
    const store = await repository();
    expect(await store.value.findById(newGameWorldId())).toBeNull();
  });

  it("rejeita conflito de versão otimista", async () => {
    const store = await repository();
    const world = snapshot();
    await store.value.save(world, null);

    await expect(
      store.value.save({ ...world, version: 2 }, 99),
    ).rejects.toMatchObject({
      code: "AGGREGATE_VERSION_CONFLICT",
    });
  });

  it("rejeita snapshot corrompido", async () => {
    const store = await repository();
    const world = snapshot();
    await writeFile(
      join(store.directory, `${world.id}.json`),
      "{invalid",
      "utf8",
    );

    await expect(store.value.findById(world.id)).rejects.toMatchObject({
      code: "SNAPSHOT_CORRUPTED",
    });
  });
});
