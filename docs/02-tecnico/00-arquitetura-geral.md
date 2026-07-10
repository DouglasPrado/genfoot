# Arquitetura Geral (Stack e Topologia)

> **Status:** Rascunho consolidado · **Fontes:** chats/como-construir-jogo-regras.md, chats/funcionamento-brasfoot.md · **Revisão:** 2026-07-10

Este documento define a arquitetura de referência do **Grinta**, um manager de futebol online com jogadores únicos e mundo persistente (herdeiro conceitual do Brasfoot, mas com identidade própria por atleta). Ele consolida as decisões de topologia, estrutura de repositório, stack tecnológica e princípios transversais que orientam toda a construção técnica do jogo.

## Sumário

1. [Decisão arquitetural: monólito modular + workers](#1-decisão-arquitetural-monólito-modular--workers)
2. [Estrutura do monorepo](#2-estrutura-do-monorepo)
3. [Stack tecnológica recomendada](#3-stack-tecnológica-recomendada)
4. [Princípios transversais](#4-princípios-transversais)
5. [Mapa de engines/módulos do core](#5-mapa-de-enginesmódulos-do-core)
6. [Documentos relacionados](#6-documentos-relacionados)

---

## 1. Decisão arquitetural: monólito modular + workers

A arquitetura do Grinta adota um **monólito modular acompanhado de workers separados**. Não se inicia o projeto com múltiplos microsserviços.

**Por que essa escolha:**

- **Domínio fortemente acoplado.** Economia, jogadores, temporadas, competições e clubes compartilham o mesmo universo persistente e interagem constantemente. Separá-los prematuramente em microsserviços introduziria complexidade de coordenação (transações distribuídas, consistência eventual) sem benefício real nesta fase.
- **Simplicidade operacional.** Um monólito modular é mais fácil de desenvolver, testar e depurar, especialmente enquanto as regras ainda estão sendo balanceadas.
- **Fronteiras internas claras.** A modularidade é preservada por pacotes bem delimitados (ver seção 2), não por serviços de rede. Isso permite evoluir para serviços independentes no futuro, se necessário, sem reescrever o domínio.
- **Workers para trabalho pesado e assíncrono.** Simulações longas, processamento de partidas, avanço de temporadas e tarefas agendadas rodam em processos dedicados (worker/scheduler), mantendo a API responsiva sem quebrar a unidade do domínio.

Essa combinação entrega o isolamento de responsabilidades desejado, mas evita o custo prematuro da fragmentação em serviços.

---

## 2. Estrutura do monorepo

O repositório é um **monorepo** organizado em aplicações (`apps/`) e pacotes compartilhados (`packages/`).

```text
grinta/
├── apps/
│   ├── api/        # Camada HTTP/WebSocket, autenticação, orquestração de casos de uso
│   ├── web/        # Painel do jogador (Next.js): elenco, escalação, partida, mercado, competições
│   ├── worker/     # Processamento assíncrono (simulações, partidas, jobs pesados)
│   └── scheduler/  # Disparo de tarefas agendadas (avanço de dias/temporadas, eventos futuros)
│
└── packages/
    ├── core/       # Regras do jogo, cálculos e simulação (incl. match-engine isolado)
    ├── database/   # Prisma, models e persistência
    └── shared/     # Types, DTOs e contratos compartilhados entre apps
```

### Aplicações (`apps/`)

| App | Responsabilidade |
| --- | --- |
| `api` | Expõe a interface HTTP e WebSocket, cuida de autenticação e orquestra os casos de uso sobre o domínio. |
| `web` | Frontend em Next.js com as telas do jogador (elenco, escalação, central da partida, mercado, classificação, finanças). |
| `worker` | Executa trabalho pesado e assíncrono via filas: simulação de partidas, temporadas longas e processamento de eventos. |
| `scheduler` | Agenda e dispara tarefas temporais do mundo (avanço do relógio do jogo, rodadas, eventos programados). |

### Pacotes (`packages/`)

| Pacote | Responsabilidade |
| --- | --- |
| `core` | Coração do jogo: regras, fórmulas, cálculos e a simulação. Inclui o **match-engine** como unidade isolada e headless. Não depende de Prisma, Redis, HTTP nem da interface. |
| `database` | Modelagem Prisma, models e acesso a dados. Apenas persiste e recupera o estado produzido pelo `core`. |
| `shared` | Tipos, DTOs e contratos usados por todas as aplicações, garantindo tipagem ponta a ponta. |

> **Pendência:** As fontes divergem quanto à granularidade dos pacotes. O chat de arquitetura mais detalhado descreve um conjunto amplo (`domain`, `rules`, `simulation`, `match-engine`, `economy-engine`, `progression-engine`, `ai-engine`, `contracts`, `events`, `testkit`, `observability`, além de um app `simulator-cli`), enquanto a arquitetura MVP consolida tudo em `core`, `database` e `shared`. Definir se a topologia oficial parte do conjunto enxuto (MVP) e se expande, ou já nasce granular. Ver `./06-roadmap-de-implementacao.md`.

---

## 3. Stack tecnológica recomendada

A stack a seguir reúne as escolhas apresentadas nos chats de origem.

| Camada | Tecnologia | Observação |
| --- | --- | --- |
| Linguagem | TypeScript / Node.js | Base única para domínio, API, workers e web. |
| Frontend | **Next.js 15** | Painel do jogador. |
| Banco de dados | **PostgreSQL** | Estado persistente do mundo. |
| ORM / Persistência | **Prisma** | Camada `packages/database`. |
| Fila / Assíncrono | **Redis + BullMQ** | Simulações longas e processamento de partidas nos workers. |
| Tempo real | WebSocket | Partidas ao vivo e comandos em tempo real. |
| Monorepo | PNPM Workspaces + Turborepo | Gerência de pacotes e build. |
| Testes | Vitest | Unitários, de propriedade e de invariantes. |
| Observabilidade | OpenTelemetry | Instrumentação transversal. |

### Framework da API

> **Pendência:** As fontes não convergem para um único framework de API. São citados **NestJS**, **Fastify** e **AdonisJS** como candidatos. Decidir o framework oficial da camada `apps/api` (critérios sugeridos: suporte a WebSocket, integração com BullMQ, ergonomia de módulos e curva de adoção).

O restante da stack (Next.js, PostgreSQL, Prisma, Redis/BullMQ) é consenso entre as fontes e é adotado como padrão.

---

## 4. Princípios transversais

Estes princípios valem para todo o sistema e devem ser respeitados desde a primeira linha de código.

### 4.1 Determinismo desde o dia 1

Toda decisão aleatória usa uma **semente controlada**, nunca `Math.random()` diretamente. A aleatoriedade é derivada da semente do mundo combinada com um contexto estável (ex.: `match:<id>:minute:<n>`).

```ts
const random = new SeededRandom({
  worldSeed: world.seed,
  context: `match:${match.id}:minute:${minute}`,
});
```

Com determinismo garantido, a mesma entrada produz sempre o mesmo resultado, o que permite:

- reproduzir bugs de forma confiável;
- repetir partidas e temporadas em testes;
- auditar e comparar resultados entre versões do motor;
- evitar divergência entre servidores;
- investigar suspeitas de manipulação.

Cada mundo carrega sua própria `seed`, e praticamente todas as tabelas referenciam um `worldId`, viabilizando múltiplos mundos, simulação paralela e reinício de universo sem afetar outros jogos.

### 4.2 Event sourcing híbrido (estado atual + histórico de eventos)

O Grinta **não** adota event sourcing puro. O modelo é **híbrido**: tabelas de estado atual convivem com um registro imutável de eventos de domínio.

- **Tabelas de estado** representam a foto corrente (jogadores, clubes, contratos, partidas, classificação, finanças, competições).
- **Registro de eventos** (`game_events`) guarda o histórico imutável do que aconteceu, com `aggregateType`, `aggregateId`, `eventType`, data do jogo, `sequence`, `payload` e versão do ruleset.

Esse histórico é a base para notificações, narrativa do jogo, histórico de atletas, partidas ao vivo, auditoria financeira, estatísticas, replay e processamento assíncrono.

O detalhamento de entidades, tabelas e transações está em `./01-arquitetura-de-dados.md` e `./02-modelo-de-dados.md`.

### 4.3 Match-engine como pacote isolado e headless

O motor de partidas vive em um pacote próprio dentro de `core`, **isolado e headless** — testável sem qualquer dependência de tela, banco ou rede. Ele recebe uma entrada explícita e retorna um resultado puro.

```ts
const result = simulateMatch({
  home,        // snapshot do time mandante
  away,        // snapshot do time visitante
  homeTactics,
  awayTactics,
  context,     // incl. importância da partida (ex.: 'final')
  seed,        // determinismo por partida
});
// → { score, events, stats, playerRatings, ... }
```

Benefícios:

- a simulação pode ser testada isoladamente e em lote (muitos mundos × muitas temporadas);
- garante a propriedade de determinismo (mesma entrada e semente ⇒ mesmo resultado);
- desacopla o balanceamento das regras da evolução da interface.

O domínio como um todo segue essa regra: o `core` não depende de Prisma, Redis, HTTP ou UI; o Prisma apenas persiste e recupera o estado que o domínio produz.

---

## 5. Mapa de engines/módulos do core

O `core` se organiza em um conjunto de motores (engines) cooperantes, cada um responsável por um subsistema. Esta tabela consolida os engines mencionados nos chats de forma dispersa e aponta onde cada um é detalhado. A base conceitual comum (entidades → componentes → efeitos → eventos) está em [`./07-arquitetura-do-core-ecs.md`](./07-arquitetura-do-core-ecs.md).

| Engine / módulo | Responsabilidade | Detalhado em |
| --- | --- | --- |
| World / Season Lifecycle Engine | Relógio do mundo (`advanceDays`), abertura/virada de temporada, geração de competições e calendário | [temporada-e-competicoes](../01-game-design/06-temporada-e-competicoes.md), [roadmap](./06-roadmap-de-implementacao.md) |
| Competition Engine | Ligas, copas, continentais, tabelas, regras de qualificação e premiações | [temporada-e-competicoes](../01-game-design/06-temporada-e-competicoes.md) |
| Match Simulation Engine | Simulação tick-a-tick por zonas/threat, eventos, pontos de decisão (headless, com seed) | [motor-de-partida](../01-game-design/05-motor-de-partida.md) |
| Player Development Engine | Evolução por treino/minutos/eventos, potencial, curvas por idade, memória | [sistema-de-jogadores](../01-game-design/02-sistema-de-jogadores.md) |
| Club Progression Engine | Estrutura, departamentos, crescimento por mérito, peças investíveis | [estrutura-do-clube-e-staff](../01-game-design/04-estrutura-do-clube-e-staff.md), [core-ecs](./07-arquitetura-do-core-ecs.md) |
| Economy Engine | Receitas/despesas, contratos, mercado, saúde financeira, economia global balanceada | [economia](../01-game-design/03-economia.md) |
| Transfer Market Engine | Listagens, propostas, empresários, valor de mercado | [economia](../01-game-design/03-economia.md) |
| AI Decision Engine | Núcleo de decisão (Contexto+Perfil+Score+Probabilidade+Consequência) para todas as camadas de IA | [inteligencia-artificial](../01-game-design/07-inteligencia-artificial.md) |
| Narrative / Event Engine | Event bus, cascatas de efeitos, narrativas e notícias | [core-ecs](./07-arquitetura-do-core-ecs.md), [inteligencia-artificial](../01-game-design/07-inteligencia-artificial.md) |
| Notification Engine | Notificações estratégicas e de partida | [inteligencia-artificial](../01-game-design/07-inteligencia-artificial.md) |
| Anti-Cheat Engine | Risk score, multi-conta, manipulação, auditoria | [anti-abuso-e-onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |

> **Pendência:** os nomes/limites exatos dos pacotes que implementam cada engine (ver a divergência de granularidade na seção 2) ainda serão fixados na modelagem final.

---

## 6. Documentos relacionados

- **Modelagem de dados e transações:** `./01-arquitetura-de-dados.md`
- **Schema (modelo de dados):** `./02-modelo-de-dados.md`
- **Catálogo de regras e fórmulas:** `./05-catalogo-de-regras-e-formulas.md`
- **Ordem de construção:** `./06-roadmap-de-implementacao.md`
