# Modelo de Dados (Schema Prisma Canônico e Domínio)

> **Status:** Consolidado — fonte única da verdade do modelo de dados (schema canônico reconciliado) · **Fontes fundidas:** chats/entidades-do-banco-de-dados-inicial.md (visão de domínio e módulos, seções 1–5) + chats/ux-do-jogo.md (detalhamento granular por domínio, seção 6) · **Revisão:** 2026-07-11

Este documento é o **modelo de dados canônico** do **Grinta** — um manager de futebol online (estilo Brasfoot), com mundo persistente, clubes que crescem ao longo das temporadas e jogadores únicos gerados com biografia e personalidade. É a **fonte única da verdade** para o schema: em caso de divergência com outros documentos, este prevalece.

Duas iterações históricas do modelo (a visão de domínio das seções 1–5 e o detalhamento granular do então "Bloco 26", hoje a seção 6) foram **fundidas num único schema canônico**. As decisões de reconciliação — UUIDv7 como PK, dinheiro em `BigInt amountMinor` + `currencyId`, `gameWorldId` como chave de partição, FK composta `(gameWorldId, id)`, `Person` separado de `Player`, e a divisão de status de partida (runtime/resultado/homologação) — já estão aplicadas ao longo do texto e não constituem mais pendência.

O schema foi desenhado como estrutura robusta e reaproveitável — **não** como MVP. Cobre identidade de usuário, mundo, clubes, jogadores, comissão técnica, economia, campeonatos, simulação de partida, IA, narrativas e histórico.

## Sumário

1. [Introdução técnica](#1-introdução-técnica)
2. [Enums](#2-enums)
3. [Models por domínio](#3-models-por-domínio)
4. [Os 30 módulos de domínio](#4-os-30-módulos-de-domínio)
5. [Algoritmo de geração de jogador em 11 passos](#5-algoritmo-de-geração-de-jogador-em-11-passos)
6. [Modelo detalhado por domínio (entidades granulares)](#6-modelo-detalhado-por-domínio-entidades-granulares)

Notas de ligação: regras de integridade referencial (FK), transações e particionamento operacional → `./01-arquitetura-de-dados.md`. Design dos sistemas de jogo (regras, fórmulas, balanceamento) → `../01-game-design/`.

---

## 1. Introdução técnica

- **Banco:** PostgreSQL.
- **ORM:** Prisma (`prisma-client-js`), `datasource db` com `provider = "postgresql"` e `url = env("DATABASE_URL")`.
- **Chaves primárias — Canônico: UUIDv7.** Todos os models usam `String @id @default(uuid(7)) @db.Uuid`. Alinha-se a [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md) (seção "Convenções de dados e tipos" e Decisão 19.8): UUIDv7 dá unicidade distribuída, ordenação temporal aproximada, geração fora do banco e — sobretudo — habilita as **FKs compostas por mundo** (par candidato `(gameWorldId, id)` da Decisão 19.8, que protege contra relações entre mundos). O antigo `cuid()` foi eliminado do schema.
- **Multi-mundo — Canônico: `gameWorldId`.** O jogo suporta múltiplos universos paralelos e persistentes. O campo **`gameWorldId String @db.Uuid`** (referência a `GameWorld`) é a **chave de particionamento lógico**: toda entidade de topo do mundo (`Club`, `Person`, `Player`, `StaffMember`, `Competition`, `MatchSimulation`, `Narrative`, `Season`, etc.) carrega `gameWorldId` e é indexada por ele. Isso isola os dados de cada mundo e permite operar/balancear cada universo de forma independente. **A nomenclatura é `gameWorldId`** (não `worldId`), consistente com a seção 6 e com a Decisão 19.8; no banco físico mapeia para `game_world_id` (snake_case, Decisão 19.7).
- **FK composta por mundo — Canônico (Decisão 19.8).** Relações entre entidades do mesmo mundo referenciam o par `(gameWorldId, id)`, não o UUID isolado. Cada pai central declara `@@unique([gameWorldId, id])` e os filhos críticos usam `references: [gameWorldId, id]` com `onDelete: Restrict`. A unicidade global do UUID **não** é considerada proteção suficiente contra vínculos indevidos entre mundos.
- **Dinheiro — Canônico: `BigInt` na unidade mínima.** Todo valor monetário é `amountMinor BigInt` (ou campo `…Minor BigInt`) + `currencyId String @db.Uuid` (FK à entidade de moeda `Currency`). Ex.: R$ 125,90 → `12590`. **Proibido** `Float`/`Double`/`Decimal` para caixa, salários, cláusulas, bônus, orçamentos, dívidas, prêmios, taxas e qualquer quantia financeira. `Decimal` fica restrito a grandezas não-monetárias fracionárias com justificativa documentada (taxas de crescimento, momentum, xG, rating), conforme [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md).
- **Estrutura robusta (não-MVP):** presença de snapshots econômicos e financeiros, histórico de clubes por jogador, camadas separadas de atributos/personalidade/desenvolvimento, e simulação de partida com replay determinístico via **`randomSeed`** / **`simulationSeed`** e **`engineVersion`**.
- **Determinismo e auditoria da simulação:** `MatchSimulation` guarda `engineVersion`, `randomSeed`, `homeStrengthSnapshot`/`awayStrengthSnapshot` (Json) e `finalMomentumJson`; `MatchSimulationTick` guarda o estado tick-a-tick. Isso permite reproduzir e auditar qualquer partida.

> **Canônico (reconciliação aplicada):** as duas iterações históricas do modelo — a visão de domínio das seções 1–5 e o detalhamento granular da seção 6 (ex-"Bloco 26") — foram **fundidas neste documento**. A seção 6 deixa de ser "iteração paralela a reconciliar" e passa a ser o **detalhamento canônico por domínio**. Decisões vencedoras, já aplicadas ao texto: (1) **PK UUIDv7** em todos os models; (2) **dinheiro em `BigInt amountMinor` + `currencyId`**, ponto flutuante proibido; (3) **`gameWorldId`** como chave de partição; (4) **FK composta `(gameWorldId, id)`** entre entidades do mesmo mundo (Decisão 19.8); (5) **`Person` separado de `Player`** (dados pessoais/biografia × papel esportivo/atributos); (6) status de partida **desmembrado** em runtime/resultado/homologação, alinhado à máquina de estados do catálogo (ver §2 e §6.3.7); (7) convenções de **schemas PostgreSQL por domínio, snake_case, exclusão lógica e concorrência otimista (`version`)**, já consolidadas em [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md). Onde a seção 6 usa nomes mais granulares (`UserAccount`, `WorldParticipant`, `ClubControl`, `ClubIdentityPeriod`, taxonomia de enums por domínio), **esses nomes são os canônicos**; os nomes simplificados das seções 1–5 (`User`, `ClubUser`) são apresentados como visão introdutória/agregada e mapeiam para as entidades granulares da seção 6.

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
| **MatchRuntimeStatus** (ciclo de vida — canônico) | `SCHEDULED`, `PRE_MATCH`, `LIVE`, `PAUSED_FOR_DECISION`, `FINISHED`, `PROCESSED` |
| **MatchResultStatus** (desfecho do jogo) | `PENDING`, `NORMAL`, `WALKOVER`, `CANCELLED`, `ABANDONED` |
| **HomologationStatus** (confirmação oficial) | `PENDING`, `PROVISIONAL`, `HOMOLOGATED`, `UNDER_APPEAL`, `OVERTURNED` |
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

> **Canônico (`MatchStatus` desmembrado):** o status único da iteração antiga (`SCHEDULED`, `LIVE`, `PAUSED`, `FINISHED`, `CANCELLED`, `WALKOVER`, `SIMULATED_OFFLINE`) foi **substituído por três enums de responsabilidade distinta**, conforme a seção 6.3.7 e a **máquina de estados canônica** de [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md):
>
> - **`MatchRuntimeStatus`** = ciclo de vida do runtime: `SCHEDULED → PRE_MATCH → LIVE → PAUSED_FOR_DECISION → FINISHED → PROCESSED` (com o laço `LIVE → PAUSED_FOR_DECISION → LIVE`; `FINISHED` nunca volta a `LIVE`). É a referência de ciclo de vida.
> - **`MatchResultStatus`** = natureza do desfecho: `PENDING`, `NORMAL`, `WALKOVER`, `CANCELLED`, `ABANDONED`.
> - **`HomologationStatus`** = confirmação oficial/administrativa: `PENDING`, `PROVISIONAL`, `HOMOLOGATED`, `UNDER_APPEAL`, `OVERTURNED`.
>
> **Mapeamento dos desfechos antigos:** `PAUSED` → `PAUSED_FOR_DECISION` (runtime); `WALKOVER` e `CANCELLED` → `MatchResultStatus` (deixam de ocupar o ciclo de vida); `SIMULATED_OFFLINE` **não é status de partida** — passa a ser expresso por `Match.simulatedOffline` (Boolean) + `MatchControlSource` (`USER_OFFLINE_AI`/`SYSTEM`); `ABANDONED` cobre a partida interrompida sem conclusão. O enum coarse `MatchStatus` fica **superado** por `MatchRuntimeStatus`.

---

## 3. Models por domínio

São ~60 models. Abaixo os campos-chave e relações principais, agrupados por área.

### 3.1 Mundo e Usuário

> **Nota de nomenclatura:** `User` é a visão introdutória da entidade global de conta; a forma canônica granular é **`UserAccount`** (§6.3.1), sem `gameWorldId`, e o vínculo usuário↔mundo é `WorldParticipant`, o controle de clube é `ClubControl` (não `ClubUser`). Os models abaixo mostram a estrutura essencial já com os tipos canônicos (UUIDv7, FKs `@db.Uuid`, `version` de concorrência otimista).

```prisma
model User {                            // forma canônica granular: UserAccount (§6.3.1)
  id          String   @id @default(uuid(7)) @db.Uuid
  name        String
  email       String   @unique         // e-mail normalizado: 1 conta por e-mail
  role        UserRole @default(PLAYER)
  avatarUrl   String?
  lastLoginAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  version     Int      @default(1)      // concorrência otimista
  worldParticipations WorldParticipant[] // vínculo com mundos; controle de clube via ClubControl (não ClubUser)
  sessions      UserSession[]
  notifications Notification[]
}

model UserSession {
  id          String  @id @default(uuid(7)) @db.Uuid
  userId      String  @db.Uuid
  gameWorldId String? @db.Uuid
  isOnline    Boolean @default(false)  // define se o usuário pode interagir na partida ao vivo
  lastSeenAt  DateTime @default(now())
  device      String?
  ipAddress   String?
  user  User       @relation(fields: [userId], references: [id])
  world GameWorld? @relation(fields: [gameWorldId], references: [id])
  @@index([gameWorldId])
}

model GameWorld {
  id                     String      @id @default(uuid(7)) @db.Uuid
  name                   String
  status                 WorldStatus @default(CREATING)
  currentSeasonId        String?     @db.Uuid
  currentRuleSetVersionId String?    @db.Uuid   // versão de ruleset vigente (ver GameWorldRuleSetVersion, §6.3.2)
  currentDate            DateTime               // data virtual do mundo
  timezone               String @default("America/Sao_Paulo")
  maxClubs               Int
  initialClubCashMinor   BigInt                 // caixa inicial em unidade mínima
  currencyId             String @db.Uuid        // moeda-base do mundo (FK Currency)
  createdAt              DateTime @default(now())
  version                Int @default(1)
  // relações: seasons, clubs, users(UserSession), economyConfig,
  // economySnapshots, competitions, players, staffMembers,
  // matchSimulations, narratives
  // GameWorld é a raiz de partição: seu próprio `id` é o valor de gameWorldId dos filhos.
}

model Season {
  id          String       @id @default(uuid(7)) @db.Uuid
  gameWorldId String       @db.Uuid
  number      Int
  name        String
  status      SeasonStatus @default(PLANNED)
  startsAt    DateTime
  endsAt      DateTime?
  version     Int          @default(1)
  gameWorld   GameWorld    @relation(fields: [gameWorldId], references: [id])
  @@unique([gameWorldId, number])
  @@unique([gameWorldId, id])
  @@index([gameWorldId])
  // relações: clubSeasonStats, playerSeasonStats, competitionSeasons,
  // financeSnapshots, economySnapshots
}
```

> **Canônico (versão de ruleset):** o `GameWorld` carrega **`currentRuleSetVersionId String @db.Uuid`** (FK a `GameWorldRuleSetVersion`, §6.3.2), usado por [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md) para versionar as fórmulas vigentes e auditar resultados históricos com a regra da época; os registros de evento (`DomainEvent`/`MatchEvent`) também referenciam a versão de ruleset aplicada. A correspondência entre `GameFormula.version` (catálogo de regras) e a `GameWorldRuleSetVersion` do mundo é 1:1 por publicação: publicar um novo conjunto de fórmulas cria uma nova `GameWorldRuleSetVersion` e avança `currentRuleSetVersionId`.
>
> **Recomendação (a ratificar):** adotar `GameWorldRuleSetVersion.publishedFormulaVersion Int` como espelho de `GameFormula.version` (racional: dá rastreabilidade direta entre a versão de fórmula do catálogo e a versão de ruleset ativa no mundo, sem lookup por join, e facilita auditar "qual fórmula valia neste tick").

**Configuração e snapshots econômicos globais** (por mundo):

```prisma
model GameEconomyConfig {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid @unique
  basePlayerPriceMultiplier Decimal @db.Decimal(8, 4)  // não-monetário: multiplicador fracionário
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
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  seasonId    String? @db.Uuid
  currencyId  String  @db.Uuid          // moeda dos agregados monetários abaixo
  totalClubs Int; totalActiveClubs Int
  totalPlayers Int; totalActivePlayers Int; totalRetiredPlayers Int; totalFreeAgents Int
  totalCashInWorldMinor   BigInt        // dinheiro: unidade mínima
  averageClubCashMinor    BigInt
  averagePlayerValueMinor BigInt
  averageWageMinor        BigInt
  marketInflationIndex Decimal @db.Decimal(10, 4)  // índices: não-monetários (Decimal justificado)
  playerScarcityIndex  Decimal @db.Decimal(10, 4)
  balanceScore         Decimal @db.Decimal(10, 4)
  @@index([gameWorldId])
}
```

### 3.2 Clube

```prisma
model Club {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  name String; shortName String; slug String
  city String?; country String; foundedYear Int?
  controlType ClubControlType @default(AI)
  status      ClubStatus      @default(ACTIVE)
  reputation Int @default(1); level Int @default(1)
  fanBaseSize Int @default(0); boardPatience Int @default(50); pressureLevel Int @default(0)
  currencyId     String @db.Uuid           // moeda operacional do clube (FK Currency)
  cashMinor           BigInt               // dinheiro em unidade mínima
  wageBudgetMinor     BigInt
  transferBudgetMinor BigInt
  version     Int @default(1)
  gameWorld   GameWorld @relation(fields: [gameWorldId], references: [id])
  @@unique([gameWorldId, slug])
  @@unique([gameWorldId, id])            // par de referência para FKs compostas por mundo (Decisão 19.8)
  @@index([gameWorldId])
  // relações principais: controls(ClubControl), structures(ClubDepartment), players,
  // staffContracts, playerContracts, finances, financeSnapshots,
  // seasonStats, transferListings, transferOffers(made/received),
  // homeMatches/awayMatches, matchStates, lineups, trainingPlans,
  // aiProfile, narratives, notifications, scoutingReports, fanSentiments
  // Detalhamento canônico (identidade/controle/governança em períodos): §6.3.3.
}

// ClubUser é a visão introdutória do controle de clube; a forma canônica é
// ClubControl (+ ClubControlPeriod), com um único controle ativo por clube (§6.3.3).
model ClubControl {
  id                String @id @default(uuid(7)) @db.Uuid
  gameWorldId       String @db.Uuid
  clubId            String @db.Uuid
  worldParticipantId String @db.Uuid       // participante do mundo que controla o clube
  controlType       ClubControlType
  isActive          Boolean @default(true)
  startsAtWorldTick BigInt; endsAtWorldTick BigInt?
  version           Int @default(1)
  club Club @relation(fields: [gameWorldId, clubId], references: [gameWorldId, id])
  @@index([gameWorldId, clubId])
  // Constraint (índice único parcial): um único ClubControl ACTIVE por (gameWorldId, clubId).
}

model ClubDepartment {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  clubId      String @db.Uuid
  currencyId  String @db.Uuid
  type   DepartmentType
  level  Int @default(1); maxLevel Int @default(5); qualityScore Int @default(10)
  maintenanceCostPerSeasonMinor BigInt
  upgradeCostMinor              BigInt
  effectJson Json?
  club Club @relation(fields: [gameWorldId, clubId], references: [gameWorldId, id])
  @@unique([clubId, type])
  @@index([gameWorldId, clubId])
}
```

### 3.3 Pessoa e Jogador (separados — canônico)

**Canônico: `Person` é separado de `Player`.** `Person` guarda os **dados pessoais e biográficos** de qualquer indivíduo único do mundo (nome, nacionalidade, nascimento, biografia, personalidade). `Player` é o **papel esportivo** dessa pessoa (posição, atributos, desenvolvimento, valor). Uma pessoa pode ter perfis distintos ao longo da vida: **um jogador aposentado que vira treinador continua sendo a mesma `Person`**, ganhando um `StaffMember` sem duplicar identidade. Por isso `Player.personId` é obrigatório e `unique(gameWorldId, personId)`. Biografia (`PlayerBackground`) e personalidade (`PlayerPersonality`) pertencem conceitualmente a `Person` (formas granulares em §6.3.4: `PersonPrivateProfile`, `PersonPersonalityProfile`); os models abaixo mostram a estrutura essencial.

```prisma
model Person {                          // dados pessoais/biografia (§6.3.4)
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  firstName String; lastName String; knownName String?
  nationality String; birthDate DateTime; ageVirtual Int
  gender Gender @default(MALE)
  status PlayerStatus @default(ACTIVE)   // ver PersonStatus/PlayerCareerStatus no detalhamento (§6.2)
  createdAt DateTime @default(now())
  version   Int @default(1)
  gameWorld GameWorld @relation(fields: [gameWorldId], references: [id])
  player    Player?
  // relações 1:1: background(biografia), personality
  @@unique([gameWorldId, id])
  @@index([gameWorldId])
}

model Player {                          // papel esportivo/atributos (§6.3.4)
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  personId    String @db.Uuid           // 1:1 com Person; mesma pessoa em papéis diferentes reusa Person
  clubId      String? @db.Uuid
  primaryPosition   PlayerPosition
  secondaryPosition PlayerPosition?
  dominantFoot      DominantFoot
  heightCm Int?; weightKg Int?
  status PlayerStatus @default(ACTIVE)
  generationSource        PlayerGenerationSource
  generatedAtSeasonNumber Int?
  currentAbility   Int
  potentialAbility Int
  currencyId          String @db.Uuid
  marketValueMinor    BigInt            // dinheiro em unidade mínima
  wageExpectationMinor BigInt
  // estado dinâmico
  morale Int @default(50); confidence Int @default(50); happiness Int @default(50)
  fatigue Int @default(0); matchSharpness Int @default(50)
  // traços persistentes
  injuryProneness Int @default(50); consistency Int @default(50)
  ambition Int @default(50); loyalty Int @default(50); professionalism Int @default(50)
  version Int @default(1)
  person Person @relation(fields: [personId], references: [id])
  // relações 1:1: attributes, development
  // relações 1:N: contracts, histories, injuries, suspensions,
  // seasonStats, matchStats, lineupEntries, matchEvents, trainingEntries,
  // scoutReports, transferListings, transferOffers, narratives
  @@unique([gameWorldId, personId])
  @@unique([gameWorldId, id])
  @@index([gameWorldId, clubId])
}
```

```prisma
model PlayerAttributes {
  id String @id @default(uuid(7)) @db.Uuid
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
  id String @id @default(uuid(7)) @db.Uuid
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
  id String @id @default(uuid(7)) @db.Uuid
  playerId String @unique
  grit Int; emotionalStability Int; discipline Int; ego Int
  pressureHandling Int; adaptability Int; socialInfluence Int; mediaHandling Int
  offFieldRisk Int; lifestyleBalance Int
  hiddenTraits Json?   // traços ocultos, revelados por scouting
}

model PlayerDevelopment {
  id String @id @default(uuid(7)) @db.Uuid
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
  id String @id @default(uuid(7)) @db.Uuid
  playerId String; clubId String
  joinedAtSeason Int; leftAtSeason Int?
  appearances Int @default(0); goals Int @default(0); assists Int @default(0)
  reason String?
}

model PlayerContract {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  playerId    String @db.Uuid
  clubId      String @db.Uuid
  currencyId  String @db.Uuid
  status ContractStatus @default(ACTIVE)
  startSeason Int; endSeason Int
  salaryPerSeasonMinor BigInt            // dinheiro em unidade mínima
  signingBonusMinor    BigInt @default(0)
  releaseClauseMinor   BigInt?
  moralePromiseJson Json?   // promessas feitas na assinatura
  roleInSquad String?
  version Int @default(1)
  player Player @relation(fields: [gameWorldId, playerId], references: [gameWorldId, id])
  club   Club   @relation(fields: [gameWorldId, clubId],   references: [gameWorldId, id])
  @@index([gameWorldId, playerId])
  // Detalhamento canônico (termos, períodos salariais, bônus, cláusulas, opções, promessas,
  // aditivos, rescisão) em §6.3.5. Invariante: sem dois contratos principais de emprego
  // incompatíveis e sobrepostos para o mesmo jogador.
}
```

### 3.4 Comissão Técnica, Treino e Médico

```prisma
model StaffMember {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  personId    String @db.Uuid           // reusa Person: ex-jogador vira staff sem duplicar identidade
  role        StaffRole
  qualityTier StaffQualityTier
  abilityScore Int; potentialScore Int; reputation Int @default(1)
  tacticalKnowledge Int @default(50); youthDevelopment Int @default(50)
  medicalKnowledge Int @default(50); negotiation Int @default(50)
  communication Int @default(50); discipline Int @default(50); dataAnalysis Int @default(50)
  version Int @default(1)
  person   Person @relation(fields: [personId], references: [id])
  contracts StaffContract[]
  @@unique([gameWorldId, personId])
  @@unique([gameWorldId, id])
  @@index([gameWorldId])
}

model StaffContract {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  staffId     String @db.Uuid
  clubId      String @db.Uuid
  currencyId  String @db.Uuid
  status ContractStatus @default(ACTIVE)
  startSeason Int; endSeason Int
  salaryPerSeasonMinor BigInt            // dinheiro em unidade mínima
  version Int @default(1)
  @@index([gameWorldId, clubId])
}

model TrainingPlan {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  clubId      String @db.Uuid
  seasonId    String @db.Uuid
  name String; focus TrainingFocus; intensity Int
  tacticalStyleJson Json?; createdByStaffId String? @db.Uuid
  startsAt DateTime; endsAt DateTime?
  entries TrainingPlayerEntry[]
  @@index([gameWorldId, clubId])
}

model TrainingPlayerEntry {
  id String @id @default(uuid(7)) @db.Uuid
  trainingPlanId String; playerId String
  focus TrainingFocus; workload Int
  technicalGain Decimal @db.Decimal(8, 4) @default(0)
  physicalGain  Decimal @db.Decimal(8, 4) @default(0)
  mentalGain    Decimal @db.Decimal(8, 4) @default(0)
  fatigueGain Int @default(0); injuryRiskGain Int @default(0)
}

model PlayerInjury {
  id String @id @default(uuid(7)) @db.Uuid
  playerId String
  severity InjurySeverity; name String; description String?
  occurredAt DateTime; expectedReturnAt DateTime?; recoveredAt DateTime?
  causedByMatchId String?; causedByTrainingPlanId String?
  medicalDepartmentLevelAtTime Int?   // registra qualidade médica no momento
}

model PlayerSuspension {
  id String @id @default(uuid(7)) @db.Uuid
  playerId String
  reason String; matchesRemaining Int; competitionSeasonId String?
  startsAt DateTime; endsAt DateTime?
}
```

### 3.5 Scouting e Mercado

```prisma
model ScoutReport {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  clubId      String @db.Uuid
  playerId    String @db.Uuid
  scoutStaffId String? @db.Uuid
  currencyId  String @db.Uuid
  accuracy Int
  estimatedCurrentAbility Int
  estimatedPotentialAbility Int
  estimatedMarketValueMinor BigInt        // dinheiro em unidade mínima
  personalityNotes String?; backgroundNotes String?
  recommendationScore Int
  discoveredAt DateTime @default(now()); expiresAt DateTime?
  @@index([gameWorldId, clubId])
}

model TransferListing {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  clubId      String @db.Uuid
  playerId    String @db.Uuid
  currencyId  String @db.Uuid
  status TransferStatus @default(LISTED)
  type   TransferType
  askingPriceMinor BigInt                 // dinheiro em unidade mínima
  listedAt DateTime @default(now()); expiresAt DateTime?
  reason String?
  offers TransferOffer[]
  @@index([gameWorldId, clubId])
}

model TransferOffer {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  listingId   String? @db.Uuid
  playerId    String @db.Uuid
  buyingClubId  String @db.Uuid
  sellingClubId String? @db.Uuid
  currencyId  String @db.Uuid
  status TransferStatus @default(NEGOTIATING)
  type   TransferType
  transferFeeMinor BigInt                  // dinheiro em unidade mínima
  salaryOfferMinor BigInt
  contractSeasons Int
  bonusJson Json?; clausesJson Json?
  playerInterestScore Int?; sellingClubInterestScore Int?; buyingClubNeedScore Int?
  // relações nomeadas: buyingClub / sellingClub -> Club
  @@index([gameWorldId, playerId])
  // Detalhamento canônico (transferência como processo: TransferCase + versões de oferta,
  // pagamentos parcelados, cláusulas, empréstimos) em §6.3.8.
}
```

### 3.6 Financeiro

```prisma
model FinancialTransaction {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  clubId      String @db.Uuid
  currencyId  String @db.Uuid
  type FinanceTransactionType
  description String?
  amountMinor BigInt                       // dinheiro em unidade mínima (proibido Float/Decimal)
  seasonNumber Int?; occurredAt DateTime @default(now())
  metadata Json?
  @@index([gameWorldId, clubId])
  // Visão introdutória do lançamento financeiro. Modelo canônico de contabilidade
  // (partidas dobradas: FinancialJournalEntry/FinancialJournalLine, débitos = créditos) em §6.3.9.
}

model ClubFinanceSnapshot {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  clubId      String @db.Uuid
  seasonId    String @db.Uuid
  currencyId  String @db.Uuid
  cashMinor            BigInt              // dinheiro em unidade mínima
  revenueMinor         BigInt
  expensesMinor        BigInt
  wagesMinor           BigInt
  transferSpentMinor   BigInt
  transferReceivedMinor BigInt
  debtMinor            BigInt @default(0)
  profitMinor          BigInt
  @@unique([clubId, seasonId])
  @@index([gameWorldId, clubId])
}
```

### 3.7 Competição

```prisma
model Competition {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  name String
  type   CompetitionType
  format CompetitionFormat
  country String?; tier Int?; reputation Int @default(1)
  seasons CompetitionSeason[]
  @@unique([gameWorldId, id])
  @@index([gameWorldId])
  // Canônico granular: definição permanente (CompetitionDefinition + versões) separada
  // da edição por temporada (CompetitionEdition); ver §6.3.7.
}

model CompetitionSeason {
  id String @id @default(uuid(7)) @db.Uuid
  competitionId String; seasonId String
  name String; status SeasonStatus @default(PLANNED)
  startsAt DateTime; endsAt DateTime?
  prizeJson Json?; rulesJson Json?   // regras flexíveis por competição
  clubs CompetitionClub[]; stages CompetitionStage[]; matches Match[]
  @@unique([competitionId, seasonId])
}

model CompetitionClub {
  id String @id @default(uuid(7)) @db.Uuid
  competitionSeasonId String; clubId String
  seed Int?; groupName String?
  @@unique([competitionSeasonId, clubId])
}

model CompetitionStage {
  id String @id @default(uuid(7)) @db.Uuid
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
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  competitionSeasonId String? @db.Uuid
  stageId     String? @db.Uuid
  homeClubId  String @db.Uuid
  awayClubId  String @db.Uuid
  seasonNumber Int; roundNumber Int?
  scheduledAt DateTime; startedAt DateTime?; finishedAt DateTime?
  runtimeStatus     MatchRuntimeStatus @default(SCHEDULED)  // ciclo de vida (máquina de estados)
  resultStatus      MatchResultStatus  @default(PENDING)    // desfecho (NORMAL/WALKOVER/CANCELLED/ABANDONED)
  homologationStatus HomologationStatus @default(PENDING)   // confirmação oficial
  homeGoals Int @default(0); awayGoals Int @default(0)
  homeExpectedGoals Decimal? @db.Decimal(8, 4)  // xG: não-monetário (Decimal justificado)
  awayExpectedGoals Decimal? @db.Decimal(8, 4)
  simulationSeed String?           // seed do resultado (replay determinístico)
  simulatedOffline Boolean @default(false)      // + MatchControlSource substituem o antigo SIMULATED_OFFLINE
  version Int @default(1)
  @@index([gameWorldId])
  // relações: teamStates, lineups, events, playerStats, simulation(1:1), decisionPoints
}

model MatchSimulation {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  matchId     String @db.Uuid @unique
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
  id String @id @default(uuid(7)) @db.Uuid
  simulationId String
  minute Int; second Int?
  homeMomentum Decimal @db.Decimal(8, 4); awayMomentum Decimal @db.Decimal(8, 4)
  homeThreat Decimal @db.Decimal(8, 4);   awayThreat Decimal @db.Decimal(8, 4)
  homeFatigueAvg Decimal @db.Decimal(8, 4); awayFatigueAvg Decimal @db.Decimal(8, 4)
  data Json?
}

model MatchTeamState {
  id String @id @default(uuid(7)) @db.Uuid
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
  id String @id @default(uuid(7)) @db.Uuid
  matchId String; clubId String
  formation String; isInitial Boolean @default(true)
  players MatchLineupPlayer[]
}

model MatchLineupPlayer {
  id String @id @default(uuid(7)) @db.Uuid
  lineupId String; playerId String
  position PlayerPosition; shirtNumber Int?; isStarter Boolean @default(true)
  enteredMinute Int?; leftMinute Int?
  tacticalRole String?; individualInstructionJson Json?
}

model MatchEvent {
  id String @id @default(uuid(7)) @db.Uuid
  matchId String
  clubId String?; playerId String?; relatedPlayerId String?
  type MatchEventType
  minute Int; second Int?
  description String; importance Int @default(1)
  x Decimal? @db.Decimal(8, 4); y Decimal? @db.Decimal(8, 4)  // coordenada no campo
  data Json?
}

model PlayerMatchStats {
  id String @id @default(uuid(7)) @db.Uuid
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
  id String @id @default(uuid(7)) @db.Uuid
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
  id String @id @default(uuid(7)) @db.Uuid
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
  id String @id @default(uuid(7)) @db.Uuid
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
  id String @id @default(uuid(7)) @db.Uuid
  clubAIProfileId String
  context String; decisionType String
  inputJson Json; outputJson Json          // rastreabilidade completa da decisão
  confidence Int?; impactScore Int?
}
```

### 3.10 Estatísticas, Narrativa e Notificação

```prisma
model ClubSeasonStats {
  id String @id @default(uuid(7)) @db.Uuid
  clubId String; seasonId String
  matchesPlayed Int; wins Int; draws Int; losses Int
  goalsFor Int; goalsAgainst Int; points Int
  finalPosition Int?; titlesWon Int @default(0)
  averageAttendance Int @default(0)
  fanMood MoodLevel @default(NEUTRAL)
  @@unique([clubId, seasonId])
}

model PlayerSeasonStats {
  id String @id @default(uuid(7)) @db.Uuid
  playerId String; seasonId String; clubId String?
  appearances Int; starts Int; minutesPlayed Int
  goals Int; assists Int; yellowCards Int; redCards Int
  averageRating Decimal @db.Decimal(4, 2) @default(0)
  injuriesCount Int @default(0)
  @@unique([playerId, seasonId])
}

model FanSentiment {
  id String @id @default(uuid(7)) @db.Uuid
  clubId String; seasonNumber Int?
  mood MoodLevel @default(NEUTRAL)
  pressure Int @default(0); satisfaction Int @default(50)
  reason String?; data Json?
}

model Narrative {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  clubId      String? @db.Uuid
  playerId    String? @db.Uuid
  type NarrativeType
  title String; description String
  intensity Int @default(1); isActive Boolean @default(true)
  startsAt DateTime @default(now()); endsAt DateTime?
  effectsJson Json?    // efeitos aplicados (moral, pressão, valor etc.)
  @@index([gameWorldId])
}

model Notification {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String? @db.Uuid
  userId      String? @db.Uuid
  clubId      String? @db.Uuid
  type NotificationType
  title String; message String
  isRead Boolean @default(false); priority Int @default(1)
  payload Json?
  createdAt DateTime @default(now()); readAt DateTime?
  @@index([gameWorldId])
}
```

### 3.11 Auditoria e Configuração de Regras

Models recomendados no chat-fonte para evitar regras hardcoded e rastrear o mundo:

```prisma
model GameAuditLog {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String? @db.Uuid
  userId      String? @db.Uuid
  clubId      String? @db.Uuid
  action String; entity String; entityId String? @db.Uuid
  beforeJson Json?; afterJson Json?; metadata Json?
  createdAt DateTime @default(now())
  @@index([gameWorldId])
  // Referência genérica (entity/entityId) permitida por ser auditoria; ver §6.3.11 (AuditEvent
  // com cadeia de hash de integridade) para a forma canônica.
}

model GameRuleConfig {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @db.Uuid
  key String; value Json
  @@unique([gameWorldId, key])
  // Forma canônica de regras versionadas: RuleSet/RuleDefinition/RuleValue/RuleSetVersion (§6.1).
}
```

Exemplos de chaves de `GameRuleConfig`: `minimumRestDaysBetweenMatches`, `maxPlayersPerClub`, `minPlayersPerClub`, `retirementAgeMin`, `retirementAgeMax`, `baseInjuryChance`, `baseTransferTax`, `yellowCardsForSuspension`, `offlineAiAggressivenessLimit`, `newUserCatchUpSeasons`.

> **Canônico:** `GameAuditLog` e `GameRuleConfig` carregam `gameWorldId @db.Uuid` indexado e seguem as convenções da §1 (UUIDv7, índices por mundo). Auditoria usa referência genérica (`entity`/`entityId`) por ser projeção transversal; a forma detalhada é `AuditEvent` com cadeia de hash (§6.3.11). Regras versionadas por mundo têm a forma canônica `RuleSet`/`RuleDefinition`/`RuleValue`/`RuleSetVersion` (§6.1); `GameRuleConfig` é o atalho chave-valor para parâmetros simples de balanceamento.

---

## 4. Os 30 módulos de domínio

Cada módulo é uma área lógica do backend (responsabilidade, entidades, serviços, jobs e eventos próprios).

> **Nota (duas decomposições complementares):** os **30 módulos de domínio** desta seção são o recorte **funcional/serviços**; os **25 bounded contexts** de [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md) (`identity`, `world`, `club`, `person`, `player`, `squad`, `training`, `tactics`, `match`, `competition`, `calendar`, `market`, `scouting`, `transfer`, `contract`, `staff`, `finance`, `infrastructure`, `commercial`, `supporter`, `communication`, `history`, `notification`, `automation`, `administration`) são o recorte de **fronteiras de deploy e propriedade de dados**. Não há divergência de escopo — são duas visões da mesma capacidade e coexistem: a lista de módulos abaixo mapeia sobre os bounded contexts (ex.: os módulos 5, 6, 8 e parte do 25 caem em `player`/`person`/`training`/`scouting`).

1. **Mundo do Jogo** — controla o universo online: cria mundo, avança data virtual, temporadas e status geral. Entidades: `GameWorld`, `Season`, `GameEconomyConfig`, `EconomySnapshot`, `UserSession`.
2. **Usuários e Sessão Online** — quem joga, qual clube controla e se está online durante a partida (habilita pontos de decisão interativos). Entidades: `User`/`UserAccount`, `UserSession`, `WorldParticipant`, `ClubControl` (canônico; substitui `ClubUser`), `Notification`.
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
24. **Balanceamento de Novos Usuários** — resolve a entrada de usuário em temporada avançada (clube com potencial acelerado, clube abandonado por IA, clube emergente protegido, sistema de oportunidade). Serviço-chave: `findBestEntryClubsForNewUser(gameWorldId)`.
25. **Scouting** — descobre jogadores e gera relatórios; precisão depende do olheiro, do departamento e do tempo de observação. Entidades: `ScoutReport`, `Player`, `StaffMember`, `ClubDepartment`, `PlayerBackground`, `PlayerPersonality`.
26. **Contratos** — contratos de jogadores e funcionários; renovação depende de moral, tempo de clube, salário, ambição, lealdade e papel no elenco. Entidades: `PlayerContract`, `StaffContract`, `Player`, `StaffMember`, `Club`, `FinancialTransaction`.
27. **Elenco** — monta e gerencia o grupo; profundidade, papéis, disponibilidade e detecção de fraquezas (poucos zagueiros, folha alta, elenco velho). Entidades: `Club`, `Player`, `PlayerContract`, `PlayerInjury`, `PlayerSuspension`, `PlayerSeasonStats`.
28. **Classificação e Tabela** — standings, critérios de desempate e zonas de acesso/rebaixamento. Entidades: `CompetitionSeason`, `CompetitionClub`, `Match`, `ClubSeasonStats`.
29. **Auditoria e Histórico** — rastreia decisões importantes (quem vendeu, quem escalou, quando a IA/sistema agiu). Entidade recomendada: `GameAuditLog`.
30. **Configuração de Regras** — evita regras hardcoded; parâmetros ajustáveis por mundo para balanceamento sem mexer no código. Entidade recomendada: `GameRuleConfig`.

> **Nota:** o chat-fonte destaca o núcleo indispensável (World, Clubs, Players, Staff, Club Departments, Finance, Economy, Competitions, Calendar, Matches, Match Engine, Tactics, Decision Points, AI, Season Closure) e aponta o trio mais sensível — **Economy + Season Closure + Player Lifecycle** — como responsável por não quebrar o jogo após várias temporadas.

---

## 5. Algoritmo de geração de jogador em 11 passos

Fluxo de `PlayerGeneratorService.generatePlayer()`. Cria a `Person` (identidade, `PlayerBackground` = biografia, `PlayerPersonality`) e o `Player` a ela vinculado (`PlayerAttributes`, `PlayerDevelopment`) — a separação Pessoa × Jogador vale desde a geração.

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

---

## 6. Modelo detalhado por domínio (entidades granulares)

> **Status desta seção:** **Detalhamento canônico** do modelo de dados por domínio. As seções 1–5 dão a visão introdutória/agregada (models essenciais, módulos, geração de jogador); esta seção 6 é a **forma canônica granular** — quando um nome mais específico aparece aqui (`UserAccount`, `WorldParticipant`, `ClubControl`, `ClubIdentityPeriod`, entidades por período/versão), **ele é o canônico**. Todas as convenções já aplicadas nas seções anteriores (UUIDv7, `BigInt amountMinor` + `currencyId`, `gameWorldId`, FK composta `(gameWorldId, id)`, `Person` separado de `Player`, `version` de concorrência) valem integralmente aqui.

O princípio-guia da modelagem: **o schema representa as regras do mundo**. A aplicação não deve compensar permanentemente um banco incapaz de proteger suas próprias invariantes estruturais. O modelo tem três camadas complementares: **Prisma Schema** (models, relações, FKs, enums estáveis, índices/constraints comuns, tipagem do cliente) + **Migrações SQL nativas** (CHECK, EXCLUDE, índices parciais/por expressão/INCLUDE, views, materialized views, triggers, particionamento, funções, extensões) + **Domínio** (transições válidas, autoridade, cálculos, políticas, regras multi-agregado, mensagens de erro).

### 6.1 Convenções de modelagem (canônicas)

As convenções de modelagem (schemas PostgreSQL por domínio, PascalCase/camelCase/snake_case, chaves compostas por mundo, `BigInt` para dinheiro, uso/uso-proibido de JSONB, exclusão lógica, concorrência otimista via `version`) estão consolidadas em [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md) — consulte lá em vez de reproduzir. Resumo canônico dos pontos que detalham as seções 1–5:

- **Organização física do Prisma** — schema dividido em ~28 arquivos por domínio (`platform.prisma`, `world.prisma`, `club.prisma`, `person.prisma`, `player.prisma`, `staff.prisma`, `squad.prisma`, `training.prisma`, `tactics.prisma`, `medical.prisma`, `match.prisma`, `competition.prisma`, `market.prisma`, `transfer.prisma`, `contract.prisma`, `finance.prisma`, `infrastructure.prisma`, `commercial.prisma`, `supporter.prisma`, `communication.prisma`, `history.prisma`, `notification.prisma`, `automation.prisma`, `entry.prisma`, `eventing.prisma`, `operations.prisma`, `enums.prisma`) + `schema.prisma` principal (generator, datasource, extensões, versão).
- **Schemas lógicos PostgreSQL:** `platform`, `game`, `finance`, `eventing`, `operations`, `read_model`.

  > **Canônico (schemas físicos):** a **Decisão 19.7** de [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md) é a referência: **~13 schemas por domínio** (`players`, `clubs`, `contracts`, `finance`, `matches`, `competitions`, `identity`, `worlds`, `messaging`, `notifications`, `audit`, `operations`, `projections`). Os 6 schemas amplos listados acima (`platform`, `game`, `finance`, `eventing`, `operations`, `read_model`) são o **agrupamento lógico grosso** que mapeia sobre esses domínios (ex.: `game` cobre `worlds`/`clubs`/`players`/`competitions`/`matches`); a granularidade oficial de deploy segue a Decisão 19.7.
- **Identidade:** `id String @id @default(uuid(7)) @db.Uuid` (UUIDv7). Sem IDs sequenciais globais como identidade das entidades do mundo.
- **Identificadores públicos:** `publicCode` / `slug` / `shortCode` (ex.: `CLB-7F29DK`, `MAT-93F4AX`) — não substituem o UUID, podem ser regeneráveis, não concedem autorização, não ordenam cronologicamente.
- **Campos comuns de entidades do mundo:** `id`, `gameWorldId @db.Uuid`, `createdAt`/`updatedAt @db.Timestamptz(6)`, `version Int @default(1)`; opcionais por ciclo de vida: `effectiveAt`, `endedAt`, `cancelledAt`, `archivedAt`, `deletedAt`, `createdBy`, `updatedBy`.
- **Proteção contra relações entre mundos:** todo pai central tem `@@unique([gameWorldId, id])`; filhos críticos usam **FK composta** `references: [gameWorldId, id]` com `onDelete: Restrict`. A unicidade global do UUID **não** é considerada proteção suficiente contra erro de escopo.
- **Chaves compostas naturais:** `(gameWorldId, seasonNumber)`, `(competitionEditionId, clubId)`, `(matchId, eventSequence)`, `(matchId, clubId)`, `(journalEntryId, lineNumber)`, `(consumerName, eventId)`, etc.
- **Datas reais** em `@db.Timestamptz(6)`; **tempo do mundo** em `worldTick: BigInt` (derivados persistidos para leitura: `seasonId`, `worldDay`, `worldMinute`, `worldDateLabel`). Prazos competitivos comparados pelo relógio persistido do mundo, não pelo dispositivo. Períodos: `startsAt/endsAtWorldTick` + `startsAt/endsAtReal`; `endsAt = null` = período ativo (nunca "data desconhecida" — esta tem estado explícito).
- **Valores monetários:** `amountMinor BigInt` + `currencyId` (ex.: R$ 125,90 → `12590`). Proibido Float/Double/decimal sem escala para caixa, transferências, salários, bônus, parcelas, dívidas, orçamentos, recebíveis, pagamentos.
- **Percentuais/probabilidades:** inteiros escalados — `basisPoints` (12,50% = 1250) ou escala 0–1.000.000; escala declarada pelo objeto de valor. **Atributos/avaliações:** inteiros escalados 0–10.000 (7825 = 78,25%). **`Decimal`** restrito a casos onde inteiro não representa a escala e há justificativa documentada; **dinheiro continua BigInt**.
- **JSONB permitido** para estruturas versionadas, lidas como unidade, de alta variação, validadas em runtime (perfil técnico do jogador, snapshot de partida, payload de evento, condições de automação, regulamento, resultado de simulação, resumo histórico). **JSONB proibido** para proprietário do jogador, clube contratante, parcelas, participantes, inscrições, saldos, contas, títulos, suspensões, responsáveis, autoridades, membros do elenco, relações entre pessoas.
- **Arrays PostgreSQL** só para tags técnicas, escopos simples, códigos auxiliares (dados sem identidade própria) — nunca relações principais.
- **Política de enums em 3 categorias:** (1) **Enum estável** — ciclo fechado, muda raramente, comportamento técnico, mudança exige migration; (2) **Catálogo expansível** — tabelas (`CatalogDefinition`/`CatalogEntry`/`CatalogEntryTranslation`/`CatalogEntryVersion`) para posições, funções táticas, competências, tipos de objetivo/prêmio/lesão, especialidades médicas, papéis de departamento, etc.; (3) **Regra versionada** — `RuleSet`/`RuleDefinition`/`RuleValue`/`RuleSetVersion` para desempate, limites de inscrição/estrangeiros, formato de competição, premiação, suspensões. Enum **não** é tradução: banco guarda `ACTIVE`/`SUSPENDED`/`CANCELLED`; interface traduz.
- **Política de deleção:** `Restrict`/`NoAction`/`SetNull` controlado; `Cascade` só para filhos descartáveis (rascunhos, linhas de simulação não persistida, preferências, tokens de sessão). Entidades históricas (clubes, pessoas, jogadores, partidas, contratos, transferências concluídas, lançamentos, títulos, competições, auditoria) **não** são excluídas fisicamente — usam status/encerramento/anonimização/arquivamento/nova versão. `deletedAt` só com processo real de retenção.
- **Estado atual × histórico:** históricos importantes usam **períodos** (`ClubIdentityPeriod`, `PersonNamePeriod`, `PlayerContractSalaryPeriod`, `ClubAutonomyPeriod`). Ponteiros de performance (`currentControlId`, `currentIdentityPeriodId`, `currentEmploymentClubId`) coexistem com as tabelas de período e são reconciliados por jobs. **Snapshots imutáveis** (`snapshotId`, `stateHash`, `payload`, `capturedAtWorldTick`) para verificação/deduplicação/determinismo.

> **Canônico:** as convenções da §6.1 valem para todo o schema. Onde as seções 1–5 mostram uma forma simplificada e a seção 6 uma forma granular, **a forma granular é a canônica** e a simplificada é visão introdutória que mapeia sobre ela (ver a nota de reconciliação no topo do documento).

### 6.2 Taxonomia de enums por domínio (§27–40)

Enums **estáveis** propostos, agrupados por domínio. (Muitas taxonomias abertas — posições, funções, competências, tipos de lesão — viram catálogo, não enum; ver §6.1.)

| Domínio | Enums |
| --- | --- |
| **Plataforma (§27)** | `UserAccountStatus`, `UserSessionStatus`, `UserDeviceTrustStatus`, `SecurityFactorType`, `SecurityFactorStatus`, `WorldMembershipStatus`, `InvitationStatus`, `AccountRestrictionType` |
| **Mundo (§28)** | `GameWorldStatus`, `WorldClockStatus`, `WorldOperationalState`, `SeasonStatus`, `SeasonTransitionStatus`, `WorldEntryWindowStatus`, `WorldProcessingState` |
| **Clube e governança (§29)** | `ClubStatus`, `ClubOriginType`, `ClubIdentityStatus`, `ClubControlStatus`, `GovernanceModel`, `BoardStatus`, `BoardMandateStatus`, `AutonomyLevel`, `ClubObjectiveStatus`, `ClubPolicyStatus`, `DepartmentStatus`, `ResponsibilityAssignmentStatus` |
| **Pessoa e carreira (§30)** | `PersonStatus`, `PlayerCareerStatus`, `PlayerAvailabilityStatus`, `StaffCareerStatus`, `CareerPeriodStatus`, `PersonRelationshipStatus`, `RetirementProcessStatus`, `RecognitionStatus` |
| **Elenco e registro (§31)** | `SquadType`, `SquadMembershipStatus`, `SquadMembershipRole`, `PlayerRegistrationStatus`, `RegistrationMovementType`, `ShirtNumberStatus`, `LeadershipAssignmentType`, `LeadershipAssignmentStatus` |
| **Contratual (§32)** | `AgreementStatus`, `PlayerContractStatus`, `StaffContractStatus`, `ContractNegotiationStatus`, `ContractOptionType`, `ContractOptionStatus`, `ContractTriggerStatus`, `LoanAgreementStatus`, `TransferAgreementStatus`, `CommercialContractStatus`, `FacilityAgreementStatus` |
| **Transferência (§33)** | `TransferCaseStatus`, `TransferOfferStatus`, `TransferDirection`, `TransferType`, `PaymentScheduleStatus`, `TransferMedicalStatus`, `TransferRegistrationStatus`, `SellOnClauseType`, `LoanPurchaseClauseType` |
| **Financeiro (§34)** | `FinancialAccountType`, `AccountNormalSide`, `JournalEntryStatus`, `JournalLineDirection`, `BudgetStatus`, `BudgetLineStatus`, `FinancialReservationStatus`, `PayableStatus`, `ReceivableStatus`, `PaymentStatus`, `InstallmentStatus`, `DebtStatus`, `FinancialRiskLevel` |
| **Competitivo (§35)** | `CompetitionDefinitionStatus`, `CompetitionEditionStatus`, `CompetitionType`, `CompetitionFormatType`, `CompetitionStageType`, `CompetitionParticipantStatus`, `FixtureStatus`, `HomologationStatus`, `CompetitiveMovementType`, `CompetitiveMovementStatus`, `AppealStatus`, `LicenseStatus`, `DrawStatus` |
| **Partida (§36)** | `MatchRuntimeStatus`, `MatchResultStatus`, `MatchSide`, `MatchCommandStatus`, `MatchCommandOrigin`, `MatchEventKind`, `MatchCheckpointType`, `LineupStatus`, `SubstitutionStatus`, `TacticalInstructionStatus` (o coarse `MatchStatus` foi desmembrado — ver §2) |
| **Treino e medicina (§37)** | `TrainingPlanStatus`, `TrainingSessionStatus`, `TrainingAttendanceStatus`, `TrainingLoadLevel`, `MedicalCaseStatus`, `InjurySeverity`, `MedicalAssessmentStatus`, `TreatmentPlanStatus`, `RehabilitationStatus`, `MedicalRestrictionStatus`, `ReturnToPlayStatus` |
| **Estrutura (§38)** | `FacilityStatus`, `FacilityOwnershipType`, `FacilityAccessType`, `InfrastructureProjectStatus`, `ProjectPhaseStatus`, `MaintenancePlanStatus`, `WorkOrderStatus`, `InspectionStatus`, `ComplianceCertificateStatus`, `FacilityIncidentStatus`, `BookingStatus` |
| **Notificação e automação (§39)** | `NotificationStatus`, `NotificationPriority`, `NotificationUrgency`, `ActionableTaskStatus`, `ReminderStatus`, `NotificationDeliveryStatus`, `AutomationRuleStatus`, `AutomationLevel`, `AutomationExecutionStatus`, `AutomationFailurePolicy`, `DelegationStatus` |
| **Operacional (§40)** | `AdminOperatorStatus`, `AdminSessionStatus`, `AdministrativeOperationStatus`, `AdministrativeCorrectionStatus`, `SupportTicketStatus`, `SupportAccessMode`, `OperationalIncidentStatus`, `OperationalIncidentSeverity`, `AdministrativeJobStatus`, `BackupStatus`, `RestoreStatus`, `DeploymentStatus`, `MigrationStatus`, `FeatureFlagStatus` |

> **Nota:** `MatchEventKind` conterá apenas categorias estruturais estáveis; detalhes (tipo de finalização, região do campo, motivo de interrupção, tipo de passe) usam códigos versionados no payload.

### 6.3 Entidades refinadas (§41+)

Conjunto canônico de entidades por domínio, com campos-chave e constraints. Nomes de model em PascalCase; muitas entidades existem em variantes por período/versão/snapshot. Todas seguem as convenções da §1 e da §6.1 (UUIDv7, `gameWorldId`, `BigInt amountMinor` + `currencyId`, `version`).

#### 6.3.1 Plataforma (globais, sem `gameWorldId`) — §41–43

- **Conta e identidade:** `UserAccount`, `UserProfile`, `UserCredential`, `UserSession`, `UserRefreshToken`, `UserDevice`, `UserSecurityFactor`, `UserRecoveryCode`, `UserSecurityEvent`, `UserAccountRestriction`.
- **Preferências:** `UserGlobalPreference`, `UserLocalePreference`, `UserAccessibilityPreference`, `UserPrivacyPreference`.
- **Relações com mundos:** `WorldParticipant`, `WorldInvitation`, `WorldMembershipRestriction`, `WorldObserverAccess`.

```prisma
model UserAccount {
  id                    // status, primaryEmailNormalized, emailVerifiedAt,
  // authenticationVersion, lastLoginAt, anonymizedAt, createdAt, updatedAt, version
}
// Regra fechada: a conta global NÃO controla clube diretamente — o controle ocorre por ClubControl.

model WorldParticipant {
  id, gameWorldId, userId, status, joinedAt, leftAt,
  observerState, restrictionState, version
  // Constraint: unique(gameWorldId, userId)
}
```

#### 6.3.2 Mundo, tempo e temporada — §44–48

- **Mundo:** `GameWorld`, `GameWorldConfiguration`, `GameWorldRuleSet`, `GameWorldRuleSetVersion`, `WorldClock`, `WorldClockCheckpoint`, `WorldPause`, `WorldProcessingLease`, `WorldScheduledTask`, `WorldSequenceCounter`, `WorldEconomicSnapshot`, `WorldPopulationSnapshot`.
- **Temporada:** `Season`, `SeasonPhase`, `SeasonTransition`, `SeasonTransitionCheckpoint`, `SeasonSnapshot`, `ClubSeasonParticipation`, `ClubSeasonReview`, `ClubSeasonObjectiveResult` — constraint `unique(gameWorldId, seasonNumber)`.
- **Geografia (própria do mundo, não localidades reais externas):** `WorldRegion`, `WorldSubregion`, `WorldCity`, `WorldVenueLocation`, `RegionalEconomicProfile`, `RegionalPlayerPopulation`, `RegionalSupporterMarket`.

```prisma
model GameWorld {
  id, publicCode, name, status, operationalState, currentSeasonId,
  currentRuleSetVersionId, currentWorldTick, rhythmProfile, regionProfile,
  createdAt, startedAt, archivedAt, version
}

model WorldClock {
  gameWorldId, status, currentWorldTick, lastProcessedWorldTick,
  nextProcessingWorldTick, leaseOwner, leaseExpiresAt, heartbeatAt, version
  // Constraint parcial: um único WorldClock ACTIVE por gameWorldId
}
```

#### 6.3.3 Clube e governança — §49–54

- **Clube e períodos:** `Club`, `ClubIdentityPeriod`, `ClubStatusPeriod`, `ClubOriginProfile`, `ClubControl`, `ClubControlPeriod`, `ClubReputationSnapshot`, `ClubOperationalSnapshot`.
- **Governança:** `ClubGovernance`, `ClubOwnership`, `ClubOwner`, `ClubBoard`, `ClubBoardMember`, `ClubBoardMandate`, `ClubAuthorityProfile`, `ClubAuthorityGrant`, `ClubAuthorityRestriction`, `ClubAutonomyPeriod`, `BoardDecision`, `BoardApprovalRequest`, `ClubObjective`, `ClubObjectiveEvaluation`, `ClubPolicy`, `ClubStrategy`.
- **Departamentos e responsabilidades (separados):** `ClubDepartment`, `DepartmentCapability`, `DepartmentOperationalSnapshot`, `ClubPosition`, `ClubPositionAssignment`, `ClubResponsibility`, `ClubResponsibilityAssignment`, `ClubDelegationPolicy`, `ClubWorkQueue`, `ClubWorkItem`.

```prisma
model Club {
  id, gameWorldId, publicCode, status, originType, foundedAtWorldTick,
  currentIdentityPeriodId, currentControlId, currentGovernanceId, homeCityId,
  createdAt, version
  // NÃO armazena diretamente: nome/escudo/estádio/controlador histórico (ficam em períodos)
}

model ClubIdentityPeriod {
  clubId, officialName, shortName, nickname, slug, primaryColor, secondaryColor,
  badgeFileId, startsAtWorldTick, endsAtWorldTick, changeReason, decisionId, status, version
  // Constraint: sem sobreposição de períodos oficiais do mesmo clube
}

model ClubControl { // controle atual ou histórico
  clubId, worldParticipantId, status, controlType, startsAtWorldTick, endsAtWorldTick,
  competitiveControlStartsAtWorldTick, authorityProfileId, activationProcessId, version
  // Constraints: um único controle ativo por clube; um único clube ativo por participante no mesmo mundo
}
```

#### 6.3.4 Pessoa e jogador (separados) — §55–66

`Person` representa toda pessoa única do mundo; pode ter perfil de jogador, funcionário, proprietário, dirigente, histórico. **Um jogador aposentado que vira funcionário continua usando o mesmo `Person`.**

- **Pessoa:** `Person`, `PersonNamePeriod`, `PersonNationalityPeriod`, `PersonLanguage`, `PersonPublicProfile`, `PersonPrivateProfile`, `PersonPersonalityProfile`, `PersonRelationship`, `PersonRelationshipEvent`, `PersonReputationSnapshot`, `PersonAvailabilityPeriod`, `PersonLifeEvent`.
- **Jogador:** `Player`, `PlayerAbilityProfile`, `PlayerHiddenProfile`, `PlayerPositionProficiency`, `PlayerRoleFamiliarity`, `PlayerFootPreference`, `PlayerCareerPeriod`, `PlayerDevelopmentSnapshot`, `PlayerPhysicalState`, `PlayerMentalState`, `PlayerAvailability`, `PlayerLeadershipProfile`, `PlayerPromise`, `PlayerCareerMilestone`.
- **Estado físico/mental:** `PlayerPhysicalState`, `PlayerMentalState`, `PlayerFatigueSnapshot`, `PlayerMoraleSnapshot`, `PlayerConditionEvent` (estado atual atualizável; snapshots preservam histórico).
- **Conhecimento do clube sobre o jogador (não fica no `Player`):** `ClubPlayerKnowledge`, `ClubPlayerKnowledgeSource`, `ScoutingReport`, `MedicalKnowledge`, `ContractKnowledge`, `RelationshipKnowledge` — cada clube tem conhecimento parcial; relatórios antigos não são atualizados retroativamente.

```prisma
model Person {
  id, gameWorldId, status, birthWorldDate, deathWorldDate,
  currentNamePeriodId, primaryNationalityId, publicProfileId, privateProfileId, createdAt, version
}
model PersonNamePeriod { // nome atual nunca é sobrescrito
  personId, fullName, commonName, shirtName, startsAtWorldTick, endsAtWorldTick, reason
}
model Player {
  id, gameWorldId, personId, careerStatus, primaryPositionCode,
  currentEmploymentClubId, currentSportingClubId, currentSquadId,
  professionalDebutAtWorldTick, retiredAtWorldTick, version
  // Constraint: unique(gameWorldId, personId)
  // currentEmploymentClubId (contrato/origem) ≠ currentSportingClubId (autorizado a atuar); em empréstimo divergem
}
model PlayerAbilityProfile { // snapshot versionado usado pelo motor
  playerId, schemaVersion, technicalProfile Json, mentalProfile Json, physicalProfile Json,
  goalkeepingProfile Json, profileHash, effectiveFromWorldTick, effectiveUntilWorldTick, version
}
// PlayerHiddenProfile: potencial, consistência, ambição, tendência a lesão, traços privados —
// acesso restrito ao motor/processos autorizados, nunca diretamente ao usuário.
model PlayerCareerPeriod { // passagem por clube
  playerId, clubId, movementType, employmentContractId, loanAgreementId,
  startsAtWorldTick, endsAtWorldTick, status, exitReason, version
}
```

#### 6.3.5 Elenco, contrato e registro (entidades diferentes) — §67–74

- **Elenco:** `Squad`, `SquadSeason`, `SquadMembership`, `SquadRoleAssignment`, `SquadLeadershipAssignment`, `SquadGroup`, `SquadGroupMembership`, `SquadAvailabilitySnapshot`. `SquadMembership` (`squadId`, `playerId`, `status`, `role`, `startsAt/endsAtWorldTick`, `shirtNumber`, `version`) representa presença operacional — **não** substitui contrato, registro, empréstimo ou propriedade.
- **Contrato:** `PlayerContract`, `PlayerContractTerm`, `PlayerContractSalaryPeriod`, `PlayerContractBonus`, `PlayerContractClause`, `PlayerContractOption`, `PlayerContractTrigger`, `PlayerContractPromise`, `PlayerContractAmendment`, `PlayerContractTermination`.
- **Negociação:** `ContractNegotiation`, `ContractNegotiationParty`, `ContractProposal`, `ContractProposalTerm`, `ContractNegotiationMessage`, `ContractNegotiationDeadline` — proposta aceita permanece registrada e ligada ao contrato resultante.
- **Registro competitivo (independente do contrato):** `CompetitionRegistration`, `CompetitionRegistrationPlayer`, `CompetitionRegistrationChange`, `PlayerEligibilityDecision`, `PlayerRegistrationRestriction`, `ShirtNumberAssignment`.

```prisma
model PlayerContract {
  id, gameWorldId, playerId, clubId, status, contractType, signedAtWorldTick,
  startsAtWorldTick, endsAtWorldTick, baseCurrencyId, currentSalaryPeriodId, negotiationId, version
  // Constraint central: nenhum jogador com dois contratos principais de emprego incompatíveis e sobrepostos
}
model PlayerContractSalaryPeriod { contractId, amountMinor, paymentFrequency, startsAtWorldTick, endsAtWorldTick, reason }
model PlayerContractBonus { contractId, bonusTypeCode, amountMinor, triggerDefinition Json, maximumOccurrences, status }
```

#### 6.3.6 Funcionários, treino, táticas e medicina — §75–87

- **Funcionários:** `StaffMember`, `StaffCareerProfile`, `StaffCompetency`, `StaffSpecialty`, `StaffQualification`, `StaffLicense`, `StaffLanguage`, `StaffCareerPeriod`, `StaffContract`, `StaffContractTerm`, `StaffPositionAssignment`, `StaffResponsibilityAssignment`, `StaffWorkloadSnapshot`, `StaffPerformanceReview`, `StaffAbsence`, `StaffDevelopmentPlan`, `StaffSuccessionPlan`. `StaffMember` (`personId`, `careerStatus`, `primaryFunctionCode`, `currentClubId`, `currentPositionAssignmentId`, `reputationProfile`, `availableFromWorldTick`, `version`) — `unique(gameWorldId, personId)`; Player+StaffMember na mesma pessoa só em períodos regulamentarmente permitidos. `StaffCompetency` em linhas com `competencyCode` de catálogo (cresce sem migration de colunas). **Posição (cargo institucional) ≠ Responsabilidade (ação/domínio executável).**
- **Treino:** `TrainingPlan`, `TrainingCycle`, `TrainingSession`, `TrainingSessionGroup`, `TrainingSessionParticipant`, `TrainingSessionExercise`, `TrainingAttendance`, `TrainingLoad`, `PlayerTrainingAssignment`, `PlayerDevelopmentPlan`, `PlayerDevelopmentObservation`, `TrainingFacilityBooking`, `TrainingIncident`. Desenvolvimento real (`PlayerDevelopmentEvent`, `PlayerDevelopmentSnapshot`) é registro **diferente** da recomendação (`PlayerDevelopmentObservation`).
- **Táticas (versionadas):** `TacticalSystem`, `TacticalSystemVersion`, `TacticalFormation`, `TacticalRoleAssignment`, `TacticalInstruction`, `TacticalInstructionSet`, `TacticalPhasePlan`, `SetPiecePlan`, `SetPieceAssignment`, `OpponentPlan`, `MatchTacticalPlan`, `TacticalFamiliarity`. Alterar tática cria nova `TacticalSystemVersion`.
- **Medicina:** `MedicalCase`, `MedicalAssessment`, `MedicalDiagnosis`, `MedicalExam`, `InjuryCase`, `InjuryEvent`, `TreatmentPlan`, `TreatmentSession`, `RehabilitationPlan`, `RehabilitationMilestone`, `MedicalRestriction`, `TrainingRestriction`, `MatchRestriction`, `ReturnToPlayProcess`, `MedicalClearance`, `MedicalCost`, `MedicalResponsibility`. `InjuryCase` (`playerId`, `status`, `injuryTypeCode`, `severity`, `occurredAtWorldTick`, `estimatedRecoveryMin/MaxTick`, `confirmedRecoveryTick`, `sourceMatchId`, `sourceTrainingSessionId`, `confidentialityLevel`, `version`) — diagnóstico real separado de estimativa, comunicação pública, relatório à comissão e conhecimento de outro clube.

#### 6.3.7 Competições, calendário e partida — §88–102

- **Competição (definição permanente × edição da temporada):** `CompetitionDefinition`, `CompetitionDefinitionVersion`, `CompetitionEdition`, `CompetitionStage`, `CompetitionGroup`, `CompetitionRound`, `CompetitionParticipant`, `CompetitionRuleSet`, `CompetitionRuleSetVersion`, `CompetitionRuleValue`, `CompetitionPrizeRule`, `CompetitionQualificationRule`, `CompetitionRelegationRule`, `CompetitionRegistrationRule`, `CompetitionDisciplinaryRule`. Estrutura de fases é **relacional** (`StageParticipant`, `GroupParticipant`), não JSON monolítico. `CompetitionParticipant`: `unique(competitionEditionId, clubId)`.
- **Calendário e jogos (Fixture = compromisso programado; Match = execução concreta):** `Fixture`, `FixtureConstraint`, `FixtureVenueAssignment`, `FixtureScheduleChange`, `Match`, `MatchTeam`, `MatchOfficialResult`, `MatchHomologation`, `MatchReplayLink`, `MatchAdministrativeDecision`.
- **Partida:** `Match`, `MatchTeam`, `MatchLineup`, `MatchLineupSlot`, `MatchBenchEntry`, `MatchTacticalPlan`, `MatchRuntime`, `MatchCommand`, `MatchEvent`, `MatchCheckpoint`, `MatchTeamStatistic`, `MatchPlayerStatistic`, `MatchOfficialResult`, `MatchConsequence`, `MatchReview`. Runtime (`MatchRuntime`, `MatchRuntimeLease`, `MatchRuntimeSnapshot`) separado do registro oficial/estatísticas/homologação.
- **Classificação:** `CompetitionStanding`, `CompetitionStandingEntry`, `CompetitionStandingSnapshot`, `CompetitionStandingAdjustment`, `CompetitionTiebreakResult` — punições não entram silenciosamente nos pontos; existe `CompetitionStandingAdjustment`.
- **Homologação:** `CompetitionHomologation`, `CompetitionFinalStanding`, `CompetitiveMovement`, `CompetitiveAppeal`, `CompetitionAdministrativeDecision`.

```prisma
model MatchTeam {
  matchId, clubId, side, scoreOfficial, scoreOnField, lineupId, tacticalPlanId, version
  // Constraints: unique(matchId, clubId); unique(matchId, side)
}
model MatchEvent {
  matchId, sequence, simulationTime, kind, clubId, playerId, secondaryPlayerId,
  payload, engineVersion, status, createdAt
  // Constraint: unique(matchId, sequence)
}
model MatchCommand { // idempotente
  commandId, matchId, clubId, origin, type, status, expectedMatchVersion,
  submittedAtReal, receivedAtReal, effectiveSimulationTime, payload, resultPayload, version
  // Constraint: unique(commandId)
}
// Estatísticas separadas e versionadas: MatchPlayerStatistic, MatchTeamStatistic, MatchStatisticCorrection
```

#### 6.3.8 Mercado, transferências e empréstimos — §103–109

- **Observação/mercado:** `ScoutingMission`, `ScoutingAssignment`, `ScoutingObservation`, `ScoutingReport`, `ScoutingReportEstimate`, `ScoutingReportEvidence`, `ScoutingRecommendation`, `ClubPlayerKnowledge`, `ClubPlayerKnowledgeSnapshot`, `Watchlist`, `WatchlistEntry`, `RecruitmentNeed`, `RecruitmentCandidate`, `RecruitmentShortlist`, `MarketAvailability`, `PlayerMarketInterest`, `AgentRelationship`. `ClubPlayerKnowledge` é **projeção consolidada** (de relatórios, partidas, relações, público, negociações, histórico) — não sobrescreve relatórios.
- **Transferência (processo, não troca de `clubId`):** `TransferCase`, `TransferCaseParty`, `TransferInquiry`, `TransferOffer`, `TransferOfferVersion`, `TransferOfferTerm`, `TransferCounterOffer`, `TransferAgreement`, `TransferAgreementTerm`, `TransferPaymentSchedule`, `TransferInstallment`, `TransferBonus`, `TransferSellOnClause`, `TransferBuyBackClause`, `TransferMatchingRight`, `TransferMedicalProcess`, `TransferRegistrationProcess`, `TransferCompletion`, `TransferCancellation`.
- **Empréstimos (preservam contrato/clube de origem):** `PlayerLoanAgreement`, `PlayerLoanSalaryShare`, `PlayerLoanUsagePromise`, `PlayerLoanPurchaseClause`, `PlayerLoanRecallClause`, `PlayerLoanRestriction`, `PlayerLoanReturn`.

```prisma
model TransferCase { // processo inteiro
  playerId, buyingClubId, sellingClubId, status, transferType, openedAtWorldTick,
  currentOfferId, agreementId, deadlineAtWorldTick, version
}
model TransferOfferVersion { // contraproposta não sobrescreve a anterior
  transferOfferId, versionNumber, proposedByClubId, fixedAmountMinor, termsPayload,
  submittedAtWorldTick, expiresAtWorldTick, status
}
model ScoutingReport {
  clubId, playerId, scoutId, missionId, status, confidence, observedFrom/UntilWorldTick,
  overallEstimate, potentialEstimate, attributeEstimates Json, recommendation, expiresAtWorldTick, version
}
```

#### 6.3.9 Finanças (partidas dobradas) — §110–118

Razão de partidas dobradas: `FinancialAccount`, `FinancialAccountGroup`, `FinancialJournalEntry`, `FinancialJournalLine`, `FinancialTransactionReference`, `FinancialAccountBalanceSnapshot`, `FinancialPeriod`, `FinancialPeriodClose`, `Budget`, `BudgetScenario`, `BudgetLine`, `BudgetAllocation`, `BudgetRevision`, `FinancialReservation`, `Receivable`, `ReceivableInstallment`, `Payable`, `PayableInstallment`, `Payment`, `PaymentAllocation`, `ClubDebt`, `DebtInstallment`, `CreditFacility`, `FinancialForecast`, `FinancialRiskAssessment`.

- **Saldo derivado do razão**; `FinancialAccountBalanceSnapshot` é cache recalculável/versionado/conciliado — sem campo de saldo editável isolado. Lançamento passa por `DRAFT → POSTING → POSTED → REVERSED`; só `POSTED` afeta saldo. Lançamento publicado não é editado — reversão cria novo `FinancialJournalEntry` com `reversalOfJournalEntryId`.
- **Orçamento ≠ caixa** (autorização/planejamento). `FinancialReservation` (`clubId`, `budgetLineId`, `purposeType/Id`, `amountMinor`, `status`, `expiresAtWorldTick`, `consumedAmountMinor`, `releasedAmountMinor`, `version`) — constraint `consumido + liberado <= reservado`.

```prisma
model FinancialAccount { clubId, accountCode, accountType, normalSide, currencyId, status, parentAccountId, version }
// FinancialJournalEntry = transação lógica; FinancialJournalLine = débitos/créditos
// Constraint: soma dos débitos = soma dos créditos por journalEntry e moeda
model FinancialJournalLine {
  journalEntryId, lineNumber, financialAccountId, direction, amountMinor, currencyId,
  clubId, costCenterCode, referenceType, referenceId
  // Constraints: amountMinor > 0; unique(journalEntryId, lineNumber)
}
```

#### 6.3.10 Infraestrutura, comercial, torcida e comunicação — §119–127

- **Infraestrutura (Facility = ativo físico; FacilityModule = parte funcional):** `FacilitySite`, `Facility`, `FacilityModule`, `FacilityCapability`, `FacilityCapabilitySnapshot`, `FacilityEquipment`, `Pitch`, `Stadium`, `StadiumSector`, `FacilityAccessAgreement`, `FacilityBooking`, `InfrastructureProject`(+`Phase`/`Milestone`/`Dependency`/`Estimate`), `Contractor`, `ConstructionAgreement`, `ConstructionChangeOrder`, `MaintenancePlan`, `MaintenanceWorkOrder`, `FacilityInspection`, `ComplianceCertificate`, `FacilityIncident`, `TemporaryFacilityPlan`. Capacidade em `FacilityCapability`/`Snapshot`, não em "nível do centro".
- **Comercial:** `CommercialAsset`, `CommercialAssetInventory`, `Sponsor`, `SponsorContact`, `SponsorshipOpportunity`, `SponsorshipProposal`, `SponsorshipAgreement`, `SponsorshipRight`, `SponsorshipObligation`, `SponsorshipActivation`, `SponsorshipDelivery`, `CommercialCampaign`, `MerchandiseProduct`/`Inventory`/`Sale`, `TicketProduct`, `TicketPricePolicy`, `MatchTicketAllocation`, `HospitalityProduct`, `NamingRightsAgreement`, `SupplierAgreement`. Ativos explícitos (frente/manga do uniforme, placa, naming rights, camarote, conteúdo, treino, base, digital); constraint: mesmo ativo não pode ter dois direitos exclusivos sobrepostos.
- **Torcida:** `SupporterPopulation`, `SupporterSegment`(+`Snapshot`), `SupporterSentimentSnapshot`, `SupporterExpectation`, `SupporterMemory`, `SupporterGroup`(+`Relationship`), `SupporterCampaign`, `SupporterProtest`, `SupporterMembershipProgram`, `SupporterMembership`, `AttendanceDemandSnapshot`.
- **Comunicação e mídia:** `MediaOutlet`, `MediaPerson`, `MediaPublication`(+`Correction`), `MediaNarrative`(+`Entity`), `PressConference`, `PressQuestion`, `PressResponse`, `ClubCommunication`(+`Approval`), `PublicPromise`, `PublicStatement`, `Rumor`(+`Source`/`Resolution`), `SocialConversation`, `SocialMessage`, `SocialChannel`. Promessas por domínio (`PlayerPromise`, `StaffPromise`, `BoardPromise`, `PublicPromise`) com relações tipadas — sem tabela genérica que elimine relações.

#### 6.3.11 História, notificação, automação, entrada, admin e eventing — §128–140

- **História:** `HistoricalEvent`(+`Subject`), `HistoricalTimeline`, `SeasonHistoryBook`, `HistoricalHonor`, `HistoricalStatistic`(+`Correction`), `RecordDefinition`, `RecordOccurrence`, `RecordHolder`, `HistoricalEra`, `HistoricalRivalry`, `HistoricalCorrection`, `ClubHistoricalIdentityPeriod`, `PlayerCareerMilestone`, `StaffCareerMilestone`, `HistoricMatchClassification`. `HistoricalEvent` pode usar referência polimórfica controlada (`subjectType`/`subjectId`) por ser projeção transversal. Recorde: definição separada da ocorrência.
- **Notificações (Task 1 → N Notification):** `Notification`, `NotificationThread`(+`Entry`), `ActionableTask`, `TaskDependency`, `TaskAssignment`, `Reminder`, `NotificationPreferenceProfile`, `NotificationCategoryPreference`, `NotificationChannelPreference`, `NotificationDelivery`, `NotificationDigest`, `ReturnExperience`.

  > **Recomendação (a ratificar) — quiet hours:** modelar o horário de silêncio como **entidade dedicada `NotificationQuietHoursWindow`** (`profileId`, `dayOfWeekMask Int`, `startMinuteOfDay Int`, `endMinuteOfDay Int`, `timeZone String`, `respectsRealDeviceClock Boolean @default(true)`, `overriddenByUrgency NotificationUrgency` — nível a partir do qual o alerta fura o silêncio, ex.: `CRITICAL`), 0–N janelas por `NotificationPreferenceProfile`. Racional: janelas múltiplas e recorrentes não cabem em poucos campos escalares no perfil; entidade dedicada permite mais de uma faixa por dia, evolução independente e uma regra de exceção por urgência clara e auditável. Ancorar por relógio do dispositivo (fuso real do usuário), não pelo relógio do mundo, por ser experiência de vida real. Decisão a bater o martelo com produto.
- **Automações (versionadas):** `AutomationRule`(+`Version`), `AutomationTrigger`, `AutomationCondition`, `AutomationAction`, `AutomationLimit`, `AutomationExecution`(+`Action`), `AutomationApproval`, `AutomationConflict`, `AutomationSimulation`, `TaskDelegation`, `DelegationAuthority`. Execução referencia sempre `automationRuleVersionId`.
- **Entrada de usuários (processo):** `WorldEntryProcess`, `WorldEntryEligibilityCheck`, `WorldEntryQueue`(+`Item`), `WorldEntryClubOffer`, `ClubEntryReservation`, `ClubTakeoverReview`, `ClubExpansionProject`(+`Study`), `ExpansionClubConfiguration`, `InitialSquadGeneration`, `InitialSquadPlayerAllocation`, `ClubEntryBenefit`, `ClubOnboardingProgress`(+`Step`), `ClubInitialReview`.
- **Administração/operações:** `AdminOperator`, `AdminRole`, `AdminPermission`, `AdminRolePermission`, `AdminOperatorRole`, `AdminTemporaryAccess`, `AdminSession`, `AdminConflictDeclaration`, `BreakGlassAccess`, `AdministrativeOperation`, `AdministrativeApproval`, `AdministrativeCorrection`, `OperationalIncident`(+`TimelineEvent`/`CorrectiveAction`), `AdministrativeJob`, `Backup`, `RestoreOperation`, `MaintenanceWindow`, `Deployment`, `DatabaseMigration`, `FeatureFlag`, `SupportTicket`(+`Message`), `SupportAccessSession`, `AuditEvent` (sem cascade delete; cadeia de hash de integridade).
- **Eventing:** `DomainEvent`, `OutboxEvent`, `InboxEvent`, `ScheduledTask`(+`Attempt`), `ProcessManager`(+`Step`), `Lease`, `ProjectionState`, `ProjectionRebuild`, `DeadLetterMessage`, `IdempotencyRecord`, `CommandExecution`.

```prisma
model CommandExecution {
  commandId, idempotencyKey, actorId, gameWorldId, commandType, status,
  aggregateId, resultPayload, errorCode, createdAt, completedAt
  // Constraints: unique(commandId); unique(actorId, idempotencyKey)
}
model DomainEvent {
  eventId, gameWorldId, aggregateType, aggregateId, aggregateVersion, worldSequence,
  eventType, schemaVersion, correlationId, causationId, actorType, actorId,
  payload, occurredAtReal, occurredAtWorldTick
  // Constraints: unique(gameWorldId, eventId);
  //   unique(gameWorldId, aggregateType, aggregateId, aggregateVersion);
  //   unique(gameWorldId, worldSequence)
}
// Outbox: unique(eventId) · Inbox: unique(consumerName, eventId)
```

### 6.4 Constraints, integridade e infraestrutura de dados — §141–250

Pontos estruturais canônicos (detalhamento em [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md)):

- **Relações explícitas obrigatórias** (jogador↔contrato/clube, partida↔clubes, inscrição↔competição, lançamento↔conta, transferência↔jogador, tarefa↔responsável). **Referências genéricas** só para auditoria, notificação, histórico, arquivo, telemetria, event log, comentários administrativos — nunca para propriedade, dinheiro, elegibilidade ou resultado.
- **Constraints estruturais obrigatórias no banco** (~30 invariantes): 1 usuário por e-mail normalizado; 1 participação por usuário/mundo; 1 controle ativo por clube; 1 clube ativo por participante/mundo; 1 identidade oficial ativa por clube; 1 temporada por número/mundo; 1 relógio ativo por mundo; 1 Person por perfil de jogador/funcionário; 1 contrato principal incompatível ativo por jogador; 1 inscrição por jogador/clube/edição; 1 lado por clube/partida e 2 lados distintos; sequência única por evento de partida/mundo; versão por agregado; 1 processamento por `commandId`; 1 consumo por consumidor/evento; débitos = créditos; quantias positivas; percentuais na escala; datas finais ≥ iniciais; 1 direito comercial exclusivo por período/ativo; 1 runtime ativo por partida.
- **Constraints condicionais** via índice único parcial (ex.: `CREATE UNIQUE INDEX ... ON game.club_control (game_world_id, club_id) WHERE status = 'ACTIVE'`), CHECK, EXCLUDE (`EXCLUDE USING gist` para períodos sobrepostos de controle/contrato/identidade/direito comercial/reserva/cargo), triggers restritos, tabelas de estado atual.
- **Índices seguem consultas reais** (nunca por intuição): padrões `(gameWorldId, id/status/clubId/playerId/seasonId/deadlineWorldTick)`, mais índices de partida/financeiros/mercado/notificação; B-tree + GIN (texto/JSON) + trigram (nomes) + BRIN (séries temporais). Índices redundantes são revisados.
- **Particionamento não prematuro** — chave principal `gameWorldId`; candidatas: `DomainEvent`, `MatchEvent`, `AuditEvent`, `NotificationDelivery`, `HistoricalStatistic`. Estratégias: HASH(gameWorldId), RANGE(seasonId/occurredAtReal). Particionar exige chave de partição nas PK/unique.
- **Read models:** views (saldos, classificações, contratos/elenco/controle atuais, prazos), materialized views (rankings, resumos sazonais — não fonte de verdade), e projeções persistidas (`ClubDashboardProjection`, `CompetitionStandingProjection`, etc.) com `projectionVersion`/`lastProcessedEventId`/`rebuildStatus`, reconstruíveis.
- **Transações/locks:** cada command define agregado principal; ordem de locks documentada (`GameWorld → Club → Person/Player → Contract → TransferCase → FinancialReservation → FinancialAccount → Competition → Match`). Idempotência protegida por constraints (`commandId`, `idempotencyKey`, `sourceEventId`); gerações têm seed persistida (`GenerationProcess`/`GenerationItem`, `unique(gameWorldId, generationType, subjectId, generationVersion)`).
- **Migrações:** Prisma + SQL nativo complementares; `db push` fora de produção; migrações destrutivas em **expand-contract** (EXPAND → BACKFILL → DUAL WRITE → VALIDATE → SWITCH READ → STOP OLD WRITE → CONTRACT); backfills retomáveis; enums alterados conscientemente (valores não removidos casualmente). Seeds em 3 categorias (estrutural idempotente por código, desenvolvimento, testes).
- **Domínio isolado do Prisma:** `PrismaClient`/`Prisma.Decimal`/tipos gerados só na infraestrutura; conversão para objetos de valor de domínio (`BigInt → Money`, `String enum → DomainState`, `Json → ValidatedProfile`, `DateTime → RealInstant`, `BigInt worldTick → WorldInstant`).
- **Catálogo de invariantes** (`IntegrityInvariant`: `code`, `domain`, `enforcementLayer`, `severity`, `repairPolicy`, `monitoringQuery`) com níveis de proteção `APPLICATION_ONLY` / `DOMAIN_AND_APPLICATION` / `DATABASE_CONSTRAINT` / `DATABASE_AND_DOMAIN` / `CONTINUOUS_RECONCILIATION`. Exemplos: `PLAYER_ONE_ACTIVE_PRIMARY_CONTRACT`, `CLUB_ONE_ACTIVE_CONTROL`, `MATCH_TWO_DISTINCT_SIDES`, `FINANCIAL_ENTRY_BALANCED`, `WORLD_ONE_ACTIVE_CLOCK`, `PLAYER_REGISTRATION_UNIQUE`, `TRANSFER_PAYMENT_NOT_DUPLICATED`, `AUTOMATION_EXECUTION_IDEMPOTENT`.

> **Canônico:** as entidades, enums e constraints da seção 6 são o **detalhamento canônico** do schema; a nomenclatura granular (`UserAccount`, `WorldParticipant`, `ClubControl`, `Person`/`Player`, etc.) já é a oficial e converge com as convenções da §1. A escrita completa das FKs/índices Prisma campo a campo dos ~250 models e a definição fina de quais taxonomias viram catálogo (`CatalogDefinition`/`CatalogEntry`/`CatalogEntryTranslation`/`CatalogEntryVersion`) vs. `RuleSet`/`RuleValue` são **trabalho de implementação do schema** (não conflito v1×v2), guiado pelas regras da §6.1 e pelas Decisões 19.7/19.8.
