-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'VIEW', 'SUPPORT', 'REVIEW', 'CORRECTION', 'PUNISHMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'ANONYMIZED');

-- CreateEnum
CREATE TYPE "WorldStatus" AS ENUM ('CREATING', 'ACTIVE', 'PAUSED', 'FINISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClubControlType" AS ENUM ('USER', 'AI');

-- CreateEnum
CREATE TYPE "ClubStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANKRUPT', 'BOT_RESERVED');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('PLANNED', 'ACTIVE', 'FINISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "DominantFoot" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'RETIRED', 'FREE_AGENT', 'INJURED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PlayerAvailability" AS ENUM ('AVAILABLE', 'INJURED', 'SUSPENDED', 'CONVENED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "SuspensionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlayerGenerationSource" AS ENUM ('INITIAL_WORLD', 'SCOUT_FOUND', 'YOUTH_ACADEMY', 'REGEN_AFTER_RETIREMENT', 'MARKET_BALANCE');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('HEAD_COACH', 'ASSISTANT_COACH', 'FITNESS_COACH', 'GOALKEEPER_COACH', 'SCOUT', 'DOCTOR', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'DIRECTOR', 'NEGOTIATOR', 'COMMUNICATION_MANAGER', 'YOUTH_COORDINATOR');

-- CreateEnum
CREATE TYPE "StaffQualityTier" AS ENUM ('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'ELITE');

-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('MEDICAL', 'TRAINING', 'YOUTH_ACADEMY', 'SCOUTING', 'COMMUNICATION', 'BOARD', 'FINANCE', 'INFRASTRUCTURE', 'STADIUM', 'DATA_ANALYSIS');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('LISTED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('PERMANENT', 'LOAN', 'FREE_AGENT', 'CONTRACT_END');

-- CreateEnum
CREATE TYPE "LoanPurchaseClauseType" AS ENUM ('NONE', 'OPTION_TO_BUY', 'OBLIGATION_TO_BUY', 'BUY_BACK');

-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('LEAGUE', 'CUP', 'SUPER_CUP', 'INTERNATIONAL_CUP', 'FRIENDLY');

-- CreateEnum
CREATE TYPE "CompetitionFormat" AS ENUM ('ROUND_ROBIN', 'DOUBLE_ROUND_ROBIN', 'KNOCKOUT', 'GROUPS_AND_KNOCKOUT', 'SWISS');

-- CreateEnum
CREATE TYPE "MatchRuntimeStatus" AS ENUM ('SCHEDULED', 'PRE_MATCH', 'LIVE', 'PAUSED_FOR_DECISION', 'FINISHED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "MatchResultStatus" AS ENUM ('PENDING', 'NORMAL', 'WALKOVER', 'CANCELLED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "HomologationStatus" AS ENUM ('PENDING', 'PROVISIONAL', 'HOMOLOGATED', 'UNDER_APPEAL', 'OVERTURNED');

-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('GOAL', 'OWN_GOAL', 'ASSIST', 'YELLOW_CARD', 'RED_CARD', 'INJURY', 'SUBSTITUTION', 'TACTICAL_CHANGE', 'PENALTY_AWARDED', 'PENALTY_MISSED', 'PENALTY_SCORED', 'FREE_KICK', 'SHOT', 'SHOT_ON_TARGET', 'SAVE', 'FOUL', 'OFFSIDE', 'VAR_CHECK', 'MOMENTUM_SHIFT', 'FATIGUE_ALERT', 'AI_DECISION');

-- CreateEnum
CREATE TYPE "TacticalMentality" AS ENUM ('VERY_DEFENSIVE', 'DEFENSIVE', 'BALANCED', 'OFFENSIVE', 'VERY_OFFENSIVE');

-- CreateEnum
CREATE TYPE "PressingIntensity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "MarkingStyle" AS ENUM ('ZONAL', 'MAN_TO_MAN', 'MIXED');

-- CreateEnum
CREATE TYPE "TempoStyle" AS ENUM ('SLOW', 'NORMAL', 'FAST', 'DIRECT');

-- CreateEnum
CREATE TYPE "MatchControlSource" AS ENUM ('USER_ONLINE', 'USER_OFFLINE_AI', 'FULL_AI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DecisionPointType" AS ENUM ('INJURY', 'RED_CARD', 'FATIGUE', 'BAD_PERFORMANCE', 'LOSING_GAME', 'WINNING_GAME', 'TACTICAL_OPPORTUNITY', 'OPPONENT_WEAKNESS', 'PLAYER_RISK', 'FINAL_PRESSURE');

-- CreateEnum
CREATE TYPE "RecommendationImpact" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MATCH_EVENT', 'MATCH_DECISION_POINT', 'TRANSFER_OFFER', 'CONTRACT_ALERT', 'INJURY_ALERT', 'FINANCE_ALERT', 'FAN_REACTION', 'BOARD_MESSAGE', 'COMPETITION_UPDATE', 'SCOUT_REPORT', 'TRAINING_REPORT');

-- CreateEnum
CREATE TYPE "FinanceTransactionType" AS ENUM ('TICKET_REVENUE', 'SPONSORSHIP', 'PLAYER_SALE', 'PLAYER_PURCHASE', 'WAGE_PAYMENT', 'STAFF_WAGE_PAYMENT', 'STADIUM_COST', 'STRUCTURE_UPGRADE', 'PRIZE_MONEY', 'TAX', 'MAINTENANCE', 'LOAN_PAYMENT', 'OTHER_INCOME', 'OTHER_EXPENSE');

-- CreateEnum
CREATE TYPE "NarrativeType" AS ENUM ('FAN_PRESSURE', 'MEDIA_RUMOR', 'PLAYER_UNHAPPY', 'BOARD_PRESSURE', 'DERBY_HYPE', 'TITLE_RACE', 'RELEGATION_RISK', 'TRANSFER_SPECULATION', 'COMEBACK_STORY');

-- CreateEnum
CREATE TYPE "MoodLevel" AS ENUM ('VERY_LOW', 'LOW', 'NEUTRAL', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "InjurySeverity" AS ENUM ('MINOR', 'LIGHT', 'MODERATE', 'SERIOUS', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TrainingFocus" AS ENUM ('PHYSICAL', 'TECHNICAL', 'TACTICAL', 'MENTAL', 'DEFENSIVE', 'OFFENSIVE', 'SET_PIECES', 'RECOVERY', 'INDIVIDUAL_ROLE');

-- CreateEnum
CREATE TYPE "SquadType" AS ENUM ('SENIOR', 'RESERVE', 'YOUTH', 'NATIONAL');

-- CreateEnum
CREATE TYPE "SquadCategory" AS ENUM ('FIRST_TEAM', 'RESERVE', 'YOUTH_ACADEMY', 'LOAN', 'TRIAL');

-- CreateEnum
CREATE TYPE "YouthAgeCategory" AS ENUM ('U15', 'U17', 'U20', 'U23');

-- CreateEnum
CREATE TYPE "AutomationLevel" AS ENUM ('MANUAL', 'ASSISTED', 'SEMI_AUTOMATED', 'FULLY_AUTOMATED');

-- CreateEnum
CREATE TYPE "AutomationRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "SagaType" AS ENUM ('TRANSFER', 'SEASON_ROLLOVER', 'ONBOARDING', 'STADIUM_WORKS', 'LOAN');

-- CreateEnum
CREATE TYPE "SagaStatus" AS ENUM ('CREATED', 'RUNNING', 'WAITING', 'COMPENSATING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "SagaStepStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'COMPENSATED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AccountOwnerScope" AS ENUM ('CLUB', 'WORLD');

-- CreateEnum
CREATE TYPE "SystemAccount" AS ENUM ('SYS_INITIAL_ENDOWMENT', 'SYS_MATCHDAY_FAUCET', 'SYS_SPONSOR_FAUCET', 'SYS_BROADCAST_FAUCET', 'SYS_PRIZE_FAUCET', 'SYS_OWNER_INJECTION_FAUCET', 'SYS_TAX_SINK', 'SYS_WAGE_SINK', 'SYS_OPERATING_SINK', 'SYS_CREDIT_SINK', 'SYS_PENALTY_SINK', 'SYS_AGENT_SINK');

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'SYSTEM_FAUCET', 'SYSTEM_SINK');

-- CreateEnum
CREATE TYPE "AccountNormalSide" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "MoneyFlowClass" AS ENUM ('TRANSFER', 'FAUCET', 'SINK');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTING', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "JournalLineDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RegistrationSlotType" AS ENUM ('GENERAL', 'FOREIGN', 'HOMEGROWN', 'CLUB_TRAINED', 'UNDER21', 'GOALKEEPER');

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" UUID NOT NULL,
    "status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "avatarUrl" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gameWorldId" UUID,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldParticipant" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "WorldParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCredential" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "algo" TEXT NOT NULL DEFAULT 'argon2id',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthRefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "rotatedFromId" UUID,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AuthRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameWorld" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WorldStatus" NOT NULL DEFAULT 'CREATING',
    "currentSeasonId" UUID,
    "currentRuleSetVersionId" UUID,
    "currentDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "maxClubs" INTEGER NOT NULL,
    "seasonDays" INTEGER,
    "initialClubCashMinor" BIGINT NOT NULL,
    "currencyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "GameWorld_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameEconomyConfig" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "basePlayerPriceMultiplier" DECIMAL(8,4) NOT NULL,
    "baseWageMultiplier" DECIMAL(8,4) NOT NULL,
    "clubCountWeight" DECIMAL(8,4) NOT NULL,
    "activePlayerCountWeight" DECIMAL(8,4) NOT NULL,
    "retiredPlayerCountWeight" DECIMAL(8,4) NOT NULL,
    "freeAgentCountWeight" DECIMAL(8,4) NOT NULL,
    "moneySupplyWeight" DECIMAL(8,4) NOT NULL,
    "minGeneratedPlayerAge" INTEGER NOT NULL,
    "maxGeneratedPlayerAge" INTEGER NOT NULL,
    "targetPlayersPerClub" INTEGER NOT NULL,
    "targetFreeAgentRatio" DECIMAL(5,4) NOT NULL,
    "inflationRatePerSeason" DECIMAL(6,4) NOT NULL DEFAULT 0,

    CONSTRAINT "GameEconomyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomySnapshot" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "seasonId" UUID,
    "currencyId" UUID NOT NULL,
    "totalClubs" INTEGER NOT NULL,
    "totalActiveClubs" INTEGER NOT NULL,
    "totalPlayers" INTEGER NOT NULL,
    "totalActivePlayers" INTEGER NOT NULL,
    "totalRetiredPlayers" INTEGER NOT NULL,
    "totalFreeAgents" INTEGER NOT NULL,
    "totalCashInWorldMinor" BIGINT NOT NULL,
    "averageClubCashMinor" BIGINT NOT NULL,
    "averagePlayerValueMinor" BIGINT NOT NULL,
    "averageWageMinor" BIGINT NOT NULL,
    "marketInflationIndex" DECIMAL(10,4) NOT NULL,
    "playerScarcityIndex" DECIMAL(10,4) NOT NULL,
    "balanceScore" DECIMAL(10,4) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'PLANNED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL,
    "foundedYear" INTEGER,
    "controlType" "ClubControlType" NOT NULL DEFAULT 'AI',
    "status" "ClubStatus" NOT NULL DEFAULT 'ACTIVE',
    "reputation" INTEGER NOT NULL DEFAULT 1,
    "level" INTEGER NOT NULL DEFAULT 1,
    "fanBaseSize" INTEGER NOT NULL DEFAULT 0,
    "boardPatience" INTEGER NOT NULL DEFAULT 50,
    "pressureLevel" INTEGER NOT NULL DEFAULT 0,
    "currencyId" UUID NOT NULL,
    "cashMinor" BIGINT NOT NULL,
    "wageBudgetMinor" BIGINT NOT NULL,
    "transferBudgetMinor" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubControl" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "worldParticipantId" UUID NOT NULL,
    "controlType" "ClubControlType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAtWorldTick" BIGINT NOT NULL,
    "endsAtWorldTick" BIGINT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClubControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubDepartment" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "currencyId" UUID NOT NULL,
    "type" "DepartmentType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "maxLevel" INTEGER NOT NULL DEFAULT 5,
    "qualityScore" INTEGER NOT NULL DEFAULT 10,
    "maintenanceCostPerSeasonMinor" BIGINT NOT NULL,
    "upgradeCostMinor" BIGINT NOT NULL,
    "effectJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClubDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubAIProfile" (
    "id" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "aggressiveness" INTEGER NOT NULL DEFAULT 50,
    "patience" INTEGER NOT NULL DEFAULT 50,
    "youthPreference" INTEGER NOT NULL DEFAULT 50,
    "transferRisk" INTEGER NOT NULL DEFAULT 50,
    "financialDiscipline" INTEGER NOT NULL DEFAULT 50,
    "tacticalFlexibility" INTEGER NOT NULL DEFAULT 50,
    "substitutionTiming" INTEGER NOT NULL DEFAULT 50,
    "injuryRiskTolerance" INTEGER NOT NULL DEFAULT 50,
    "offlineDecisionLevel" INTEGER NOT NULL DEFAULT 1,
    "strategyJson" JSONB,

    CONSTRAINT "ClubAIProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "knownName" TEXT,
    "nationality" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "ageVirtual" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'MALE',
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "clubId" UUID,
    "primaryPosition" "PlayerPosition" NOT NULL,
    "secondaryPosition" "PlayerPosition",
    "dominantFoot" "DominantFoot" NOT NULL,
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "generationSource" "PlayerGenerationSource" NOT NULL,
    "generatedAtSeasonNumber" INTEGER,
    "availability" "PlayerAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "currentAbility" INTEGER NOT NULL,
    "potentialAbility" INTEGER NOT NULL,
    "currencyId" UUID NOT NULL,
    "marketValueMinor" BIGINT NOT NULL,
    "wageExpectationMinor" BIGINT NOT NULL,
    "morale" INTEGER NOT NULL DEFAULT 50,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "happiness" INTEGER NOT NULL DEFAULT 50,
    "fatigue" INTEGER NOT NULL DEFAULT 0,
    "matchSharpness" INTEGER NOT NULL DEFAULT 50,
    "injuryProneness" INTEGER NOT NULL DEFAULT 50,
    "consistency" INTEGER NOT NULL DEFAULT 50,
    "ambition" INTEGER NOT NULL DEFAULT 50,
    "loyalty" INTEGER NOT NULL DEFAULT 50,
    "professionalism" INTEGER NOT NULL DEFAULT 50,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAttributes" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "finishing" INTEGER NOT NULL,
    "longShots" INTEGER NOT NULL,
    "heading" INTEGER NOT NULL,
    "passing" INTEGER NOT NULL,
    "crossing" INTEGER NOT NULL,
    "dribbling" INTEGER NOT NULL,
    "firstTouch" INTEGER NOT NULL,
    "technique" INTEGER NOT NULL,
    "tackling" INTEGER NOT NULL,
    "marking" INTEGER NOT NULL,
    "positioning" INTEGER NOT NULL,
    "acceleration" INTEGER NOT NULL,
    "pace" INTEGER NOT NULL,
    "stamina" INTEGER NOT NULL,
    "strength" INTEGER NOT NULL,
    "agility" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "jumping" INTEGER NOT NULL,
    "bravery" INTEGER NOT NULL,
    "aggression" INTEGER NOT NULL,
    "composure" INTEGER NOT NULL,
    "decisions" INTEGER NOT NULL,
    "concentration" INTEGER NOT NULL,
    "leadership" INTEGER NOT NULL,
    "teamwork" INTEGER NOT NULL,
    "workRate" INTEGER NOT NULL,
    "determination" INTEGER NOT NULL,
    "flair" INTEGER NOT NULL,
    "goalkeeperReflexes" INTEGER,
    "goalkeeperHandling" INTEGER,
    "goalkeeperPositioning" INTEGER,
    "goalkeeperKicking" INTEGER,
    "goalkeeperOneOnOne" INTEGER,

    CONSTRAINT "PlayerAttributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerBackground" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "childhoodPovertyLevel" INTEGER NOT NULL DEFAULT 0,
    "familyStability" INTEGER NOT NULL DEFAULT 50,
    "violenceExposure" INTEGER NOT NULL DEFAULT 0,
    "educationLevel" INTEGER NOT NULL DEFAULT 50,
    "earlyFootballAccess" INTEGER NOT NULL DEFAULT 50,
    "fatherPresenceScore" INTEGER,
    "motherPresenceScore" INTEGER,
    "guardianStory" TEXT,
    "lifeStorySummary" TEXT,
    "generatedTraitJson" JSONB,

    CONSTRAINT "PlayerBackground_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPersonality" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "grit" INTEGER NOT NULL,
    "emotionalStability" INTEGER NOT NULL,
    "discipline" INTEGER NOT NULL,
    "ego" INTEGER NOT NULL,
    "pressureHandling" INTEGER NOT NULL,
    "adaptability" INTEGER NOT NULL,
    "socialInfluence" INTEGER NOT NULL,
    "mediaHandling" INTEGER NOT NULL,
    "offFieldRisk" INTEGER NOT NULL,
    "lifestyleBalance" INTEGER NOT NULL,
    "hiddenTraits" JSONB,

    CONSTRAINT "PlayerPersonality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerDevelopment" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "technicalGrowthRate" DECIMAL(6,4) NOT NULL,
    "physicalGrowthRate" DECIMAL(6,4) NOT NULL,
    "mentalGrowthRate" DECIMAL(6,4) NOT NULL,
    "peakAgeStart" INTEGER NOT NULL,
    "peakAgeEnd" INTEGER NOT NULL,
    "declineRate" DECIMAL(6,4) NOT NULL,
    "trainingResponse" INTEGER NOT NULL,
    "injuryImpactAccumulated" INTEGER NOT NULL DEFAULT 0,
    "lastDevelopmentAt" TIMESTAMP(3),

    CONSTRAINT "PlayerDevelopment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerContract" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "currencyId" UUID NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "startSeason" INTEGER NOT NULL,
    "endSeason" INTEGER NOT NULL,
    "salaryPerSeasonMinor" BIGINT NOT NULL,
    "signingBonusMinor" BIGINT NOT NULL DEFAULT 0,
    "releaseClauseMinor" BIGINT,
    "moralePromiseJson" JSONB,
    "roleInSquad" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlayerContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerInjury" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "severity" "InjurySeverity" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "expectedReturnAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "causedByMatchId" UUID,
    "causedByTrainingPlanId" UUID,
    "medicalDepartmentLevelAtTime" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlayerInjury_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSuspension" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "competitionSeasonId" UUID,
    "reason" TEXT NOT NULL,
    "matchesTotal" INTEGER NOT NULL,
    "matchesServed" INTEGER NOT NULL DEFAULT 0,
    "status" "SuspensionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlayerSuspension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerCompetitionDiscipline" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "competitionSeasonId" UUID NOT NULL,
    "yellowAccumulated" INTEGER NOT NULL DEFAULT 0,
    "redCount" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlayerCompetitionDiscipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "role" "StaffRole" NOT NULL,
    "qualityTier" "StaffQualityTier" NOT NULL,
    "abilityScore" INTEGER NOT NULL,
    "potentialScore" INTEGER NOT NULL,
    "reputation" INTEGER NOT NULL DEFAULT 1,
    "tacticalKnowledge" INTEGER NOT NULL DEFAULT 50,
    "youthDevelopment" INTEGER NOT NULL DEFAULT 50,
    "medicalKnowledge" INTEGER NOT NULL DEFAULT 50,
    "negotiation" INTEGER NOT NULL DEFAULT 50,
    "communication" INTEGER NOT NULL DEFAULT 50,
    "discipline" INTEGER NOT NULL DEFAULT 50,
    "dataAnalysis" INTEGER NOT NULL DEFAULT 50,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffContract" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "currencyId" UUID NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "startSeason" INTEGER NOT NULL,
    "endSeason" INTEGER NOT NULL,
    "salaryPerSeasonMinor" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "StaffContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "focus" "TrainingFocus" NOT NULL,
    "intensity" INTEGER NOT NULL,
    "tacticalStyleJson" JSONB,
    "createdByStaffId" UUID,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlayerEntry" (
    "id" UUID NOT NULL,
    "trainingPlanId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "focus" "TrainingFocus" NOT NULL,
    "workload" INTEGER NOT NULL,
    "technicalGain" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "physicalGain" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "mentalGain" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "fatigueGain" INTEGER NOT NULL DEFAULT 0,
    "injuryRiskGain" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TrainingPlayerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SquadType" NOT NULL DEFAULT 'SENIOR',
    "category" "SquadCategory" NOT NULL DEFAULT 'FIRST_TEAM',
    "youthAgeCategory" "YouthAgeCategory",
    "seasonNumber" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadMembership" (
    "id" UUID NOT NULL,
    "squadId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "role" TEXT,
    "shirtNumber" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),

    CONSTRAINT "SquadMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutReport" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "scoutStaffId" UUID,
    "currencyId" UUID NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "estimatedCurrentAbility" INTEGER NOT NULL,
    "estimatedPotentialAbility" INTEGER NOT NULL,
    "estimatedMarketValueMinor" BIGINT NOT NULL,
    "personalityNotes" TEXT,
    "backgroundNotes" TEXT,
    "recommendationScore" INTEGER NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ScoutReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferListing" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "currencyId" UUID NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'LISTED',
    "type" "TransferType" NOT NULL,
    "askingPriceMinor" BIGINT NOT NULL,
    "listedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TransferListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "listingId" UUID,
    "playerId" UUID NOT NULL,
    "buyingClubId" UUID NOT NULL,
    "sellingClubId" UUID,
    "currencyId" UUID NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'NEGOTIATING',
    "type" "TransferType" NOT NULL,
    "transferFeeMinor" BIGINT NOT NULL,
    "salaryOfferMinor" BIGINT NOT NULL,
    "contractSeasons" INTEGER NOT NULL,
    "loanPurchaseClauseType" "LoanPurchaseClauseType" DEFAULT 'NONE',
    "bonusJson" JSONB,
    "clausesJson" JSONB,
    "playerInterestScore" INTEGER,
    "sellingClubInterestScore" INTEGER,
    "buyingClubNeedScore" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "currencyId" UUID NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "description" TEXT,
    "amountMinor" BIGINT NOT NULL,
    "seasonNumber" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubFinanceSnapshot" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "currencyId" UUID NOT NULL,
    "cashMinor" BIGINT NOT NULL,
    "revenueMinor" BIGINT NOT NULL,
    "expensesMinor" BIGINT NOT NULL,
    "wagesMinor" BIGINT NOT NULL,
    "transferSpentMinor" BIGINT NOT NULL,
    "transferReceivedMinor" BIGINT NOT NULL,
    "debtMinor" BIGINT NOT NULL DEFAULT 0,
    "profitMinor" BIGINT NOT NULL,

    CONSTRAINT "ClubFinanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompetitionType" NOT NULL,
    "format" "CompetitionFormat" NOT NULL,
    "country" TEXT,
    "tier" INTEGER,
    "reputation" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionSeason" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'PLANNED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "prizeJson" JSONB,
    "rulesJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CompetitionSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionClub" (
    "id" UUID NOT NULL,
    "competitionSeasonId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "seed" INTEGER,
    "groupName" TEXT,

    CONSTRAINT "CompetitionClub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionStage" (
    "id" UUID NOT NULL,
    "competitionSeasonId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "format" "CompetitionFormat" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CompetitionStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "competitionSeasonId" UUID,
    "stageId" UUID,
    "homeClubId" UUID NOT NULL,
    "awayClubId" UUID NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "roundNumber" INTEGER,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "runtimeStatus" "MatchRuntimeStatus" NOT NULL DEFAULT 'SCHEDULED',
    "resultStatus" "MatchResultStatus" NOT NULL DEFAULT 'PENDING',
    "homologationStatus" "HomologationStatus" NOT NULL DEFAULT 'PENDING',
    "homeGoals" INTEGER NOT NULL DEFAULT 0,
    "awayGoals" INTEGER NOT NULL DEFAULT 0,
    "homeExpectedGoals" DECIMAL(8,4),
    "awayExpectedGoals" DECIMAL(8,4),
    "simulationSeed" TEXT,
    "simulatedOffline" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSimulation" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "tickIntervalSeconds" INTEGER NOT NULL,
    "totalTicks" INTEGER NOT NULL,
    "homeStrengthSnapshot" JSONB NOT NULL,
    "awayStrengthSnapshot" JSONB NOT NULL,
    "randomSeed" TEXT NOT NULL,
    "balanceJson" JSONB,
    "finalMomentumJson" JSONB,
    "rulesetVersionId" UUID,
    "rngAlgorithm" TEXT,
    "rngStreamsJson" JSONB,
    "contextSnapshot" JSONB,
    "lineupSnapshot" JSONB,
    "inputHash" TEXT,
    "homeStrengthHash" TEXT,
    "awayStrengthHash" TEXT,
    "contextHash" TEXT,
    "lineupHash" TEXT,
    "resultHash" TEXT,
    "hashAlgorithm" TEXT,
    "manifestSchemaVersion" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MatchSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSimulationTick" (
    "id" UUID NOT NULL,
    "simulationId" UUID NOT NULL,
    "minute" INTEGER NOT NULL,
    "second" INTEGER,
    "homeMomentum" DECIMAL(8,4) NOT NULL,
    "awayMomentum" DECIMAL(8,4) NOT NULL,
    "homeThreat" DECIMAL(8,4) NOT NULL,
    "awayThreat" DECIMAL(8,4) NOT NULL,
    "homeFatigueAvg" DECIMAL(8,4) NOT NULL,
    "awayFatigueAvg" DECIMAL(8,4) NOT NULL,
    "data" JSONB,

    CONSTRAINT "MatchSimulationTick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchTeamState" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "controlSource" "MatchControlSource" NOT NULL,
    "mentality" "TacticalMentality" NOT NULL DEFAULT 'BALANCED',
    "pressing" "PressingIntensity" NOT NULL DEFAULT 'MEDIUM',
    "marking" "MarkingStyle" NOT NULL DEFAULT 'ZONAL',
    "tempo" "TempoStyle" NOT NULL DEFAULT 'NORMAL',
    "formation" TEXT NOT NULL,
    "lineHeight" INTEGER NOT NULL DEFAULT 50,
    "defensiveWidth" INTEGER NOT NULL DEFAULT 50,
    "attackingWidth" INTEGER NOT NULL DEFAULT 50,
    "riskLevel" INTEGER NOT NULL DEFAULT 50,
    "morale" INTEGER NOT NULL DEFAULT 50,
    "fatigueAvg" INTEGER NOT NULL DEFAULT 0,
    "tacticalCohesion" INTEGER NOT NULL DEFAULT 50,
    "currentInstructions" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MatchTeamState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchLineup" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "formation" TEXT NOT NULL,
    "isInitial" BOOLEAN NOT NULL DEFAULT true,
    "isImmutableSnapshot" BOOLEAN NOT NULL DEFAULT true,
    "frozenAtTick" INTEGER,
    "snapshotJson" JSONB,
    "lineupHash" TEXT,

    CONSTRAINT "MatchLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchLineupPlayer" (
    "id" UUID NOT NULL,
    "lineupId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "position" "PlayerPosition" NOT NULL,
    "shirtNumber" INTEGER,
    "isStarter" BOOLEAN NOT NULL DEFAULT true,
    "enteredMinute" INTEGER,
    "leftMinute" INTEGER,
    "tacticalRole" TEXT,
    "individualInstructionJson" JSONB,

    CONSTRAINT "MatchLineupPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "clubId" UUID,
    "playerId" UUID,
    "relatedPlayerId" UUID,
    "type" "MatchEventType" NOT NULL,
    "minute" INTEGER NOT NULL,
    "second" INTEGER,
    "eventSequence" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "x" DECIMAL(8,4),
    "y" DECIMAL(8,4),
    "data" JSONB,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerMatchStats" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "shots" INTEGER NOT NULL,
    "shotsOnTarget" INTEGER NOT NULL,
    "passesAttempted" INTEGER NOT NULL,
    "passesCompleted" INTEGER NOT NULL,
    "tackles" INTEGER NOT NULL,
    "interceptions" INTEGER NOT NULL,
    "foulsCommitted" INTEGER NOT NULL,
    "yellowCards" INTEGER NOT NULL,
    "redCards" INTEGER NOT NULL,
    "saves" INTEGER NOT NULL,
    "goalsConceded" INTEGER NOT NULL,
    "rating" DECIMAL(4,2) NOT NULL DEFAULT 6.00,
    "fatigueStart" INTEGER NOT NULL,
    "fatigueEnd" INTEGER NOT NULL,
    "moraleImpact" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchDecisionPoint" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "type" "DecisionPointType" NOT NULL,
    "minute" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "urgency" "RecommendationImpact" NOT NULL,
    "createdByStaffQuality" INTEGER,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "chosenActionId" UUID,
    "data" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MatchDecisionPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchActionRecommendation" (
    "id" UUID NOT NULL,
    "decisionPointId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" "RecommendationImpact" NOT NULL,
    "confidence" INTEGER NOT NULL,
    "tacticalChangeJson" JSONB,
    "substitutionJson" JSONB,
    "riskJson" JSONB,
    "generatedByStaffRole" "StaffRole",
    "generatedByStaffQuality" INTEGER,

    CONSTRAINT "MatchActionRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubSeasonStats" (
    "id" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "competitionSeasonId" UUID,
    "matchesPlayed" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "draws" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "goalsFor" INTEGER NOT NULL,
    "goalsAgainst" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "finalPosition" INTEGER,
    "titlesWon" INTEGER NOT NULL DEFAULT 0,
    "averageAttendance" INTEGER NOT NULL DEFAULT 0,
    "fanMood" "MoodLevel" NOT NULL DEFAULT 'NEUTRAL',

    CONSTRAINT "ClubSeasonStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSeasonStats" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "clubId" UUID,
    "competitionSeasonId" UUID,
    "appearances" INTEGER NOT NULL,
    "starts" INTEGER NOT NULL,
    "minutesPlayed" INTEGER NOT NULL,
    "goals" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "yellowCards" INTEGER NOT NULL,
    "redCards" INTEGER NOT NULL,
    "averageRating" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "injuriesCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSeasonStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Narrative" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID,
    "playerId" UUID,
    "type" "NarrativeType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "intensity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "effectsJson" JSONB,

    CONSTRAINT "Narrative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID,
    "userId" UUID,
    "clubId" UUID,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAuditLog" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID,
    "userId" UUID,
    "clubId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" UUID,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "metadata" JSONB,
    "integrityHash" TEXT,
    "previousIntegrityHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRuleConfig" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "GameRuleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" "AutomationLevel" NOT NULL DEFAULT 'ASSISTED',
    "status" "AutomationRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "triggerJson" JSONB,
    "conditionJson" JSONB,
    "actionJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" UUID NOT NULL,
    "aggregateVersion" BIGINT,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "payloadJson" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "sequence" BIGINT NOT NULL,
    "correlationId" UUID,
    "causationId" UUID,
    "contentHash" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxDedup" (
    "id" UUID NOT NULL,
    "consumerName" TEXT NOT NULL,
    "eventId" UUID NOT NULL,
    "gameWorldId" UUID,
    "resultHash" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxDedup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEventLog" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" UUID NOT NULL,
    "aggregateVersion" BIGINT NOT NULL,
    "sequence" BIGINT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "payloadJson" JSONB NOT NULL,
    "actorType" TEXT,
    "actorId" UUID,
    "correlationId" UUID,
    "causationId" UUID,
    "prevEventHash" TEXT,
    "eventHash" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurredAtWorldTick" BIGINT,

    CONSTRAINT "DomainEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID,
    "actorId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "commandId" UUID,
    "commandType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resultHash" TEXT,
    "resultPayload" JSONB,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SagaInstance" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "sagaType" "SagaType" NOT NULL,
    "status" "SagaStatus" NOT NULL DEFAULT 'CREATED',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "correlationId" UUID,
    "contextJson" JSONB,
    "fencingToken" BIGINT NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SagaInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SagaStep" (
    "id" UUID NOT NULL,
    "sagaInstanceId" UUID NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SagaStepStatus" NOT NULL DEFAULT 'PENDING',
    "compensationStatus" "SagaStepStatus",
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "payloadJson" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SagaStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "ownerScope" "AccountOwnerScope" NOT NULL DEFAULT 'CLUB',
    "clubId" UUID,
    "systemAccount" "SystemAccount",
    "accountCode" TEXT NOT NULL,
    "accountType" "FinancialAccountType" NOT NULL,
    "normalSide" "AccountNormalSide" NOT NULL,
    "currencyId" UUID NOT NULL,
    "parentAccountId" UUID,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID,
    "currencyId" UUID NOT NULL,
    "flowClass" "MoneyFlowClass" NOT NULL,
    "financeType" "FinanceTransactionType",
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "reversalOfJournalEntryId" UUID,
    "sourceEventId" UUID,
    "seasonNumber" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "journalEntryId" UUID NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "financialAccountId" UUID NOT NULL,
    "direction" "JournalLineDirection" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currencyId" UUID NOT NULL,
    "costCenterCode" TEXT,
    "referenceType" TEXT,
    "referenceId" UUID,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerDevelopmentAccrual" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "attributeCode" TEXT NOT NULL,
    "pendingDeltaMinor" BIGINT NOT NULL DEFAULT 0,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedTick" BIGINT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlayerDevelopmentAccrual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionRegistration" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "competitionSeasonId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "squadSizeLimit" INTEGER,
    "foreignPlayerLimit" INTEGER,
    "homegrownMinimum" INTEGER,
    "registeredCount" INTEGER NOT NULL DEFAULT 0,
    "foreignCount" INTEGER NOT NULL DEFAULT 0,
    "homegrownCount" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CompetitionRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRegistration" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "registrationId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "slotType" "RegistrationSlotType" NOT NULL DEFAULT 'GENERAL',
    "shirtNumber" INTEGER,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deregisteredAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlayerRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchCommandLog" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "simulationId" UUID NOT NULL,
    "matchSequence" BIGINT NOT NULL,
    "appliedAtTick" INTEGER NOT NULL,
    "commandType" TEXT NOT NULL,
    "controlSource" "MatchControlSource" NOT NULL,
    "payloadSnapshot" JSONB NOT NULL,
    "commandId" UUID NOT NULL,
    "idempotencyKey" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchCommandLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonHistory" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "summaryJson" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordBook" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "recordCode" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'WORLD',
    "holderType" TEXT,
    "holderId" UUID,
    "clubId" UUID,
    "competitionId" UUID,
    "seasonNumber" INTEGER,
    "valueNumeric" DECIMAL(18,4),
    "valueText" TEXT,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubHistoryEntry" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "entryType" TEXT NOT NULL,
    "seasonNumber" INTEGER,
    "competitionId" UUID,
    "title" TEXT NOT NULL,
    "detailJson" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerCareerHistory" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "clubId" UUID,
    "entryType" TEXT NOT NULL DEFAULT 'CLUB_SPELL',
    "joinedAtSeason" INTEGER,
    "leftAtSeason" INTEGER,
    "appearances" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "detailJson" JSONB,
    "reason" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerCareerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferHistory" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "fromClubId" UUID,
    "toClubId" UUID,
    "type" "TransferType" NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'COMPLETED',
    "currencyId" UUID NOT NULL,
    "transferFeeMinor" BIGINT NOT NULL DEFAULT 0,
    "seasonNumber" INTEGER,
    "sourceOfferId" UUID,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_email_key" ON "UserAccount"("email");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_gameWorldId_idx" ON "UserSession"("gameWorldId");

-- CreateIndex
CREATE INDEX "WorldParticipant_gameWorldId_idx" ON "WorldParticipant"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldParticipant_gameWorldId_userId_key" ON "WorldParticipant"("gameWorldId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldParticipant_gameWorldId_id_key" ON "WorldParticipant"("gameWorldId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCredential_userId_key" ON "UserCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthRefreshToken_tokenHash_key" ON "AuthRefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthRefreshToken_userId_idx" ON "AuthRefreshToken"("userId");

-- CreateIndex
CREATE INDEX "AuthRefreshToken_family_idx" ON "AuthRefreshToken"("family");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "RolePermission"("role", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "GameEconomyConfig_gameWorldId_key" ON "GameEconomyConfig"("gameWorldId");

-- CreateIndex
CREATE INDEX "EconomySnapshot_gameWorldId_idx" ON "EconomySnapshot"("gameWorldId");

-- CreateIndex
CREATE INDEX "Season_gameWorldId_idx" ON "Season"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_gameWorldId_number_key" ON "Season"("gameWorldId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Season_gameWorldId_id_key" ON "Season"("gameWorldId", "id");

-- CreateIndex
CREATE INDEX "Club_gameWorldId_idx" ON "Club"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_gameWorldId_slug_key" ON "Club"("gameWorldId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Club_gameWorldId_id_key" ON "Club"("gameWorldId", "id");

-- CreateIndex
CREATE INDEX "ClubControl_gameWorldId_clubId_idx" ON "ClubControl"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "ClubControl_worldParticipantId_idx" ON "ClubControl"("worldParticipantId");

-- CreateIndex
CREATE INDEX "ClubDepartment_gameWorldId_clubId_idx" ON "ClubDepartment"("gameWorldId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubDepartment_clubId_type_key" ON "ClubDepartment"("clubId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ClubAIProfile_clubId_key" ON "ClubAIProfile"("clubId");

-- CreateIndex
CREATE INDEX "Person_gameWorldId_idx" ON "Person"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_gameWorldId_id_key" ON "Person"("gameWorldId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Player_personId_key" ON "Player"("personId");

-- CreateIndex
CREATE INDEX "Player_gameWorldId_clubId_idx" ON "Player"("gameWorldId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameWorldId_personId_key" ON "Player"("gameWorldId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameWorldId_id_key" ON "Player"("gameWorldId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAttributes_playerId_key" ON "PlayerAttributes"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBackground_playerId_key" ON "PlayerBackground"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPersonality_playerId_key" ON "PlayerPersonality"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerDevelopment_playerId_key" ON "PlayerDevelopment"("playerId");

-- CreateIndex
CREATE INDEX "PlayerContract_gameWorldId_playerId_idx" ON "PlayerContract"("gameWorldId", "playerId");

-- CreateIndex
CREATE INDEX "PlayerContract_clubId_idx" ON "PlayerContract"("clubId");

-- CreateIndex
CREATE INDEX "PlayerInjury_gameWorldId_playerId_idx" ON "PlayerInjury"("gameWorldId", "playerId");

-- CreateIndex
CREATE INDEX "PlayerSuspension_gameWorldId_playerId_idx" ON "PlayerSuspension"("gameWorldId", "playerId");

-- CreateIndex
CREATE INDEX "PlayerSuspension_gameWorldId_competitionSeasonId_idx" ON "PlayerSuspension"("gameWorldId", "competitionSeasonId");

-- CreateIndex
CREATE INDEX "PlayerCompetitionDiscipline_gameWorldId_competitionSeasonId_idx" ON "PlayerCompetitionDiscipline"("gameWorldId", "competitionSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCompetitionDiscipline_gameWorldId_playerId_competitio_key" ON "PlayerCompetitionDiscipline"("gameWorldId", "playerId", "competitionSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_personId_key" ON "StaffMember"("personId");

-- CreateIndex
CREATE INDEX "StaffMember_gameWorldId_idx" ON "StaffMember"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_gameWorldId_personId_key" ON "StaffMember"("gameWorldId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_gameWorldId_id_key" ON "StaffMember"("gameWorldId", "id");

-- CreateIndex
CREATE INDEX "StaffContract_gameWorldId_clubId_idx" ON "StaffContract"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "StaffContract_gameWorldId_staffId_idx" ON "StaffContract"("gameWorldId", "staffId");

-- CreateIndex
CREATE INDEX "TrainingPlan_gameWorldId_clubId_idx" ON "TrainingPlan"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "TrainingPlayerEntry_trainingPlanId_idx" ON "TrainingPlayerEntry"("trainingPlanId");

-- CreateIndex
CREATE INDEX "TrainingPlayerEntry_playerId_idx" ON "TrainingPlayerEntry"("playerId");

-- CreateIndex
CREATE INDEX "Squad_gameWorldId_clubId_idx" ON "Squad"("gameWorldId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_gameWorldId_id_key" ON "Squad"("gameWorldId", "id");

-- CreateIndex
CREATE INDEX "SquadMembership_playerId_idx" ON "SquadMembership"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadMembership_squadId_playerId_key" ON "SquadMembership"("squadId", "playerId");

-- CreateIndex
CREATE INDEX "ScoutReport_gameWorldId_clubId_idx" ON "ScoutReport"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "ScoutReport_playerId_idx" ON "ScoutReport"("playerId");

-- CreateIndex
CREATE INDEX "TransferListing_gameWorldId_clubId_idx" ON "TransferListing"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "TransferListing_playerId_idx" ON "TransferListing"("playerId");

-- CreateIndex
CREATE INDEX "Offer_gameWorldId_playerId_idx" ON "Offer"("gameWorldId", "playerId");

-- CreateIndex
CREATE INDEX "Offer_buyingClubId_idx" ON "Offer"("buyingClubId");

-- CreateIndex
CREATE INDEX "Offer_listingId_idx" ON "Offer"("listingId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_gameWorldId_clubId_idx" ON "FinancialTransaction"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "ClubFinanceSnapshot_gameWorldId_clubId_idx" ON "ClubFinanceSnapshot"("gameWorldId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubFinanceSnapshot_clubId_seasonId_key" ON "ClubFinanceSnapshot"("clubId", "seasonId");

-- CreateIndex
CREATE INDEX "Competition_gameWorldId_idx" ON "Competition"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_gameWorldId_id_key" ON "Competition"("gameWorldId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionSeason_competitionId_seasonId_key" ON "CompetitionSeason"("competitionId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionClub_competitionSeasonId_clubId_key" ON "CompetitionClub"("competitionSeasonId", "clubId");

-- CreateIndex
CREATE INDEX "CompetitionStage_competitionSeasonId_idx" ON "CompetitionStage"("competitionSeasonId");

-- CreateIndex
CREATE INDEX "Match_gameWorldId_idx" ON "Match"("gameWorldId");

-- CreateIndex
CREATE INDEX "Match_competitionSeasonId_idx" ON "Match"("competitionSeasonId");

-- CreateIndex
CREATE INDEX "Match_homeClubId_idx" ON "Match"("homeClubId");

-- CreateIndex
CREATE INDEX "Match_awayClubId_idx" ON "Match"("awayClubId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSimulation_matchId_key" ON "MatchSimulation"("matchId");

-- CreateIndex
CREATE INDEX "MatchSimulationTick_simulationId_idx" ON "MatchSimulationTick"("simulationId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchTeamState_matchId_clubId_key" ON "MatchTeamState"("matchId", "clubId");

-- CreateIndex
CREATE INDEX "MatchLineup_matchId_idx" ON "MatchLineup"("matchId");

-- CreateIndex
CREATE INDEX "MatchLineupPlayer_lineupId_idx" ON "MatchLineupPlayer"("lineupId");

-- CreateIndex
CREATE INDEX "MatchLineupPlayer_playerId_idx" ON "MatchLineupPlayer"("playerId");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_idx" ON "MatchEvent"("matchId");

-- CreateIndex
CREATE INDEX "MatchEvent_playerId_idx" ON "MatchEvent"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchEvent_matchId_eventSequence_key" ON "MatchEvent"("matchId", "eventSequence");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchStats_matchId_playerId_key" ON "PlayerMatchStats"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "MatchDecisionPoint_matchId_idx" ON "MatchDecisionPoint"("matchId");

-- CreateIndex
CREATE INDEX "MatchActionRecommendation_decisionPointId_idx" ON "MatchActionRecommendation"("decisionPointId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSeasonStats_clubId_seasonId_competitionSeasonId_key" ON "ClubSeasonStats"("clubId", "seasonId", "competitionSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonStats_playerId_seasonId_competitionSeasonId_key" ON "PlayerSeasonStats"("playerId", "seasonId", "competitionSeasonId");

-- CreateIndex
CREATE INDEX "Narrative_gameWorldId_idx" ON "Narrative"("gameWorldId");

-- CreateIndex
CREATE INDEX "Notification_gameWorldId_idx" ON "Notification"("gameWorldId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "GameAuditLog_gameWorldId_idx" ON "GameAuditLog"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRuleConfig_gameWorldId_key_key" ON "GameRuleConfig"("gameWorldId", "key");

-- CreateIndex
CREATE INDEX "AutomationRule_gameWorldId_clubId_idx" ON "AutomationRule"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "OutboxEvent_gameWorldId_status_idx" ON "OutboxEvent"("gameWorldId", "status");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_gameWorldId_sequence_key" ON "OutboxEvent"("gameWorldId", "sequence");

-- CreateIndex
CREATE INDEX "InboxDedup_gameWorldId_idx" ON "InboxDedup"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "InboxDedup_consumerName_eventId_key" ON "InboxDedup"("consumerName", "eventId");

-- CreateIndex
CREATE INDEX "DomainEventLog_gameWorldId_eventType_idx" ON "DomainEventLog"("gameWorldId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "DomainEventLog_gameWorldId_aggregateType_aggregateId_aggreg_key" ON "DomainEventLog"("gameWorldId", "aggregateType", "aggregateId", "aggregateVersion");

-- CreateIndex
CREATE UNIQUE INDEX "DomainEventLog_gameWorldId_sequence_key" ON "DomainEventLog"("gameWorldId", "sequence");

-- CreateIndex
CREATE INDEX "IdempotencyKey_gameWorldId_idx" ON "IdempotencyKey"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_actorId_idempotencyKey_key" ON "IdempotencyKey"("actorId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_commandId_key" ON "IdempotencyKey"("commandId");

-- CreateIndex
CREATE INDEX "SagaInstance_gameWorldId_status_idx" ON "SagaInstance"("gameWorldId", "status");

-- CreateIndex
CREATE INDEX "SagaInstance_sagaType_status_idx" ON "SagaInstance"("sagaType", "status");

-- CreateIndex
CREATE INDEX "SagaStep_sagaInstanceId_idx" ON "SagaStep"("sagaInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "SagaStep_sagaInstanceId_stepIndex_key" ON "SagaStep"("sagaInstanceId", "stepIndex");

-- CreateIndex
CREATE INDEX "FinancialAccount_gameWorldId_clubId_idx" ON "FinancialAccount"("gameWorldId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_gameWorldId_ownerScope_accountCode_key" ON "FinancialAccount"("gameWorldId", "ownerScope", "accountCode");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_gameWorldId_systemAccount_key" ON "FinancialAccount"("gameWorldId", "systemAccount");

-- CreateIndex
CREATE INDEX "JournalEntry_gameWorldId_clubId_idx" ON "JournalEntry"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "JournalEntry_gameWorldId_status_idx" ON "JournalEntry"("gameWorldId", "status");

-- CreateIndex
CREATE INDEX "JournalLine_financialAccountId_idx" ON "JournalLine"("financialAccountId");

-- CreateIndex
CREATE INDEX "JournalLine_gameWorldId_idx" ON "JournalLine"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalLine_journalEntryId_lineNumber_key" ON "JournalLine"("journalEntryId", "lineNumber");

-- CreateIndex
CREATE INDEX "PlayerDevelopmentAccrual_gameWorldId_playerId_idx" ON "PlayerDevelopmentAccrual"("gameWorldId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerDevelopmentAccrual_playerId_seasonId_attributeCode_key" ON "PlayerDevelopmentAccrual"("playerId", "seasonId", "attributeCode");

-- CreateIndex
CREATE INDEX "CompetitionRegistration_gameWorldId_clubId_idx" ON "CompetitionRegistration"("gameWorldId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionRegistration_competitionSeasonId_clubId_key" ON "CompetitionRegistration"("competitionSeasonId", "clubId");

-- CreateIndex
CREATE INDEX "PlayerRegistration_gameWorldId_playerId_idx" ON "PlayerRegistration"("gameWorldId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRegistration_registrationId_playerId_key" ON "PlayerRegistration"("registrationId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRegistration_registrationId_shirtNumber_key" ON "PlayerRegistration"("registrationId", "shirtNumber");

-- CreateIndex
CREATE INDEX "MatchCommandLog_gameWorldId_idx" ON "MatchCommandLog"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchCommandLog_simulationId_matchSequence_key" ON "MatchCommandLog"("simulationId", "matchSequence");

-- CreateIndex
CREATE INDEX "SeasonHistory_gameWorldId_idx" ON "SeasonHistory"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonHistory_gameWorldId_seasonNumber_key" ON "SeasonHistory"("gameWorldId", "seasonNumber");

-- CreateIndex
CREATE INDEX "RecordBook_gameWorldId_recordCode_idx" ON "RecordBook"("gameWorldId", "recordCode");

-- CreateIndex
CREATE INDEX "ClubHistoryEntry_gameWorldId_clubId_idx" ON "ClubHistoryEntry"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "PlayerCareerHistory_gameWorldId_playerId_idx" ON "PlayerCareerHistory"("gameWorldId", "playerId");

-- CreateIndex
CREATE INDEX "TransferHistory_gameWorldId_playerId_idx" ON "TransferHistory"("gameWorldId", "playerId");

-- CreateIndex
CREATE INDEX "TransferHistory_gameWorldId_toClubId_idx" ON "TransferHistory"("gameWorldId", "toClubId");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldParticipant" ADD CONSTRAINT "WorldParticipant_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldParticipant" ADD CONSTRAINT "WorldParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCredential" ADD CONSTRAINT "UserCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthRefreshToken" ADD CONSTRAINT "AuthRefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEconomyConfig" ADD CONSTRAINT "GameEconomyConfig_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomySnapshot" ADD CONSTRAINT "EconomySnapshot_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubControl" ADD CONSTRAINT "ClubControl_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubControl" ADD CONSTRAINT "ClubControl_worldParticipantId_fkey" FOREIGN KEY ("worldParticipantId") REFERENCES "WorldParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubDepartment" ADD CONSTRAINT "ClubDepartment_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubAIProfile" ADD CONSTRAINT "ClubAIProfile_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameWorldId_personId_fkey" FOREIGN KEY ("gameWorldId", "personId") REFERENCES "Person"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAttributes" ADD CONSTRAINT "PlayerAttributes_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerBackground" ADD CONSTRAINT "PlayerBackground_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPersonality" ADD CONSTRAINT "PlayerPersonality_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerDevelopment" ADD CONSTRAINT "PlayerDevelopment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerContract" ADD CONSTRAINT "PlayerContract_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerContract" ADD CONSTRAINT "PlayerContract_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerInjury" ADD CONSTRAINT "PlayerInjury_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSuspension" ADD CONSTRAINT "PlayerSuspension_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCompetitionDiscipline" ADD CONSTRAINT "PlayerCompetitionDiscipline_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_gameWorldId_personId_fkey" FOREIGN KEY ("gameWorldId", "personId") REFERENCES "Person"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffContract" ADD CONSTRAINT "StaffContract_gameWorldId_staffId_fkey" FOREIGN KEY ("gameWorldId", "staffId") REFERENCES "StaffMember"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffContract" ADD CONSTRAINT "StaffContract_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlayerEntry" ADD CONSTRAINT "TrainingPlayerEntry_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlayerEntry" ADD CONSTRAINT "TrainingPlayerEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMembership" ADD CONSTRAINT "SquadMembership_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMembership" ADD CONSTRAINT "SquadMembership_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutReport" ADD CONSTRAINT "ScoutReport_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutReport" ADD CONSTRAINT "ScoutReport_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferListing" ADD CONSTRAINT "TransferListing_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferListing" ADD CONSTRAINT "TransferListing_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "TransferListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyingClubId_fkey" FOREIGN KEY ("buyingClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sellingClubId_fkey" FOREIGN KEY ("sellingClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubFinanceSnapshot" ADD CONSTRAINT "ClubFinanceSnapshot_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionSeason" ADD CONSTRAINT "CompetitionSeason_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionClub" ADD CONSTRAINT "CompetitionClub_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionStage" ADD CONSTRAINT "CompetitionStage_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CompetitionStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSimulation" ADD CONSTRAINT "MatchSimulation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSimulationTick" ADD CONSTRAINT "MatchSimulationTick_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "MatchSimulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTeamState" ADD CONSTRAINT "MatchTeamState_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineupPlayer" ADD CONSTRAINT "MatchLineupPlayer_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "MatchLineup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineupPlayer" ADD CONSTRAINT "MatchLineupPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_relatedPlayerId_fkey" FOREIGN KEY ("relatedPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchStats" ADD CONSTRAINT "PlayerMatchStats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchStats" ADD CONSTRAINT "PlayerMatchStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDecisionPoint" ADD CONSTRAINT "MatchDecisionPoint_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchActionRecommendation" ADD CONSTRAINT "MatchActionRecommendation_decisionPointId_fkey" FOREIGN KEY ("decisionPointId") REFERENCES "MatchDecisionPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSeasonStats" ADD CONSTRAINT "ClubSeasonStats_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSeasonStats" ADD CONSTRAINT "ClubSeasonStats_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeasonStats" ADD CONSTRAINT "PlayerSeasonStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeasonStats" ADD CONSTRAINT "PlayerSeasonStats_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Narrative" ADD CONSTRAINT "Narrative_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAuditLog" ADD CONSTRAINT "GameAuditLog_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRuleConfig" ADD CONSTRAINT "GameRuleConfig_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SagaStep" ADD CONSTRAINT "SagaStep_sagaInstanceId_fkey" FOREIGN KEY ("sagaInstanceId") REFERENCES "SagaInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerDevelopmentAccrual" ADD CONSTRAINT "PlayerDevelopmentAccrual_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRegistration" ADD CONSTRAINT "PlayerRegistration_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "CompetitionRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchCommandLog" ADD CONSTRAINT "MatchCommandLog_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "MatchSimulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
