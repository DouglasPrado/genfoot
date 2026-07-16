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
  type ClubCommandReceipt,
  type ClubPortfolioRepository,
  type WorldGenesisRepository,
  type WorldGenesisSnapshot,
  type SchedulingRepository,
  type PlayerLifecycleRepository,
  type WorldPlayerLifecycleSnapshot,
  type LedgerRepository,
  type WorldLedgerSnapshot,
  type CompetitionRepository,
  type WorldCompetitionsSnapshot,
  type MatchRepository,
  type WorldMatchesSnapshot,
  type EventingRepository,
  type WorldEventingSnapshot,
  type MarketRepository,
  type WorldMarketSnapshot,
  type AdminRepository,
  type WorldAdminSnapshot,
  type NarrativeRepository,
  type WorldNarrativeSnapshot,
  type InboxRepository,
  type WorldInboxSnapshot,
  type StaffRepository,
  type WorldStaffSnapshot,
  type AutomationRepository,
  type WorldAutomationSnapshot,
  type WorldSchedulerSnapshot,
  type WorldCommandReceipt,
  type WorldClubPortfolioSnapshot,
} from "@grinta/core";
import {
  DomainError,
  type GameWorldId,
} from "@grinta/shared";
import { z } from "zod";

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
      trainingFocus: z
        .enum(["technical", "physical", "mental", "goalkeeping"])
        .optional(),
      youthProspect: z.boolean().optional(),
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
        z.object({
          id: identifierSchema,
          type: z.literal("PlayerDeveloped"),
          gameWorldId: identifierSchema,
          playerId: identifierSchema,
          attributeCode: z.enum([
            "technical",
            "physical",
            "mental",
            "goalkeeping",
          ]),
          previousValue: scoreSchema,
          nextValue: scoreSchema,
          worldDate: z.string(),
          rulesetVersion: z.string(),
          idempotencyKey: z.string().min(1),
        }),
        z.object({
          id: identifierSchema,
          type: z.literal("YouthPromoted"),
          gameWorldId: identifierSchema,
          playerId: identifierSchema,
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
          visualIdentity: z
            .object({
              primaryColor: z.string(),
              secondaryColor: z.string(),
              tertiaryColor: z.string().nullable(),
              homeKitTemplateId: z.string(),
              awayKitTemplateId: z.string(),
              crestTemplateId: z.string(),
            })
            .optional(),
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

const worldCompetitionsSchema = z.object({
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  editions: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      seasonRef: identifierSchema,
      name: z.string().min(1),
      formatVersion: z.string().min(1),
      status: z.enum(["REGISTRATION", "SCHEDULED", "HOMOLOGATED"]),
      maxParticipants: z.number().int().positive(),
      startOn: z.string(),
      roundIntervalDays: z.number().int().positive(),
      idempotencyKey: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
  participants: z.array(
    z.object({
      editionId: identifierSchema,
      clubId: identifierSchema,
      seedNumber: z.number().int().positive(),
      registeredOn: z.string(),
      idempotencyKey: z.string().min(1),
    }),
  ),
  fixtures: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      editionId: identifierSchema,
      phase: z.string().min(1),
      round: z.number().int().positive(),
      homeClubId: identifierSchema,
      awayClubId: identifierSchema,
      kickoffOn: z.string(),
      status: z.enum(["SCHEDULED", "FINAL"]),
      homeGoals: z.number().int().nullable(),
      awayGoals: z.number().int().nullable(),
      resultRef: z.string().min(1).optional(),
    }),
  ),
  standings: z
    .array(
      z.object({
        editionId: identifierSchema,
        clubId: identifierSchema,
        played: z.number().int(),
        won: z.number().int(),
        drawn: z.number().int(),
        lost: z.number().int(),
        goalsFor: z.number().int(),
        goalsAgainst: z.number().int(),
        points: z.number().int(),
        disciplinaryPoints: z.number().int(),
        provisionalRank: z.number().int().positive(),
      }),
    )
    .optional(),
  homologations: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        editionId: identifierSchema,
        inputHash: z.string().min(1),
        decidedBy: z.string().min(1),
        decidedOn: z.string(),
        finalRanking: z.array(identifierSchema),
        idempotencyKey: z.string().min(1),
      }),
    )
    .optional(),
  events: z.array(z.record(z.unknown())),
  revision: z.number().int().positive(),
});

const worldMatchesSchema = z.object({
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  matches: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      fixtureRef: identifierSchema,
      homeClubId: identifierSchema,
      awayClubId: identifierSchema,
      kickoffOn: z.string(),
      status: z.enum(["CREATED", "IN_PROGRESS", "FINAL"]),
      manifest: z.object({
        seed: z.string().min(1),
        engineBuild: z.string().min(1),
        timestepChances: z.number().int().positive(),
        homeStrength: z.number().int().min(0).max(100),
        awayStrength: z.number().int().min(0).max(100),
        inputHash: z.string().min(1),
      }),
      result: z
        .object({
          homeGoals: z.number().int().nonnegative(),
          awayGoals: z.number().int().nonnegative(),
          homeShots: z.number().int().nonnegative(),
          awayShots: z.number().int().nonnegative(),
          homePossession: z.number().int(),
          resultHash: z.string().min(1),
          statsHash: z.string().min(1),
          finalizedOn: z.string(),
        })
        .nullable(),
      runtime: z
        .object({
          currentTick: z.number().int().nonnegative(),
          totalTicks: z.number().int().positive(),
          homeGoals: z.number().int().nonnegative(),
          awayGoals: z.number().int().nonnegative(),
          homeShots: z.number().int().nonnegative(),
          awayShots: z.number().int().nonnegative(),
          rngCursor: z.number().int().nonnegative(),
          nextSequence: z.number().int().positive(),
        })
        .optional(),
      commandLog: z
        .array(
          z.object({
            matchSequence: z.number().int().positive(),
            tick: z.number().int().nonnegative(),
            actor: z.string().min(1),
            commandType: z.string().min(1),
            side: z.enum(["HOME", "AWAY"]),
            delta: z.number().int(),
            payloadHash: z.string().min(1),
            accepted: z.literal(true),
            commandId: z.string().min(1),
            idempotencyKey: z.string().min(1),
          }),
        )
        .optional(),
      checkpoints: z
        .array(
          z.object({
            tick: z.number().int().nonnegative(),
            stateHash: z.string().min(1),
            rngCursor: z.number().int().nonnegative(),
            commandSequence: z.number().int().nonnegative(),
            idempotencyKey: z.string().min(1),
          }),
        )
        .optional(),
      rulesetVersion: z.string(),
      idempotencyKey: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
  events: z.array(z.record(z.unknown())),
  revision: z.number().int().positive(),
});

const worldEventingSchema = z.object({
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  maxAttempts: z.number().int().positive(),
  outbox: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      stream: z.string().min(1),
      sequence: z.number().int().positive(),
      eventType: z.string().min(1),
      payloadHash: z.string().min(1),
      occurredOn: z.string(),
      batchKey: z.string().min(1),
    }),
  ),
  inbox: z.array(
    z.object({
      consumerId: z.string().min(1),
      messageId: identifierSchema,
      status: z.enum(["CONSUMED", "FAILED", "DEAD_LETTERED"]),
      attempts: z.number().int().nonnegative(),
      lastOn: z.string(),
    }),
  ),
  registry: z
    .array(
      z.object({
        eventType: z.string().min(1),
        version: z.number().int().positive(),
        owner: z.string().min(1),
        schemaHash: z.string().min(1),
        compatibility: z.enum(["ADDITIVE", "BREAKING"]),
      }),
    )
    .optional(),
  sagas: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        sagaType: z.string().min(1),
        correlationKey: z.string().min(1),
        status: z.enum(["RUNNING", "COMPLETED", "COMPENSATING", "COMPENSATED"]),
        currentStep: z.number().int().nonnegative(),
        steps: z.array(
          z.object({
            index: z.number().int().nonnegative(),
            name: z.string().min(1),
            status: z.enum(["PENDING", "DONE", "COMPENSATED"]),
            attempts: z.number().int().nonnegative(),
            checkpointHash: z.string().min(1).nullable(),
            completedOn: z.string().nullable(),
          }),
        ),
        leaseOwnerId: z.string().min(1).nullable(),
        leaseExpiresAtMs: z.number().int().nonnegative().nullable(),
        fencingToken: z.number().int().nonnegative(),
        idempotencyKey: z.string().min(1),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  projections: z
    .array(
      z.object({
        projectionId: z.string().min(1),
        gameWorldId: identifierSchema,
        stream: z.string().min(1),
        cursor: z.number().int().nonnegative(),
        schemaVersion: z.number().int().positive(),
        stateHash: z.string().min(1),
        updatedOn: z.string(),
      }),
    )
    .optional(),
  cursors: z
    .array(
      z.object({
        audience: z.string().min(1),
        stream: z.string().min(1),
        lastSequence: z.number().int().nonnegative(),
        resumeToken: z.string().min(1),
        expiresOn: z.string(),
      }),
    )
    .optional(),
  events: z.array(z.record(z.unknown())),
  revision: z.number().int().positive(),
});

const offerTermsSchema = z.object({
  feeMinor: z.number().int().nonnegative(),
  wageMinor: z.number().int().nonnegative(),
  contractYears: z.number().int().positive(),
});

const playerContractSchema = z.object({
  id: identifierSchema,
  gameWorldId: identifierSchema,
  personId: identifierSchema,
  playerId: identifierSchema,
  clubId: identifierSchema,
  feeMinor: z.number().int().nonnegative(),
  wageMinor: z.number().int().nonnegative(),
  startsOn: z.string(),
  endsOn: z.string(),
  kind: z.enum(["PERMANENT", "LOAN"]),
  status: z.enum(["PENDING", "ACTIVE", "TERMINATED"]),
  idempotencyKey: z.string().min(1),
  version: z.number().int().positive(),
});

const worldMarketSchema = z.object({
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  scoutingReports: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      playerId: identifierSchema,
      observerClubId: identifierSchema,
      observations: z.array(z.string()),
      confidence: z.number().int(),
      validUntil: z.string(),
      idempotencyKey: z.string().min(1),
    }),
  ),
  negotiations: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      playerId: identifierSchema,
      buyerClubId: identifierSchema,
      sellerClubId: identifierSchema,
      status: z.enum([
        "OPEN",
        "OFFERED",
        "COUNTERED",
        "ACCEPTED",
        "CANCELLED",
        "EXPIRED",
      ]),
      currentVersion: z.number().int().nonnegative(),
      offers: z.array(
        z.object({
          version: z.number().int().positive(),
          createdByClubId: identifierSchema,
          terms: offerTermsSchema,
          expiresOn: z.string(),
        }),
      ),
      idempotencyKey: z.string().min(1),
    }),
  ),
  contracts: z.array(playerContractSchema),
  links: z.array(
    z.object({
      playerId: identifierSchema,
      clubId: identifierSchema,
      kind: z.enum(["PERMANENT", "LOAN"]),
      contractId: identifierSchema,
      effectiveStart: z.string(),
      effectiveEnd: z.string(),
      status: z.enum(["ACTIVE", "ENDED"]),
    }),
  ),
  listings: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        playerId: identifierSchema,
        sellerClubId: identifierSchema,
        askingFeeMinor: z.number().int().nonnegative(),
        status: z.enum(["ACTIVE", "WITHDRAWN", "MATCHED"]),
        idempotencyKey: z.string().min(1),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  transfers: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        negotiationId: identifierSchema,
        sagaId: z.string().min(1),
        playerId: identifierSchema,
        personId: identifierSchema,
        fromClubId: identifierSchema,
        toClubId: identifierSchema,
        feeMinor: z.number().int().nonnegative(),
        wageMinor: z.number().int().nonnegative(),
        startsOn: z.string(),
        endsOn: z.string(),
        status: z.enum([
          "DRAFT",
          "RUNNING",
          "COMPLETED",
          "COMPENSATING",
          "COMPENSATED",
          "FAILED",
        ]),
        currentStep: z.number().int().nonnegative(),
        steps: z.array(
          z.object({
            index: z.number().int().nonnegative(),
            name: z.string().min(1),
            status: z.enum(["PENDING", "DONE", "COMPENSATED"]),
            checkpointHash: z.string().min(1).nullable(),
          }),
        ),
        fencingToken: z.number().int().nonnegative(),
        contractId: identifierSchema.nullable(),
        processedStepKeys: z.array(z.string()),
        idempotencyKey: z.string().min(1),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  loans: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        playerId: identifierSchema,
        personId: identifierSchema,
        originClubId: identifierSchema,
        destinationClubId: identifierSchema,
        startsOn: z.string(),
        endsOn: z.string(),
        optionFeeMinor: z.number().int().nonnegative().nullable(),
        status: z.enum([
          "AGREED",
          "ACTIVE",
          "RETURNED",
          "PURCHASED",
          "TERMINATED",
        ]),
        contractId: identifierSchema,
        idempotencyKey: z.string().min(1),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  events: z.array(z.record(z.unknown())),
  revision: z.number().int().positive(),
});

const worldAdminSchema = z.object({
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  policyVersion: z.string().min(1),
  riskThreshold: z.number().int(),
  severeThreshold: z.number().int(),
  signals: z.array(
    z.object({
      dedupKey: z.string().min(1),
      subject: z.string().min(1),
      kind: z.string(),
      weight: z.number().int(),
      source: z.string(),
      observedOn: z.string(),
    }),
  ),
  assessments: z.array(
    z.object({
      subject: z.string().min(1),
      policyVersion: z.string().min(1),
      score: z.number().int(),
      factors: z.array(z.string()),
      flagged: z.boolean(),
    }),
  ),
  sanctions: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      subject: z.string().min(1),
      sanctionType: z.string(),
      severity: z.number().int(),
      basis: z.string(),
      evidenceRefs: z.array(z.string()),
      proposedBy: z.string().min(1),
      approvedBy: z.string().nullable(),
      status: z.enum(["PROPOSED", "ACTIVE", "REVERSED", "EXPIRED"]),
      appealStatus: z.enum(["NONE", "FILED", "UPHELD", "REJECTED"]),
      idempotencyKey: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
  cases: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        subjects: z.array(z.string()),
        severity: z.number().int(),
        status: z.enum(["OPEN", "INVESTIGATING", "DECIDED", "CLOSED"]),
        evidenceRefs: z.array(z.string()),
        openedBy: z.string().min(1),
        openedOn: z.string(),
        idempotencyKey: z.string().min(1),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  quarantines: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        caseId: identifierSchema.nullable(),
        scope: z.string().min(1),
        reason: z.string(),
        status: z.enum(["ACTIVE", "LIFTED", "EXPIRED"]),
        startsOn: z.string(),
        expiresOn: z.string(),
        placedBy: z.string().min(1),
        idempotencyKey: z.string().min(1),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  corrections: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        targetOwner: z.string().min(1),
        targetId: z.string().min(1),
        targetVersion: z.number().int().positive(),
        reasonCode: z.string().min(1),
        expectedEffect: z.string(),
        requestedBy: z.string().min(1),
        approvedBy: z.string().nullable(),
        status: z.enum([
          "REQUESTED",
          "APPROVED",
          "EXECUTED",
          "REJECTED",
          "FAILED",
        ]),
        compensatingFactRef: z.string().nullable(),
        idempotencyKey: z.string().min(1),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  supportCases: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        requester: z.string().min(1),
        category: z.string().min(1),
        status: z.enum(["OPEN", "RESOLVED"]),
        resolution: z.string().nullable(),
        idempotencyKey: z.string().min(1),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  reprocessings: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        stream: z.string().min(1),
        fromSequence: z.number().int().positive(),
        toSequence: z.number().int().positive(),
        reason: z.string(),
        status: z.enum(["REQUESTED", "COMPLETED"]),
        idempotencyKey: z.string().min(1),
        version: z.number().int().positive(),
      }),
    )
    .optional(),
  auditChain: z.array(
    z.object({
      sequence: z.number().int().positive(),
      actor: z.string(),
      action: z.string(),
      target: z.string(),
      prevHash: z.string().min(1),
      eventHash: z.string().min(1),
    }),
  ),
  events: z.array(z.record(z.unknown())),
  revision: z.number().int().positive(),
});

const worldNarrativeSchema = z.object({
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  fanbases: z.array(
    z.object({
      clubId: identifierSchema,
      segments: z.array(
        z.object({
          segment: z.enum(["ULTRAS", "FAMILY", "CASUAL"]),
          satisfaction: z.number().int().min(0).max(100),
          reactivity: z.number().int(),
        }),
      ),
      overall: z.number().int().min(0).max(100),
      fanbaseSize: z.number().int().nonnegative().optional(),
    }),
  ),
  reputation: z.array(
    z.object({
      clubId: identifierSchema,
      score: z.number().int().min(0).max(100),
    }),
  ),
  promises: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      clubId: identifierSchema,
      metric: z.string().min(1),
      targetValue: z.number(),
      deadline: z.string(),
      status: z.enum(["ACTIVE", "FULFILLED", "BROKEN", "CANCELLED"]),
      idempotencyKey: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
  crises: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      clubId: identifierSchema,
      cause: z.string().min(1),
      severity: z.number().int(),
      status: z.enum(["OPEN", "RECOVERY", "RESOLVED"]),
      recoveryPlan: z.string().nullable(),
      idempotencyKey: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
  conversations: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        clubId: identifierSchema,
        context: z.string().min(1),
        options: z.array(z.string()),
        choice: z.string(),
        reputationEffect: z.number().int(),
        idempotencyKey: z.string().min(1),
      }),
    )
    .optional(),
  mediaStories: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        clubId: identifierSchema,
        factRefs: z.array(z.string()),
        frame: z.string(),
        status: z.enum(["DRAFT", "PUBLISHED"]),
        visibility: z.string(),
        idempotencyKey: z.string().min(1),
      }),
    )
    .optional(),
  rivalries: z
    .array(
      z.object({
        clubA: identifierSchema,
        clubB: identifierSchema,
        intensity: z.number().int(),
      }),
    )
    .optional(),
  appliedFactIds: z.array(z.string()),
  events: z.array(z.record(z.unknown())),
  revision: z.number().int().positive(),
});

const worldInboxSchema = z.object({
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  notifications: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      recipientScope: z.string().min(1),
      category: z.string(),
      priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]),
      sourceRef: z.string(),
      dedupKey: z.string().min(1),
      createdOn: z.string(),
      deadline: z.string().nullable(),
      status: z.enum(["OPEN", "READ", "DISMISSED", "EXPIRED"]),
      version: z.number().int().positive(),
    }),
  ),
  timeline: z.array(
    z.object({
      subject: z.string().min(1),
      occurredOn: z.string(),
      factRef: z.string().min(1),
      sequence: z.number().int().positive(),
    }),
  ),
  records: z.array(
    z.object({
      category: z.string(),
      holder: z.string(),
      value: z.number(),
      achievedOn: z.string(),
      factRef: z.string(),
      idempotencyKey: z.string().min(1),
    }),
  ),
  reports: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      definitionId: z.string().min(1),
      version: z.string().min(1),
      asOf: z.string(),
      sourceVersions: z.array(z.string()),
      reportHash: z.string().min(1),
      idempotencyKey: z.string().min(1),
    }),
  ),
  deliveries: z
    .array(
      z.object({
        id: identifierSchema,
        gameWorldId: identifierSchema,
        notificationId: identifierSchema,
        channel: z.string().min(1),
        attempt: z.number().int().positive(),
        status: z.enum(["PENDING", "DELIVERED", "RETRYING", "FAILED"]),
        providerRef: z.string().nullable(),
        idempotencyKey: z.string().min(1),
      }),
    )
    .optional(),
  projections: z
    .array(
      z.object({
        projectionId: z.string().min(1),
        gameWorldId: identifierSchema,
        stream: z.string().min(1),
        cursor: z.number().int().nonnegative(),
        stateHash: z.string().min(1),
        status: z.enum(["REBUILDING", "VERIFIED", "ACTIVE", "FAILED"]),
        updatedOn: z.string(),
      }),
    )
    .optional(),
  events: z.array(z.record(z.unknown())),
  revision: z.number().int().positive(),
});

const staffRoleSchema = z.enum([
  "HEAD_COACH",
  "ASSISTANT_COACH",
  "FITNESS_COACH",
  "GOALKEEPING_COACH",
  "PHYSIO",
  "SCOUT",
  "DIRECTOR_OF_FOOTBALL",
]);

const worldStaffSchema = z.object({
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  members: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      role: staffRoleSchema,
      capabilities: z.object({
        coaching: z.number().int(),
        fitness: z.number().int(),
        medical: z.number().int(),
        scouting: z.number().int(),
        management: z.number().int(),
      }),
      reputation: z.number().int(),
      availability: z.enum(["AVAILABLE", "ASSIGNED", "UNAVAILABLE"]),
      idempotencyKey: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
  contracts: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      staffId: identifierSchema,
      clubId: identifierSchema,
      role: staffRoleSchema,
      status: z.enum(["OFFERED", "ACTIVE", "ENDED"]),
      startOn: z.string(),
      endOn: z.string(),
      compensationRef: z.string(),
      idempotencyKey: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
  assignments: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      contractId: identifierSchema,
      staffId: identifierSchema,
      departmentRef: identifierSchema,
      workload: z.number().int(),
      startOn: z.string(),
      endOn: z.string().nullable(),
      idempotencyKey: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
  events: z.array(z.record(z.unknown())),
  revision: z.number().int().positive(),
});

const worldAutomationSchema = z.object({
  gameWorldId: identifierSchema,
  rulesetVersion: z.string(),
  rules: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      controllerId: identifierSchema,
      scope: z.string().min(1),
      trigger: z.string(),
      action: z.string(),
      risk: z.number().int(),
      priority: z.number().int(),
      status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "REVOKED", "EXPIRED"]),
      validFrom: z.string(),
      validUntil: z.string(),
      idempotencyKey: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
  proposals: z.array(
    z.object({
      id: identifierSchema,
      gameWorldId: identifierSchema,
      ruleId: identifierSchema,
      asOf: z.string(),
      seedStream: z.string(),
      chosenCommand: z.string(),
      chosenScore: z.number(),
      factors: z.array(z.string()),
      alternatives: z.array(
        z.object({ commandDraft: z.string(), score: z.number() }),
      ),
      idempotencyKey: z.string().min(1),
    }),
  ),
  executions: z.array(
    z.object({
      ruleId: identifierSchema,
      decisionId: identifierSchema,
      commandDraft: z.string(),
      status: z.enum(["SUBMITTED", "REJECTED"]),
      idempotencyKey: z.string().min(1),
    }),
  ),
  events: z.array(z.record(z.unknown())),
  revision: z.number().int().positive(),
});

const persistedSnapshotSchema = z.discriminatedUnion("schemaVersion", [
  z.object({ schemaVersion: z.literal(1) }),
  z.object({
    schemaVersion: z.literal(2),
    genesis: genesisSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(3),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(4),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(5),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(6),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(7),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(8),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
    competitions: worldCompetitionsSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(9),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
    competitions: worldCompetitionsSchema.nullable(),
    matches: worldMatchesSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(10),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
    competitions: worldCompetitionsSchema.nullable(),
    matches: worldMatchesSchema.nullable(),
    eventing: worldEventingSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(11),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
    competitions: worldCompetitionsSchema.nullable(),
    matches: worldMatchesSchema.nullable(),
    eventing: worldEventingSchema.nullable(),
    market: worldMarketSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(12),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
    competitions: worldCompetitionsSchema.nullable(),
    matches: worldMatchesSchema.nullable(),
    eventing: worldEventingSchema.nullable(),
    market: worldMarketSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(13),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
    competitions: worldCompetitionsSchema.nullable(),
    matches: worldMatchesSchema.nullable(),
    eventing: worldEventingSchema.nullable(),
    market: worldMarketSchema.nullable(),
    admin: worldAdminSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(14),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
    competitions: worldCompetitionsSchema.nullable(),
    matches: worldMatchesSchema.nullable(),
    eventing: worldEventingSchema.nullable(),
    market: worldMarketSchema.nullable(),
    admin: worldAdminSchema.nullable(),
    narrative: worldNarrativeSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(15),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
    competitions: worldCompetitionsSchema.nullable(),
    matches: worldMatchesSchema.nullable(),
    eventing: worldEventingSchema.nullable(),
    market: worldMarketSchema.nullable(),
    admin: worldAdminSchema.nullable(),
    narrative: worldNarrativeSchema.nullable(),
    inbox: worldInboxSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(16),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
    competitions: worldCompetitionsSchema.nullable(),
    matches: worldMatchesSchema.nullable(),
    eventing: worldEventingSchema.nullable(),
    market: worldMarketSchema.nullable(),
    admin: worldAdminSchema.nullable(),
    narrative: worldNarrativeSchema.nullable(),
    inbox: worldInboxSchema.nullable(),
    staff: worldStaffSchema.nullable(),
  }),
  z.object({
    schemaVersion: z.literal(17),
    genesis: genesisSchema.nullable(),
    scheduler: schedulerSchema.nullable(),
    playerLifecycle: playerLifecycleSchema.nullable(),
    clubPortfolio: clubPortfolioSchema.nullable(),
    ledger: worldLedgerSchema.nullable(),
    competitions: worldCompetitionsSchema.nullable(),
    matches: worldMatchesSchema.nullable(),
    eventing: worldEventingSchema.nullable(),
    market: worldMarketSchema.nullable(),
    admin: worldAdminSchema.nullable(),
    narrative: worldNarrativeSchema.nullable(),
    inbox: worldInboxSchema.nullable(),
    staff: worldStaffSchema.nullable(),
    automation: worldAutomationSchema.nullable(),
  }),
]);

/**
 * O envelope JSON deixa de ter `world`: o mundo é do Postgres (R-173/R-182).
 * Isto aqui é o saco dos contextos que ainda não migraram — e some com eles.
 */
interface LoadedEnvelope {
  readonly genesis: WorldGenesisSnapshot | null;
  readonly scheduler: WorldSchedulerSnapshot | null;
  readonly playerLifecycle: WorldPlayerLifecycleSnapshot | null;
  readonly clubPortfolio: WorldClubPortfolioSnapshot | null;
  readonly ledger: WorldLedgerSnapshot | null;
  readonly competitions: WorldCompetitionsSnapshot | null;
  readonly matches: WorldMatchesSnapshot | null;
  readonly eventing: WorldEventingSnapshot | null;
  readonly market: WorldMarketSnapshot | null;
  readonly admin: WorldAdminSnapshot | null;
  readonly narrative: WorldNarrativeSnapshot | null;
  readonly inbox: WorldInboxSnapshot | null;
  readonly staff: WorldStaffSnapshot | null;
  readonly automation: WorldAutomationSnapshot | null;
}

/**
 * Envelope sem nada dentro. O arquivo era criado por `save(world)`; com o mundo
 * em tabela (R-173/R-182), ele passa a nascer quando o primeiro contexto grava.
 */
function emptyEnvelope(): LoadedEnvelope {
  return {
    genesis: null,
    scheduler: null,
    playerLifecycle: null,
    clubPortfolio: null,
    ledger: null,
    competitions: null,
    matches: null,
    eventing: null,
    market: null,
    admin: null,
    narrative: null,
    inbox: null,
    staff: null,
    automation: null,
  };
}

export class JsonWorldRepository
  implements
    WorldGenesisRepository,
    SchedulingRepository,
    PlayerLifecycleRepository,
    ClubPortfolioRepository,
    LedgerRepository,
    CompetitionRepository,
    MatchRepository,
    EventingRepository,
    MarketRepository,
    AdminRepository,
    NarrativeRepository,
    InboxRepository,
    StaffRepository,
    AutomationRepository
{
  public constructor(private readonly baseDirectory: string) {}

  public async findByWorldId(
    id: GameWorldId,
  ): Promise<WorldGenesisSnapshot | null> {
    return (await this.load(id))?.genesis ?? null;
  }

  public async saveGenesis(
    genesis: WorldGenesisSnapshot,
    // Era lock otimista contra a versão do MUNDO, feito de dentro de outro
    // contexto — só existia porque tudo morava no mesmo blob. Com o mundo em
    // tabela (R-182), quem o versiona é o PrismaWorldRepository. O parâmetro
    // fica até a porta ser reescrita com o contexto.
    _expectedWorldVersion: number,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    const current = (await this.load(genesis.gameWorldId)) ?? emptyEnvelope();
    if (current.genesis !== null) {
      throw new DomainError(
        "WORLD_GENESIS_ALREADY_EXISTS",
        "A gênese deste mundo já foi persistida.",
        { gameWorldId: genesis.gameWorldId },
      );
    }

    await this.write(genesis.gameWorldId, {
      genesis,
      scheduler: current.scheduler,
      playerLifecycle: current.playerLifecycle,
      clubPortfolio: current.clubPortfolio,
      ledger: current.ledger,
      competitions: current.competitions,
      matches: current.matches,
      eventing: current.eventing,
      market: current.market,
      admin: current.admin,
      narrative: current.narrative,
      inbox: current.inbox,
      staff: current.staff,
      automation: current.automation,
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
      const current = (await this.load(scheduler.gameWorldId)) ?? emptyEnvelope();
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
      const current = (await this.load(playerLifecycle.gameWorldId)) ?? emptyEnvelope();
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
      const current = (await this.load(clubPortfolio.gameWorldId)) ?? emptyEnvelope();
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
      const current = (await this.load(ledger.gameWorldId)) ?? emptyEnvelope();
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

  public async findCompetitionsByWorldId(
    id: GameWorldId,
  ): Promise<WorldCompetitionsSnapshot | null> {
    return (await this.load(id))?.competitions ?? null;
  }

  public async saveCompetitions(
    competitions: WorldCompetitionsSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withNamedLock(
      competitions.gameWorldId,
      "competitions",
      async () => {
        const current = (await this.load(competitions.gameWorldId)) ?? emptyEnvelope();
        if (expectedRevision === null && current.competitions !== null) {
          throw new DomainError(
            "COMPETITIONS_ALREADY_EXISTS",
            "As competições já existem.",
          );
        }
        if (
          expectedRevision !== null &&
          current.competitions?.revision !== expectedRevision
        ) {
          throw new DomainError(
            "COMPETITIONS_REVISION_CONFLICT",
            "As competições foram alteradas desde a última leitura.",
            {
              expectedRevision,
              actualRevision: current.competitions?.revision ?? null,
            },
          );
        }
        await this.write(competitions.gameWorldId, {
          ...current,
          competitions,
        });
      },
    );
  }

  public async findMatchesByWorldId(
    id: GameWorldId,
  ): Promise<WorldMatchesSnapshot | null> {
    return (await this.load(id))?.matches ?? null;
  }

  public async saveMatches(
    matches: WorldMatchesSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withNamedLock(matches.gameWorldId, "matches", async () => {
      const current = (await this.load(matches.gameWorldId)) ?? emptyEnvelope();
      if (expectedRevision === null && current.matches !== null) {
        throw new DomainError(
          "MATCHES_ALREADY_EXISTS",
          "As partidas já existem.",
        );
      }
      if (
        expectedRevision !== null &&
        current.matches?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "MATCHES_REVISION_CONFLICT",
          "As partidas foram alteradas desde a última leitura.",
          {
            expectedRevision,
            actualRevision: current.matches?.revision ?? null,
          },
        );
      }
      await this.write(matches.gameWorldId, { ...current, matches });
    });
  }

  public async findEventingByWorldId(
    id: GameWorldId,
  ): Promise<WorldEventingSnapshot | null> {
    return (await this.load(id))?.eventing ?? null;
  }

  public async saveEventing(
    eventing: WorldEventingSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withNamedLock(eventing.gameWorldId, "eventing", async () => {
      const current = (await this.load(eventing.gameWorldId)) ?? emptyEnvelope();
      if (expectedRevision === null && current.eventing !== null) {
        throw new DomainError(
          "EVENTING_ALREADY_EXISTS",
          "O eventing já existe.",
        );
      }
      if (
        expectedRevision !== null &&
        current.eventing?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "EVENTING_REVISION_CONFLICT",
          "O eventing foi alterado desde a última leitura.",
          {
            expectedRevision,
            actualRevision: current.eventing?.revision ?? null,
          },
        );
      }
      await this.write(eventing.gameWorldId, { ...current, eventing });
    });
  }

  public async findMarketByWorldId(
    id: GameWorldId,
  ): Promise<WorldMarketSnapshot | null> {
    return (await this.load(id))?.market ?? null;
  }

  public async saveMarket(
    market: WorldMarketSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withNamedLock(market.gameWorldId, "market", async () => {
      const current = (await this.load(market.gameWorldId)) ?? emptyEnvelope();
      if (expectedRevision === null && current.market !== null) {
        throw new DomainError("MARKET_ALREADY_EXISTS", "O mercado já existe.");
      }
      if (
        expectedRevision !== null &&
        current.market?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "MARKET_REVISION_CONFLICT",
          "O mercado foi alterado desde a última leitura.",
          {
            expectedRevision,
            actualRevision: current.market?.revision ?? null,
          },
        );
      }
      await this.write(market.gameWorldId, { ...current, market });
    });
  }

  public async findAdminByWorldId(
    id: GameWorldId,
  ): Promise<WorldAdminSnapshot | null> {
    return (await this.load(id))?.admin ?? null;
  }

  public async saveAdmin(
    admin: WorldAdminSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withNamedLock(admin.gameWorldId, "admin", async () => {
      const current = (await this.load(admin.gameWorldId)) ?? emptyEnvelope();
      if (expectedRevision === null && current.admin !== null) {
        throw new DomainError("ADMIN_ALREADY_EXISTS", "O admin já existe.");
      }
      if (
        expectedRevision !== null &&
        current.admin?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "ADMIN_REVISION_CONFLICT",
          "O admin foi alterado desde a última leitura.",
          {
            expectedRevision,
            actualRevision: current.admin?.revision ?? null,
          },
        );
      }
      await this.write(admin.gameWorldId, { ...current, admin });
    });
  }

  public async findNarrativeByWorldId(
    id: GameWorldId,
  ): Promise<WorldNarrativeSnapshot | null> {
    return (await this.load(id))?.narrative ?? null;
  }

  public async saveNarrative(
    narrative: WorldNarrativeSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withNamedLock(narrative.gameWorldId, "narrative", async () => {
      const current = (await this.load(narrative.gameWorldId)) ?? emptyEnvelope();
      if (expectedRevision === null && current.narrative !== null) {
        throw new DomainError(
          "NARRATIVE_ALREADY_EXISTS",
          "A narrativa já existe.",
        );
      }
      if (
        expectedRevision !== null &&
        current.narrative?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "NARRATIVE_REVISION_CONFLICT",
          "A narrativa foi alterada desde a última leitura.",
          {
            expectedRevision,
            actualRevision: current.narrative?.revision ?? null,
          },
        );
      }
      await this.write(narrative.gameWorldId, { ...current, narrative });
    });
  }

  public async findInboxByWorldId(
    id: GameWorldId,
  ): Promise<WorldInboxSnapshot | null> {
    return (await this.load(id))?.inbox ?? null;
  }

  public async saveInbox(
    inbox: WorldInboxSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withNamedLock(inbox.gameWorldId, "inbox", async () => {
      const current = (await this.load(inbox.gameWorldId)) ?? emptyEnvelope();
      if (expectedRevision === null && current.inbox !== null) {
        throw new DomainError("INBOX_ALREADY_EXISTS", "A inbox já existe.");
      }
      if (
        expectedRevision !== null &&
        current.inbox?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "INBOX_REVISION_CONFLICT",
          "A inbox foi alterada desde a última leitura.",
          {
            expectedRevision,
            actualRevision: current.inbox?.revision ?? null,
          },
        );
      }
      await this.write(inbox.gameWorldId, { ...current, inbox });
    });
  }

  public async findStaffByWorldId(
    id: GameWorldId,
  ): Promise<WorldStaffSnapshot | null> {
    return (await this.load(id))?.staff ?? null;
  }

  public async saveStaff(
    staff: WorldStaffSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withNamedLock(staff.gameWorldId, "staff", async () => {
      const current = (await this.load(staff.gameWorldId)) ?? emptyEnvelope();
      if (expectedRevision === null && current.staff !== null) {
        throw new DomainError("STAFF_ALREADY_EXISTS", "O staff já existe.");
      }
      if (
        expectedRevision !== null &&
        current.staff?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "STAFF_REVISION_CONFLICT",
          "O staff foi alterado desde a última leitura.",
          {
            expectedRevision,
            actualRevision: current.staff?.revision ?? null,
          },
        );
      }
      await this.write(staff.gameWorldId, { ...current, staff });
    });
  }

  public async findAutomationByWorldId(
    id: GameWorldId,
  ): Promise<WorldAutomationSnapshot | null> {
    return (await this.load(id))?.automation ?? null;
  }

  public async saveAutomation(
    automation: WorldAutomationSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    await mkdir(this.baseDirectory, { recursive: true });
    await this.withNamedLock(automation.gameWorldId, "automation", async () => {
      const current = (await this.load(automation.gameWorldId)) ?? emptyEnvelope();
      if (expectedRevision === null && current.automation !== null) {
        throw new DomainError(
          "AUTOMATION_ALREADY_EXISTS",
          "A automação já existe.",
        );
      }
      if (
        expectedRevision !== null &&
        current.automation?.revision !== expectedRevision
      ) {
        throw new DomainError(
          "AUTOMATION_REVISION_CONFLICT",
          "A automação foi alterada desde a última leitura.",
          {
            expectedRevision,
            actualRevision: current.automation?.revision ?? null,
          },
        );
      }
      await this.write(automation.gameWorldId, { ...current, automation });
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
      // O mundo NÃO é lido daqui: ele é tabela (R-173/R-182). Arquivos antigos
      // ainda têm `world` dentro; ele é ignorado, e não é fonte de nada.
      const persisted = persistedSnapshotSchema.parse(JSON.parse(contents));
      const genesis =
        (persisted.schemaVersion === 2 ||
          persisted.schemaVersion === 3 ||
          persisted.schemaVersion === 4 ||
          persisted.schemaVersion === 5 ||
          persisted.schemaVersion === 6 ||
          persisted.schemaVersion === 7 ||
          persisted.schemaVersion === 8 ||
          persisted.schemaVersion === 9 ||
          persisted.schemaVersion === 10 ||
          persisted.schemaVersion === 11 ||
          persisted.schemaVersion === 12 ||
          persisted.schemaVersion === 13 ||
          persisted.schemaVersion === 14 ||
          persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.genesis !== null
          ? (persisted.genesis as unknown as WorldGenesisSnapshot)
          : null;
      const scheduler =
        (persisted.schemaVersion === 3 ||
          persisted.schemaVersion === 4 ||
          persisted.schemaVersion === 5 ||
          persisted.schemaVersion === 6 ||
          persisted.schemaVersion === 7 ||
          persisted.schemaVersion === 8 ||
          persisted.schemaVersion === 9 ||
          persisted.schemaVersion === 10 ||
          persisted.schemaVersion === 11 ||
          persisted.schemaVersion === 12 ||
          persisted.schemaVersion === 13 ||
          persisted.schemaVersion === 14 ||
          persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.scheduler !== null
          ? (persisted.scheduler as unknown as WorldSchedulerSnapshot)
          : null;
      const playerLifecycle =
        (persisted.schemaVersion === 4 ||
          persisted.schemaVersion === 5 ||
          persisted.schemaVersion === 6 ||
          persisted.schemaVersion === 7 ||
          persisted.schemaVersion === 8 ||
          persisted.schemaVersion === 9 ||
          persisted.schemaVersion === 10 ||
          persisted.schemaVersion === 11 ||
          persisted.schemaVersion === 12 ||
          persisted.schemaVersion === 13 ||
          persisted.schemaVersion === 14 ||
          persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.playerLifecycle !== null
          ? (persisted.playerLifecycle as unknown as WorldPlayerLifecycleSnapshot)
          : null;
      const clubPortfolio =
        (persisted.schemaVersion === 6 ||
          persisted.schemaVersion === 7 ||
          persisted.schemaVersion === 8 ||
          persisted.schemaVersion === 9 ||
          persisted.schemaVersion === 10 ||
          persisted.schemaVersion === 11 ||
          persisted.schemaVersion === 12 ||
          persisted.schemaVersion === 13 ||
          persisted.schemaVersion === 14 ||
          persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.clubPortfolio !== null
          ? (persisted.clubPortfolio as unknown as WorldClubPortfolioSnapshot)
          : null;
      const ledger =
        (persisted.schemaVersion === 7 ||
          persisted.schemaVersion === 8 ||
          persisted.schemaVersion === 9 ||
          persisted.schemaVersion === 10 ||
          persisted.schemaVersion === 11 ||
          persisted.schemaVersion === 12 ||
          persisted.schemaVersion === 13 ||
          persisted.schemaVersion === 14 ||
          persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.ledger !== null
          ? (persisted.ledger as unknown as WorldLedgerSnapshot)
          : null;
      const competitions =
        (persisted.schemaVersion === 8 ||
          persisted.schemaVersion === 9 ||
          persisted.schemaVersion === 10 ||
          persisted.schemaVersion === 11 ||
          persisted.schemaVersion === 12 ||
          persisted.schemaVersion === 13 ||
          persisted.schemaVersion === 14 ||
          persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.competitions !== null
          ? (persisted.competitions as unknown as WorldCompetitionsSnapshot)
          : null;
      const matches =
        (persisted.schemaVersion === 9 ||
          persisted.schemaVersion === 10 ||
          persisted.schemaVersion === 11 ||
          persisted.schemaVersion === 12 ||
          persisted.schemaVersion === 13 ||
          persisted.schemaVersion === 14 ||
          persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.matches !== null
          ? (persisted.matches as unknown as WorldMatchesSnapshot)
          : null;
      const eventing =
        (persisted.schemaVersion === 10 ||
          persisted.schemaVersion === 11 ||
          persisted.schemaVersion === 12 ||
          persisted.schemaVersion === 13 ||
          persisted.schemaVersion === 14 ||
          persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.eventing !== null
          ? (persisted.eventing as unknown as WorldEventingSnapshot)
          : null;
      const market =
        (persisted.schemaVersion === 11 ||
          persisted.schemaVersion === 12 ||
          persisted.schemaVersion === 13 ||
          persisted.schemaVersion === 14 ||
          persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.market !== null
          ? (persisted.market as unknown as WorldMarketSnapshot)
          : null;
      const admin =
        (persisted.schemaVersion === 13 ||
          persisted.schemaVersion === 14 ||
          persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.admin !== null
          ? (persisted.admin as unknown as WorldAdminSnapshot)
          : null;
      const narrative =
        (persisted.schemaVersion === 14 ||
          persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.narrative !== null
          ? (persisted.narrative as unknown as WorldNarrativeSnapshot)
          : null;
      const inbox =
        (persisted.schemaVersion === 15 ||
          persisted.schemaVersion === 16 ||
          persisted.schemaVersion === 17) &&
        persisted.inbox !== null
          ? (persisted.inbox as unknown as WorldInboxSnapshot)
          : null;
      const staff =
        (persisted.schemaVersion === 16 || persisted.schemaVersion === 17) &&
        persisted.staff !== null
          ? (persisted.staff as unknown as WorldStaffSnapshot)
          : null;
      const automation =
        persisted.schemaVersion === 17 && persisted.automation !== null
          ? (persisted.automation as unknown as WorldAutomationSnapshot)
          : null;
      return {
        genesis,
        scheduler,
        playerLifecycle,
        clubPortfolio,
        ledger,
        competitions,
        matches,
        eventing,
        market,
        admin,
        narrative,
        inbox,
        staff,
        automation,
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
        schemaVersion: 17,
        genesis: envelope.genesis,
        scheduler: envelope.scheduler,
        playerLifecycle: envelope.playerLifecycle,
        clubPortfolio: envelope.clubPortfolio,
        ledger: envelope.ledger,
        competitions: envelope.competitions,
        matches: envelope.matches,
        eventing: envelope.eventing,
        market: envelope.market,
        admin: envelope.admin,
        narrative: envelope.narrative,
        inbox: envelope.inbox,
        staff: envelope.staff,
        automation: envelope.automation,
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
    // Todas as seções vivem no mesmo arquivo JSON. Locks por seção permitiam
    // que duas escritas partissem do mesmo envelope e a última substituísse a
    // seção salva pela primeira. Serializa por mundo para preservar o envelope
    // completo, inclusive quando inicializadores são disparados em paralelo.
    const lockPath = join(this.baseDirectory, `${id}.world.lock`);
    const lockDeadline = Date.now() + 5_000;
    let handle;
    while (handle === undefined) {
      try {
        handle = await open(lockPath, "wx");
      } catch (error: unknown) {
        if (!isNodeError(error) || error.code !== "EEXIST") throw error;
        const lockStat = await stat(lockPath).catch(() => null);
        if (lockStat !== null && Date.now() - lockStat.mtimeMs > 60_000) {
          await unlink(lockPath).catch(() => undefined);
          continue;
        }
        if (Date.now() >= lockDeadline) {
          throw new DomainError(
            "WORLD_SECTION_WRITE_LOCKED",
            "Outra réplica está atualizando esta seção do mundo.",
            { id, section: name },
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    try {
      return await action();
    } finally {
      await handle.close();
      await unlink(lockPath).catch(() => undefined);
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
