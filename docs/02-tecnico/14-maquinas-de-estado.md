# Máquinas de Estado (mundo, temporada, competição, jogador, medicina, transferência, partida)

> **Status:** Material de consolidação (auditoria de prontidão — passo 6 da ordem de correção) · **Bloqueadores:** **B-03** (calendário/temporada não fecham), **B-07** (workflows multiagregado sem máquina completa); apoia **B-05**/**C-09** (runtime de partida) · **Fontes reconciliadas:** [`../../prisma/schema.prisma`](../../prisma/schema.prisma) (enums executáveis), [`./11-dicionario-canonico.md`](./11-dicionario-canonico.md) (estados por domínio §2), [`./12-context-map-e-blueprint.md`](./12-context-map-e-blueprint.md) (aggregate roots §3, sagas §6.3), [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md) (§3 máquinas, §5 invariantes), [`./10-catalogo-de-commands.md`](./10-catalogo-de-commands.md) (commands/eventos), [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md), [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md), [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md), [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md), [`../01-game-design/01-mundo-persistente-e-clubes.md`](../01-game-design/01-mundo-persistente-e-clubes.md) · **Revisão:** 2026-07-12

Este documento **formaliza as sete máquinas de estado** exigidas pela auditoria de prontidão. Ele **não inventa** estados: **deriva e formaliza** os enums canônicos do schema executável e os estados já declarados no dicionário canônico ([`./11-dicionario-canonico.md §2`](./11-dicionario-canonico.md)), na máquina de partida do catálogo ([`./05-catalogo-de-regras-e-formulas.md §3`](./05-catalogo-de-regras-e-formulas.md)) e nas fases narrativas do GDD.

**Como ler:**

- **Regra de precedência (idêntica ao dicionário).** Para **sintaxe** (enum, nome de campo) vence [`schema.prisma`](../../prisma/schema.prisma); para **domínio** (invariante, semântica) vence [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md); para **regras/estados/coeficientes** vence [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md). Este documento **declara transições**, não cria estado novo.
- **`CANÔNICO`** = enum/estado fixado no schema ou em documento consolidado. **`RATIFICADO (R-##)`** = transição ou efeito aprovado; parâmetros calibráveis continuam versionados pelo ruleset.
- **Regra-mãe.** **Toda transição não listada é proibida** e deve ser rejeitada pelo domínio (mesma regra do dicionário §2 e do catálogo §3). Guardas são **pré-condições** verificadas server-side; efeitos são **eventos de domínio** emitidos na mesma transação do agregado (Outbox — [`./12-context-map §5`](./12-context-map-e-blueprint.md)).
- **Fluxos longos são sagas.** Onde a transição cruza mais de um contexto ou espera etapa futura (transferência, virada de temporada), a máquina **aponta para a saga** correspondente, cujos estados internos, timeouts, compensações e terminais são detalhados no **passo 10** da ordem de correção ([`./12-context-map §6.3`](./12-context-map-e-blueprint.md), [`../BACKLOG-PENDENCIAS.md)).

**Sumário**

1. [Convenções de notação](#1-convenções-de-notação)
2. [Máquina 1 — Mundo (`WorldStatus`)](#2-máquina-1--mundo-worldstatus)
3. [Máquina 2 — Temporada (3 camadas)](#3-máquina-2--temporada-3-camadas)
4. [Máquina 3 — Competição (edição)](#4-máquina-3--competição-edição)
5. [Máquina 4 — Pessoa, carreira e disponibilidade do jogador](#5-máquina-4--pessoa-carreira-e-disponibilidade-do-jogador)
6. [Máquina 5 — Medicina / Lesão](#6-máquina-5--medicina--lesão)
7. [Máquina 6 — Transferência (`TransferStatus` → SAGA-01)](#7-máquina-6--transferência-transferstatus--saga-01)
8. [Máquina 7 — Partida (runtime × resultado × homologação)](#8-máquina-7--partida-runtime--resultado--homologação)
9. [Resolução da contradição "partida continua × pausa"](#9-resolução-da-contradição-partida-continua--pausa)
10. [Resumo consolidado](#10-resumo-consolidado)

---

## 1. Convenções de notação

Cada máquina é especificada em quatro blocos, conforme o pedido da auditoria:

1. **Estados** — os valores do enum canônico (ou o mapeamento fase→estado onde o GDD tem camadas a mais).
2. **Transições** — tabela `origem → gatilho (command/evento) → destino`, com **guarda** (pré-condição) e **efeito** (evento emitido).
3. **Terminais e exceções** — estados absorventes e caminhos de cancelamento, W.O., timeout e falha.
4. **Diagrama** — lista de arestas ou ASCII.

**Legenda das setas nos diagramas:**

```
A ── gatilho ──▶ B      transição normal (origem → destino)
A ◀───────────▶ B      transição em ambos os sentidos (laço reversível)
A ══════════▶ [T]       destino terminal (absorvente)
A ┄┄ exceção ┄▶ B      caminho de exceção (cancelamento/W.O./timeout/falha)
```

Convenção de nomes: **estados** em `MAIÚSCULA_SNAKE` (valor de enum); **commands** em `PascalCase` VerbNoun ([`./10-catalogo-de-commands.md`](./10-catalogo-de-commands.md)); **eventos** em `PascalCase` no passado ([`./12-context-map §5`](./12-context-map-e-blueprint.md)).

---

## 2. Máquina 1 — Mundo (`WorldStatus`)

**Enum canônico:** `WorldStatus` = `CREATING · ACTIVE · PAUSED · FINISHED · ARCHIVED` ([`schema.prisma:57`](../../prisma/schema.prisma), `GameWorld.status`). **Aggregate root:** `GameWorld` (contexto **C2 · Mundo/Temporada** — [`./12-context-map §3.1`](./12-context-map-e-blueprint.md)). **Dono de escrita:** operações administrativas do mundo ([`./09-operacao-e-admin-do-mundo.md`](./09-operacao-e-admin-do-mundo.md)).

### 2.1 Estados

| Estado | Significado | Runtime do mundo |
|--------|-------------|------------------|
| `CREATING` | Mundo em provisionamento: geração inicial (clubes, elencos, calendário, ruleset) ainda em curso. | relógio parado |
| `ACTIVE` | Mundo vivo: relógio corre, temporadas e partidas processam. | relógio corre |
| `PAUSED` | Mundo suspenso por decisão administrativa/manutenção (não é pausa de partida — ver §9). | relógio parado |
| `FINISHED` | Mundo encerrado definitivamente; nenhuma nova temporada inicia. | relógio parado |
| `ARCHIVED` | Mundo em **read-only** (histórico, títulos e recordes preservados; nenhuma partida nova roda). | terminal (reversível por admin) |

### 2.2 Transições

| # | Origem | Gatilho (command/evento) | Guarda (pré-condição) | Destino | Efeito (evento) |
|---|--------|--------------------------|------------------------|---------|-----------------|
| M1-1 | `CREATING` | `CreateWorld` conclui a seed (job de provisionamento) | geração inicial completa: clubes, elencos (R-57), calendário e `currentRuleSetVersionId` carimbados | `ACTIVE` | `WorldCreated` / `WorldActivated` |
| M1-2 | `ACTIVE` | `PauseWorld` (admin) | ator com autoridade de operação; sem partida `LIVE` bloqueante (drena runtime) | `PAUSED` | `WorldPaused` |
| M1-3 | `PAUSED` | `ResumeWorld` (admin) | ator com autoridade | `ACTIVE` | `WorldResumed` |
| M1-4 | `ACTIVE` | `FinishWorld` (admin) | decisão administrativa de encerramento | `FINISHED` | `WorldFinished` |
| M1-5 | `PAUSED` | `FinishWorld` (admin) | decisão administrativa de encerramento | `FINISHED` | `WorldFinished` |
| M1-6 | `FINISHED` | `ArchiveWorld` (admin / job entre temporadas) | **RATIFICADO (R-56):** mundo sem **nenhum** usuário ativo por **≥ 2 temporadas** consecutivas (ou abaixo do piso mínimo), avaliado **entre temporadas**, após **aviso prévio de 30 dias** | `ARCHIVED` | `WorldArchived` |
| M1-7 | `ARCHIVED` | `RestoreWorld` (admin, excepcional) | decisão administrativa reversa (R-56: read-only reversível) | `FINISHED`/`ACTIVE` | `WorldRestored` *(BASELINE RATIFICADA — reversão administrativa)* |

### 2.3 Terminais e exceções

- **Terminal:** `ARCHIVED` (absorvente na operação normal; **reversível** apenas por decisão administrativa excepcional — M1-7, BASELINE RATIFICADA R-56). `FINISHED` é quase-terminal (só sai por arquivar ou restaurar).
- **Arquivamento (R-56, BASELINE RATIFICADA):** o arquivamento é **manutenção rara**, não reset competitivo ([`01-mundo-persistente-e-clubes.md §1.1`](../01-game-design/01-mundo-persistente-e-clubes.md)); números conservadores evitam arquivar mundo ainda vivo e garantem janela de aviso.
- **Exceção — falha na seed:** `CREATING` que falha **não** vira `ACTIVE`; permanece `CREATING` (ou é descartado pelo provisionamento). Não há aresta `CREATING → PAUSED/FINISHED`.
- **Relação com a partida (§9):** `PAUSED` é estado **administrativo do mundo** — **jamais** disparado por um ponto de decisão de partida. Uma partida em `PAUSED_FOR_DECISION` **não** move `WorldStatus`.

### 2.4 Diagrama

```
[seed completa]                         [admin]
CREATING ── WorldCreated ──▶ ACTIVE ◀── ResumeWorld ── PAUSED
                              │  │           ▲   │
                    FinishWorld  └── PauseWorld ─┘   │
                              ▼                       │ FinishWorld
                          FINISHED ◀──────────────────┘
                              │  ▲
              ArchiveWorld    │  │ RestoreWorld (BASELINE RATIFICADA R-56)
              (BASELINE RATIFICADA R-56) ▼  │
                          [ARCHIVED]  (read-only, reversível)
```

**Estados: 5 · Transições: 7** (1 reversível ACTIVE↔PAUSED conta como M1-2/M1-3).

---

## 3. Máquina 2 — Temporada (3 camadas)

A auditoria (**B-03**) aponta a divergência: o GDD tem **7 fases narrativas**, o catálogo tem **6 estados de máquina** e o schema persiste **4 estados** (`SeasonStatus`). **Não é contradição — são três eixos distintos**, já reconciliados no dicionário ([`./11-dicionario-canonico.md §2.2`](./11-dicionario-canonico.md)). Esta máquina **alinha as três camadas** e define as transições.

**Aggregate root:** `Season` (contexto **C2**). **Enum persistido:** `SeasonStatus` = `PLANNED · ACTIVE · FINISHED · ARCHIVED` ([`schema.prisma:77`](../../prisma/schema.prisma)).

### 3.1 As três camadas e o mapeamento canônico

| Camada | Contagem | Valores | Papel | Fonte |
|--------|----------|---------|-------|-------|
| **A. Fase narrativa** (`SeasonPhase`) | **7** | `preseason · start · mid · runIn · end · postseason · newSeason` | destrava tipos de evento; ritmo narrativo; dirigida por **marcos do calendário** | [`06-temporada §1`](../01-game-design/06-temporada-e-competicoes.md) |
| **B. Estado de máquina** (ciclo de vida) | **6** | `PLANNING → REGISTRATION → IN_PROGRESS → FINALIZING → OFF_SEASON → COMPLETED` | referência de ciclo de vida (não persistida) | [`05-catalogo §3.2`](./05-catalogo-de-regras-e-formulas.md) |
| **C. Estado persistido** (`SeasonStatus`) | **4** | `PLANNED · ACTIVE · FINISHED · ARCHIVED` | **coluna gravada** no banco (vence para persistência) | [`schema.prisma`](../../prisma/schema.prisma) |

**Mapa canônico B→C** (declarado no dicionário): `PLANNING`/`REGISTRATION` → **`PLANNED`** · `IN_PROGRESS` → **`ACTIVE`** · `FINALIZING`/`OFF_SEASON` → **`FINISHED`** · `COMPLETED` → **`ARCHIVED`**.

**Mapa A→B** (fase narrativa → estado de máquina): `preseason` → `PLANNING`+`REGISTRATION` · `start`/`mid`/`runIn` → `IN_PROGRESS` · `end` → `FINALIZING` · `postseason` → `OFF_SEASON` · `newSeason` → `COMPLETED` (e bootstrap da próxima `Season` em `PLANNED`).

### 3.2 Estados (camada de máquina, com projeção para `SeasonStatus`)

| Estado de máquina | `SeasonStatus` projetado | Significado |
|-------------------|--------------------------|-------------|
| `PLANNING` | `PLANNED` | Definição de competições, formatos e calendário. |
| `REGISTRATION` | `PLANNED` | Inscrição de clubes, licenciamento (§15.1), ajustes de elenco pré-temporada. |
| `IN_PROGRESS` | `ACTIVE` | Temporada em curso; rodadas e partidas disputadas. |
| `FINALIZING` | `ACTIVE`→`FINISHED` | Encerramento esportivo, apuração, homologação, promoção/rebaixamento, premiação. |
| `OFF_SEASON` | `FINISHED` | Entre temporadas: aposentadorias, geração de jogadores, mercado. |
| `COMPLETED` | `ARCHIVED` | Temporada concluída; estado consistente para a próxima. |

### 3.3 Transições

| # | Origem | Gatilho (command/evento) | Guarda | Destino | Efeito · `SeasonStatus` |
|---|--------|--------------------------|--------|---------|--------------------------|
| S2-1 | `PLANNING` | `GenerateSeason` conclui competições/calendário | formatos e calendário-âncora definidos | `REGISTRATION` | `SeasonPlanned` · `PLANNED` |
| S2-2 | `REGISTRATION` | marco de calendário: **1ª rodada oficial** | inscrições e licenças fechadas (§15) | `IN_PROGRESS` | `SeasonStarted` · `PLANNED→ACTIVE` |
| S2-3 | `IN_PROGRESS` | marco: **última rodada** disputada | todas as partidas obrigatórias jogadas (ou resolvidas por W.O./adiamento) | `FINALIZING` | `SeasonRunInEnded` · `ACTIVE` |
| S2-4 | `FINALIZING` | **SAGA-02** conclui apuração + homologação | **todas as competições relevantes homologadas** (§14.1); INV-5 satisfeito | `OFF_SEASON` | `SeasonSportingClosed` · `ACTIVE→FINISHED` |
| S2-5 | `OFF_SEASON` | **SAGA-02** gera calendário seguinte (passo 18 do checklist) | aging/aposentadoria + safra aplicados; fechamento financeiro concluído | `COMPLETED` | `SeasonCompleted` · `FINISHED→ARCHIVED` |
| S2-6 | `COMPLETED` | bootstrap da próxima temporada | mundo `ACTIVE` (M1) | nova `Season` em `PLANNING`/`PLANNED` | `SeasonBootstrapped` |

### 3.4 A virada = SAGA-02 (aponta ao passo 10)

As transições **S2-4 e S2-5** (o "motor de virada", checklist de ~20 passos) **não são atômicas** — cruzam C2 (orquestra), C7 (edições/fixtures), C9 (fechamento financeiro), C4 (aging/aposentadoria + safra) e C3 (metas/orçamento). Portanto **são a SAGA-02 · Virada de temporada**, cujos estados internos são:

```
REQUESTED → PREPARING → VALIDATING → FREEZING_INPUTS → CALCULATING
         → APPLYING_RESULTS → VERIFYING → COMPLETED
```

Estados, timeouts, checkpoints (retoma sem duplicar promoção/prêmio/geração), compensações e terminais da SAGA-02 são detalhados no **passo 10** ([`./12-context-map §6.3`](./12-context-map-e-blueprint.md); gatilho: job `season:check-start-end` / `SeasonDue`). Esta máquina fixa **quando** a saga roda (dentro de `FINALIZING`→`OFF_SEASON`→`COMPLETED`), não o seu interior.

### 3.5 Terminais e exceções

- **Terminal:** `COMPLETED` (→ `ARCHIVED` persistido). Linha **linear, sem retorno**: `PLANNED→ACTIVE→FINISHED→ARCHIVED` nunca reverte (dicionário §2.2).
- **Exceção — falha na virada:** falha em S2-4/S2-5 **não** conclui a temporada; a SAGA-02 entra em `COMPENSATING`/`MANUAL_REVIEW` e **retoma do checkpoint** (idempotência: não duplica promoção/prêmio/geração). Ver **C-10** (ordem normativa: homologar antes de pagar) — a ordem interna é fixada no passo 10.
- **Exceção — continuidade sazonal:** lesões e tratamentos **não** zeram na virada ([`02-jogadores §16`](../01-game-design/02-sistema-de-jogadores.md)); a máquina de medicina (§6) atravessa a fronteira de temporada.
- **RATIFICADO (R-58):** a **duração de cada fase** (frações da temporada) é valor de balanceamento; não altera a topologia da máquina, só os marcos de disparo.

### 3.6 Diagrama (camadas alinhadas)

```
Fase narrativa:  preseason ─────────▶ start/mid/runIn ─▶ end ──────▶ postseason ─▶ newSeason
                     │                        │            │             │            │
Estado máquina:  PLANNING → REGISTRATION → IN_PROGRESS → FINALIZING → OFF_SEASON → COMPLETED
                     │           │             │            │             │            │
SeasonStatus:    PLANNED ─────── PLANNED ───▶ ACTIVE ───▶ ACTIVE→FINISHED ─ FINISHED ─▶ ARCHIVED
                                                          └──── SAGA-02 (virada) ────┘   (terminal)
```

**Estados: 6 (máquina) / 4 (persistidos) / 7 (fases) · Transições: 6** (+ interior da SAGA-02 no passo 10).

---

## 4. Máquina 3 — Competição (edição)

Uma **edição** de competição (`CompetitionSeason`) tem ciclo de vida próprio, mais curto que a temporada administrativa (§14). O pedido — *agendada → em andamento → fase de mata-mata → homologada* — mapeia para o enum persistido `SeasonStatus` (reusado por `CompetitionSeason.status`), com a **fase de mata-mata modelada como avanço de `CompetitionStage`**, não como novo status.

**Aggregate roots:** `CompetitionSeason` (edição), `CompetitionStage`, `Standings`/`ClubSeasonStats` (contexto **C7 · Competição/Calendário**). **Enum persistido:** `SeasonStatus` (`CompetitionSeason.status`, [`schema.prisma:1188`](../../prisma/schema.prisma)).

### 4.1 Estados

| Estado (pedido) | `SeasonStatus` | Significado |
|-----------------|----------------|-------------|
| **Agendada** | `PLANNED` | Edição criada, clubes alocados (`CompetitionClub`), calendário e estágios definidos. |
| **Em andamento** | `ACTIVE` | Rodadas/fases sendo disputadas. Inclui **fase de grupos/liga** e **fase de mata-mata** (sub-máquina de `CompetitionStage`). |
| **Homologada** | `FINISHED` | Homologação §14.1 concluída; tabela e classificação oficiais; acessos/rebaixamentos confirmados. |
| (arquivada) | `ARCHIVED` | Encerrada junto com a temporada (SAGA-02). |

**Sub-máquina de estágio** (`CompetitionStage`, por `order`) — só para formatos com mata-mata (`KNOCKOUT`, `GROUPS_AND_KNOCKOUT`):

```
[grupos/liga] ──▶ [oitavas] ──▶ [quartas] ──▶ [semifinal] ──▶ [final]
```

### 4.2 Transições

| # | Origem | Gatilho | Guarda | Destino | Efeito (evento) |
|---|--------|---------|--------|---------|-----------------|
| C3-1 | `PLANNED` | abertura da 1ª partida da edição | clubes inscritos; **licença concedida** (§15.1); estágios semeados | `ACTIVE` | `CompetitionStarted` |
| C3-2 | `ACTIVE` (fase grupos/liga) | fim da fase; classificados definidos | **desempate calculado** (`tiebreakers` ordenados); seeds do bracket definidos | `ACTIVE` (fase mata-mata) | `StageAdvanced` / `KnockoutBracketSeeded` |
| C3-3 | `ACTIVE` (mata-mata) | avanço de estágio (`CompetitionStage.order+1`) | confronto decidido (agregado/pênaltis conforme `ChampionshipRules`: `legs`, `awayGoalRule`, `extraTime`, `penalties`) | `ACTIVE` (próximo estágio) | `StageAdvanced` |
| C3-4 | `ACTIVE` | todas as partidas obrigatórias concluídas → **apuração** | pendências resolvidas; recursos tratados; punições aplicadas; desempate calculado; classificação consistente (§14.1) | `FINISHED` (homologada) | `CompetitionHomologated` |
| C3-5 | `FINISHED` | virada de temporada (SAGA-02, S2-5) | temporada em `OFF_SEASON`/`COMPLETED` | `ARCHIVED` | `CompetitionArchived` |

### 4.3 Título provisório × oficial, desempate, acesso/rebaixamento

- **Título provisório × oficial (§14.2):** o jogo **celebra o campeão em campo** (título provisório) **antes** de `FINISHED`; o **registro histórico oficial aguarda a homologação** (C3-4). Isso corresponde, no nível de cada partida, à `HomologationStatus` (§8.3): `PROVISIONAL` → `HOMOLOGATED`. Enquanto não homologada, uma **correção** altera tabela/prêmio/classificação livremente.
- **Desempate:** a lista ordenada `tiebreakers` (`pontos → nº de vitórias → saldo → gols marcados → confronto direto → fair play → sorteio`) é aplicada **na homologação** (C3-4) para fechar a tabela. Cada regulamento pode reordenar/omitir (`ChampionshipRules`).
- **Acesso/rebaixamento — gate condicional:** a posição esportiva final **não confirma automaticamente** acesso e rebaixamento. A confirmação (dentro de C3-4) **pode depender de licença, recursos e decisões administrativas** (§15.1): um clube pode ganhar a vaga em campo e **não ser confirmado** (impedimento/rebaixamento administrativo). Modela-se como **guarda extra** de C3-4 sobre o resultado de cada clube.

### 4.4 Terminais e exceções

- **Terminal:** `ARCHIVED` (a edição segue a temporada). `FINISHED` é o estado oficial estável; só reabre por rito de correção (§8.3, `UNDER_APPEAL`/`OVERTURNED`).
- **Exceção — W.O./partida anulada:** um resultado `WALKOVER`/`CANCELLED`/`ABANDONED` (§8.2) alimenta a classificação conforme o regulamento; não trava a edição, mas pode adiar a homologação até resolução.
- **Exceção — recurso pós-homologação:** reabrir exige rito (nova versão do registro, preserva anterior — §14.2), refletido em `HomologationStatus: HOMOLOGATED → UNDER_APPEAL → {HOMOLOGATED, OVERTURNED}` (§8.3).
- **RATIFICADO (R-59):** `reputationWeight`/`financialWeight` por tipo de campeonato (efeito de reputação/receita na virada) são valores de balanceamento; não alteram a topologia.

### 4.5 Diagrama

```
                         ┌───────── sub-máquina de estágio (mata-mata) ─────────┐
[agendada]               │  grupos/liga → oitavas → quartas → semi → final       │
 PLANNED ── C3-1 ──▶ ACTIVE ══(C3-2/C3-3 avanço de CompetitionStage)══▶ ACTIVE   │
                         └───────────────────────────────────────────────────────┘
                              │  apuração + homologação (§14.1)  ┌ guarda: licença/recurso/adm
                              ▼  C3-4 ─────────────────────────── (acesso/rebaixamento confirmado)
                          FINISHED (homologada) ── C3-5 (SAGA-02) ──▶ [ARCHIVED]
                              ▲
                              └┄ correção/recurso ┄ HomologationStatus: UNDER_APPEAL → OVERTURNED (§8.3)
```

**Estados: 4 (persistidos) + sub-máquina de estágio · Transições: 5** (+ recursos via `HomologationStatus`).

---

## 5. Máquina 4 — Pessoa, carreira e disponibilidade do jogador

**Modelo normativo — R-157:** três eixos independentes: `PersonStatus` (`ALIVE · DECEASED · ANONYMIZED`), `PlayerCareerStatus` (`ACADEMY · PROFESSIONAL · RETIRED`) e `PlayerAvailabilityStatus`, que registra **causas combináveis** (`INJURED`, `SUSPENDED`, `CALLED_UP`, `OTHER_UNAVAILABLE`; apto quando nenhuma causa bloqueia). **Aggregate root:** `Player`/`Person` (contexto C4). O enum físico legado `PlayerStatus = ACTIVE · INJURED · SUSPENDED · FREE_AGENT · RETIRED` é uma projeção temporária da baseline pré-migration e deve ser substituído no gate DB-01..DB-16; não é fonte normativa. `FREE_AGENT` deriva da ausência de contrato/inscrição, não é estado da pessoa, carreira ou disponibilidade.

As tabelas P4 abaixo preservam os nomes legados para rastrear eventos existentes, mas devem ser lidas como **adição/remoção de causa de indisponibilidade** e mudança separada de carreira. Lesão e suspensão podem coexistir; remover uma causa não torna o atleta apto enquanto outra permanecer.

### 5.1 Eixo de disponibilidade (projeção legada `PlayerStatus`)

| Estado | Significado |
|--------|-------------|
| `ACTIVE` | Sob contrato, disponível para escalação. |
| `INJURED` | Lesionado; conduzido pela **máquina de medicina** (§6). |
| `SUSPENDED` | Suspenso (cartões/punição); indisponível por N partidas. |
| `FREE_AGENT` | Sem contrato ativo (INV-1: 1 contrato ativo/jogador). |
| `RETIRED` | Aposentado. **Terminal** (INV-4: aposentado não escala). |

**Transições (eixo A):**

| # | Origem | Gatilho (command/evento) | Guarda | Destino | Efeito |
|---|--------|--------------------------|--------|---------|--------|
| P4-1 | `ACTIVE` | `PlayerInjured` (partida F13 / treino) → confirmação de diagnóstico | lesão diagnosticada (§6, EXAMS→DIAGNOSIS) | `INJURED` | `PlayerInjured` |
| P4-2 | `INJURED` | alta médica + decisão esportiva | `DISCHARGE` na máquina de medicina (§6, liberação competitiva) | `ACTIVE` | `PlayerRecovered` |
| P4-3 | `ACTIVE` | expulsão/acúmulo de cartões → punição | suspensão aplicada pela competição | `SUSPENDED` | `PlayerSuspended` |
| P4-4 | `SUSPENDED` | suspensão cumprida | N partidas cumpridas | `ACTIVE` | `SuspensionServed` |
| P4-5 | `ACTIVE` | contrato expira / rescisão (`ContractStatus: EXPIRED/TERMINATED`) | sem contrato ativo (INV-1) | `FREE_AGENT` | `ContractEnded` |
| P4-6 | `FREE_AGENT` | `SignContract` | novo `PlayerContract ACTIVE`; janela/inscrição (§15) | `ACTIVE` | `ContractSigned` |
| P4-7 | `ACTIVE`/`INJURED`/`FREE_AGENT`/`SUSPENDED` | `RetirePlayer` (aposentadoria confirmada — eixo B) ou aposentadoria médica (§6) | processo de aposentadoria confirmado | `RETIRED` | `PlayerRetired` |

> **Nota (INV-1/R-157/R-158):** lesão e suspensão são compatíveis entre si e com contrato ativo. `FREE_AGENT` é uma condição derivada da ausência de contrato primário ativo, e um agente livre pode manter uma causa médica de indisponibilidade. Transições P4-1/P4-3 adicionam causas; P4-2/P4-4 removem apenas a causa correspondente.

### 5.2 Eixo B — ciclo de carreira (base → profissional → aposentadoria)

**"Geração ≠ promoção"** (§17): surgir no mundo (geração, `PlayerGenerationSource`) **não** é o mesmo que chegar ao profissional. Estágios:

| Estágio | Modelagem | Significado |
|---------|-----------|-------------|
| `GENERATED_YOUTH` | `PlayerGenerationSource ∈ {YOUTH_ACADEMY, …}`; `SquadType=YOUTH` / `SquadCategory=YOUTH_ACADEMY` | Jovem na base; pode ficar anos antes de subir. |
| `PROMOTED_PRO` | `SquadCategory=FIRST_TEAM` | Promovido ao elenco principal. |
| `RETIRING` | estados de aposentadoria narrativos (§17): `considerada → anunciada → adiada → confirmada → imposta(médica)` | Encerramento contextual de carreira. |
| `RETIRED` | `PlayerStatus=RETIRED` | Fim da carreira de atleta (terminal, eixo A). |
| *(pós-carreira)* | `Person` persiste → vira `StaffMember` (contexto **C5**) | Identidade e memória sobrevivem (pessoa ≠ carreira). **Fora do escopo desta máquina** — ver [`04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md). |

**Transições (eixo B):**

| # | Origem | Gatilho | Guarda | Destino | Efeito |
|---|--------|---------|--------|---------|--------|
| P4B-1 | (não existe) | `PlayerGenerated` | origem válida (INV-6) | `GENERATED_YOUTH` | `PlayerGenerated` |
| P4B-2 | `GENERATED_YOUTH` | `PromotePlayer` (base→profissional) | elegibilidade de promoção; proteção de menores (§17) | `PROMOTED_PRO` | `PlayerPromoted` |
| P4B-3 | `GENERATED_YOUTH` | empréstimo / mudança de clube / liberação / desistência | — | permanece base / sai do clube / encerra busca | `YouthReleased` / `LoanStarted` |
| P4B-4 | `PROMOTED_PRO` | aposentadoria contextual inicia | idade/condição/lesão/motivação/contrato (§17) | `RETIRING` | `RetirementConsidered` |
| P4B-5 | `RETIRING` | aposentadoria **confirmada** ou **imposta (médica)** | confirmação (ou avaliação médica excepcional, §6) | `RETIRED` (eixo A, P4-7) | `PlayerRetired` |
| P4B-6 | `RETIRING` | aposentadoria **adiada** | jogador decide seguir | `PROMOTED_PRO` | `RetirementPostponed` |

### 5.3 Terminais e exceções

- **Terminal da carreira de atleta:** `PlayerCareerStatus=RETIRED`. **INV-4:** aposentado jamais é escalado. A `Person` continua existente e pode virar funcionário; isso não reverte a carreira de jogador.
- **Exceção — recaída médica:** `INJURED → ACTIVE` (P4-2) pode reverter para `INJURED` por **recaída** (§6, `RELAPSE`) se o retorno for forçado antes da liberação competitiva.
- **Exceção — aposentadoria adiada:** `RETIRING` **não** é terminal; pode voltar a `PROMOTED_PRO` (P4B-6). Só `RETIRED` é absorvente.
- **Exceção — geração médica:** aposentadoria imposta por lesão grave exige **avaliação + diagnóstico + risco + confirmação** (§17/§6) — não é automática.

### 5.4 Diagrama (eixo A)

```
                 P4-3 suspensão            P4-1 lesão (§6)
        ┌────────────────────────┐   ┌────────────────────────┐
        ▼                        │   ▼                        │
   SUSPENDED ── P4-4 cumprida ──▶ ACTIVE ◀── P4-2 alta médica ── INJURED
                                  │  ▲                            │
                     P4-5 contrato│  │P4-6 SignContract           │ P4-7 aposentadoria médica
                        expira    ▼  │                            ▼
                             FREE_AGENT                    ══════════════▶ [RETIRED]  ◀── P4-7 (qualquer estado)
                                  │                                              (terminal, INV-4)
                                  └───────────────── P4-7 ──────────────────────────┘
```

**Estados: 5 (eixo A) + 4 (eixo B) · Transições: 7 (A) + 6 (B) = 13.**

---

## 6. Máquina 5 — Medicina / Lesão

Sub-máquina que governa a transição `ACTIVE ↔ INJURED` do jogador (§5). Formaliza o subsistema médico ([`02-jogadores §16`](../01-game-design/02-sistema-de-jogadores.md)): **avaliação → exames/diagnóstico → reabilitação (7 estágios) → retorno ao treino → retorno competitivo → alta / recaída**. **Aggregate root:** `PlayerInjury` (contexto **C4**, [`schema.prisma:894`](../../prisma/schema.prisma): `severity`, `expectedReturnAt`, `recoveredAt`, `medicalDepartmentLevelAtTime`). Enum de gravidade: `InjurySeverity` = `MINOR · LIGHT · MODERATE · SERIOUS · CRITICAL`.

### 6.1 Estados

| Estado | Fonte (§16) | `PlayerStatus` | Significado |
|--------|-------------|----------------|-------------|
| `EVALUATION` | suspeita inicial | `ACTIVE`/pendente | Sinal/dor detectado; avaliação preliminar. |
| `EXAMS` | exames | `INJURED` | Exames em curso. |
| `DIAGNOSIS` | diagnóstico, gravidade, faixa de recuperação, risco | `INJURED` | Diagnóstico real definido (`severity`, `expectedReturnAt`); **estimativa pode mudar**. |
| `REHAB_S1…S7` | reabilitação progressiva (7 estágios) | `INJURED` | Reabilitação ordenada — ver 6.2. |
| `RETURN_TO_TRAINING` | retorno ao treino (≠ liberação médica) | `INJURED` | Entra em `REHAB_S4` (treino individual); ainda não liberado para jogo. |
| `COMPETITIVE_RETURN` | liberação competitiva | `INJURED`→`ACTIVE` | `REHAB_S7` concluído; apto, sujeito à decisão esportiva. |
| `DISCHARGE` | alta (`recoveredAt`) | `ACTIVE` | Episódio encerrado; volta à disponibilidade (P4-2). |
| `RELAPSE` | recaída | `INJURED` | Retorno forçado/precoce gerou recaída; reentra em estágio anterior. |
| `MEDICAL_RETIREMENT` | aposentadoria médica (§17) | `RETIRED` | **Terminal**; exige avaliação + diagnóstico + risco + confirmação. |

**Os 7 estágios de reabilitação (`REHAB_S1…S7`), ordenados e obrigatórios (§16):**

```
S1 Controle da dor → S2 Recuperação de movimento → S3 Fortalecimento
→ S4 Treino individual → S5 Treino parcial → S6 Treino completo → S7 Liberação competitiva
```

- **"Retorno ao treino"** = entrada em **S4** (treino individual). **"Retorno competitivo"** = **S7** (liberação competitiva).
- A liberação médica (S7) **não garante ritmo nem confiança**: o retorno em campo ainda pondera risco, carga, minutos previstos, importância da partida e decisão esportiva.

### 6.2 Transições

| # | Origem | Gatilho | Guarda | Destino | Efeito |
|---|--------|---------|--------|---------|--------|
| MED-1 | (nenhum) | evento de lesão (partida F13 `p_lesão` / treino / desgaste) | sinal/dor detectado | `EVALUATION` | `InjurySuspected` |
| MED-2 | `EVALUATION` | solicitar exames | comissão médica disponível | `EXAMS` | `MedicalExamOrdered` |
| MED-3 | `EXAMS` | resultado dos exames | — | `DIAGNOSIS` | `InjuryDiagnosed` · `PlayerStatus→INJURED` (P4-1) |
| MED-4 | `DIAGNOSIS` | iniciar tratamento/reabilitação | plano de tratamento definido | `REHAB_S1` | `RehabStarted` |
| MED-5 | `REHAB_Sn` | progресso de estágio | critério clínico do estágio cumprido | `REHAB_S(n+1)` | `RehabStageAdvanced` |
| MED-6 | `REHAB_S3→S4` | (mesma MED-5) | — | `RETURN_TO_TRAINING` (=`REHAB_S4`) | `ReturnedToTraining` |
| MED-7 | `REHAB_S7` | liberação competitiva | S7 concluído | `COMPETITIVE_RETURN` | `MedicallyCleared` (server-side) |
| MED-8 | `COMPETITIVE_RETURN` | decisão esportiva de retorno | alta confirmada | `DISCHARGE` | `PlayerRecovered` · `recoveredAt` set · `PlayerStatus→ACTIVE` (P4-2) |
| MED-9 | `DIAGNOSIS` | nova informação clínica | estimativa revista (§16: "pode mudar") | `DIAGNOSIS` (re-estima) / `EXAMS` | `DiagnosisRevised` |

### 6.3 Terminais e exceções

- **Terminal do episódio:** `DISCHARGE` (não terminal para o jogador — devolve o controle à máquina P4 em `ACTIVE`).
- **Terminal absoluto:** `MEDICAL_RETIREMENT` (→ `RETIRED`, INV-4).
- **Exceção — recaída (`RELAPSE`):** forçar o retorno **antes** de `S7` (ou assumir risco além do limite) pode gerar recaída ([`02-jogadores §16`](../01-game-design/02-sistema-de-jogadores.md) / §9 cadeia de reversão): `RETURN_TO_TRAINING`/`COMPETITIVE_RETURN`/`DISCHARGE` ┄▶ `RELAPSE` ┄▶ reentra em `EVALUATION`/`EXAMS`/estágio anterior; a gravidade **pode aumentar**.
- **Exceção — aposentadoria médica:** de `DIAGNOSIS`/`REHAB_S*` com lesão grave ┄▶ `MEDICAL_RETIREMENT` (exige rito de confirmação, §17).
- **Exceção — dor/fadiga sem lesão:** jogador **disponível** (`PlayerStatus=ACTIVE`) com dor leve/fadiga/risco aumentado e **limite de minutos** — **não** entra nesta máquina (não há `PlayerInjury`); é condição de estado (E1: `fatigue`), não episódio médico.
- **Continuidade sazonal:** o episódio **atravessa a virada** de temporada sem reiniciar (§3.5).
- **Confidencialidade (4 camadas):** o **diagnóstico real** ≠ o que a comissão vê ≠ o que é público ≠ o que o mercado infere — relevante para o exame médico da transferência (§7).
- **BASELINE RATIFICADA:** geração da lesão via `p_lesão` (F13) = **R-21**; `riscoMédico` 0–100 e limiares de resultado do exame = **R-48** (usado também em §7).

### 6.4 Diagrama

```
[lesão: F13/treino]
 EVALUATION ── MED-2 ──▶ EXAMS ── MED-3 ──▶ DIAGNOSIS ──MED-4──▶ REHAB_S1─S2─S3
                          ▲  ┌── MED-9 (re-estima) ──┘                    │ MED-5
                          └──┘                                            ▼
                                          RETURN_TO_TRAINING = REHAB_S4 ─ S5 ─ S6 ─ S7
                                                    │                              │ MED-7
                                                    │                              ▼
                                                    │                     COMPETITIVE_RETURN
                                                    │                              │ MED-8 (alta)
                              ┄ RELAPSE (retorno forçado) ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄     ▼
                              ▲                                              ┄▶  [DISCHARGE] → ACTIVE (P4-2)
                              └┄┄ reentra em estágio anterior
   DIAGNOSIS/REHAB (grave) ┄┄ aposentadoria médica ┄┄▶ [MEDICAL_RETIREMENT] → RETIRED (terminal)
```

**Estados: 9 (incluindo 7 sub-estágios de reabilitação) · Transições: 9 (+ recaída e aposentadoria médica como exceções).**

---

## 7. Máquina 6 — Transferência (`TransferStatus` → SAGA-01)

**Enum canônico:** `TransferStatus` = `LISTED · NEGOTIATING · ACCEPTED · REJECTED · CANCELLED · COMPLETED · EXPIRED` ([`schema.prisma:173`](../../prisma/schema.prisma); usado por `TransferListing.status` e `Offer.status`). **Aggregate roots:** `TransferListing`, `TransferCase`/`Offer`, `TransferAgreement` (contexto **C6 · Mercado/Contratos**).

A **máquina persistida (7 estados)** é a visão grossa. O **processo completo** (§17: consulta → proposta → contraproposta → acordo → jogador → **exame médico** → registro → pagamento → conclusão) **cruza C6/C9/C4/C7** e é a **SAGA-01 · Transferência** — cujo interior (reservar orçamento → aceitar → negociar contrato → exame → registrar → liquidar → concluir), timeouts, compensações e terminais são detalhados no **passo 10** ([`./12-context-map §6.3`](./12-context-map-e-blueprint.md)).

### 7.1 Estados

| Estado | Significado |
|--------|-------------|
| `LISTED` | Jogador listado no mercado (`ListPlayer`); janela de recepção de ofertas. |
| `NEGOTIATING` | Oferta ativa; vaivém de propostas/contrapropostas (versões preservadas, §17.2). |
| `ACCEPTED` | Acordo entre clubes fechado (`AcceptOffer`); **dispara SAGA-01**. |
| `COMPLETED` | Transferência concluída (`SignTransfer`): exame + contrato + registro + liquidação. **Terminal (sucesso).** |
| `REJECTED` | Oferta recusada. **Terminal (falha).** |
| `CANCELLED` | Negócio cancelado (desistência / exame reprova / falta de recursos). **Terminal (falha).** |
| `EXPIRED` | Prazo/janela esgotada sem acordo (`expiresAt`). **Terminal (falha).** |

### 7.2 Transições

| # | Origem | Gatilho (command/evento) | Guarda | Destino | Efeito |
|---|--------|--------------------------|--------|---------|--------|
| T6-1 | (não listado) | `ListPlayer` | ator é o clube detentor; contrato ativo | `LISTED` | `PlayerListed` |
| T6-2 | `LISTED` | `MakeOffer` / oferta recebida | oferta válida; não expirada | `NEGOTIATING` | `OfferReceived` |
| T6-2b | (sem listagem) | `MakeOffer` direto | `Offer` default `NEGOTIATING` | `NEGOTIATING` | `OfferReceived` |
| T6-3 | `NEGOTIATING` | `AcceptOffer` | termos aceitos por ambos os clubes; **orçamento reservado** (`FinanceReservationPort`, C9); aval do jogador quando exigido | `ACCEPTED` | **`TransferAgreementReached`** → dispara **SAGA-01** |
| T6-4 | `ACCEPTED` | `SignTransfer` (conclusão da SAGA-01) | **exame aprovado (server-side)**; contrato assinado; janela/inscrição (§15); **liquidação financeira** concluída | `COMPLETED` | `TransferCompleted` · `ContractStatus` antigo→`TRANSFERRED` · novo `PlayerContract ACTIVE` |
| T6-5 | `NEGOTIATING` | `RejectOffer` | recusa da parte receptora | `REJECTED` | `OfferRejected` |
| T6-6 | `LISTED`/`NEGOTIATING` | `UnlistPlayer` / desistência | ator com direito de retirar | `CANCELLED` | `TransferCancelled` |
| T6-7 | `LISTED`/`NEGOTIATING` | timeout (`expiresAt` / janela fecha) | prazo esgotado | `EXPIRED` | `TransferExpired` |
| T6-8 | `ACCEPTED` | falha na SAGA-01 (exame reprova / contrato falha / sem recursos) | **compensação** da SAGA-01 | `CANCELLED` | `TransferCancelled` (libera reserva, cancela acordo pendente, reverte inscrição) |
| T6-9 | `ACCEPTED` | exame **"alterar termos"** (§17.3) | achado médico reabre negociação | `NEGOTIATING` | `TransferTermsRevised` |

### 7.3 Exame médico como etapa (§17.3) — sub-decisão de T6-4

Dentro da SAGA-01, entre `ACCEPTED` e `COMPLETED`, o **exame médico é etapa com poder de decisão** (não carimbo). Resultados (**BASELINE RATIFICADA — R-48**, `riscoMédico` 0–100):

| Resultado do exame | `riscoMédico` (R-48) | Efeito na máquina |
|--------------------|----------------------|-------------------|
| **aprovar** | `< 30` | prossegue → `COMPLETED` (T6-4) |
| **aprovar com risco** | `30–54` | prossegue (reduz valor de mercado) → `COMPLETED` |
| **solicitar avaliação adicional** | `55–74` | **trava** a conclusão até novo exame (permanece `ACCEPTED`) |
| **reprovar** | `≥ 75` | derruba → `CANCELLED` (T6-8) |
| **alterar termos** | (paralelo a "aprovar com risco") | reabre → `NEGOTIATING` (T6-9) |

> **C-07 (crítico):** `medicalCleared` **não** pode vir do payload do cliente — a **liberação médica é server-side** (evento `MedicallyCleared` de §6, MED-7). E há **caminho único de contrato**: `SignTransfer` conclui a transferência; `SignContract` cobre o vínculo — não podem ambos criar vínculo (evitar contrato duplicado). Fixado no passo 10 (SAGA-01).

### 7.4 Terminais e exceções

- **Terminais:** `COMPLETED` (sucesso) · `REJECTED` · `CANCELLED` · `EXPIRED` (falhas). Nenhum reverte.
- **Registro ≠ assinatura (§17.5):** `COMPLETED` **não garante** que o jogador jogue já — elegibilidade (janela, inscrição, vaga, licença, limites) é validada e **congelada na preparação pré-jogo** (§8.1, `PRE_MATCH`), não no pagamento. O custo é imediato; o benefício esportivo pode ser adiado.
- **Etapas não somem silenciosamente (§17.6):** em qualquer falha, compromissos já assumidos (parcela devida, comissão acionada, reserva a liberar) são **tratados pela compensação da SAGA-01**, não descartados.
- **Opção × obrigação de compra (§17.4 / ECO-017):** obrigação acionada vira dívida independente de caixa — `LoanPurchaseClauseType = OBLIGATION_TO_BUY` dispara uma **nova** transferência (a **SAGA-05 · Empréstimo** faz a ponte). Opção depende de exercício válido.

### 7.5 Diagrama

```
                       T6-2 oferta                T6-3 AcceptOffer + reserva (C9)
 (não listado) ─T6-1─▶ LISTED ─────────▶ NEGOTIATING ═══════════════════════▶ ACCEPTED
                          │  ▲                 │  │  ▲                            │ │
              T6-7 timeout│  └─ T6-9 alterar ──┘  │  └── T6-9 (exame reabre) ─────┘ │
                          ▼      termos           │ T6-5 RejectOffer                │ T6-4 SignTransfer
                      [EXPIRED]                   ▼                                 │ (exame server-side +
                          ▲  T6-6 desistência  [REJECTED]                           │  contrato + registro
                          └──────────────────────────────────── T6-6/T6-8 ──▶ [CANCELLED]  + liquidação)
                                                                                    ▼
                                                    ┌──── SAGA-01 (passo 10) ───▶ [COMPLETED]
```

**Estados: 7 · Transições: 9 (+ sub-decisão do exame com 5 saídas) · fluxo completo = SAGA-01 (passo 10).**

---

## 8. Máquina 7 — Partida (runtime × resultado × homologação)

A partida usa **três enums ortogonais** — o antigo `MatchStatus` único foi desmembrado ([`./11-dicionario-canonico.md §2.3`](./11-dicionario-canonico.md), [`schema.prisma:214`](../../prisma/schema.prisma)):

- **`MatchRuntimeStatus`** (ciclo de vida) = `SCHEDULED · PRE_MATCH · LIVE · PAUSED_FOR_DECISION · FINISHED · PROCESSED`
- **`MatchResultStatus`** (desfecho) = `PENDING · NORMAL · WALKOVER · CANCELLED · ABANDONED`
- **`HomologationStatus`** (confirmação oficial) = `PENDING · PROVISIONAL · HOMOLOGATED · UNDER_APPEAL · OVERTURNED`

**Aggregate roots:** `Match`, `MatchRuntime`, `MatchSimulation` (contexto **C8 · Partida/Runtime**). Os três status vivem em `Match` ([`schema.prisma:1245-1247`](../../prisma/schema.prisma)).

### 8.1 Runtime — `MatchRuntimeStatus`

| Estado | Significado |
|--------|-------------|
| `SCHEDULED` | Agendada no calendário; não iniciada. |
| `PRE_MATCH` | Escalações/táticas confirmadas; **elegibilidade validada e congelada** (§17.5). |
| `LIVE` | Em andamento, simulada em ticks pequenos (≈1 min/tick). |
| `PAUSED_FOR_DECISION` | **Janela de decisão** do runtime desta partida (ver §9). Retorna a `LIVE`. |
| `FINISHED` | Encerrada; resultado definido. |
| `PROCESSED` | Consequências aplicadas (classificação, físico/mental, finanças, eventos). **Terminal.** |

**Transições (runtime):**

| # | Origem | Gatilho (command/evento) | Guarda | Destino | Efeito |
|---|--------|--------------------------|--------|---------|--------|
| MR-1 | `SCHEDULED` | `SetLineup`/`SetTactics` confirmados | escalação válida; elegibilidade OK (§15) | `PRE_MATCH` | `LineupsLocked` |
| MR-2 | `PRE_MATCH` | kickoff (job de início) | ambos os times prontos (ou plano offline) | `LIVE` | `MatchStarted` |
| MR-3 | `LIVE` | ponto de decisão aberto (F17 `decisionScore>70`) | há decisão relevante; **janela do runtime** ativa | `PAUSED_FOR_DECISION` | `DecisionPointOpened` |
| MR-4 | `PAUSED_FOR_DECISION` | `ResolveDecisionPoint` / `SubmitMatchDecision` **ou timeout** | ação do usuário **ou** expiração da janela (IA offline resolve) | `LIVE` | `DecisionPointResolved` / `TacticalInstructionIssued` |
| MR-5 | `LIVE` | apito final (90'+) | tempo esgotado | `FINISHED` | `MatchFinished` · `resultStatus: PENDING→NORMAL` |
| MR-6 | `FINISHED` | processamento pós-jogo (job) | resultado consolidado | `PROCESSED` | `MatchProcessed` |

**INV-2:** `FINISHED`/`PROCESSED` **jamais** retornam a `LIVE`. O laço `LIVE ↔ PAUSED_FOR_DECISION` (MR-3/MR-4) pode ocorrer **várias vezes**.

### 8.2 Resultado — `MatchResultStatus` (definido no encerramento)

| # | Origem | Gatilho | Guarda | Destino | Nota |
|---|--------|---------|--------|---------|------|
| RS-1 | `PENDING` | apito final (MR-5) | jogo disputado normalmente | `NORMAL` | desfecho padrão |
| RS-2 | `PENDING` | W.O. (não comparecimento / punição) | ausência de time / sanção competitiva | `WALKOVER` | runtime pode **pular `LIVE`**: `SCHEDULED`/`PRE_MATCH` → `FINISHED` |
| RS-3 | `PENDING` | cancelamento administrativo | partida não realizada / anulada | `CANCELLED` | não conta / remarcada conforme regulamento |
| RS-4 | `PENDING` | abandono em campo | partida interrompida em `LIVE` | `ABANDONED` | `LIVE → FINISHED` com `ABANDONED`; remarcação/decisão adm. |

### 8.3 Homologação — `HomologationStatus` (confirmação oficial, alimenta §4)

| # | Origem | Gatilho | Destino | Nota |
|---|--------|---------|---------|------|
| HS-1 | `PENDING` | resultado registrado (título em campo) | `PROVISIONAL` | provisório; celebrável (§14.2) |
| HS-2 | `PROVISIONAL` | homologação da competição (§14.1) | `HOMOLOGATED` | oficial; registro histórico |
| HS-3 | `HOMOLOGATED`/`PROVISIONAL` | recurso/protesto | `UNDER_APPEAL` | rito de reabertura |
| HS-4 | `UNDER_APPEAL` | recurso indeferido | `HOMOLOGATED` | mantém resultado |
| HS-5 | `UNDER_APPEAL` | recurso deferido | `OVERTURNED` | **reverte** (nova versão, preserva anterior — §14.2) |

### 8.4 Terminais e exceções

- **Terminais:** runtime `PROCESSED`; resultado `NORMAL`/`WALKOVER`/`CANCELLED`/`ABANDONED`; homologação `HOMOLOGATED` (ou `OVERTURNED` após recurso).
- **W.O. (`WALKOVER`):** caminho de exceção que **pula `LIVE`** — `SCHEDULED`/`PRE_MATCH` ══▶ `FINISHED` com `resultStatus=WALKOVER`, alimentando a classificação da competição (§4).
- **Timeout da janela de decisão:** `PAUSED_FOR_DECISION` ══▶ `LIVE` (auto-resolvido pela IA offline). **Não é terminal** — é o mecanismo central de §9.
- **Abandono/cancelamento:** `ABANDONED`/`CANCELLED` fecham o runtime em `FINISHED` sem `NORMAL`; consequências conforme regulamento.
- **Offline:** `Match.simulatedOffline Boolean` + `MatchControlSource` (`USER_OFFLINE_AI`/`FULL_AI`/`SYSTEM`) — **não** é status de runtime; a partida roda igual, a IA offline age nos pontos de decisão.
- **BASELINE RATIFICADA:** duração da janela de resposta a `DECISION_POINT` e máximo de substituições = **R-29**; `p_lesão`/`decisionScore` (F13/F17) = **R-21/R-22**.

### 8.5 Diagrama

```
Runtime:
 SCHEDULED ─MR-1─▶ PRE_MATCH ─MR-2─▶ LIVE ─MR-5─▶ FINISHED ─MR-6─▶ [PROCESSED] (terminal)
     │                 │              ▲  │                              INV-2: nunca volta a LIVE
     │   W.O. (RS-2)    │       MR-4  │  │ MR-3 (F17 decisionScore>70)
     └────────┄┄┄┄┄┄┄┄┄─┴──────────┐  │  ▼
                                    │  PAUSED_FOR_DECISION ── timeout/ResolveDecisionPoint ─┐
                                    │            └────────────────── MR-4 ──────────────────┘
                                    ▼  (WALKOVER pula LIVE)
                                 FINISHED

Resultado (no encerramento):  PENDING → { NORMAL | WALKOVER | CANCELLED | ABANDONED }
Homologação:                  PENDING → PROVISIONAL → HOMOLOGATED ⇄ UNDER_APPEAL → OVERTURNED
```

**Estados: 6 (runtime) + 5 (resultado) + 5 (homologação) = 16 · Transições: 6 (runtime) + 4 (resultado) + 5 (homologação) = 15.**

---

## 9. Resolução da contradição "partida continua × pausa"

A auditoria registra a contradição (**C-09**, **B-05**): o GDD do motor *"descarta a pausa estratégica"* e afirma que *"o jogo sempre roda"*; o catálogo tem o estado `PAUSED_FOR_DECISION`; a UI *"expira por minuto"*. Parecem incompatíveis. **Não são** — operam em **escopos diferentes**. Resolução canônica:

**1. Fonte do GDD.** [`05-motor-de-partida.md §12`](../01-game-design/05-motor-de-partida.md): o modelo **híbrido** — a partida *"roda automaticamente; quando surge algo relevante, o motor abre um **ponto de decisão** e o usuário pode intervir sem precisar controlar tudo"*. O que o GDD **descarta** é o formato *"blocos com pausa estratégica"* (parar a partida inteira à espera do usuário) e o *"tempo real curto"* — **não** o ponto de decisão.

**2. `PAUSED_FOR_DECISION` não pausa o mundo.** É um estado do **runtime da própria partida** (`MatchRuntime`), não do `WorldStatus` (§2) nem de qualquer outra partida. Enquanto uma partida está em `PAUSED_FOR_DECISION`:
- o `WorldStatus` permanece `ACTIVE` (o relógio do mundo corre);
- **todas as outras partidas** do mundo continuam simulando normalmente;
- apenas o **avanço de tick desta única partida** segura momentaneamente no ponto de decisão.

**3. A janela é time-boxed e auto-resolutiva.** A "pausa" é uma **janela de decisão** limitada por tempo real (a "expiração por minuto" da UI = timeout da janela, **BASELINE RATIFICADA R-29**). Se o usuário **não** responde dentro da janela, a **IA offline resolve** (respeitando o plano pré-jogo) e o runtime **retorna automaticamente a `LIVE`** (MR-4). A partida, portanto, **nunca trava** — sempre resolve de volta a `LIVE` e segue até `FINISHED`.

**4. Reconciliação.** "A partida continua" (verdade global: nenhuma partida bloqueia o mundo; toda partida progride e termina) e "a partida pausa" (verdade local: um micro-intervalo de decisão dentro do runtime de **uma** partida, com timeout) são **ambas verdadeiras em escopos distintos**:

| Afirmação | Escopo | Verdade |
|-----------|--------|---------|
| "A partida continua / o jogo sempre roda" | mundo + demais partidas + progressão desta partida | **sempre** — nada bloqueia; `PAUSED_FOR_DECISION` sempre volta a `LIVE` |
| "A partida pausa" | janela de decisão **local** do runtime de **uma** partida | **sim** — micro-intervalo time-boxed, auto-resolvido por ação do usuário **ou** timeout (IA offline) |

**Regra canônica (fixa a máquina 7):** `PAUSED_FOR_DECISION` é uma **janela de decisão do runtime da própria partida**, isolada, limitada por tempo e **sempre** retornando a `LIVE` (por `ResolveDecisionPoint` ou timeout). Uma partida **NUNCA** move o `WorldStatus` nem suspende outras partidas. Isso satisfaz simultaneamente o GDD ("sempre roda", sem pausa estratégica global), o catálogo (`PAUSED_FOR_DECISION` existe como estado de runtime) e a UI (timeout por minuto) — uma **única máquina de runtime** (recomendação de C-09).

---

## 10. Resumo consolidado

| # | Máquina | Enum/base canônico | Estados | Transições | Terminais | Saga (passo 10) |
|---|---------|--------------------|---------|------------|-----------|-----------------|
| 1 | **Mundo** | `WorldStatus` | 5 | 7 | `ARCHIVED` (reversível R-56) | — |
| 2 | **Temporada** | `SeasonStatus` (4) + máquina (6) + fases (7) | 6 (máquina) / 4 (persist.) / 7 (fases) | 6 | `COMPLETED`→`ARCHIVED` | **SAGA-02** |
| 3 | **Competição** | `SeasonStatus` (`CompetitionSeason`) + `CompetitionStage` | 4 + sub-máquina de estágio | 5 | `ARCHIVED` (`FINISHED` estável) | — |
| 4 | **Jogador** | `PlayerStatus` (eixo A) + carreira (eixo B) | 5 (A) + 4 (B) = 9 | 7 (A) + 6 (B) = 13 | `RETIRED` (INV-4) | — |
| 5 | **Medicina/Lesão** | `PlayerInjury` + `InjurySeverity` | 9 (com 7 estágios de reabilitação) | 9 (+ recaída, aposentadoria médica) | `DISCHARGE` (episódio) / `MEDICAL_RETIREMENT` | — |
| 6 | **Transferência** | `TransferStatus` | 7 | 9 (+ 5 saídas do exame) | `COMPLETED`/`REJECTED`/`CANCELLED`/`EXPIRED` | **SAGA-01** |
| 7 | **Partida** | `MatchRuntimeStatus` + `MatchResultStatus` + `HomologationStatus` | 6 + 5 + 5 = 16 | 6 + 4 + 5 = 15 | `PROCESSED` / resultado / `HOMOLOGATED`/`OVERTURNED` | — |

**Total: 7 máquinas · ~66 estados nominais · ~64 transições nominais** (contagem por camada; a temporada e a partida têm múltiplas camadas de enum).

### Notas de rastreabilidade

- **B-03 (temporada):** §3 alinha as 3 camadas (7 fases → 6 estados → 4 `SeasonStatus`) com mapeamento canônico e aponta a virada à **SAGA-02** (passo 10).
- **B-07 (workflows multiagregado):** §7 (transferência → **SAGA-01**) e §3.4 (virada → **SAGA-02**) apontam ao passo 10 para estados internos, timeouts, compensações, idempotência e terminais.
- **C-09 / B-05 (partida ao vivo):** §9 resolve "continua × pausa" com uma única máquina de runtime; `PAUSED_FOR_DECISION` é janela local time-boxed, nunca pausa o mundo.
- **C-07 (transferência):** §7.3 fixa liberação médica **server-side** (`MedicallyCleared`) e caminho único de contrato.
- **C-10 (temporada):** §3.5 remete a ordem normativa (homologar antes de pagar) ao interior da SAGA-02 (passo 10).
- **Baseline ratificada:** R-56 (arquivamento), R-58 (durações de fase), R-59 (pesos de competição), R-21 (`p_lesão`), R-48 (`riscoMédico`/exame) e R-29 (janela de decisão). Alterações numéricas exigem ruleset versionado.
