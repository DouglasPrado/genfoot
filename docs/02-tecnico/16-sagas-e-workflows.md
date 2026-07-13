# Sagas e Workflows Multiagregado (SAGA-01..05)

> **Status:** CANÔNICO (Série R ratificada em 2026-07-13) · **Bloqueador:** **B-07** (workflows multiagregado sem máquina completa) · **Passo:** 10 da ordem de correção · **Fontes reconciliadas:** [`./12-context-map-e-blueprint.md`](./12-context-map-e-blueprint.md) (§6.3 as 5 sagas, contextos participantes, fencing), [`./14-maquinas-de-estado.md`](./14-maquinas-de-estado.md) (§3.4 virada→SAGA-02, §7 transferência→SAGA-01), [`prisma/schema.prisma`](../../prisma/schema.prisma) (`SagaInstance`/`SagaStep`/`IdempotencyKey`/`OutboxEvent`/`InboxDedup`; enums `SagaType`/`SagaStatus`/`SagaStepStatus`), [`./13-ledger-e-conservacao-economica.md`](./13-ledger-e-conservacao-economica.md) (§3 reversão imutável, INV-3a/3b), [`./10-catalogo-de-commands.md`](./10-catalogo-de-commands.md) (commands e eventos emitidos), [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md) (§5 invariantes INV-1..7, `ECO-016`/`ECO-017`, `CMP-005`), [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md) (§6 checklist de ~20 passos) · **Revisão:** 2026-07-12

Este documento fecha o bloqueador **B-07** da auditoria de prontidão: *"transferência, exame, contrato, pagamento e inscrição não formam saga fechada; virada de temporada não tem checkpoints por passo"* — cujo impacto declarado é **pagamento duplicado, reserva presa, contrato duplicado, prêmio repetido ou temporada parcialmente concluída** ([`../BACKLOG-PENDENCIAS.md)). Ele especifica as **cinco sagas** apontadas no [context map §6.3](./12-context-map-e-blueprint.md) como **máquinas de estado fechadas**, com passos, estados, timeouts, compensações, idempotência, fencing token, authority e estados terminais.

> **Modo CANÔNICO.** Estrutura, timeouts, retries, compensações e fencing foram ratificados em R-138..R-142. Valores futuros mudam por configuração versionada, sem alterar sagas já iniciadas.

## Sumário

1. [Kernel de saga (modelo de execução comum)](#1-kernel-de-saga-modelo-de-execução-comum)
2. [SAGA-01 · Transferência](#2-saga-01--transferência)
3. [SAGA-02 · Virada de temporada](#3-saga-02--virada-de-temporada)
4. [SAGA-03 · Onboarding/entrada](#4-saga-03--onboardingentrada)
5. [SAGA-04 · Obra de infraestrutura](#5-saga-04--obra-de-infraestrutura)
6. [SAGA-05 · Empréstimo](#6-saga-05--empréstimo)
7. [Garantia contra os defeitos da auditoria](#7-garantia-contra-os-defeitos-da-auditoria)
8. [Parâmetros BASELINE RATIFICADA e rastreabilidade](#8-parâmetros-proposto-e-rastreabilidade)

---

## 1. Kernel de saga (modelo de execução comum)

As cinco sagas **compartilham um único mecanismo de execução**. Especificá-lo uma vez evita repetir idempotência/fencing/compensação em cada saga; as §2..§6 só declaram **o que é próprio** de cada processo (passos, donos, compensações, timeouts).

### 1.1 Anatomia persistida (derivada do schema — CANÔNICO)

Toda saga é um **process manager** persistido, **sem 2PC** (Decisão 19.10). Estrutura executável já no schema ([`prisma/schema.prisma`](../../prisma/schema.prisma)):

| Modelo/enum | Campos-chave | Papel |
|---|---|---|
| `SagaInstance` | `id`, `gameWorldId`, `sagaType`, `status`, `currentStep`, `correlationId`, `contextJson`, **`fencingToken`**, `lastError`, `version`, `completedAt` | 1 instância por processo; `contextJson` guarda os IDs de negócio (case, clube, jogador, edição); `currentStep` é o **checkpoint** |
| `SagaStep` | `sagaInstanceId`, `stepIndex`, `name`, `status`, **`compensationStatus`**, `attemptCount`, `payloadJson`, `error`, `startedAt`, `completedAt` · `@@unique([sagaInstanceId, stepIndex])` | 1 linha por passo, com estado de execução **e** de compensação |
| `SagaType` | `TRANSFER`·`SEASON_ROLLOVER`·`ONBOARDING`·`STADIUM_WORKS`·`LOAN` | os cinco processos deste documento (SAGA-01..05) |
| `SagaStatus` | `CREATED`·`RUNNING`·`WAITING`·`COMPENSATING`·`COMPLETED`·`FAILED`·`MANUAL_REVIEW` | ciclo de vida da instância |
| `SagaStepStatus` | `PENDING`·`RUNNING`·`COMPLETED`·`FAILED`·`COMPENSATED`·`SKIPPED` | ciclo de vida do passo (e da compensação, via `compensationStatus`) |
| `IdempotencyKey` | `@@unique([actorId, idempotencyKey])`, `@@unique([commandId])` | 1 execução lógica por passo (chave = `sagaId:stepIndex[:COMPENSATE]`) |
| `OutboxEvent` | `sequence` (worldSequence), `correlationId`, `causationId` | efeito de cada passo publicado **na mesma transação** do agregado |
| `InboxDedup` | `@@unique([consumerName, eventId])` | consumo idempotente do evento por cada contexto reagente |

### 1.2 Estados da instância (`SagaStatus`) e transições

```
                 abre (gatilho)          passo N ok, faltam passos
   [∅] ── CreateSaga ──▶ CREATED ── start ──▶ RUNNING ─────────────────┐
                                                │ │  ▲                  │
                          espera etapa futura   │ │  └── retoma ────────┘
                          (world-clock / exame) ▼ │
                                            WAITING │ todos os passos ok + VERIFY
                                                │   ▼
                          falha não-retentável  │  COMPLETED  ═════▶ [terminal: sucesso]
                                  ┌─────────────┴──────────┐
                                  ▼                        ▼
                            COMPENSATING ── undo ok ──▶ FAILED  ═════▶ [terminal: compensada]
                                  │ undo falha
                                  ▼
                            MANUAL_REVIEW ═════════════════════════▶ [terminal: intervenção humana]
```

- **`CREATED`**: instância aberta pelo gatilho; nenhum passo executado.
- **`RUNNING`**: executando passos sequencialmente (`currentStep` avança a cada commit).
- **`WAITING`**: parada num passo que **espera etapa futura** (resultado de exame, marco de obra dirigido pelo relógio, vigência de empréstimo). Não segura transação — retoma por evento/tick.
- **`COMPENSATING`**: um passo falhou de forma não-retentável; desfazendo os passos anteriores **em ordem reversa**.
- **`COMPLETED`** / **`FAILED`** / **`MANUAL_REVIEW`**: **terminais** (§1.6).

### 1.3 Protocolo de um passo (uma transação local do contexto dono)

Cada passo é **uma** transação PostgreSQL do **contexto dono daquele passo** (§6.1 do context map), com Outbox atômica e guarda de fencing + idempotência:

```
BEGIN (schema do contexto dono do passo)
  -- FENCING: só o executor com o token corrente aplica
  guard: SagaStep.status = PENDING
     AND SagaInstance.fencingToken = $heldToken          -- token monotônico
  -- IDEMPOTÊNCIA: 1 execução lógica por passo
  if IdempotencyKey('saga:{id}:step:{k}') = COMPLETED:
     return resultPayload  -- reexecução devolve o resultado, não repete efeito
  UPDATE SagaStep SET status = RUNNING, attemptCount += 1, startedAt = now;
  <command/operação do contexto dono>                    -- escreve UM agregado + invariantes locais
  UPDATE SagaStep SET status = COMPLETED, completedAt = now;
  UPDATE SagaInstance SET currentStep = k + 1, version += 1;   -- CHECKPOINT avança
  INSERT OutboxEvent(...);                                -- evento na MESMA tx (AT_LEAST_ONCE)
  UPSERT IdempotencyKey('saga:{id}:step:{k}') = COMPLETED, resultPayload;
COMMIT
-- pós-commit: Outbox publica o evento; orquestrador dispara o próximo passo
```

**Consequências diretas:**
- **Nenhuma chamada externa dentro da transação** (Decisão 19.10) — o passo só escreve o agregado do seu contexto e a Outbox; os demais contextos **reagem ao evento** (coreografia) por `InboxDedup`.
- **Checkpoint por passo** = `SagaInstance.currentStep`. Recuperação retoma de `currentStep`; passos `< currentStep` **nunca** reexecutam efeito (a `IdempotencyKey` os curto-circuita).
- **Consistência forte só dentro do passo**; entre passos é eventual e reconciliável.

### 1.4 Fencing token (execução concorrente/dupla impedida)

`SagaInstance.fencingToken` é um **inteiro monotônico**. Um executor adquire o **lease** da saga incrementando o token (`UPDATE ... SET fencingToken = fencingToken + 1 WHERE fencingToken = $seen`); todo passo carrega o token adquirido na guarda (§1.3). Se um executor lento/duplicado tentar aplicar com um token **inferior** ao corrente, a guarda falha e a escrita é rejeitada — **dois executores nunca aplicam o mesmo passo** (context map §6.3 "fencing"). A ordem de efeitos entre contextos usa `OutboxEvent.sequence` (`worldSequence`). Runtimes de longa duração renovam o lease por **heartbeat**; lease expirado libera a saga para outro executor, que **incrementa o token** e invalida o anterior.

### 1.5 Timeouts, retry e compensação (padrão)

- **Timeout por passo:** cada `SagaStep` tem um prazo. Estouro em passo **retentável** (falha transitória de infra) → novo `attempt` com backoff, limitado por um **orçamento de retry** (`maxAttempts`, BASELINE RATIFICADA). Esgotado o orçamento, ou falha **não-retentável** (regra de negócio: exame reprova, orçamento insuficiente) → `COMPENSATING`.
- **Passos `WAITING`** (exame médico server-side, marco de obra, vigência de empréstimo) têm timeout **longo** ancorado no relógio do mundo (C2); retomam por evento/tick, não por polling em transação aberta.
- **Compensação em ordem reversa** — desfaz do passo `k−1` até o `0`, cada undo em sua própria transação, **idempotente** por `IdempotencyKey('saga:{id}:step:{j}:COMPENSATE')` e registrado em `SagaStep.compensationStatus = COMPENSATED`:

```
on falha não-retentável no passo k:
  SagaInstance.status = COMPENSATING
  for j = k-1 downto 0 where SagaStep[j].status = COMPLETED:
     BEGIN <contexto dono do passo j>
       if IdempotencyKey('saga:{id}:step:{j}:COMPENSATE') = COMPLETED: continue
       <undo do passo j>                       -- liberar reserva, reversão imutável, reverter inscrição
       SagaStep[j].compensationStatus = COMPENSATED
       INSERT OutboxEvent(<Compensated...>);
     COMMIT
  SagaInstance.status = FAILED         -- terminal "compensada"
  se algum undo falhar irremediavelmente → MANUAL_REVIEW (nunca deixa estado sujo silencioso)
```

- **Reversão financeira é sempre imutável** (doc 13 §3.1): não se apaga lançamento; cria-se **novo** `JournalEntry` com `reversalOfJournalEntryId` apontando o original (INV-3a mantém Σdébitos=Σcréditos). Reserva liberada = `FinancialReservation` marcada liberada + evento; nunca `DELETE`.

### 1.6 Authority (quem inicia e quem cancela) e estados terminais

| | Inicia | Pode cancelar / abortar | Terminais |
|---|---|---|---|
| Regra geral | o **command de gatilho** (ator autorizado do contexto dono do 1º passo) | o mesmo ator **até** o ponto de não-retorno do processo; depois, só **C12 · Anti-abuso/Admin** por command administrativo com trilha (`GameAuditLog`) | `COMPLETED` (sucesso) · `FAILED` (compensada) · `MANUAL_REVIEW` (intervenção) |
| IA/Automação | emite **os mesmos commands** que um humano (context map Q6) — pode iniciar SAGA-01/04/05 dentro de sua autoridade | não cancela alto risco (rebaixado a "sugerir") | idem |
| Sistema (C2) | jobs de relógio iniciam SAGA-02 (`SeasonDue`) | — | idem |

**Ponto de não-retorno:** cada saga declara a partir de qual passo o cancelamento vira **compensação** (undo), não abandono. Terminais são **absorventes**: uma saga `COMPLETED`/`FAILED` não reabre; correção posterior é **nova** saga ou command administrativo (C12).

---

## 2. SAGA-01 · Transferência

`SagaType = TRANSFER`. **Gatilho:** `TransferAgreementReached` (emitido por `AcceptOffer`, [doc 10 §mercado](./10-catalogo-de-commands.md); máquina §7 `NEGOTIATING → ACCEPTED`, T6-3). **Authority para iniciar:** o aceite é da parte que recebeu a oferta corrente; a **conclusão** (`SignTransfer`) é alto risco. **Cancelar:** qualquer parte até o passo 4 (pagamento); a partir daí, compensação. **Contextos participantes:** C6 (case/contrato), C9 (reserva/liquidação), C4 (exame médico), C7 (inscrição).

O fluxo de negócio completo é *proposta → aceite → reserva financeira → exame médico → contrato pessoal → pagamento/parcelas → registro/inscrição → conclusão* (`ECO-016`, máquina §7). **Proposta** (`MakeTransferOffer`) e **aceite** (`AcceptOffer`) são **pré-saga** (transações locais de C6); a saga cobre os 6 passos do aceite à conclusão.

### 2.1 Passos

| k | Passo (`SagaStep.name`) | Contexto dono | Command/operação | Evento emitido | Timeout (BASELINE RATIFICADA R-138) | Compensação (undo) |
|---|---|---|---|---|---|---|
| 1 | `HOLD_RESERVATION` | **C9** | `FinanceReservationPort.confirm` — revalida a `FinancialReservation` aberta no `MakeTransferOffer` e a **segura** para o `transferFee` (idempotente: se já existe, reusa; INV contra reserva dupla) | `FinancialReservationConfirmed` | curto (segundos) | liberar reserva → `FinancialReservationReleased` (imutável) |
| 2 | `MEDICAL_EXAM` | **C4** | exame **server-side** (§6 MED-7); resultado por `riscoMédico` (R-48) | `MedicallyCleared` **ou** `MedicalExamFailed`/`MedicalTermsRevision` | longo, `WAITING` (dias virtuais) | nenhum efeito a desfazer (passo de leitura); ramifica (§2.4) |
| 3 | `PERSONAL_TERMS` | **C6** | acordo dos termos pessoais → grava `PlayerContract` **em rascunho** (não `ACTIVE`) | `PersonalTermsAgreed` | curto | descartar rascunho (nada publicado; sem linha ativa) |
| 4 | `SETTLE_PAYMENT` | **C9** | converte reserva → `Payment`/`TransferPaymentSchedule` (à vista + parcelas/gatilhos); lançamento **TRANSFER** clube↔clube (conserva, INV-3b) | `PaymentScheduled` (+ `LedgerEntryPosted`) | médio; retry limitado | **reversão imutável**: novo `JournalEntry` com `reversalOfJournalEntryId`; cancela `TransferPaymentSchedule` → `PaymentReversed` |
| 5 | `REGISTER_PLAYER` | **C7** | `RegisterPlayer` na edição, **se** janela de inscrição aberta; senão registra **intenção diferida** (`SKIPPED` + tarefa) | `PlayerRegistered` **ou** `RegistrationDeferred` | curto | reverter inscrição → `PlayerUnregistered` |
| 6 | `CONCLUDE` | **C6** | `SignTransfer` — **único** caminho que ativa o vínculo: `PlayerContract`→`ACTIVE`, contrato antigo→`TRANSFERRED` | `TransferSigned` (+ `TransferCompleted`, `PlayerContractSigned`, `PlayerClubHistoryOpened`) | curto | — (passo terminal; falha aqui compensa 4→1) |

**Ponto de não-retorno:** passo 4 (`SETTLE_PAYMENT`). Antes dele, cancelar = compensar reserva/rascunho; depois, exige reversão imutável do pagamento.

### 2.2 Estados da instância

`CREATED` (no `TransferAgreementReached`) → `RUNNING` (passos 1,3,4,5,6) com `WAITING` no passo 2 (exame) e no 5 (se janela fechada, aguarda `RegistrationWindowOpened`). Terminais: **`COMPLETED`** (=`TransferStatus.COMPLETED`, máquina T6-4) · **`FAILED`** (compensada → `TransferStatus.CANCELLED`, T6-8) · **`MANUAL_REVIEW`** (compensação de pagamento falha).

### 2.3 Diagrama

```
TransferAgreementReached (AcceptOffer, T6-3)
        │
        ▼
[CREATED] ─▶ 1 HOLD_RESERVATION (C9) ─ok─▶ 2 MEDICAL_EXAM (C4, WAITING)
                                              │ aprovar/aprovar-c-risco
                                              ▼
                                        3 PERSONAL_TERMS (C6, rascunho)
                                              │
                                              ▼
                                        4 SETTLE_PAYMENT (C9) ── ponto de não-retorno
                                              │
                                              ▼
                                        5 REGISTER_PLAYER (C7 · ou diferido)
                                              │
                                              ▼
                                        6 CONCLUDE = SignTransfer (C6)
                                              │
                                              ▼
                                     [COMPLETED]  (TransferSigned / T6-4)

   exame reprova / orçamento some / termos recusados
        └┄ COMPENSATING ┄▶ reverter inscrição → estornar pagamento (imutável)
                            → descartar rascunho → liberar reserva ┄▶ [FAILED] (T6-8, CANCELLED)
```

### 2.4 Ramificação do exame (§7.3, C-07)

O passo 2 é **etapa com poder de decisão**, não carimbo (C-07: liberação **server-side**, jamais do payload do cliente):

| Resultado (`riscoMédico`, R-48) | Efeito na saga |
|---|---|
| aprovar (`<30`) / aprovar com risco (`30–54`) | passo 2 `COMPLETED` → segue ao passo 3 |
| avaliação adicional (`55–74`) | passo 2 permanece `WAITING` (novo exame) até resolver |
| reprovar (`≥75`) | passo 2 `FAILED` → `COMPENSATING` → `FAILED` (T6-8, `TransferCancelled`) |
| alterar termos | saga **pausa** e devolve o case a `NEGOTIATING` (T6-9); ao reacordar, novo `TransferAgreementReached` reabre nova instância |

### 2.5 Invariantes e defeitos cobertos

- **Contrato duplicado — impedido.** Só o passo 6 (`SignTransfer`) ativa `PlayerContract` (**caminho único**, C-07); INV-1 (exclusion constraint "1 contrato principal ativo") + `commandId` idempotente. `SignContract` **não** cria vínculo dentro desta saga.
- **Pagamento duplicado — impedido.** Passo 4 é idempotente por `IdempotencyKey('saga:{id}:step:4')` + `commandId` (`TRANSFER_PAYMENT_NOT_DUPLICATED`, doc 10 `SignTransfer`) + `JournalEntry.sourceEventId` único (1 lançamento por evento). Reexecução devolve o resultado; não repõe caixa.
- **Reserva presa — impedida.** A saga **é dona** do ciclo da reserva: qualquer terminal de falha passa por `HOLD_RESERVATION.compensate` → `FinancialReservationReleased`. Nunca fica reserva comprometida sem saga viva.
- **Eventos aplicáveis:** `TransferAgreementReached`, `TransferSigned`/`TransferCompleted`, `PaymentScheduled`, `PlayerRegistered` ([context map §5.1](./12-context-map-e-blueprint.md)). **Invariantes:** INV-1, INV-3a/3b; regras `ECO-016`, `ECO-017` (obrigação de compra → dispara **SAGA-05→SAGA-01**).

---

## 3. SAGA-02 · Virada de temporada

`SagaType = SEASON_ROLLOVER`. **Gatilho:** job `season:check-start-end` / evento `SeasonDue` (C2). **Authority para iniciar:** **sistema** (relógio do mundo C2); nenhum humano dispara. **Cancelar:** não cancelável por jogador — só **pausa/retoma** por checkpoint; incidente insanável → `MANUAL_REVIEW` (C12). **Contextos:** C2 (orquestra), C7 (edições/fixtures), C9 (fechamento), C4 (aging/aposentadoria/safra), C3 (metas/orçamento), C10/C11 (reputação/relatório).

É o **motor de virada** — o checklist de ~20 passos ([temporada §6](../01-game-design/06-temporada-e-competicoes.md)) — que a auditoria aponta como **sem checkpoints por passo**. Aqui **cada um dos 20 passos é um `SagaStep` com checkpoint** (`SagaInstance.currentStep`), agrupado nas 8 macrofases internas já fixadas na máquina de temporada ([§3.4](./14-maquinas-de-estado.md)): `REQUESTED → PREPARING → VALIDATING → FREEZING_INPUTS → CALCULATING → APPLYING_RESULTS → VERIFYING → COMPLETED`.

> **Recuperação para frente (forward recovery), não rollback.** Não se "desvira" uma temporada (não se despromove um campeão nem se desjoga uma partida). Por isso a SAGA-02 é **idempotente-para-frente**: retoma de `currentStep` e **nunca reaplica** passo `< currentStep`. As **únicas** compensações são **financeiras** (estorno imutável de premiação lançada por engano) e a reversão de calendário ainda não publicado. Falha estrutural → `MANUAL_REVIEW`, jamais uma temporada meio-arquivada.

### 3.1 Os 20 passos como checkpoints

| k | Passo (checklist §6) | Fase interna | Dono | Command/job | Idempotência do passo | Compensação/retoma |
|---|---|---|---|---|---|---|
| 1 | Encerrar partidas pendentes | FREEZING_INPUTS | C8→C7 | `match:finish` (W.O./adiamento resolvido) | resultado único por partida (INV-2) | retoma; resultado idêntico é idempotente |
| 2 | Fechar tabelas dos campeonatos | CALCULATING | C7 | projeção de `Standings` (INV-5) | derivada, reconstruível | recomputar (determinística) |
| 3 | Definir campeões/rebaixados/classificados | CALCULATING | C7 | homologação (`CMP-013`) | `HomologationStatus: PROVISIONAL→HOMOLOGATED` | recomputar; **precede o passo 4** (C-10) |
| 4 | Distribuir premiações | APPLYING_RESULTS | **C9** | prêmio → ledger (`CMP-015`, faucet `SYS_PRIZE_FAUCET`) | `JournalEntry.sourceEventId` único (**1 lançamento por evento**) | estorno **imutável** (`reversalOfJournalEntryId`) se lançado errado |
| 5 | Atualizar reputação de clubes | APPLYING_RESULTS | C3/C10 | reação a `CompetitionEditionHomologated` | InboxDedup por evento | recomputar (derivada) |
| 6 | Atualizar reputação de jogadores | APPLYING_RESULTS | C4/C10 | idem | InboxDedup | recomputar |
| 7 | Evolução/regressão dos jogadores | APPLYING_RESULTS | **C4** | `CMP-005` — **ponto único** de mutação estrutural | **consome buffer** `PlayerDevelopmentAccrual` (zera na aplicação, R-113) | reprocesso lê buffer **antes** do zeramento; **nunca dobra ganho** |
| 8 | Processar eventos pessoais | APPLYING_RESULTS | C4 | eventos de vida | seed de temporada | determinística por seed |
| 9 | Processar lesões de longo prazo | APPLYING_RESULTS | C4 | `PlayerInjury` atravessa a virada (§3.5) | idempotente por episódio | retoma sem reiniciar episódio |
| 10 | Processar aposentadorias | APPLYING_RESULTS | C4 | `PLY-017` (`RetirePlayer` contextual) | mede `retiredCount`; idempotente por jogador | retoma; aposentadoria única (INV-4) |
| 11 | Atualizar contratos | APPLYING_RESULTS | C6 | expiração/opção/gatilho **escalonado** (`CMP-016`) | por marco de cada vínculo | retoma por marco; sem reprocesso de vínculo já virado |
| 12 | Atualizar mercado da bola | CALCULATING | C6/C9 | `ECO-012` reprecifica | derivada do estado | recomputar |
| 13 | Gerar interesse de clubes | CALCULATING | C6 | listas/alvos | seed | determinística |
| 14 | Atualizar finanças dos clubes | APPLYING_RESULTS | **C9** | fechamento contábil (faucets/sinks) | `sourceEventId` por lançamento | estorno imutável se necessário |
| 15 | Atualizar objetivos da diretoria | APPLYING_RESULTS | C3 | `BoardEvaluation` → metas/orçamento | idempotente por clube | recomputar |
| 16 | Promover jogadores da base | APPLYING_RESULTS | C4/C3 | `PromoteYouthPlayer` (base→pro) | idempotente por jogador | retoma; promoção única |
| 17 | Gerar novos jogadores (olheiros/base) | APPLYING_RESULTS | **C4** | **gerador único** dirigido por gap (`PLY-002`, R-114/R-115) | **seed de temporada** (safra não duplica) | reprocesso gera a **mesma** safra (determinística) |
| 18 | Montar calendário da nova temporada | PREPARING(n+1) | C7/C2 | `competition:generate-fixtures` | fixtures idempotentes por edição | reverter fixtures **ainda não publicadas** |
| 19 | Definir expectativas da nova temporada | PREPARING(n+1) | C3 | metas/expectativa | idempotente por clube | recomputar |
| 20 | Iniciar nova temporada | COMPLETED | **C2** | bootstrap `Season` em `PLANNED` (S2-6) | transição única de `SeasonStatus` | — (passo terminal) |

> **Ordem normativa (C-10).** Homologar (passos 1–3) **sempre antes** de pagar (passo 4). O checklist é **derivado** desta ordem, não o contrário — a fase `APPLYING_RESULTS` só abre depois de `CALCULATING` fechar a homologação. A fase **`VERIFYING`** (após o passo 17, antes de 18–20) revalida INV-5 (standings ↔ resultados), INV-3a (razão balanceado) e INV-7 (banda populacional) antes de concluir.

### 3.2 Estados e diagrama

```
SeasonDue (job season:check-start-end)
   │
   ▼
[REQUESTED]→[PREPARING]→[VALIDATING]→[FREEZING_INPUTS]
   passos 1                                    │
   ▼                                           ▼
[CALCULATING] (2,3,12,13) ──homologado(3)──▶ [APPLYING_RESULTS] (4..17, ordem C-10)
                                                   │  checkpoint currentStep a cada passo
                                                   ▼
                                             [VERIFYING] (INV-5 / INV-3a / INV-7)
                                                   │ ok
                                                   ▼
                                   passos 18,19,20 ─▶ [COMPLETED]  (SeasonCompleted, S2-5)
   falha estrutural em qualquer passo:
        └┄ retoma de currentStep (nunca reaplica < currentStep)
           insanável ┄▶ [MANUAL_REVIEW] (C12) — nunca temporada meio-arquivada
```

Mapeia a máquina de temporada: `FINALIZING → OFF_SEASON` (passos 1–4/homologação) e `OFF_SEASON → COMPLETED` (passos 18–20), com `SeasonStatus: ACTIVE→FINISHED→ARCHIVED` ([§3.4](./14-maquinas-de-estado.md)).

### 3.3 Defeitos cobertos

- **Prêmio repetido — impedido.** Passo 4 idempotente por `JournalEntry.sourceEventId` (1 lançamento por evento) **e** por checkpoint (`currentStep > 4` ⇒ passo não reexecuta). Reprocesso da virada **nunca** repaga.
- **Temporada parcialmente concluída — impedida.** Checkpoint por passo + fase `VERIFYING` + `COMPLETED` só no passo 20. Falha retoma de `currentStep`; `SeasonStatus` só vira `ARCHIVED` no fim — nunca parcial.
- **Ganho de atributo dobrado — impedido.** Passo 7 é o **único** ponto de mutação estrutural e **consome** o buffer de accrual (R-113); pós-partida só acumula.
- **Safra duplicada — impedida.** Passo 17 é **gerador único**, determinístico por seed (R-114/R-115).
- **Eventos/invariantes:** `SeasonRolledOver`, `CompetitionEditionHomologated`, `WagesPaid`/`LedgerEntryPosted` ([§5.1](./12-context-map-e-blueprint.md)); INV-3a/3b, INV-5, INV-7; `CMP-005`, `CMP-013`, `CMP-015`, `CMP-016`.

---

## 4. SAGA-03 · Onboarding/entrada

`SagaType = ONBOARDING`. **Gatilho:** `ClubSlotReserved` (emitido por `ReserveClubSlot`, doc 10 · MF-01). **Authority:** o ator que entra (conta/participante C1); **cancelar/expirar:** o próprio ator ou o TTL (R-25). **Contextos:** C1 (entrada/controle), C9 (aporte), C3 (clube), com C12 no ramo de auditoria de takeover.

Fluxo: *reserva de vaga → aporte inicial → ativação de controle → estado inicial* ([context map §6.3](./12-context-map-e-blueprint.md)).

### 4.1 Passos

| k | Passo | Dono | Command/operação | Evento | Timeout | Compensação |
|---|---|---|---|---|---|---|
| 1 | `RESERVE_SLOT` | **C1** | `ReserveClubSlot` — abre `ClubEntryReservation` com **TTL** (R-25 · sugestão 30 min, 1 renovação) | `ClubSlotReserved` (+ `ClubEntryReservationOpened`) | **TTL R-25** | expirar/liberar a vaga → `ClubEntryReservationExpired` |
| 2 | `INITIAL_STAKE` | **C9** | aporte **fixo** (igualdade competitiva) via faucet `SYS_INITIAL_ENDOWMENT` (só clube **novo**; assumido **herda** estado, passo `SKIPPED`) | `InitialEndowmentPosted` | curto | **reversão imutável** do aporte |
| 3 | `ACTIVATE_CONTROL` | **C1** | `ActivateClubControl` — 1 controle ativo por clube (índice único parcial); clube "forte" → `WAITING` para **auditoria** (C12, `TAKEOVER_REVIEW_REQUIRED`) | `ClubControlActivated` (+ `ClubOnboardingStarted`); novo: `ClubCreated` | curto (imediato) ou `WAITING` (auditoria) | encerrar controle → `ClubControlEnded` |
| 4 | `INITIAL_STATE` | **C3** | bootstrap do estado inicial (elenco/tática/perfil IA para clube novo; **herança** de dívidas/contratos/promessas para assumido) | `ClubOnboardingCompleted` | curto | reverter bootstrap (só clube novo) |

**Ponto de não-retorno:** passo 3 (`ACTIVATE_CONTROL`) confirmado. Antes, expirar reserva basta; depois, `LeaveClub` é **outra** operação (com cooldown R-26), não compensação desta saga.

### 4.2 Estados e diagrama

```
ReserveClubSlot ─▶ ClubSlotReserved
   │
   ▼
[CREATED]→1 RESERVE_SLOT (C1, TTL R-25)
              │ dentro do TTL
              ▼
           2 INITIAL_STAKE (C9 · SKIP se clube assumido)
              │
              ▼
           3 ACTIVATE_CONTROL (C1) ──clube forte──▶ WAITING (auditoria C12)
              │ ok                                       │ aprovado
              ▼                                          ▼
           4 INITIAL_STATE (C3) ◀───────────────────────┘
              │
              ▼
        [COMPLETED]  (ClubOnboardingCompleted)

  TTL expira antes do passo 3:
     └┄ COMPENSATING ┄▶ estornar aporte (imutável) → liberar vaga ┄▶ [FAILED]
  auditoria de takeover reprova:
     └┄ [MANUAL_REVIEW] (C12) / [FAILED] com reversão
```

Terminais: `COMPLETED` · `FAILED` (TTL expirado / auditoria reprova, com reversão do aporte) · `MANUAL_REVIEW` (takeover em análise humana).

### 4.3 Defeitos cobertos

- **Reserva presa — impedida.** TTL (R-25) + compensação sempre liberam `ClubEntryReservation`; nenhuma vaga fica presa se o onboarding não conclui. Reenvio de `ReserveClubSlot` devolve a **mesma** reserva (idempotência do passo 1), não abre duas.
- **Aporte/controle duplicado — impedido.** Passo 2 idempotente por `commandId` (1 aporte); passo 3 protegido por índice único parcial "1 controle ativo por clube" + `commandId` (segundo envio não cria segundo controle).
- **Eventos/invariantes:** `ClubControlActivated`, `AiControlAssumed` ([§5.1](./12-context-map-e-blueprint.md)); invariantes de C1 ("1 controle ativo por clube", "1 clube ativo por participante"); R-25 (TTL), R-26 (cooldown de `LeaveClub`).

---

## 5. SAGA-04 · Obra de infraestrutura

`SagaType = STADIUM_WORKS`. **Gatilho:** `StadiumWorksStarted` (emitido por `StartStadiumWorks`, doc 10 · MF-14/23, alto risco `HighRiskConfirm`). **Authority:** controlador do clube (C3); alto risco não delegável totalmente à IA. **Cancelar:** o clube até o início da execução; depois, compensa o **não-desembolsado**. **Contextos:** C3 (projeto), C9 (financiamento).

Fluxo: *aprovação → financiamento → execução com marcos → licenciamento → operação* ([context map §6.3](./12-context-map-e-blueprint.md)).

### 5.1 Passos

| k | Passo | Dono | Command/operação | Evento | Timeout | Compensação |
|---|---|---|---|---|---|---|
| 1 | `APPROVE` | **C3** | estudo de viabilidade aprovado; sem obra conflitante no ativo | `StadiumWorksApproved` | curto | cancelar projeto (sem custo ainda) → `ProjectCancelled` |
| 2 | `FINANCE` | **C9** | reservar caixa **ou** `OpenCreditFacility` (`financingSource`) → `FinancialReservation` | `FinancialReservationCreated` (+ `CreditFacilityOpened`) | médio | liberar reserva / encerrar crédito (reversão imutável) |
| 3 | `EXECUTE_MILESTONES` | **C3** | execução longa por **marcos**; cada marco = **checkpoint** que baixa parcela da reserva → sink `SYS_OPERATING_SINK` | `ConstructionMilestoneReached` (por marco) | **longo**, `WAITING` (relógio do mundo) | interromper marcos futuros; **já gasto é custo afundado** (só estorna reserva **não** desembolsada) |
| 4 | `LICENSE` | C3/C7 | vistoria/licenciamento na conclusão | `FacilityLicensed` | médio | — (sem efeito financeiro a reverter) |
| 5 | `OPERATE` | **C3** | `StadiumWorksCompleted` → nova capacidade/multiplicadores; C9 dá **baixa final** da reserva | `StadiumWorksCompleted` (+ `DepartmentUpgradeCompleted` p/ obras de depto) | curto | — (terminal) |

**Ponto de não-retorno:** início do passo 3 (primeiro marco desembolsado). O modelo de marcos garante que abortar no meio **não** exige "desconstruir" — apenas cessa desembolsos futuros e libera a reserva remanescente.

### 5.2 Diagrama

```
StartStadiumWorks (HighRiskConfirm) ─▶ StadiumWorksStarted
   │
   ▼
[CREATED]→1 APPROVE (C3)─▶2 FINANCE (C9, reserva/crédito)
                              │
                              ▼
                          3 EXECUTE_MILESTONES (C3, WAITING por marco)
                              │  M1 ▸ M2 ▸ ... ▸ Mn  (cada marco: checkpoint + baixa parcial)
                              ▼
                          4 LICENSE (C3/C7)
                              │
                              ▼
                          5 OPERATE ─▶ StadiumWorksCompleted ─▶ [COMPLETED]

  abortar antes/durante marcos:
     └┄ COMPENSATING ┄▶ cessar marcos futuros → liberar reserva não-desembolsada
                        → encerrar crédito ┄▶ [FAILED]
```

Terminais: `COMPLETED` · `FAILED` (abortada, reserva/crédito revertidos) · `MANUAL_REVIEW`. A obra referencia a máquina de `InfrastructureProject`/`Club` (C3, sem obra conflitante no ativo).

### 5.3 Defeitos cobertos

- **Reserva presa — impedida.** A saga é dona da `FinancialReservation`; abortar libera o não-desembolsado; `WAITING` por marco tem timeout ancorado no relógio (não fica reserva pendurada indefinidamente).
- **Desembolso duplicado — impedido.** Cada marco é idempotente por `IdempotencyKey('saga:{id}:step:3:milestone:{m}')`; reprocesso não baixa a mesma parcela duas vezes; lançamentos por `sourceEventId` único.
- **Eventos/invariantes:** `DepartmentUpgradeCompleted`/`StadiumWorksCompleted`, `FinancialReservationCreated` ([§5.1](./12-context-map-e-blueprint.md)); INV-3a/3b; `ECO-013` (caixa ≠ orçamento ≠ disponível).

---

## 6. SAGA-05 · Empréstimo

`SagaType = LOAN`. **Gatilho:** `PlayerLoaned` (emitido por `LoanPlayer`, doc 10 · MF-10). **Authority:** ambos os clubes consentem; jogador avaliza o projeto (`M-CONVO`). **Contextos:** C6 (acordo), C9 (divisão salarial), C7 (inscrição destino).

Fluxo: *negociação → condições → inscrição → acompanhamento → fim (compra/retorno)* ([context map §6.3](./12-context-map-e-blueprint.md)).

### 6.1 Passos

| k | Passo | Dono | Command/operação | Evento | Timeout | Compensação |
|---|---|---|---|---|---|---|
| 1 | `AGREE_LOAN` | **C6** | `LoanPlayer` → `PlayerLoanAgreement` (preserva contrato/clube de origem) | `PlayerLoaned` (+ `PlayerLoanAgreementCreated`) | curto | cancelar acordo → `LoanCancelled` |
| 2 | `SALARY_SPLIT` | **C9** | divisão salarial `salaryShareBps`: parte paga pelo dono = **transferência** clube↔clube (conserva); parte consumida = sink `SYS_WAGE_SINK` | `LoanSalarySplitEstablished` | curto | encerrar divisão (reversão imutável do pendente) |
| 3 | `REGISTER_DESTINATION` | **C7** | `RegisterPlayer` na edição do **destino** (cotas/janela) | `PlayerRegistered` | curto | reverter inscrição destino → `PlayerUnregistered` |
| 4 | `MONITOR_TERM` | **C6** | vigência: acompanha `minMinutesPromise`, cláusula de recall, gatilhos de opção/obrigação | `LoanMilestoneObserved` | **longo**, `WAITING` (temporada) | — (observação; nada a desfazer) |
| 5 | `END_LOAN` | **C6** | fim por **retorno** (recall/natural) **ou** **compra** (opção/obrigação) | `LoanEnded` **ou** `LoanConvertedToTransfer` | fim de janela/vigência | reverter inscrição destino; reativar origem |

**Ramo de compra (`ECO-017`).** `OBLIGATION_TO_BUY` acionada → dívida independente de caixa → dispara **nova** `SAGA-01` (transferência) como ponte (máquina §7.4); `OPTION_TO_BUY` depende de exercício válido → também abre `SAGA-01`. O **retorno** reverte a inscrição do destino e devolve o jogador à origem.

### 6.2 Diagrama

```
LoanPlayer ─▶ PlayerLoaned
   │
   ▼
[CREATED]→1 AGREE_LOAN (C6)─▶2 SALARY_SPLIT (C9)─▶3 REGISTER_DESTINATION (C7)
                                                         │
                                                         ▼
                                               4 MONITOR_TERM (C6, WAITING)
                                                         │
                              ┌──────────────────────────┼───────────────────────────┐
                     retorno (recall/natural)     opção exercida            obrigação acionada (ECO-017)
                              ▼                          ▼                           ▼
                     5 END_LOAN: reverter        5 END_LOAN: dispara         5 END_LOAN: dispara
                       inscrição, reativar         SAGA-01 (transferência)     SAGA-01 (dívida indep.)
                       origem                            │                           │
                              ▼                          ▼                           ▼
                        [COMPLETED]                 [COMPLETED]→SAGA-01         [COMPLETED]→SAGA-01
  falha na inscrição/consentimento:
     └┄ COMPENSATING ┄▶ reverter inscrição → encerrar divisão salarial → cancelar acordo ┄▶ [FAILED]
```

Terminais: `COMPLETED` (retorno ou conversão em compra) · `FAILED` (compensada) · `MANUAL_REVIEW`.

### 6.3 Defeitos cobertos

- **Inscrição presa / dupla — impedida.** Passo 3 idempotente ("1 inscrição por jogador/clube/edição", INV via `CompetitionRegistration`); compensação e fim revertem a inscrição do destino.
- **Divisão salarial órfã — impedida.** A saga é dona do split; compensação/fim encerram a divisão, com pendências financeiras via reversão imutável (não somem, `ECO-016`/§17.6 da máquina §7).
- **Ponte para compra sem duplicar contrato — garantida.** A conversão dispara **SAGA-01**, cujo passo 6 é o **único** caminho de vínculo (C-07) — não há atalho que crie contrato em paralelo.
- **Eventos/invariantes:** `PlayerLoaned` ([§5.1](./12-context-map-e-blueprint.md)); INV-1; `ECO-007` (limites de empréstimo), `ECO-017` (obrigação ≠ opção).

---

## 7. Garantia contra os defeitos da auditoria

A tabela abaixo fecha o mapeamento **defeito B-07 → mecanismo → saga**. Cada defeito é impedido por **construção** (invariante + idempotência + compensação + fencing), não por convenção.

| Defeito (B-07) | Mecanismo que o impede | Onde |
|---|---|---|
| **Pagamento duplicado** | `IdempotencyKey('saga:{id}:step:k')` + `commandId` único (`TRANSFER_PAYMENT_NOT_DUPLICATED`) + `JournalEntry.sourceEventId` (1 lançamento por evento) + fencing token (§1.3–1.4). Reexecução devolve resultado, não repõe caixa. | SAGA-01 passo 4; SAGA-04 marcos; SAGA-05 split |
| **Reserva presa** | Saga é **dona** do ciclo da `FinancialReservation`/`ClubEntryReservation`: todo terminal de falha compensa liberando; TTL (R-25) no onboarding; `WAITING` com timeout ancorado no relógio. | SAGA-01 passo 1; SAGA-03 passo 1; SAGA-04 passo 2 |
| **Contrato duplicado** | **Caminho único** de vínculo (C-07): só `SignTransfer` (SAGA-01 passo 6) ativa `PlayerContract`; INV-1 (exclusion constraint) + `commandId`. Passo de termos pessoais só grava **rascunho**. | SAGA-01 passo 6; SAGA-05→SAGA-01 |
| **Prêmio repetido** | Checkpoint por passo (`currentStep`) ⇒ passo 4 não reexecuta após avançar; premiação idempotente por `JournalEntry.sourceEventId`; ordem C-10 (homologar antes de pagar). | SAGA-02 passo 4 |
| **Temporada parcialmente concluída** | 20 passos = 20 checkpoints; fase `VERIFYING` (INV-5/INV-3a/INV-7) antes do passo 20; `SeasonStatus→ARCHIVED` só no fim; falha retoma de `currentStep`; insanável → `MANUAL_REVIEW` (nunca meio-arquivada). | SAGA-02 (todos) |

**Princípios transversais que sustentam a garantia:**
1. **Exatamente-uma-vez lógico** por passo = Outbox (produção AT_LEAST_ONCE) + `IdempotencyKey`/`InboxDedup` (consumo idempotente) → efeito único (§1.3).
2. **Reversão sempre imutável** no dinheiro (novo `JournalEntry` com `reversalOfJournalEntryId`, INV-3a) — nada é apagado; auditoria preservada (doc 13 §3).
3. **Fencing token monotônico** (`SagaInstance.fencingToken`) + lease/heartbeat → dois executores nunca aplicam o mesmo passo (§1.4).
4. **Nenhum estado sujo silencioso**: compensação que falha não é ignorada — vira `MANUAL_REVIEW` com trilha (C12).

---

## 8. Parâmetros BASELINE RATIFICADA e rastreabilidade

### 8.1 Parâmetros ratificados (R-138..R-142)

Valores de timeout, orçamento de retry e política de escalação são **baseline operacional ratificada**, não topologia. A telemetria pode motivar nova versão sem mudar passos, ownership ou invariantes.

| R-## | Saga | Parâmetro | Sugestão inicial |
|---|---|---|---|
| **R-138** | SAGA-01 | janela do exame médico (passo 2, `WAITING`); orçamento de retry do pagamento (passo 4); prazo de reabertura por "alterar termos" | exame: 1–3 dias virtuais; pagamento: 5 tentativas com backoff; termos: 1 janela |
| **R-139** | SAGA-02 | timeout por passo do checklist; `maxAttempts` antes de `MANUAL_REVIEW`; janela da fase `VERIFYING` | passo: minutos reais; `maxAttempts`: 3; verify: bloqueia conclusão até INV ok |
| **R-140** | SAGA-03 | confirmação do aporte (passo 2) e da ativação (passo 3) dentro do TTL da reserva (**herda R-25**) | dentro dos 30 min de R-25; auditoria de takeover: 24 h reais |
| **R-141** | SAGA-04 | cadência/timeout de marco (passo 3); política de aborto (custo afundado vs. reversível) | marco por relógio do mundo; aborto libera só reserva não-desembolsada |
| **R-142** | SAGA-05 | cadência de `MONITOR_TERM` (passo 4); janela de recall/opção/obrigação | avaliação por rodada; recall/opção conforme cláusula |

> R-138..R-142 estão ratificadas e reutilizam R-25, R-26, R-48 e R-109..R-115. Os números operacionais podem ser versionados; a topologia das sagas é canônica.

### 8.2 O que este documento fecha (de B-07)

| Entregável B-07 | Onde | Status |
|---|---|---|
| Sagas como máquina fechada (passos, estados, terminais) | §2–§6 (SAGA-01..05) | BASELINE RATIFICADA (derivado do schema/context map) |
| Checkpoints por passo na virada | §3.1 (20 passos = 20 checkpoints) | BASELINE RATIFICADA |
| Timeouts por passo | §2–§6 (colunas) + §8.1 (R-138..R-142) | BASELINE RATIFICADA |
| Compensações (undo) | §1.5 + colunas de cada saga | BASELINE RATIFICADA |
| Idempotência por passo | §1.3 (`IdempotencyKey`) + colunas | CANÔNICO (modelo) / BASELINE RATIFICADA (chaves) |
| Fencing token | §1.4 (`SagaInstance.fencingToken`) | CANÔNICO (schema) |
| Authority (iniciar/cancelar) | §1.6 + cabeçalho de cada saga | BASELINE RATIFICADA |
| Estados terminais | §1.1–1.6 + cada saga | CANÔNICO (`SagaStatus`) |
| Garantia contra os 5 defeitos | §7 | BASELINE RATIFICADA |

### 8.3 Documentos relacionados

- Context map, sagas e fencing — [`./12-context-map-e-blueprint.md`](./12-context-map-e-blueprint.md) (§5 eventos, §6.3 sagas)
- Máquinas de estado (transferência §7, temporada §3.4) — [`./14-maquinas-de-estado.md`](./14-maquinas-de-estado.md)
- Ledger, reversão imutável e conservação — [`./13-ledger-e-conservacao-economica.md`](./13-ledger-e-conservacao-economica.md)
- Catálogo de commands e eventos — [`./10-catalogo-de-commands.md`](./10-catalogo-de-commands.md)
- Invariantes e regras (INV-1..7, `ECO-*`, `CMP-*`) — [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md)
- Motor de virada (checklist de ~20 passos) — [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md)
- Schema executável (`SagaInstance`/`SagaStep`/enums) — [`prisma/schema.prisma`](../../prisma/schema.prisma)
- Backlog/auditoria (B-07) — [`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md)
