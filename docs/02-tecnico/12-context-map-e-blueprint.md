# Context Map e Blueprint de Domínio

> **Status:** CANÔNICO (Série R ratificada em 2026-07-13) · **Bloqueador:** B-02 · **Passo:** 4 da ordem de correção · **Fontes derivadas:** [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md) (§6 bounded contexts, §5 engines), [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md) (Decisões 19.7/19.8/19.10, sagas), [`./07-arquitetura-do-core-ecs.md`](./07-arquitetura-do-core-ecs.md) (runtime ECS), [`./10-catalogo-de-commands.md`](./10-catalogo-de-commands.md) (43 commands e eventos emitidos), [`../01-game-design/16-glossario-de-entidades.md`](../01-game-design/16-glossario-de-entidades.md), [`prisma/schema.prisma`](../../prisma/schema.prisma), [`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md) (§7 mapa inferido) · **Revisão:** 2026-07-12

Este documento é o **context map canônico** e o **blueprint de domínio** do **Grinta**. Ele responde diretamente ao bloqueador **B-02** da auditoria de prontidão: *"não existe context map canônico com aggregate roots, ownership de escrita, dependências, eventos públicos e fronteiras transacionais"* — pré-condição para o primeiro código de produção ([`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md)).

> **Modo CANÔNICO.** O conteúdo derivado das Decisões 19.7–19.10 e as escolhas próprias de fronteira, ownership e quebra de ciclos foram ratificados por R-148. Alteração futura exige nova decisão e análise de migração.

## Sumário

1. [Princípios do blueprint](#1-princípios-do-blueprint)
2. [Bounded contexts](#2-bounded-contexts)
3. [Aggregate roots e ownership de escrita](#3-aggregate-roots-e-ownership-de-escrita)
4. [Grafo de dependências (com quebra de ciclos)](#4-grafo-de-dependências-com-quebra-de-ciclos)
5. [Eventos públicos (integration events)](#5-eventos-públicos-integration-events)
6. [Fronteiras transacionais](#6-fronteiras-transacionais)
7. [Rastreabilidade e pendências](#7-rastreabilidade-e-pendências)

---

## 1. Princípios do blueprint

Cinco regras governam todo o mapa abaixo. São a formalização das decisões já tomadas (doc 00 §6, doc 01 Decisão 19.8/19.10) aplicadas ao desenho de contextos.

1. **Um agregado, um dono de escrita.** Cada aggregate root pertence a **exatamente um** bounded context. Só o dono escreve nas tabelas do agregado; os demais **reagem por evento** ou **leem por contrato/query**, nunca por SQL cruzado (doc 00 §6.3: "FK não concede ownership de escrita" — doc 01 §19.8).
2. **Toda escrita é escopada por mundo.** A chave é sempre **`(gameWorldId, id)`** (canônico `game_world_id`/`gameWorldId`, Decisão 19.7/E8). Nenhuma relação atravessa mundos; nenhum contexto escreve fora do seu mundo.
3. **Comunicação entre contextos por contrato, não por internals.** Command, query, evento de domínio ou interface de aplicação — nunca acesso a tabela/repositório/classe interna de outro contexto (doc 00 §6.3, acoplamentos proibidos).
4. **Consistência forte só dentro de um agregado.** Uma transação PostgreSQL local protege **um** agregado (+ sua Outbox). Multiagregado/multicontexto usa **saga/process manager**, nunca 2PC (Decisão 19.10).
5. **Decisão é determinística; narrativa é derivada.** Contextos de estado oficial não dependem de LLM; contextos narrativos **consomem** fatos e **não** alteram estado competitivo (doc 00 §4.4). O runtime ECS ([doc 07](./07-arquitetura-do-core-ecs.md)) é o *motor* interno dos contextos que simulam ecossistema (Partida, Jogador, Clube), hidratado de/projetado para o relacional — **não** é um contexto.

**Diferença entre "contexto" e "engine".** Os *engines* do doc 00 §5 (Match, Economy, Development, AI Decision…) são **componentes de cálculo** dentro de `packages/core`. Os *bounded contexts* aqui são **fronteiras de ownership** — módulos de aplicação (`apps/api`) que orquestram engines, repositórios e transações. Um contexto usa um ou mais engines; um engine nunca é dono de dados.

---

## 2. Bounded contexts

Os **25 módulos** finos do doc 00 §6.2 (`identity`, `world`, `club`, `person`, `player`, `squad`, `training`, `tactics`, `match`, `competition`, `calendar`, `market`, `scouting`, `transfer`, `contract`, `staff`, `finance`, `infrastructure`, `commercial`, `supporter`, `communication`, `history`, `notification`, `automation`, `administration`) consolidam-se em **12 bounded contexts** de topo + **3 concerns transversais**. Consolidar reduz a superfície de ciclos e dá um dono claro a cada agregado sem perder a granularidade de pacote (a extração de subpacotes segue o doc 00 §10).

### 2.1 Mapa módulo → contexto

| # | Bounded context | Schema(s) PG (Decisão 19.7) | Módulos finos absorvidos |
|---|---|---|---|
| C1 | **Identidade/Conta** | `identity` | `identity` (+ vínculo de gestão/entrada) |
| C2 | **Mundo/Temporada** | `worlds`, `scheduling` | `world`, `calendar` (relógio/janelas do mundo), ruleset |
| C3 | **Clube/Estrutura** | `clubs` | `club`, `infrastructure`, `commercial` |
| C4 | **Jogador/Desenvolvimento** | `players` | `person`, `player`, `training`, medicina/base |
| C5 | **Staff** | `staff` | `staff` |
| C6 | **Mercado/Contratos** | `transfers`, `contracts` | `market`, `transfer`, `contract`, `scouting` |
| C7 | **Competição/Calendário** | `competitions` | `competition`, `calendar` (fixtures/edição), `squad` (inscrição) |
| C8 | **Partida/Runtime** | `matches` | `match`, `tactics` |
| C9 | **Economia/Ledger** | `finance` | `finance` (economia sistêmica/faucets-sinks) |
| C10 | **Torcida/Narrativa** | `supporters`, `narrative` | `supporter`, `communication`, narrativa |
| C11 | **Notificação/Relatório** | `notifications`, `history`, `projections` | `notification`, `history`, estatísticas/relatórios |
| C12 | **Anti-abuso/Admin** | `audit`, `operations` | `administration`, anti-cheat |
| — | **Automação/IA** *(concern)* | — (sem tabelas próprias de estado oficial) | `automation` + AI Decision Engine |
| — | **Eventing/Projeção** *(concern)* | `messaging`, `projections` | Outbox/Inbox/DLQ, projeções, realtime |
| — | **Clientes (App/Admin)** *(concern)* | — | `apps/mobile`, `apps/admin` |

> **`squad` (Elenco):** o glossário separa **participação no elenco** (`SquadCategory`) de **inscrição competitiva** (`CompetitionRegistration`). **BASELINE RATIFICADA:** o *elenco/hierarquia interna* (`Squad`/`SquadMembership`) é dado do **Clube/Estrutura** (composição do plantel), enquanto a *inscrição em edição* pertence à **Competição/Calendário**. Ownership de escrita fica claro assim: nenhum contexto disputa a mesma linha. Racional: elenco muda por decisão de gestão do clube; inscrição muda por janela e cota de competição.

### 2.2 Ficha de cada contexto

Para cada contexto: **responsabilidade** (o que é dele), **aggregate roots** (donos de escrita — detalhados na §3) e **o que NÃO é dele** (fronteira negativa — o alerta contra escrita cruzada).

#### C1 · Identidade/Conta (`identity`)
- **Responsabilidade:** conta humana, sessão, participação em mundo e **vínculo de gestão** (quem controla qual clube, com início/fim). Onboarding de entrada (reserva de vaga → ativação de controle → saída). Cooldowns de conta.
- **Aggregate roots:** `UserAccount`, `UserSession`, `WorldParticipant`, `WorldEntryProcess`, `ClubEntryReservation`, `ClubControl`.
- **NÃO é dele:** o **clube em si** (isso é C3 — `ClubControl` referencia `Club`, não o cria como propriedade sua); risco/quarentena antiabuso (C12); qualquer estado de jogo do clube controlado.

#### C2 · Mundo/Temporada (`worlds`, `scheduling`)
- **Responsabilidade:** ciclo de vida do mundo e da temporada; **relógio do mundo** (`advanceDays`), janelas (mercado/inscrição/renovação), ruleset e config econômica **por versão**, agendador persistente (`scheduled_task`, leases). É a **fonte do tempo** que dispara todos os contextos temporais.
- **Aggregate roots:** `GameWorld`, `Season`, `WorldClock`, `GameRuleConfig`, `GameEconomyConfig`, `ScheduledTask`.
- **NÃO é dele:** executar as regras dos outros domínios — o clock **emite eventos/jobs** (`WorldDayAdvanced`, `SeasonDue`), e cada contexto processa o seu passo. O Mundo **não** escreve em `players`, `matches`, `finance`.

#### C3 · Clube/Estrutura (`clubs`)
- **Responsabilidade:** clube como instituição permanente; departamentos/peças investíveis, estádio e obras (`infrastructure`), políticas de bilhete, contratos comerciais (`commercial`), governança de diretoria (objetivos, promessas de board, plano de recuperação), perfil de IA/offline e identidade visual. Composição de **elenco** (§2.1).
- **Aggregate roots:** `Club`, `ClubDepartment`, `InfrastructureProject`, `Stadium`/`Facility`, `TicketPricePolicy`, `MaintenancePlan`, `SponsorshipAgreement`, `BoardPromise`/`ClubGovernance`, `ClubAIProfile`, `ClubIdentityPeriod`, `Squad`/`SquadMembership`.
- **NÃO é dele:** o **ledger** e os pagamentos (C9 — o clube define orçamento/obra, mas quem lança caixa é Economia); os **jogadores** (C4); a **inscrição** em competição (C7). O clube nunca escreve `Player` nem `LedgerEntry`.

#### C4 · Jogador/Desenvolvimento (`players`)
- **Responsabilidade:** o atleta único e permanente; identidade (`Person` reusável entre papéis), atributos, background/personalidade, **desenvolvimento** (treino → evolução), **medicina** (lesão/reabilitação), carreira, aposentadoria e geração de base (youth). Plano de treino e plano médico cujas invariantes são sobre o **estado do jogador**.
- **Aggregate roots:** `Person`, `Player`, `PlayerAttributes`, `PlayerDevelopment`, `PlayerInjury`, `TrainingPlan`, `TrainingPlayerEntry`, `PlayerCareerPlan`, `YouthClass`.
- **NÃO é dele:** o **contrato** e o **vínculo de propriedade** (C6 — `PlayerContract` é a fonte autoritativa de "de quem é o jogador"); a **inscrição** competitiva (C7); alterar `Player` a partir da partida (C8 escreve stats de partida, mas o **efeito** sobre o atleta é aplicado aqui via evento).

#### C5 · Staff (`staff`)
- **Responsabilidade:** membros de staff e seus contratos; capacidade/eficiência por função (médico, olheiro, PF, comissão), que **modula** treino, scouting, safra e partida.
- **Aggregate roots:** `StaffMember`, `StaffContract`.
- **NÃO é dele:** os efeitos que sua capacidade gera (aplicados por C4/C6/C8 lendo a capacidade como contrato/query); a folha salarial (calculada por C9).

#### C6 · Mercado/Contratos (`transfers`, `contracts`)
- **Responsabilidade:** todo o **processo** de mercado — listagens, propostas/contrapropostas (`TransferCase` + versões de oferta), acordos, empréstimos, scouting/observação; e os **contratos** de jogador (assinatura, renovação, cláusulas, comissão). É o dono do **vínculo autoritativo** jogador↔clube.
- **Aggregate roots:** `TransferListing`, `TransferCase`, `TransferOffer`/`TransferOfferVersion`, `TransferAgreement`, `PlayerLoanAgreement`, `PlayerContract`, `ScoutingMission`, `ScoutReport`, `TransferStrategy`, `Watchlist`.
- **NÃO é dele:** mover dinheiro (C9 — o mercado **reserva** e a Economia **liquida**); inscrever o jogador na competição (C7); alterar atributos/estado do atleta (C4). A troca de clube é **efeito** de `TransferSigned`, não um `UPDATE Player.clubId` direto.

#### C7 · Competição/Calendário (`competitions`)
- **Responsabilidade:** regulamento permanente (`Competition`), **edição** anual, participantes, estágios, geração de fixtures/calendário competitivo, classificação/standings, **inscrição** de jogadores (cotas), qualificação e homologação.
- **Aggregate roots:** `Competition`, `CompetitionSeason` (edição), `CompetitionClub` (participante), `CompetitionStage`, `CompetitionRegistration`, `Standings`/`ClubSeasonStats`(competitiva), `CompetitionRuleSet`.
- **NÃO é dele:** simular a partida (C8 — Competição **agenda** e **recebe** o resultado); pagar premiação (C9 reage a `CompetitionEditionHomologated`); o relógio do mundo (C2).

#### C8 · Partida/Runtime (`matches`)
- **Responsabilidade:** preparação (tática, escalação, game plan) e **runtime** ao vivo/offline da partida (1 runtime ativo por partida), simulação tick-a-tick, eventos, pontos de decisão, comandos ao vivo, checkpoints e **resultado oficial único**.
- **Aggregate roots:** `Match`, `MatchTacticalPlan`, `MatchLineup`, `MatchRuntime`, `MatchSimulation`/`MatchSimulationTick`, `MatchDecisionPoint`, `MatchResult`, `PlayerMatchStats` (da partida).
- **NÃO é dele:** persistir a evolução do atleta, suspensões, standings ou premiação — a finalização é **local ao Match** e faz **fan-out por evento** (`MatchFinished`) para C4/C7/C9 (ver §6.3, refinamento BASELINE RATIFICADA da finalização).

#### C9 · Economia/Ledger (`finance`)
- **Responsabilidade:** **livro-razão balanceado** (fonte única do saldo), reservas financeiras, orçamento, dívida/crédito, folha, cronogramas de pagamento de transferência, snapshots financeiros e **economia sistêmica** (contas-fonte/sink, faucets, rebalance, inflação). Saldo oficial deriva **do ledger**, nunca de projeção (Decisão 19.10, ledger balanceado).
- **Aggregate roots:** `LedgerAccount`, `LedgerTransaction`/`LedgerEntry`, `FinancialReservation`, `Budget`, `CreditFacility`/`ClubDebt`, `Payment`/`TransferPaymentSchedule`, `ClubFinanceSnapshot`.
- **NÃO é dele:** decidir a transferência (C6), a obra (C3) ou a premiação (C7) — a Economia **reage** com débito/crédito balanceado. Nunca chama serviço externo dentro da transação de ledger (Decisão 19.10).

#### C10 · Torcida/Narrativa (`supporters`, `narrative`)
- **Responsabilidade:** base de torcida, segmentos, satisfação, rivalidade, ídolo, reputação narrativa; comunicação (imprensa, promessas públicas verificáveis, conversas com jogador); **narrativa** derivada dos fatos. Camada de **linguagem/percepção** (doc 00 §4.4).
- **Aggregate roots:** `Fanbase`/`SupporterSegment`, `SupporterSatisfaction`, `Narrative`, `PressResponse`, `PublicPromise`, `PlayerConversation`, `Rivalry`.
- **NÃO é dele:** alterar placar, atributos, saldo ou validade de ação — **consome** eventos oficiais e produz percepção/receita-de-torcida (esta última **posta** no ledger via evento). `Narrative.effectsJson` **não** tem autoridade sobre estado competitivo (reconcilia risco do backlog §8).

#### C11 · Notificação/Relatório (`notifications`, `history`, `projections`)
- **Responsabilidade:** notificações priorizadas, threads, digests/push/email; **histórico** perene (timelines, recordes, registro histórico), estatísticas consolidadas e relatórios. É majoritariamente **read-side/derivado** (projeções reconstruíveis, Decisão 19.8).
- **Aggregate roots:** `Notification`, `NotificationThread`, `NotificationDelivery`, `HistoryRecord`/`Timeline`, `PlayerSeasonStats`, `SeasonReport`.
- **NÃO é dele:** decidir qualquer resultado (só reflete fatos); ser fonte de verdade competitiva (projeções são descartáveis/reconstruíveis).

#### C12 · Anti-abuso/Admin (`audit`, `operations`)
- **Responsabilidade:** avaliação de risco/multi-conta, quarentena, punição, correções administrativas (com matriz de aprovação e trilha de auditoria append-only), suporte/recursos, reprocessamento e reversão operacional.
- **Aggregate roots:** `RiskAssessment`, `AntiAbuseCase`, `Sanction`, `AdministrativeCorrection`, `GameAuditLog` (cadeia de hash), `SupportTicket`.
- **NÃO é dele:** o gameplay normal — atua por **exceção** e por **operação formal**; corrige estado de outro contexto **apenas** via command administrativo ratificado pela matriz de ações (doc 04/09), nunca por SQL cru.

#### Concern · Automação/IA
- **Responsabilidade:** IA de decisão (escalação, mercado, board) e automações do usuário. **Não possui estado oficial próprio além de `AutomationRule`/`ClubAIProfile`** (regras/perfil). **Regra de ouro:** a IA **emite os mesmos commands** que um humano emitiria — não escreve agregados alheios (reconcilia risco "IA ↔ regras" do backlog). É um **cliente do barramento de commands**, como o app.
- **Aggregate roots:** `AutomationRule`/`AutomationRuleVersion` (o `ClubAIProfile` é co-owned como perfil do clube — C3).

#### Concern · Eventing/Projeção
- **Responsabilidade:** Outbox/Inbox/DLQ, publicação pós-commit, projeções, entrega realtime e recuperação de sequência. Transversal e **sem regra de negócio** — transporta o que os contextos produzem.

#### Concern · Clientes (App/Admin)
- **Responsabilidade:** apps não-autoritativos (Expo/Next.js). Enviam **intents/commands** e consomem **streams/queries**; nenhum estado oficial (doc 08).

---

## 3. Aggregate roots e ownership de escrita

Tabela canônica: **agregado → contexto dono (quem escreve) → command(s) de escrita → invariante(s) protegida(s) → chave**. **Regra absoluta:** a coluna "Escrito por" lista o **único** dono; qualquer outro contexto que precise do dado **lê por query** ou **reage a evento**. Chave sempre `(gameWorldId, id)` salvo entidades globais (marcadas *global*).

### 3.1 Identidade, Mundo e Clube

| Aggregate root | Contexto dono | Command(s) de escrita | Invariante protegida | Chave |
|---|---|---|---|---|
| `UserAccount` | C1 | *(auth/registro)* | 1 conta por credencial; status coerente | `id` *(global)* |
| `WorldParticipant` | C1 | `ReserveClubSlot` (indireto) | 1 participação por `(mundo, user)` | `(gameWorldId, id)` |
| `ClubControl` | C1 | `ActivateClubControl`, `LeaveClub` | **1 controle ativo por clube**; 1 clube ativo por participante | `(gameWorldId, id)` |
| `WorldEntryProcess` / `ClubEntryReservation` | C1 | `ReserveClubSlot` | 1 reserva viva por ator; TTL (R-25) | `(gameWorldId, id)` |
| `GameWorld` | C2 | *(admin/lifecycle)* | seed imutável; status; `worldSequence` monotônico | `id` |
| `WorldClock` | C2 | `world:daily-tick` (job) | só o detentor do **lease** avança; sem pular etapa | `(gameWorldId, id)` |
| `Season` | C2 | `season:check-start-end` (job) | 1 temporada ativa por mundo; transições válidas | `(gameWorldId, id)` |
| `GameRuleConfig` / `GameEconomyConfig` | C2 | *(admin, versionado)* | regra muda por versão + data efetiva | `(gameWorldId, id)` |
| `Club` | C3 | `CreateClub`, `SetTransferStrategy`, `ApplyClubIdentity` | slug único por mundo; identidade oficial ativa única | `(gameWorldId, id)` |
| `ClubDepartment` | C3 | `UpgradeDepartment` | `level ≤ maxLevel`; 1 upgrade em curso/depto | `(gameWorldId, id)` |
| `InfrastructureProject` | C3 | `StartStadiumWorks`, `ScheduleMaintenance` | sem obra conflitante no mesmo ativo | `(gameWorldId, id)` |
| `TicketPricePolicy` | C3 | `SetTicketPrices` | preço na faixa plausível (R-27) | `(gameWorldId, id)` |
| `SponsorshipAgreement` | C3 | `SignCommercialDeal` | sem 2 direitos exclusivos sobrepostos por ativo | `(gameWorldId, id)` |
| `Squad`/`SquadMembership` | C3 | (efeito de `SignTransfer`/`PromoteYouthPlayer`) | 1 participação principal por jogador/clube | `(gameWorldId, id)` |
| `ClubAIProfile` | C3/Automação | `SetOfflinePlan` | limites de autoridade respeitados | `(gameWorldId, id)` |

### 3.2 Jogador, Staff, Mercado e Contrato

| Aggregate root | Contexto dono | Command(s) de escrita | Invariante protegida | Chave |
|---|---|---|---|---|
| `Person` | C4 | *(geração/lifecycle)* | 1 pessoa reusada entre papéis | `(gameWorldId, id)` |
| `Player` | C4 | (efeitos: treino/partida/aging via evento) | atributos na escala oficial; estado explícito | `(gameWorldId, id)` |
| `PlayerDevelopment` | C4 | `SetPlayerCareerPlan`, `training:process-results` | ganho ≤ potencial restante; 1 relógio de progressão | `(gameWorldId, id)` |
| `PlayerInjury` | C4 | `SetMedicalPlan`, `medical:process-recovery` | estágio reabilitação 1–7 coerente | `(gameWorldId, id)` |
| `TrainingPlan` | C4 | `SetTrainingPlan` | carga na escala; respeita restrição médica | `(gameWorldId, id)` |
| `StaffMember`/`StaffContract` | C5 | `HireStaff`, `ReleaseStaff` | papel não duplicado; contrato ativo único | `(gameWorldId, id)` |
| `TransferCase` (+ ofertas) | C6 | `MakeTransferOffer`, `MakeCounterOffer`, `AcceptOffer`/`RejectOffer`, `SignTransfer`, `LoanPlayer` | **≤1 acordo por case**; contraproposta não sobrescreve; oferta na faixa (R-26) | `(gameWorldId, id)` |
| `TransferListing` | C6 | `ListPlayer`/`UnlistPlayer` | sem 2 listagens ativas; unlist bloqueado com oferta viva | `(gameWorldId, id)` |
| `PlayerContract` | C6 | `SignContract`, `RenewContract`, `PromoteYouthPlayer` | **1 contrato principal ativo por jogador** (exclusion constraint) | `(gameWorldId, id)` |
| `ScoutingMission`/`ScoutReport` | C6 | `StartScoutMission` | missões simultâneas ≤ limite (R-28) | `(gameWorldId, id)` |
| `TransferStrategy` | C6/C3 | `SetTransferStrategy` | `maxSpend` coerente com orçamento | `(gameWorldId, id)` |

### 3.3 Competição, Partida, Economia e demais

| Aggregate root | Contexto dono | Command(s) de escrita | Invariante protegida | Chave |
|---|---|---|---|---|
| `Competition` / `CompetitionSeason` | C7 | `competition:generate-fixtures` (job) | 1 edição ativa por competição/temporada | `(gameWorldId, id)` |
| `CompetitionClub` (participante) | C7 | (inscrição/seed) | 1 participação por clube/edição (PK composta) | `(gameWorldId, competitionEditionId, clubId)` |
| `CompetitionRegistration` | C7 | `RegisterPlayer` | **1 inscrição por jogador/clube/edição**; cotas | `(gameWorldId, id)` |
| `Standings`/`ClubSeasonStats` | C7 | (projeção de `MatchFinished`) | derivada, reconstruível; determinística | `(gameWorldId, id)` |
| `MatchTacticalPlan` | C8 | `SetTactics`, `SetGamePlan` | jogadores do elenco; antes do lock | `(gameWorldId, id)` |
| `MatchLineup` | C8 | `SetLineup` | 11 titulares elegíveis; antes do lock | `(gameWorldId, matchId)` (1:1) |
| `MatchRuntime` | C8 | `SubmitMatchDecision`/`IssueMatchCommand`/`MakeSubstitution`/`ResolveDecisionPoint`, `match:simulate-*` | **1 runtime ativo por partida**; `runtimeEpoch`; ordem por `matchSequence` | `(gameWorldId, matchId)` |
| `MatchResult` | C8 | `match:finish` (job) | **1 resultado oficial** por partida (unique result version) | `(gameWorldId, matchId)` (1:1) |
| `LedgerTransaction`/`LedgerEntry` | C9 | (reação a eventos: `TransferSigned`, `WagesDue`, prêmio) | **débitos = créditos**; sem somar moedas distintas | `(gameWorldId, id)` |
| `LedgerAccount` | C9 | (idem, com `SELECT FOR UPDATE` ordenado) | saldo deriva do ledger; sem saldo negativo indevido | `(gameWorldId, id)` |
| `FinancialReservation` | C9 | `MakeTransferOffer`/`UpgradeDepartment`/`StartStadiumWorks` (via C6/C3) | não comprometer o mesmo orçamento 2× | `(gameWorldId, id)` |
| `Budget` | C9/C3 | `SetBudget` | soma ≥ comprometido; sem desfinanciar reserva ativa | `(gameWorldId, id)` |
| `CreditFacility`/`ClubDebt` | C9 | `OpenCreditFacility` | capacidade de crédito; crédito não duplicado | `(gameWorldId, id)` |
| `Fanbase`/`SupporterSatisfaction` | C10 | (reação a fatos: resultado, promessa) | derivado de fato oficial | `(gameWorldId, id)` |
| `PublicPromise`/`PressResponse` | C10 | `MakePublicPromise`, `RespondToPress`, `RespondToBoard` | promessa verificável; 1 resposta por pergunta | `(gameWorldId, id)` |
| `Notification` | C11 | (reação a eventos) | idempotência de entrega (Inbox) | `(gameWorldId, id)` |
| `HistoryRecord` | C11 | (append de eventos oficiais) | imutável; append-only | `(gameWorldId, id)` |
| `AutomationRule` | Automação | `SaveAutomation`/`ToggleAutomation` | alto risco não delegável; sem conflito de precedência | `(gameWorldId, id)` |
| `AdministrativeCorrection`/`GameAuditLog` | C12 | commands admin (matriz de aprovação) | trilha append-only com cadeia de hash | `(gameWorldId, id)` |
| `SupportTicket` | C12 | `SubmitAppeal` | 1 recurso aberto por caso | `(gameWorldId, id)` |

> **Leitura da tabela.** Quando um command "de C6" cria uma `FinancialReservation` "de C9", isso **não** significa que C6 escreve em `finance`. **BASELINE RATIFICADA:** a reserva é criada por uma **operação da Economia** invocada pela camada de aplicação da transferência (interface de aplicação `FinanceReservationPort`), ou pela mesma **saga**; o dado nasce e vive sob C9. A coluna "command" indica o *gatilho de negócio*, não o escritor físico. Idem para `Budget`/`ClubAIProfile` co-owned (a linha de escrita é única; a leitura é compartilhada).

---

## 4. Grafo de dependências (com quebra de ciclos)

Duas arestas distintas conectam contextos:

- **`—read→`** (dependência **síncrona**): A precisa **ler** dado/contrato de B em tempo de decisão (query ou snapshot). Cria acoplamento de leitura; **deve ser acíclico**.
- **`···evt···>`** (dependência **assíncrona**): A **reage** a um evento de B. Desacoplada no tempo; **pode** fechar um laço de feedback sem criar ciclo de código/deploy.

**Regra de quebra de ciclo:** sempre que duas leituras síncronas formariam um ciclo, uma das direções é **rebaixada a evento**. O grafo de `—read→` resultante é um **DAG**.

### 4.1 Lista de adjacência (só arestas síncronas `—read→`, já acíclicas)

```
C1 Identidade      → C2, C3            (valida mundo/vaga e clube-alvo)
C2 Mundo/Temporada → (nenhuma)         raiz do DAG — fonte do tempo
C3 Clube           → C2, C5, C9(query saldo/orçamento p/ gate)
C4 Jogador         → C2, C5            (calendário/staff p/ treino e medicina)
C5 Staff           → C2, C3            (mundo; clube empregador)
C6 Mercado/Contr.  → C2, C3, C4, C5, C9(query orçamento/reserva)
C7 Competição      → C2, C3            (mundo; clubes participantes)
C8 Partida         → C2, C3, C4, C6, C7 (snapshot de elenco/tática/inscrição no kickoff)
C9 Economia        → C2, C3            (mundo; clube titular da conta)
C10 Torcida/Narr.  → C2, C3            (só leitura de fatos p/ contexto)
C11 Notif./Relat.  → (lê projeções; sem dep. de escrita)
C12 Anti-abuso     → todos (VIEW/INVESTIGATE — leitura de auditoria)
Automação/IA       → C2..C10 (lê projeções autorizadas p/ decidir)
```

Ordenação topológica (camadas): **C2** → {C1, C3, C5, C7, C9} → {C4, C6} → **C8** → {C10, C11} → {C12, Automação} (transversais).

### 4.2 Diagrama ASCII

```
                         ┌──────────────────────────┐
                         │  C2  MUNDO / TEMPORADA     │  (raiz — relógio, ruleset, janelas)
                         │  emite: DayAdvanced,       │
                         │  SeasonRolledOver, Windows │
                         └───────────┬────────────────┘
              ┌──────────┬───────────┼───────────┬──────────────┐
              ▼          ▼           ▼           ▼              ▼
        ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  ┌──────────────┐
        │C1 IDENT.│ │C3 CLUBE │ │C5 STAFF │ │C7 COMPET│  │C9 ECONOMIA    │
        │ vínculo │ │ estrut. │ │capacid. │ │ edição  │  │ LEDGER (saldo)│
        └────┬────┘ └──┬───┬──┘ └────┬────┘ └────┬────┘  └───▲──────┬────┘
             │  (read) │   │ (read)  │ (read)    │ (read)    │      │
             │         │   └─────────┼───────────┼───────────┘      │
             ▼         ▼             ▼           │       reserva/    │ evt: prêmio,
        ┌──────────────────────────────────┐    │       liquida     │ crise, wages
        │ C4 JOGADOR / DESENVOLVIMENTO       │   │        (read)     │
        │ atributos, treino, medicina, aging │   │                   │
        └───────────────┬───────────────────┘   │                   │
                        │ (read snapshot)        │                   │
             ┌──────────┴───────────┐            │                   │
             ▼                      ▼            ▼                   │
        ┌─────────────────┐   ┌──────────────────────────┐          │
        │ C6 MERCADO /     │   │ C8 PARTIDA / RUNTIME      │──read────┘
        │ CONTRATOS        │   │ snapshot elenco/tática    │
        │ TransferCase,    │   │ resultado oficial único   │
        │ PlayerContract   │   └───────────┬──────────────┘
        └──────┬───────────┘               │ evt: MatchFinished
               │ evt: TransferSigned,       │  (fan-out choreography)
               │ ContractSigned/Expired     ▼
               │            ┌───────────────┴───────────────────────────┐
               │            │  aplica efeitos nos DONOS (não Match):     │
               │            │  C4 física/lesão · C7 standings/suspensão  │
               │            │  C9 premiação/bilheteria · C10 narrativa   │
               ▼            ▼
        ┌──────────────────────────────────┐        ┌──────────────────────┐
        │ C10 TORCIDA / NARRATIVA            │───evt─▶│ C11 NOTIFICAÇÃO/RELAT. │
        │ (deriva de fatos; NÃO altera estado)│       │ (projeções, histórico) │
        └──────────────────────────────────┘        └──────────────────────┘

  transversais (clientes/observadores, sem escrita cruzada):
  Automação/IA ──(emite mesmos commands que humano)──▶ C1..C10
  C12 Anti-abuso/Admin ──(corrige só por command administrativo + auditoria)──▶ alvo
  Eventing/Projeção ── Outbox/Inbox/DLQ ── transporta todos os eventos
```

Legenda: setas cheias `▼/→` = `—read→` (síncrono, DAG); rótulos `evt` = `···evt···>` (assíncrono).

### 4.3 Dependências circulares detectadas e QUEBRADAS

A auditoria alerta para ciclos (backlog §7). Abaixo, cada laço candidato e como o blueprint o **quebra** — sempre rebaixando **uma** direção a evento e fixando um **dono de escrita único**. Todas as quebras são **BASELINE RATIFICADA** (racional explícito).

| # | Ciclo candidato | Por que surgiria | Quebra (BASELINE RATIFICADA) | Direção que vira evento |
|---|---|---|---|---|
| **Q1** | **C3 Clube ↔ C9 Economia** | Clube lê saúde financeira para gate; Economia é movida por decisões do clube | Economia é dona do ledger. Clube **lê** saldo/orçamento por query read-only para *gate*; Economia **nunca** lê Clube de forma síncrona — reage a eventos (`DepartmentUpgradeStarted`, obra). Crise volta como `FinancialCrisisRaised` | Economia→Clube = **evento** |
| **Q2** | **C4 Jogador ↔ C8 Partida** | Partida precisa dos atributos; partida altera fadiga/lesão/moral | Partida lê **snapshot imutável** do elenco no kickoff (query, não FK de escrita). O efeito no atleta é aplicado por **C4** ao consumir `MatchFinished`/`PlayerInjuredInMatch`. Match **não** escreve `Player` | Partida→Jogador = **evento** |
| **Q3** | **C7 Competição ↔ C8 Partida** | Competição agenda a partida; partida devolve resultado p/ tabela | Competição **agenda** (`MatchScheduled`, síncrono na geração) → Partida. Partida **finaliza** e emite `MatchFinished` → Competição projeta standings. Dono de escrita distinto (runtime/result × standings) | Partida→Competição = **evento** |
| **Q4** | **C6 Mercado ↔ C9 Economia** | Oferta exige orçamento; liquidação move caixa | Mercado obtém **reserva** via port da Economia (a Economia escreve a reserva); a liquidação é passo de **saga** (SAGA-01), não leitura mútua. Mercado nunca escreve ledger | liquidação = **saga**; reserva = **port** |
| **Q5** | **C6 Contrato ↔ C4 Jogador** (`Player.clubId` vs contrato vs squad) | Três representações do mesmo vínculo (desconexão backlog) | **Fonte autoritativa do vínculo = `PlayerContract` (C6).** `Player` **não** carrega `clubId` autoritativo; `SquadMembership` (C3) e `Player.currentClubId` são **projeções** de `ContractSigned`/`TransferSigned`. Elimina o triângulo de escrita | Contrato→Jogador/Clube = **evento/projeção** |
| **Q6** | **Automação/IA ↔ (todos)** | IA "decide" em todos os módulos → escreveria em todos | IA **não escreve agregado alheio**: emite os **mesmos commands** que um humano, validados pelas mesmas invariantes. Vira **cliente** do barramento, fora do grafo de escrita | IA→domínios = **command** (não escrita) |
| **Q7** | **C10 Narrativa ↔ C8/C4 estado** | `effectsJson` sugere que narrativa altera estado | Narrativa é **derivada e read-only** (doc 00 §4.4): consome fatos, produz texto/percepção. Receita-de-torcida entra no ledger por **evento**, não por escrita da narrativa | Narrativa = **consumidor puro** |
| **Q8** | **C2 Mundo ↔ (todos temporais)** | Clock "processa" todos os domínios no tick | Clock **emite** `WorldDayAdvanced`/`SeasonDue`/janelas e enfileira jobs; cada contexto **processa seu passo** no seu agregado. Mundo não escreve fora de `worlds`/`scheduling` | Mundo→domínios = **evento/job** |

**Resultado:** o grafo de **escrita** é uma **árvore de ownership** (cada agregado tem 1 dono) e o grafo de **leitura síncrona** (§4.1) é um **DAG** com raiz em C2. Todos os laços de feedback do jogo (resultado→reputação→receita, investimento→pressão) fecham por **evento**, preservando o "ecossistema" do doc 07 sem ciclo de código.

---

## 5. Eventos públicos (integration events)

**Integration event** = evento de domínio que **cruza fronteira de contexto** (≠ evento interno de um agregado). Convenção: **PascalCase no passado** (doc 10), publicado pela Outbox na mesma transação do agregado (Decisão 19.10), transportado com `aggregateVersion` (ordem por agregado) e `worldSequence` (ordem por mundo). Garantia **`AT_LEAST_ONCE`** + idempotência de consumo (Inbox).

Abaixo os eventos **públicos** essenciais (produtor → consumidores). Eventos puramente internos (ex.: `TacticsSet` intra-partida) não entram aqui.

### 5.1 Catálogo produtor → consumidores

| Evento | Produtor | Consumidores (contexto : reação) |
|---|---|---|
| `ClubControlActivated` / `ClubLeft` / `AiControlAssumed` | C1 | C3: liga/desliga controlador · Automação: assume/cede IA · C11: notifica · C12: registra |
| `WorldDayAdvanced` | C2 | C4: aging/treino · C6: expira contratos/ofertas · C9: folha/juros · C7: rodadas devidas · C8: dispara partidas do dia |
| `SeasonRolledOver` (virada) | C2 | C7: nova edição/fixtures · C9: fechamento contábil · C4: aging/aposentadoria · C3: metas/orçamento · Youth(C4): nova safra · C11: relatório de temporada |
| `TransferWindowOpened` / `RegistrationWindowOpened` (+ `...Closed`) | C2 | C6: habilita ofertas/assinaturas · C7: habilita inscrição · C11: notifica |
| `DepartmentUpgradeCompleted` / `StadiumWorksCompleted` | C3 | C5: nova capacidade · C4: novos multiplicadores de desenvolvimento · C9: baixa da reserva · C10: expectativa/pressão |
| `CommercialDealSigned` | C3 | C9: receita/obrigação no ledger · C11: notifica |
| `YouthPlayerPromoted` | C4 | C6: `ContractSigned` do jovem · C3: squad · C7: elegibilidade |
| `PlayerInjured` / `PlayerRecovered` | C4 | C8: elegibilidade de escalação · C6: valor/negociação · C10: narrativa · C11: notifica |
| `PlayerRetired` | C4 | C6: encerra contrato/vínculo · C7: baixa inscrição · Youth(C4): equação demográfica · C11: histórico |
| `StaffCapacityChanged` (`StaffHired`/`StaffReleased`) | C5 | C4: treino/medicina · C6: scouting · C8: efeitos de comissão · C9: folha |
| `TransferAgreementReached` (`OfferAccepted`) | C6 | **SAGA-01**: dispara exame/contrato/registro/liquidação · C10: narrativa · C11: notifica |
| `TransferSigned` / `TransferCompleted` | C6 | C4/C3: projeta novo vínculo/squad · C9: converte reserva → `Payment`/`TransferPaymentSchedule` · C7: reabre inscrição · C10/C11 |
| `ContractSigned` / `ContractRenewed` / `ContractExpired` | C6 | C9: folha · C3: squad/projeção · C4: satisfação · C7: elegibilidade · C11 |
| `PlayerLoaned` | C6 | C3(destino): squad · C9: divisão salarial · C7: inscrição destino · C11 |
| `MatchScheduled` / `FixturesGenerated` | C7 | C8: cria `Match`/agenda runtime · C2: prazos no scheduler · C11: calendário |
| `CompetitionEditionHomologated` / `QualificationDetermined` | C7 | C9: premiação/cotas · C3: reputação/metas · C4: convocação/valor · C11: histórico/títulos |
| `MatchFinished` (resultado oficializado) | C8 | **fan-out**: C7 standings/suspensão · C4 física/lesão/desenvolvimento pós-jogo · C9 bilheteria/premiação · C10 narrativa/torcida · C11 stats/notificação |
| `GoalScored` / `CardIssued` / `SubstitutionMade` | C8 | C10: narrativa ao vivo · C11: timeline/stream realtime · (C7 disciplina consolida em `MatchFinished`) |
| `FinancialReservationCreated` | C9 | C6/C3: confirma compromisso · C11 |
| `FinancialCrisisRaised` / `RecoveryPlanImposed` | C9 | C3: aplica plano de recuperação/limita ações · Automação: ajusta política · C11: notifica |
| `WagesPaid` / `LedgerEntryPosted` | C9 | C3: snapshot financeiro · C11: histórico/relatório |
| `PublicPromiseMade` / `PromiseFulfilled` / `PromiseBroken` | C10 | C4: moral/satisfação · C3: reputação · C11: notifica |
| `SupporterSatisfactionChanged` | C10 | C9: receita de torcida/bilheteria · C3: pressão/expectativa |
| `RiskFlagRaised` / `AntiAbuseQuarantineApplied` | C12 | C6: bloqueia negociação · C1: cooldown · C11: notifica · Automação: suspende |
| `AdministrativeCorrectionApplied` / `SanctionApplied` | C12 | contexto-alvo: aplica correção · C11: notifica · sempre com `GameAuditLog` |

### 5.2 Regras de contrato de evento (BASELINE RATIFICADA)

- **Registry único.** Todo evento público entra num **event registry** versionado (nome, versão, produtor, schema do payload em Zod, consumidores declarados) — o análogo do apêndice de errorCodes do doc 10. Fecha o "event registry incompleto" (backlog §8). **BASELINE RATIFICADA:** materializado em `/packages/contracts` junto ao enum `ErrorCode`.
- **Payload autocontido e imutável.** Evento carrega os IDs e o suficiente para o consumidor agir sem *callback* síncrono ao produtor; referências podem ser **lógicas** (Decisão 19.8, evento histórico autocontido).
- **Sem evento como command.** Evento descreve fato consumado ("aconteceu"); pedir ação a outro contexto é **command/saga**, não evento.

---

## 6. Fronteiras transacionais

Classificação em **três níveis** (Decisão 19.10). O nível define isolamento, locks e se há saga.

### 6.1 Transação local de agregado (a esmagadora maioria)

Um agregado, **uma transação PostgreSQL** (`READ COMMITTED` + optimistic concurrency por `version`) + **Outbox atômica**. É o caso de quase todos os 43 commands: `SetLineup`, `SetTactics`, `RenewContract`, `ListPlayer`, `HireStaff`, `SetBudget`, `SetTicketPrices`, `UpgradeDepartment`, `MakeTransferOffer`, `SaveAutomation`, etc.

```
BEGIN;
  SELECT ... FOR UPDATE (ou WHERE version = $expected);   -- 1 agregado
  UPDATE <aggregate> SET ..., version = version + 1;      -- invariante local
  INSERT INTO messaging.outbox_messages (...);            -- evento na MESMA tx
COMMIT;                                                    -- pós-commit: publica
```

Regra: **conflito otimista** → `AGGREGATE_VERSION_CONFLICT` (alias `CONTRACT_VERSION_CONFLICT` p/ `PlayerContract`), recarrega `currentVersion` e reenvia. **Nenhuma chamada externa dentro da transação.**

### 6.2 Transação local **multi-linha** de um único contexto

Ainda **uma** transação, mas toca várias linhas do **mesmo contexto** — atomicidade forte é a invariante:

- **Transferência financeira entre contas (ledger balanceado — C9).** `SELECT FOR UPDATE` das contas em **ordem global de `accountId`**, cria transação + débitos/créditos, **valida Σdébitos = Σcréditos**, grava Outbox. Sem chamada externa (Decisão 19.10, fluxo passo a passo).
- **Finalização de partida (C8).** Persiste resultado + eventos + stats **da partida** + runtime, com proteção de `runtimeEpoch`/`matchSequence`/unique result version. Retry idêntico é idempotente; resultado divergente = incidente de integridade.

> **BASELINE RATIFICADA (refinamento da finalização — reconcilia o risco do backlog §8 "finalização excessivamente atômica").** A transação de finalização escreve **apenas agregados de C8** (result, match events, match stats, runtime) **+ Outbox**. Física/lesão do atleta (C4), suspensão/standings (C7), bilheteria/premiação (C9) e narrativa (C10) **não** entram nessa transação — são aplicadas pelos **donos** ao consumir `MatchFinished` (coreografia da §5.1). Isso reduz o lock, honra o ownership (§3) e mantém consistência via idempotência + `worldSequence`. A atomicidade "tudo num único commit" descrita no doc 01 fica **restrita ao que é de C8**; o restante é eventualmente consistente e reconciliável.

### 6.3 Saga / process manager (multiagregado, multicontexto)

Quando o processo cruza **mais de um contexto** e/ou **espera etapas futuras**, usa-se **saga** com estado persistido (`process_manager_id`, `status ∈ {CREATED, RUNNING, WAITING, COMPENSATING, COMPLETED, FAILED, MANUAL_REVIEW}`, `current_step`, `completed_steps`, `compensation_steps`) — **sem 2PC** (Decisão 19.10). Cada passo é uma transação local do contexto dono; falha posterior dispara **compensação**.

As sagas são **apontadas aqui e detalhadas no passo 10** da ordem de correção (backlog §7/§10 — "definir estados, timeouts, compensações, idempotência, authority e terminais por saga"). Este blueprint fixa **quais** processos são sagas, **quem** participa e **o que** compensa:

| Saga | Contextos participantes (dono de cada passo) | Passos (resumo) | Compensação | Gatilho / evento |
|---|---|---|---|---|
| **SAGA-01 · Transferência** | C6 (case/contrato) · C9 (reserva/liquidação) · C4 (exame médico) · C7 (inscrição) | reservar orçamento → aceitar oferta → negociar contrato → exame → registrar → liquidar → concluir | libera `FinancialReservation`, cancela acordo pendente, reverte inscrição | `TransferAgreementReached` → `SignTransfer` |
| **SAGA-02 · Virada de temporada** | C2 (orquestra) · C7 (edições/fixtures) · C9 (fechamento) · C4 (aging/aposentadoria + safra) · C3 (metas/orçamento) | `REQUESTED → PREPARING → VALIDATING → FREEZING_INPUTS → CALCULATING → APPLYING_RESULTS → VERIFYING → COMPLETED` (Decisão 19.10, processo longo) | retoma do checkpoint sem duplicar promoção/prêmio/geração (backlog §591) | job `season:check-start-end` / `SeasonDue` |
| **SAGA-03 · Onboarding/entrada** | C1 (entrada/controle) · C3 (clube) | reservar vaga (TTL R-25) → ativar controle → onboarding (auditoria se clube forte) | expira reserva, reverte controle | `ReserveClubSlot` → `ActivateClubControl` |
| **SAGA-04 · Obra/estrutura** | C3 (projeto) · C9 (financiamento) | viabilidade → financiar (reserva/crédito) → progresso → conclusão | libera reserva/crédito, cancela projeto | `StartStadiumWorks` |
| **SAGA-05 · Empréstimo** | C6 (acordo) · C9 (divisão salarial) · C7 (inscrição destino) | acordar → consentir jogador → inscrever destino → vigência → recall/retorno | reverte inscrição, encerra divisão salarial | `LoanPlayer` |

**Fencing.** Sagas e runtimes usam **lease + heartbeat + checkpoint** (não transação aberta) e **fencing token monotônico** (`runtimeEpoch`, `worldSequence`) para impedir dois executores de aplicarem o mesmo passo (Decisão 19.10; backlog §8 "fencing token"). Detalhe fino → passo 10.

### 6.4 Resumo de decisão transacional

```
1 agregado, sem espera externa ........... transação local (§6.1)
N linhas do MESMO contexto, atômico ...... transação local multi-linha (§6.2)
N contextos e/ou espera etapa futura ..... SAGA + compensação, sem 2PC (§6.3)
efeito colateral entre contextos ......... Outbox → evento → consumidor idempotente
```

---

## 7. Rastreabilidade e pendências

### 7.1 O que este documento fecha (de B-02)

| Entregável B-02 | Onde | Status |
|---|---|---|
| Context map canônico | §2 (12 contextos + 3 concerns) | BASELINE RATIFICADA |
| Aggregate roots | §3 (tabelas por área) | BASELINE RATIFICADA (derivado do schema/commands) |
| Ownership de escrita | §3 ("Escrito por" único) + §1 regra 1 | BASELINE RATIFICADA |
| Dependências + quebra de ciclos | §4 (DAG + 8 quebras Q1–Q8) | BASELINE RATIFICADA |
| Eventos públicos | §5 (produtor→consumidores + registry) | BASELINE RATIFICADA |
| Fronteiras transacionais | §6 (3 níveis + 5 sagas) | BASELINE RATIFICADA |

### 7.2 Reconciliações com a auditoria (backlog §7/§8)

- **"Jogador ↔ contrato" (3 vínculos):** resolvido por **Q5** — `PlayerContract` é a fonte autoritativa; `SquadMembership`/`Player.currentClubId` são projeções.
- **"IA ↔ regras" (sem garantia de mesmos commands):** resolvido por **Q6** — IA é cliente do barramento de commands.
- **"Partida ↔ narrativa" (`effectsJson` com autoridade):** resolvido por **Q7** — narrativa read-only.
- **"Finalização excessivamente atômica":** resolvido por §6.2 (refinamento BASELINE RATIFICADA — transação restrita a C8 + fan-out).
- **"Cartão ↔ suspensão" (lifecycle disciplinar sem dono):** **BASELINE RATIFICADA** — disciplina é consolidada por **C7** ao consumir `MatchFinished`/`CardIssued` (dono do lifecycle de suspensão = Competição).
- **"Base ↔ população" (dois geradores):** **BASELINE RATIFICADA** — geração de safra e equação demográfica são passos ordenados de **SAGA-02** sob C4/C2, com precedência do controlador populacional (fecha na ratificação de B-04).

### 7.3 Depende de ratificação externa

- **B-01** (baseline R-02…R-100) — fechado pelo ato de ratificação de 2026-07-13; este blueprint é parte da baseline.
- **R-148** (este documento) — ratificar as decisões BASELINE RATIFICADA (fronteiras ambíguas de §2.1, quebras Q1–Q8, refinamento da finalização).
- **B-03/B-04/B-05** — calendário/temporada, economia/demografia e motor de partida fecham detalhes que as sagas SAGA-02/SAGA-01 e a finalização (§6.2) referenciam.
- **Passo 10** — estados/timeouts/compensações/authority finos de cada saga (§6.3).

### 7.4 Documentos relacionados

- Arquitetura geral e bounded contexts — [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md)
- Dados, FK composta e transações — [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md)
- Runtime ECS (motor interno dos contextos de simulação) — [`./07-arquitetura-do-core-ecs.md`](./07-arquitetura-do-core-ecs.md)
- Catálogo de commands e eventos emitidos — [`./10-catalogo-de-commands.md`](./10-catalogo-de-commands.md)
- Glossário conceitual de entidades — [`../01-game-design/16-glossario-de-entidades.md`](../01-game-design/16-glossario-de-entidades.md)
- Backlog/auditoria (B-02, §7 mapa inferido) — [`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md)
</content>
</invoke>
