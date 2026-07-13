# Ruleset e Replay Determinístico da Partida

> **Status:** Material de consolidação (auditoria de prontidão — passo 8 da ordem de correção) · **Bloqueador:** **B-05** (motor de partida e replay não são executáveis) · **Fontes reconciliadas:** [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md) (F1–F21, §2.2 versionamento, §3.1 máquina de partida), [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md) (kernel, seed/snapshot §12), [`./14-maquinas-de-estado.md`](./14-maquinas-de-estado.md) (§8–9 runtime da partida), [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md) (partida ao vivo, `matchSequence`, recuperação), [`./10-catalogo-de-commands.md`](./10-catalogo-de-commands.md) (commands de partida), [`../../prisma/schema.prisma`](../../prisma/schema.prisma) (`MatchSimulation`/`MatchSimulationTick`). · **Revisão:** 2026-07-12

Este documento é a **especificação canônica de timestep, kernel e replay** do motor de partida do **Grinta**. Ele fecha o bloqueador **B-05**: até aqui, "timestep e equivalência online/offline divergiam; a partida simultaneamente *continuava* e entrava em `PAUSED_FOR_DECISION`; o manifesto de replay não preservava todas as entradas; e F1–F21 não estavam ratificadas" — com o resultado de que **partidas não eram reproduzíveis bit-a-bit**.

Este doc **não** redefine as fórmulas (vivem no [catálogo](./05-catalogo-de-regras-e-formulas.md), `F1`–`F21`), **não** altera o schema (`MatchSimulation`/`MatchSimulationTick` são de responsabilidade do agente de schema — os campos descritos aqui já integram a baseline física) e **não** redefine o catálogo de commands (os `commandType` de partida vivem no [doc 10](./10-catalogo-de-commands.md) — aqui fixamos a **ordem determinística de aplicação**). Ele especifica o que faltava: **um kernel único, o timestep canônico, o protocolo de aplicação de commands, o `SimulationManifest` imutável, o RNG e a retenção** — de modo que qualquer partida possa ser reproduzida e auditada.

**Como ler (mesma convenção do dicionário e das máquinas de estado):**

- **`CANÔNICO`** = já fixado no schema executável ou em doc consolidado.
- **`RATIFICADO (R-##)`** = baseline normativa vigente. Coeficientes mudam somente por nova `rulesetVersion`, preservando replays antigos. R-143..R-147 foram ratificadas em 2026-07-13.
- **Precedência:** para **sintaxe** (enum, campo) vence [`schema.prisma`](../../prisma/schema.prisma); para **regras/coeficientes** vence o [catálogo](./05-catalogo-de-regras-e-formulas.md); para **runtime/máquina** vence [`14-maquinas-de-estado.md`](./14-maquinas-de-estado.md). Este documento **declara o contrato de replay**, não cria fórmula nem estado novos.

## Sumário

1. [Kernel único e timestep canônico](#1-kernel-único-e-timestep-canônico)
2. [Protocolo de commands da partida](#2-protocolo-de-commands-da-partida)
3. [`SimulationManifest` imutável](#3-simulationmanifest-imutável)
4. [RNG determinístico e streams por finalidade](#4-rng-determinístico-e-streams-por-finalidade)
5. [Retenção de manifestos e ticks](#5-retenção-de-manifestos-e-ticks)
6. [Ratificação de F1–F21 e fixação do `rulesetVersion`](#6-ratificação-de-f1f21-e-fixação-do-rulesetversion)
7. [Rastreabilidade](#7-rastreabilidade)

---

## 1. Kernel único e timestep canônico

### 1.1 Um único motor determinístico

Existe **um só kernel de simulação** — uma função **pura e determinística**:

```
O = K( I, R, A, s, C )
```

| Símbolo | Significado |
|---------|-------------|
| `K` | o **kernel** (motor), identificado por `engineVersion` |
| `I` | as **entradas congeladas**: forças ofensiva/defensiva, escalações, contexto (clima, gramado, árbitro, torcida, importância, mando) |
| `R` | o **ruleset**: o conjunto ativo de `GameFormula.version` (F1–F21) resolvido pelo `rulesetVersion` ([catálogo §2.2](./05-catalogo-de-regras-e-formulas.md#22-versionamento-de-fórmulas)) |
| `A` | o **algoritmo de RNG** nomeado (ver [§4](#4-rng-determinístico-e-streams-por-finalidade)) |
| `s` | a **seed** mestra da partida |
| `C` | a **lista ordenada de commands** (substituição, tática, decisão), com o tick de aplicação |
| `O` | a **saída**: placar, eventos, série de ticks, estatísticas, consequências |

**Propriedade fundamental (determinismo).** Dadas as mesmas `(I, R, A, s, C)`, `K` produz **sempre** o mesmo `O`, bit-a-bit. É a mesma exigência que o catálogo impõe a cada `GameFormula.calculate` ("função pura e determinística" — [catálogo §2.1](./05-catalogo-de-regras-e-formulas.md#21-interface-gameformula)), elevada ao motor inteiro. Nenhuma parte do kernel pode ler relógio de parede, `Math.random` não-semeado, ordem de iteração de `Map`/`Set` não-determinística, ponto flutuante dependente de plataforma sem normalização, nem estado externo mutável.

> **Decisão ratificada — R-143:** **proibir dois motores.** A "granularidade variável" do GDD ([`05-motor-de-partida.md §4`](../01-game-design/05-motor-de-partida.md)) — *online em ticks · offline em blocos · NPC×NPC resumida* — é reinterpretada como **variação de persistência/streaming, não de cálculo**. O kernel **sempre** avança pelo **tick canônico**; "bloco" é apenas a execução em lote dos mesmos ticks sem abrir janela ao usuário e sem transmitir cada tick pelo WebSocket. **Não** existe um motor "resumido" com matemática própria para NPC×NPC: usar um cálculo mais grosseiro produziria um `O` diferente e **quebraria** o replay e a fairness. Se algum dia um *fast-forward* aproximado for necessário por escala, ele é **explicitamente não-canônico**, não gera `SimulationManifest` reproduzível e **não pode ser homologado** como resultado auditável.

### 1.2 Timestep canônico

O tempo da partida avança em **ticks de duração fixa**. O tick é a unidade atômica de simulação: todas as fórmulas do catálogo se resolvem por tick (["Cada fórmula resolve-se por **tick**" — catálogo, cabeçalho das fórmulas](./05-catalogo-de-regras-e-formulas.md#fórmulas-do-motor-de-partida-transcrição)).

> **Decisão ratificada — R-143:** **1 tick = 60 segundos virtuais** (1 minuto virtual). Uma partida-base tem `totalTicks ≈ 90` ticks + acréscimos; mata-mata soma prorrogação (ver `MAT-021`) e, se houver, o motor próprio de pênaltis (`MAT-022`, resolução por lance, **fora** do laço de tick). O valor 60 s é persistido em `MatchSimulation.tickIntervalSeconds` (**CANÔNICO** — o campo existe; o **valor** foi ratificado) e é **imutável** dentro de uma mesma simulação — mudar o timestep muda `O`, então é um `engineVersion` novo. O relógio de exibição (minuto/segundo do `MatchSimulationTick`) é derivado de `tickIndex × tickIntervalSeconds`, nunca do relógio de parede.

**Ordem de resolução dentro de um tick (normativa, do catálogo).** A sequência é fixa e é parte do contrato determinístico — reordená-la muda `O`:

```
atualizar fadiga (F2) → moral (F3) → momentum (F14) → controle de zonas (F5)
→ posse perigosa (F6) → gerar ataques (F7) → resolver duelos (F8)
→ criar chances (F9) → resolver finalizações (F10/F11) → eventos secundários (F12/F13)
→ detectar pontos de decisão (F17) → aplicar commands aceitos → salvar estado
```

### 1.3 Equivalência online ↔ offline (a prova)

A auditoria apontou que "timestep e equivalência online/offline divergem". A reconciliação:

**Online e offline são a mesma função `K` com a mesma `I, R, A, s` — divergem apenas no *conteúdo* de `C`, nunca no kernel.**

- **Online.** O usuário preenche `C` incrementalmente: cada ação rápida, substituição ou resposta a ponto de decisão vira um command aceito na **janela de decisão** do runtime (`PAUSED_FOR_DECISION`, ver [`14-maquinas-de-estado §8.1/§9`](./14-maquinas-de-estado.md#8-máquina-7--partida-runtime--resultado--homologação)). Janela não respondida **expira por timeout** e a **IA offline** preenche a decisão a partir do plano pré-jogo.
- **Offline.** A IA offline preenche `C` **inteiro** a partir do plano pré-jogo (`SetGamePlan`), aplicando cada decisão no **tick determinístico** em que o ponto de decisão abre.
- **Portanto:** trocar "usuário" por "IA offline" só troca **quem** decide, produzindo uma lista `C` possivelmente diferente. O kernel que consome `C` é idêntico. Uma partida jogada online e outra offline são o **mesmo cálculo com entradas de comando diferentes** — coerente com o GDD ("mesmo motor", "o resultado precisa parecer gerado pelo mesmo universo" — [`05-motor-de-partida.md §4/§12`](../01-game-design/05-motor-de-partida.md)).

**Consequência para o replay.** Como `C` (com o tick de cada command) é **gravado no manifesto**, re-executar `K(I, R, A, s, C)` reproduz a partida **bit-a-bit, independentemente de ela ter sido originalmente online ou offline**. O replay não distingue a origem do command — só reaplica a lista gravada. Isso resolve a divergência de B-05 e sustenta o anti-"roubo" do GDD ([`05-motor-de-partida.md §12`](../01-game-design/05-motor-de-partida.md)).

**Consequência para a máquina de estado.** O paradoxo "a partida continua × entra em `PAUSED_FOR_DECISION`" **já está resolvido** em [`14-maquinas-de-estado.md §9`](./14-maquinas-de-estado.md#9-resolução-da-contradição-partida-continua--pausa): `PAUSED_FOR_DECISION` é uma **janela de decisão local do runtime de uma partida**, time-boxed, que **sempre** retorna a `LIVE` (por resposta do usuário ou timeout). Aqui apenas registramos a implicação para o replay: a janela **não** avança o tick; o tick só avança quando a janela fecha, e o command aceito na janela é aplicado no tick seguinte (ver [§2](#2-protocolo-de-commands-da-partida)). O replay reaplica a janela como um evento de duração zero (o command tem `appliedAtTick` fixo), então o replay **não** precisa esperar tempo real algum.

---

## 2. Protocolo de commands da partida

Os **nomes** dos commands de partida já são canônicos no [catálogo de commands §"Partida"](./10-catalogo-de-commands.md): preparação (`SetTactics`, `SetLineup`, `SetGamePlan`, versionados por `expectedVersion`) e ao vivo (`SubmitMatchDecision` e suas formas `IssueMatchCommand`, `MakeSubstitution`, `ResolveDecisionPoint`, ordenados por `matchSequence`, **sem** `expectedVersion`). Esta seção fixa **como** essa sequência entra no kernel de forma determinística.

### 2.1 `matchSequence` — a ordem-verdade

Cada command ao vivo aceito recebe um **`matchSequence`** monotônico, **atribuído pelo servidor no instante da aceitação** (não pelo cliente). Este é o mesmo `matchSequence` do stream de tempo real ([`08-frontend §"Sequência em tempo real"`](./08-frontend-cliente-e-tempo-real.md#sequência-em-tempo-real)) e do envelope de command (`lastKnownMatchSequence` no payload de `SubmitMatchDecision`). A ordem de `matchSequence` é a **ordem-verdade**: como o servidor a atribui na aceitação, a **latência de rede não vira vantagem** — dois usuários em PvP são ordenados por quando o servidor aceitou, não por milissegundos de rede (fairness do GDD [`05-motor-de-partida.md §12`](../01-game-design/05-motor-de-partida.md), `MAT-014`).

### 2.2 Janela de aceitação

| Regra | Especificação |
|-------|---------------|
| **Quando aceita** | O runtime está em `LIVE` ou `PAUSED_FOR_DECISION` e a janela está aberta; fora disso → `MATCH_COMMAND_WINDOW_CLOSED` ([doc 10](./10-catalogo-de-commands.md)). |
| **Idempotência** | `commandId` repetido devolve o resultado anterior sem reexecutar; `idempotencyKey` garante uma execução lógica ([doc 08/10](./08-frontend-cliente-e-tempo-real.md#idempotência-de-command)). Reenvio por reconexão **não** duplica o command em `C`. |
| **Autoridade** | Ator controla o clube **e** está autorizado (usuário online **ou** IA delegada — `MatchControlSource`); validado server-side. |
| **Duração da janela** | tempo real da janela de resposta a um `DECISION_POINT` = **BASELINE RATIFICADA R-29** (já registrado na máquina de partida, [`14 §8.4`](./14-maquinas-de-estado.md)). Ao expirar, a IA offline resolve e o runtime volta a `LIVE`. |

### 2.3 Ordem determinística de aplicação por tick

Este é o núcleo do determinismo de comando:

1. **Aplicação no próximo ciclo (next-cycle).** Um command aceito durante a simulação do tick `t` (ou durante a janela aberta em `t`) é aplicado no **início do tick `t+1`**, nunca no meio de `t`. Isso reproduz o GDD ("comandos processados em ordem válida e aplicados no **próximo ciclo apropriado** da simulação" — [`05-motor-de-partida.md §12`](../01-game-design/05-motor-de-partida.md)) e garante que o replay tenha um ponto de aplicação inequívoco (`appliedAtTick`).
2. **Ordem total dentro do tick.** Se vários commands têm o mesmo `appliedAtTick`, aplicam-se por **`matchSequence` crescente**; empate teórico desempata por `commandId` (ordenação lexicográfica) — determinístico e estável.
3. **Efeitos = deltas internos.** Cada command aplica os **deltas assinados** de `F20` (ver [catálogo F20](./05-catalogo-de-regras-e-formulas.md#f20-deltas-internos-de-uma-ação)) sobre o estado interno, com a **janela de encaixe** de R-33/`F4` (0–2 min desorganização → 3–6 encaixe → 7+ efeito completo). O command **não** tem efeito instantâneo de bônus; a rampa é parte do kernel e, portanto, do replay.
4. **Registro imutável.** Todo command aplicado é anexado a `C` no manifesto como uma linha `(matchSequence, appliedAtTick, commandType, payload, controlSource, idempotencyKey)`. O `payload` é o **estado congelado** do command — não uma referência a agregado mutável — para que o replay não dependa de dados que mudaram depois.

**Diagrama (tick com decisão e command):**

```
tick t: ... → detecta ponto de decisão (F17) → abre PAUSED_FOR_DECISION (janela)
             │
             ├─ usuário responde (SubmitMatchDecision, matchSequence=N)   ─┐
             │  ou timeout → IA offline resolve (matchSequence=N)          │ aceito em t
             ▼                                                             │
        janela fecha → volta a LIVE                                        │
tick t+1: aplica commands com appliedAtTick=t+1, ordenados por matchSequence ◀┘
             → deltas F20 entram com rampa F4/R-33 → resolve tick t+1 → salva
```

---

## 3. `SimulationManifest` imutável

O **`SimulationManifest`** é o registro **imutável e completo** que permite o **replay bit-a-bit** e a auditoria. Ele é `I + R + A + s + C` mais os hashes de integridade. Uma vez que a partida sai de `PRE_MATCH` (entradas congeladas) e depois de `FINISHED` (commands e resultado fechados), o manifesto **nunca muda** — correções geram nova versão, preservando a anterior (mesma disciplina de `CMP-014`/`CMP-019` e da `HomologationStatus`).

### 3.1 Campos do manifesto — todos materializados no schema

Legenda: **CANÔNICO** = **materializado no schema**. Todos os campos do manifesto (R-145/R-146) já estão materializados em `MatchSimulation`, com a série `MatchSimulationTick`, o log `MatchCommandLog` e o snapshot congelado da escalação em `MatchLineup` — **nada resta a adicionar**.

| # | Campo do manifesto | Papel no replay | Situação no schema |
|---|--------------------|-----------------|--------------------|
| 1 | `engineVersion` | identifica o kernel `K` | **CANÔNICO** — `MatchSimulation.engineVersion` |
| 2 | `tickIntervalSeconds` | timestep canônico (o "clock" de `K`) | **CANÔNICO** — `MatchSimulation.tickIntervalSeconds` |
| 3 | `totalTicks` | duração simulada (fecha o laço) | **CANÔNICO** — `MatchSimulation.totalTicks` |
| 4 | `seed` (mestra) | semente do RNG (`s`) | **CANÔNICO** — `MatchSimulation.randomSeed` (+ eco em `Match.simulationSeed`) |
| 5 | `homeStrengthSnapshot` / `awayStrengthSnapshot` | entradas de força ofensiva/defensiva (parte de `I`) | **CANÔNICO** — `MatchSimulation.homeStrengthSnapshot` / `awayStrengthSnapshot` |
| 6 | `balanceJson` / `finalMomentumJson` | contexto de balanço / estado final de momentum | **CANÔNICO** — `MatchSimulation.balanceJson` / `finalMomentumJson` |
| 7 | série de ticks (`MatchSimulationTick`) | trilha de saída (regenerável do manifesto) | **CANÔNICO** — modelo `MatchSimulationTick` (ver [§5](#5-retenção-de-manifestos-e-ticks)) |
| 8 | escalações congeladas (`lineupSnapshot`) | parte de `I` — quem entrou, funções, banco, no kickoff | **CANÔNICO** — `MatchSimulation.lineupSnapshot` (Json congelado) + `MatchLineup.isImmutableSnapshot`/`frozenAtTick`/`snapshotJson`/`lineupHash` (escalação congelada e imutável no kickoff) |
| 9 | **`rulesetVersionId`** (por simulação) | fixa `R` da **época** da partida | **CANÔNICO** — `MatchSimulation.rulesetVersionId` carimba o ruleset da época no kickoff (além de `GameWorld.currentRuleSetVersionId` no nível de mundo), evitando que uma partida antiga replaye com o ruleset novo |
| 10 | **`rngAlgorithm`** | nomeia `A` (ex.: `pcg32-xsh-rr`) | **CANÔNICO** — `MatchSimulation.rngAlgorithm` (sem ele, a `seed` sozinha não define o gerador) |
| 11 | **`rngStreamsJson`** | derivação das streams por finalidade (ver [§4](#4-rng-determinístico-e-streams-por-finalidade)) | **CANÔNICO** — `MatchSimulation.rngStreamsJson` persiste os seletores das streams por finalidade para auditoria |
| 12 | **`contextSnapshot`** | clima, gramado, árbitro (perfil), torcida, importância, mando — parte de `I` | **CANÔNICO** — `MatchSimulation.contextSnapshot` (Json congelado no kickoff) |
| 13 | **`commandLog`** (`C` ordenado) | a lista de commands com `matchSequence` e `appliedAtTick` | **CANÔNICO** — modelo `MatchCommandLog` (relação `MatchSimulation.commandLog`); ver [§3.2](#32-matchcommandlog-modelo-materializado) |
| 14 | **`inputHash`** | hash de todo `I` (5+8+12) — detecta entrada adulterada | **CANÔNICO** — `MatchSimulation.inputHash` |
| 15 | **hashes de snapshot** | hash de cada snapshot (força home/away, contexto, escalação) | **CANÔNICO** — `MatchSimulation.homeStrengthHash`/`awayStrengthHash`/`contextHash`/`lineupHash` |
| 16 | **`resultHash`** | hash do `O` (placar + eventos + série de ticks) — assinatura do resultado | **CANÔNICO** — `MatchSimulation.resultHash` |
| 17 | **`hashAlgorithm`** | nomeia a função de hash (ex.: `sha256`) | **CANÔNICO** — `MatchSimulation.hashAlgorithm`, consistente com a cadeia de hash de integridade do schema (`DomainEventLog.prevEventHash`→`eventHash`) |
| 18 | **`manifestSchemaVersion`** | versiona o **formato** do próprio manifesto | **CANÔNICO** — `MatchSimulation.manifestSchemaVersion` |

**Resumo.** Todos os campos do manifesto **já estão materializados no schema**. Em `MatchSimulation`: `engineVersion`, `tickIntervalSeconds`, `totalTicks`, `randomSeed` (+ eco em `Match.simulationSeed`), `homeStrengthSnapshot`, `awayStrengthSnapshot`, `balanceJson`, `finalMomentumJson`, `rulesetVersionId`, `rngAlgorithm`, `rngStreamsJson`, `contextSnapshot`, `lineupSnapshot`, `inputHash`, `homeStrengthHash`, `awayStrengthHash`, `contextHash`, `lineupHash`, `resultHash`, `hashAlgorithm`, `manifestSchemaVersion`, `version`. A série de ticks é `MatchSimulationTick`; o snapshot congelado da escalação vive em `MatchLineup` (`isImmutableSnapshot`/`frozenAtTick`/`snapshotJson`/`lineupHash`); e o log de commands `C` é o modelo `MatchCommandLog` (relação `MatchSimulation.commandLog`). **Nada resta a adicionar ao schema** para o manifesto.

### 3.2 `MatchCommandLog` (modelo materializado)

> **Decisão ratificada — R-145 (materializada no schema):** `C` é persistido de forma imutável e ordenável no modelo `MatchCommandLog` ([`schema.prisma`](../../prisma/schema.prisma)). Campos (o esquema físico usa os tipos Prisma; abaixo, a forma conceitual):

```ts
interface MatchCommandLogEntry {
  simulationId: UUID;        // FK MatchSimulation
  matchSequence: bigint;     // ordem-verdade (server-assigned)
  appliedAtTick: number;     // tick determinístico de aplicação (§2.3)
  commandType: string;       // 'SubstitutionMade' | 'TacticsSet' | 'DecisionPointResolved' | ...
  controlSource: MatchControlSource; // USER_ONLINE | USER_OFFLINE_AI | FULL_AI | SYSTEM
  payloadSnapshot: Json;     // estado congelado do command (não referência mutável)
  commandId: UUID;           // idempotência / desempate estável
  acceptedAt: DateTime;      // auditoria (não entra no cálculo)
}
// índice: (simulationId, matchSequence) único e ordenável
```

O `commandLog` **é** a lista `C` do kernel. Reaplicá-lo em ordem sobre `I, R, A, s` **é** o replay.

### 3.3 Hashes e o que eles provam

| Hash | Cobre | Prova |
|------|-------|-------|
| `inputHash` | forças + contexto + escalação congelados (`I`) + `rulesetVersionId` + `rngAlgorithm` + `seed` | que a **entrada** não foi adulterada; dois servidores com o mesmo `inputHash` partem do mesmo ponto |
| hashes de snapshot | cada snapshot individual | isola **qual** entrada divergiu numa auditoria |
| `resultHash` | `O` (placar, eventos, série de ticks) | que o **resultado** replayado bate com o registrado; divergência ⇒ `engineVersion`/`rulesetVersion`/RNG incompatíveis, ou adulteração |

**Verificação de replay:** re-executar `K(I, R, A, s, C)` deve reproduzir `resultHash`. Se **não** reproduzir com o mesmo `(engineVersion, rulesetVersion, rngAlgorithm)`, o kernel **não** é determinístico — é um bug bloqueante, não um "azar". Isso é o teste de aceite central de B-05.

---

## 4. RNG determinístico e streams por finalidade

### 4.1 Algoritmo nomeado

> **Decisão ratificada — R-146:** o RNG canônico é o **PCG** (variante **PCG-XSH-RR 64/32**, apelidada `pcg32`), gravado em `rngAlgorithm`. Racional: estado pequeno (128 bits: `state` + `inc`), rápido, estatisticamente forte, com **implementação de referência trivialmente portável** entre linguagens/plataformas (o mesmo resultado em Node, worker e ferramenta de auditoria), e com **suporte nativo a múltiplas streams independentes** pelo seletor de sequência (`inc`). Alternativa aceitável: **xoshiro256\*\***. Como o algoritmo é **gravado no manifesto**, trocá-lo é uma mudança versionada (novo `rngAlgorithm` ⇒, na prática, novo `engineVersion`), nunca uma troca silenciosa que quebraria replays antigos.

**Proibições (para o determinismo):** nada de `Math.random`, `crypto.getRandomValues` não-semeado, `Date.now()` como fonte de entropia, ou float não normalizado como semente. Toda aleatoriedade do motor **passa** pelo `A` semeado.

### 4.2 Derivação da seed a partir do mundo/partida

```
worldSeed   = GameWorld (fixada na criação do mundo, persistida)
matchSeed   = H( worldSeed ‖ matchId ‖ seasonNumber ‖ roundNumber )   → 128 bits (s)
streamSeed[p] = matchSeed com seletor de sequência distinto por finalidade p
```

`matchSeed` é **derivável** de identificadores estáveis (então re-derivável mesmo sem persistir), mas **é persistida** em `randomSeed` para auditoria direta e para o `inputHash`. `H` é a `hashAlgorithm` do manifesto (ex.: `sha256`). Isso concretiza o `matchSeed`/`tickSeed`/`eventSeed` que o GDD já previa ([`05-motor-de-partida.md §12`](../01-game-design/05-motor-de-partida.md)): `matchSeed` é a mestra; `tickSeed`/`eventSeed` são **reinterpretados como streams derivadas** (ver 4.3), não sementes soltas.

### 4.3 Streams por finalidade (a chave do replay estável)

O erro clássico que quebra replay: um único fluxo de RNG consumido por todos os eventos. Aí, **adicionar uma falta a mais em um tick desloca o índice de consumo de todos os sorteios seguintes** (chute, lesão, decisão) e o replay diverge. A solução é **uma stream independente por finalidade**, todas semeadas de `matchSeed`:

| Stream | Finalidade | Fórmulas |
|--------|------------|----------|
| `STREAM_ZONE` | origem do ataque entre as 9 zonas (softmax) | F5 |
| `STREAM_ATTACK` | nº de ataques relevantes por tick (Poisson) | F7 |
| `STREAM_DUEL` | desfecho multinomial dos duelos | F8 |
| `STREAM_CHANCE` | se o ataque vira chance + tier | F9 |
| `STREAM_SHOT` | finalização e chance de gol (o sorteio `U`) | F10, F11 |
| `STREAM_FOULCARD` | falta e cartão | F12 |
| `STREAM_INJURY` | incidência e tipo de lesão | F13 |
| `STREAM_RARE` | camada 3 (frango, golaço, gol contra, pênalti polêmico) | F11 (aleatoriedade rara) |
| `STREAM_STAFF` | detecção/leitura da comissão | F17, F19 |
| `STREAM_OFFLINE_AI` | escolhas da IA offline | F18 |

**Regras de ordenação (normativas):**

1. **Ordem fixa de consumo por tick.** Dentro de um tick, as streams são consumidas na ordem de resolução da [§1.2](#12-timestep-canônico). Cada sub-evento consome um **número fixo e documentado** de saques da sua stream.
2. **Isolamento.** Como cada finalidade tem sua stream, um saque a mais em `STREAM_FOULCARD` **nunca** desloca `STREAM_SHOT`. É isso que mantém o replay estável mesmo quando o número de eventos varia entre execuções candidatas — condição para o `resultHash` bater.
3. **Sem re-seed no meio da partida.** As streams avançam monotonicamente do kickoff ao apito; nenhum evento re-semeia uma stream (isso reintroduziria dependência de ordem global).

---

## 5. Retenção de manifestos e ticks

Liga com a **capacidade** (passo 13 da ordem de correção) e com o histórico permanente (`CMP-019`). A distinção-chave: **o manifesto é a fonte de verdade; a série de ticks é cache regenerável.**

> **Decisão ratificada — R-147:**

| Artefato | Tamanho | Política de retenção proposta |
|----------|---------|-------------------------------|
| **`SimulationManifest`** (cabeçalho: versões, seeds, snapshots de entrada, `commandLog`, hashes) | pequeno | **permanente** enquanto o mundo existir (e no arquivo do mundo). É o registro de auditoria/anti-"roubo" e a fonte para regenerar qualquer tick. Segue `CMP-019` (memória do mundo não se apaga). |
| **Série de ticks** (`MatchSimulationTick`, telemetria por tick) | **volumoso** (o grosso do custo) | **retenção limitada e regenerável.** Manter a série completa apenas de partidas recentes (ex.: temporada corrente + N dias) e depois **podar para só o manifesto**. Quando um tick antigo for necessário (auditoria, disputa, replay para debug), **regenerá-lo sob demanda** re-executando o manifesto no `engineVersion`+`rulesetVersion` fixados. |
| **Rulesets e binários de motor** referenciados | pequeno-médio | **reter enquanto existir qualquer manifesto que os fixe.** Um `rulesetVersion`/`engineVersion` só pode ser descartado quando **nenhum** manifesto o referencia; senão o replay fica impossível. |

**Tiers por importância (proposta).** Partidas decisivas (finais, títulos, acesso/rebaixamento) mantêm a série de ticks por mais tempo; partidas de rotina podam antes. O **dimensionamento** (partidas/dia × ticks/partida × bytes/tick) é entrada do passo 13 — a política aqui define **o que** é regenerável (ticks) e **o que** é permanente (manifesto), para que a capacidade seja calculada sobre o conjunto pequeno + uma janela do grande.

---

## 6. Ratificação de F1–F21 e fixação do `rulesetVersion`

### 6.1 F1–F21 são BASELINE RATIFICADA, não canônicas

Os **coeficientes** das fórmulas do motor `F1`–`F21` são baseline canônica de primeira passada: a fonte fixou a **estrutura** (quais termos somam/subtraem) e alguns exemplos, e cada fórmula recebeu uma **proposta de 1ª passada** marcada como `BASELINE RATIFICADA` na [Série R do catálogo §2.4](./05-catalogo-de-regras-e-formulas.md#24-recomendações-de-balanceamento-série-r):

| Recomendação | Cobre |
|--------------|-------|
| **R-15** | F1 (atributo efetivo, escala e clamp) |
| **R-16** | F2 (fadiga → penalidade e risco) |
| **R-17** | F3, F14 (moral e momentum) |
| **R-18** | F4, F20 (tática efetiva e deltas de ação) |
| **R-19** | F5–F9 (zonas, posse, ataques, duelos, chances) |
| **R-20** | F10, F11 (finalização e chance de gol) |
| **R-21** | F12, F13 (faltas, cartões, lesão) |
| **R-22** | F16–F19 (nota, `decisionScore`, offline, leitura da comissão) |
| **R-23** | F21 (`staffLevel`) |
| **R-24** | política de versionamento (`GameFormula.version` ↔ `rulesetVersion`) |

Enquanto **R-15..R-24 não forem ratificadas** no ADR, os coeficientes são **direção de trabalho**. A calibração final sai do **lote estatístico de ~10.000 partidas** por cenário (`R-34`, [`05-motor-de-partida.md §18`](../01-game-design/05-motor-de-partida.md)), com critérios de aceite (distribuição de placar realista, ausência de bola de neve exagerada, consistência entre ligas).

### 6.2 O replay fixa o `rulesetVersion` da época

A ponte entre "coeficientes que ainda vão mudar" e "partidas reproduzíveis" é o **carimbo de ruleset**:

- `GameFormula.version` é **local** a cada fórmula; `rulesetVersion` é o **carimbo agregado** do conjunto ativo — um `semver` que incrementa sempre que **qualquer** `GameFormula.version` muda ([catálogo §2.2, R-24](./05-catalogo-de-regras-e-formulas.md#22-versionamento-de-fórmulas)).
- O manifesto **grava `rulesetVersionId`** no kickoff ([§3.1](#31-campos-do-manifesto--todos-materializados-no-schema), campo 9). Assim, quando os coeficientes evoluem de `v1` para `v2`, uma partida jogada sob `v1` **replaya com `v1`** — o manifesto reconstitui as versões individuais de cada fórmula pelo manifesto de ruleset vigente à época.
- **Regra de recusa (R-24):** um servidor **recusa** processar/replayar um manifesto cujo `rulesetVersion` não corresponda a um ruleset que ele possui, evitando divergência entre servidores. O `inputHash` (que inclui `rulesetVersionId`) torna a checagem barata.
- Até F1–F21 serem ratificadas, o replay é bit-exato **dentro do mesmo par** `(engineVersion, rulesetVersion)`. A ratificação (R-15..R-24 → ADR) **congela o primeiro ruleset canônico** (`v1.0.0`); daí em diante toda mudança de coeficiente é um bump versionado, e nenhuma partida antiga é reinterpretada com números novos.

**Em uma frase:** os números de F1–F21 ainda vão mudar; o `rulesetVersion` garante que mudá-los **não** reescreve o passado — cada partida guarda a régua com que foi medida.

---

## 7. Rastreabilidade

**Fecha B-05** ([BACKLOG](../BACKLOG-PENDENCIAS.md)) nos quatro pontos apontados:

| Ponto de B-05 | Onde é resolvido |
|---------------|------------------|
| "timestep e equivalência online/offline divergem" | [§1](#1-kernel-único-e-timestep-canônico) — kernel único, tick canônico (R-143), prova de equivalência `O = K(I,R,A,s,C)` |
| "a partida simultaneamente continua e entra em `PAUSED_FOR_DECISION`" | [§1.3](#13-equivalência-online--offline-a-prova) + [`14 §9`](./14-maquinas-de-estado.md#9-resolução-da-contradição-partida-continua--pausa) (janela local time-boxed, sempre volta a `LIVE`) |
| "o manifesto de replay não preserva todas as entradas" | [§2](#2-protocolo-de-commands-da-partida) + [§3](#3-simulationmanifest-imutável) — `commandLog` ordenado, snapshots congelados, hashes (R-145); RNG por streams (R-146) |
| "F1–F21 não ratificadas" | [§6](#6-ratificação-de-f1f21-e-fixação-do-rulesetversion) — F1–F21 RATIFICADO (R-15..R-24), replay fixa `rulesetVersion` |

**Ligações:**

- **Fórmulas e ruleset:** [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md) — F1–F21, §2.2 (versionamento), §3.1 (máquina de partida).
- **Motor (design):** [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md) — kernel conceitual, seed/snapshot (§12), pontos críticos (§18). **Este doc é a especificação canônica de timestep/replay referenciada lá.**
- **Runtime da partida:** [`./14-maquinas-de-estado.md`](./14-maquinas-de-estado.md) §8–9.
- **Commands e tempo real:** [`./10-catalogo-de-commands.md`](./10-catalogo-de-commands.md) (nomes de command), [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md) (`matchSequence`, recuperação).
- **Schema:** [`../../prisma/schema.prisma`](../../prisma/schema.prisma) — `MatchSimulation`, `MatchSimulationTick`, `Match`, `GameWorld.currentRuleSetVersionId`.
- **Decisões ratificadas especificadas aqui (registradas no [registro §6](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11), bloco Replay):** **R-143** (kernel único + timestep), **R-144** (ordem determinística de commands), **R-145** (`SimulationManifest` imutável + campos presentes na baseline física + `MatchCommandLog`), **R-146** (RNG PCG + streams por finalidade), **R-147** (retenção de manifestos/ticks). Reforçam **R-24/R-30** (versionamento de ruleset) e **R-15..R-23** (coeficientes F1–F21) já existentes.
