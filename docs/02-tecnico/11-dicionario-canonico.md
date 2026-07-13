# Dicionário Canônico (Escalas, Estados e Variáveis)

> **Status:** Material de consolidação (auditoria de prontidão — passo 3) · **Fontes reconciliadas:** [`../../prisma/schema.prisma`](../../prisma/schema.prisma) (enums executáveis), [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md), [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md), [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md), [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md), [`../01-game-design/04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md), [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md) · **Revisão:** 2026-07-12

Este documento é a **fonte única e sem ambiguidade** de **escalas**, **estados** e **nomes de variáveis** do **Grinta**. Ele existe para eliminar as divergências que a auditoria de prontidão apontou entre os documentos — escalas 1–5 × 1–10, atributos 0–100, faixas de `financialHealth`, contagens de fases/estados de temporada, representação de dinheiro, etc.

**Como ler este dicionário:**

- **Regra de precedência.** Para **sintaxe** (tipos, nomes de campo, enums), prevalece [`../../prisma/schema.prisma`](../../prisma/schema.prisma). Para **domínio** (invariantes, semântica), prevalece [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md). Para **regras/fórmulas** (IDs, estados, coeficientes), prevalece [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md). Este dicionário **não** cria escala nova: ele **declara a vencedora** e marca as demais como convertidas.
- **`CANÔNICO`** = fixado no schema ou em documento consolidado. **`RATIFICADO (R-##)`** = decisão normativa aprovada em 2026-07-13; quando numérica, é baseline versionável pelo processo de ruleset.
- **`CONVERTIDA`** = escala/contagem antiga que **não** é mais canônica; toda ocorrência deve ser lida/convertida para a vencedora.

---

## 1. Escalas canônicas

Para cada grandeza: **faixa**, **tipo/unidade**, **arredondamento**, **onde se aplica** e a **resolução de conflito** (escala vencedora × escalas convertidas).

### 1.1 Tabela-mestra de escalas

| # | Grandeza | Faixa canônica | Tipo / unidade | Arredondamento | Onde se aplica | Status |
|---|----------|----------------|----------------|----------------|----------------|--------|
| E1 | **Atributo / estado / traço / score de jogador** | `0–100` | `Int` | inteiro | `PlayerAttributes.*`, `Player.morale/confidence/happiness/fatigue/matchSharpness/injuryProneness/consistency/ambition/loyalty/professionalism`, `Player.currentAbility/potentialAbility`, `StaffMember.*Knowledge/*` | **CANÔNICO** |
| E2 | **Overall (média)** | `0–100` (derivado) | `Int` calculado | inteiro | derivado do grid por posição/função — **não** persistido como coluna | **RATIFICADO (R-09)** (pesos de agregação) |
| E3 | **Nível de núcleo / área / departamento** | `1–5` | `Int` | inteiro | `ClubDepartment.level` (`maxLevel = 5`), níveis de núcleo/área, comissão em partida, Motor de partida | **RATIFICADO (R-10)** |
| E4 | **Eficiência / aproveitamento do núcleo** | `0–100` (%) | `Int`/`Decimal` % | inteiro (%) | `ClubDepartment.qualityScore`; curva de aproveitamento por nível (40/55/70/85/95%) | **RATIFICADO (R-12)** |
| E5 | **`financialHealth`** | `0–100` (6 faixas) | `Int` índice | inteiro | saúde financeira do clube (`ClubEconomy`, campo de domínio) | **RATIFICADO (R-42)** |
| E6 | **Moral / satisfação / paciência / pressão institucional** | `0–100` | `Int` | inteiro | `Club.boardPatience` (def. 50), `Club.pressureLevel` (def. 0), estados de jogador (E1), `MatchTeamState.morale/tacticalCohesion` | **CANÔNICO** |
| E7 | **Dinheiro** | `BigInt` ≥ arbitrário | `BigInt amountMinor` + `currencyId` | unidade mínima (centavos) | todo campo `*Minor` (caixa, salários, cláusulas, prêmios, orçamentos, dívidas) | **CANÔNICO** |
| E8 | **Escala interna do motor** | `0–10000` (base 10000) | `Int` escalado | inteiro | atributos oficiais internos, multiplicadores determinísticos, probabilidades oficiais, percentuais em pontos-base | **RATIFICADO (R-82)** |
| E9 | **Probabilidade (fórmulas F#)** | `0–1` | `Decimal`/float | conforme uso | `p_gol`, `p_posse`, `p_chance`, `p_falta`, `p_cartão`, `p_lesão` no motor | **RATIFICADO (R-15…R-24)** |
| E10 | **Reputação** | `Int ≥ 1` (por faixa) | `Int` (def. 1) | inteiro | `Club.reputation`, `Competition.reputation`, `StaffMember.reputation` | **CANÔNICO** (bounds exatos: **BASELINE RATIFICADA**) |
| E11 | **Momentum** | `[−100, +100]` | `Decimal(8,4)` | 4 casas | `MatchSimulationTick.homeMomentum/awayMomentum` | **RATIFICADO (R-17)** |
| E12 | **xG (expected goals)** | `≥ 0` real | `Decimal(8,4)` | 4 casas | `Match.homeExpectedGoals/awayExpectedGoals`, F15 | **CANÔNICO** (tipo) |
| E13 | **Nota da partida (`rating`)** | `0.0–10.0` (base 6.0) | `Decimal(4,2)` | 2 casas | `PlayerMatchStats.rating` (def. 6.00), `PlayerSeasonStats.averageRating` | **CANÔNICO** (tipo) · **RATIFICADO (R-22)** (pesos) |
| E14 | **Taxas de crescimento/decaimento** | fração `Decimal` | `Decimal(6,4)` | 4 casas | `PlayerDevelopment.technicalGrowthRate/physicalGrowthRate/mentalGrowthRate/declineRate` | **CANÔNICO** (tipo) |
| E15 | **Multiplicadores/índices econômicos** | fração `Decimal` | `Decimal(8,4)` / `(10,4)` | 4 casas | `GameEconomyConfig.*Multiplier/*Weight`, `EconomySnapshot.marketInflationIndex/playerScarcityIndex/balanceScore` | **CANÔNICO** (tipo) |
| E16 | **Intensidade / prioridade / importância (ordinal)** | `Int ≥ 1` | `Int` (def. 1) | inteiro | `Narrative.intensity`, `Notification.priority`, `MatchEvent.importance` | **CANÔNICO** |
| E17 | **Tick de mundo** | `BigInt` monotônico | `BigInt` | inteiro | `ClubControl.startsAtWorldTick/endsAtWorldTick`; tick de partida ≈ 1 min (90+/jogo) | **CANÔNICO** |

### 1.2 Detalhamento e resolução de conflitos

**E1 — Atributo / estado / traço de jogador → `0–100` (vence).**
Fonte: [`02-sistema-de-jogadores.md §2`](../01-game-design/02-sistema-de-jogadores.md) — *"Escala canônica: 0–100 para todo atributo, estado, traço e score de jogador"*. O overview (§7) e a IA de comportamento (§3.4) apenas **referenciam** esta lista.
- **Atributo** (estrutural, muda devagar): técnicos, físicos, mentais, de goleiro — todos `Int 0–100` em `PlayerAttributes`.
- **Estado** (temporário, `0–100`): moral, fadiga, confiança, pressão emocional, motivação, forma recente, ansiedade, foco.
- **Traço** (personalidade profunda): intensidade `0–100` **+ visibilidade** (`visível` / `detectado por scout` / `oculto`). Traços **não** sobem com treino.
- **Conflito resolvido:** qualquer escala `1–20`/`1–10` de atributo em fontes antigas é **CONVERTIDA** para `0–100`. Onde um módulo usa `%` (energia/fadiga), ele **converte** de `0–100`, nunca redefine a escala.

**E2 — Overall → derivado, não armazenado.**
Overall/média é a **média ponderada** do grid por posição e função ([`02-sistema-de-jogadores.md §10`](../01-game-design/02-sistema-de-jogadores.md)); **não** é coluna do schema. `Player.currentAbility`/`potentialAbility` (E1) são os campos persistidos de habilidade global. Pesos de agregação = **RATIFICADO (R-09)**.

**E3 — Nível de estrutura → `1–5` (vence); `1–10` CONVERTIDA.**
Fonte: [`04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md) (R-10). Schema: `ClubDepartment.level Int @default(1)`, `maxLevel Int @default(5)`.
Faixas canônicas: **1** Básico · **2** Funcional · **3** Competitivo · **4** Avançado · **5** Elite.
- **Conflito resolvido:** a escala **1–10** das fontes antigas (comissão, aproveitamento 40/70/95%) está **aposentada** e é **CONVERTIDA** para `1–5`. Aplica-se a núcleos, áreas, comissão em partida e Motor de partida (mesma escala única).
- **Infraestrutura física** (estádio, CT, academia) **sai da escala de nível**: é modelada por dimensões granulares e projetos de 9 etapas (§12 da fonte). Onde ainda aparece "nível 1–5" de infraestrutura, é **leitura derivada** do serviço, não a modelagem primária.

**E4 — Eficiência do núcleo → `0–100%`.**
`ClubDepartment.qualityScore Int @default(10)` é a leitura agregada da eficiência emergente. Curva nominal por nível (R-12): 1→40% · 2→55% · 3→70% · 4→85% · 5→95%, ainda modulada para baixo por orçamento/sobrecarga/crise.

**E5 — `financialHealth` → `0–100`, 6 faixas (vence).**
Fonte: [`03-economia.md §6`](../01-game-design/03-economia.md) (regra ECO-004). Índice de domínio de `ClubEconomy` — **ainda não é coluna** do núcleo `Club` do schema (os campos monetários do `Club` são `cashMinor`, `wageBudgetMinor`, `transferBudgetMinor`; a saúde é derivada). Faixas de efeito (limiares **90/70/50/30/10**):

| Faixa | Rótulo |
|-------|--------|
| 90–100 | Excelente |
| 70–89 | Estável |
| 50–69 | Atenção |
| 30–49 | Pressão financeira |
| 10–29 | Crise |
| 0–9 | Colapso |

- **Conflito resolvido (dois eixos, não contradição):** as **6 faixas de efeito** acima ≠ os **6 estágios de crise institucional** (R-45): `estável` **70–100** · `atenção` **50–69** · `pressão` **30–49** · `crise` **10–29** · `insolvência` **0–9** · `reestruturação` (estado especial). São **eixos distintos** — granularidade de efeito do índice × estágio de crise. Ex.: `financialHealth = 95` está na faixa *Excelente* **e** no estágio *estável* ao mesmo tempo.
- Troca de faixa/estágio exige **histerese ±3** e persistência ≥ 1 ciclo mensal (R-42/R-45). Composição de pesos = **RATIFICADO (R-42)**.

**E6 — Moral / paciência / pressão institucional → `0–100`.**
`Club.boardPatience Int @default(50)`, `Club.pressureLevel Int @default(0)`; `MatchTeamState.morale/tacticalCohesion` (def. 50). Estados de jogador seguem E1. Humor de torcida usa o enum ordinal `MoodLevel` (§2), não `0–100`.

**E7 — Dinheiro → `BigInt amountMinor` + `currencyId` (vence); Float/Decimal PROIBIDO.**
Fonte: [`02-modelo-de-dados.md §1`](./02-modelo-de-dados.md) e cabeçalho do schema. Todo valor monetário é `BigInt` em **unidade mínima** (ex.: R$ 125,90 → `12590`) + `currencyId String @db.Uuid` (FK à futura `Currency`). Campos: `cashMinor`, `*BudgetMinor`, `salaryPerSeasonMinor`, `releaseClauseMinor`, `transferFeeMinor`, `amountMinor`, `*PriceMinor`, `prize*`, `debtMinor`, etc.
- **Conflito resolvido:** `Float`/`Double`/`Decimal` para dinheiro estão **PROIBIDOS** (INV-3 conservação). `Decimal` fica restrito a grandezas **não-monetárias** fracionárias (taxas, momentum, xG, rating, índices).

**E8 — Escala interna do motor → base `10000` (R-82).**
Fonte: [`01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md) (R-82) e [`02-modelo-de-dados.md`](./02-modelo-de-dados.md). Precisão **interna** acima da exibição pública (E1 `0–100`):
- **Atributos oficiais / multiplicadores determinísticos:** inteiro `0–10000` (`7825` = 78,25%).
- **Probabilidades oficiais:** base `10000` (`10000` = 100%, `0` = 0%, extremos sem ambiguidade).
- **Percentuais financeiros/contratuais:** **pontos-base** (base 10000, `500` = 5%; `basisPoints` `1250` = 12,50%).
- A exibição pública (`0–100`, E1) **deriva** da escala interna por arredondamento/faixa; **mudar de escala exige versionamento explícito**.

**E9 — Probabilidade de fórmula → `0–1`.**
Saídas das fórmulas F5–F13 do motor (`p_gol`, `p_posse`, etc.) operam em `(0,1)`; atributos entram em `0–100` e o motor satura via `clamp`. Persistência oficial usa base 10000 (E8). Coeficientes = **RATIFICADO (R-15…R-24)**.

**E10 — Reputação → `Int ≥ 1`, por faixa.**
Schema: `reputation Int @default(1)` em `Club`, `Competition`, `StaffMember`. Narrativamente lida por faixa (baixo/médio/alto — [`02-sistema-de-jogadores.md §11/§13`](../01-game-design/02-sistema-de-jogadores.md); ver também `momento` × `reputação` × `tradição`). Os **limites superiores exatos** e o mapeamento faixa↔número são **BASELINE RATIFICADA**.

**E11 — Momentum → `[−100, +100]` (`Decimal`).**
`MatchSimulationTick.homeMomentum/awayMomentum Decimal(8,4)`. Média móvel exponencial (R-17): `momentum_t = clamp(ρ·momentum_{t−1} + Σeventos, −100, +100)`. **RATIFICADO (R-17)** para `ρ` e acoplamento.

**E12/E13/E14/E15 — grandezas `Decimal` não-monetárias.** Tipos fixados no schema (ver tabela). Faixas: xG `≥ 0`; `rating` `0.0–10.0` base **6.0**; growth rates fracionários; índices econômicos partem de `1.00`.

---

## 2. Catálogo de estados (enums)

Enums **canônicos do schema executável** ([`schema.prisma`](../../prisma/schema.prisma)), com valores e transições permitidas (1 linha). Transições **não listadas são proibidas** e devem ser rejeitadas pelo domínio.

### 2.1 Plataforma e mundo

| Enum | Valores | Transições permitidas |
|------|---------|-----------------------|
| `UserRole` | `PLAYER` · `MODERATOR` · `ADMIN` | atribuição administrativa; sem ciclo de vida |
| `UserAccountStatus` | `ACTIVE` · `SUSPENDED` · `BANNED` · `ANONYMIZED` | `ACTIVE↔SUSPENDED`; `ACTIVE/SUSPENDED→BANNED`; qualquer→`ANONYMIZED` (LGPD, terminal) |
| `WorldStatus` | `CREATING` · `ACTIVE` · `PAUSED` · `FINISHED` · `ARCHIVED` | `CREATING→ACTIVE`; `ACTIVE↔PAUSED`; `ACTIVE/PAUSED→FINISHED→ARCHIVED` (terminal) |

### 2.2 Temporada — divergência de contagem (resolver aqui)

Há **três granularidades diferentes** para "temporada"; elas **não são o mesmo eixo** e não se contradizem:

| Camada | Contagem | Onde vive | Papel |
|--------|----------|-----------|-------|
| **Fase narrativa** | **7** — Pré-temporada · Início · Meio · Reta final · Fim · Pós-temporada · Nova temporada | [`06-temporada-e-competicoes.md §1`](../01-game-design/06-temporada-e-competicoes.md) | destrava tipos de evento; ritmo narrativo (`SeasonPhase`, marcos do calendário) |
| **Estado de máquina** | **6** — `PLANNING → REGISTRATION → IN_PROGRESS → FINALIZING → OFF_SEASON → COMPLETED` | [`05-catalogo §3.2`](./05-catalogo-de-regras-e-formulas.md) | máquina de estados do ciclo de vida |
| **Estado persistido** | **4** — `SeasonStatus`: `PLANNED · ACTIVE · FINISHED · ARCHIVED` | `schema.prisma` (`Season.status`, `CompetitionSeason.status`) | coluna gravada no banco |

> **Declaração canônica:** **fase narrativa (7) ≠ estado de máquina (6) ≠ estado persistido (4)**. O **`SeasonStatus` (4) é o valor persistido** e vence para o banco. A máquina de 6 estados é a referência de **ciclo de vida** (mapeia: `PLANNING/REGISTRATION`→`PLANNED`; `IN_PROGRESS`→`ACTIVE`; `FINALIZING/OFF_SEASON`→`FINISHED`; `COMPLETED`→`ARCHIVED`). As 7 fases são **rótulos narrativos** de calendário (`SeasonPhase`), independentes do `SeasonStatus`.

| Enum | Valores | Transições permitidas |
|------|---------|-----------------------|
| `SeasonStatus` | `PLANNED` · `ACTIVE` · `FINISHED` · `ARCHIVED` | `PLANNED→ACTIVE→FINISHED→ARCHIVED` (linear, sem retorno) |

### 2.3 Partida — status desmembrado em 3 responsabilidades

O antigo `MatchStatus` único (7 valores: `SCHEDULED/LIVE/PAUSED/FINISHED/CANCELLED/WALKOVER/SIMULATED_OFFLINE`) está **CONVERTIDO/superado** por três enums distintos ([`02-modelo-de-dados.md §2`](./02-modelo-de-dados.md), [`05-catalogo §3.1`](./05-catalogo-de-regras-e-formulas.md)):

| Enum | Valores | Transições permitidas |
|------|---------|-----------------------|
| `MatchRuntimeStatus` (ciclo de vida) | `SCHEDULED` · `PRE_MATCH` · `LIVE` · `PAUSED_FOR_DECISION` · `FINISHED` · `PROCESSED` | `SCHEDULED→PRE_MATCH→LIVE`; laço `LIVE↔PAUSED_FOR_DECISION`; `LIVE→FINISHED→PROCESSED`. **INV-2:** `FINISHED`/`PROCESSED` nunca voltam a `LIVE` |
| `MatchResultStatus` (desfecho) | `PENDING` · `NORMAL` · `WALKOVER` · `CANCELLED` · `ABANDONED` | `PENDING→{NORMAL, WALKOVER, CANCELLED, ABANDONED}` (definido no encerramento) |
| `HomologationStatus` (confirmação oficial) | `PENDING` · `PROVISIONAL` · `HOMOLOGATED` · `UNDER_APPEAL` · `OVERTURNED` | `PENDING→PROVISIONAL→HOMOLOGATED`; `HOMOLOGATED/PROVISIONAL→UNDER_APPEAL→{HOMOLOGATED, OVERTURNED}` |

> **Nota:** `SIMULATED_OFFLINE` **não é status de partida** — passou a ser `Match.simulatedOffline Boolean` + `MatchControlSource` (`USER_OFFLINE_AI`/`SYSTEM`). `PAUSED`→`PAUSED_FOR_DECISION` (runtime); `WALKOVER`/`CANCELLED` migraram para `MatchResultStatus`.

### 2.4 Clube, pessoa e jogador

| Enum | Valores | Transições permitidas |
|------|---------|-----------------------|
| `ClubControlType` | `USER` · `AI` | troca por evento de controle (`ClubControl`) |
| `ClubStatus` | `ACTIVE` · `INACTIVE` · `BANKRUPT` · `BOT_RESERVED` | `ACTIVE↔INACTIVE`; `ACTIVE→BANKRUPT`; `BOT_RESERVED→ACTIVE` (ao ser assumido) |
| `Gender` | `MALE` · `FEMALE` | imutável |
| `DominantFoot` | `LEFT` · `RIGHT` · `BOTH` | estrutural (pode mudar por treino de perna) |
| `PlayerStatus` | `ACTIVE` · `RETIRED` · `FREE_AGENT` · `INJURED` · `SUSPENDED` | `ACTIVE↔INJURED`; `ACTIVE↔SUSPENDED`; `ACTIVE↔FREE_AGENT`; qualquer→`RETIRED` (terminal, INV-4: aposentado não escala) |
| `PlayerGenerationSource` | `INITIAL_WORLD` · `SCOUT_FOUND` · `YOUTH_ACADEMY` · `REGEN_AFTER_RETIREMENT` · `MARKET_BALANCE` | atribuído na geração (INV-6: todo jogador tem origem) |
| `PlayerPosition` | `GK CB LB RB LWB RWB CDM CM CAM LM RM LW RW ST CF` (15) | primária/secundária; função ≠ posição (MAT-020) |

### 2.5 Comissão técnica, treino e elenco

| Enum | Valores | Transições / uso |
|------|---------|------------------|
| `StaffRole` | `HEAD_COACH ASSISTANT_COACH FITNESS_COACH GOALKEEPER_COACH SCOUT DOCTOR PHYSIOTHERAPIST PSYCHOLOGIST DIRECTOR NEGOTIATOR COMMUNICATION_MANAGER YOUTH_COORDINATOR` (12) | papel do `StaffMember`; ex-jogador reusa `Person` |
| `StaffQualityTier` | `VERY_LOW · LOW · MEDIUM · HIGH · ELITE` | tier ordinal (5) |
| `DepartmentType` | `MEDICAL TRAINING YOUTH_ACADEMY SCOUTING COMMUNICATION BOARD FINANCE INFRASTRUCTURE STADIUM DATA_ANALYSIS` (10) | tipo de `ClubDepartment` (nível 1–5, E3) |
| `TrainingFocus` | `PHYSICAL TECHNICAL TACTICAL MENTAL DEFENSIVE OFFENSIVE SET_PIECES RECOVERY INDIVIDUAL_ROLE` (9) | foco de `TrainingPlan`/`TrainingPlayerEntry` |
| `SquadType` | `SENIOR · RESERVE · YOUTH · NATIONAL` | tipo de `Squad` |
| `SquadCategory` | `FIRST_TEAM · RESERVE · YOUTH_ACADEMY · LOAN · TRIAL` | categoria de `Squad` |
| `YouthAgeCategory` | `U15 · U17 · U20 · U23` | faixa etária da base |
| `InjurySeverity` | `MINOR · LIGHT · MODERATE · SERIOUS · CRITICAL` | gravidade de `PlayerInjury` (5, ordinal) |

> **Canônico (C-03 / R-01 ratificada) — `HEAD_COACH` NÃO substitui o comando tático do humano.** `HEAD_COACH` é **papel de staff assessor**: em clube humano é **coordenador/assessor da comissão técnica** (melhora leitura de jogo, treino e recomendações) e em **clube IA / seleção** pode representar o **agente decisor**. Em nenhum caso existe **técnico-NPC contratável que retire do usuário humano a autoridade tática** — o usuário é Gestor + Técnico (R-01, única ratificada em 2026-07-11), comanda tática/escalação/decisões ao vivo, e a comissão apenas **assessora** (qualidade da comissão = qualidade das sugestões); a IA cobre só o período offline com limites de autoridade. `CoachTrust` (confiança do elenco no técnico) refere-se ao **próprio usuário**. A UI rotula "Coordenador técnico" no clube humano e "Técnico" em clube IA/seleção (R-162). Fontes: [`registro-de-decisoes R-01`](../99-decisoes/registro-de-decisoes.md#r-01--papel-do-usuário-gestor--técnico--ratificada), [`05-motor-de-partida.md §11`](../01-game-design/05-motor-de-partida.md).

### 2.6 Contratos, transferências e mercado

| Enum | Valores | Transições permitidas |
|------|---------|-----------------------|
| `ContractStatus` | `ACTIVE · EXPIRED · TERMINATED · RENEWED · TRANSFERRED` | `ACTIVE→{EXPIRED, TERMINATED, RENEWED, TRANSFERRED}`; `RENEWED→ACTIVE` (novo termo). INV-1: 1 contrato ativo/jogador |
| `TransferStatus` | `LISTED · NEGOTIATING · ACCEPTED · REJECTED · CANCELLED · COMPLETED · EXPIRED` | `LISTED→NEGOTIATING→{ACCEPTED→COMPLETED, REJECTED, CANCELLED, EXPIRED}` |
| `TransferType` | `PERMANENT · LOAN · FREE_AGENT · CONTRACT_END` | tipo do vínculo/oferta |
| `LoanPurchaseClauseType` | `NONE · OPTION_TO_BUY · OBLIGATION_TO_BUY · BUY_BACK` | cláusula de empréstimo (ECO-017: obrigação ≠ opção) |

### 2.7 Competição

| Enum | Valores | Uso |
|------|---------|-----|
| `CompetitionType` | `LEAGUE · CUP · SUPER_CUP · INTERNATIONAL_CUP · FRIENDLY` | tipo de `Competition` |
| `CompetitionFormat` | `ROUND_ROBIN · DOUBLE_ROUND_ROBIN · KNOCKOUT · GROUPS_AND_KNOCKOUT · SWISS` | formato de `Competition`/`CompetitionStage` |

### 2.8 Motor de partida (tática, IA, eventos)

| Enum | Valores | Uso |
|------|---------|-----|
| `TacticalMentality` | `VERY_DEFENSIVE · DEFENSIVE · BALANCED · OFFENSIVE · VERY_OFFENSIVE` | `MatchTeamState.mentality` (def. `BALANCED`) |
| `PressingIntensity` | `LOW · MEDIUM · HIGH · VERY_HIGH` | `MatchTeamState.pressing` (def. `MEDIUM`) |
| `MarkingStyle` | `ZONAL · MAN_TO_MAN · MIXED` | `MatchTeamState.marking` (def. `ZONAL`) |
| `TempoStyle` | `SLOW · NORMAL · FAST · DIRECT` | `MatchTeamState.tempo` (def. `NORMAL`) |
| `MatchControlSource` | `USER_ONLINE · USER_OFFLINE_AI · FULL_AI · SYSTEM` | quem controla o time na partida |
| `MatchEventType` | `GOAL OWN_GOAL ASSIST YELLOW_CARD RED_CARD INJURY SUBSTITUTION TACTICAL_CHANGE PENALTY_AWARDED PENALTY_MISSED PENALTY_SCORED FREE_KICK SHOT SHOT_ON_TARGET SAVE FOUL OFFSIDE VAR_CHECK MOMENTUM_SHIFT FATIGUE_ALERT AI_DECISION` (21) | tipo de `MatchEvent` |
| `DecisionPointType` | `INJURY RED_CARD FATIGUE BAD_PERFORMANCE LOSING_GAME WINNING_GAME TACTICAL_OPPORTUNITY OPPONENT_WEAKNESS PLAYER_RISK FINAL_PRESSURE` (10) | gatilho de `MatchDecisionPoint` |
| `RecommendationImpact` | `LOW · MEDIUM · HIGH · CRITICAL` | urgência/impacto de recomendação |

### 2.9 Narrativa, notificação, finanças e automação

| Enum | Valores | Uso |
|------|---------|-----|
| `MoodLevel` | `VERY_LOW · LOW · NEUTRAL · HIGH · VERY_HIGH` | `ClubSeasonStats.fanMood` (def. `NEUTRAL`) |
| `NarrativeType` | `FAN_PRESSURE MEDIA_RUMOR PLAYER_UNHAPPY BOARD_PRESSURE DERBY_HYPE TITLE_RACE RELEGATION_RISK TRANSFER_SPECULATION COMEBACK_STORY` (9) | tipo de `Narrative` |
| `NotificationType` | `MATCH_EVENT MATCH_DECISION_POINT TRANSFER_OFFER CONTRACT_ALERT INJURY_ALERT FINANCE_ALERT FAN_REACTION BOARD_MESSAGE COMPETITION_UPDATE SCOUT_REPORT TRAINING_REPORT` (11) | tipo de `Notification` |
| `FinanceTransactionType` | `TICKET_REVENUE SPONSORSHIP PLAYER_SALE PLAYER_PURCHASE WAGE_PAYMENT STAFF_WAGE_PAYMENT STADIUM_COST STRUCTURE_UPGRADE PRIZE_MONEY TAX MAINTENANCE LOAN_PAYMENT OTHER_INCOME OTHER_EXPENSE` (14) | tipo de `FinancialTransaction` |
| `AutomationLevel` | `MANUAL · ASSISTED · SEMI_AUTOMATED · FULLY_AUTOMATED` | `AutomationRule.level` (def. `ASSISTED`) |
| `AutomationRuleStatus` | `DRAFT · ACTIVE · PAUSED · DISABLED · ARCHIVED` | `DRAFT→ACTIVE↔PAUSED`; `→DISABLED→ARCHIVED` |

> **Estado por string livre (não-enum):** `WorldParticipant.status String @default("ACTIVE")`, `SquadMembership.role String?`, `PlayerContract.roleInSquad String?`, `MatchTeamState.formation String` (ex.: "4-3-3") e demais `*Json` são **texto/JSON** por decisão de flexibilidade — não têm enum canônico e não entram na validação de transição.

---

## 3. Dicionário de variáveis

Nomes **canônicos** das variáveis-chave citadas em fórmulas, regras e schema — com tipo, faixa e documento de origem. Grafia (camelCase) e nome são normativos: **usar exatamente estes identificadores** em código, testes e docs.

### 3.1 Identidade, mundo e dinheiro

| Variável | Tipo | Faixa / unidade | Origem | Nota |
|----------|------|-----------------|--------|------|
| `gameWorldId` | `String @db.Uuid` | UUIDv7 | schema · [`02-modelo §1`](./02-modelo-de-dados.md) | chave de partição lógica; **não** `worldId`; FK composta `(gameWorldId, id)` |
| `currencyId` | `String @db.Uuid` | UUIDv7 | schema | FK à moeda (`Currency`); acompanha todo `*Minor` |
| `amountMinor` | `BigInt` | unidade mínima | schema · E7 | dinheiro genérico; padrão `*Minor` para todo valor monetário |
| `cashMinor` | `BigInt` | unidade mínima | `Club` | caixa do clube |
| `version` | `Int` | `≥ 1` (def. 1) | schema | concorrência otimista |
| `startsAtWorldTick` | `BigInt` | tick monotônico | `ClubControl` · E17 | período de controle do clube |

### 3.2 Jogador — habilidade, estado e desenvolvimento

| Variável | Tipo | Faixa | Origem | Nota |
|----------|------|-------|--------|------|
| `overall` | `Int` (derivado) | `0–100` | [`02-sistema-de-jogadores §2/§10`](../01-game-design/02-sistema-de-jogadores.md) | média ponderada por posição/função; **não** persistido. **RATIFICADO (R-09)** |
| `currentAbility` | `Int` | `0–100` | `Player` | habilidade global atual |
| `potentialAbility` | `Int` | `0–100` | `Player` | teto de habilidade |
| `morale` | `Int` | `0–100` (def. 50) | `Player` · E1 | estado (temporário) |
| `fatigue` | `Int` | `0–100` (def. 0) | `Player` · E1 | estado; alimenta F2/penalidades |
| `matchSharpness` | `Int` | `0–100` (def. 50) | `Player` | ritmo de jogo |
| `marketValueMinor` | `BigInt` | unidade mínima | `Player` · E7 | valor de mercado |
| `developmentGain` | fórmula | ganho por atributo | [`§6`](../01-game-design/02-sistema-de-jogadores.md) · [`catálogo`](./05-catalogo-de-regras-e-formulas.md) | `= baseLearningRate × remainingPotential × focoDoTreino × trainingQuality × playerCompatibility × minutesFactor × ageFactor × personalityFactor × supportFactor × moraleFactor − penalidades` |
| `playerCompatibility` | fator | `0–1` | `developmentGain` (PLY-007) | compatibilidade jogador × estilo/treino |
| `baseLearningRate` | fator | `0–1` | `developmentGain` | capacidade de aprendizado (distinta de `focoDoTreino`) |
| `focoDoTreino` | fator | `0–1` | `developmentGain` | quanto o treino aponta ao atributo |
| `technicalGrowthRate` | `Decimal(6,4)` | fração | `PlayerDevelopment` · E14 | (idem `physicalGrowthRate`, `mentalGrowthRate`, `declineRate`) |

### 3.3 Clube e economia

| Variável | Tipo | Faixa | Origem | Nota |
|----------|------|-------|--------|------|
| `financialHealth` | `Int` (domínio) | `0–100` (6 faixas) | [`03-economia §6`](../01-game-design/03-economia.md) (ECO-004) · E5 | índice de saúde; **RATIFICADO (R-42)** (composição). Não é coluna do `Club` no schema |
| `boardPatience` | `Int` | `0–100` (def. 50) | `Club` | paciência da diretoria |
| `pressureLevel` | `Int` | `0–100` (def. 0) | `Club` | pressão institucional |
| `reputation` | `Int` | `≥ 1` por faixa (def. 1) | `Club`/`Competition`/`StaffMember` · E10 | bounds exatos **BASELINE RATIFICADA** |
| `level` | `Int` | `1–5` | `ClubDepartment`/núcleos · E3 | nível de estrutura; **RATIFICADO (R-10)** |
| `qualityScore` | `Int` | `0–100` (def. 10) | `ClubDepartment` · E4 | eficiência emergente; **RATIFICADO (R-12)** |
| `marketInflationIndex` | `Decimal(10,4)` | parte de 1.00 | `EconomySnapshot` · E15 | (idem `playerScarcityIndex`, `balanceScore`) |

### 3.4 Motor de partida (fórmulas F#)

| Variável | Tipo | Faixa | Origem | Nota |
|----------|------|-------|--------|------|
| `atributoEfetivo` | `Int` | `clamp(…, 20, 99)` | F1 · [`catálogo`](./05-catalogo-de-regras-e-formulas.md) | atributo base + modificadores de contexto. **RATIFICADO (R-15)** |
| `momentum` | `Decimal(8,4)` | `[−100, +100]` | F14 · `MatchSimulationTick` · E11 | EMA por tick; **RATIFICADO (R-17)** |
| `rawScore` | número | linear (ex.: 33) | F11 · [`catálogo §F11`](./05-catalogo-de-regras-e-formulas.md) | `= (finalizaçãoEfetiva − defesaEfetiva) + qualidadeDaChance + pressãoDefensiva`. **RATIFICADO (R-20)** |
| `p_gol` | prob. | `[pMin, pMax]` ⊂ `0–1` | F11 · E9 | `= pMin + (pMax−pMin)·σ(k·(rawScore−50))`, `k=0.042`. **RATIFICADO (R-20)** |
| `xG` | `Decimal(8,4)` | `≥ 0` | F15 · `Match.homeExpectedGoals` · E12 | `= Σ p_gol(finalização_i)` |
| `rating` | `Decimal(4,2)` | `0.0–10.0` (base 6.0) | F16 · `PlayerMatchStats.rating` · E13 | nota da partida. **RATIFICADO (R-22)** (pesos) |
| `decisionScore` | `Int` | `0–100` | F17 | `>70` gera ponto de decisão · `40–70` observação · `<40` ignora. **RATIFICADO (R-22)** |
| `offlineDecisionQuality` | `Int` | `0–100` | F18 | limiar 60: `<60` só ações seguras. **RATIFICADO (R-22)** |
| `staffLevel` | número | `0–100` | F21 | média ponderada (6 pesos somam 1.00). **RATIFICADO (R-23)** |
| `zoneControl` / `vantagemDaZona` | número | somatório | F5 | 9 zonas (3×3). **RATIFICADO (R-19)** |
| `possePerigosa` | prob. | `0–1` | F6 | distinta de posse total. **RATIFICADO (R-19)** |
| `riscoDeLesão` / `p_lesão` | prob. | `[0, 0.02]`/tick | F13 | `baseRate=0.0004`. **RATIFICADO (R-21)** |
| `simulationSeed` / `randomSeed` | `String` | seed | `Match`/`MatchSimulation` (MAT-015) | replay determinístico |
| `engineVersion` | `String` | semver | `MatchSimulation` | compatibilidade de replay |

### 3.5 Versionamento de regras

| Variável | Tipo | Faixa | Origem | Nota |
|----------|------|-------|--------|------|
| `GameFormula.version` | `Int` | `≥ 1` | [`catálogo §2.2`](./05-catalogo-de-regras-e-formulas.md) | versão local da fórmula |
| `currentRuleSetVersionId` | `String @db.Uuid` | UUIDv7 | `GameWorld` | ruleset vigente do mundo (carimbo agregado). **RATIFICADO (R-24)** para a política 1:1 |

---

## 4. Termos canônicos e superados (glossário normativo)

Fixa a terminologia ambígua apontada pela auditoria (M-01). Em **documento normativo** use **apenas** o termo canônico; os **SUPERADOS** são sinônimos históricos que **não** devem aparecer em spec (só toleráveis em prosa introdutória, nunca como nome de conceito). Onde um termo é **ambíguo isolado**, use a forma qualificada.

| Conceito | Termo **CANÔNICO** | **SUPERADO / a evitar** | Nota |
|----------|--------------------|-------------------------|------|
| Servidor/instância persistente do jogo | **mundo** (`GameWorld`, `gameWorldId`) | **"sala"** (superado); **"universo"** só editorial | R-149: **"universo"** é sinônimo editorial permitido, **nunca** nome de entidade/API/schema. **"sala"** é **superado** (colide com sala de socket/broadcast). API, banco e UX usam **mundo**/`gameWorldId`. Um "mundo" é a instância isolada e persistente; múltiplos mundos coexistem. |
| Camada **estrutural** (moldura de acesso) | **liga por nível estrutural** — moldura **Inicial → Acesso → Intermediária → Principal → Elite** | **"liga"** isolado | Eixo do **nível estrutural do clube** (1–5, E3), avaliado na virada de temporada com histerese (R-83). Muda por porte estrutural, **não** por resultado. |
| Competição **esportiva** (disputa por resultado) | **Série** / **Divisão** (`1, 2, 3…`) · **Copa** (mata-mata) | **"liga"** isolado | Disputa por resultado (promoção/rebaixamento) **dentro** da liga de nível. Mapeia ao enum `CompetitionType` (`LEAGUE`/`CUP`/…) — o valor de schema `LEAGUE` é sintaxe, não o rótulo de domínio. |

- **`mundo` = canônico; `sala` = SUPERADO; `universo` = sinônimo editorial permitido (nunca entidade/API/schema — R-149).** `gameWorldId` é a nomenclatura de schema (E17/§3.1); `worldId` também é forma a evitar (ver §3.1, "não `worldId`").
- **`liga` isolado é AMBÍGUO — não usar sozinho em doc normativo.** Reserve **"liga por nível estrutural"** (moldura Inicial→Elite) para a camada estrutural; para a competição esportiva use **"Série"/"Divisão"/"Copa"**. Os dois eixos combinam-se como **moldura × disputa** (R-83): um clube compete nas **Séries da sua liga de nível**; subir de **Série** (resultado) e subir de **liga de nível** (estrutura) são eventos independentes.
- **Consistência cruzada.** [`01-game-design/16-glossario-de-entidades.md §1`](../01-game-design/16-glossario-de-entidades.md) segue esta fixação: "Mundo" é o termo canônico; "universo" é sinônimo editorial (R-149), nunca nome de entidade/API. Fonte da moldura × disputa: [`03-multiplayer-e-mundos.md`](./03-multiplayer-e-mundos.md) (R-83).

---

## Notas finais

- **Escopo.** Este dicionário consolida escalas/estados/variáveis; **não** substitui os documentos-dono. Coeficientes de balanceamento permanecem no [`catálogo §2.4`](./05-catalogo-de-regras-e-formulas.md) (Série R) e nos docs de game design.
- **Material de consolidação.** Todo item `RATIFICADO (R-##)` é normativo desde o ato de 2026-07-13. Itens `CANÔNICO` já estavam no schema executável ou em documento consolidado.
- **Manutenção.** Ao publicar/alterar uma escala, atualize **aqui primeiro**; os demais docs devem **referenciar** este dicionário em vez de redeclarar faixas.
