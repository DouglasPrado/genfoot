import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  DominantFoot,
  PlayerPosition,
  WorldStatus,
  type GameWorldSnapshot,
  type WorldGenesisRepository,
  type WorldGenesisSnapshot,
  type WorldRepository,
} from "@grinta/core";
import {
  DomainError,
  parseGameWorldId,
  parseRulesetVersion,
  type GameWorldId,
} from "@grinta/shared";
import { z } from "zod";

const worldSchema = z.object({
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
});

const identifierSchema = z.string().uuid();
const playerPositionSchema = z.enum([
  PlayerPosition.GK,
  PlayerPosition.CB,
  PlayerPosition.LB,
  PlayerPosition.RB,
  PlayerPosition.CDM,
  PlayerPosition.CM,
  PlayerPosition.CAM,
  PlayerPosition.LW,
  PlayerPosition.RW,
  PlayerPosition.ST,
  PlayerPosition.CF,
]);

const genesisSchema = z.object({
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  sourceWorldVersion: z.number().int().positive(),
  clubs: z.array(
    z.object({
      id: identifierSchema,
      name: z.string().min(1),
      shortCode: z.string().min(1),
    }),
  ),
  persons: z.array(
    z.object({
      id: identifierSchema,
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      birthDate: z.string(),
      primaryNationality: z.literal("BR"),
    }),
  ),
  players: z.array(
    z.object({
      id: identifierSchema,
      personId: identifierSchema,
      clubId: identifierSchema,
      primaryPosition: playerPositionSchema,
      secondaryPosition: playerPositionSchema.optional(),
      dominantFoot: z.enum([
        DominantFoot.LEFT,
        DominantFoot.RIGHT,
        DominantFoot.BOTH,
      ]),
      attributes: z.object({
        technical: z.number().int().min(0).max(100),
        physical: z.number().int().min(0).max(100),
        mental: z.number().int().min(0).max(100),
        goalkeeping: z.number().int().min(0).max(100),
      }),
      potentialAbility: z.number().int().min(0).max(100),
      generationSource: z.literal("INITIAL_WORLD"),
    }),
  ),
  squads: z.array(
    z.object({
      id: identifierSchema,
      clubId: identifierSchema,
      playerIds: z.array(identifierSchema),
    }),
  ),
  competition: z.object({
    id: identifierSchema,
    name: z.literal("Liga Inicial"),
    seasonNumber: z.literal(1),
    rounds: z.literal(30),
    clubIds: z.array(identifierSchema),
  }),
  fixtures: z.array(
    z.object({
      id: identifierSchema,
      competitionId: identifierSchema,
      round: z.number().int().min(1).max(30),
      leg: z.union([z.literal(1), z.literal(2)]),
      homeClubId: identifierSchema,
      awayClubId: identifierSchema,
      scheduledWorldDate: z.string(),
    }),
  ),
});

const persistedSnapshotSchema = z.union([
  z.object({ schemaVersion: z.literal(1), world: worldSchema }),
  z.object({
    schemaVersion: z.literal(2),
    world: worldSchema,
    genesis: genesisSchema.nullable(),
  }),
]);

interface LoadedEnvelope {
  readonly world: GameWorldSnapshot;
  readonly genesis: WorldGenesisSnapshot | null;
}

export class JsonWorldRepository
  implements WorldRepository, WorldGenesisRepository
{
  public constructor(private readonly baseDirectory: string) {}

  public async findById(id: GameWorldId): Promise<GameWorldSnapshot | null> {
    return (await this.load(id))?.world ?? null;
  }

  public async findByWorldId(
    id: GameWorldId,
  ): Promise<WorldGenesisSnapshot | null> {
    return (await this.load(id))?.genesis ?? null;
  }

  public async save(
    snapshot: GameWorldSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });

    const current = await this.load(snapshot.id);
    if (expectedVersion === null && current !== null) {
      throw new DomainError(
        "WORLD_ALREADY_EXISTS",
        "Já existe um mundo com este identificador.",
        { id: snapshot.id },
      );
    }
    if (
      expectedVersion !== null &&
      current?.world.version !== expectedVersion
    ) {
      throw versionConflict(expectedVersion, current?.world.version);
    }

    await this.write(snapshot.id, {
      world: snapshot,
      genesis: current?.genesis ?? null,
    });
  }

  public async saveGenesis(
    genesis: WorldGenesisSnapshot,
    expectedWorldVersion: number,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    const current = await this.load(genesis.gameWorldId);
    if (current === null) {
      throw new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.", {
        gameWorldId: genesis.gameWorldId,
      });
    }
    if (current.world.version !== expectedWorldVersion) {
      throw versionConflict(expectedWorldVersion, current.world.version);
    }
    if (current.genesis !== null) {
      throw new DomainError(
        "WORLD_GENESIS_ALREADY_EXISTS",
        "A gênese deste mundo já foi persistida.",
        { gameWorldId: genesis.gameWorldId },
      );
    }

    await this.write(genesis.gameWorldId, { world: current.world, genesis });
  }

  private async load(id: GameWorldId): Promise<LoadedEnvelope | null> {
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

      const world: GameWorldSnapshot = {
        ...persisted.world,
        id: parsedId.value,
        rulesetVersion: parsedRuleset.value,
      };
      const genesis =
        persisted.schemaVersion === 2 && persisted.genesis !== null
          ? (persisted.genesis as unknown as WorldGenesisSnapshot)
          : null;
      return { world, genesis };
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

  private async write(
    id: GameWorldId,
    envelope: LoadedEnvelope,
  ): Promise<void> {
    const destination = this.pathFor(id);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    const contents = `${JSON.stringify(
      { schemaVersion: 2, world: envelope.world, genesis: envelope.genesis },
      null,
      2,
    )}\n`;
    await writeFile(temporary, contents, { encoding: "utf8", flag: "wx" });
    await rename(temporary, destination);
  }

  private pathFor(id: GameWorldId): string {
    return join(this.baseDirectory, `${id}.json`);
  }
}

function versionConflict(
  expectedVersion: number,
  actualVersion: number | undefined,
): DomainError {
  return new DomainError(
    "AGGREGATE_VERSION_CONFLICT",
    "O snapshot foi alterado desde a última leitura.",
    { expectedVersion, actualVersion: actualVersion ?? null },
  );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
