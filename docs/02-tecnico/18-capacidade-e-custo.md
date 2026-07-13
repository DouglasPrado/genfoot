# Dimensionamento Operacional: Capacidade, Retenção e Custo

> **Status:** CANÔNICO (Série R ratificada em 2026-07-13) · **Bloqueador endereçado:** **passo 13** da ordem de correção ([`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md)) — *"Não há dimensionamento operacional: capacidade, crescimento de dados, custos, retenção, throughput de partidas, limites de conexão e gatilhos de escalabilidade não têm valores ou bandas aprovadas."* · **Escopo:** CAPACIDADE · DADOS/RETENÇÃO · THROUGHPUT · CONEXÕES · GATILHOS · CUSTO. **RPO/RTO/DR ficam fora deste documento** (backup e recuperação vivem em [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) §10 e são detalhados pelo agente de continuidade). · **Fontes derivadas:** [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md) (topologia monólito+workers, R2, fases de evolução §10), [`./03-multiplayer-e-mundos.md`](./03-multiplayer-e-mundos.md) (mundos, 16 clubes/divisão, ~63 dias, rodadas assíncronas, R-101/R-107/R-84), [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) (§8 filas, §Capacidade/escalonamento), [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md) (WebSocket/`realtime-gateway`, Redis Adapter), [`./13-ledger-e-conservacao-economica.md`](./13-ledger-e-conservacao-economica.md) (volume de lançamentos, faucet/sink/transferência), [`./15-ruleset-e-replay.md`](./15-ruleset-e-replay.md) §5 (retenção manifesto permanente × ticks regeneráveis, R-147), [`./17-criterios-de-aceite-e-bandas.md`](./17-criterios-de-aceite-e-bandas.md) (§4 nota cross-cutting, gate G8), [`../../prisma/schema.prisma`](../../prisma/schema.prisma) (entidades → linhas), [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md) §14.4/§14.9 (jogadores = clubes × 48, R-49). · **Revisão:** 2026-07-12

Este documento fecha o **passo 13** da ordem de correção: dá a **conta de dimensionamento** de um mundo, o **crescimento de dados** por família com a **política de retenção**, o **throughput** de partidas/commands/eventos, os **limites de conexão** WebSocket, os **gatilhos de escalabilidade** e a **ordem de grandeza de custo** por mundo/temporada. Todos os números são de **1ª passada** com **premissas explícitas** — a calibração final vem da telemetria de produção e do lote de mundos R-88.

> **Modo CANÔNICO.** Onde este documento **deriva** de decisão já registrada — mundo de referência de 16 clubes/30 rodadas (R-101), jogadores = clubes × 48 (R-49), retenção manifesto/ticks (R-147), classes de lançamento (R-109) — o conteúdo é **canônico por derivação**. Onde **fixa valores concretos** (bandas de linhas/bytes, limiares de gatilho, faixas de custo), está marcado **BASELINE RATIFICADA** sob as entradas **R-125..R-130** da [Série R](../99-decisoes/registro-de-decisoes.md). Este documento **não edita** nenhum outro arquivo — apenas os **referencia**. Ele **supre os números operacionais** que o gate **G8** de [`./17-criterios-de-aceite-e-bandas.md`](./17-criterios-de-aceite-e-bandas.md) §8 exige como pré-condição booleana (throughput, lag, conexões); RPO/RTO permanecem com o agente de continuidade.

## Sumário

1. [Premissas e mundo de referência](#1-premissas-e-mundo-de-referência)
2. [Dimensionamento por mundo (a conta)](#2-dimensionamento-por-mundo-a-conta)
3. [Crescimento de dados e retenção por família](#3-crescimento-de-dados-e-retenção-por-família)
4. [Projeção de 1, 10 e 50 temporadas](#4-projeção-de-1-10-e-50-temporadas)
5. [Throughput (rodada assíncrona)](#5-throughput-rodada-assíncrona)
6. [Conexões WebSocket](#6-conexões-websocket)
7. [Gatilhos de escalabilidade](#7-gatilhos-de-escalabilidade)
8. [Custo por mundo/temporada](#8-custo-por-mundotemporada)
9. [Recomendações consolidadas (R-125..R-130)](#9-recomendações-consolidadas-r-125r-130)
10. [Rastreabilidade](#10-rastreabilidade)

---

## 1. Premissas e mundo de referência

Todo número deste documento parte de **premissas nomeadas**, para que possam ser conferidas e recalibradas uma a uma. As três âncoras estruturais vêm de decisões já registradas:

| Premissa | Valor de 1ª passada | Fonte |
|---|---|---|
| Divisão de referência | **16 clubes → 30 rodadas** (`2 × (16 − 1)`) | R-101 ([`./03-multiplayer-e-mundos.md`](./03-multiplayer-e-mundos.md) §7) |
| Mundo de referência (o "start") | **32 clubes, 2 divisões × 16** | [`./03-multiplayer-e-mundos.md`](./03-multiplayer-e-mundos.md) §7 ("modelo recomendado para começar") |
| Duração da temporada | **~63 dias reais (~9 semanas)**; 4 rodadas de liga + 1 data de copa/semana | R-101/R-107 |
| Elenco profissional por clube | **23 jogadores** | R-57 |
| População ativa do mundo | **clubes × 48** (23 elenco + 10 mercado + 15 base) | R-49 ([`../01-game-design/03-economia.md`](../01-game-design/03-economia.md) §14.9) |
| Staff por clube | **~12** (banda 8–16; 12 papéis em `StaffRole`, com múltiplos scouts/auxiliares) | `schema.prisma` (`StaffRole`, `ClubDepartment`) |
| Timestep | **1 tick = 60 s virtuais**; `totalTicks ≈ 90` + acréscimos (~96) | R-143 ([`./15-ruleset-e-replay.md`](./15-ruleset-e-replay.md) §1.2) |

**Premissas de bytes por linha** (para converter linhas → armazenamento; banda + valor médio):

| Artefato (linha) | Byte/linha (banda) | Médio usado | Racional |
|---|---|---|---|
| `MatchSimulationTick` (estado por tick: 9 zonas, momentum, posse, fadiga por setor) | 0,5–2 KB | **1 KB** | JSON de estado rico por tick — o **byte-driver** da partida |
| Cabeçalho de manifesto (`MatchSimulation` + snapshots de força/contexto/escalação + `commandLog` + hashes) | 12–30 KB | **20 KB** | pequeno e **permanente** ([§3](#3-crescimento-de-dados-e-retenção-por-família)) |
| `MatchEvent` / `PlayerMatchStats` / `MatchLineupPlayer` / `MatchDecisionPoint` | 0,2–0,4 KB | **0,3 KB** | linhas relacionais estreitas |
| `JournalLine` (linha de razão) | ~0,2 KB | **0,2 KB** | débito/crédito por conta/moeda |
| `DomainEventLog` (evento de domínio imutável) | 0,3–0,6 KB | **0,45 KB** | histórico append-only |
| `Notification` | ~0,3 KB | **0,3 KB** | payload curto |
| Fator de índices sobre o cru | 1,5–2,0× | **1,8×** | índices + FKs compostas `(gameWorldId, id)` |

> **Premissa de composição humana.** O mundo **não depende de todos os clubes terem donos** (bots preenchem — [`./03-multiplayer-e-mundos.md`](./03-multiplayer-e-mundos.md) §2/§7). Para o dimensionamento de **conexões e commands**, adota-se a faixa de composição de referência: **~25–50% de clubes humanos** no start (ex.: 8–16 humanos num mundo de 32). Um mundo maduro/popular pode chegar a **~200 usuários** com espectadores; esse é o caso de pico de conexões ([§6](#6-conexões-websocket)).

---

## 2. Dimensionamento por mundo (a conta)

### 2.1 A conta fechada (mundo de referência, 32 clubes)

```
2 divisões × 16 clubes ......................... 32 clubes
32 clubes × 48 jogadores/clube (R-49) .......... 1.536 jogadores  (736 elenco + 320 mercado + 480 base)
32 clubes × ~12 staff .......................... ~384 staff       (banda 256–512)

Partidas/temporada:
  Liga:  2 divisões × (30 rodadas × 8 jogos/rodada) = 2 × 240 = 480
  Copa nacional (32 clubes, mata-mata, semis ida/volta):
         R32(16) + R16(8) + QF(4) + SF(4) + Final(1) ...... ~33
  Supercopa ...................................... 1
  ─────────────────────────────────────────────────────────
  Total oficial/temporada ........................ ~514 partidas   (~515)
  (amistosos/torneios privados: variável, fora do núcleo)

Ticks/temporada:
  ~514 partidas × ~96 ticks/partida .............. ~49.000 ticks   (~50 mil)
  (+ prorrogação em fração das ~33 de copa: desprezível nesta escala)

Lançamentos de ledger/temporada:
  bilheteria (faucet, ~jogos com mando) .......... ~500
  salários/operacional/patrocínio/impostos (32 clubes × ~30 ciclos) ~1.000
  transferências (conserva) + comissões + prêmios  ~500
  ─────────────────────────────────────────────────────────
  ~2.000–3.000 lançamentos → ~5.000–8.000 linhas de razão/temporada

Eventos/temporada:
  MatchEvent visíveis (~40/partida × 514) ........ ~20.000
  DomainEventLog (comandos, transições, mercado, virada) ~50.000–100.000
```

**Em uma linha:** `2×16 = 32 clubes → ~1.536 jogadores + ~384 staff → ~515 partidas/temporada → ~50 mil ticks + ~20 mil eventos de partida (~75 mil eventos de domínio) + ~2–3 mil lançamentos de ledger`.

### 2.2 Escala por tamanho de mundo

Os três exemplos de mundo já documentados ([`./03-multiplayer-e-mundos.md`](./03-multiplayer-e-mundos.md) §7), recalculados com divisões de 16 clubes:

| Mundo | Clubes | Divisões | Jogadores (×48) | Staff (~×12) | Partidas de liga | +Copa/Continental | Partidas/temporada | Ticks/temporada |
|---|---|---|---|---|---|---|---|---|
| **Pequeno / start** | 32 | 2 | 1.536 | ~384 | 480 | ~34 | **~515** | **~50 mil** |
| **Médio** (Exemplo B) | 48 | 3 | 2.304 | ~576 | 720 | ~40 | **~760** | **~73 mil** |
| **Grande** (Exemplo A, com continental) | 64 | 4 | 3.072 | ~768 | 960 | ~34 copa + ~64 continental | **~1.060** | **~102 mil** |

> **Regra de escala.** Partidas de liga crescem **linearmente** no nº de divisões (`divisões × 240`); jogadores e staff crescem **linearmente** nos clubes (`clubes × 48` / `clubes × ~12`); ticks e lançamentos acompanham as partidas. O acoplamento nº de clubes ↔ cadência ↔ `seasonDays` é fixado por **R-107** — divisões acima de 16 clubes exigem `seasonDays` maior ou rodadas em dias adicionais, **nunca** mais partidas na mesma janela.

---

## 3. Crescimento de dados e retenção por família

### 3.1 A distinção-chave: permanente × cache regenerável × janela

A retenção segue **R-147** ([`./15-ruleset-e-replay.md`](./15-ruleset-e-replay.md) §5): **o manifesto é fonte de verdade permanente; a série de ticks é cache regenerável.** Três regimes de retenção:

- **Permanente** — nunca se apaga enquanto o mundo existir (e vai para o arquivo do mundo, `CMP-019`). É o registro de auditoria/anti-"roubo", ledger e memória do mundo. Pode ser **arquivado a frio** (R2, comprimido) sem deixar de ser permanente.
- **Cache regenerável** — mantido por uma **janela curta** e depois **podado**; quando necessário depois (auditoria, disputa, replay de debug), **regenerado sob demanda** re-executando o manifesto no `engineVersion`+`rulesetVersion` fixados.
- **Janela** — retido por um prazo operacional (ex.: 90 dias / temporada corrente) e depois **agregado em digest** ou descartado (nada de valor permanente se perde).

### 3.2 Famílias, volume e política (mundo de referência, por temporada)

Linhas e bytes por temporada do **mundo de referência (32 clubes, ~515 partidas)**, usando as premissas de §1:

| Família | Linhas/temporada | Cru (~) | Regime de retenção | Justificativa |
|---|---|---|---|---|
| **Manifestos de partida** (`MatchSimulation` + snapshots + `MatchCommandLog` + hashes) | ~515 sims + ~4 mil linhas de command | **~11 MB** | **PERMANENTE** (arquivável a frio) | fonte de verdade do replay/auditoria; regenera qualquer tick (R-147) |
| **Série de ticks** (`MatchSimulationTick`) | ~50.000 | **~50 MB** (banda 25–100) | **CACHE REGENERÁVEL** — janela = temporada corrente + N dias; depois poda para só o manifesto | o **grosso do byte-cost**; regenerável do manifesto (R-147) |
| **Eventos/estatísticas de partida** (`MatchEvent`, `PlayerMatchStats`, `MatchLineup*`, `MatchDecisionPoint`) | ~62.000 | **~19 MB** | **PERMANENTE** (eventos/escalações congeladas; parte de `I`/`O`) | histórico esportivo e estatístico do mundo |
| **Ledger** (`JournalEntry`/`JournalLine`/`FinancialAccountBalanceSnapshot`) | ~2.500 entradas / ~8.000 linhas | **~2 MB** | **PERMANENTE, append-only** | razão de partidas dobradas; correção por estorno, nunca `UPDATE` (INV-13, [`./13-ledger...`](./13-ledger-e-conservacao-economica.md) §3) |
| **Histórico append-only** (`SeasonHistory`, `ClubHistoryEntry`, `PlayerCareerHistory`, `TransferHistory`, `RecordBook`, `PlayerDevelopmentHistory`) | ~10.000–30.000 | **~10 MB** | **PERMANENTE** | memória do mundo (`CMP-019`); causalidade de progressão (C-11) |
| **Eventos de domínio** (`DomainEventLog`) | ~50.000–100.000 | **~34 MB** | **PERMANENTE** (arquivável a frio a partir de N temporadas) | base de projeções/rebuild; imutável |
| **Outbox** (`OutboxEvent`) | ~75.000 (rotativo) | **~transiente** | **EFÊMERO** — apagado após publicação confirmada | garantia de entrega, não histórico ([`./04-plataforma...`](./04-plataforma-seguranca-operacoes.md) §8) |
| **Notificações** (`Notification`) | ~15.000 | **~5 MB** | **JANELA** — ex.: 90 dias / temporada, depois digest/prune | derivadas do histórico; regeneráveis a partir dos eventos |
| **Dedup/idempotência** (`InboxDedup`, `IdempotencyKey`) | ~75.000 (rotativo) | **~transiente** | **JANELA curta** (TTL) | proteção anti-duplicidade, não histórico |

**Total por temporada (cru):** ~11 + 50 + 19 + 2 + 10 + 34 + 5 ≈ **~131 MB/temporada** cru → **~235 MB em disco** (índices ~1,8×).

**Núcleo permanente por temporada** (exclui ticks podáveis e notificações em janela): ~11 + 19 + 2 + 10 + 34 ≈ **~76 MB cru → ~137 MB em disco**.

> **Contas sistêmicas não crescem por temporada.** As `SYS_*_FAUCET`/`SYS_*_SINK` ([`./13-ledger...`](./13-ledger-e-conservacao-economica.md) §2.2) são **~12 contas fixas por mundo** — a oferta monetária é rastreável por construção sem inflar linhas. O que cresce é o volume de **lançamentos**, já contabilizado na família Ledger.

---

## 4. Projeção de 1, 10 e 50 temporadas

Projeção do **armazenamento Postgres em disco** do mundo de referência, sob duas políticas de tick (a diferença é o valor de **R-147/R-125**):

| Horizonte | **Com poda de ticks** (janela = 1 temporada) | **Sem poda de ticks** (retém tudo) |
|---|---|---|
| **1 temporada** | ~235 MB | ~235 MB |
| **10 temporadas** | ~137 MB × 10 + 1 janela de ticks (~90 MB em disco) ≈ **~1,5 GB** | ~235 MB × 10 ≈ **~2,3 GB** |
| **50 temporadas** | ~137 MB × 50 + janela de ticks ≈ **~7 GB** | ~235 MB × 50 ≈ **~11,7 GB** |

**Leitura operacional (o achado que orienta tudo):** um mundo de referência, mesmo **sem** poda e após **50 temporadas**, cabe em **~12 GB**. Um mundo é **barato** — a poda de ticks (R-147/R-125) economiza ~40% do disco e, sobretudo, mantém a **tabela quente** pequena, mas não é o que decide a viabilidade. A consequência direta é que **dezenas de mundos cabem numa mesma instância Postgres** na fundação (fase 1), e o sharding por mundo (fase 4) é um horizonte distante, disparado por gatilho ([§7](#7-gatilhos-de-escalabilidade)), não uma necessidade de largada.

**Escala por tamanho de mundo** (50 temporadas, com poda): mundo médio (48 clubes) ≈ **~10 GB**; mundo grande (64 clubes + continental) ≈ **~14 GB**. Todos na mesma ordem de grandeza.

**R2 (objetos, fora do Postgres):** escudos/avatares/relatórios/snapshots grandes + **arquivamento a frio** de manifestos e `DomainEventLog` antigos + backups (WAL-G). Comprimido e imutável, um mundo ocupa **~poucos GB** em R2 ao longo de dezenas de temporadas — e o R2 tem **egress zero** ([§8](#8-custo-por-mundotemporada)), o que torna leitura de arquivo histórico e restauração isolada de mundo baratas.

---

## 5. Throughput (rodada assíncrona)

O modelo é **online assíncrono**: as partidas de uma rodada são simuladas **em lote** num horário fixo (ex.: 20h), e cada humano pode **assistir** sua partida ao vivo, tick a tick, pelo WebSocket ([`./03-multiplayer...`](./03-multiplayer-e-mundos.md) §3–5, [`./08-frontend...`](./08-frontend-cliente-e-tempo-real.md)). Há três regimes de carga distintos:

### 5.1 Partidas concorrentes por rodada

| Escopo | Partidas simultâneas na rodada |
|---|---|
| 1 divisão (16 clubes) | **8** jogos |
| Mundo de referência (2 divisões no mesmo slot) | **16** jogos |
| Mundo grande (4 divisões no mesmo slot) | **32** jogos |
| N mundos partilhando o mesmo slot 20h | **N × (8–32)** — o pico de compute agregado |

### 5.2 Ticks/s no pico

Duas velocidades para o **mesmo kernel** (R-143):

- **Lote (batch).** Uma partida (~96 ticks) é uma **função pura** — computa em ~**5–50 ms de CPU** (banda de 1ª passada, a confirmar por perfil). Um `simulation-worker` avança **centenas a milhares de ticks/s** por core; a rodada inteira de 16 jogos (~1.500 ticks) resolve em **< 1 s de CPU**. O gargalo do lote **não é CPU**, é a **persistência** (~16 × ~220 linhas ≈ ~3,5 mil linhas + ticks por rodada) — trivial para o Postgres, absorvida por escrita em lote.
- **Streaming ao vivo.** A partida assistida é **ritmada para o wall-clock** (UX), ex.: ~90 ticks exibidos em ~6–12 min → **~0,12–0,25 tick/s por partida**. Com ~50 partidas ao vivo concorrentes numa instância → **~6–12 ticks/s** emitidos por WebSocket. Baixo.

**Conclusão:** ticks/s **não é o gargalo** — nem no lote (CPU sobra) nem no streaming (ritmado). O que dimensiona o pico é o **fan-out de conexões** ([§6](#6-conexões-websocket)) e a **vazão de persistência/fila** no fechamento de slot.

### 5.3 Commands/s e eventos/s

| Métrica | Pico (mundo de referência) | Pico agregado (instância, ~30 mundos) |
|---|---|---|
| **Commands/s** (rajada no fechamento 19:59: escalação, tática, treino) | ~20 humanos × ~3 commands em ~60 s ≈ **~1 cmd/s** | staggered ou mesmo slot → **~30–60 cmd/s** |
| **Commands ao vivo/s** (ações rápidas na partida) | ~poucos por humano por partida | **~dezenas/s** no auge de rodada |
| **Eventos/s** (MatchEvent + projeções publicadas) | ~1–2 evt/s por rodada ao vivo | **~dezenas a ~poucas centenas/s** na publicação simultânea do lote |

Todos na faixa que a `api` (NestJS) e a fila (Redis+BullMQ, R-78) absorvem sem particionamento na fundação.

### 5.4 Como os workers escalam

- **`simulation-worker`** — consome a fila de partidas; **replica horizontalmente** e particiona o lote por `matchId`/mundo (fase 2, [`./00-arquitetura...`](./00-arquitetura-geral.md) §10). Cada partida é um **actor lógico único** com checkpoints — sobrevive à perda do worker.
- **`async-worker`** — projeções, conciliações, rebuild, mercado, histórico; replica horizontalmente.
- **`notification-worker`** — push/e-mail/digests; replica horizontalmente; usa backpressure (agrupa, prioriza críticas) sob carga ([`./04-plataforma...`](./04-plataforma-seguranca-operacoes.md) §8).
- **`world-scheduler`** — coordenado por **leases**: **apenas um** processo avança um dado mundo por vez ([`./00-arquitetura...`](./00-arquitetura-geral.md) §7). Não escala por réplica no mesmo mundo; escala por **repartição de mundos** entre schedulers.

**Prioridade sob carga** (já fixada em [`./04-plataforma...`](./04-plataforma-seguranca-operacoes.md)): segurança > commands competitivos > partidas > processamentos obrigatórios > consultas > mercado > notificações > estatísticas > rebuilds históricos.

---

## 6. Conexões WebSocket

O tempo real é servido pelo `realtime-gateway` (processo dedicado, **não** é fonte de verdade), com salas por **usuário/clube/mundo/partida** e **Redis Adapter** do Socket.IO para múltiplas réplicas ([`./08-frontend...`](./08-frontend-cliente-e-tempo-real.md)).

### 6.1 Conexões concorrentes por mundo

| Cenário | Conexões concorrentes |
|---|---|
| Mundo de referência, dia comum | ~humanos online = **dezenas** |
| Mundo de referência, pico de rodada (todos assistindo suas partidas) | **~8–16** (uma por humano) + espectadores |
| Mundo popular (~200 usuários) no pico de matchday | **~até ~200** |

### 6.2 Limite por instância de gateway e comportamento em pico

> **Decisão ratificada — R-128:** **teto brando de ~10.000 sockets concorrentes por instância de `realtime-gateway`** (1ª passada, Node/Socket.IO ajustado), escalando horizontalmente via **Redis Adapter** ao ultrapassar **~70%** do teto. Um gateway comporta, portanto, **~50–500 mundos** conforme o tamanho do mundo. O valor final sai de teste de carga (fila simultânea, fechamento de janela — [`./04-plataforma...`](./04-plataforma-seguranca-operacoes.md) §12, tipo "Carga").

**Pico: partida ao vivo popular.** O pico de conexão **não** é o total de sockets, e sim o **fan-out para uma sala de partida** de marca (final, clássico) que atrai a maioria dos usuários online do mundo como **espectadores**. Broadcast Socket.IO numa sala é O(assinantes): uma partida com ~1.000 espectadores transmite `MATCH_TICK`/`MATCH_EVENT` a ~1.000 sockets. Comportamento previsto:

- **Backpressure** ([`./04-plataforma...`](./04-plataforma-seguranca-operacoes.md) §8): agrupar atualizações de tick, reduzir produção não crítica, priorizar eventos decisivos.
- **Modo compacto** ([`./08-frontend...`](./08-frontend-cliente-e-tempo-real.md)): o cliente pode consumir só placar/eventos/decisões, reduzindo mensagens por socket.
- **Feed incremental por `matchSequence`**, não estado inteiro por atualização — o front recupera lacunas por sequência/snapshot, sem reenvio completo.
- **Sala multi-réplica** via Redis Adapter quando os espectadores excedem uma instância.
- **Recuperação:** reconexão revalida credencial curta e recupera por `lastKnownSequence` — a queda de conexão **não reinicia a partida** ([`./08-frontend...`](./08-frontend-cliente-e-tempo-real.md), [`./04-plataforma...`](./04-plataforma-seguranca-operacoes.md) §11 drain R-85).

---

## 7. Gatilhos de escalabilidade

Métricas monitoradas ([`./04-plataforma...`](./04-plataforma-seguranca-operacoes.md) §Capacidade) com **limiares de 1ª passada** que disparam uma ação de escala. Ligam-se ao estado operacional `AT_RISK` do mundo ("capacidade no limite") e às **fases de evolução** de [`./00-arquitetura...`](./00-arquitetura-geral.md) §10.

> **Decisão ratificada — R-129:** limiares de escalabilidade (1ª passada, recalibrar por telemetria):

| # | Métrica | Limiar (dispara) | Ação de escala | Fase-alvo |
|---|---|---|---|---|
| G-CAP-1 | **Mundos ativos por instância** (single-host) | > ~**30** mundos de referência **ou** CPU p95 no matchday > **70%** **ou** Postgres > **60%** do provisionado | replicar workers/gateway; planejar shard | 1 → 2 |
| G-CAP-2 | **Tamanho de tabela quente** (`MatchSimulationTick` **ou** `DomainEventLog`) | > ~**50 M linhas** **ou** > ~**50 GB** | **particionar** por `(gameWorldId, season)`; poda de ticks (R-147) | 2 |
| G-CAP-3 | **Lag de fila** (BullMQ) | jobs em espera > ~**1.000** **ou** idade do job mais antigo > ~**2 min** após o slot **ou** rodada não publicada em ~**10 min** | + réplicas de `simulation-worker`; particionar fila por mundo | 2 |
| G-CAP-4 | **Sockets concorrentes/gateway** | > ~**70%** do teto (~10 k, R-128) **ou** p95 de latência de broadcast acima do alvo | + réplica de `realtime-gateway` (Redis Adapter) | 2 |
| G-CAP-5 | **Utilização do pool de conexões** Postgres | > ~**80%** sustentado | introduzir **PgBouncer**; elevar pool | 2 |
| G-CAP-6 | **Janela de ticks / disco** | footprint de ticks vivos acima do orçamento | apertar janela de poda (R-147) / arquivar a frio em R2 | 2 |
| G-CAP-7 | **Teto de compute/armazenamento do host** atingido mesmo após G-CAP-1..6 | instância satura com o conjunto de mundos | **sharding lógico por `gameWorldId`** (mundos → clusters, roteamento por partição) | 4 |
| G-CAP-8 | **Semântica de broker exigida (R-160)** — troca **BullMQ → RabbitMQ/NATS** (distinta de "+réplicas"/particionar fila do G-CAP-3) | por **14 dias**, qualquer condição: **p95 de lag > 5 s** em jobs críticos **OU** **> 100 mil jobs/min** sustentados **OU** **roteamento interserviço com ≥ 3 consumidores independentes** **OU** **retenção/replay de mensagens > 24 h** **OU** blast radius do Redis impedir SLO | migrar para **RabbitMQ (filas quorum)** para comandos duráveis — **NATS JetStream** só se fan-out/streaming dominar — **precedido de testes de contrato de broker** | 2 → durável |

> **Troca de broker é gatilho próprio (G-CAP-8), não "+réplicas".** Escalar workers / particionar fila (G-CAP-3) **mantém** o BullMQ; **trocar** a tecnologia de broker é um movimento distinto, disparado quando a **semântica** exigida ultrapassa o que o BullMQ garante (routing por tópico, muitos consumidores concorrentes, ack/ordering/dead-letter roteado, fan-out). **Antes do swap**, um conjunto de **testes de contrato de broker** valida que a nova tecnologia preserva a semântica de que o domínio depende — **ack**, **ordering** (por agregado/partição), **routing** por chave, **redelivery** e **idempotência** — mantendo a garantia `AT_LEAST_ONCE` + idempotência do **Outbox/Inbox** ([`./00-arquitetura-geral.md`](./00-arquitetura-geral.md) §3 R-78, [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md)) intacta na virada. Os limiares de G-CAP-8 seguem **R-160** (avaliados por janela de 14 dias: p95 de lag > 5 s em jobs críticos; > 100 mil jobs/min sustentados; roteamento interserviço com ≥ 3 consumidores independentes; retenção/replay > 24 h; ou blast radius do Redis impedir SLO) — **BASELINE RATIFICADA** (1ª passada, recalibrar por telemetria).

Os gatilhos de **dimensionamento de jogo** (nova divisão/Série, conversão bot→humano) são distintos e vivem em **R-84** ([`./03-multiplayer...`](./03-multiplayer-e-mundos.md) §7): abrir nova Série quando ≥ 60% das vagas humanas estiverem ocupadas e houver ≥ 20 humanos aguardando. Esses movem **jogadores entre camadas**, não infra — mas alimentam G-CAP-1 (mais humanos ⇒ mais mundos/conexões).

---

## 8. Custo por mundo/temporada

**Ordem de grandeza**, fundação single-host (EasyPanel, R2 externo — [`./00-arquitetura...`](./00-arquitetura-geral.md) §8), com **muitos mundos partilhando a instância**. Premissas explícitas; a intenção é a **faixa**, não o centavo.

> **Decisão ratificada — R-130:** bandas de custo de 1ª passada (recalibrar com fatura real):

| Componente | Premissa | Custo por mundo/temporada (~63 dias ≈ 2 meses) |
|---|---|---|
| **Compute** | 1 host médio (~8 vCPU / 32 GB, ~US$ 100–250/mês) hospeda ~20–40 mundos de referência (compute sobra — [§5.2](#52-tickss-no-pico)) | **~US$ 5–25** (dominante; amortizado pela densidade) |
| **Armazenamento Postgres** | ~0,2 GB/temporada em disco; mundo maduro (50 temporadas) ~7–12 GB; ~US$ 0,10–0,25/GB/mês | **~US$ 0,5–5** (mundo novo: centavos; maduro: poucos dólares) |
| **Armazenamento R2** | imagens + relatórios + arquivamento a frio (manifestos/eventos) + backups; poucos GB/mundo; ~US$ 0,015/GB/mês | **~< US$ 1** |
| **Egress** | **R2 = egress zero** (vantagem estrutural: leitura de arquivo histórico e restauração isolada de mundo não pagam saída); egress de API/WebSocket é texto/JSON, modesto | **~centavos** |
| **Total (ordem de grandeza)** | — | **~US$ 10–35 por mundo/temporada**, dominado por compute; storage/egress são menores |

**Direção do custo com a escala.** O custo por mundo **cai** à medida que a densidade sobe (mais mundos por host amortizam o compute), até um gatilho de §7 forçar réplica/shard — quando o custo por mundo **estabiliza** num novo patamar de host. Storage cresce **linearmente e devagar** (~0,2 GB/temporada com poda); egress permanece desprezível pelo R2. **Não há** cliff de custo previsível dentro do horizonte de dezenas de temporadas por mundo.

> **Fora de escopo (deixado explícito):** custo de banda de push/e-mail de terceiros, custo de LLM da camada narrativa (decisão×linguagem, [`./00-arquitetura...`](./00-arquitetura-geral.md) §4.4 — a narrativa **não** entra no caminho competitivo, então seu custo é opcional/limitável), e custo de observabilidade (Prometheus/Loki/Tempo self-hosted no mesmo host). Todos parametrizáveis e não alteram a ordem de grandeza por mundo.

---

## 9. Recomendações consolidadas (R-125..R-130)

Todas **RATIFICADAS em 2026-07-13**, estendendo a [Série R](../99-decisoes/registro-de-decisoes.md). Última faixa anterior ocupada: **R-124** ([`./17-criterios-de-aceite-e-bandas.md`](./17-criterios-de-aceite-e-bandas.md) §9). Nenhuma edita schema/catálogo/ledger; propõem **valores operacionais** de 1ª passada aos artefatos existentes.

- **R-125 — Dimensionamento canônico por mundo e política de poda de ticks.** Adotar a conta de [§2](#2-dimensionamento-por-mundo-a-conta) (mundo de referência = 32 clubes → ~1.536 jogadores → ~515 partidas → ~50 mil ticks → ~2–3 mil lançamentos) e a **poda de ticks** com janela = temporada corrente + N dias, regenerando sob demanda pelo manifesto (reforça **R-147**). N é parâmetro de calibração.
- **R-126 — Famílias de dados, tamanhos e retenção.** Adotar as premissas de bytes/linha ([§1](#1-premissas-e-mundo-de-referência)) e o quadro de retenção por família ([§3.2](#32-famílias-volume-e-política-mundo-de-referência-por-temporada)): **permanente** (manifesto, eventos de partida, ledger, histórico, `DomainEventLog`), **cache regenerável** (ticks), **janela** (notificações), **efêmero** (outbox/dedup). Arquivamento a frio em R2 para famílias permanentes antigas.
- **R-127 — Throughput e escala de workers.** Adotar a caracterização de [§5](#5-throughput-rodada-assíncrona): lote resolve a rodada em < 1 s de CPU; streaming é ritmado (~0,12–0,25 tick/s/partida); commands ~dezenas/s no pico de instância. Workers `simulation`/`async`/`notification` replicam horizontalmente; `world-scheduler` por lease (1 por mundo). O gargalo real é fan-out de conexões e persistência de fechamento de slot, não ticks/s.
- **R-128 — Limite de conexões WebSocket e pico ao vivo.** Teto brando de **~10.000 sockets/instância** de `realtime-gateway`, escala horizontal via Redis Adapter a **~70%**; partida ao vivo popular tratada por backpressure, modo compacto, feed por `matchSequence` e sala multi-réplica ([§6](#6-conexões-websocket)).
- **R-129 — Gatilhos de escalabilidade.** Adotar os limiares G-CAP-1..8 de [§7](#7-gatilhos-de-escalabilidade) (mundos/instância ~30; tabela ~50 M linhas/~50 GB para particionar; lag de fila ~1.000 jobs/~2 min; sockets ~70% do teto; pool ~80%; shard por `gameWorldId` como último recurso, fase 4; **troca de broker** BullMQ→RabbitMQ/NATS por semântica de ack/ordering/routing — ≥ 3 consumidores independentes, ou > 100 mil jobs/min, ou p95 de lag > 5 s, ou retenção/replay > 24 h (R-160) —, precedida de **testes de contrato de broker**, G-CAP-8). Recalibrar por telemetria.
- **R-130 — Bandas de custo por mundo/temporada.** Ordem de grandeza **~US$ 10–35/mundo/temporada** na fundação, dominado por compute amortizado; storage Postgres ~US$ 0,5–5, R2 < US$ 1, **egress ~zero** (R2). Recalibrar com fatura real ([§8](#8-custo-por-mundotemporada)).

---

## 10. Rastreabilidade

**Fecha o passo 13** ([BACKLOG §14](../BACKLOG-PENDENCIAS.md)) nas dimensões de sua alçada:

| Ponto da auditoria | Onde é resolvido |
|---|---|
| "Capacidade não tem valores" | [§2](#2-dimensionamento-por-mundo-a-conta) — conta por mundo (clubes → jogadores → partidas → ticks → lançamentos) |
| "Crescimento de dados / retenção sem bandas" | [§3](#3-crescimento-de-dados-e-retenção-por-família)–[§4](#4-projeção-de-1-10-e-50-temporadas) — famílias, tamanhos, retenção (R-147) e projeção 1/10/50 temporadas |
| "Throughput de partidas sem valores" | [§5](#5-throughput-rodada-assíncrona) — concorrência/rodada, ticks/s (lote × streaming), commands/s, eventos/s, escala de workers |
| "Limites de conexão sem valores" | [§6](#6-conexões-websocket) — teto de sockets/gateway e pico de partida ao vivo |
| "Gatilhos de escalabilidade sem valores" | [§7](#7-gatilhos-de-escalabilidade) — G-CAP-1..7 com limiares |
| "Custos sem valores" | [§8](#8-custo-por-mundotemporada) — ordem de grandeza por mundo/temporada |

**Ligações:**

- **Retenção manifesto × ticks:** [`./15-ruleset-e-replay.md`](./15-ruleset-e-replay.md) §5 (R-147) — este documento **dimensiona** o que aquele definiu como permanente/regenerável.
- **Gate de promoção G8 (pré-condições operacionais):** [`./17-criterios-de-aceite-e-bandas.md`](./17-criterios-de-aceite-e-bandas.md) §4 (nota cross-cutting) e §8 — este documento **supre** os números de throughput/lag/conexões que o G8 exige como booleanos ("metas definidas e atingidas"). **RPO/RTO** permanecem com o agente de continuidade ([`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) §10).
- **Volume de ledger e classes de fluxo:** [`./13-ledger-e-conservacao-economica.md`](./13-ledger-e-conservacao-economica.md) §2–4 (contas `SYS_*` fixas; lançamentos que crescem).
- **Topologia e fases de escala:** [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md) §7 (processos), §10 (fases 1–5) — os gatilhos de §7 mapeiam nessas fases.
- **Mundo/temporada/rodada assíncrona:** [`./03-multiplayer-e-mundos.md`](./03-multiplayer-e-mundos.md) §1–7 (R-101/R-107/R-84).
- **Tempo real e recuperação:** [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md) (WebSocket, `matchSequence`, Redis Adapter).
- **Novas recomendações propostas aqui** (registradas no [registro §6](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11), bloco Capacidade): **R-125** (dimensionamento + poda de ticks), **R-126** (famílias/retenção), **R-127** (throughput/workers), **R-128** (conexões WebSocket), **R-129** (gatilhos), **R-130** (custo). Reforçam **R-147** (retenção), **R-49** (população), **R-101/R-107** (temporada), **R-84** (dimensionamento de jogo) e **R-78** (fila).
