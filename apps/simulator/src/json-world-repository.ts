import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  WorldStatus,
  type GameWorldSnapshot,
  type WorldRepository,
} from "@grinta/core";
import {
  DomainError,
  parseGameWorldId,
  parseRulesetVersion,
  type GameWorldId,
} from "@grinta/shared";
import { z } from "zod";

const persistedSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  world: z.object({
    id: z.string(),
    seed: z.string().min(1),
    startDate: z.string(),
    currentDate: z.string(),
    rulesetVersion: z.string(),
    status: z.enum([
      WorldStatus.CREATING,
      WorldStatus.ACTIVE,
      WorldStatus.PAUSED,
      WorldStatus.FINISHED,
      WorldStatus.ARCHIVED,
    ]),
    worldSequence: z.number().int().nonnegative(),
    version: z.number().int().positive(),
  }),
});

export class JsonWorldRepository implements WorldRepository {
  public constructor(private readonly baseDirectory: string) {}

  public async findById(id: GameWorldId): Promise<GameWorldSnapshot | null> {
    const filePath = this.pathFor(id);
    let contents: string;

    try {
      contents = await readFile(filePath, "utf8");
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === "ENOENT") return null;
      throw error;
    }

    try {
      const persisted = persistedSnapshotSchema.parse(JSON.parse(contents));
      const parsedId = parseGameWorldId(persisted.world.id);
      if (!parsedId.ok) throw parsedId.error;

      const parsedRuleset = parseRulesetVersion(persisted.world.rulesetVersion);
      if (!parsedRuleset.ok) throw parsedRuleset.error;

      return {
        ...persisted.world,
        id: parsedId.value,
        rulesetVersion: parsedRuleset.value,
      };
    } catch (error: unknown) {
      throw new DomainError(
        "SNAPSHOT_CORRUPTED",
        "O snapshot local do mundo é inválido.",
        {
          filePath,
          cause: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  public async save(
    snapshot: GameWorldSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });

    const current = await this.findById(snapshot.id);
    if (expectedVersion === null && current !== null) {
      throw new DomainError(
        "WORLD_ALREADY_EXISTS",
        "Já existe um mundo com este identificador.",
        {
          id: snapshot.id,
        },
      );
    }

    if (expectedVersion !== null && current?.version !== expectedVersion) {
      throw new DomainError(
        "AGGREGATE_VERSION_CONFLICT",
        "O snapshot foi alterado desde a última leitura.",
        { expectedVersion, actualVersion: current?.version ?? null },
      );
    }

    const destination = this.pathFor(snapshot.id);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    const contents = `${JSON.stringify({ schemaVersion: 1, world: snapshot }, null, 2)}\n`;
    await writeFile(temporary, contents, { encoding: "utf8", flag: "wx" });
    await rename(temporary, destination);
  }

  private pathFor(id: GameWorldId): string {
    return join(this.baseDirectory, `${id}.json`);
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
