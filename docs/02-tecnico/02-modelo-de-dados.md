# Modelo de Dados (Schema Prisma Canônico e Domínio)

> **Status:** Rascunho consolidado (fonte da verdade do modelo de dados) · **Fontes:** chats/entidades-do-banco-de-dados-inicial.md · **Revisão:** 2026-07-10

Este documento consolida o **modelo de dados canônico** do **Grinta** — um manager de futebol online (estilo Brasfoot), com mundo persistente, clubes que crescem ao longo das temporadas e jogadores únicos gerados com biografia e personalidade. É a **fonte da verdade** para o schema: em caso de divergência com outros documentos, este prevalece.

O schema foi desenhado como estrutura robusta e reaproveitável — **não** como MVP. Cobre identidade de usuário, mundo, clubes, jogadores, comissão técnica, economia, campeonatos, simulação de partida, IA, narrativas e histórico.

## Sumário

1. [Introdução técnica](#1-introdução-técnica)
2. [Enums](#2-enums)
3. [Models por domínio](#3-models-por-domínio)
4. [Os 30 módulos de domínio](#4-os-30-módulos-de-domínio)
5. [Algoritmo de geração de jogador em 11 passos](#5-algoritmo-de-geração-de-jogador-em-11-passos)

Notas de ligação: regras de integridade referencial (FK), transações e particionamento operacional → `./01-arquitetura-de-dados.md`. Design dos sistemas de jogo (regras, fórmulas, balanceamento) → `../01-game-design/`.

---

## 1. Introdução técnica

- **Banco:** PostgreSQL.
- **ORM:** Prisma (`prisma-client-js`), `datasource db` com `provider = "postgresql"` e `url = env("DATABASE_URL")`.
- **Chaves primárias:** `String @id @default(cuid())` em todos os models.
- **Multi-mundo:** o jogo suporta múltiplos universos paralelos e persistentes. O campo **`worldId`** (referência a `GameWorld`) funciona como **chave de particionamento lógico**: quase todas as entidades de topo (`Club`, `Player`, `StaffMember`, `Competition`, `MatchSimulation`, `Narrative`, `Season`, etc.) carregam `worldId` e são indexadas por ele. Isso isola os dados de cada mundo e permite operar/balancear cada universo de forma independente.

  > **Pendência:** o texto-fonte usa `worldId` como nome do campo. A instrução de tarefa cita `gameWorldId` como chave de particionamento — nomenclatura a confirmar na modelagem final (o schema canônico atual usa `worldId`).

- **Estrutura robusta (não-MVP):** presença de snapshots econômicos e financeiros, histórico de clubes por jogador, camadas separadas de atributos/personalidade/desenvolvimento, e simulação de partida com replay determinístico via **`randomSeed`** / **`simulationSeed`** e **`engineVersion`**.
- **Determinismo e auditoria da simulação:** `MatchSimulation` guarda `engineVersion`, `randomSeed`, `homeStrengthSnapshot`/`awayStrengthSnapshot` (Json) e `finalMomentumJson`; `MatchSimulationTick` guarda o estado tick-a-tick. Isso permite reproduzir e auditar qualquer partida.

> **Pendência (reconciliação de schema):** existe uma **segunda iteração, mais granular, do modelo de dados** no chat `ux-do-jogo.md` (Bloco 26), ainda não fundida a este schema canônico. Ela diverge em nomenclatura e granularidade — por exemplo `UserAccount` (em vez de `User`), `WorldParticipant` (em vez de `ClubUser`), uma entidade **`Person`** separada de `Player`, além de `ClubIdentityPeriod`, `ClubControl` e uma **taxonomia de enums por domínio** (plataforma, mundo, clube/governança, pessoa/carreira, elenco/registro, contratual, transferência, financeiro, competitivo, partida, treino/medicina, estrutura, notificação, operacional). As **convenções de modelagem** desse bloco (schemas PostgreSQL por domínio, snake_case, chaves compostas por mundo, `Decimal` para dinheiro, uso/uso-proibido de JSONB, exclusão lógica, concorrência otimista) já estão consolidadas em [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md). A reconciliação das **entidades e enums** das duas versões é uma decisão de modelagem pendente.

---

## 2. Enums

Principais enums do domínio (valores fiéis ao schema-fonte):

| Enum | Valores |
| --- | --- |
| **UserRole** | `PLAYER`, `MODERATOR`, `ADMIN` |
| **WorldStatus** | `CREATING`, `ACTIVE`, `PAUSED`, `FINISHED`, `ARCHIVED` |
| **ClubControlType** | `USER`, `AI` |
| **ClubStatus** | `ACTIVE`, `INACTIVE`, `BANKRUPT`, `BOT_RESERVED` |
| **SeasonStatus** | `PLANNED`, `ACTIVE`, `FINISHED`, `ARCHIVED` |
| **Gender** | `MALE`, `FEMALE` |
| **DominantFoot** | `LEFT`, `RIGHT`, `BOTH` |
| **PlayerStatus** | `ACTIVE`, `RETIRED`, `FREE_AGENT`, `INJURED`, `SUSPENDED` |
| **PlayerGenerationSource** | `INITIAL_WORLD`, `SCOUT_FOUND`, `YOUTH_ACADEMY`, `REGEN_AFTER_RETIREMENT`, `MARKET_BALANCE` |
| **PlayerPosition** | `GK`, `CB`, `LB`, `RB`, `LWB`, `RWB`, `CDM`, `CM`, `CAM`, `LM`, `RM`, `LW`, `RW`, `ST`, `CF` |
| **StaffRole** | `HEAD_COACH`, `ASSISTANT_COACH`, `FITNESS_COACH`, `GOALKEEPER_COACH`, `SCOUT`, `DOCTOR`, `PHYSIOTHERAPIST`, `PSYCHOLOGIST`, `DIRECTOR`, `NEGOTIATOR`, `COMMUNICATION_MANAGER`, `YOUTH_COORDINATOR` |
| **StaffQualityTier** | `VERY_LOW`, `LOW`, `MEDIUM`, `HIGH`, `ELITE` |
| **DepartmentType** | `MEDICAL`, `TRAINING`, `YOUTH_ACADEMY`, `SCOUTING`, `COMMUNICATION`, `BOARD`, `FINANCE`, `INFRASTRUCTURE`, `STADIUM`, `DATA_ANALYSIS` |
| **ContractStatus** | `ACTIVE`, `EXPIRED`, `TERMINATED`, `RENEWED`, `TRANSFERRED` |
| **TransferStatus** | `LISTED`, `NEGOTIATING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `COMPLETED`, `EXPIRED` |
| **TransferType** | `PERMANENT`, `LOAN`, `FREE_AGENT`, `CONTRACT_END` |
| **CompetitionType** | `LEAGUE`, `CUP`, `SUPER_CUP`, `INTERNATIONAL_CUP`, `FRIENDLY` |
| **CompetitionFormat** | `ROUND_ROBIN`, `DOUBLE_ROUND_ROBIN`, `KNOCKOUT`, `GROUPS_AND_KNOCKOUT`, `SWISS` |
| **MatchStatus** | `SCHEDULED`, `LIVE`, `PAUSED`, `FINISHED`, `CANCELLED`, `WALKOVER`, `SIMULATED_OFFLINE` |
| **MatchEventType** | `GOAL`, `OWN_GOAL`, `ASSIST`, `YELLOW_CARD`, `RED_CARD`, `INJURY`, `SUBSTITUTION`, `TACTICAL_CHANGE`, `PENALTY_AWARDED`, `PENALTY_MISSED`, `PENALTY_SCORED`, `FREE_KICK`, `SHOT`, `SHOT_ON_TARGET`, `SAVE`, `FOUL`, `OFFSIDE`, `VAR_CHECK`, `MOMENTUM_SHIFT`, `FATIGUE_ALERT`, `AI_DECISION` |
| **TacticalMentality** | `VERY_DEFENSIVE`, `DEFENSIVE`, `BALANCED`, `OFFENSIVE`, `VERY_OFFENSIVE` |
| **PressingIntensity** | `LOW`, `MEDIUM`, `HIGH`, `VERY_HIGH` |
| **MarkingStyle** | `ZONAL`, `MAN_TO_MAN`, `MIXED` |
| **TempoStyle** | `SLOW`, `NORMAL`, `FAST`, `DIRECT` |
| **MatchControlSource** | `USER_ONLINE`, `USER_OFFLINE_AI`, `FULL_AI`, `SYSTEM` |
| **DecisionPointType** | `INJURY`, `RED_CARD`, `FATIGUE`, `BAD_PERFORMANCE`, `LOSING_GAME`, `WINNING_GAME`, `TACTICAL_OPPORTUNITY`, `OPPONENT_WEAKNESS`, `PLAYER_RISK`, `FINAL_PRESSURE` |
| **RecommendationImpact** | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| **NotificationType** | `MATCH_EVENT`, `MATCH_DECISION_POINT`, `TRANSFER_OFFER`, `CONTRACT_ALERT`, `INJURY_ALERT`, `FINANCE_ALERT`, `FAN_REACTION`, `BOARD_MESSAGE`, `COMPETITION_UPDATE`, `SCOUT_REPORT`, `TRAINING_REPORT` |
| **FinanceTransactionType** | `TICKET_REVENUE`, `SPONSORSHIP`, `PLAYER_SALE`, `PLAYER_PURCHASE`, `WAGE_PAYMENT`, `STAFF_WAGE_PAYMENT`, `STADIUM_COST`, `STRUCTURE_UPGRADE`, `PRIZE_MONEY`, `TAX`, `MAINTENANCE`, `LOAN_PAYMENT`, `OTHER_INCOME`, `OTHER_EXPENSE` |
| **NarrativeType** | `FAN_PRESSURE`, `MEDIA_RUMOR`, `PLAYER_UNHAPPY`, `BOARD_PRESSURE`, `DERBY_HYPE`, `TITLE_RACE`, `RELEGATION_RISK`, `TRANSFER_SPECULATION`, `COMEBACK_STORY` |
| **MoodLevel** | `VERY_LOW`, `LOW`, `NEUTRAL`, `HIGH`, `VERY_HIGH` |
| **InjurySeverity** | `MINOR`, `LIGHT`, `MODERATE`, `SERIOUS`, `CRITICAL` |
| **TrainingFocus** | `PHYSICAL`, `TECHNICAL`, `TACTICAL`, `MENTAL`, `DEFENSIVE`, `OFFENSIVE`, `SET_PIECES`, `RECOVERY`, `INDIVIDUAL_ROLE` |

---

## 3. Models por domínio

São ~60 models. Abaixo os campos-chave e relações principais, agrupados por área.

### 3.1 Mundo e Usuário

```prisma
model User {
  id          String   @id @default(cuid())
  name        String
  email       String   @unique
  role        UserRole @default(PLAYER)
  avatarUrl   String?
  lastLoginAt DateTime?
  clubs         ClubUser[]
  sessions      UserSession[]
  notifications Notification[]
}

model UserSession {
  id         String  @id @default(cuid())
  userId     String
  worldId    String?
  isOnline   Boolean @default(false)  // define se o usuário pode interagir na partida ao vivo
  lastSeenAt DateTime @default(now())
  device     String?
  ipAddress  String?
  user  User       @relation(...)
  world GameWorld? @relation(...)
}

model GameWorld {
  id              String      @id @default(cuid())
  name            String
  status          WorldStatus @default(CREATING)
  currentSeasonId String?
  currentDate     DateTime               // data virtual do mundo
  timezone        String @default("America/Sao_Paulo")
  maxClubs        Int
  initialClubCash Decimal @db.Decimal(14, 2)
  // relações: seasons, clubs, users(UserSession), economyConfig,
  // economySnapshots, competitions, players, staffMembers,
  // matchSimulations, narratives
}

model Season {
  id       String       @id @default(cuid())
  worldId  String
  number   Int
  name     String
  status   SeasonStatus @default(PLANNED)
  startsAt DateTime
  endsAt   DateTime?
  @@unique([worldId, number])
  // relações: clubSeasonStats, playerSeasonStats, competitionSeasons,
  // financeSnapshots, economySnapshots
}
```

**Configuração e snapshots econômicos globais** (por mundo):

```prisma
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
  minGeneratedPlayerAge     Int
  maxGeneratedPlayerAge     Int
  targetPlayersPerClub      Int
  targetFreeAgentRatio      Decimal @db.Decimal(5, 4)
  inflationRatePerSeason    Decimal @db.Decimal(6, 4) @default(0)
}

model EconomySnapshot {
  id       String @id @default(cuid())
  worldId  String
  seasonId String?
  totalClubs Int; totalActiveClubs Int
  totalPlayers Int; totalActivePlayers Int; totalRetiredPlayers Int; totalFreeAgents Int
  totalCashInWorld   Decimal @db.Decimal(16, 2)
  averageClubCash    Decimal @db.Decimal(14, 2)
  averagePlayerValue Decimal @db.Decimal(14, 2)
  averageWage        Decimal @db.Decimal(14, 2)
  marketInflationIndex Decimal @db.Decimal(10, 4)
  playerScarcityIndex  Decimal @db.Decimal(10, 4)
  balanceScore         Decimal @db.Decimal(10, 4)
}
```

### 3.2 Clube

```prisma
model Club {
  id      String @id @default(cuid())
  worldId String
  name String; shortName String; slug String
  city String?; country String; foundedYear Int?
  controlType ClubControlType @default(AI)
  status      ClubStatus      @default(ACTIVE)
  reputation Int @default(1); level Int @default(1)
  fanBaseSize Int @default(0); boardPatience Int @default(50); pressureLevel Int @default(0)
  cash           Decimal @db.Decimal(14, 2)
  wageBudget     Decimal @db.Decimal(14, 2)
  transferBudget Decimal @db.Decimal(14, 2)
  @@unique([worldId, slug])
  // relações principais: users, structures(ClubDepartment), players,
  // staffContracts, playerContracts, finances, financeSnapshots,
  // seasonStats, transferListings, transferOffers(made/received),
  // homeMatches/awayMatches, matchStates, lineups, trainingPlans,
  // aiProfile, narratives, notifications, scoutingReports, fanSentiments
}

model ClubUser {
  id      String @id @default(cuid())
  userId  String; clubId String
  isOwner Boolean @default(true)
  joinedAt DateTime @default(now()); leftAt DateTime?
  @@unique([userId, clubId])
}

model ClubDepartment {
  id     String @id @default(cuid())
  clubId String
  type   DepartmentType
  level  Int @default(1); maxLevel Int @default(5); qualityScore Int @default(10)
  maintenanceCostPerSeason Decimal @db.Decimal(14, 2)
  upgradeCost              Decimal @db.Decimal(14, 2)
  effectJson Json?
  @@unique([clubId, type])
}
```

### 3.3 Jogador

Camadas separadas por preocupação: núcleo (`Player`), atributos técnicos, biografia, personalidade, curva de desenvolvimento, histórico por clube e contratos.

```prisma
model Player {
  id      String @id @default(cuid())
  worldId String; clubId String?
  firstName String; lastName String; knownName String?
  nationality String; birthDate DateTime; ageVirtual Int
  gender Gender @default(MALE)
  primaryPosition   PlayerPosition
  secondaryPosition PlayerPosition?
  dominantFoot      DominantFoot
  heightCm Int?; weightKg Int?
  status PlayerStatus @default(ACTIVE)
  generationSource        PlayerGenerationSource
  generatedAtSeasonNumber Int?
  currentAbility   Int
  potentialAbility Int
  marketValue     Decimal @db.Decimal(14, 2)
  wageExpectation Decimal @db.Decimal(14, 2)
  // estado dinâmico
  morale Int @default(50); confidence Int @default(50); happiness Int @default(50)
  fatigue Int @default(0); matchSharpness Int @default(50)
  // traços persistentes
  injuryProneness Int @default(50); consistency Int @default(50)
  ambition Int @default(50); loyalty Int @default(50); professionalism Int @default(50)
  // relações 1:1: attributes, background, personality, development
  // relações 1:N: contracts, histories, injuries, suspensions,
  // seasonStats, matchStats, lineupEntries, matchEvents, trainingEntries,
  // scoutReports, transferListings, transferOffers, narratives
}
```

```prisma
model PlayerAttributes {
  id String @id @default(cuid())
  playerId String @unique
  // técnicos
  finishing Int; longShots Int; heading Int; passing Int; crossing Int
  dribbling Int; firstTouch Int; technique Int; tackling Int; marking Int; positioning Int
  // físicos
  acceleration Int; pace Int; stamina Int; strength Int; agility Int; balance Int; jumping Int
  // mentais
  bravery Int; aggression Int; composure Int; decisions Int; concentration Int
  leadership Int; teamwork Int; workRate Int; determination Int; flair Int
  // goleiro (nullable — só GKs)
  goalkeeperReflexes Int?; goalkeeperHandling Int?; goalkeeperPositioning Int?
  goalkeeperKicking Int?; goalkeeperOneOnOne Int?
}

model PlayerBackground {
  id String @id @default(cuid())
  playerId String @unique
  childhoodPovertyLevel Int @default(0)
  familyStability       Int @default(50)
  violenceExposure      Int @default(0)
  educationLevel        Int @default(50)
  earlyFootballAccess   Int @default(50)
  fatherPresenceScore Int?; motherPresenceScore Int?; guardianStory String?
  lifeStorySummary   String?
  generatedTraitJson Json?   // traços derivados da história de vida
}

model PlayerPersonality {
  id String @id @default(cuid())
  playerId String @unique
  grit Int; emotionalStability Int; discipline Int; ego Int
  pressureHandling Int; adaptability Int; socialInfluence Int; mediaHandling Int
  offFieldRisk Int; lifestyleBalance Int
  hiddenTraits Json?   // traços ocultos, revelados por scouting
}

model PlayerDevelopment {
  id String @id @default(cuid())
  playerId String @unique
  technicalGrowthRate Decimal @db.Decimal(6, 4)
  physicalGrowthRate  Decimal @db.Decimal(6, 4)
  mentalGrowthRate    Decimal @db.Decimal(6, 4)
  peakAgeStart Int; peakAgeEnd Int; declineRate Decimal @db.Decimal(6, 4)
  trainingResponse Int
  injuryImpactAccumulated Int @default(0)
  lastDevelopmentAt DateTime?
}

model PlayerClubHistory {
  id String @id @default(cuid())
  playerId String; clubId String
  joinedAtSeason Int; leftAtSeason Int?
  appearances Int @default(0); goals Int @default(0); assists Int @default(0)
  reason String?
}

model PlayerContract {
  id String @id @default(cuid())
  playerId String; clubId String
  status ContractStatus @default(ACTIVE)
  startSeason Int; endSeason Int
  salaryPerSeason Decimal @db.Decimal(14, 2)
  signingBonus    Decimal @db.Decimal(14, 2) @default(0)
  releaseClause   Decimal @db.Decimal(14, 2)?
  moralePromiseJson Json?   // promessas feitas na assinatura
  roleInSquad String?
}
```

### 3.4 Comissão Técnica, Treino e Médico

```prisma
model StaffMember {
  id String @id @default(cuid())
  worldId String
  name String; nationality String?
  role        StaffRole
  qualityTier StaffQualityTier
  abilityScore Int; potentialScore Int; reputation Int @default(1)
  tacticalKnowledge Int @default(50); youthDevelopment Int @default(50)
  medicalKnowledge Int @default(50); negotiation Int @default(50)
  communication Int @default(50); discipline Int @default(50); dataAnalysis Int @default(50)
  contracts StaffContract[]
}

model StaffContract {
  id String @id @default(cuid())
  staffId String; clubId String
  status ContractStatus @default(ACTIVE)
  startSeason Int; endSeason Int
  salaryPerSeason Decimal @db.Decimal(14, 2)
}

model TrainingPlan {
  id String @id @default(cuid())
  clubId String; seasonId String
  name String; focus TrainingFocus; intensity Int
  tacticalStyleJson Json?; createdByStaffId String?
  startsAt DateTime; endsAt DateTime?
  entries TrainingPlayerEntry[]
}

model TrainingPlayerEntry {
  id String @id @default(cuid())
  trainingPlanId String; playerId String
  focus TrainingFocus; workload Int
  technicalGain Decimal @db.Decimal(8, 4) @default(0)
  physicalGain  Decimal @db.Decimal(8, 4) @default(0)
  mentalGain    Decimal @db.Decimal(8, 4) @default(0)
  fatigueGain Int @default(0); injuryRiskGain Int @default(0)
}

model PlayerInjury {
  id String @id @default(cuid())
  playerId String
  severity InjurySeverity; name String; description String?
  occurredAt DateTime; expectedReturnAt DateTime?; recoveredAt DateTime?
  causedByMatchId String?; causedByTrainingPlanId String?
  medicalDepartmentLevelAtTime Int?   // registra qualidade médica no momento
}

model PlayerSuspension {
  id String @id @default(cuid())
  playerId String
  reason String; matchesRemaining Int; competitionSeasonId String?
  startsAt DateTime; endsAt DateTime?
}
```

### 3.5 Scouting e Mercado

```prisma
model ScoutReport {
  id String @id @default(cuid())
  clubId String; playerId String; scoutStaffId String?
  accuracy Int
  estimatedCurrentAbility Int
  estimatedPotentialAbility Int
  estimatedMarketValue Decimal @db.Decimal(14, 2)
  personalityNotes String?; backgroundNotes String?
  recommendationScore Int
  discoveredAt DateTime @default(now()); expiresAt DateTime?
}

model TransferListing {
  id String @id @default(cuid())
  clubId String; playerId String
  status TransferStatus @default(LISTED)
  type   TransferType
  askingPrice Decimal @db.Decimal(14, 2)
  listedAt DateTime @default(now()); expiresAt DateTime?
  reason String?
  offers TransferOffer[]
}

model TransferOffer {
  id String @id @default(cuid())
  listingId String?; playerId String
  buyingClubId String; sellingClubId String?
  status TransferStatus @default(NEGOTIATING)
  type   TransferType
  transferFee Decimal @db.Decimal(14, 2)
  salaryOffer Decimal @db.Decimal(14, 2)
  contractSeasons Int
  bonusJson Json?; clausesJson Json?
  playerInterestScore Int?; sellingClubInterestScore Int?; buyingClubNeedScore Int?
  // relações nomeadas: buyingClub / sellingClub -> Club
}
```

### 3.6 Financeiro

```prisma
model FinancialTransaction {
  id String @id @default(cuid())
  clubId String
  type FinanceTransactionType
  description String?
  amount Decimal @db.Decimal(14, 2)
  seasonNumber Int?; occurredAt DateTime @default(now())
  metadata Json?
}

model ClubFinanceSnapshot {
  id String @id @default(cuid())
  clubId String; seasonId String
  cash Decimal @db.Decimal(14, 2)
  revenue Decimal @db.Decimal(14, 2); expenses Decimal @db.Decimal(14, 2)
  wages Decimal @db.Decimal(14, 2)
  transferSpent Decimal @db.Decimal(14, 2); transferReceived Decimal @db.Decimal(14, 2)
  debt Decimal @db.Decimal(14, 2) @default(0)
  profit Decimal @db.Decimal(14, 2)
  @@unique([clubId, seasonId])
}
```

### 3.7 Competição

```prisma
model Competition {
  id String @id @default(cuid())
  worldId String
  name String
  type   CompetitionType
  format CompetitionFormat
  country String?; tier Int?; reputation Int @default(1)
  seasons CompetitionSeason[]
}

model CompetitionSeason {
  id String @id @default(cuid())
  competitionId String; seasonId String
  name String; status SeasonStatus @default(PLANNED)
  startsAt DateTime; endsAt DateTime?
  prizeJson Json?; rulesJson Json?   // regras flexíveis por competição
  clubs CompetitionClub[]; stages CompetitionStage[]; matches Match[]
  @@unique([competitionId, seasonId])
}

model CompetitionClub {
  id String @id @default(cuid())
  competitionSeasonId String; clubId String
  seed Int?; groupName String?
  @@unique([competitionSeasonId, clubId])
}

model CompetitionStage {
  id String @id @default(cuid())
  competitionSeasonId String
  name String; order Int; format CompetitionFormat
  startsAt DateTime?; endsAt DateTime?
  matches Match[]
}
```

Exemplo de `rulesJson` de `CompetitionSeason` (do chat-fonte):

```json
{
  "pointsWin": 3, "pointsDraw": 1, "pointsLoss": 0,
  "tieBreakers": ["points", "wins", "goalDifference", "goalsFor", "headToHead"],
  "allowExtraTime": false, "allowPenaltyShootout": false,
  "maxForeignPlayers": null, "suspensionYellowCards": 3
}
```

### 3.8 Partida e Simulação

Núcleo da simulação. Destaque para o replay determinístico (`randomSeed`, `simulationSeed`, `engineVersion`) e os snapshots Json de força/momentum.

```prisma
model Match {
  id String @id @default(cuid())
  competitionSeasonId String?; stageId String?
  homeClubId String; awayClubId String
  seasonNumber Int; roundNumber Int?
  scheduledAt DateTime; startedAt DateTime?; finishedAt DateTime?
  status MatchStatus @default(SCHEDULED)
  homeGoals Int @default(0); awayGoals Int @default(0)
  homeExpectedGoals Decimal? @db.Decimal(8, 4)
  awayExpectedGoals Decimal? @db.Decimal(8, 4)
  simulationSeed String?           // seed do resultado
  simulatedOffline Boolean @default(false)
  // relações: teamStates, lineups, events, playerStats, simulation(1:1), decisionPoints
}

model MatchSimulation {
  id String @id @default(cuid())
  worldId String
  matchId String @unique
  engineVersion String              // versão do motor usada (compatibilidade de replay)
  tickIntervalSeconds Int
  totalTicks Int
  homeStrengthSnapshot Json         // fotografia da força ofensiva/defensiva
  awayStrengthSnapshot Json
  randomSeed String                 // determinismo da simulação
  balanceJson Json?
  finalMomentumJson Json?
  ticks MatchSimulationTick[]
}

model MatchSimulationTick {
  id String @id @default(cuid())
  simulationId String
  minute Int; second Int?
  homeMomentum Decimal @db.Decimal(8, 4); awayMomentum Decimal @db.Decimal(8, 4)
  homeThreat Decimal @db.Decimal(8, 4);   awayThreat Decimal @db.Decimal(8, 4)
  homeFatigueAvg Decimal @db.Decimal(8, 4); awayFatigueAvg Decimal @db.Decimal(8, 4)
  data Json?
}

model MatchTeamState {
  id String @id @default(cuid())
  matchId String; clubId String
  controlSource MatchControlSource   // USER_ONLINE / USER_OFFLINE_AI / FULL_AI / SYSTEM
  mentality TacticalMentality @default(BALANCED)
  pressing PressingIntensity @default(MEDIUM)
  marking  MarkingStyle @default(ZONAL)
  tempo    TempoStyle @default(NORMAL)
  formation String
  lineHeight Int @default(50); defensiveWidth Int @default(50); attackingWidth Int @default(50)
  riskLevel Int @default(50)
  morale Int @default(50); fatigueAvg Int @default(0); tacticalCohesion Int @default(50)
  currentInstructions Json?
  @@unique([matchId, clubId])
}

model MatchLineup {
  id String @id @default(cuid())
  matchId String; clubId String
  formation String; isInitial Boolean @default(true)
  players MatchLineupPlayer[]
}

model MatchLineupPlayer {
  id String @id @default(cuid())
  lineupId String; playerId String
  position PlayerPosition; shirtNumber Int?; isStarter Boolean @default(true)
  enteredMinute Int?; leftMinute Int?
  tacticalRole String?; individualInstructionJson Json?
}

model MatchEvent {
  id String @id @default(cuid())
  matchId String
  clubId String?; playerId String?; relatedPlayerId String?
  type MatchEventType
  minute Int; second Int?
  description String; importance Int @default(1)
  x Decimal? @db.Decimal(8, 4); y Decimal? @db.Decimal(8, 4)  // coordenada no campo
  data Json?
}

model PlayerMatchStats {
  id String @id @default(cuid())
  matchId String; playerId String
  minutesPlayed Int @default(0)
  goals Int; assists Int; shots Int; shotsOnTarget Int
  passesAttempted Int; passesCompleted Int
  tackles Int; interceptions Int; foulsCommitted Int; yellowCards Int; redCards Int
  saves Int; goalsConceded Int
  rating Decimal @db.Decimal(4, 2) @default(6.00)
  fatigueStart Int; fatigueEnd Int
  moraleImpact Int @default(0)
  @@unique([matchId, playerId])
}
```

Pontos de decisão (interação do usuário durante a partida):

```prisma
model MatchDecisionPoint {
  id String @id @default(cuid())
  matchId String; clubId String
  type DecisionPointType; minute Int
  title String; description String
  urgency RecommendationImpact
  createdByStaffQuality Int?
  resolved Boolean @default(false); resolvedAt DateTime?
  chosenActionId String?; data Json?
  recommendations MatchActionRecommendation[]
}

model MatchActionRecommendation {
  id String @id @default(cuid())
  decisionPointId String
  title String; description String
  impact RecommendationImpact; confidence Int
  tacticalChangeJson Json?; substitutionJson Json?; riskJson Json?
  generatedByStaffRole StaffRole?      // origem da recomendação (qualidade da comissão)
  generatedByStaffQuality Int?
}
```

### 3.9 IA dos Clubes

```prisma
model ClubAIProfile {
  id String @id @default(cuid())
  clubId String @unique
  aggressiveness Int @default(50); patience Int @default(50)
  youthPreference Int @default(50); transferRisk Int @default(50)
  financialDiscipline Int @default(50)
  tacticalFlexibility Int @default(50); substitutionTiming Int @default(50)
  injuryRiskTolerance Int @default(50)
  offlineDecisionLevel Int @default(1)   // profundidade de decisão quando usuário está offline
  strategyJson Json?
  decisions AIDecision[]
}

model AIDecision {
  id String @id @default(cuid())
  clubAIProfileId String
  context String; decisionType String
  inputJson Json; outputJson Json          // rastreabilidade completa da decisão
  confidence Int?; impactScore Int?
}
```

### 3.10 Estatísticas, Narrativa e Notificação

```prisma
model ClubSeasonStats {
  id String @id @default(cuid())
  clubId String; seasonId String
  matchesPlayed Int; wins Int; draws Int; losses Int
  goalsFor Int; goalsAgainst Int; points Int
  finalPosition Int?; titlesWon Int @default(0)
  averageAttendance Int @default(0)
  fanMood MoodLevel @default(NEUTRAL)
  @@unique([clubId, seasonId])
}

model PlayerSeasonStats {
  id String @id @default(cuid())
  playerId String; seasonId String; clubId String?
  appearances Int; starts Int; minutesPlayed Int
  goals Int; assists Int; yellowCards Int; redCards Int
  averageRating Decimal @db.Decimal(4, 2) @default(0)
  injuriesCount Int @default(0)
  @@unique([playerId, seasonId])
}

model FanSentiment {
  id String @id @default(cuid())
  clubId String; seasonNumber Int?
  mood MoodLevel @default(NEUTRAL)
  pressure Int @default(0); satisfaction Int @default(50)
  reason String?; data Json?
}

model Narrative {
  id String @id @default(cuid())
  worldId String; clubId String?; playerId String?
  type NarrativeType
  title String; description String
  intensity Int @default(1); isActive Boolean @default(true)
  startsAt DateTime @default(now()); endsAt DateTime?
  effectsJson Json?    // efeitos aplicados (moral, pressão, valor etc.)
}

model Notification {
  id String @id @default(cuid())
  userId String?; clubId String?
  type NotificationType
  title String; message String
  isRead Boolean @default(false); priority Int @default(1)
  payload Json?
  createdAt DateTime @default(now()); readAt DateTime?
}
```

### 3.11 Auditoria e Configuração de Regras

Models recomendados no chat-fonte para evitar regras hardcoded e rastrear o mundo:

```prisma
model GameAuditLog {
  id String @id @default(cuid())
  worldId String?; userId String?; clubId String?
  action String; entity String; entityId String?
  beforeJson Json?; afterJson Json?; metadata Json?
  createdAt DateTime @default(now())
}

model GameRuleConfig {
  id String @id @default(cuid())
  worldId String
  key String; value Json
  @@unique([worldId, key])
}
```

Exemplos de chaves de `GameRuleConfig`: `minimumRestDaysBetweenMatches`, `maxPlayersPerClub`, `minPlayersPerClub`, `retirementAgeMin`, `retirementAgeMax`, `baseInjuryChance`, `baseTransferTax`, `yellowCardsForSuspension`, `offlineAiAggressivenessLimit`, `newUserCatchUpSeasons`.

> **Pendência:** `GameAuditLog` e `GameRuleConfig` foram propostos como "entidades novas recomendadas" nos módulos 29 e 30, sem relações Prisma explícitas para os demais models. Formalizar FKs/índices na modelagem final.

---

## 4. Os 30 módulos de domínio

Cada módulo é uma área lógica do backend (responsabilidade, entidades, serviços, jobs e eventos próprios).

1. **Mundo do Jogo** — controla o universo online: cria mundo, avança data virtual, temporadas e status geral. Entidades: `GameWorld`, `Season`, `GameEconomyConfig`, `EconomySnapshot`, `UserSession`.
2. **Usuários e Sessão Online** — quem joga, qual clube controla e se está online durante a partida (habilita pontos de decisão interativos). Entidades: `User`, `UserSession`, `ClubUser`, `Notification`.
3. **Clubes** — identidade, evolução e estado geral. Crescimento por conjunto de fatores (esportivo, estrutura, finanças, elenco, reputação, torcida), não só por resultados. Entidades: `Club`, `ClubDepartment`, `ClubSeasonStats`, `ClubFinanceSnapshot`, `FanSentiment`, `Narrative`, `ClubAIProfile`.
4. **Estrutura do Clube** — departamentos internos e seus efeitos (médico, treino, olheiros, comunicação, diretoria, análise de dados). Entidades: `ClubDepartment`, `StaffMember`, `StaffContract`, `FinancialTransaction`.
5. **Jogadores** — vida completa do jogador (núcleo, atributos, biografia, personalidade, desenvolvimento, histórico, stats, lesões, suspensões). Contém a geração de jogadores.
6. **Desenvolvimento de Jogadores** — evolução/regressão por idade, potencial, minutagem, treino, estrutura, moral e lesões acumuladas. Entidades: `PlayerDevelopment`, `TrainingPlan`, `TrainingPlayerEntry`, `PlayerAttributes`.
7. **Comissão Técnica e Funcionários** — técnicos, médicos, olheiros, psicólogos, diretores; impacto por cargo. Entidades: `StaffMember`, `StaffContract`, `ClubDepartment`, `MatchActionRecommendation`, `AIDecision`.
8. **Treinamento** — planos de treino do clube e carga individual; evolução vs. fadiga e risco de lesão. Entidades: `TrainingPlan`, `TrainingPlayerEntry`, `PlayerDevelopment`, `PlayerAttributes`, `PlayerInjury`.
9. **Médico** — lesões, recuperação, risco físico e disponibilidade. Entidades: `PlayerInjury`, `Player`, `ClubDepartment`, `StaffMember`, `MatchEvent`, `TrainingPlayerEntry`.
10. **Mercado e Transferências** — compra, venda, empréstimos, jogadores livres e valor de mercado. Entidades: `TransferListing`, `TransferOffer`, `PlayerContract`, `Player`, `Club`, `FinancialTransaction`, `EconomySnapshot`.
11. **Financeiro** — caixa, salários, receitas, despesas, orçamento e saúde financeira. Entidades: `FinancialTransaction`, `ClubFinanceSnapshot`, `Club`, `PlayerContract`, `StaffContract`, `CompetitionSeason`.
12. **Economia Global** — mantém o mundo equilibrado (oferta/escassez de jogadores, inflação, dinheiro em circulação). Entidades: `GameEconomyConfig`, `EconomySnapshot`, `Club`, `Player`, `TransferOffer`, `FinancialTransaction`.
13. **Campeonatos** — competições, temporadas, clubes participantes, fases, rodadas e regras (`rulesJson`). Entidades: `Competition`, `CompetitionSeason`, `CompetitionClub`, `CompetitionStage`, `Match`, `ClubSeasonStats`.
14. **Calendário** — monta o calendário da temporada respeitando descanso mínimo, encaixe de fases e janelas de jogos online. Entidades: `Season`, `CompetitionSeason`, `CompetitionStage`, `Match`, `Club`.
15. **Partidas** — ciclo de vida da partida (criação → escalação → simulação → eventos → decisões → finalização → stats). Entidades: `Match`, `MatchTeamState`, `MatchLineup`, `MatchLineupPlayer`, `MatchEvent`, `PlayerMatchStats`, `MatchDecisionPoint`, `MatchActionRecommendation`.
16. **Engine de Simulação** — cálculo real por ticks (1 tick ≈ 1 minuto; 90 ticks = jogo). Momentum, criação de chances, resolução de gols, fadiga e rating. Entidades: `MatchSimulation`, `MatchSimulationTick`, `MatchTeamState`, `MatchEvent`, `PlayerMatchStats`, `PlayerAttributes`.
17. **Tática** — formações, instruções e mudanças em jogo; cada alteração afeta momentum, risco, chance ofensiva, fadiga e disciplina. Entidades: `MatchTeamState`, `MatchLineup`, `MatchLineupPlayer`, `MatchDecisionPoint`, `MatchActionRecommendation`.
18. **Pontos de Decisão** — momentos estratégicos para o usuário agir; qualidade da recomendação depende da comissão técnica. Entidades: `MatchDecisionPoint`, `MatchActionRecommendation`, `Notification`, `StaffMember`, `ClubDepartment`.
19. **IA dos Clubes** — decisões automáticas de clubes por máquina ou de usuários offline (IA full decide tudo; usuário offline decide só o essencial). Entidades: `ClubAIProfile`, `AIDecision`, `Club`, `MatchTeamState`, `TransferOffer`, `TrainingPlan`.
20. **Narrativas, Mídia e Torcida** — dá vida ao mundo (pressão da torcida, boatos, crises, disputas de título). Entidades: `Narrative`, `FanSentiment`, `Notification`, `PlayerPersonality`, `ClubSeasonStats`.
21. **Notificações** — alerta o usuário sobre tudo que exige atenção; tempo real durante partidas (WebSocket/SSE/Redis Pub-Sub/BullMQ). Entidades: `Notification`, `User`, `Club`, `MatchDecisionPoint`, `TransferOffer`, `Narrative`, `ScoutReport`.
22. **Estatísticas** — consolida dados de jogadores, clubes, partidas e temporadas; gera rankings (artilharia, notas, disciplina). Entidades: `PlayerMatchStats`, `PlayerSeasonStats`, `ClubSeasonStats`, `Match`, `MatchEvent`.
23. **Fim de Temporada** — fecha a temporada e prepara a próxima (premiações, envelhecimento, aposentadorias, contratos, rebalanceamento, novo calendário). Módulo crítico para manter o mundo vivo e equilibrado.
24. **Balanceamento de Novos Usuários** — resolve a entrada de usuário em temporada avançada (clube com potencial acelerado, clube abandonado por IA, clube emergente protegido, sistema de oportunidade). Serviço-chave: `findBestEntryClubsForNewUser(worldId)`.
25. **Scouting** — descobre jogadores e gera relatórios; precisão depende do olheiro, do departamento e do tempo de observação. Entidades: `ScoutReport`, `Player`, `StaffMember`, `ClubDepartment`, `PlayerBackground`, `PlayerPersonality`.
26. **Contratos** — contratos de jogadores e funcionários; renovação depende de moral, tempo de clube, salário, ambição, lealdade e papel no elenco. Entidades: `PlayerContract`, `StaffContract`, `Player`, `StaffMember`, `Club`, `FinancialTransaction`.
27. **Elenco** — monta e gerencia o grupo; profundidade, papéis, disponibilidade e detecção de fraquezas (poucos zagueiros, folha alta, elenco velho). Entidades: `Club`, `Player`, `PlayerContract`, `PlayerInjury`, `PlayerSuspension`, `PlayerSeasonStats`.
28. **Classificação e Tabela** — standings, critérios de desempate e zonas de acesso/rebaixamento. Entidades: `CompetitionSeason`, `CompetitionClub`, `Match`, `ClubSeasonStats`.
29. **Auditoria e Histórico** — rastreia decisões importantes (quem vendeu, quem escalou, quando a IA/sistema agiu). Entidade recomendada: `GameAuditLog`.
30. **Configuração de Regras** — evita regras hardcoded; parâmetros ajustáveis por mundo para balanceamento sem mexer no código. Entidade recomendada: `GameRuleConfig`.

> **Nota:** o chat-fonte destaca o núcleo indispensável (World, Clubs, Players, Staff, Club Departments, Finance, Economy, Competitions, Calendar, Matches, Match Engine, Tactics, Decision Points, AI, Season Closure) e aponta o trio mais sensível — **Economy + Season Closure + Player Lifecycle** — como responsável por não quebrar o jogo após várias temporadas.

---

## 5. Algoritmo de geração de jogador em 11 passos

Fluxo de `PlayerGeneratorService.generatePlayer()`, fiel ao chat-fonte. Preenche `Player` + `PlayerBackground` + `PlayerPersonality` + `PlayerAttributes` + `PlayerDevelopment`.

1. **Define nacionalidade** (`Player.nationality`).
2. **Define idade** — dentro de `GameEconomyConfig.minGeneratedPlayerAge`..`maxGeneratedPlayerAge`; gera `birthDate`/`ageVirtual`.
3. **Define posição** — `primaryPosition` (e opcional `secondaryPosition`), `dominantFoot`.
4. **Define biografia** — preenche `PlayerBackground` (`childhoodPovertyLevel`, `familyStability`, `violenceExposure`, `educationLevel`, `earlyFootballAccess`, presença familiar, `lifeStorySummary`, `generatedTraitJson`).
5. **Define personalidade** — preenche `PlayerPersonality` (`grit`, `emotionalStability`, `discipline`, `ego`, `pressureHandling`, `adaptability`, `hiddenTraits`, etc.).
6. **Define atributos base** — preenche `PlayerAttributes` (técnicos, físicos, mentais; atributos de goleiro só para GKs).
7. **Aplica modificadores de vida** — a biografia altera atributos/personalidade. Exemplo do chat:

   ```js
   if (background.childhoodPovertyLevel > 70) { determination += 8; workRate += 5; pressureHandling += 4; }
   if (background.familyStability < 30)       { emotionalStability -= 6; moraleVolatility += 8; }
   if (background.violenceExposure > 60)      { aggression += 7; bravery += 6; discipline -= 3; }
   if (background.earlyFootballAccess > 70)   { technique += 5; firstTouch += 4; decisions += 3; }
   ```

8. **Aplica modificadores culturais/nacionais mínimos** — ajustes leves conforme nacionalidade.
9. **Calcula potencial** (`Player.potentialAbility`) e a curva em `PlayerDevelopment` (`peakAgeStart`/`peakAgeEnd`, `declineRate`, taxas de crescimento).
10. **Calcula valor de mercado** (`Player.marketValue`) — fatores: idade, posição, atributos, potencial, contrato restante, salário, moral, reputação, escassez de jogadores, dinheiro médio dos clubes, inflação do mundo, desempenho recente.
11. **Calcula expectativa salarial** (`Player.wageExpectation`).

> **Nota:** `generationSource` (`INITIAL_WORLD`, `SCOUT_FOUND`, `YOUTH_ACADEMY`, `REGEN_AFTER_RETIREMENT`, `MARKET_BALANCE`) e `generatedAtSeasonNumber` registram a origem de cada jogador gerado — usados pela Economia Global e pelo Fim de Temporada no rebalanceamento de oferta.
