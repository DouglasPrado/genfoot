# Catálogo de Regras, Fórmulas, Máquinas de Estado e Invariantes

> **Status:** Rascunho consolidado · **Fontes:** chats/como-construir-jogo-regras.md · **Revisão:** 2026-07-10

Este documento consolida a especificação executável do **Grinta**: o catálogo de regras identificáveis, o catálogo de fórmulas versionadas, as máquinas de estado de partida e temporada, os eventos de domínio e as invariantes que o sistema jamais pode violar.

O objetivo é transformar as decisões de design — hoje dispersas em conversas de brainstorming — em uma fonte oficial e estável, que sirva de contrato entre o design de jogo e a implementação técnica. As regras recebem identificadores estáveis para poderem ser referenciadas em código, testes e documentação sem ambiguidade.

## Sumário

- [1. Catálogo de Regras](#1-catálogo-de-regras)
  - [1.1 Sistema de IDs estáveis](#11-sistema-de-ids-estáveis)
  - [1.2 Interface `GameRule`](#12-interface-gamerule)
  - [1.3 Regras catalogadas](#13-regras-catalogadas)
- [2. Catálogo de Fórmulas](#2-catálogo-de-fórmulas)
  - [2.1 Interface `GameFormula`](#21-interface-gameformula)
  - [2.2 Versionamento de fórmulas](#22-versionamento-de-fórmulas)
  - [2.3 Fórmulas conceituais previstas](#23-fórmulas-conceituais-previstas)
- [3. Máquinas de Estado](#3-máquinas-de-estado)
  - [3.1 Partida](#31-partida)
  - [3.2 Temporada](#32-temporada)
- [4. Eventos de Domínio](#4-eventos-de-domínio)
- [5. Invariantes](#5-invariantes)
- [6. Interfaces TypeScript de Referência](#6-interfaces-typescript-de-referência)
- [7. Notas de Ligação](#7-notas-de-ligação)

---

## 1. Catálogo de Regras

O catálogo de regras é a lista oficial das decisões de design que governam o comportamento do universo. Cada regra é uma unidade nomeada, identificável e — quando aplicável — configurável, para permitir balanceamento sem reescrever o domínio.

### 1.1 Sistema de IDs estáveis

Cada regra recebe um identificador estável, composto por um **prefixo temático** e um **número sequencial** de três dígitos. O ID nunca muda depois de atribuído, mesmo que a descrição da regra seja refinada — isso garante que referências em código, testes e outros documentos permaneçam válidas.

| Prefixo | Domínio     | Escopo |
|---------|-------------|--------|
| `ECO-`  | Economia    | Caixa, oferta monetária, inflação, receitas, despesas, preços de mercado |
| `PLY-`  | Jogadores   | Unicidade, geração, atributos, evolução, aposentadoria, equilíbrio etário |
| `MAT-`  | Partidas    | Simulação, intervenções táticas, eventos de jogo, resultado |
| `USR-`  | Usuário     | Regras específicas do jogador humano e sua relação com o clube |

> **Pendência:** Concluir a extração de **todas** as regras a partir dos documentos de game design em `../01-game-design/`. Este catálogo lista apenas as regras já exemplificadas nas fontes e deve ser expandido até cobrir integralmente economia, jogadores, partidas, competições e usuário.

### 1.2 Interface `GameRule`

Toda regra é descrita segundo a interface abaixo. Os campos `inputs`, `outputs`, `dependencies` e `invariants` conectam a regra ao restante do sistema; `configurable` indica se a regra expõe parâmetros ajustáveis para balanceamento.

```ts
interface GameRule {
  id: string;            // Identificador estável (ex.: "ECO-001")
  name: string;          // Nome curto e legível
  description: string;   // Descrição normativa da regra
  inputs: string[];      // Dados/entidades que a regra consome
  outputs: string[];     // Efeitos/estados que a regra produz
  dependencies: string[];// Outras regras ou módulos dos quais depende
  invariants: string[];  // Invariantes que a regra ajuda a preservar
  configurable: boolean; // Se expõe parâmetros ajustáveis
}
```

### 1.3 Regras catalogadas

As regras a seguir foram extraídas diretamente das fontes de brainstorming. Descrições, entradas, saídas, dependências e invariantes marcados como pendência ainda precisam ser formalizados junto ao game design.

| ID        | Nome                                   | Descrição |
|-----------|----------------------------------------|-----------|
| `ECO-001` | Caixa inicial igual                    | Todos os clubes iniciam com o mesmo valor-base em caixa. |
| `ECO-002` | Oferta monetária por clubes ativos     | A oferta monetária do universo depende da quantidade de clubes ativos. |
| `PLY-001` | Unicidade do jogador                   | Cada jogador é único no universo. |
| `PLY-002` | Geração com equilíbrio etário          | A geração de jogadores considera o equilíbrio etário do universo. |
| `MAT-001` | Intervenção tática em tempo real       | Partidas online permitem intervenções táticas em tempo real. |
| `USR-001` | Usuário não pode ser demitido          | O usuário humano não pode ser demitido do seu clube. |

**Detalhamento inicial das regras** (campos ainda a completar marcados como pendência):

#### ECO-001 — Caixa inicial igual
- **Descrição:** Todos os clubes iniciam a existência com o mesmo valor-base em caixa, garantindo ponto de partida econômico uniforme.
- **`configurable`:** `true` (o valor-base é um parâmetro de balanceamento).
- **Invariantes relacionadas:** o dinheiro do universo é rastreável desde a criação (ver [INV-3](#5-invariantes)).

> **Pendência:** Definir `inputs`, `outputs` e `dependencies` formais, e o valor-base concreto.

#### ECO-002 — Oferta monetária por clubes ativos
- **Descrição:** A quantidade de dinheiro disponível no universo é função da quantidade de clubes ativos.
- **`configurable`:** `true`.
- **Dependências:** relaciona-se com as fórmulas de inflação e de receita de clubes.

> **Pendência:** Formalizar a relação (linear? por faixa?) entre número de clubes ativos e oferta monetária.

#### PLY-001 — Unicidade do jogador
- **Descrição:** Cada jogador é uma entidade única; não existem duplicatas nem clones no universo.
- **`configurable`:** `false`.
- **Invariantes relacionadas:** nenhum jogador aparece sem evento de geração (ver [INV-6](#5-invariantes)).

#### PLY-002 — Geração com equilíbrio etário
- **Descrição:** A geração de novos jogadores considera o equilíbrio etário do universo, evitando distorções na pirâmide de idades.
- **`configurable`:** `true`.
- **Dependências:** aposentadorias (`PLY-*` a definir), número de vagas em elencos, idade média.

> **Pendência:** Definir a faixa de equilíbrio etário e os gatilhos de geração.

#### MAT-001 — Intervenção tática em tempo real
- **Descrição:** Em partidas online, o usuário pode intervir taticamente enquanto a partida ocorre, por meio de pontos de decisão.
- **`configurable`:** parcialmente (janelas e tipos de intervenção).
- **Dependências:** máquina de estado da partida (estado `PAUSED_FOR_DECISION`).

#### USR-001 — Usuário não pode ser demitido
- **Descrição:** O usuário humano nunca é demitido do clube que controla, independentemente de desempenho.
- **`configurable`:** `false`.

---

## 2. Catálogo de Fórmulas

As **fórmulas** são separadas das regras. Enquanto uma regra descreve *o que* deve valer, uma fórmula descreve *como* um valor é calculado. Manter as fórmulas isoladas e parametrizadas permite balancear o jogo sem reescrever o domínio.

### 2.1 Interface `GameFormula`

```ts
interface GameFormula {
  id: string;                          // Identificador estável da fórmula
  version: number;                     // Versão da fórmula (ver 2.2)
  parameters: Record<string, number>;  // Parâmetros de balanceamento
  calculate(input: unknown): unknown;  // Cálculo puro a partir da entrada
}
```

O método `calculate` deve ser uma função **pura e determinística**: dada a mesma entrada e os mesmos `parameters`, produz sempre o mesmo resultado. Isso é essencial para reprodutibilidade e auditoria.

### 2.2 Versionamento de fórmulas

Cada fórmula carrega um campo `version`. Quando o cálculo de uma fórmula muda de forma que altere resultados, incrementa-se a `version` em vez de mutar silenciosamente o comportamento. O versionamento permite:

- Comparar versões do motor sobre o mesmo universo.
- Auditar resultados históricos com a fórmula vigente à época (o registro de eventos guarda `rulesetVersion`).
- Reproduzir bugs e balanceamentos anteriores.
- Evitar divergência entre servidores que rodem versões diferentes.

> **Pendência:** Definir a política de correspondência entre `GameFormula.version` e o `rulesetVersion` do universo (`GameWorld.rulesetVersion`).

### 2.3 Fórmulas conceituais previstas

As fórmulas a seguir foram identificadas nas fontes como necessárias. Suas expressões concretas vivem nos documentos de game design (ver [Notas de Ligação](#7-notas-de-ligação)) e ainda precisam ser transcritas para especificação executável.

| Fórmula                     | Domínio conceitual |
|-----------------------------|--------------------|
| Evolução técnica            | Jogadores (motor de progressão) |
| Fadiga                      | Jogadores / partidas |
| Risco de lesão              | Jogadores / partidas |
| Geração de jogadores        | Jogadores / economia |
| Inflação                    | Economia |
| Preço de mercado            | Economia / mercado |
| Receita de clubes           | Economia |
| Impacto da comissão técnica | Clubes / progressão |
| Crescimento estrutural      | Clubes |
| Probabilidade de eventos    | Partidas |
| Desempenho em partidas      | Partidas |

> **Pendência:** Atribuir IDs estáveis a cada fórmula e transcrever suas expressões, parâmetros e versões a partir dos documentos de `../01-game-design/`.

---

## 3. Máquinas de Estado

As máquinas de estado definem os ciclos de vida das entidades temporais do jogo. Transições que não aparecem no diagrama são proibidas e devem ser rejeitadas pelo domínio.

### 3.1 Partida

```
SCHEDULED
  → PRE_MATCH
    → LIVE
      → PAUSED_FOR_DECISION
        → LIVE
      → FINISHED
        → PROCESSED
```

| Estado                | Significado |
|-----------------------|-------------|
| `SCHEDULED`           | Partida agendada no calendário; ainda não iniciada. |
| `PRE_MATCH`           | Preparação: escalações e táticas iniciais confirmadas. |
| `LIVE`                | Partida em andamento, simulada em intervalos pequenos. |
| `PAUSED_FOR_DECISION` | Pausa em ponto de decisão para intervenção tática (ver `MAT-001`). Retorna a `LIVE`. |
| `FINISHED`            | Partida encerrada; resultado definido. |
| `PROCESSED`           | Consequências aplicadas: classificação, físico/mental, finanças, eventos. |

O ciclo `LIVE → PAUSED_FOR_DECISION → LIVE` pode ocorrer múltiplas vezes durante a mesma partida. Uma vez em `FINISHED`, a partida jamais retorna a `LIVE` (ver [INV-2](#5-invariantes)).

### 3.2 Temporada

```
PLANNING
  → REGISTRATION
    → IN_PROGRESS
      → FINALIZING
        → OFF_SEASON
          → COMPLETED
```

| Estado         | Significado |
|----------------|-------------|
| `PLANNING`     | Definição de competições, formatos e calendário da temporada. |
| `REGISTRATION` | Inscrição de clubes e ajustes de elenco pré-temporada. |
| `IN_PROGRESS`  | Temporada em curso; rodadas e partidas sendo disputadas. |
| `FINALIZING`   | Encerramento de competições, apuração de classificação, promoção/rebaixamento e premiação. |
| `OFF_SEASON`   | Período entre temporadas: aposentadorias, geração de jogadores, mercado. |
| `COMPLETED`    | Temporada concluída; estado consistente para iniciar a próxima. |

---

## 4. Eventos de Domínio

Os eventos de domínio formam o registro imutável do que aconteceu no universo. São a base para notificações, narrativa, histórico, partidas ao vivo, auditoria, estatísticas, replay e processamento assíncrono.

| Evento                     | Descrição |
|----------------------------|-----------|
| `WorldCreated`             | Um universo foi criado. |
| `SeasonStarted`            | Uma temporada iniciou. |
| `PlayerGenerated`          | Um jogador foi gerado (única origem válida de um jogador). |
| `PlayerRetired`            | Um jogador se aposentou. |
| `MatchScheduled`           | Uma partida foi agendada. |
| `MatchStarted`             | Uma partida entrou em `LIVE`. |
| `GoalScored`               | Um gol foi marcado. |
| `TacticalInstructionIssued`| Uma instrução tática foi emitida (intervenção em tempo real). |
| `PlayerInjured`            | Um jogador sofreu lesão. |
| `TransferCompleted`        | Uma transferência foi concluída. |
| `ClubStructureUpgraded`    | A estrutura de um clube foi aprimorada. |
| `SeasonCompleted`          | Uma temporada foi concluída. |

Cada evento é persistido de forma imutável. A estrutura de registro prevista carrega `id`, `worldId`, `aggregateType`, `aggregateId`, `eventType`, `gameDate`, `sequence`, `payload`, `rulesetVersion` e `createdAt`.

---

## 5. Invariantes

Invariantes são condições que o sistema **nunca** pode violar em nenhum estado consistente. Elas devem ser garantidas pelo domínio e verificadas por testes de invariante e de propriedade.

| ID      | Invariante |
|---------|------------|
| INV-1   | **Um contrato ativo por jogador.** Um jogador só pode possuir um contrato ativo simultaneamente. |
| INV-2   | **Partida finalizada não volta a `LIVE`.** Uma partida em `FINISHED`/`PROCESSED` jamais retorna ao estado `LIVE`. |
| INV-3   | **Conservação do dinheiro.** Em qualquer transferência de valor, o dinheiro sai de uma entidade e entra em outra; não é criado nem destruído. Nenhum dinheiro aparece sem origem. |
| INV-4   | **Aposentado não pode ser escalado.** Nenhum jogador aposentado pode ser escalado para uma partida. |
| INV-5   | **Classificação corresponde aos resultados.** A classificação sempre reflete exatamente os resultados já processados. |
| INV-6   | **Todo jogador tem origem.** Nenhum jogador existe sem um evento `PlayerGenerated` correspondente. |
| INV-7   | **Faixa de equilíbrio populacional.** O número de jogadores permanece dentro da faixa de equilíbrio do universo. |

As invariantes centrais destacadas nas fontes são INV-1, INV-2, INV-3 e INV-4; INV-5 a INV-7 completam o conjunto de condições de consistência mencionadas.

---

## 6. Interfaces TypeScript de Referência

As interfaces abaixo são as citadas nas fontes e servem de contrato para os pacotes `rules`, `simulation`, `match-engine` e `domain`.

### `GameRule`

```ts
interface GameRule {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  invariants: string[];
  configurable: boolean;
}
```

### `GameFormula`

```ts
interface GameFormula {
  id: string;
  version: number;
  parameters: Record<string, number>;
  calculate(input: unknown): unknown;
}
```

### `CompetitionFormat`

O formato de competição é configurável por dados, não por código.

```ts
interface CompetitionFormat {
  participantCount: number;
  phases: CompetitionPhaseDefinition[];
  tieBreakers: TieBreaker[];
  promotionRules: MovementRule[];
  relegationRules: MovementRule[];
}
```

### `MatchSimulationInput`

Entrada do motor de partidas. A simulação integral (sem intervenção humana) deve funcionar primeiro; os comandos táticos em tempo real são adicionados depois.

```ts
interface MatchSimulationInput {
  home: TeamSnapshot;
  away: TeamSnapshot;
  homeTactics: Tactics;
  awayTactics: Tactics;
  context: MatchContext;
  seed: string;
}
```

### `MatchSimulationResult`

Saída do motor de partidas. Reúne placar, eventos, desempenhos individuais, consequências físicas e o relatório tático da partida simulada.

```ts
interface MatchSimulationResult {
  score: Score;
  events: MatchEvent[];
  playerPerformances: PlayerPerformance[];
  physicalConsequences: PhysicalImpact[];
  tacticalReport: TacticalReport;
}
```

> **Pendência:** Especificar os tipos auxiliares referenciados (`CompetitionPhaseDefinition`, `TieBreaker`, `MovementRule`, `TeamSnapshot`, `Tactics`, `MatchContext`, `Score`, `MatchEvent`, `PlayerPerformance`, `PhysicalImpact`, `TacticalReport`) no Domain Kernel.

---

## 7. Notas de Ligação

As fórmulas conceituais deste catálogo têm sua definição matemática e de balanceamento nos documentos de game design:

- **Economia** (inflação, oferta monetária, receita de clubes, preço de mercado, `ECO-*`) → `../01-game-design/` (documento de economia).
- **Motor de partidas** (desempenho, probabilidade de eventos, fadiga, lesão, `MAT-*`) → `../01-game-design/` (documento do motor de partidas).
- **Jogadores** (evolução técnica, geração, aposentadoria, equilíbrio etário, `PLY-*`) → `../01-game-design/` (documento de jogadores).

Este catálogo é a camada técnica que referencia essas fontes; ele fixa **IDs, interfaces, estados, eventos e invariantes**, enquanto as expressões numéricas e curvas de balanceamento permanecem nos documentos de game design correspondentes.

> **Pendência:** Confirmar os nomes de arquivo exatos em `../01-game-design/` e substituir as referências genéricas por links diretos quando os documentos estiverem consolidados.
