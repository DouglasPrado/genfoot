import { randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

import {
  DominantFoot,
  INFRASTRUCTURE_PROJECT_STEPS,
  InfrastructureMilestoneStatus,
  InfrastructureProjectStatus,
  InfrastructureProjectStepStatus,
  SEASON_ROLLOVER_STEPS,
  PlayerPosition,
  PlayerAvailability,
  PlayerCareerStatus,
  PlayerGenerationSource,
  MedicalCaseSeverity,
  MedicalCaseStatus,
  ScheduledTaskStatus,
  SeasonRolloverPhase,
  SeasonRolloverStatus,
  SeasonRolloverStepStatus,
  SeasonLifecycleState,
  SeasonStatus,
  WorldStatus,
  type GameWorldSnapshot,
  type ClubCommandReceipt,
  type ClubPortfolioRepository,
  type WorldGenesisRepository,
  type WorldGenesisSnapshot,
  type WorldRepository,
  type SchedulingRepository,
  type PlayerLifecycleRepository,
  type WorldPlayerLifecycleSnapshot,
  type LedgerRepository,
  type WorldLedgerSnapshot,
  type WorldSchedulerSnapshot,
  type WorldCommandReceipt,
  type WorldClubPortfolioSnapshot,
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

const rolloverVerificationSchema = z.object({
  standingsConsistent: z.boolean(),
  ledgerBalanced: z.boolean(),
  populationInBand: z.boolean(),
  evidence: z.record(z.unknown()).optional(),
});

const seasonRolloverSchema = z.object({
  id: z.string().min(1),
  gameWorldId: identifierSchema,
  seasonId: z.string().min(1),
  nextSeason: z.object({
    id: z.string().min(1),
    number: z.number().int().positive(),
    name: z.string().min(1),
    startsOn: z.string(),
    endsOn: z.string(),
  }),
  rulesetVersion: z.string(),
  status: z.nativeEnum(SeasonRolloverStatus),
  phase: z.nativeEnum(SeasonRolloverPhase),
  currentStepIndex: z.number().int().min(0).max(20),
  steps: z.array(
    z.object({
      stepId: z.enum(SEASON_ROLLOVER_STEPS),
      status: z.nativeEnum(SeasonRolloverStepStatus),
      attempts: z.number().int().nonnegative(),
      fencingToken: z.number().int().positive().nullable(),
      lastError: z.string().nullable(),
      evidence: z.record(z.unknown()).nullable(),
      completedAt: z.string().nullable(),
    }),
  ),
  maxAttemptsPerStep: z.number().int().positive(),
  leaseOwnerId: z.string().nullable(),
  leaseExpiresAtMs: z.number().int().nonnegative().nullable(),
  fencingToken: z.number().int().nonnegative(),
  verification: rolloverVerificationSchema.nullable(),
  revision: z.number().int().positive(),
});

const schedulerSchema = z.object({
  schemaVersion: z.literal(2).optional().default(2),
  gameWorldId: identifierSchema,
  config: z.object({
    rulesetVersion: z.string(),
    maxTaskAttempts: z.number().int().positive(),
    clockLeaseDurationMs: z.number().int().positive(),
  }),
  seasons: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      number: z.number().int().positive(),
      name: z.string().min(1),
      startsOn: z.string(),
      endsOn: z.string(),
      lifecycleState: z.enum([
        SeasonLifecycleState.PLANNING,
        SeasonLifecycleState.REGISTRATION,
        SeasonLifecycleState.IN_PROGRESS,
        SeasonLifecycleState.FINALIZING,
        SeasonLifecycleState.OFF_SEASON,
        SeasonLifecycleState.COMPLETED,
      ]),
      status: z.enum([
        SeasonStatus.PLANNED,
        SeasonStatus.ACTIVE,
        SeasonStatus.FINISHED,
        SeasonStatus.ARCHIVED,
      ]),
      version: z.number().int().positive(),
    }),
  ),
  tasks: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      type: z.string().min(1),
      dueOn: z.string(),
      priority: z.number().int(),
      payload: z.record(z.unknown()),
      idempotencyKey: z.string().min(1),
      recurrence: z
        .object({
          everyDays: z.number().int().positive(),
          untilOn: z.string(),
        })
        .nullable()
        .optional(),
      status: z.enum([
        ScheduledTaskStatus.PENDING,
        ScheduledTaskStatus.RUNNING,
        ScheduledTaskStatus.COMPLETED,
        ScheduledTaskStatus.FAILED,
        ScheduledTaskStatus.CANCELLED,
      ]),
      attempts: z.number().int().nonnegative(),
      maxAttempts: z.number().int().positive(),
      fencingToken: z.number().int().positive().nullable(),
      lastError: z.string().nullable(),
      completedOn: z.string().nullable(),
      version: z.number().int().positive(),
    }),
  ),
  windows: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        type: z.enum(["TRANSFER", "REGISTRATION", "RENEWAL", "CUSTOM"]),
        name: z.string().min(1),
        opensOn: z.string(),
        closesOn: z.string(),
        rulesetVersion: z.string(),
        configVersion: z.number().int().positive(),
        version: z.number().int().positive(),
      }),
    )
    .optional()
    .default([]),
  commandReceipts: z
    .array(
      z.object({
        commandId: z.string().min(1),
        idempotencyKey: z.string().min(1),
        commandType: z.literal("AdvanceWorldDay"),
        gameWorldId: identifierSchema,
        expectedDate: z.string(),
        resultDate: z.string(),
        resultWorldVersion: z.number().int().positive(),
        fencingToken: z.number().int().positive(),
        rulesetVersion: z.string(),
        processedTaskIds: z.array(z.string()),
      }),
    )
    .optional()
    .default([]),
  rollovers: z.array(seasonRolloverSchema).optional().default([]),
  clock: z.object({
    leaseOwnerId: z.string().nullable(),
    leaseExpiresAtMs: z.number().int().nonnegative().nullable(),
    fencingToken: z.number().int().nonnegative(),
  }),
  runtimeEpoch: z.number().int().nonnegative(),
  revision: z.number().int().positive(),
});

const scoreSchema = z.number().int().min(0).max(100);
const playerLifecycleSchema = z.object({
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  persons: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      birthDate: z.string(),
      nationality: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
  players: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      personId: identifierSchema,
      primaryPosition: playerPositionSchema,
      secondaryPosition: playerPositionSchema.optional(),
      dominantFoot: z.enum([
        DominantFoot.LEFT,
        DominantFoot.RIGHT,
        DominantFoot.BOTH,
      ]),
      careerStatus: z.enum([
        PlayerCareerStatus.ACTIVE,
        PlayerCareerStatus.FREE_AGENT,
        PlayerCareerStatus.RETIRED,
      ]),
      availability: z.enum([
        PlayerAvailability.AVAILABLE,
        PlayerAvailability.INJURED,
        PlayerAvailability.SUSPENDED,
        PlayerAvailability.CONVENED,
        PlayerAvailability.UNAVAILABLE,
      ]),
      generationSource: z.enum([
        PlayerGenerationSource.INITIAL_WORLD,
        PlayerGenerationSource.SCOUT_FOUND,
        PlayerGenerationSource.YOUTH_ACADEMY,
        PlayerGenerationSource.REGEN_AFTER_RETIREMENT,
        PlayerGenerationSource.MARKET_BALANCE,
      ]),
      generatedAtSeasonNumber: z.number().int().positive(),
      attributes: z.object({
        technical: scoreSchema,
        physical: scoreSchema,
        mental: scoreSchema,
        goalkeeping: scoreSchema,
      }),
      currentAbility: scoreSchema,
      potentialAbility: scoreSchema,
      dynamicState: z.object({
        morale: scoreSchema,
        confidence: scoreSchema,
        happiness: scoreSchema,
        fatigue: scoreSchema,
        matchSharpness: scoreSchema,
      }),
      lastProcessedOn: z.string(),
      version: z.number().int().positive(),
    }),
  ),
  generationEvents: z.array(
    z.object({
      id: identifierSchema,
      type: z.literal("PlayerGenerated"),
      gameWorldId: identifierSchema,
      playerId: identifierSchema,
      personId: identifierSchema,
      source: z.enum([
        PlayerGenerationSource.INITIAL_WORLD,
        PlayerGenerationSource.SCOUT_FOUND,
        PlayerGenerationSource.YOUTH_ACADEMY,
        PlayerGenerationSource.REGEN_AFTER_RETIREMENT,
        PlayerGenerationSource.MARKET_BALANCE,
      ]),
      seasonNumber: z.number().int().positive(),
      worldDate: z.string(),
      rulesetVersion: z.string(),
      idempotencyKey: z.string().min(1),
    }),
  ),
  developmentHistory: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      playerId: identifierSchema,
      attributeCode: z.enum(["technical", "physical", "mental", "goalkeeping"]),
      previousValue: scoreSchema,
      nextValue: scoreSchema,
      cause: z.string().min(1),
      worldDate: z.string(),
      rulesetVersion: z.string(),
    }),
  ),
  processedDayKeys: z.array(z.string().min(1)),
  revision: z.number().int().positive(),
  medicalCases: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        playerId: identifierSchema,
        diagnosis: z.string().min(1),
        severity: z.enum([
          MedicalCaseSeverity.MINOR,
          MedicalCaseSeverity.MODERATE,
          MedicalCaseSeverity.SEVERE,
        ]),
        status: z.enum([
          MedicalCaseStatus.OPEN,
          MedicalCaseStatus.RECOVERING,
          MedicalCaseStatus.CLEARED,
        ]),
        openedOn: z.string(),
        expectedReturnOn: z.string(),
        clearedOn: z.string().nullable(),
        rulesetVersion: z.string(),
        idempotencyKey: z.string().min(1),
        lastReassessmentKey: z.string().min(1).optional(),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  lifecycleEvents: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          id: identifierSchema,
          type: z.literal("PlayerInjured"),
          gameWorldId: identifierSchema,
          playerId: identifierSchema,
          medicalCaseId: identifierSchema,
          severity: z.enum([
            MedicalCaseSeverity.MINOR,
            MedicalCaseSeverity.MODERATE,
            MedicalCaseSeverity.SEVERE,
          ]),
          diagnosis: z.string().min(1),
          worldDate: z.string(),
          expectedReturnOn: z.string(),
          rulesetVersion: z.string(),
          idempotencyKey: z.string().min(1),
        }),
        z.object({
          id: identifierSchema,
          type: z.literal("PlayerCleared"),
          gameWorldId: identifierSchema,
          playerId: identifierSchema,
          medicalCaseId: identifierSchema,
          worldDate: z.string(),
          rulesetVersion: z.string(),
          idempotencyKey: z.string().min(1),
        }),
        z.object({
          id: identifierSchema,
          type: z.literal("PlayerRetired"),
          gameWorldId: identifierSchema,
          playerId: identifierSchema,
          reason: z.string().min(1),
          worldDate: z.string(),
          rulesetVersion: z.string(),
          idempotencyKey: z.string().min(1),
        }),
      ]),
    )
    .optional(),
});

const infrastructureProjectSchema = z.object({
  id: identifierSchema,
  gameWorldId: identifierSchema,
  clubId: identifierSchema,
  rulesetVersion: z.string(),
  commandId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  actorId: z.string().min(1),
  proposedAt: z.string(),
  status: z.nativeEnum(InfrastructureProjectStatus),
  target: z.object({
    kind: z.enum(["STADIUM_CAPACITY", "DEPARTMENT_LEVEL"]),
    reference: z.string().min(1),
    targetValue: z.number().int().positive(),
  }),
  fundingRequestRef: z.string().min(1),
  financingEvidence: z.record(z.unknown()).nullable(),
  milestones: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      dueOn: z.string(),
      amountMinor: z.number().int().positive(),
      status: z.nativeEnum(InfrastructureMilestoneStatus),
      disbursementFactRef: z.string().nullable(),
      completedAt: z.string().nullable(),
    }),
  ),
  inspection: z
    .object({ approved: z.boolean(), inspectionRef: z.string().nullable() })
    .nullable(),
  currentStepIndex: z.number().int().min(0).max(5),
  steps: z.array(
    z.object({
      stepId: z.enum(INFRASTRUCTURE_PROJECT_STEPS),
      status: z.nativeEnum(InfrastructureProjectStepStatus),
      attempts: z.number().int().nonnegative(),
      fencingToken: z.number().int().positive().nullable(),
      lastError: z.string().nullable(),
      evidence: z.record(z.unknown()).nullable(),
      completedAt: z.string().nullable(),
    }),
  ),
  maxAttemptsPerStep: z.number().int().positive(),
  leaseOwnerId: z.string().nullable(),
  leaseExpiresAtMs: z.number().int().nonnegative().nullable(),
  fencingToken: z.number().int().nonnegative(),
  compensationEvidence: z.record(z.unknown()).nullable(),
  version: z.number().int().positive(),
});

const clubPortfolioSchema = z.object({
  schemaVersion: z.literal(1),
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  clubs: z.array(
    z
      .object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        identity: z.object({
          id: identifierSchema,
          name: z.string().min(1),
          shortCode: z.string().min(2),
          effectiveFrom: z.string(),
          effectiveThrough: z.string().nullable(),
          rulesetVersion: z.string(),
        }),
        identityHistory: z.array(z.record(z.unknown())),
        departments: z.array(z.record(z.unknown())),
        stadium: z.record(z.unknown()),
        ticketPolicies: z.array(z.record(z.unknown())),
        commercialAgreements: z.array(z.record(z.unknown())),
        boardDecisions: z.array(z.record(z.unknown())),
        version: z.number().int().positive(),
      })
      .passthrough(),
  ),
  squads: z.array(
    z
      .object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        clubId: identifierSchema,
        capacity: z.number().int().positive(),
        memberships: z.array(z.record(z.unknown())),
        version: z.number().int().positive(),
      })
      .passthrough(),
  ),
  projects: z.array(infrastructureProjectSchema),
  commandReceipts: z.array(z.record(z.unknown())),
  events: z.array(z.record(z.unknown())),
  processedMaintenanceDayKeys: z.array(z.string()),
  revision: z.number().int().positive(),
});

const ledgerAccountSchema = z.object({
  id: identifierSchema,
  gameWorldId: identifierSchema,
  name: z.string().min(1),
  type: z.enum([
    "ASSET",
    "LIABILITY",
    "EQUITY",
    "REVENUE",
    "EXPENSE",
    "FAUCET",
    "SINK",
  ]),
  currency: z.string().min(1),
  normalBalance: z.enum(["DEBIT", "CREDIT"]),
  balanceMinor: z.number().int(),
  idempotencyKey: z.string().min(1),
  version: z.number().int().positive(),
});

const worldLedgerSchema = z.object({
  gameWorldId: identifierSchema,
  baseCurrency: z.string().min(1),
  rulesetVersion: z.string(),
  accounts: z.array(ledgerAccountSchema),
  transactions: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      transactionClass: z.string().min(1),
      currency: z.string().min(1),
      occurredOn: z.string(),
      entries: z.array(
        z.object({
          accountId: identifierSchema,
          direction: z.enum(["DEBIT", "CREDIT"]),
          amountMinor: z.number().int().positive(),
          sequence: z.number().int().positive(),
        }),
      ),
      idempotencyKey: z.string().min(1),
    }),
  ),
  reservations: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      accountId: identifierSchema,
      purpose: z.string(),
      amountMinor: z.number().int().positive(),
      status: z.enum(["ACTIVE", "SETTLED", "RELEASED", "EXPIRED"]),
      expiresOn: z.string(),
      idempotencyKey: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
  debts: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        creditorRef: z.string().min(1),
        debtorRef: z.string().min(1),
        currency: z.string().min(1),
        principalMinor: z.number().int().positive(),
        outstandingMinor: z.number().int(),
        scheduleMonths: z.number().int().positive(),
        interestRateBps: z.number().int(),
        status: z.enum(["ACTIVE", "SETTLED", "DEFAULTED"]),
        accruedOn: z.string(),
        idempotencyKey: z.string().min(1),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  accountingPeriods: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        label: z.string().min(1),
        opensOn: z.string(),
        closesOn: z.string(),
        status: z.enum(["OPEN", "CLOSED"]),
        closingResidualMinor: z.number().int(),
        closingSupplyMinor: z.number().int(),
        idempotencyKey: z.string().min(1),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  events: z.array(z.record(z.unknown())),
  revision: z.number().int().positive(),
});

const persistedSnapshotSchema = z.union([
  z.object({ schemaVersion: z.literal(1), world: worldSchema }),
  z.object({
    schemaVersion: z.literal(2),
    world: worldSchema,
    genesis: genesisSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(3),
    world: worldSchema,
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(4),
    world: worldSchema,
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(5),
    world: worldSchema,
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(6),
    world: worldSchema,
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(7),
    world: worldSchema,
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
  }),
]);

interface LoadedEnvelope {
  readonly world: GameWorldSnapshot;
  readonly genesis: WorldGenesisSnapshot | null;
  readonly scheduler: WorldSchedulerSnapshot | null;
  readonly playerLifecycle: WorldPlayerLifecycleSnapshot | null;
  readonly clubPortfolio: WorldClubPortfolioSnapshot | null;
  readonly ledger: WorldLedgerSnapshot | null;
}

export class JsonWorldRepository
  implements
    WorldRepository,
    WorldGenesisRepository,
    SchedulingRepository,
    PlayerLifecycleRepository,
    ClubPortfolioRepository,
    LedgerRepository
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
      scheduler: current?.scheduler ?? null,
      playerLifecycle: current?.playerLifecycle ?? null,
      clubPortfolio: current?.clubPortfolio ?? null,
      ledger: current?.ledger ?? null,
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

    await this.write(genesis.gameWorldId, {
      world: current.world,
      genesis,
      scheduler: current.scheduler,
      playerLifecycle: current.playerLifecycle,
      clubPortfolio: current.clubPortfolio,
      ledger: current.ledger,
    });
  }

  public async findSchedulingByWorldId(
    id: GameWorldId,
  ): Promise<WorldSchedulerSnapshot | null> {
    return (await this.load(id))?.scheduler ?? null;
  }

  public async findSchedulingCommandReceipt(
    id: GameWorldId,
    idempotencyKey: string,
  ): Promise<WorldCommandReceipt | null> {
    return (
      (await this.load(id))?.scheduler?.commandReceipts.find(
        (receipt) => receipt.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  public async saveScheduling(
    scheduler: WorldSchedulerSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withSchedulingLock(scheduler.gameWorldId, async () => {
      const current = await this.load(scheduler.gameWorldId);
      if (current === null) {
        throw new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.", {
          gameWorldId: scheduler.gameWorldId,
        });
      }
      if (expectedRevision === null && current.scheduler !== null) {
        throw new DomainError(
          "SCHEDULER_ALREADY_EXISTS",
          "O scheduler deste mundo já existe.",
        );
      }
      if (
        expectedRevision !== null &&
        current.scheduler?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "SCHEDULER_REVISION_CONFLICT",
          "O scheduler foi alterado desde a última leitura.",
          {
            expectedRevision,
            actualRevision: current.scheduler?.revision ?? null,
          },
        );
      }
      await this.write(scheduler.gameWorldId, { ...current, scheduler });
    });
  }

  public async findPlayerLifecycleByWorldId(
    id: GameWorldId,
  ): Promise<WorldPlayerLifecycleSnapshot | null> {
    return (await this.load(id))?.playerLifecycle ?? null;
  }

  public async savePlayerLifecycle(
    playerLifecycle: WorldPlayerLifecycleSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withSchedulingLock(playerLifecycle.gameWorldId, async () => {
      const current = await this.load(playerLifecycle.gameWorldId);
      if (current === null) {
        throw new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.");
      }
      if (expectedRevision === null && current.playerLifecycle !== null) {
        throw new DomainError(
          "PLAYER_LIFECYCLE_ALREADY_EXISTS",
          "O lifecycle de jogadores já existe.",
        );
      }
      if (
        expectedRevision !== null &&
        current.playerLifecycle?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "PLAYER_LIFECYCLE_REVISION_CONFLICT",
          "O lifecycle foi alterado desde a última leitura.",
          {
            expectedRevision,
            actualRevision: current.playerLifecycle?.revision ?? null,
          },
        );
      }
      await this.write(playerLifecycle.gameWorldId, {
        ...current,
        playerLifecycle,
      });
    });
  }

  public async findClubPortfolioByWorldId(
    id: GameWorldId,
  ): Promise<WorldClubPortfolioSnapshot | null> {
    return (await this.load(id))?.clubPortfolio ?? null;
  }

  public async findClubCommandReceipt(
    id: GameWorldId,
    idempotencyKey: string,
  ): Promise<ClubCommandReceipt | null> {
    return (
      (await this.load(id))?.clubPortfolio?.commandReceipts.find(
        (receipt) => receipt.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  public async saveClubPortfolio(
    clubPortfolio: WorldClubPortfolioSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withNamedLock(clubPortfolio.gameWorldId, "clubs", async () => {
      const current = await this.load(clubPortfolio.gameWorldId);
      if (current === null) {
        throw new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.");
      }
      if (expectedRevision === null && current.clubPortfolio !== null) {
        throw new DomainError(
          "CLUB_PORTFOLIO_ALREADY_EXISTS",
          "O portfólio de clubes já existe.",
        );
      }
      if (
        expectedRevision !== null &&
        current.clubPortfolio?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "CLUB_PORTFOLIO_REVISION_CONFLICT",
          "O portfólio de clubes foi alterado.",
          {
            expectedRevision,
            actualRevision: current.clubPortfolio?.revision ?? null,
          },
        );
      }
      await this.write(clubPortfolio.gameWorldId, {
        ...current,
        clubPortfolio,
      });
    });
  }

  public async findLedgerByWorldId(
    id: GameWorldId,
  ): Promise<WorldLedgerSnapshot | null> {
    return (await this.load(id))?.ledger ?? null;
  }

  public async saveLedger(
    ledger: WorldLedgerSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withNamedLock(ledger.gameWorldId, "ledger", async () => {
      const current = await this.load(ledger.gameWorldId);
      if (current === null) {
        throw new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.");
      }
      if (expectedRevision === null && current.ledger !== null) {
        throw new DomainError("LEDGER_ALREADY_EXISTS", "O ledger já existe.");
      }
      if (
        expectedRevision !== null &&
        current.ledger?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "LEDGER_REVISION_CONFLICT",
          "O ledger foi alterado desde a última leitura.",
          {
            expectedRevision,
            actualRevision: current.ledger?.revision ?? null,
          },
        );
      }
      await this.write(ledger.gameWorldId, { ...current, ledger });
    });
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
        (persisted.schemaVersion === 2 ||
          persisted.schemaVersion === 3 ||
          persisted.schemaVersion === 4 ||
          persisted.schemaVersion === 5 ||
          persisted.schemaVersion === 6 ||
          persisted.schemaVersion === 7) &&
        persisted.genesis !== null
          ? (persisted.genesis as unknown as WorldGenesisSnapshot)
          : null;
      const scheduler =
        (persisted.schemaVersion === 3 ||
          persisted.schemaVersion === 4 ||
          persisted.schemaVersion === 5 ||
          persisted.schemaVersion === 6 ||
          persisted.schemaVersion === 7) &&
        persisted.scheduler !== null
          ? (persisted.scheduler as unknown as WorldSchedulerSnapshot)
          : null;
      const playerLifecycle =
        (persisted.schemaVersion === 4 ||
          persisted.schemaVersion === 5 ||
          persisted.schemaVersion === 6 ||
          persisted.schemaVersion === 7) &&
        persisted.playerLifecycle !== null
          ? (persisted.playerLifecycle as unknown as WorldPlayerLifecycleSnapshot)
          : null;
      const clubPortfolio =
        (persisted.schemaVersion === 6 || persisted.schemaVersion === 7) &&
        persisted.clubPortfolio !== null
          ? (persisted.clubPortfolio as unknown as WorldClubPortfolioSnapshot)
          : null;
      const ledger =
        persisted.schemaVersion === 7 && persisted.ledger !== null
          ? (persisted.ledger as unknown as WorldLedgerSnapshot)
          : null;
      return {
        world,
        genesis,
        scheduler,
        playerLifecycle,
        clubPortfolio,
        ledger,
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

  private async write(
    id: GameWorldId,
    envelope: LoadedEnvelope,
  ): Promise<void> {
    const destination = this.pathFor(id);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    const contents = `${JSON.stringify(
      {
        schemaVersion: 7,
        world: envelope.world,
        genesis: envelope.genesis,
        scheduler: envelope.scheduler,
        playerLifecycle: envelope.playerLifecycle,
        clubPortfolio: envelope.clubPortfolio,
        ledger: envelope.ledger,
      },
      null,
      2,
    )}\n`;
    await writeFile(temporary, contents, { encoding: "utf8", flag: "wx" });
    await rename(temporary, destination);
  }

  private pathFor(id: GameWorldId): string {
    return join(this.baseDirectory, `${id}.json`);
  }

  private async withSchedulingLock<T>(
    id: GameWorldId,
    action: () => Promise<T>,
  ): Promise<T> {
    return this.withNamedLock(id, "scheduler", action);
  }

  private async withNamedLock<T>(
    id: GameWorldId,
    name: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const lockPath = join(this.baseDirectory, `${id}.${name}.lock`);
    let handle;
    try {
      handle = await open(lockPath, "wx");
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === "EEXIST") {
        const lockStat = await stat(lockPath).catch(() => null);
        if (lockStat !== null && Date.now() - lockStat.mtimeMs > 60_000) {
          await unlink(lockPath).catch(() => undefined);
          handle = await open(lockPath, "wx");
        } else {
          throw new DomainError(
            "WORLD_SECTION_WRITE_LOCKED",
            "Outra réplica está atualizando esta seção do mundo.",
            { id },
          );
        }
      } else throw error;
    }
    try {
      return await action();
    } finally {
      await handle.close();
      await unlink(lockPath).catch(() => undefined);
    }
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
