Monte todas as entidades do banco de dados prismajs sem perder nenhum detalhe

Vou consolidar como um modelo Prisma completo do core do jogo, separando identidade do usuário, clubes, jogadores, comissão, economia, campeonatos, partidas, IA, eventos e histórico. Vou priorizar uma estrutura robusta e reaproveitável, sem cair em MVP.

Pensou por 12s

Abaixo está uma primeira versão bem completa do schema PrismaJS para o jogo estilo Brasfoot online que estamos desenhando: clubes pequenos gerados, evolução por estrutura, jogadores únicos, comissão técnica, IA, economia dinâmica, campeonatos online, simulação de partida, eventos, decisões táticas, histórico e balanceamento global.

Usei PostgreSQL como base.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

/**
 * =========================
 * ENUMS GERAIS
 * =========================
 */

enum UserRole {
  PLAYER
  MODERATOR
  ADMIN
}

enum WorldStatus {
  CREATING
  ACTIVE
  PAUSED
  FINISHED
  ARCHIVED
}

enum ClubControlType {
  USER
  AI
}

enum ClubStatus {
  ACTIVE
  INACTIVE
  BANKRUPT
  BOT_RESERVED
}

enum SeasonStatus {
  PLANNED
  ACTIVE
  FINISHED
  ARCHIVED
}

enum Gender {
  MALE
  FEMALE
}

enum DominantFoot {
  LEFT
  RIGHT
  BOTH
}

enum PlayerStatus {
  ACTIVE
  RETIRED
  FREE_AGENT
  INJURED
  SUSPENDED
}

enum PlayerGenerationSource {
  INITIAL_WORLD
  SCOUT_FOUND
  YOUTH_ACADEMY
  REGEN_AFTER_RETIREMENT
  MARKET_BALANCE
}

enum PlayerPosition {
  GK
  CB
  LB
  RB
  LWB
  RWB
  CDM
  CM
  CAM
  LM
  RM
  LW
  RW
  ST
  CF
}

enum StaffRole {
  HEAD_COACH
  ASSISTANT_COACH
  FITNESS_COACH
  GOALKEEPER_COACH
  SCOUT
  DOCTOR
  PHYSIOTHERAPIST
  PSYCHOLOGIST
  DIRECTOR
  NEGOTIATOR
  COMMUNICATION_MANAGER
  YOUTH_COORDINATOR
}

enum StaffQualityTier {
  VERY_LOW
  LOW
  MEDIUM
  HIGH
  ELITE
}

enum DepartmentType {
  MEDICAL
  TRAINING
  YOUTH_ACADEMY
  SCOUTING
  COMMUNICATION
  BOARD
  FINANCE
  INFRASTRUCTURE
  STADIUM
  DATA_ANALYSIS
}

enum ContractStatus {
  ACTIVE
  EXPIRED
  TERMINATED
  RENEWED
  TRANSFERRED
}

enum TransferStatus {
  LISTED
  NEGOTIATING
  ACCEPTED
  REJECTED
  CANCELLED
  COMPLETED
  EXPIRED
}

enum TransferType {
  PERMANENT
  LOAN
  FREE_AGENT
  CONTRACT_END
}

enum CompetitionType {
  LEAGUE
  CUP
  SUPER_CUP
  INTERNATIONAL_CUP
  FRIENDLY
}

enum CompetitionFormat {
  ROUND_ROBIN
  DOUBLE_ROUND_ROBIN
  KNOCKOUT
  GROUPS_AND_KNOCKOUT
  SWISS
}

enum MatchStatus {
  SCHEDULED
  LIVE
  PAUSED
  FINISHED
  CANCELLED
  WALKOVER
  SIMULATED_OFFLINE
}

enum MatchEventType {
  GOAL
  OWN_GOAL
  ASSIST
  YELLOW_CARD
  RED_CARD
  INJURY
  SUBSTITUTION
  TACTICAL_CHANGE
  PENALTY_AWARDED
  PENALTY_MISSED
  PENALTY_SCORED
  FREE_KICK
  SHOT
  SHOT_ON_TARGET
  SAVE
  FOUL
  OFFSIDE
  VAR_CHECK
  MOMENTUM_SHIFT
  FATIGUE_ALERT
  AI_DECISION
}

enum TacticalMentality {
  VERY_DEFENSIVE
  DEFENSIVE
  BALANCED
  OFFENSIVE
  VERY_OFFENSIVE
}

enum PressingIntensity {
  LOW
  MEDIUM
  HIGH
  VERY_HIGH
}

enum MarkingStyle {
  ZONAL
  MAN_TO_MAN
  MIXED
}

enum TempoStyle {
  SLOW
  NORMAL
  FAST
  DIRECT
}

enum MatchControlSource {
  USER_ONLINE
  USER_OFFLINE_AI
  FULL_AI
  SYSTEM
}

enum DecisionPointType {
  INJURY
  RED_CARD
  FATIGUE
  BAD_PERFORMANCE
  LOSING_GAME
  WINNING_GAME
  TACTICAL_OPPORTUNITY
  OPPONENT_WEAKNESS
  PLAYER_RISK
  FINAL_PRESSURE
}

enum RecommendationImpact {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum NotificationType {
  MATCH_EVENT
  MATCH_DECISION_POINT
  TRANSFER_OFFER
  CONTRACT_ALERT
  INJURY_ALERT
  FINANCE_ALERT
  FAN_REACTION
  BOARD_MESSAGE
  COMPETITION_UPDATE
  SCOUT_REPORT
  TRAINING_REPORT
}

enum FinanceTransactionType {
  TICKET_REVENUE
  SPONSORSHIP
  PLAYER_SALE
  PLAYER_PURCHASE
  WAGE_PAYMENT
  STAFF_WAGE_PAYMENT
  STADIUM_COST
  STRUCTURE_UPGRADE
  PRIZE_MONEY
  TAX
  MAINTENANCE
  LOAN_PAYMENT
  OTHER_INCOME
  OTHER_EXPENSE
}

enum NarrativeType {
  FAN_PRESSURE
  MEDIA_RUMOR
  PLAYER_UNHAPPY
  BOARD_PRESSURE
  DERBY_HYPE
  TITLE_RACE
  RELEGATION_RISK
  TRANSFER_SPECULATION
  COMEBACK_STORY
}

enum MoodLevel {
  VERY_LOW
  LOW
  NEUTRAL
  HIGH
  VERY_HIGH
}

enum InjurySeverity {
  MINOR
  LIGHT
  MODERATE
  SERIOUS
  CRITICAL
}

enum TrainingFocus {
  PHYSICAL
  TECHNICAL
  TACTICAL
  MENTAL
  DEFENSIVE
  OFFENSIVE
  SET_PIECES
  RECOVERY
  INDIVIDUAL_ROLE
}

/**
 * =========================
 * USUÁRIOS E MUNDO
 * =========================
 */

model User {
  id          String   @id @default(cuid())
  name        String
  email       String   @unique
  role        UserRole @default(PLAYER)
  avatarUrl   String?
  lastLoginAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  clubs       ClubUser[]
  sessions    UserSession[]
  notifications Notification[]

  @@index([email])
}

model UserSession {
  id        String   @id @default(cuid())
  userId    String
  worldId   String?
  isOnline  Boolean  @default(false)
  lastSeenAt DateTime @default(now())
  device    String?
  ipAddress String?

  user      User   @relation(fields: [userId], references: [id])
  world     GameWorld? @relation(fields: [worldId], references: [id])

  @@index([userId])
  @@index([worldId])
  @@index([isOnline])
}

model GameWorld {
  id          String      @id @default(cuid())
  name        String
  status      WorldStatus @default(CREATING)

  currentSeasonId String?
  currentDate     DateTime
  timezone        String @default("America/Sao_Paulo")

  maxClubs        Int
  initialClubCash Decimal @db.Decimal(14, 2)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  seasons       Season[]
  clubs         Club[]
  users         UserSession[]
  economyConfig GameEconomyConfig?
  economySnapshots EconomySnapshot[]
  competitions  Competition[]
  players       Player[]
  staffMembers  StaffMember[]
  matchSimulations MatchSimulation[]
  narratives    Narrative[]

  @@index([status])
}

model Season {
  id        String       @id @default(cuid())
  worldId   String
  number    Int
  name      String
  status    SeasonStatus @default(PLANNED)

  startsAt  DateTime
  endsAt    DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  world     GameWorld @relation(fields: [worldId], references: [id])

  clubSeasonStats ClubSeasonStats[]
  playerSeasonStats PlayerSeasonStats[]
  competitionSeasons CompetitionSeason[]
  financeSnapshots ClubFinanceSnapshot[]
  economySnapshots EconomySnapshot[]

  @@unique([worldId, number])
  @@index([worldId, status])
}

/**
 * =========================
 * CONFIGURAÇÃO ECONÔMICA GLOBAL
 * =========================
 */

model GameEconomyConfig {
  id      String @id @default(cuid())
  worldId String @unique

  basePlayerPriceMultiplier Decimal @db.Decimal(8, 4)
  baseWageMultiplier        Decimal @db.Decimal(8, 4)

  clubCountWeight           Decimal @db.Decimal(8, 4)
  activePlayerCountWeight   Decimal @db.Decimal(8, 4)
  retiredPlayerCountWeight  Decimal @db.Decimal(8, 4)
  freeAgentCountWeight      Decimal @db.Decimal(8, 4)
  moneySupplyWeight         Decimal @db.Decimal(8, 4)

  minGeneratedPlayerAge Int
  maxGeneratedPlayerAge Int

  targetPlayersPerClub  Int
  targetFreeAgentRatio  Decimal @db.Decimal(5, 4)

  inflationRatePerSeason Decimal @db.Decimal(6, 4) @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  world GameWorld @relation(fields: [worldId], references: [id])
}

model EconomySnapshot {
  id       String @id @default(cuid())
  worldId  String
  seasonId String?

  totalClubs         Int
  totalActiveClubs   Int
  totalPlayers       Int
  totalActivePlayers Int
  totalRetiredPlayers Int
  totalFreeAgents    Int

  totalCashInWorld   Decimal @db.Decimal(16, 2)
  averageClubCash    Decimal @db.Decimal(14, 2)
  averagePlayerValue Decimal @db.Decimal(14, 2)
  averageWage        Decimal @db.Decimal(14, 2)

  marketInflationIndex Decimal @db.Decimal(10, 4)
  playerScarcityIndex  Decimal @db.Decimal(10, 4)
  balanceScore         Decimal @db.Decimal(10, 4)

  createdAt DateTime @default(now())

  world  GameWorld @relation(fields: [worldId], references: [id])
  season Season?   @relation(fields: [seasonId], references: [id])

  @@index([worldId])
  @@index([seasonId])
}

/**
 * =========================
 * CLUBES
 * =========================
 */

model Club {
  id      String @id @default(cuid())
  worldId String

  name       String
  shortName  String
  slug       String
  city       String?
  country    String
  foundedYear Int?

  controlType ClubControlType @default(AI)
  status      ClubStatus      @default(ACTIVE)

  reputation       Int @default(1)
  level            Int @default(1)
  fanBaseSize      Int @default(0)
  boardPatience    Int @default(50)
  pressureLevel    Int @default(0)

  cash             Decimal @db.Decimal(14, 2)
  wageBudget       Decimal @db.Decimal(14, 2)
  transferBudget   Decimal @db.Decimal(14, 2)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  world GameWorld @relation(fields: [worldId], references: [id])

  users          ClubUser[]
  structures     ClubDepartment[]
  players        Player[]
  staffContracts StaffContract[]
  playerContracts PlayerContract[]
  finances       FinancialTransaction[]
  financeSnapshots ClubFinanceSnapshot[]
  seasonStats    ClubSeasonStats[]
  transferListings TransferListing[]
  transferOffersMade TransferOffer[] @relation("TransferOfferBuyingClub")
  transferOffersReceived TransferOffer[] @relation("TransferOfferSellingClub")
  homeMatches    Match[] @relation("HomeClub")
  awayMatches    Match[] @relation("AwayClub")
  matchStates    MatchTeamState[]
  lineups        MatchLineup[]
  trainingPlans  TrainingPlan[]
  aiProfile      ClubAIProfile?
  narratives     Narrative[]
  notifications  Notification[]
  scoutingReports ScoutReport[]
  fanSentiments FanSentiment[]

  @@unique([worldId, slug])
  @@index([worldId])
  @@index([controlType])
  @@index([level])
}

model ClubUser {
  id      String @id @default(cuid())
  userId  String
  clubId  String

  isOwner Boolean @default(true)
  joinedAt DateTime @default(now())
  leftAt   DateTime?

  user User @relation(fields: [userId], references: [id])
  club Club @relation(fields: [clubId], references: [id])

  @@unique([userId, clubId])
  @@index([clubId])
}

model ClubDepartment {
  id      String @id @default(cuid())
  clubId  String
  type    DepartmentType

  level        Int @default(1)
  maxLevel     Int @default(5)
  qualityScore Int @default(10)

  maintenanceCostPerSeason Decimal @db.Decimal(14, 2)
  upgradeCost              Decimal @db.Decimal(14, 2)

  effectJson Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  club Club @relation(fields: [clubId], references: [id])

  @@unique([clubId, type])
  @@index([type])
}

/**
 * =========================
 * JOGADORES ÚNICOS
 * =========================
 */

model Player {
  id      String @id @default(cuid())
  worldId String
  clubId  String?

  firstName String
  lastName  String
  knownName String?

  nationality String
  birthDate   DateTime
  ageVirtual  Int

  gender Gender @default(MALE)

  primaryPosition   PlayerPosition
  secondaryPosition PlayerPosition?
  dominantFoot      DominantFoot

  heightCm Int?
  weightKg Int?

  status PlayerStatus @default(ACTIVE)

  generationSource PlayerGenerationSource
  generatedAtSeasonNumber Int?

  currentAbility   Int
  potentialAbility Int

  marketValue Decimal @db.Decimal(14, 2)
  wageExpectation Decimal @db.Decimal(14, 2)

  morale       Int @default(50)
  confidence   Int @default(50)
  happiness    Int @default(50)
  fatigue      Int @default(0)
  matchSharpness Int @default(50)

  injuryProneness Int @default(50)
  consistency     Int @default(50)
  ambition        Int @default(50)
  loyalty         Int @default(50)
  professionalism Int @default(50)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  world GameWorld @relation(fields: [worldId], references: [id])
  club  Club?     @relation(fields: [clubId], references: [id])

  attributes       PlayerAttributes?
  background       PlayerBackground?
  personality      PlayerPersonality?
  development      PlayerDevelopment?
  contracts        PlayerContract[]
  histories        PlayerClubHistory[]
  injuries         PlayerInjury[]
  suspensions      PlayerSuspension[]
  seasonStats      PlayerSeasonStats[]
  matchStats       PlayerMatchStats[]
  lineupEntries    MatchLineupPlayer[]
  matchEvents      MatchEvent[]
  trainingEntries  TrainingPlayerEntry[]
  scoutReports     ScoutReport[]
  transferListings TransferListing[]
  transferOffers   TransferOffer[]
  narratives       Narrative[]

  @@index([worldId])
  @@index([clubId])
  @@index([status])
  @@index([primaryPosition])
  @@index([currentAbility])
  @@index([potentialAbility])
}

model PlayerAttributes {
  id       String @id @default(cuid())
  playerId String @unique

  finishing      Int
  longShots      Int
  heading        Int
  passing        Int
  crossing       Int
  dribbling      Int
  firstTouch     Int
  technique      Int
  tackling       Int
  marking        Int
  positioning    Int

  acceleration   Int
  pace           Int
  stamina        Int
  strength       Int
  agility        Int
  balance        Int
  jumping        Int

  bravery        Int
  aggression     Int
  composure      Int
  decisions      Int
  concentration  Int
  leadership     Int
  teamwork       Int
  workRate       Int
  determination  Int
  flair          Int

  goalkeeperReflexes    Int?
  goalkeeperHandling    Int?
  goalkeeperPositioning Int?
  goalkeeperKicking     Int?
  goalkeeperOneOnOne    Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  player Player @relation(fields: [playerId], references: [id])
}

model PlayerBackground {
  id       String @id @default(cuid())
  playerId String @unique

  childhoodPovertyLevel Int @default(0)
  familyStability       Int @default(50)
  violenceExposure      Int @default(0)
  educationLevel        Int @default(50)
  earlyFootballAccess   Int @default(50)

  fatherPresenceScore   Int?
  motherPresenceScore   Int?
  guardianStory         String?

  lifeStorySummary String?

  generatedTraitJson Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  player Player @relation(fields: [playerId], references: [id])
}

model PlayerPersonality {
  id       String @id @default(cuid())
  playerId String @unique

  grit             Int
  emotionalStability Int
  discipline       Int
  ego              Int
  pressureHandling Int
  adaptability     Int
  socialInfluence  Int
  mediaHandling    Int

  offFieldRisk     Int
  lifestyleBalance Int

  hiddenTraits Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  player Player @relation(fields: [playerId], references: [id])
}

model PlayerDevelopment {
  id       String @id @default(cuid())
  playerId String @unique

  technicalGrowthRate Decimal @db.Decimal(6, 4)
  physicalGrowthRate  Decimal @db.Decimal(6, 4)
  mentalGrowthRate    Decimal @db.Decimal(6, 4)

  peakAgeStart Int
  peakAgeEnd   Int
  declineRate  Decimal @db.Decimal(6, 4)

  trainingResponse Int
  injuryImpactAccumulated Int @default(0)

  lastDevelopmentAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  player Player @relation(fields: [playerId], references: [id])
}

model PlayerClubHistory {
  id       String @id @default(cuid())
  playerId String
  clubId   String

  joinedAtSeason Int
  leftAtSeason   Int?

  appearances Int @default(0)
  goals       Int @default(0)
  assists     Int @default(0)

  reason String?

  player Player @relation(fields: [playerId], references: [id])
  club   Club   @relation(fields: [clubId], references: [id])

  @@index([playerId])
  @@index([clubId])
}

/**
 * =========================
 * CONTRATOS
 * =========================
 */

model PlayerContract {
  id       String @id @default(cuid())
  playerId String
  clubId   String

  status ContractStatus @default(ACTIVE)

  startSeason Int
  endSeason   Int

  salaryPerSeason Decimal @db.Decimal(14, 2)
  signingBonus    Decimal @db.Decimal(14, 2) @default(0)
  releaseClause   Decimal @db.Decimal(14, 2)?

  moralePromiseJson Json?
  roleInSquad String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  player Player @relation(fields: [playerId], references: [id])
  club   Club   @relation(fields: [clubId], references: [id])

  @@index([playerId])
  @@index([clubId])
  @@index([status])
}

model StaffMember {
  id      String @id @default(cuid())
  worldId String

  name        String
  nationality String?
  role        StaffRole
  qualityTier StaffQualityTier

  abilityScore     Int
  potentialScore   Int
  reputation       Int @default(1)

  tacticalKnowledge Int @default(50)
  youthDevelopment  Int @default(50)
  medicalKnowledge  Int @default(50)
  negotiation       Int @default(50)
  communication     Int @default(50)
  discipline        Int @default(50)
  dataAnalysis      Int @default(50)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  world GameWorld @relation(fields: [worldId], references: [id])

  contracts StaffContract[]

  @@index([worldId])
  @@index([role])
}

model StaffContract {
  id       String @id @default(cuid())
  staffId  String
  clubId   String

  status ContractStatus @default(ACTIVE)

  startSeason Int
  endSeason   Int
  salaryPerSeason Decimal @db.Decimal(14, 2)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  staff StaffMember @relation(fields: [staffId], references: [id])
  club  Club        @relation(fields: [clubId], references: [id])

  @@index([staffId])
  @@index([clubId])
  @@index([status])
}

/**
 * =========================
 * TREINAMENTO, LESÕES E SUSPENSÕES
 * =========================
 */

model TrainingPlan {
  id       String @id @default(cuid())
  clubId   String
  seasonId String

  name      String
  focus     TrainingFocus
  intensity Int

  tacticalStyleJson Json?
  createdByStaffId String?

  startsAt DateTime
  endsAt   DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  club Club @relation(fields: [clubId], references: [id])
  season Season @relation(fields: [seasonId], references: [id])

  entries TrainingPlayerEntry[]

  @@index([clubId])
  @@index([seasonId])
}

model TrainingPlayerEntry {
  id        String @id @default(cuid())
  trainingPlanId String
  playerId  String

  focus     TrainingFocus
  workload  Int

  technicalGain Decimal @db.Decimal(8, 4) @default(0)
  physicalGain  Decimal @db.Decimal(8, 4) @default(0)
  mentalGain    Decimal @db.Decimal(8, 4) @default(0)

  fatigueGain   Int @default(0)
  injuryRiskGain Int @default(0)

  createdAt DateTime @default(now())

  trainingPlan TrainingPlan @relation(fields: [trainingPlanId], references: [id])
  player       Player       @relation(fields: [playerId], references: [id])

  @@index([trainingPlanId])
  @@index([playerId])
}

model PlayerInjury {
  id       String @id @default(cuid())
  playerId String

  severity InjurySeverity
  name     String
  description String?

  occurredAt DateTime
  expectedReturnAt DateTime?
  recoveredAt DateTime?

  causedByMatchId String?
  causedByTrainingPlanId String?

  medicalDepartmentLevelAtTime Int?

  player Player @relation(fields: [playerId], references: [id])

  @@index([playerId])
  @@index([occurredAt])
}

model PlayerSuspension {
  id       String @id @default(cuid())
  playerId String

  reason String
  matchesRemaining Int
  competitionSeasonId String?

  startsAt DateTime
  endsAt   DateTime?

  player Player @relation(fields: [playerId], references: [id])

  @@index([playerId])
}

/**
 * =========================
 * SCOUT E GERAÇÃO DE JOGADORES
 * =========================
 */

model ScoutReport {
  id       String @id @default(cuid())
  clubId   String
  playerId String

  scoutStaffId String?

  accuracy Int
  estimatedCurrentAbility Int
  estimatedPotentialAbility Int
  estimatedMarketValue Decimal @db.Decimal(14, 2)

  personalityNotes String?
  backgroundNotes  String?
  recommendationScore Int

  discoveredAt DateTime @default(now())
  expiresAt    DateTime?

  club   Club   @relation(fields: [clubId], references: [id])
  player Player @relation(fields: [playerId], references: [id])

  @@index([clubId])
  @@index([playerId])
}

/**
 * =========================
 * MERCADO E TRANSFERÊNCIAS
 * =========================
 */

model TransferListing {
  id       String @id @default(cuid())
  clubId   String
  playerId String

  status TransferStatus @default(LISTED)
  type   TransferType

  askingPrice Decimal @db.Decimal(14, 2)
  listedAt DateTime @default(now())
  expiresAt DateTime?

  reason String?

  club   Club   @relation(fields: [clubId], references: [id])
  player Player @relation(fields: [playerId], references: [id])

  offers TransferOffer[]

  @@index([clubId])
  @@index([playerId])
  @@index([status])
}

model TransferOffer {
  id        String @id @default(cuid())
  listingId String?
  playerId  String

  buyingClubId  String
  sellingClubId String?

  status TransferStatus @default(NEGOTIATING)
  type   TransferType

  transferFee Decimal @db.Decimal(14, 2)
  salaryOffer Decimal @db.Decimal(14, 2)
  contractSeasons Int

  bonusJson Json?
  clausesJson Json?

  playerInterestScore Int?
  sellingClubInterestScore Int?
  buyingClubNeedScore Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  expiresAt DateTime?

  listing TransferListing? @relation(fields: [listingId], references: [id])
  player  Player @relation(fields: [playerId], references: [id])

  buyingClub  Club  @relation("TransferOfferBuyingClub", fields: [buyingClubId], references: [id])
  sellingClub Club? @relation("TransferOfferSellingClub", fields: [sellingClubId], references: [id])

  @@index([playerId])
  @@index([buyingClubId])
  @@index([sellingClubId])
  @@index([status])
}

/**
 * =========================
 * FINANCEIRO DOS CLUBES
 * =========================
 */

model FinancialTransaction {
  id      String @id @default(cuid())
  clubId  String

  type        FinanceTransactionType
  description String?

  amount Decimal @db.Decimal(14, 2)

  seasonNumber Int?
  occurredAt DateTime @default(now())

  metadata Json?

  club Club @relation(fields: [clubId], references: [id])

  @@index([clubId])
  @@index([type])
  @@index([occurredAt])
}

model ClubFinanceSnapshot {
  id       String @id @default(cuid())
  clubId   String
  seasonId String

  cash Decimal @db.Decimal(14, 2)
  revenue Decimal @db.Decimal(14, 2)
  expenses Decimal @db.Decimal(14, 2)
  wages Decimal @db.Decimal(14, 2)
  transferSpent Decimal @db.Decimal(14, 2)
  transferReceived Decimal @db.Decimal(14, 2)

  debt Decimal @db.Decimal(14, 2) @default(0)
  profit Decimal @db.Decimal(14, 2)

  createdAt DateTime @default(now())

  club Club @relation(fields: [clubId], references: [id])
  season Season @relation(fields: [seasonId], references: [id])

  @@unique([clubId, seasonId])
}

/**
 * =========================
 * COMPETIÇÕES
 * =========================
 */

model Competition {
  id      String @id @default(cuid())
  worldId String

  name    String
  type    CompetitionType
  format  CompetitionFormat

  country String?
  tier    Int?

  reputation Int @default(1)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  world GameWorld @relation(fields: [worldId], references: [id])

  seasons CompetitionSeason[]

  @@index([worldId])
  @@index([type])
}

model CompetitionSeason {
  id            String @id @default(cuid())
  competitionId String
  seasonId      String

  name   String
  status SeasonStatus @default(PLANNED)

  startsAt DateTime
  endsAt   DateTime?

  prizeJson Json?
  rulesJson Json?

  competition Competition @relation(fields: [competitionId], references: [id])
  season      Season      @relation(fields: [seasonId], references: [id])

  clubs  CompetitionClub[]
  stages CompetitionStage[]
  matches Match[]

  @@unique([competitionId, seasonId])
  @@index([seasonId])
}

model CompetitionClub {
  id String @id @default(cuid())
  competitionSeasonId String
  clubId String

  seed Int?
  groupName String?

  competitionSeason CompetitionSeason @relation(fields: [competitionSeasonId], references: [id])

  @@unique([competitionSeasonId, clubId])
}

model CompetitionStage {
  id String @id @default(cuid())
  competitionSeasonId String

  name String
  order Int
  format CompetitionFormat

  startsAt DateTime?
  endsAt DateTime?

  competitionSeason CompetitionSeason @relation(fields: [competitionSeasonId], references: [id])

  matches Match[]

  @@index([competitionSeasonId])
}

/**
 * =========================
 * PARTIDAS E SIMULAÇÃO
 * =========================
 */

model Match {
  id String @id @default(cuid())

  competitionSeasonId String?
  stageId String?

  homeClubId String
  awayClubId String

  seasonNumber Int
  roundNumber  Int?

  scheduledAt DateTime
  startedAt   DateTime?
  finishedAt  DateTime?

  status MatchStatus @default(SCHEDULED)

  homeGoals Int @default(0)
  awayGoals Int @default(0)

  homeExpectedGoals Decimal? @db.Decimal(8, 4)
  awayExpectedGoals Decimal? @db.Decimal(8, 4)

  simulationSeed String?
  simulatedOffline Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  competitionSeason CompetitionSeason? @relation(fields: [competitionSeasonId], references: [id])
  stage CompetitionStage? @relation(fields: [stageId], references: [id])

  homeClub Club @relation("HomeClub", fields: [homeClubId], references: [id])
  awayClub Club @relation("AwayClub", fields: [awayClubId], references: [id])

  teamStates MatchTeamState[]
  lineups MatchLineup[]
  events MatchEvent[]
  playerStats PlayerMatchStats[]
  simulation MatchSimulation?
  decisionPoints MatchDecisionPoint[]

  @@index([competitionSeasonId])
  @@index([homeClubId])
  @@index([awayClubId])
  @@index([status])
  @@index([scheduledAt])
}

model MatchSimulation {
  id String @id @default(cuid())
  worldId String
  matchId String @unique

  engineVersion String
  tickIntervalSeconds Int
  totalTicks Int

  homeStrengthSnapshot Json
  awayStrengthSnapshot Json

  randomSeed String
  balanceJson Json?
  finalMomentumJson Json?

  createdAt DateTime @default(now())

  world GameWorld @relation(fields: [worldId], references: [id])
  match Match @relation(fields: [matchId], references: [id])

  ticks MatchSimulationTick[]

  @@index([worldId])
}

model MatchSimulationTick {
  id String @id @default(cuid())
  simulationId String

  minute Int
  second Int?

  homeMomentum Decimal @db.Decimal(8, 4)
  awayMomentum Decimal @db.Decimal(8, 4)

  homeThreat Decimal @db.Decimal(8, 4)
  awayThreat Decimal @db.Decimal(8, 4)

  homeFatigueAvg Decimal @db.Decimal(8, 4)
  awayFatigueAvg Decimal @db.Decimal(8, 4)

  data Json?

  createdAt DateTime @default(now())

  simulation MatchSimulation @relation(fields: [simulationId], references: [id])

  @@index([simulationId])
  @@index([minute])
}

model MatchTeamState {
  id String @id @default(cuid())
  matchId String
  clubId String

  controlSource MatchControlSource

  mentality TacticalMentality @default(BALANCED)
  pressing PressingIntensity @default(MEDIUM)
  marking MarkingStyle @default(ZONAL)
  tempo TempoStyle @default(NORMAL)

  formation String
  lineHeight Int @default(50)
  defensiveWidth Int @default(50)
  attackingWidth Int @default(50)
  riskLevel Int @default(50)

  morale Int @default(50)
  fatigueAvg Int @default(0)
  tacticalCohesion Int @default(50)

  currentInstructions Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  match Match @relation(fields: [matchId], references: [id])
  club  Club  @relation(fields: [clubId], references: [id])

  @@unique([matchId, clubId])
}

model MatchLineup {
  id String @id @default(cuid())
  matchId String
  clubId String

  formation String
  isInitial Boolean @default(true)

  createdAt DateTime @default(now())

  match Match @relation(fields: [matchId], references: [id])
  club  Club  @relation(fields: [clubId], references: [id])

  players MatchLineupPlayer[]

  @@index([matchId])
  @@index([clubId])
}

model MatchLineupPlayer {
  id String @id @default(cuid())
  lineupId String
  playerId String

  position PlayerPosition
  shirtNumber Int?
  isStarter Boolean @default(true)

  enteredMinute Int?
  leftMinute Int?

  tacticalRole String?
  individualInstructionJson Json?

  lineup MatchLineup @relation(fields: [lineupId], references: [id])
  player Player @relation(fields: [playerId], references: [id])

  @@index([lineupId])
  @@index([playerId])
}

model MatchEvent {
  id String @id @default(cuid())
  matchId String

  clubId String?
  playerId String?
  relatedPlayerId String?

  type MatchEventType

  minute Int
  second Int?

  description String
  importance Int @default(1)

  x Decimal? @db.Decimal(8, 4)
  y Decimal? @db.Decimal(8, 4)

  data Json?

  createdAt DateTime @default(now())

  match Match @relation(fields: [matchId], references: [id])
  player Player? @relation(fields: [playerId], references: [id])

  @@index([matchId])
  @@index([type])
  @@index([minute])
}

model PlayerMatchStats {
  id String @id @default(cuid())
  matchId String
  playerId String

  minutesPlayed Int @default(0)

  goals Int @default(0)
  assists Int @default(0)
  shots Int @default(0)
  shotsOnTarget Int @default(0)

  passesAttempted Int @default(0)
  passesCompleted Int @default(0)

  tackles Int @default(0)
  interceptions Int @default(0)
  foulsCommitted Int @default(0)
  yellowCards Int @default(0)
  redCards Int @default(0)

  saves Int @default(0)
  goalsConceded Int @default(0)

  rating Decimal @db.Decimal(4, 2) @default(6.00)

  fatigueStart Int
  fatigueEnd   Int

  moraleImpact Int @default(0)

  match Match @relation(fields: [matchId], references: [id])
  player Player @relation(fields: [playerId], references: [id])

  @@unique([matchId, playerId])
}

/**
 * =========================
 * DECISÕES DINÂMICAS DURANTE PARTIDA
 * =========================
 */

model MatchDecisionPoint {
  id String @id @default(cuid())
  matchId String
  clubId String

  type DecisionPointType
  minute Int

  title String
  description String

  urgency RecommendationImpact
  createdByStaffQuality Int?

  resolved Boolean @default(false)
  resolvedAt DateTime?

  chosenActionId String?

  data Json?

  createdAt DateTime @default(now())

  match Match @relation(fields: [matchId], references: [id])

  recommendations MatchActionRecommendation[]

  @@index([matchId])
  @@index([clubId])
  @@index([resolved])
}

model MatchActionRecommendation {
  id String @id @default(cuid())
  decisionPointId String

  title String
  description String

  impact RecommendationImpact
  confidence Int

  tacticalChangeJson Json?
  substitutionJson Json?
  riskJson Json?

  generatedByStaffRole StaffRole?
  generatedByStaffQuality Int?

  createdAt DateTime @default(now())

  decisionPoint MatchDecisionPoint @relation(fields: [decisionPointId], references: [id])

  @@index([decisionPointId])
}

/**
 * =========================
 * IA DOS CLUBES
 * =========================
 */

model ClubAIProfile {
  id String @id @default(cuid())
  clubId String @unique

  aggressiveness Int @default(50)
  patience       Int @default(50)
  youthPreference Int @default(50)
  transferRisk   Int @default(50)
  financialDiscipline Int @default(50)

  tacticalFlexibility Int @default(50)
  substitutionTiming  Int @default(50)
  injuryRiskTolerance Int @default(50)

  offlineDecisionLevel Int @default(1)

  strategyJson Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  club Club @relation(fields: [clubId], references: [id])

  decisions AIDecision[]
}

model AIDecision {
  id String @id @default(cuid())
  clubAIProfileId String

  context String
  decisionType String

  inputJson Json
  outputJson Json

  confidence Int?
  impactScore Int?

  createdAt DateTime @default(now())

  aiProfile ClubAIProfile @relation(fields: [clubAIProfileId], references: [id])

  @@index([clubAIProfileId])
  @@index([decisionType])
}

/**
 * =========================
 * ESTATÍSTICAS DE TEMPORADA
 * =========================
 */

model ClubSeasonStats {
  id String @id @default(cuid())
  clubId String
  seasonId String

  matchesPlayed Int @default(0)
  wins Int @default(0)
  draws Int @default(0)
  losses Int @default(0)

  goalsFor Int @default(0)
  goalsAgainst Int @default(0)
  points Int @default(0)

  finalPosition Int?
  titlesWon Int @default(0)

  averageAttendance Int @default(0)
  fanMood MoodLevel @default(NEUTRAL)

  club Club @relation(fields: [clubId], references: [id])
  season Season @relation(fields: [seasonId], references: [id])

  @@unique([clubId, seasonId])
}

model PlayerSeasonStats {
  id String @id @default(cuid())
  playerId String
  seasonId String
  clubId String?

  appearances Int @default(0)
  starts Int @default(0)
  minutesPlayed Int @default(0)

  goals Int @default(0)
  assists Int @default(0)
  yellowCards Int @default(0)
  redCards Int @default(0)

  averageRating Decimal @db.Decimal(4, 2) @default(0)
  injuriesCount Int @default(0)

  player Player @relation(fields: [playerId], references: [id])
  season Season @relation(fields: [seasonId], references: [id])

  @@unique([playerId, seasonId])
  @@index([clubId])
}

/**
 * =========================
 * TORCIDA, MÍDIA E NARRATIVAS
 * =========================
 */

model FanSentiment {
  id String @id @default(cuid())
  clubId String

  seasonNumber Int?

  mood MoodLevel @default(NEUTRAL)
  pressure Int @default(0)
  satisfaction Int @default(50)

  reason String?
  data Json?

  createdAt DateTime @default(now())

  club Club @relation(fields: [clubId], references: [id])

  @@index([clubId])
}

model Narrative {
  id String @id @default(cuid())
  worldId String
  clubId String?
  playerId String?

  type NarrativeType
  title String
  description String

  intensity Int @default(1)
  isActive Boolean @default(true)

  startsAt DateTime @default(now())
  endsAt DateTime?

  effectsJson Json?

  world GameWorld @relation(fields: [worldId], references: [id])
  club Club? @relation(fields: [clubId], references: [id])
  player Player? @relation(fields: [playerId], references: [id])

  @@index([worldId])
  @@index([clubId])
  @@index([playerId])
  @@index([type])
}

/**
 * =========================
 * NOTIFICAÇÕES
 * =========================
 */

model Notification {
  id String @id @default(cuid())
  userId String?
  clubId String?

  type NotificationType

  title String
  message String

  isRead Boolean @default(false)
  priority Int @default(1)

  payload Json?

  createdAt DateTime @default(now())
  readAt DateTime?

  user User? @relation(fields: [userId], references: [id])
  club Club? @relation(fields: [clubId], references: [id])

  @@index([userId])
  @@index([clubId])
  @@index([isRead])
  @@index([createdAt])
}

Essa estrutura cobre os principais blocos que você descreveu:

Mundo online persistente
GameWorld
Season
GameEconomyConfig
EconomySnapshot
Clubes pequenos que crescem com o tempo
Club
ClubDepartment
ClubSeasonStats
ClubFinanceSnapshot
Jogadores únicos
Player
PlayerAttributes
PlayerBackground
PlayerPersonality
PlayerDevelopment
PlayerClubHistory
Vida extra-campo impactando atributos
PlayerBackground
PlayerPersonality
generatedTraitJson
hiddenTraits
Evolução por clube, treino e estrutura
TrainingPlan
TrainingPlayerEntry
ClubDepartment
PlayerDevelopment
Comissão técnica e funcionários por nível
StaffMember
StaffContract
StaffRole
StaffQualityTier
Equipe médica, comunicação, diretoria, olheiros etc.
DepartmentType
ClubDepartment
StaffMember
Simulação robusta de partida
Match
MatchSimulation
MatchSimulationTick
MatchTeamState
MatchLineup
MatchLineupPlayer
MatchEvent
PlayerMatchStats
Usuário online podendo interferir
MatchControlSource
MatchDecisionPoint
MatchActionRecommendation
Notification
Usuário offline com IA tomando decisões essenciais
ClubAIProfile
AIDecision
MatchControlSource.USER_OFFLINE_AI
Decisões dinâmicas por qualidade da comissão
MatchDecisionPoint
MatchActionRecommendation
generatedByStaffRole
generatedByStaffQuality
confidence
impact
Economia dinâmica baseada em clubes, jogadores, dinheiro e aposentadorias
GameEconomyConfig
EconomySnapshot
TransferListing
TransferOffer
FinancialTransaction
Transferências e contratos
PlayerContract
StaffContract
TransferListing
TransferOffer
Campeonatos online
Competition
CompetitionSeason
CompetitionClub
CompetitionStage
Match
Torcida, mídia e narrativas
FanSentiment
Narrative
Notification
Lesões, suspensões e risco físico
PlayerInjury
PlayerSuspension
fatigue
injuryProneness
medicalDepartmentLevelAtTime

Eu consideraria esse schema como o core principal do jogo. A partir dele, os próximos módulos naturais seriam: calendário de temporada, geração automática de calendário, tabela/classificação por competição, regras específicas de campeonato, engine de simulação e serviços de balanceamento econômico.

Pode fazer os modilos naturais

Vou organizar os módulos como se fosse a divisão real do backend: cada módulo com responsabilidade, entidades envolvidas, serviços principais, jobs/processos e eventos publicados.

Pensou por alguns segundos

Sim. Abaixo está a divisão dos módulos naturais do backend para esse jogo. A ideia é não deixar tudo misturado no Prisma ou em services gigantes. Cada módulo vira uma área lógica do sistema.

1. Módulo de Mundo do Jogo

Responsável por controlar o universo online onde tudo acontece.

Responsabilidades

Criar mundo, controlar data virtual, temporadas, quantidade de clubes, quantidade de jogadores, status geral e avanço do tempo.

Entidades principais
GameWorld
Season
GameEconomyConfig
EconomySnapshot
UserSession
Serviços
WorldService
SeasonService
WorldClockService
WorldBootstrapService
WorldBalanceService
Funções principais
createWorld()
bootstrapInitialWorld()
advanceWorldDate()
startSeason()
finishSeason()
pauseWorld()
resumeWorld()
generateEconomySnapshot()
Jobs naturais
world:advance-date
world:daily-tick
world:season-check
world:economy-snapshot
Eventos publicados
world.created
world.activated
world.date.advanced
season.started
season.finished
economy.snapshot.created
2. Módulo de Usuários e Sessão Online

Responsável por saber quem está jogando, qual clube controla e se está online durante partidas.

Entidades principais
User
UserSession
ClubUser
Notification
Serviços
UserService
UserSessionService
ClubOwnershipService
NotificationService
Funções principais
createUser()
assignClubToUser()
markUserOnline()
markUserOffline()
getUserActiveClub()
getOnlineUsersByMatch()
sendNotification()
Importância no jogo

Esse módulo impacta diretamente a simulação.

Se o usuário está online:

partida pode gerar pontos de decisão interativos
usuário pode alterar tática
usuário pode substituir jogador
usuário pode reagir a lesão, expulsão, cansaço etc.

Se está offline:

IA assume decisões essenciais
simulação segue normalmente
só faz mudanças críticas
3. Módulo de Clubes

Responsável pela identidade, evolução e estado geral dos clubes.

Entidades principais
Club
ClubDepartment
ClubSeasonStats
ClubFinanceSnapshot
FanSentiment
Narrative
ClubAIProfile
Serviços
ClubService
ClubProgressionService
ClubDepartmentService
ClubLevelService
ClubReputationService
FanSentimentService
Funções principais
createInitialClubs()
calculateClubLevel()
upgradeDepartment()
recalculateClubReputation()
updateBoardPatience()
updateFanMood()
evaluateClubGrowth()
Regra central

O clube não cresce só por ganhar jogos. Ele cresce por um conjunto de fatores:

resultados esportivos
estrutura do clube
dinheiro em caixa
nível da comissão
qualidade do elenco
base de torcida
reputação
narrativas positivas ou negativas
histórico de temporadas
Fórmula conceitual
clubLevel =
  sportingScore * 0.30 +
  structureScore * 0.25 +
  financeScore * 0.15 +
  squadScore * 0.15 +
  reputationScore * 0.10 +
  fanBaseScore * 0.05
4. Módulo de Estrutura do Clube

Responsável pelos departamentos internos do clube.

Entidades principais
ClubDepartment
StaffMember
StaffContract
FinancialTransaction
Departamentos
MEDICAL
TRAINING
YOUTH_ACADEMY
SCOUTING
COMMUNICATION
BOARD
FINANCE
INFRASTRUCTURE
STADIUM
DATA_ANALYSIS
Serviços
DepartmentService
DepartmentUpgradeService
DepartmentEffectService
Efeitos naturais
Departamento médico

Impacta:

risco de lesão
tempo de recuperação
gravidade média das lesões
capacidade de detectar jogador em risco
Treinamento

Impacta:

evolução técnica
evolução física
evolução mental
adaptação tática
Olheiros

Impacta:

qualidade dos jogadores encontrados
precisão dos relatórios
custo de descoberta
probabilidade de achar jovem promissor
Comunicação

Impacta:

pressão da torcida
controle de crise
narrativas negativas
insatisfação de jogadores
efeito da mídia
Diretoria

Impacta:

tamanho de contratos
negociações
patrocínios
paciência com resultados ruins
qualidade das decisões administrativas
Data Analysis

Impacta:

qualidade das recomendações táticas
identificação de fraquezas do adversário
melhores sugestões durante partida
5. Módulo de Jogadores

Responsável pela vida completa do jogador.

Entidades principais
Player
PlayerAttributes
PlayerBackground
PlayerPersonality
PlayerDevelopment
PlayerClubHistory
PlayerSeasonStats
PlayerMatchStats
PlayerInjury
PlayerSuspension
Serviços
PlayerService
PlayerGeneratorService
PlayerAttributeService
PlayerDevelopmentService
PlayerLifecycleService
PlayerMoraleService
PlayerStatusService
Funções principais
generatePlayer()
generatePlayerBackground()
calculateInitialAttributes()
calculatePotential()
updatePlayerDevelopment()
agePlayersAfterSeason()
retirePlayers()
regenerateMarketPlayers()
Fluxo de geração do jogador
1. Define nacionalidade
2. Define idade
3. Define posição
4. Define biografia
5. Define personalidade
6. Define atributos base
7. Aplica modificadores de vida
8. Aplica modificadores culturais/nacionais mínimos
9. Calcula potencial
10. Calcula valor de mercado
11. Calcula expectativa salarial
Exemplo de impacto da vida extra-campo
if (background.childhoodPovertyLevel > 70) {
  determination += 8
  workRate += 5
  pressureHandling += 4
}

if (background.familyStability < 30) {
  emotionalStability -= 6
  moraleVolatility += 8
}

if (background.violenceExposure > 60) {
  aggression += 7
  bravery += 6
  discipline -= 3
}

if (background.earlyFootballAccess > 70) {
  technique += 5
  firstTouch += 4
  decisions += 3
}
6. Módulo de Desenvolvimento de Jogadores

Responsável por fazer o jogador evoluir ou regredir.

Entidades principais
PlayerDevelopment
TrainingPlan
TrainingPlayerEntry
PlayerAttributes
PlayerInjury
ClubDepartment
StaffMember
Serviços
DevelopmentService
TrainingService
AttributeGrowthService
DeclineService
InjuryImpactService
Fatores que influenciam evolução
idade
potencial
personalidade
minutagem
qualidade do treino
estrutura do clube
nível da comissão técnica
moral
lesões acumuladas
posição
tipo de treino
ambiente do clube
Cálculo conceitual
growth =
  baseGrowthRate *
  ageCurveMultiplier *
  potentialGapMultiplier *
  trainingQualityMultiplier *
  staffQualityMultiplier *
  departmentMultiplier *
  personalityMultiplier *
  moraleMultiplier *
  matchMinutesMultiplier *
  injuryPenalty
Regressão natural

Jogador começa a cair conforme:

idade passa do pico
lesões acumulam
baixo profissionalismo
baixo ritmo de jogo
moral muito baixa
estrutura ruim
7. Módulo de Comissão Técnica e Funcionários

Responsável por técnicos, médicos, olheiros, psicólogos, diretores e especialistas.

Entidades principais
StaffMember
StaffContract
ClubDepartment
MatchActionRecommendation
AIDecision
Serviços
StaffService
StaffGeneratorService
StaffContractService
StaffEffectService
TechnicalStaffService
Funções principais
generateStaff()
hireStaff()
fireStaff()
renewStaffContract()
calculateStaffImpact()
getBestStaffByRole()
Impactos por cargo
Técnico principal
tática
decisões durante jogo
formação
substituições
moral do elenco
Auxiliar técnico
recomendações durante partida
leitura do adversário
ajustes táticos
Preparador físico
cansaço
resistência
risco físico
recuperação
Médico
lesões
recuperação
diagnóstico
prevenção
Psicólogo
moral
pressão
instabilidade emocional
jogadores problemáticos
Olheiro
descoberta de jogadores
precisão de potencial
custo de scouting
Diretor
contratos
negociações
patrocínios
relação com torcida e conselho
8. Módulo de Treinamento

Responsável pelos planos de treino do clube e evolução individual.

Entidades principais
TrainingPlan
TrainingPlayerEntry
PlayerDevelopment
PlayerAttributes
PlayerInjury
Serviços
TrainingPlanService
TrainingExecutionService
TrainingRiskService
TrainingResultService
Tipos de treino
PHYSICAL
TECHNICAL
TACTICAL
MENTAL
DEFENSIVE
OFFENSIVE
SET_PIECES
RECOVERY
INDIVIDUAL_ROLE
Fluxo
1. Clube define plano de treino
2. Jogadores recebem carga individual
3. Sistema calcula evolução
4. Sistema calcula fadiga
5. Sistema calcula risco de lesão
6. Sistema aplica ganhos/perdas
7. Sistema gera relatório
Regras importantes

Treino pesado pode melhorar mais rápido, mas aumenta:

fadiga
risco de lesão
queda de moral
perda de rendimento em jogo

Treino leve reduz risco, mas evolui menos.

9. Módulo Médico

Responsável por lesões, recuperação, risco físico e disponibilidade.

Entidades principais
PlayerInjury
Player
PlayerDevelopment
ClubDepartment
StaffMember
MatchEvent
TrainingPlayerEntry
Serviços
MedicalService
InjuryRiskService
RecoveryService
FitnessService
AvailabilityService
Funções principais
calculateInjuryRisk()
createInjury()
estimateRecoveryTime()
updateRecoveryProgress()
clearRecoveredPlayers()
getUnavailablePlayers()
Fatores de risco
fadiga
idade
histórico de lesões
intensidade do treino
intensidade da partida
atributo físico
qualidade médica
gramado/condição externa
minutagem acumulada
Fórmula conceitual
injuryRisk =
  baseRisk +
  fatigueRisk +
  ageRisk +
  injuryPronenessRisk +
  trainingLoadRisk +
  matchIntensityRisk -
  medicalDepartmentReduction -
  fitnessStaffReduction
10. Módulo de Mercado e Transferências

Responsável por compra, venda, empréstimos, jogadores livres e equilíbrio de mercado.

Entidades principais
TransferListing
TransferOffer
PlayerContract
Player
Club
FinancialTransaction
EconomySnapshot
Serviços
TransferMarketService
TransferOfferService
ContractNegotiationService
MarketValueService
FreeAgentService
LoanService
Funções principais
listPlayerForTransfer()
makeTransferOffer()
evaluateTransferOffer()
acceptTransferOffer()
rejectTransferOffer()
completeTransfer()
signFreeAgent()
calculateMarketValue()
Fatores do valor do jogador
idade
posição
atributos
potencial
contrato restante
salário
moral
reputação
escassez de jogadores
dinheiro médio dos clubes
inflação do mundo
desempenho recente
Fórmula conceitual
marketValue =
  abilityValue *
  potentialMultiplier *
  ageMultiplier *
  positionScarcityMultiplier *
  contractMultiplier *
  worldEconomyMultiplier *
  performanceMultiplier
11. Módulo Financeiro

Responsável por dinheiro do clube, salários, receitas, despesas, orçamento e saúde financeira.

Entidades principais
FinancialTransaction
ClubFinanceSnapshot
Club
PlayerContract
StaffContract
CompetitionSeason
Serviços
FinanceService
BudgetService
WageService
RevenueService
ExpenseService
PrizeMoneyService
FinancialHealthService
Funções principais
addTransaction()
payWages()
payStaffWages()
calculateSeasonRevenue()
calculateSeasonExpenses()
generateFinanceSnapshot()
updateTransferBudget()
updateWageBudget()
checkBankruptcyRisk()
Receitas
bilheteria
premiação
patrocínio
venda de jogador
bônus de competição
crescimento de torcida
Despesas
salários de jogadores
salários de funcionários
compra de jogador
manutenção de estrutura
upgrade de departamento
estádio
impostos
12. Módulo de Economia Global

Responsável por manter o mundo equilibrado.

Esse é um dos módulos mais importantes para o jogo online.

Entidades principais
GameEconomyConfig
EconomySnapshot
Club
Player
TransferOffer
FinancialTransaction
Serviços
EconomyBalanceService
InflationService
PlayerSupplyService
MarketScarcityService
WorldMoneySupplyService
Funções principais
calculateMoneySupply()
calculatePlayerSupply()
calculatePlayerScarcity()
calculateMarketInflation()
rebalanceGeneratedPlayers()
adjustPlayerPrices()
adjustWageExpectations()
O que ele controla
se existe jogador demais
se existe jogador de menos
se clubes estão ricos demais
se clubes estão pobres demais
se preço médio está inflado
se salários estão fora da realidade
se muitos jogadores se aposentaram
se precisa gerar novos jogadores
Fórmula conceitual de escassez
playerScarcityIndex =
  targetPlayersPerClub / actualPlayersPerClub

Se o índice subir muito:

jogadores ficam mais caros
salários sobem
clubes disputam mais jogadores
sistema gera mais jogadores jovens/livres

Se cair muito:

jogadores ficam baratos
salários caem
mercado fica mais frio
menos jogadores são gerados
13. Módulo de Campeonatos

Responsável por criar competições, temporadas, clubes participantes, fases, rodadas e regras.

Entidades principais
Competition
CompetitionSeason
CompetitionClub
CompetitionStage
Match
ClubSeasonStats
Serviços
CompetitionService
CompetitionSeasonService
CompetitionRegistrationService
CompetitionRulesService
CompetitionTableService
FixtureGeneratorService
Funções principais
createCompetition()
startCompetitionSeason()
registerClubs()
generateStages()
generateFixtures()
calculateTable()
finishCompetition()
distributePrizeMoney()
Formatos suportados
liga de turno único
liga ida e volta
mata-mata
grupos + mata-mata
supercopa
amistoso
sistema suíço
Regras por competição

O campo rulesJson permite regras flexíveis:

{
  "pointsWin": 3,
  "pointsDraw": 1,
  "pointsLoss": 0,
  "tieBreakers": [
    "points",
    "wins",
    "goalDifference",
    "goalsFor",
    "headToHead"
  ],
  "allowExtraTime": false,
  "allowPenaltyShootout": false,
  "maxForeignPlayers": null,
  "suspensionYellowCards": 3
}
14. Módulo de Calendário

Responsável por montar o calendário da temporada.

Entidades principais
Season
CompetitionSeason
CompetitionStage
Match
Club
Serviços
CalendarService
FixtureGeneratorService
MatchSchedulingService
RestPeriodService
ConflictResolverService
Funções principais
generateSeasonCalendar()
scheduleMatch()
rescheduleMatch()
checkClubAvailability()
calculateRestDays()
avoidCalendarConflict()
Regras importantes

O calendário precisa respeitar:

clubes não podem jogar duas partidas no mesmo horário
deve existir descanso mínimo
competições precisam encaixar suas fases
mata-mata depende de classificados
jogos de usuário online podem ter janela especial
fim de temporada precisa ser bem fechado
Exemplo de regra
if (clubRestDays < minimumRestDays) {
  rescheduleMatch()
}
15. Módulo de Partidas

Responsável pelo ciclo de vida da partida.

Entidades principais
Match
MatchTeamState
MatchLineup
MatchLineupPlayer
MatchEvent
PlayerMatchStats
MatchDecisionPoint
MatchActionRecommendation
Serviços
MatchService
MatchPreparationService
MatchLineupService
MatchStateService
MatchEventService
MatchStatsService
MatchResultService
Ciclo da partida
1. Criar partida
2. Preparar escalações
3. Calcular força inicial
4. Iniciar simulação
5. Gerar eventos
6. Gerar pontos de decisão
7. Aplicar ações do usuário ou IA
8. Finalizar partida
9. Atualizar estatísticas
10. Atualizar moral, fadiga, finanças e tabela
Estados
SCHEDULED
LIVE
PAUSED
FINISHED
CANCELLED
WALKOVER
SIMULATED_OFFLINE
16. Módulo de Engine de Simulação

Responsável pelo cálculo real da partida.

Entidades principais
MatchSimulation
MatchSimulationTick
MatchTeamState
MatchEvent
PlayerMatchStats
PlayerAttributes
Serviços
MatchSimulationEngine
MatchTickService
MomentumService
ChanceCreationService
GoalResolverService
EventGeneratorService
FatigueEngine
RatingEngine
Conceito

A partida roda em ticks.

Exemplo:

1 tick = 1 minuto virtual
90 ticks = partida inteira

Em jogos online, o tick pode gerar notificações e pontos de decisão.

Em jogos offline, o motor pode simular tudo mais rapidamente.

Fluxo por tick
1. Lê estado atual dos times
2. Calcula força ofensiva e defensiva
3. Calcula meio-campo e controle
4. Calcula momentum
5. Calcula chance de evento
6. Decide tipo de evento
7. Aplica consequência
8. Atualiza fadiga
9. Atualiza moral parcial
10. Verifica ponto de decisão
Cálculo conceitual de força
teamAttack =
  playerAttackAttributes *
  tacticalMentalityMultiplier *
  moraleMultiplier *
  fatiguePenalty *
  cohesionMultiplier

teamDefense =
  playerDefenseAttributes *
  markingMultiplier *
  lineHeightRisk *
  moraleMultiplier *
  fatiguePenalty

midfieldControl =
  passing +
  decisions +
  stamina +
  teamwork +
  tacticalCohesion
17. Módulo de Tática

Responsável por formações, instruções e mudanças durante a partida.

Entidades principais
MatchTeamState
MatchLineup
MatchLineupPlayer
MatchDecisionPoint
MatchActionRecommendation
Serviços
TacticalService
FormationService
InstructionService
TacticalChangeService
TacticalImpactService
Elementos táticos
formação
mentalidade
pressing
marcação
tempo de jogo
linha defensiva
largura defensiva
largura ofensiva
risco
instruções individuais
Alterações possíveis durante o jogo
trocar formação
mudar mentalidade
pressionar mais
recuar
marcar forte
baixar linha
subir linha
jogar direto
cadenciar
substituir jogador
mudar jogador de posição
Impacto

Toda alteração tática deve afetar:

momentum
risco defensivo
chance ofensiva
fadiga
controle de bola
probabilidade de cartão
probabilidade de lesão
18. Módulo de Pontos de Decisão

Responsável por criar momentos estratégicos para o usuário agir.

Entidades principais
MatchDecisionPoint
MatchActionRecommendation
Notification
StaffMember
ClubDepartment
Serviços
DecisionPointService
RecommendationService
DecisionResolverService
StaffAdviceService
Tipos de decisão
lesão
expulsão
jogador cansado
jogador jogando mal
time perdendo
time ganhando
oportunidade tática
fraqueza do adversário
risco de lesão
pressão final
Regra importante

A qualidade da recomendação depende da comissão técnica.

recommendationQuality =
  assistantCoachQuality * 0.35 +
  headCoachQuality * 0.25 +
  dataAnalysisDepartment * 0.25 +
  tacticalKnowledge * 0.15
Exemplo

Comissão fraca:

"Seu time está sofrendo pressão. Talvez seja melhor mudar algo."

Comissão forte:

"O lateral direito adversário está cansado e já tem amarelo. Aumentar ataques pelo lado esquerdo pode gerar vantagem, mas aumenta exposição defensiva."
19. Módulo de IA dos Clubes

Responsável por decisões automáticas dos clubes controlados por máquina ou usuários offline.

Entidades principais
ClubAIProfile
AIDecision
Club
MatchTeamState
TransferOffer
TrainingPlan
Serviços
ClubAIService
AIMatchDecisionService
AITransferService
AITrainingService
AISquadManagementService
AIFinanceService
Áreas de decisão da IA
escalação
substituições
mudanças táticas
contratações
vendas
renovações
treino
finanças
uso da base
gestão de elenco
Diferença entre IA full e IA offline
Clube totalmente IA
decide tudo
planeja temporada
compra e vende
muda tática livremente
desenvolve elenco
Usuário offline
decide apenas o essencial
não muda estratégia profunda
não vende jogador importante sem regra explícita
não faz decisões irreversíveis sem configuração
age em lesão, expulsão, cansaço extremo e substituições óbvias
20. Módulo de Narrativas, Mídia e Torcida

Responsável por dar vida ao mundo.

Entidades principais
Narrative
FanSentiment
Notification
PlayerPersonality
ClubSeasonStats
Serviços
NarrativeService
MediaService
FanSentimentService
PressureService
BoardReactionService
Exemplos de narrativas
torcida pressionando técnico
jogador insatisfeito
boato de transferência
clube em crise
clube em ascensão
clássico importante
luta contra rebaixamento
disputa por título
jogador virando ídolo
Impactos

Narrativas podem afetar:

moral
pressão
paciência da diretoria
valor de mercado
vontade de renovar contrato
comportamento da torcida
desempenho em jogos grandes
21. Módulo de Notificações

Responsável por alertar o usuário sobre tudo que exige atenção.

Entidades principais
Notification
User
Club
MatchDecisionPoint
TransferOffer
Narrative
ScoutReport
Serviços
NotificationService
MatchNotificationService
TransferNotificationService
BoardNotificationService
ScoutNotificationService
Tipos de notificação
evento de partida
ponto de decisão
oferta de transferência
alerta de contrato
alerta de lesão
alerta financeiro
reação da torcida
mensagem da diretoria
atualização de campeonato
relatório de olheiro
relatório de treino
Importante

Durante partida online, notificações precisam ser em tempo real.

Tecnologias naturais:

WebSocket
SSE
Redis Pub/Sub
fila BullMQ
22. Módulo de Estatísticas

Responsável por consolidar dados de jogadores, clubes, partidas e temporadas.

Entidades principais
PlayerMatchStats
PlayerSeasonStats
ClubSeasonStats
Match
MatchEvent
Serviços
StatsService
PlayerStatsService
ClubStatsService
CompetitionStatsService
RankingService
Funções principais
updatePlayerMatchStats()
updatePlayerSeasonStats()
updateClubSeasonStats()
calculateLeagueTable()
calculateTopScorers()
calculateBestRatings()
calculateDisciplinaryTable()
Rankings naturais
artilharia
assistências
média de nota
melhores goleiros
mais cartões
melhores jovens
melhores clubes
melhores técnicos
maiores sequências
23. Módulo de Fim de Temporada

Responsável por fechar a temporada e preparar a próxima.

Entidades principais
Season
ClubSeasonStats
PlayerSeasonStats
PlayerDevelopment
PlayerContract
StaffContract
CompetitionSeason
EconomySnapshot
Serviços
SeasonClosureService
PromotionRelegationService
ContractExpirationService
PlayerAgingService
RetirementService
NewSeasonSetupService
Fluxo de fim de temporada
1. Finalizar competições
2. Distribuir premiações
3. Atualizar reputação dos clubes
4. Atualizar humor da torcida
5. Atualizar estatísticas finais
6. Envelhecer jogadores
7. Aplicar evolução/regressão
8. Aposentar jogadores
9. Encerrar contratos
10. Gerar novos jogadores se necessário
11. Rebalancear economia
12. Criar nova temporada
13. Gerar calendário
Esse módulo é crítico

Porque é aqui que o mundo continua vivo e equilibrado.

24. Módulo de Balanceamento de Novos Usuários

Esse é específico para o problema que você levantou: usuário entrando na temporada 20, quando outros clubes já cresceram.

Entidades principais
Club
GameWorld
Season
ClubDepartment
Player
EconomySnapshot
ClubAIProfile
Serviços
NewUserEntryService
ClubOpportunityService
CatchUpBalanceService
StarterClubGeneratorService
Estratégias possíveis
1. Clube novo com potencial acelerado

O usuário começa com clube pequeno, mas recebe:

estrutura inicial um pouco melhor
jogadores jovens com potencial
bônus de crescimento nas primeiras temporadas
objetivos mais leves da diretoria
2. Clube existente abandonado

O usuário assume um clube controlado por IA que já existe.

Vantagens:

não quebra o mundo
já tem histórico
já tem divisão/campeonato
já tem elenco
3. Clube emergente protegido

O sistema cria ou seleciona um clube pequeno com regras especiais:

não enfrenta elite imediatamente
entra em divisão inferior equilibrada
tem calendário adequado
tem economia proporcional
4. Sistema de oportunidade

O jogo pode oferecer clubes com perfis diferentes:

clube pequeno estável
clube com base boa
clube com caixa bom
clube com torcida forte
clube em crise para reconstrução
clube com jovem estrela
Serviço principal
findBestEntryClubsForNewUser(worldId: string)

Ele deve avaliar:

nível médio do mundo
nível dos clubes livres
divisões disponíveis
economia atual
quantidade de jogadores livres
dificuldade de sobrevivência
oportunidade real de crescimento
25. Módulo de Scouting

Responsável por descobrir jogadores e gerar relatórios.

Entidades principais
ScoutReport
Player
StaffMember
ClubDepartment
PlayerBackground
PlayerPersonality
Serviços
ScoutService
ScoutMissionService
ScoutReportService
PlayerDiscoveryService
Funções principais
startScoutMission()
discoverPlayers()
generateScoutReport()
estimatePlayerPotential()
estimatePlayerPersonality()
expireScoutReport()
Tipos de busca
jovem promessa
jogador barato
posição específica
jogador experiente
jogador livre
mercado nacional
mercado internacional
jogador com personalidade específica
Precisão do relatório

Depende de:

nível do olheiro
nível do departamento de scouting
dificuldade do mercado
idade do jogador
tempo observado
26. Módulo de Contratos

Responsável por contratos de jogadores e funcionários.

Entidades principais
PlayerContract
StaffContract
Player
StaffMember
Club
FinancialTransaction
Serviços
ContractService
PlayerContractService
StaffContractService
RenewalService
ContractExpirationService
Funções principais
createPlayerContract()
renewPlayerContract()
terminatePlayerContract()
expireContracts()
calculateSalaryExpectation()
evaluateRenewalInterest()
Fatores de renovação
moral do jogador
tempo de clube
salário atual
proposta externa
ambição
lealdade
papel no elenco
qualidade do clube
nível da liga
27. Módulo de Elenco

Responsável por montar e gerenciar o grupo de jogadores do clube.

Entidades principais
Club
Player
PlayerContract
PlayerInjury
PlayerSuspension
PlayerSeasonStats
Serviços
SquadService
SquadDepthService
SquadRoleService
AvailabilityService
LineupSuggestionService
Funções principais
getSquad()
getAvailablePlayers()
getSquadDepth()
calculateSquadStrength()
suggestBestLineup()
detectSquadWeaknesses()
Análises naturais
faltam zagueiros
time envelhecido
folha salarial alta
muitos jogadores insatisfeitos
poucos reservas
muitos lesionados
base sem espaço
28. Módulo de Classificação e Tabela

Pode ficar dentro de Campeonatos, mas eu separaria porque cresce bastante.

Entidades principais
CompetitionSeason
CompetitionClub
Match
ClubSeasonStats
Serviços
LeagueTableService
TieBreakerService
StandingService
PromotionZoneService
Funções principais
calculateStandings()
applyTieBreakers()
getClubPosition()
getPromotionZone()
getRelegationZone()
Critérios naturais
pontos
vitórias
saldo de gols
gols pró
confronto direto
cartões
sorteio
29. Módulo de Auditoria e Histórico

Responsável por rastrear decisões importantes.

Entidades novas recomendadas

Eu adicionaria ao Prisma:

model GameAuditLog {
  id        String   @id @default(cuid())
  worldId   String?
  userId    String?
  clubId    String?

  action    String
  entity    String
  entityId  String?

  beforeJson Json?
  afterJson  Json?
  metadata   Json?

  createdAt DateTime @default(now())

  @@index([worldId])
  @@index([userId])
  @@index([clubId])
  @@index([action])
}
Por que é importante

Em jogo online, isso ajuda a entender:

quem vendeu jogador
quem alterou escalação
quando o sistema simulou algo
quando IA tomou decisão
quando economia foi rebalanceada
quando jogador foi gerado
30. Módulo de Configuração de Regras

Também adicionaria um módulo para evitar regras hardcoded.

Entidade recomendada
model GameRuleConfig {
  id      String @id @default(cuid())
  worldId String

  key     String
  value   Json

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([worldId, key])
}
Exemplos de regras
minimumRestDaysBetweenMatches
maxPlayersPerClub
minPlayersPerClub
retirementAgeMin
retirementAgeMax
baseInjuryChance
baseTransferTax
yellowCardsForSuspension
offlineAiAggressivenessLimit
newUserCatchUpSeasons

Isso deixa o jogo mais fácil de balancear sem mexer no código.

Estrutura de pastas sugerida

Pensando em NestJS, AdonisJS ou outro backend Node, a divisão poderia ser assim:

src/
  modules/
    world/
      world.service.ts
      season.service.ts
      world-clock.service.ts
      world-bootstrap.service.ts

    users/
      user.service.ts
      user-session.service.ts
      club-ownership.service.ts

    clubs/
      club.service.ts
      club-progression.service.ts
      club-department.service.ts
      club-level.service.ts

    players/
      player.service.ts
      player-generator.service.ts
      player-development.service.ts
      player-lifecycle.service.ts
      player-morale.service.ts

    staff/
      staff.service.ts
      staff-generator.service.ts
      staff-effect.service.ts
      staff-contract.service.ts

    training/
      training-plan.service.ts
      training-execution.service.ts
      training-risk.service.ts

    medical/
      medical.service.ts
      injury-risk.service.ts
      recovery.service.ts

    squad/
      squad.service.ts
      squad-depth.service.ts
      lineup-suggestion.service.ts

    transfers/
      transfer-market.service.ts
      transfer-offer.service.ts
      contract-negotiation.service.ts
      market-value.service.ts

    finance/
      finance.service.ts
      budget.service.ts
      wage.service.ts
      financial-health.service.ts

    economy/
      economy-balance.service.ts
      inflation.service.ts
      player-supply.service.ts
      market-scarcity.service.ts

    competitions/
      competition.service.ts
      competition-season.service.ts
      fixture-generator.service.ts
      competition-rules.service.ts

    calendar/
      calendar.service.ts
      match-scheduling.service.ts
      rest-period.service.ts

    matches/
      match.service.ts
      match-preparation.service.ts
      match-lineup.service.ts
      match-result.service.ts

    match-engine/
      match-simulation.engine.ts
      match-tick.service.ts
      momentum.service.ts
      chance-creation.service.ts
      goal-resolver.service.ts
      event-generator.service.ts
      fatigue-engine.service.ts
      rating-engine.service.ts

    tactics/
      tactical.service.ts
      formation.service.ts
      tactical-change.service.ts
      tactical-impact.service.ts

    decision-points/
      decision-point.service.ts
      recommendation.service.ts
      decision-resolver.service.ts

    ai/
      club-ai.service.ts
      ai-match-decision.service.ts
      ai-transfer.service.ts
      ai-training.service.ts
      ai-squad-management.service.ts

    scouting/
      scout.service.ts
      scout-mission.service.ts
      scout-report.service.ts

    narratives/
      narrative.service.ts
      fan-sentiment.service.ts
      media.service.ts
      pressure.service.ts

    notifications/
      notification.service.ts
      match-notification.service.ts
      transfer-notification.service.ts

    stats/
      stats.service.ts
      player-stats.service.ts
      club-stats.service.ts
      ranking.service.ts

    season-closure/
      season-closure.service.ts
      retirement.service.ts
      contract-expiration.service.ts
      new-season-setup.service.ts

    new-user-entry/
      new-user-entry.service.ts
      catch-up-balance.service.ts
      starter-club-generator.service.ts

    audit/
      audit-log.service.ts

    rules/
      game-rule-config.service.ts
Ordem correta de desenvolvimento dos módulos

Como o jogo depende de muita coisa encadeada, eu faria nessa ordem:

1. World
2. Users
3. Clubs
4. Club Departments
5. Players
6. Staff
7. Contracts
8. Finance
9. Economy
10. Competitions
11. Calendar
12. Squad
13. Match
14. Match Engine
15. Tactics
16. Decision Points
17. AI
18. Training
19. Medical
20. Transfers
21. Scouting
22. Stats
23. Narratives
24. Notifications
25. Season Closure
26. New User Entry Balance
27. Audit
28. Rules Config
Dependências principais entre módulos
World
 ├── Season
 ├── Economy
 ├── Clubs
 ├── Competitions
 └── Players

Club
 ├── Departments
 ├── Staff
 ├── Squad
 ├── Finance
 ├── AI
 └── Fan Sentiment

Player
 ├── Attributes
 ├── Background
 ├── Personality
 ├── Development
 ├── Contract
 ├── Injuries
 └── Stats

Competition
 ├── Calendar
 ├── Matches
 ├── Standings
 └── Prize Money

Match
 ├── Lineup
 ├── Tactics
 ├── Engine
 ├── Events
 ├── Decision Points
 ├── Stats
 └── Notifications

Season Closure
 ├── Competitions
 ├── Finance
 ├── Player Aging
 ├── Retirement
 ├── Contracts
 ├── Economy Balance
 └── New Season Setup
Eventos internos recomendados

Para não acoplar tudo, cada módulo deveria publicar eventos.

Mundo
world.created
world.activated
world.date.advanced
season.started
season.finished
Clube
club.created
club.level.changed
club.department.upgraded
club.reputation.changed
club.fan_mood.changed
Jogador
player.generated
player.developed
player.injured
player.recovered
player.retired
player.morale.changed
Contratos
contract.created
contract.renewed
contract.expired
contract.terminated
Mercado
transfer.listed
transfer.offer.created
transfer.offer.accepted
transfer.completed
transfer.rejected
Financeiro
finance.transaction.created
finance.wages.paid
finance.snapshot.created
club.bankruptcy_risk.detected
Partida
match.scheduled
match.started
match.tick.processed
match.event.created
match.decision_point.created
match.finished
IA
ai.decision.created
ai.match_action.applied
ai.transfer_action.applied
Temporada
season.closure.started
season.players.aged
season.retirements.processed
season.contracts.expired
season.economy.rebalanced
season.next.created
Jobs recorrentes naturais
world:daily-tick
season:check-start-end
competition:generate-fixtures
match:start-scheduled
match:simulate-live
match:simulate-offline
match:finish
training:process-results
medical:process-recovery
finance:pay-wages
economy:rebalance
contracts:check-expiration
players:process-aging
players:process-retirement
scouting:process-missions
notifications:cleanup
narratives:update
Módulos que eu considero indispensáveis para o core

Se fosse separar o core real do jogo, eu diria que esses não podem faltar:

World
Clubs
Players
Staff
Club Departments
Finance
Economy
Competitions
Calendar
Matches
Match Engine
Tactics
Decision Points
AI
Season Closure

Os outros são expansões naturais, mas esses são a espinha dorsal.

Módulo central mais importante

O módulo mais sensível é este:

Economy + Season Closure + Player Lifecycle

Porque ele garante que o jogo não quebre depois de várias temporadas.

Se muitos jogadores aposentam e poucos são gerados, o mercado quebra.

Se muitos jogadores são gerados, o mercado perde valor.

Se clubes acumulam dinheiro demais, preço explode.

Se clubes ficam pobres demais, transferências morrem.

Se usuário entra na temporada 20 sem proteção, ele não consegue competir.

Por isso, esses três módulos precisam conversar muito bem:

EconomyBalanceService
PlayerLifecycleService
SeasonClosureService
NewUserEntryService

Esse conjunto vira o coração de longo prazo do jogo