# Rastreabilidade UX ↔ API e Specs de Fluxos Críticos

> **Status:** CANÔNICO (auditoria de prontidão — passos 11 e 12) · **Fontes reconciliadas:** [`02-mobile-fluxos.md`](02-mobile-fluxos.md) (MF-00…MF-25), telas [`03`](03-mobile-telas-onboarding-e-conta.md)–[`13`](13-mobile-complementos-social-mundo-e-adendos.md), [`../02-tecnico/10-catalogo-de-commands.md`](../02-tecnico/10-catalogo-de-commands.md) (payloads/errorCodes/eventos), [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md) (§4 eventos, §5 invariantes), [`../02-tecnico/14-maquinas-de-estado.md`](../02-tecnico/14-maquinas-de-estado.md) (transições), [`../02-tecnico/12-context-map-e-blueprint.md`](../02-tecnico/12-context-map-e-blueprint.md) (§6 sagas), [`../02-tecnico/08-frontend-cliente-e-tempo-real.md`](../02-tecnico/08-frontend-cliente-e-tempo-real.md) (envelope, errorCodes, WS), [`00-visao-geral-e-design-system.md`](00-visao-geral-e-design-system.md) (§5/§8/§9) · **Revisão:** 2026-07-12

Este documento **fecha os passos 11 e 12** da auditoria de prontidão: (11) a **rastreabilidade UX↔API**, ligando **cada ação de tela** a **query · command · evento · estado/agregado · errorCodes · invariante**; e (12) as **specs de fluxos críticos** validáveis (onboarding, Central, partida ao vivo, negociação, finanças, estrutura, virada de temporada). Ele **não introduz** commands, eventos, estados, errorCodes ou invariantes novos — **cruza** os catálogos já consolidados. Onde um valor de balanceamento ainda depende da **Série R** ([registro de decisões §6](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)), a célula é marcada **BASELINE RATIFICADA — R-##**.

## Sumário

1. [Convenções e como ler](#1-convenções-e-como-ler)
2. [Matriz de rastreabilidade](#2-matriz-de-rastreabilidade)
   - [2.1 Onboarding e vínculo de clube (MF-01/MF-03)](#21-onboarding-e-vínculo-de-clube-mf-01mf-03)
   - [2.2 Central e ciclo semanal (MF-05)](#22-central-e-ciclo-semanal-mf-05)
   - [2.3 Partida (MF-07)](#23-partida-mf-07)
   - [2.4 Mercado, contratos e base (MF-08/09/10/11/20)](#24-mercado-contratos-e-base-mf-08091120)
   - [2.5 Finanças e diretoria (MF-13/16)](#25-finanças-e-diretoria-mf-1316)
   - [2.6 Estrutura e estádio (MF-14/23)](#26-estrutura-e-estádio-mf-1423)
   - [2.7 Comunicação, medicina, loja e suporte (MF-12/18/19/24/25)](#27-comunicação-medicina-loja-e-suporte-mf-1218192425)
3. [Specs de fluxos críticos](#3-specs-de-fluxos-críticos)
   - [3.1 MF-01 — Onboarding (SAGA-03)](#31-mf-01--onboarding-saga-03)
   - [3.2 MF-05 — Central / ciclo semanal](#32-mf-05--central--ciclo-semanal)
   - [3.3 MF-07 — Partida ao vivo](#33-mf-07--partida-ao-vivo)
   - [3.4 MF-08 — Negociação (SAGA-01)](#34-mf-08--negociação-saga-01)
   - [3.5 MF-13 — Ciclo financeiro](#35-mf-13--ciclo-financeiro)
   - [3.6 MF-14 — Projeto de estrutura (SAGA-04)](#36-mf-14--projeto-de-estrutura-saga-04)
   - [3.7 MF-06 — Encerramento / virada (SAGA-02)](#37-mf-06--encerramento--virada-saga-02)
4. [Contrato de erro por fluxo](#4-contrato-de-erro-por-fluxo)
5. [Cobertura e pendências](#5-cobertura-e-pendências)

---

## 1. Convenções e como ler

- **Ação de tela** — o par `M-* · gesto do usuário` que emite um **command** (ou uma **leitura** que alimenta a tela). Identificadores de tela seguem o [sitemap](01-navegacao-e-arquitetura-de-informacao.md#4-sitemap-completo--mobile); commands seguem o [catálogo](../02-tecnico/10-catalogo-de-commands.md).
- **Query (leitura)** — a consulta REST que alimenta a tela **antes** da ação. Não muta estado, logo **não** emite evento nem toca invariante de escrita. Como ainda **não há catálogo formal de queries**, os nomes abaixo são **lógicos/derivados** das telas 03–13 e resolvem para os recursos REST `/api/v1/...` do [doc 08](../02-tecnico/08-frontend-cliente-e-tempo-real.md#rotas) (ex.: `GetSquad` → `GET /api/v1/clubs/{id}/squad`). A promoção a um catálogo próprio fica registrada em [§5](#5-cobertura-e-pendências).
- **Command** — `commandType` VerbNoun (envelope genérico: `commandId`, `idempotencyKey`, `expectedVersion`, `gameWorldId`, `clubId`, `payload`, `clientTimestamp`, `clientVersion` — [doc 08](../02-tecnico/08-frontend-cliente-e-tempo-real.md#contrato-de-command-http)). Selo de risco entre parênteses.
- **Evento(s)** — `DomainEvent` no passado emitido no sucesso, publicado no stream WS pela `worldSequence`/`clubSequence`/`matchSequence` aplicável ([doc 05 §4](../02-tecnico/05-catalogo-de-regras-e-formulas.md#4-eventos-de-domínio)).
- **Estado/agregado** — aggregate root sob lock + `expectedVersion`, e a **transição de máquina** afetada quando existe ([doc 14](../02-tecnico/14-maquinas-de-estado.md)).
- **errorCodes** — códigos **estáveis** específicos do command (os **comuns** — `WORLD_READ_ONLY`, `FORBIDDEN_NOT_CONTROLLER`, `AGGREGATE_VERSION_CONFLICT`, `IDEMPOTENCY_KEY_REUSED`, `VALIDATION_FAILED`, `COMMAND_CONTRACT_INCOMPATIBLE` — valem para **todos** e não se repetem por linha).
- **Invariante(s)** — o `INV-##` que a ação protege ([doc 05 §5](../02-tecnico/05-catalogo-de-regras-e-formulas.md#5-invariantes)).
- **`✔`** = command referenciado explicitamente nos fluxos MF-*; os demais derivam das ações documentadas.

---

## 2. Matriz de rastreabilidade

### 2.1 Onboarding e vínculo de clube (MF-01/MF-03)

| # | Ação de tela | Query (leitura) | Command | Evento(s) | Estado/agregado · transição | errorCodes possíveis | Invariante(s) |
|---|--------------|-----------------|---------|-----------|-----------------------------|----------------------|---------------|
| 1 | `M-WORLD-PICK` — escolher mundo/liga | `GetAvailableWorlds`, `GetEntryEligibility` | — (seleção; sem mutação) | — | `WorldEntryProcess` (leitura) | — | INV-19 (elegibilidade) |
| 2 | `M-SLOT-RESERVE` — reservar vaga | `GetClubPreview`, `GetInitialStake` | `ReserveClubSlot` ✔ (médio) | `ClubSlotReserved`, `ClubEntryReservationOpened`; criação: `ClubExpansionRequested` | `WorldEntryProcess` · abre reserva TTL **(BASELINE RATIFICADA — R-25)** | `CLUB_SLOT_UNAVAILABLE`, `ENTRY_ELIGIBILITY_DENIED`, `ACCOUNT_COOLDOWN_ACTIVE`, `RELATED_ACCOUNT_BLOCKED`, `CLUB_ALREADY_CONTROLLED`, `WORLD_ENTRY_QUOTA_EXCEEDED` | INV-19 |
| 3 | `M-CLUB-CREATE`+`M-REGION-PICK` — criar clube (ramo) | `GetRegions`, `GetExpansionRules` | `CreateClub` (médio) | `ClubCreated`, `ExpansionClubConfigured` | `ClubExpansionProject` | `CLUB_SLUG_TAKEN`, `EXPANSION_LEAGUE_CLOSED`, `INVALID_REGION` | INV-22 |
| 4 | `M-CONTROL-ACTIVATE` — ativar controle | `GetReservation` | `ActivateClubControl` ✔ (alto · `HighRiskConfirm`) | `ClubControlActivated`, `ClubOnboardingStarted`; novo: `ClubCreated` | `ClubControl` · onboarding (SAGA-03) | `CLUB_SLOT_RESERVATION_EXPIRED`, `CLUB_ALREADY_CONTROLLED`, `CONTROL_ACTIVATION_WINDOW_INVALID`, `TAKEOVER_REVIEW_REQUIRED` | INV-19 |
| 5 | `M-ONBOARD-REVIEW` — plano offline inicial | `GetOnboardingReview`, `GetAuthorityLimits` | `SetOfflinePlan` (médio) | `OfflinePlanSet` | `ClubAIProfile` | `OFFLINE_PLAN_INVALID`, `AUTHORITY_LIMIT_EXCEEDED` | INV-17 |
| 6 | `M-CLUB-LEAVE` — abandonar/trocar clube | `GetLeaveAudit`, `GetClubState` | `LeaveClub` ✔ (alto · `HighRiskConfirm`) | `ClubLeft`, `ClubControlEnded`, `AiControlAssumed`, `AccountCooldownStarted` | `ClubControl` · encerra controle | `LEAVE_BLOCKED_ASSET_STRIPPING`, `ANTI_ABUSE_QUARANTINE` (cooldown **BASELINE RATIFICADA — R-26**) | INV-19 |

### 2.2 Central e ciclo semanal (MF-05)

| # | Ação de tela | Query (leitura) | Command | Evento(s) | Estado/agregado · transição | errorCodes possíveis | Invariante(s) |
|---|--------------|-----------------|---------|-----------|-----------------------------|----------------------|---------------|
| 7 | `M-HOME` — abrir Central | `GetClubDashboard`, `GetPendingDecisions`, `GetAgenda` | — (leitura) | — | projeções (leitura) | — | INV-35 (read-only) |
| 8 | `M-DECISIONS` — responder diretoria | `GetBoardMessage` | `RespondToBoard` (baixo) | `BoardResponded`, `BoardPromiseMade` | `BoardPromise`/`ClubCommunication` · resposta única | `BOARD_MESSAGE_NOT_FOUND`, `BOARD_RESPONSE_INVALID`, `RESPONSE_WINDOW_CLOSED` | INV-32 |
| 9 | `M-TRAINING` — ajustar treino | `GetTrainingPlan`, `GetSquadCondition` | `SetTrainingPlan` ✔ (baixo) | `TrainingPlanSet`, `TrainingPlayerEntryUpdated` | `TrainingPlan` · `expectedVersion` | `TRAINING_PLAN_INVALID`, `PLAYER_NOT_IN_SQUAD`, `PLAYER_UNDER_MEDICAL_RESTRICTION` | INV-30/31 |
| 10 | `M-TACTICS` — definir tática padrão | `GetTactics`, `GetSquad` | `SetTactics` ✔ (baixo) | `TacticsSet` | `MatchTacticalPlan`/plano padrão · `expectedVersion` | `INVALID_FORMATION`, `PLAYER_NOT_IN_SQUAD`, `LINEUP_LOCKED` | INV-31 |
| 11 | `M-AUTOMATIONS`/`M-AUTOMATION-EDIT` — delegar | `GetAutomations`, `GetAutomationRule` | `SaveAutomation` / `ToggleAutomation` ✔ (médio) | `AutomationSaved` (nova versão) / `AutomationToggled` | `AutomationRule` · `expectedVersion` | `AUTOMATION_RULE_INVALID`, `AUTOMATION_HIGH_RISK_NOT_DELEGABLE`, `AUTOMATION_CONFLICT`, `AUTOMATION_RULE_NOT_FOUND` | INV-17 |
| 12 | `M-GAMEPLAN` — política offline da partida | `GetGamePlan`, `GetBench` | `SetGamePlan` (médio) | `GamePlanSet` | `MatchTacticalPlan`/`MatchRuntimeLease` · antes do lock | `GAME_PLAN_INVALID`, `AUTOMATION_HIGH_RISK_NOT_DELEGABLE`, `LINEUP_LOCKED` | INV-17 |

### 2.3 Partida (MF-07)

| # | Ação de tela | Query (leitura) | Command | Evento(s) | Estado/agregado · transição | errorCodes possíveis | Invariante(s) |
|---|--------------|-----------------|---------|-----------|-----------------------------|----------------------|---------------|
| 13 | `M-SCOUT-OPP`/`M-PREMATCH` — dossiê | `GetOpponentDossier` (estimativa), `GetRefereeReading` | — (leitura) | — | leitura | — | — |
| 14 | `M-LINEUP` — confirmar escalação | `GetSquad`, `GetEligibility` | `SetLineup` ✔ (baixo) | `LineupSet`; junto de `SetTactics`: `LineupsLocked` | `MatchLineup` · MR-1 `SCHEDULED→PRE_MATCH` | `LINEUP_INVALID`, `LINEUP_LOCKED`, `PLAYER_INELIGIBLE_FOR_MATCH`, `PLAYER_ALREADY_REGISTERED` (camisa), `SQUAD_SIZE_LIMIT_EXCEEDED` | INV-25 |
| 15 | `M-LIVE` — ação rápida (submenu) | `GetLiveState` (feed `matchSequence`) | `IssueMatchCommand` (baixo) | `MatchCommandIssued` (`TACTIC_CHANGED`/`MOMENTUM_CHANGED`) | `MatchRuntime` · janela; ordena por `matchSequence` | `MATCH_COMMAND_WINDOW_CLOSED`, `MATCH_NOT_LIVE` (janela **BASELINE RATIFICADA — R-29**) | INV-20 |
| 16 | `M-LIVE` — substituição | `GetBench`, `GetSubsRemaining` | `MakeSubstitution` (baixo) | `SubstitutionMade` (`SUBSTITUTION_MADE`) | `MatchRuntime` | `SUBSTITUTIONS_EXHAUSTED` (máx **BASELINE RATIFICADA — R-29**), `PLAYER_NOT_ON_BENCH`, `PLAYER_NOT_ON_PITCH`, `MATCH_COMMAND_WINDOW_CLOSED` | INV-20 |
| 17 | `M-DECISION-POINT` — resolver ponto | `GetDecisionPoint` | `ResolveDecisionPoint` (baixo) | `DecisionPointResolved` (`DECISION_POINT_RESOLVED`) | `MatchDecisionPoint`/`MatchRuntime` · MR-4 `PAUSED_FOR_DECISION→LIVE` | `DECISION_POINT_NOT_OPEN`, `DECISION_POINT_ALREADY_RESOLVED`, `MATCH_COMMAND_WINDOW_CLOSED` | INV-2, INV-20 |
| 18 | `M-LIVE` — decisão genérica | `GetLiveState` | `SubmitMatchDecision` (baixo) | conforme `decisionKind` (`TacticsSet`/`SubstitutionMade`/`DecisionPointResolved`) | `MatchRuntime` · `matchSequence` (sem `expectedVersion`) | `MATCH_COMMAND_WINDOW_CLOSED`, `MATCH_NOT_LIVE`, `DECISION_POINT_NOT_OPEN` | INV-20 |
| 19 | `M-POSTMATCH` — relatório | `GetMatchReport`, `GetPlayerRatings` | — (leitura; consequências vêm de `MatchFinished`) | — | leitura de `MatchResult` | — | INV-5 |

### 2.4 Mercado, contratos e base (MF-08/09/11/20)

| # | Ação de tela | Query (leitura) | Command | Evento(s) | Estado/agregado · transição | errorCodes possíveis | Invariante(s) |
|---|--------------|-----------------|---------|-----------|-----------------------------|----------------------|---------------|
| 20 | `M-SCOUTING` — criar missão | `GetScouts`, `GetScoutingBudget` | `StartScoutMission` (baixo) | `ScoutMissionStarted` | `ScoutingMission` · idempotente | `SCOUT_UNAVAILABLE`, `SCOUT_MISSION_LIMIT_EXCEEDED` (limite **BASELINE RATIFICADA — R-28**), `BUDGET_INSUFFICIENT` | — |
| 21 | `M-NEGOTIATION` — enviar proposta | `GetPlayer`, `GetTransferBudget` | `MakeTransferOffer` (médio) | `TransferOfferSent`, `FinancialReservationCreated` | `TransferCase` · T6-2 `→NEGOTIATING` | `TRANSFER_WINDOW_CLOSED`, `TRANSFER_BUDGET_UNAVAILABLE`, `PLAYER_NOT_AVAILABLE`, `OFFER_OUT_OF_PLAUSIBLE_RANGE` (faixa **BASELINE RATIFICADA — R-26**), `ANTI_ABUSE_QUARANTINE` | INV-10 |
| 22 | `M-NEGOTIATION` — contraproposta | `GetTransferCase` | `MakeCounterOffer` (médio) | `CounterOfferSent` (nova `TransferOfferVersion`) | `TransferCase` · `expectedVersion` | `TRANSFER_CASE_NOT_FOUND`, `OFFER_STATE_INVALID`, `OFFER_OUT_OF_PLAUSIBLE_RANGE`, `TRANSFER_BUDGET_UNAVAILABLE` | INV-23 |
| 23 | `M-NEGOTIATION` — aceitar/recusar | `GetTransferCase`, `GetOfferVersion` | `AcceptOffer` / `RejectOffer` (médio; aceitar titular: alto) | `OfferAccepted`+`TransferAgreementReached` (dispara SAGA-01) / `OfferRejected` | `TransferCase` · T6-3 `→ACCEPTED` | `OFFER_NOT_FOUND`, `OFFER_EXPIRED`, `OFFER_STATE_INVALID`, `PLAYER_REJECTED_TERMS` | INV-23 |
| 24 | `M-CONTRACT` — assinar transferência | `GetTransferAgreement`, `GetFinance` | `SignTransfer` ✔ (alto · `HighRiskConfirm`) | `TransferSigned`, `TransferCompleted`, `PlayerContractSigned`, `PaymentScheduled`, `PlayerClubHistoryOpened` | `TransferCase` · T6-4 `ACCEPTED→COMPLETED` | `TRANSFER_BUDGET_UNAVAILABLE`, `TRANSFER_WINDOW_CLOSED`, `TRANSFER_AGREEMENT_INVALID`, `MEDICAL_NOT_CLEARED`, `PLAYER_ALREADY_REGISTERED` | INV-12, INV-1, INV-26 |
| 25 | `M-CONTRACT`+`M-AGENT` — assinar vínculo (livre) | `GetPlayer`, `GetWageBudget` | `SignContract` ✔ (médio) | `ContractSigned` | `PlayerContract` · P4-6 `FREE_AGENT→ACTIVE` | `PLAYER_HAS_ACTIVE_CONTRACT`, `WAGE_BUDGET_EXCEEDED`, `CONTRACT_TERMS_INVALID`, `PLAYER_REJECTED_TERMS` | INV-1 |
| 26 | `M-CONTRACT` — renovar | `GetContract` (com `currentVersion`) | `RenewContract` ✔ (médio · `expectedVersion` obrigatório) | `ContractRenewed` | `PlayerContract` · `expectedVersion` | `CONTRACT_VERSION_CONFLICT`, `CONTRACT_NOT_RENEWABLE` (janela **BASELINE RATIFICADA — R-28**), `PLAYER_REJECTED_TERMS`, `WAGE_BUDGET_EXCEEDED` | INV-1, INV-31 |
| 27 | `M-MARKET` — listar/retirar | `GetPlayer`, `GetListings` | `ListPlayer` / `UnlistPlayer` (baixo) | `PlayerListed` / `PlayerUnlisted` | `TransferListing` · T6-1 `→LISTED` | `PLAYER_NOT_IN_SQUAD`, `PLAYER_ALREADY_LISTED`, `LISTING_NOT_FOUND`, `LISTING_HAS_ACTIVE_OFFERS` | — |
| 28 | `M-LOAN` — emprestar | `GetPlayer`, `GetDestinationClub` | `LoanPlayer` (médio) | `PlayerLoaned`, `PlayerLoanAgreementCreated` | `TransferCase`/`PlayerLoanAgreement` (SAGA-05) | `TRANSFER_WINDOW_CLOSED`, `LOAN_TERMS_INVALID`, `PLAYER_REJECTED_TERMS`, `PLAYER_ALREADY_REGISTERED` | INV-1 |
| 29 | `M-REGISTRATION` — inscrever | `GetRegistrationWindow`, `GetQuotas` | `RegisterPlayer` (médio) | `PlayerRegistered` | `CompetitionRegistration` · `expectedVersion` | `PLAYER_ALREADY_REGISTERED`, `REGISTRATION_WINDOW_CLOSED`, `REGISTRATION_QUOTA_EXCEEDED`, `PLAYER_NOT_ELIGIBLE`, `SHIRT_NUMBER_TAKEN` | INV-21, INV-26 |
| 30 | `M-PROMOTE` — promover jovem | `GetYouthReadiness`, `GetWageBudget` | `PromoteYouthPlayer` (médio) | `YouthPlayerPromoted`, `ContractSigned` | `Player` · P4B-2 `GENERATED_YOUTH→PROMOTED_PRO` | `YOUTH_PROMOTION_INVALID`, `YOUTH_NOT_READY`, `WAGE_BUDGET_EXCEEDED`, `SQUAD_SIZE_LIMIT_EXCEEDED` | INV-1, INV-37 |
| 31 | `M-CAREER-PLAN` — plano do jovem | `GetPlayerDevelopment`, `GetStaff` | `SetPlayerCareerPlan` (baixo) | `PlayerCareerPlanSet` | `Player`/`PlayerDevelopment` | `PLAYER_NOT_IN_SQUAD`, `INVALID_CAREER_PLAN` | INV-37 |
| 32 | `M-BUDGET` — estratégia de janela | `GetTransferBudget`, `GetTargets` | `SetTransferStrategy` (baixo) | `TransferStrategySet` | `Club`/`TransferStrategy` · `expectedVersion` | `INVALID_TRANSFER_STRATEGY`, `BUDGET_INSUFFICIENT` | INV-11 |

### 2.5 Finanças e diretoria (MF-13/16)

| # | Ação de tela | Query (leitura) | Command | Evento(s) | Estado/agregado · transição | errorCodes possíveis | Invariante(s) |
|---|--------------|-----------------|---------|-----------|-----------------------------|----------------------|---------------|
| 33 | `M-FINANCE`/`M-ACCOUNTING` — revisar caixa | `GetFinanceSnapshot`, `GetLedger`, `GetCashProjection` | — (leitura; folha vem de `WagesPaid`/`WorldDayAdvanced`) | — | leitura de `ClubFinanceSnapshot` | — | INV-8 |
| 34 | `M-BUDGET` — definir orçamento | `GetBudget`, `GetCashProjection` | `SetBudget` (médio) | `BudgetSet`, `BudgetRevisionCreated` | `Budget` · `expectedVersion` | `BUDGET_OVERALLOCATED`, `BUDGET_BELOW_COMMITTED` | INV-11 |
| 35 | `M-DEBT` — abrir crédito | `GetCreditCapacity`, `GetDebt` | `OpenCreditFacility` (alto · `HighRiskConfirm`) | `CreditFacilityOpened`, `ClubDebtCreated` | `CreditFacility` · idempotente | `CREDIT_LIMIT_EXCEEDED`, `BOARD_APPROVAL_REQUIRED`, `INSOLVENCY_RESTRICTION` | INV-3 |
| 36 | `M-FINANCE` — fechar patrocínio | `GetCommercialAssets`, `GetSponsors` | `SignCommercialDeal` (médio) | `CommercialDealSigned`, `SponsorshipAgreementCreated` | `SponsorshipAgreement` · idempotente | `COMMERCIAL_RIGHT_CONFLICT`, `COMMERCIAL_ASSET_NOT_FOUND`, `SPONSOR_NOT_FOUND` | INV-24 |
| 37 | `M-DEPARTMENT`/`M-STAFF` — contratar/dispensar | `GetStaffMarket`, `GetWageBudget` | `HireStaff` / `ReleaseStaff` (médio; dispensar: alto · `HighRiskConfirm`) | `StaffHired`, `StaffContractSigned` / `StaffReleased`, `StaffContractTerminated` | `StaffContract`/`StaffMember` · `expectedVersion` | `STAFF_ROLE_ALREADY_FILLED`, `STAFF_CONTRACT_ACTIVE`, `WAGE_BUDGET_EXCEEDED`, `STAFF_CONTRACT_NOT_FOUND` | INV-24 |
| 38 | `M-BOARD` — plano de recuperação | `GetBoardMessage`, `GetRecoveryPlan` | `RespondToBoard` (baixo) | `BoardResponded`, `BoardPromiseMade` | `BoardPromise` (crise: consome `FinancialCrisisRaised`) | `BOARD_MESSAGE_NOT_FOUND`, `BOARD_RESPONSE_INVALID`, `RESPONSE_WINDOW_CLOSED` | INV-32 |

### 2.6 Estrutura e estádio (MF-14/23)

| # | Ação de tela | Query (leitura) | Command | Evento(s) | Estado/agregado · transição | errorCodes possíveis | Invariante(s) |
|---|--------------|-----------------|---------|-----------|-----------------------------|----------------------|---------------|
| 39 | `M-STRUCTURE` — subir departamento | `GetDepartments`, `GetCash` | `UpgradeDepartment` (médio) | `DepartmentUpgradeStarted`, `FinancialReservationCreated` | `ClubDepartment` · `expectedVersion` | `DEPARTMENT_MAX_LEVEL`, `DEPARTMENT_UPGRADE_IN_PROGRESS`, `CASH_INSUFFICIENT`, `BUDGET_INSUFFICIENT` | INV-10 |
| 40 | `M-STADIUM`/`M-STADIUM-WORKS` — iniciar obra | `GetStadium`, `GetContractors`, `GetFeasibility` | `StartStadiumWorks` (alto · `HighRiskConfirm`) | `StadiumWorksStarted`, `ConstructionAgreementSigned`, `FinancialReservationCreated` | `InfrastructureProject` · idempotente (SAGA-04) | `STADIUM_WORKS_IN_PROGRESS`, `CASH_INSUFFICIENT`, `BUDGET_INSUFFICIENT`, `FACILITY_LICENSE_INVALID`, `CONTRACTOR_UNAVAILABLE` | INV-10 |
| 41 | `M-STADIUM` — preço de ingresso | `GetTicketPolicy`, `GetSectors` | `SetTicketPrices` (baixo) | `TicketPricesSet` | `TicketPricePolicy` · `expectedVersion` | `TICKET_PRICE_OUT_OF_BOUNDS` (limites **BASELINE RATIFICADA — R-27**), `INVALID_STADIUM_SECTOR` | — |
| 42 | `M-STADIUM` — agendar manutenção | `GetFacilities`, `GetMatchdayCalendar` | `ScheduleMaintenance` (baixo) | `MaintenanceScheduled` | `MaintenancePlan` · idempotente | `MAINTENANCE_CONFLICT`, `BUDGET_INSUFFICIENT` | — |

### 2.7 Comunicação, medicina, loja e suporte (MF-12/18/19/24/25)

| # | Ação de tela | Query (leitura) | Command | Evento(s) | Estado/agregado · transição | errorCodes possíveis | Invariante(s) |
|---|--------------|-----------------|---------|-----------|-----------------------------|----------------------|---------------|
| 43 | `M-MEDICAL-CASE` — escolher tratamento | `GetInjury`, `GetTreatmentOptions` | `SetMedicalPlan` (médio) | `MedicalPlanSet`, `RehabStageAdvanced` | `PlayerInjury` · MED-4/MED-5 (reabilitação) | `PLAYER_NOT_INJURED`, `MEDICAL_PLAN_INVALID`, `TREATMENT_NOT_RECOMMENDED` (`riscoMédico` **BASELINE RATIFICADA — R-48**) | INV-4 |
| 44 | `M-CONVO` — conversar com atleta | `GetPlayerMind`, `GetConversation` | `TalkToPlayer` (baixo) | `PlayerConversationHeld`, `PlayerPromiseMade` | `Player`/`NotificationThread` · passo único | `PLAYER_NOT_IN_SQUAD`, `INVALID_CONVERSATION_OPTION` (efeitos numéricos **BASELINE RATIFICADA — R-96**) | INV-17 |
| 45 | `M-PRESS` — responder imprensa | `GetPressQuestion` | `RespondToPress` (baixo) | `PressResponded`, `PublicPromiseMade` | `PressResponse` · resposta única | `PRESS_QUESTION_NOT_FOUND`, `INVALID_PRESS_STANCE`, `RESPONSE_WINDOW_CLOSED` | INV-18 |
| 46 | `M-PUBLIC-PROMISES` — prometer publicamente | `GetPromises` | `MakePublicPromise` (médio) | `PublicPromiseMade` | `PublicPromise` · idempotente | `PROMISE_NOT_VERIFIABLE`, `DUPLICATE_OPEN_PROMISE` | INV-18 |
| 47 | `M-STORE` — comprar item | `GetStoreCatalog` | `PurchaseStoreItem` (baixo) | `StoreItemPurchased` | conta/`WorldParticipant` · idempotente por `paymentReference` | `PAY_TO_WIN_ITEM_FORBIDDEN`, `PRODUCT_UNAVAILABLE`, `PAYMENT_FAILED` | INV-18 |
| 48 | `M-IDENTITY` — aplicar identidade | `GetIdentityAssets` | `ApplyClubIdentity` (baixo) | `ClubIdentityApplied`, `ClubIdentityPeriodOpened` | `Club`/`ClubIdentityPeriod` · `expectedVersion` | `IDENTITY_ASSET_LOCKED`, `IDENTITY_CHANGE_NOT_ALLOWED` | INV-22 |
| 49 | `M-SUPPORT` — recorrer de bloqueio (MF-24) | `GetBlockedAction` | `SubmitAppeal` (baixo) | `AppealSubmitted`, `SupportTicketOpened` | `SupportTicket`/`AdministrativeCorrection` · idempotente | `APPEAL_TARGET_NOT_FOUND`, `APPEAL_ALREADY_OPEN` | INV-34 |

> **Total: 49 ações mapeadas** (40 mutam estado via command; 9 são leituras que abrem a Central/partida/finanças e ancoram a projeção — incluídas porque um fluxo crítico começa nelas). Cobrem os commands `✔` dos MF-* e os derivados dos mesmos fluxos.

---

## 3. Specs de fluxos críticos

Cada spec traz: **pré-condições**, **sequência** (ação→command→evento→transição), **ramos de erro/exceção** (recusa, timeout, conflito de versão, offline) e **critérios de validação** (o que **provar** para dar o fluxo como pronto). As sagas seguem [context map §6.3](../02-tecnico/12-context-map-e-blueprint.md#63-saga--process-manager-multiagregado-multicontexto); os estados internos finos ficam no **passo 10**.

### 3.1 MF-01 — Onboarding (SAGA-03)

**Pré-condições.** Sessão válida (`M-SPLASH` carregou token; contrato de cliente compatível — senão `COMMAND_CONTRACT_INCOMPATIBLE`); mundo `ACTIVE` com vaga (`maxClubs`); ator **elegível** (sem cooldown, sem conta relacionada bloqueada, sem outro clube ativo no mundo — INV-19).

**Sequência.**
1. `M-WORLD-PICK` → **leitura** `GetAvailableWorlds`/`GetEntryEligibility`. Sem mutação.
2. `M-SLOT-RESERVE` → `ReserveClubSlot` → `ClubSlotReserved`+`ClubEntryReservationOpened` → `WorldEntryProcess` abre **reserva TTL (BASELINE RATIFICADA — R-25)**.
3. Ramo criar: `M-CLUB-CREATE`+`M-REGION-PICK` → `CreateClub` → `ClubCreated`+`ExpansionClubConfigured`.
4. `M-CONTROL-ACTIVATE` → `ActivateClubControl` (`HighRiskConfirm`) → `ClubControlActivated`+`ClubOnboardingStarted` → `ClubControl` ativo (M... índice único parcial "1 controle ativo por clube"). Clube "forte" → resposta `ACCEPTED` + tarefa de auditoria (`TAKEOVER_REVIEW_REQUIRED`), **não** `COMPLETED` imediato.
5. `M-ONBOARD-REVIEW` → `SetOfflinePlan` → `OfflinePlanSet`. Cai em `M-HOME` com a Central populada por pendências herdadas.

**Ramos de erro/exceção.**
- **Recusa/elegibilidade:** `ENTRY_ELIGIBILITY_DENIED`/`ACCOUNT_COOLDOWN_ACTIVE`/`RELATED_ACCOUNT_BLOCKED`/`CLUB_ALREADY_CONTROLLED` → Banner com motivo **geral** (sem revelar fórmula); volta a `M-WORLD-PICK`.
- **Timeout de reserva:** TTL expira antes de `ActivateClubControl` → `CLUB_SLOT_RESERVATION_EXPIRED`; a saga **libera a vaga** (compensação SAGA-03) e a UI reinicia do passo 2.
- **Conflito de versão:** `AGGREGATE_VERSION_CONFLICT` no `WorldEntryProcess`/`ClubControl` → recarrega com `currentVersion` e reenvia (raro: só o próprio ator opera o processo).
- **Offline:** durante o onboarding o command fica **enfileirado** com `idempotencyKey`; reenvio pós-reconexão **não** abre duas reservas nem dois controles (idempotência devolve a mesma reserva/controle).

**Critérios de validação.**
- Reenvio de `ReserveClubSlot`/`ActivateClubControl` com mesma `idempotencyKey` **não** cria segunda reserva nem segundo `ClubControl` (INV-19, INV-30).
- Reserva expirada libera a vaga a outro participante (SAGA-03 compensa) e o clube assumido preserva **todo** o estado herdado (dívidas/contratos/promessas).
- Clube forte entra em auditoria (`TAKEOVER_REVIEW_REQUIRED`) sem ativar controle antes da revisão.
- `M-HOME` abre com as pendências herdadas já como tarefas na Central.

### 3.2 MF-05 — Central / ciclo semanal

**Pré-condições.** Clube ativo controlado pelo ator; mundo `ACTIVE` (senão `WORLD_READ_ONLY`, INV-35); rodada **aberta** (não passou o lock — `RoundStatus`).

**Sequência.**
1. `M-HOME` → leituras `GetClubDashboard`/`GetPendingDecisions`/`GetAgenda` (as "6 perguntas").
2. `M-DECISIONS` → `RespondToBoard` → `BoardResponded`(+`BoardPromiseMade`).
3. `M-TRAINING` → `SetTrainingPlan` → `TrainingPlanSet`.
4. `M-MARKET`/`M-CONTRACT` → renovações/propostas (encadeia [MF-08](#34-mf-08--negociação-saga-01)/MF-20).
5. `M-NEXTMATCH`→`M-LINEUP`+`M-GAMEPLAN` → `SetLineup`/`SetGamePlan` (prepara [MF-07](#33-mf-07--partida-ao-vivo)).
6. `M-POSTMATCH`/`M-FEED` → leitura das consequências (`MatchFinished` fan-out).

**Ramos de erro/exceção.**
- **Recusa:** cada command devolve seu `errorCode` (ex.: `TRAINING_PLAN_INVALID`); Toast `danger` reverte o otimismo (§8).
- **Timeout de prazo:** card de decisão vencido aplica a **ação padrão** (IA offline) e o mundo segue ([MF-0B](02-mobile-fluxos.md#mf-0b--notificações-e-navegação-por-contexto)); a Central marca "resolvido automaticamente".
- **Conflito de versão:** `AGGREGATE_VERSION_CONFLICT` em `SetTrainingPlan`/`SetTactics` → "os dados mudaram", recarrega agregado, reenvia.
- **Offline:** telas mostram último cache (SQLite) marcado como possivelmente desatualizado; commands enfileirados; badge "offline" no `Header`.

**Critérios de validação.**
- Prazo perdido aplica a ação padrão sem punir a ausência (INV-17: IA emite os **mesmos** commands que o humano).
- `SetTrainingPlan`/`SetTactics` respeitam `expectedVersion` (conflito visível e recuperável).
- Nenhuma escrita passa após o lock da rodada (`LINEUP_LOCKED`/`MATCH_COMMAND_WINDOW_CLOSED`), sinalizado **antes** do bloqueio (§9 `RoundStatus`).

### 3.3 MF-07 — Partida ao vivo

**Pré-condições.** Escalação válida e **elegibilidade congelada** no `PRE_MATCH` (INV-25); `MatchRuntime` único ativo por partida (INV-20); ator autorizado a agir (online **ou** IA delegada — `MatchControlSource`).

**Sequência.**
1. `M-LINEUP`+`M-TACTICS` → `SetLineup`/`SetTactics` → `LineupsLocked` → MR-1 `SCHEDULED→PRE_MATCH`.
2. Kickoff (job) → MR-2 `PRE_MATCH→LIVE` → `MatchStarted`; `M-LIVE` consome o feed `matchSequence` (`MATCH_TICK`/`MATCH_EVENT`/…).
3. Ponto de decisão (F17 `decisionScore>70`) → MR-3 `LIVE→PAUSED_FOR_DECISION` → `DECISION_POINT_CREATED`.
4. `M-DECISION-POINT`/`M-LIVE` → `ResolveDecisionPoint`/`IssueMatchCommand`/`MakeSubstitution` → `DecisionPointResolved`/`MatchCommandIssued`/`SubstitutionMade` → MR-4 volta a `LIVE`.
5. Apito → MR-5 `LIVE→FINISHED` (`resultStatus PENDING→NORMAL`); MR-6 job → `PROCESSED`; `M-POSTMATCH` lê `MatchFinished`.

**Ramos de erro/exceção.**
- **Recusa:** `MATCH_NOT_LIVE`/`DECISION_POINT_NOT_OPEN`/`DECISION_POINT_ALREADY_RESOLVED`/`SUBSTITUTIONS_EXHAUSTED`/`PLAYER_NOT_ON_BENCH` → Toast `danger`; o feed reconcilia o estado real.
- **Timeout da janela:** usuário não responde dentro da janela **(BASELINE RATIFICADA — R-29)** → a **IA offline resolve** (plano pré-jogo) e o runtime volta a `LIVE` (a partida **nunca trava**, doc 14 §9); `M-DECISION-POINT` some.
- **Fora de janela:** command chega após a janela → `MATCH_COMMAND_WINDOW_CLOSED`.
- **Conflito de versão:** **não se aplica** — o runtime é ordenado por `matchSequence`, **sem** `expectedVersion`; `commandId` evita substituição/ação duplicada (INV-20/INV-30).
- **Offline/desconexão:** o motor continua no servidor; ao reconectar o app envia `lastKnownSequence` e recebe eventos perdidos/snapshot; `M-LIVE` mostra o **resumo estruturado do período offline**.

**Critérios de validação.**
- `PAUSED_FOR_DECISION` **sempre** retorna a `LIVE` (por `ResolveDecisionPoint` ou timeout); nunca move `WorldStatus` nem outra partida (doc 14 §9).
- `FINISHED`/`PROCESSED` jamais voltam a `LIVE` (INV-2).
- Reenvio de `MakeSubstitution`/`ResolveDecisionPoint` com mesmo `commandId` não duplica o efeito (INV-30).
- Desconexão durante a partida não perde o resultado oficial; a ressync restaura a UI (doc 08).

### 3.4 MF-08 — Negociação (SAGA-01)

**Pré-condições.** Janela de transferência **aberta**; jogador disponível/negociável; oferta na **faixa plausível (BASELINE RATIFICADA — R-26)**; orçamento comporta → cria `FinancialReservation` (INV-10, evita comprometer o mesmo orçamento duas vezes).

**Sequência.**
1. `M-SCOUTING` → `StartScoutMission` → `ScoutMissionStarted` (opcional).
2. `M-NEGOTIATION` → `MakeTransferOffer` → `TransferOfferSent`+`FinancialReservationCreated` → T6-2 `→NEGOTIATING`.
3. Vaivém: `MakeCounterOffer` → `CounterOfferSent` (nova `TransferOfferVersion`, nunca sobrescreve — INV-23).
4. `AcceptOffer` → `OfferAccepted`+`TransferAgreementReached` → T6-3 `→ACCEPTED` → **dispara SAGA-01** (reservar→exame→contrato→registrar→liquidar→concluir).
5. `M-CONTRACT` → `SignTransfer` (`HighRiskConfirm`) → `TransferSigned`+`TransferCompleted`+`PlayerContractSigned`+`PaymentScheduled` → T6-4 `ACCEPTED→COMPLETED`. Inscrição via `RegisterPlayer` quando o regulamento permitir.

**Ramos de erro/exceção.**
- **Recusa:** `PLAYER_REJECTED_TERMS` (não é falha técnica — reabre `NEGOTIATING`); `TRANSFER_BUDGET_UNAVAILABLE`/`PLAYER_NOT_AVAILABLE` → Banner com sugestão; `OFFER_OUT_OF_PLAUSIBLE_RANGE`/`ANTI_ABUSE_QUARANTINE` → bloqueio antiabuso com opção de recorrer (MF-24).
- **Timeout:** oferta expira (`OFFER_EXPIRED`) / janela fecha (`TRANSFER_WINDOW_CLOSED`) → T6-7 `→EXPIRED`; a saga **libera a reserva** (compensação).
- **Conflito de versão:** `AGGREGATE_VERSION_CONFLICT`/`OFFER_STATE_INVALID` no `TransferCase` (a versão do case muda a cada rodada — INV-23) → recarrega e responde à oferta corrente; evita cruzar contrapropostas.
- **Exame médico (server-side, C-07):** `medicalCleared` **não** vem do cliente; achado médico pode `→CANCELLED` (`MEDICAL_NOT_CLEARED`, T6-8) ou reabrir `→NEGOTIATING` (T6-9) — `riscoMédico` **(BASELINE RATIFICADA — R-48)**.
- **Offline:** `MakeTransferOffer`/`SignTransfer` enfileirados; `commandId` garante **pagamento único** (INV-12) no reenvio.

**Critérios de validação.**
- `SignTransfer` liquida **uma única vez** por acordo mesmo com reenvio (INV-12, `TRANSFER_PAYMENT_NOT_DUPLICATED`).
- Falha em qualquer passo da SAGA-01 **compensa** (libera `FinancialReservation`, cancela acordo pendente, reverte inscrição) — etapas não somem silenciosamente.
- Liberação médica é **server-side** (`MedicallyCleared`); um só caminho cria vínculo (`SignTransfer` conclui; `SignContract` cobre o livre) — sem contrato duplicado (INV-1).
- `COMPLETED` custa imediatamente, mas elegibilidade só é congelada no `PRE_MATCH` (INV-26: contratar ≠ poder jogar).

### 3.5 MF-13 — Ciclo financeiro

**Pré-condições.** Virada de mês (`WorldDayAdvanced` reconhece receitas/obrigações por competência); ator controla o clube; nenhuma alteração restritiva desfinancia reserva ativa (INV-11).

**Sequência.**
1. `M-FINANCE`/`M-ACCOUNTING` → leituras `GetFinanceSnapshot`/`GetLedger`/`GetCashProjection` (folha/juros já lançados por `WagesPaid`/`LedgerEntryPosted`).
2. `M-BUDGET` → `SetBudget` → `BudgetSet`+`BudgetRevisionCreated`.
3. `M-BOARD` (se a diretoria exige correção) → `RespondToBoard` → `BoardResponded`(+`BoardPromiseMade`).
4. Ajustes: `M-DEBT` → `OpenCreditFacility` (`HighRiskConfirm`); `M-FINANCE` → `SignCommercialDeal`; `M-STAFF` → `HireStaff`/`ReleaseStaff`; ou vendas ([MF-09](02-mobile-fluxos.md#mf-09--venda-de-jogador)).

**Ramos de erro/exceção.**
- **Recusa:** `BUDGET_OVERALLOCATED`/`BUDGET_BELOW_COMMITTED` (orçamento < comprometido, INV-11); `CREDIT_LIMIT_EXCEEDED`/`INSOLVENCY_RESTRICTION`; `BOARD_APPROVAL_REQUIRED` → abre `M-BOARD`.
- **Timeout:** prazo da diretoria/plano de recuperação vence → aplica medida padrão; ruptura projetada encadeia [MF-16](02-mobile-fluxos.md#mf-16--crise-financeira) (gastos discricionários **congelados**).
- **Conflito de versão:** `AGGREGATE_VERSION_CONFLICT` no `Budget` → recarrega snapshot e reenvia.
- **Offline:** só leitura (cache marcado desatualizado); `SetBudget`/`OpenCreditFacility` enfileirados; caixa oficial revalida no reenvio (o saldo exibido nunca é a verdade — doc 08).

**Critérios de validação.**
- Saldo é **derivado do ledger** (`saldo = Σ lançamentos`), sem campo de caixa editável (INV-8); toda correção é **novo** lançamento (INV-13).
- `SetBudget` nunca desfinancia reserva ativa (INV-11); `OpenCreditFacility` idempotente não abre crédito duplo.
- Money homogêneo por `currencyId` (INV-9); reconhecimento por competência (ECO-014) separado do pagamento.

### 3.6 MF-14 — Projeto de estrutura (SAGA-04)

**Pré-condições.** Estudo de viabilidade aprovado; sem obra conflitante no mesmo ativo; financiamento aprovado e caixa/crédito cobre → cria `FinancialReservation` (INV-10).

**Sequência.**
1. `M-STRUCTURE`/`M-STADIUM` → leituras `GetDepartments`/`GetStadium`/`GetFeasibility`.
2. Departamento: `M-STRUCTURE` → `UpgradeDepartment` → `DepartmentUpgradeStarted`+`FinancialReservationCreated`. Conclusão (job) → `DepartmentUpgradeCompleted`.
3. Obra: `M-STADIUM-WORKS` → `StartStadiumWorks` (`HighRiskConfirm`) → `StadiumWorksStarted`+`ConstructionAgreementSigned`+`FinancialReservationCreated` → **SAGA-04** (viabilidade→financiar→progresso→conclusão). Conclusão → `StadiumWorksCompleted`.
4. `M-STADIUM` → `SetTicketPrices`/`ScheduleMaintenance`; licenciamento acompanhado (`M-LICENSING`).

**Ramos de erro/exceção.**
- **Recusa:** `DEPARTMENT_MAX_LEVEL`/`DEPARTMENT_UPGRADE_IN_PROGRESS`; `STADIUM_WORKS_IN_PROGRESS`/`CONTRACTOR_UNAVAILABLE`/`FACILITY_LICENSE_INVALID`; `CASH_INSUFFICIENT`/`BUDGET_INSUFFICIENT`; `TICKET_PRICE_OUT_OF_BOUNDS` **(BASELINE RATIFICADA — R-27)**; `MAINTENANCE_CONFLICT` (choca com partida com mando).
- **Timeout:** obra atrasa marcos → `M-STADIUM-WORKS` mostra atraso/custo; instalações alternativas durante o período; a saga permanece `RUNNING`/`WAITING`.
- **Conflito de versão:** `AGGREGATE_VERSION_CONFLICT` no `ClubDepartment` → recarrega e reenvia; `StartStadiumWorks` é idempotente por `idempotencyKey` (não abre duas obras).
- **Offline:** commands enfileirados; a reserva só se materializa quando o servidor confirma caixa/crédito.

**Critérios de validação.**
- Reserva impede comprometer o mesmo orçamento duas vezes (INV-10); conclusão da obra **baixa a reserva** (`DepartmentUpgradeCompleted`/`StadiumWorksCompleted` → C9).
- Falha na SAGA-04 **compensa** (libera reserva/crédito, cancela projeto).
- Nenhuma obra concorrente no mesmo ativo (`*_IN_PROGRESS`).

### 3.7 MF-06 — Encerramento / virada (SAGA-02)

**Pré-condições.** Temporada em `FINALIZING` (última rodada disputada, S2-3); **todas** as competições relevantes prontas para homologação; disparo pelo job `season:check-start-end`/`SeasonDue` (não é command do jogador).

**Sequência.** `M-SEASON-CLOSE` é um **wizard de revisão** que espelha o motor de virada (checklist de ~20 passos), dirigido pela **SAGA-02** (`REQUESTED→PREPARING→VALIDATING→FREEZING_INPUTS→CALCULATING→APPLYING_RESULTS→VERIFYING→COMPLETED`), cruzando C2/C7/C9/C4/C3:
1. Homologação provisório→oficial (HS-1→HS-2 `PROVISIONAL→HOMOLOGATED`) → `CompetitionEditionHomologated`/`QualificationDetermined`; S2-4 `FINALIZING→OFF_SEASON` → `SeasonSportingClosed`.
2. `M-AWARDS` (premiação), avaliação de diretoria/torcida, evolução/regressão, aposentadorias, **transição contratual escalonada** (CMP-016 — cada vínculo vira no seu marco, encadeia `RenewContract`), mercado, finanças, base.
3. S2-5 `OFF_SEASON→COMPLETED` → `SeasonCompleted`/`SeasonRolledOver`; `M-HISTORY` registra legado; briefing encadeia [MF-04](02-mobile-fluxos.md#mf-04--início-de-temporada--pré-temporada).

**Ações do jogador durante a virada** são **read-mostly** (revisão/reconhecimento) mais os commands já catalogados que a virada dispara em telas próprias: `RespondToBoard` (avaliação da diretoria), `RenewContract` (transição contratual). Na **ausência**, a IA processa com **limites de autoridade** (não vender jogador-chave, não assumir grande dívida, não alterar identidade — INV-17), preservando o estratégico.

**Ramos de erro/exceção.**
- **Recusa/guarda:** homologação com pendências não fecha (CMP-013); acesso/rebaixamento é **gate condicional** (licença/recurso/decisão administrativa — pode ganhar em campo e não ser confirmado).
- **Timeout:** manutenção/indisponibilidade durante a virada **congela prazos** (`FreezeDeadlines`) para não punir; a saga aguarda (`WAITING`).
- **Conflito/falha:** falha em S2-4/S2-5 **não** conclui a temporada; a SAGA-02 entra em `COMPENSATING`/`MANUAL_REVIEW` e **retoma do checkpoint** (idempotência: não duplica promoção/prêmio/geração).
- **Offline:** o usuário volta por [MF-02](02-mobile-fluxos.md#mf-02--retorno-após-ausência-longa) a um resumo do que a virada aplicou; nenhum prazo perdido pune (relógio do mundo é do servidor).

**Critérios de validação.**
- **Homologar antes de pagar/registrar** (INV-33, C-10): registro histórico e premiação só após `HOMOLOGATED`.
- Retomada de checkpoint **não duplica** promoção/prêmio/geração (INV-30/INV-31, fencing token).
- Continuidade sazonal: lesões/tratamentos **atravessam** a virada sem reiniciar (doc 14 §3.5/§6).
- Progressão de atributo aplicada **uma única vez** (INV-29, passo 7 da virada).
- Linha da temporada é **linear sem retorno** (`PLANNED→ACTIVE→FINISHED→ARCHIVED`, INV-32).

---

## 4. Contrato de erro por fluxo

Mapa **errorCode → reação da UI**, reusando os **estados globais** ([§5](00-visao-geral-e-design-system.md#5-estados-globais-de-tela)), o **contrato de command** ([§8](00-visao-geral-e-design-system.md#8-contratos-de-command-na-ótica-da-ui)) e o **tempo real** ([§9](00-visao-geral-e-design-system.md#9-tempo-real-na-ótica-da-ui)). A UI **traduz o `errorCode`**, nunca a mensagem do servidor (§7 i18n). `retryable`/`currentVersion`/`fieldErrors` vêm do [Erro padronizado](../02-tecnico/08-frontend-cliente-e-tempo-real.md#erro-padronizado).

| Classe | errorCodes (exemplos) | Estado (§5) | Reação da UI | Retry |
|--------|-----------------------|-------------|--------------|-------|
| **Conflito de versão** | `AGGREGATE_VERSION_CONFLICT`, `CONTRACT_VERSION_CONFLICT` (status `CONFLICT`) | Otimista **revertido** | Banner "os dados mudaram"; recarrega o agregado com `currentVersion`; reaplica a intenção | **Sim**, após reload (mesma `idempotencyKey`) |
| **Janela fechada / lock** | `MATCH_COMMAND_WINDOW_CLOSED`, `TRANSFER_WINDOW_CLOSED`, `REGISTRATION_WINDOW_CLOSED`, `RESPONSE_WINDOW_CLOSED`, `LINEUP_LOCKED` | Sem-permissão/delegado | Ação **desabilitada** com motivo + `Countdown`/`RoundStatus`; sinalizada **antes** do bloqueio (§9) | **Não** até nova janela (`retryable=false`) |
| **Orçamento / caixa** | `TRANSFER_BUDGET_UNAVAILABLE`, `CASH_INSUFFICIENT`, `BUDGET_INSUFFICIENT`, `WAGE_BUDGET_EXCEEDED`, `CREDIT_LIMIT_EXCEEDED`, `BUDGET_OVERALLOCATED`, `BUDGET_BELOW_COMMITTED` | Erro (Banner) | Banner com o limite e **sugestão** (vender/renegociar/reduzir); abre `M-FINANCE`/`M-DEBT` | **Não** sem mudar a entrada |
| **Elegibilidade / validação** | `LINEUP_INVALID`, `PLAYER_INELIGIBLE_FOR_MATCH`, `PLAYER_ALREADY_REGISTERED`, `SHIRT_NUMBER_TAKEN`, `REGISTRATION_QUOTA_EXCEEDED`, `VALIDATION_FAILED`, `*_INVALID` | Erro inline | `fieldErrors` por campo no formulário; corrige a seleção antes de reenviar | **Sim**, após corrigir |
| **Antiabuso / faixa** | `ANTI_ABUSE_QUARANTINE`, `OFFER_OUT_OF_PLAUSIBLE_RANGE`, `LEAVE_BLOCKED_ASSET_STRIPPING`, `TICKET_PRICE_OUT_OF_BOUNDS`, `TAKEOVER_REVIEW_REQUIRED` | Erro (Banner) + pendência | Motivo **geral** sem revelar fórmula; ação pode ficar **pendente** com prazo; link **recorrer** (MF-24 → `SubmitAppeal`) | **Não** (revisão manual) |
| **Recusa de contraparte** | `PLAYER_REJECTED_TERMS` | — (desfecho de negócio) | Toast `warning`/neutro; reabre negociação (`NEGOTIATING`), não trata como falha técnica | **Sim**, com termos novos |
| **Estado/alvo inexistente ou expirado** | `TRANSFER_CASE_NOT_FOUND`, `OFFER_EXPIRED`, `OFFER_STATE_INVALID`, `DECISION_POINT_NOT_OPEN`, `DECISION_POINT_ALREADY_RESOLVED`, `MATCH_NOT_LIVE`, `*_NOT_FOUND` | Vazio/refetch | Refetch e mostra o estado atual; a ação "sumiu" (o feed já reconciliou) | **Não** (alvo mudou) |
| **Concorrência ao vivo** | `SUBSTITUTIONS_EXHAUSTED`, `PLAYER_NOT_ON_BENCH`, `PLAYER_NOT_ON_PITCH` | Erro (Toast) | Toast `danger` no `M-LIVE`; sem `expectedVersion` (ordena por `matchSequence`); `commandId` evita duplicar | **Não** |
| **Mundo somente-leitura** | `WORLD_READ_ONLY` | Somente leitura | `Header` em `readOnly` ("mundo em manutenção"); commands bloqueados; leitura mantida (INV-35) | **Sim**, ao sair do read-only |
| **Contrato de cliente** | `COMMAND_CONTRACT_INCOMPATIBLE` | Bloqueio | "Atualize o app"; bloqueia commands críticos (`BREAKING`, doc 08) | **Não** até atualizar |
| **Idempotência / owner** | `IDEMPOTENCY_KEY_REUSED`, `FORBIDDEN_NOT_CONTROLLER` | Erro | Reuso com payload divergente → erro de app (bug de chave); não-controlador → ação oculta/desabilitada | **Não** |
| **Offline (transporte)** | — (sem resposta) | Offline | Badge "offline"; command **enfileirado** com `idempotencyKey`; reenvio na reconexão (idempotência evita efeito duplicado); `ProgressToast` retoma `ACCEPTED→COMPLETED` | **Automático** na reconexão |

**Ações de alto risco.** `ActivateClubControl`, `LeaveClub`, `SignTransfer`, `OpenCreditFacility`, `StartStadiumWorks`, `ReleaseStaff` exigem `HighRiskConfirm` (dupla confirmação + resumo de consequência) **antes** de emitir o command (§8). **Warnings** não bloqueantes (ex.: "essa venda enfraquece o setor") viram confirmação suave, não erro.

---

## 5. Cobertura e pendências

- **Rastreabilidade (passo 11):** **49 ações** mapeadas (40 mutam estado via command; 9 são leituras-âncora dos fluxos críticos), cobrindo os commands `✔` dos MF-* e os derivados dos mesmos fluxos, cada uma ligada a query · command · evento · estado/agregado · transição · errorCodes · invariante.
- **Specs (passo 12):** **7 fluxos críticos** especificados com pré-condições, sequência, ramos de erro (recusa, timeout, conflito de versão, offline) e critérios de validação — MF-01 (SAGA-03), MF-05, MF-07, MF-08 (SAGA-01), MF-13, MF-14 (SAGA-04), MF-06 (SAGA-02).
- **Contrato de erro:** 12 classes de `errorCode` mapeadas a estado (§5), reação e política de retry.
- **Itens BASELINE RATIFICADA (dependem de R-##):** R-25 (TTL da reserva), R-26 (faixa plausível de oferta / cooldown de `LeaveClub`), R-27 (limites de preço de ingresso), R-28 (janela de renovação / limite de scouting), R-29 (janela de decisão / máximo de substituições), R-48 (`riscoMédico`/exame), R-96 (efeitos numéricos do `M-CONVO`). Ratificação na [Série R do ADR](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11).
- **Query (leitura):** os nomes `GetX` são **lógicos/derivados** das telas 03–13 e dos recursos REST `/api/v1/...` (doc 08); um **catálogo formal de queries** (payload/paginação por cursor/filtros indexados) é o próximo artefato natural desta série, análogo ao [catálogo de commands](../02-tecnico/10-catalogo-de-commands.md).
</content>
</invoke>
