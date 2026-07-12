# Arquitetura Geral (Stack e Topologia)

> **Status:** Rascunho consolidado · **Fontes:** chats/como-construir-jogo-regras.md, chats/funcionamento-brasfoot.md, chats/ux-do-jogo.md (Bloco 25), decisão de stack de interface 2026-07-11 (ver [`../04-ui-ux/`](../04-ui-ux/)) · **Revisão:** 2026-07-11

Este documento define a arquitetura de referência do **Grinta**, um manager de futebol online com jogadores únicos e mundo persistente (herdeiro conceitual do Brasfoot, mas com identidade própria por atleta). Ele consolida as decisões de topologia, estrutura de repositório, stack tecnológica e princípios transversais que orientam toda a construção técnica do jogo.

## Sumário

1. [Decisão arquitetural: monólito modular + workers](#1-decisão-arquitetural-monólito-modular--workers)
2. [Estrutura do monorepo](#2-estrutura-do-monorepo)
3. [Stack tecnológica recomendada](#3-stack-tecnológica-recomendada)
4. [Princípios transversais](#4-princípios-transversais)
5. [Mapa de engines/módulos do core](#5-mapa-de-enginesmódulos-do-core)
6. [Camadas conceituais e fronteiras de módulos](#6-camadas-conceituais-e-fronteiras-de-módulos)
7. [Topologia de processos executáveis](#7-topologia-de-processos-executáveis)
8. [Infraestrutura, implantação e operação](#8-infraestrutura-implantação-e-operação)
9. [Observabilidade](#9-observabilidade)
10. [Fases de evolução da arquitetura](#10-fases-de-evolução-da-arquitetura)
11. [Documentos relacionados](#11-documentos-relacionados)

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
│   ├── mobile/     # App do jogador (Expo/React Native): elenco, escalação, partida, mercado, competições — Android+iOS
│   ├── admin/      # Admin do mundo (Next.js): operação, RBAC, correções, moderação, equilíbrio
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
| `mobile` | **App do jogador** em Expo/React Native (Android+iOS) com as telas do jogo (elenco, escalação, central da partida, mercado, classificação, finanças). Cliente não-autoritativo: consome só a API oficial e o WebSocket. Distribuído nas lojas via EAS, não roda como contêiner de servidor. |
| `admin` | **Admin do mundo** em Next.js: painel de operação (RBAC, saúde econômica/demográfica, correções, moderação/anti-abuso, testes de equilíbrio). Cliente não-autoritativo, também consumindo só a API oficial e o WebSocket. |
| `worker` | Executa trabalho pesado e assíncrono via filas: simulação de partidas, temporadas longas e processamento de eventos. |
| `scheduler` | Agenda e dispara tarefas temporais do mundo (avanço do relógio do jogo, rodadas, eventos programados). |

> **Decisão (2026-07-11):** a stack de interface foi fixada em **app do jogador = Expo/React Native (`apps/mobile`)** e **admin do mundo = Next.js (`apps/admin`)**. Antes, esse app (então nomeado `apps/web`, em Next.js) era o painel do jogador (PWA); ver a evolução e os contratos em [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md) e o desenho de telas em [`../04-ui-ux/`](../04-ui-ux/).

> **Resolvido (2026-07-11):** as fontes de arquitetura descreviam o monorepo apenas com o app `web`; o encaixe do app Expo está agora fixado como **`apps/mobile`** (jogador) e o admin renomeado para **`apps/admin`** (Next.js), consistente com [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md) e com [`../04-ui-ux/00-visao-geral-e-design-system.md`](../04-ui-ux/00-visao-geral-e-design-system.md).
>
> **Nota:** os pacotes de UI por plataforma (`ui` para o admin web, `ui-native` para o app mobile) e a configuração de EAS/OTA seguem a decisão de granularidade de pacotes da seção 2 (início enxuto, expansão sob demanda) e os contratos de cliente em [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md).

### Pacotes (`packages/`)

| Pacote | Responsabilidade |
| --- | --- |
| `core` | Coração do jogo: regras, fórmulas, cálculos e a simulação. Inclui o **match-engine** como unidade isolada e headless. Não depende de Prisma, Redis, HTTP nem da interface. |
| `database` | Modelagem Prisma, models e acesso a dados. Apenas persiste e recupera o estado produzido pelo `core`. |
| `shared` | Tipos, DTOs e contratos usados por todas as aplicações, garantindo tipagem ponta a ponta. |

> **Resolvido (reconciliação):** a topologia oficial de pacotes **parte do conjunto enxuto** (`core`, `database`, `shared`) e **expande sob demanda** para o conjunto granular (`domain`, `rules`, `simulation`, `match-engine`, `economy-engine`, `progression-engine`, `ai-engine`, `contracts`, `events`, `testkit`, `observability`, além do app `simulator-cli`) conforme as fronteiras internas amadurecem — coerente com as fases de evolução da seção 10 e sem reescrever regras. O conjunto granular é o **alvo de destino**, não o ponto de partida; a extração de cada pacote acompanha a estabilização da fronteira do módulo/engine correspondente (ver `./06-roadmap-de-implementacao.md`).

---

## 3. Stack tecnológica recomendada

A stack a seguir reúne as escolhas apresentadas nos chats de origem.

| Camada | Tecnologia | Observação |
| --- | --- | --- |
| Linguagem | TypeScript / Node.js LTS | Base única para domínio, API, workers, app mobile e admin. TypeScript em modo `strict` obrigatório (ver princípios transversais na seção 4). |
| App do jogador (mobile) | **Expo / React Native** | Cliente principal do jogador, Android+iOS (decisão 2026-07-11). Distribuído via EAS. |
| Admin do mundo (web) | **Next.js 15** | Painel de operação do mundo. |
| Banco de dados | **PostgreSQL** | Estado persistente do mundo e fonte única de verdade. |
| ORM / Persistência | **Prisma** | Camada `packages/database`. |
| Mensageria / broker | **Redis + BullMQ** na fundação; **RabbitMQ** (durável, exchanges, filas quorum) ou **NATS** na evolução | Eventos de domínio, commands assíncronos, jobs distribuídos e integração interna. Broker inicial recomendado em R-78 (a ratificar); desenho durável em `./01-arquitetura-de-dados.md`. |
| Cache / dados efêmeros | **Redis** | Cache, presença, rate limiting, adapter de Socket.IO e locks não críticos. Nunca fonte definitiva de dados competitivos. |
| Fila / Assíncrono | **Redis + BullMQ** | Execução de jobs dos workers (retries, backoff, agendamento, dead letters), reaproveitando o Redis. Ver R-78. |
| Tempo real | WebSocket com **Socket.IO** | Partidas ao vivo, presença e comandos em tempo real. |
| Armazenamento de arquivos | **Cloudflare R2** | Escudos, avatares, relatórios, snapshots grandes, backups e arquivos históricos. |
| Monorepo | PNPM Workspaces + Turborepo | Gerência de pacotes e build. |
| Validação de contratos | **Zod** | Validação em runtime de payloads externos (API, mensageria, WebSocket, env, imports). |
| Testes | Vitest | Unitários, de propriedade e de invariantes. |
| Observabilidade | **OpenTelemetry + Prometheus + Grafana + Loki + Tempo** | Instrumentação, métricas, dashboards, logs e traces (ver seção 9). |
| Implantação | Docker, GitHub Actions, GHCR e **EasyPanel** | Imagens imutáveis publicadas no GHCR e implantadas no EasyPanel (ver seção 8). |

### Framework da API

> **Recomendação (a ratificar — R-77):** adotar **NestJS + TypeScript** como framework oficial da API. Racional: é o candidato preferencial já citado e a única escolha explícita das fontes (Bloco 25 de UX); atende diretamente os critérios levantados — suporte de primeira classe a **WebSocket/Socket.IO** (gateways), **módulos** que espelham os bounded contexts da seção 6, injeção de dependência que reforça a fronteira domínio↔infra, e integração pronta com a camada de mensageria (R-78) e com Zod nas fronteiras. **Fastify** entra como *adapter* HTTP sob o NestJS caso a latência exija (NestJS roda sobre Fastify), sem trocar o framework; **AdonisJS** fica descartado por acoplar ORM/estrutura próprios que conflitam com Prisma e com o desenho de módulos.

> **Recomendação (a ratificar — R-78):** adotar **Redis + BullMQ** como broker/execução assíncrona oficial na fase de fundação. Racional: para um **monólito modular + workers** (seção 1), Redis + BullMQ entrega filas duráveis, retries, backoff, jobs agendados e dead letters reaproveitando o Redis já presente (cache, presença, adapter de Socket.IO), sem o custo operacional de introduzir e operar um broker AMQP cedo. A modelagem de **Outbox/Inbox** (ver `./01-arquitetura-de-dados.md`) é independente do broker e preserva a garantia `AT_LEAST_ONCE` + idempotência. **Evolução:** migrar para **RabbitMQ** (exchanges, filas quorum, roteamento por routing key) — ou **NATS** para fan-out de eventos de domínio — quando volume, roteamento e múltiplos consumidores justificarem (fase 2+, ver seção 10). **Reconciliação:** onde as seções 7–10 e o [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md) descrevem RabbitMQ, trata-se do **desenho-alvo de mensageria durável**; na fundação o broker é Redis + BullMQ até a ratificação.

O restante da stack (Next.js, PostgreSQL, Prisma, Redis, Cloudflare R2, observabilidade e deploy) é consenso e é adotado como padrão.

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

Cada mundo carrega sua própria `seed`, e praticamente todas as tabelas referenciam a chave de partição do mundo — **`game_world_id`** no banco (snake_case) e **`gameWorldId`** no Prisma/TS (forma canônica; ver `./01-arquitetura-de-dados.md`) —, viabilizando múltiplos mundos, simulação paralela e reinício de universo sem afetar outros jogos.

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

### 4.4 Separação entre decisão e linguagem (IA)

A inteligência artificial do Grinta separa **decisão** (o que acontece) de **linguagem** (como é narrado). Essa fronteira protege o determinismo competitivo estabelecido em 4.1.

- **Lógica que altera estado oficial não depende de LLM.** Decisões competitivas — escalação da IA, mercado, negociações, resultado, evolução — são calculadas por regras determinísticas e reproduzíveis (ver 4.1 e o **AI Decision Engine** na seção 5), nunca delegadas a um modelo de linguagem.
- **Modelos generativos apenas para a camada de narrativa:** diálogo, explicação, notícias, entrevistas e variação textual.
- **A narrativa não inventa fatos:** ela descreve o que a simulação determinou e **não pode criar fatos incompatíveis com o estado oficial** (não altera placar, atributos, recursos nem validade de ações).
- **Decisões competitivas são reproduzíveis, rastreáveis e explicáveis** por seus dados de entrada e regras — auditáveis independentemente de qualquer componente generativo.

O detalhamento das camadas de IA está em [`../01-game-design/07-inteligencia-artificial.md`](../01-game-design/07-inteligencia-artificial.md).

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

> **Nota:** os nomes/limites exatos dos pacotes que implementam cada engine seguem a decisão de granularidade da seção 2 — os engines coexistem dentro do `core` no início e são extraídos para pacotes dedicados (`match-engine`, `economy-engine`, `progression-engine`, `ai-engine`, `events`) quando a fronteira de cada engine estabiliza.

---

## 6. Camadas conceituais e fronteiras de módulos

Internamente, o monólito modular organiza-se em três camadas conceituais, com dependência sempre no sentido de fora para dentro:

```text
Domínio  →  Aplicação  →  Infraestrutura
```

- **Domínio.** Entidades, agregados, objetos de valor, políticas, regras, invariantes, eventos e erros de domínio. **Não** depende de NestJS, Prisma, Redis, RabbitMQ, HTTP, WebSocket, R2 nem EasyPanel.
- **Aplicação.** Casos de uso, commands, queries, handlers, orquestrações, sagas, autorizações de negócio, portas de entrada e interfaces de repositório.
- **Infraestrutura.** Implementações concretas: Prisma/PostgreSQL, RabbitMQ, Redis, R2, HTTP, WebSocket, e-mail, logs, métricas e repositórios.

### Organização por domínio (bounded contexts)

O backend é dividido por contexto de negócio. Cada contexto é um módulo com estrutura interna própria (`/domain`, `/application`, `/infrastructure`, `/api`, `/contracts`, `/tests`):

`identity`, `world`, `club`, `person`, `player`, `squad`, `training`, `tactics`, `match`, `competition`, `calendar`, `market`, `scouting`, `transfer`, `contract`, `staff`, `finance`, `infrastructure` (do clube), `commercial`, `supporter`, `communication`, `history`, `notification`, `automation`, `administration`.

O monorepo reflete essa divisão com pacotes de plataforma (`domain`, `application`, `contracts`, `database`, `infrastructure`, `observability`, `configuration`, `testing`, `ui`) — a versão granular referida na pendência da seção 2.

### Regras de dependência e acoplamentos proibidos

- Módulos **não** acessam tabelas privadas, classes internas, repositórios ou serviços concretos de outro módulo. A comunicação ocorre por **interface de aplicação, contrato público, command, query ou evento**.
- **Shared kernel pequeno:** contém apenas primitivas (`EntityId`, `GameWorldId`, `ClubId`, `Money`, `Percentage`, `DateRange`, `WorldDate`, `Version`, `Result`, erros básicos, metadados de evento). Regras de negócio específicas **não** entram em pacote genérico.
- Proibidos, entre outros: Finance importar implementação de Transfer; Match escrever direto no banco de Contract; Notification alterar estado de Player; History decidir resultado; Frontend acessar banco; Worker ignorar a camada de aplicação; SQL de um módulo sobre tabelas de outro sem operação administrativa formal.
- **Testes de arquitetura** automatizados bloqueiam o merge quando: o domínio importa infraestrutura, um módulo acessa internos indevidos, a API acessa Prisma diretamente, um worker ignora casos de uso, o frontend importa domínio de servidor, ou há dependência circular.

---

## 7. Topologia de processos executáveis

Todos os **processos de servidor** compartilham o mesmo código-base e pacotes, mas rodam como contêineres separados. A implantação inicial possui sete processos de aplicação. O **app do jogador (Expo/React Native)** **não** é um desses processos: é um cliente nativo distribuído pelas lojas (App Store/Google Play via EAS), fora da topologia de contêineres — comunica-se apenas com `api` e `realtime-gateway`.

| Processo | Responsabilidade |
| --- | --- |
| `admin` | **Admin do mundo** (Next.js): navegação, cache local, sincronização e comunicação com API/WebSocket para a operação do mundo. Não executa regras oficiais. |
| `api` | Autenticação, commands síncronos, queries, validação, autorização, transações e criação de eventos. |
| `realtime-gateway` | Conexões WebSocket, salas (usuário/clube/mundo/partida), presença, entrega em tempo real e recuperação de sequência. **Não é fonte de verdade.** |
| `world-scheduler` | Relógios dos mundos, processamentos diários, disparo de partidas, prazos, expirações e tarefas agendadas. |
| `simulation-worker` | Simulação de partidas, IA em partida, runtime, comandos ao vivo, checkpoints e conclusão. |
| `async-worker` | Processamento de eventos, projeções, conciliações, rebuilds, mercado, histórico e jobs administrativos. |
| `notification-worker` | Notificações derivadas, agrupamentos, digests, push, e-mail e retentativas. |

Componentes de infraestrutura (fundação): `postgres`, `redis` (cache + broker/filas BullMQ, ver R-78), `otel-collector`, `prometheus`, `grafana`, `loki`, `tempo`; armazenamento externo em Cloudflare R2. Um broker de mensageria dedicado (`rabbitmq` ou `nats`) entra apenas na evolução (fase 2+, ver seção 10), não na fundação.

**Replicação futura:** `api`, `realtime-gateway`, `simulation-worker`, `async-worker` e `notification-worker` podem ter N réplicas. O `world-scheduler` é coordenado por **leases**, de modo que apenas um processo avance um dado mundo por vez.

---

## 8. Infraestrutura, implantação e operação

A infraestrutura inicial é projetada para caber em uma única instância operacional (EasyPanel) e evoluir sem reescrever regras (ver seção 10).

### EasyPanel, rede e serviços

- Cada processo é um serviço Docker no EasyPanel (`football-admin`, `football-api`, `football-realtime`, `football-world-scheduler`, `football-simulation-worker`, `football-async-worker`, `football-notification-worker`, além de `football-postgres`, `football-redis` — que na fundação acumula cache e broker/filas BullMQ (R-78) — e os serviços de observabilidade). Um serviço `football-rabbitmq` (ou `football-nats`) só é adicionado na evolução (fase 2+, ver seção 10).
- **Rede privada:** PostgreSQL e Redis (e, quando introduzido, o broker de mensageria dedicado) **não** são expostos à internet. Publicáveis apenas `admin`, `api` e `realtime-gateway`.
- **TLS/HTTPS** obrigatório no acesso público, com terminação no proxy do EasyPanel. Cloudflare pode fornecer DNS, proxy, CDN, proteção básica e cache de arquivos públicos.
- **Volumes persistentes** para PostgreSQL, Redis, Grafana e (conforme retenção) Loki/Prometheus; o broker dedicado (RabbitMQ/NATS) ganha volume próprio quando introduzido (fase 2+).

### Saúde e degradação controlada

- Cada serviço expõe `/health/live` e `/health/ready`. A `api` só fica *ready* com configuração válida, PostgreSQL acessível e migrações compatíveis.
- **Falha do broker de mensageria** (Redis/BullMQ na fundação; RabbitMQ/NATS na evolução): a API continua aceitando commands cuja transação e Outbox sejam gravadas — o evento é publicado depois.
- **Falha do Redis:** apenas degradação (perda de cache, reconstrução de presença); dados oficiais preservados.
- **Falha do R2:** uploads/downloads indisponíveis, mas partidas, contratos e finanças continuam.

### Configuração e segredos

- Variáveis de ambiente (`DATABASE_URL`, `REDIS_URL` — que na fundação também endereça o broker/filas BullMQ —, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `JWT_PRIVATE_KEY`, …) são **validadas na inicialização**; configuração inválida impede o boot em vez de operar parcialmente. `RABBITMQ_URL` (ou `NATS_URL`) passa a ser exigida apenas quando o broker dedicado for introduzido (fase 2+).
- Segredos ficam como secrets/variáveis protegidas do EasyPanel — nunca no repositório, na imagem, em logs ou em arquivos públicos.

### Ambientes e CI/CD

- Ambientes: `development` (Docker Compose com versões equivalentes de Postgres/Redis e R2 simulado; o broker dedicado é adicionado ao Compose quando introduzido na fase 2+), `test`, `staging` (reproduz topologia/variáveis/migrações/filas/observabilidade, sem segredos ou dados reais) e `production` (apenas artefatos aprovados e imutáveis).
- **Imagens Docker** imutáveis, com tag de versão, commit, data de build e checksum, publicadas no **GitHub Container Registry (GHCR)**. Pode-se usar uma imagem backend comum com diferentes comandos de inicialização.
- **Pipeline (GitHub Actions):** deps → format → lint → typecheck → testes → gerar cliente Prisma → validar migrações → build → imagens → GHCR → deploy no EasyPanel → verificações pós-deploy. Fluxo de branches `main` + `feature/*` + `fix/*`; produção derivada de `main`/tags. Releases têm versão, changelog, migrações, compatibilidade, feature flags e plano de rollback.

### Migrações e feature flags

- Migrações Prisma são versionadas, revisadas e testadas em cópia de staging. Mudanças arriscadas usam **expand-contract** (EXPAND → MIGRATE → SWITCH → CONTRACT). Migrações destrutivas **não** rodam automaticamente no boot (job/etapa dedicada); o rollback da aplicação não depende de reverter toda a migração.
- Feature flags ficam no PostgreSQL e são cacheadas no Redis; podem ter escopo por mundo quando não afetarem a justiça competitiva. Regras competitivas mudam por versão de regulamento + data efetiva + comunicação, nunca por flag invisível.

### Banco: conexões e ausência de serverless

- Pool de conexões controlado; réplica não abre conexões ilimitadas. **PgBouncer** pode ser introduzido se necessário.
- A arquitetura **não** é serverless na primeira fase — isso simplifica conexões, workers, WebSocket, partidas, jobs persistentes e scheduler.

Detalhes de mensageria, cache, backups (WAL-G → R2) e modelagem transacional estão em [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md).

---

## 9. Observabilidade

Toda aplicação usa **OpenTelemetry** desde o início, com traces propagados entre HTTP, WebSocket, RabbitMQ, workers, banco e jobs.

- **Metadados de trace:** `traceId`, `correlationId`, `commandId`, `eventId`, `gameWorldId`, `clubId`, `matchId`, `jobId`.
- **Métricas (Prometheus):** latência, erros, requests, conexões, filas, jobs, partidas, commands, eventos, cache, banco e runtime.
- **Logs (Loki):** estruturados em JSON. **Traces (Tempo).** **Dashboards (Grafana):** plataforma, API, banco, Redis, RabbitMQ, partidas, scheduler, jobs, mundo e deployments.
- **Alertas iniciais:** API indisponível, banco sem conexão, fila crescendo, scheduler atrasado, worker de partida sem heartbeat, disco alto, backup atrasado, erro crítico, invariante falhando, mundo em risco.
- **SLOs por fluxo** (não só pela plataforma inteira): commands comuns, partidas ao vivo, processamento diário, notificações críticas, consultas e recuperação. As metas de performance diferenciam consulta simples, consulta agregada, command e relatório pesado; consultas pesadas são assíncronas/cacheadas/baseadas em projeção e separadas dos commands críticos.

---

## 10. Fases de evolução da arquitetura

A arquitetura evolui por fases; nenhuma delas exige reescrever as regras do jogo.

| Fase | Foco | Conteúdo |
| --- | --- | --- |
| **1 — Fundação** | Single-host | Um EasyPanel, um PostgreSQL, um Redis (cache + broker BullMQ), apps/workers separados, R2 externo. Broker durável dedicado (RabbitMQ/NATS) só a partir da fase 2, se ratificado (R-78). |
| **2 — Escala horizontal** | Réplicas | Mais réplicas de API/gateway/workers, Redis Adapter, pool de conexões, particionamento de filas, banco ampliado. |
| **3 — Especialização** | Extração seletiva | Extrair (só com necessidade comprovada) motor de partidas, notificações, histórico, busca, analytics. |
| **4 — Distribuição por mundo** | Sharding lógico | Mundos atribuídos a clusters, roteamento por `gameWorldId`, migração de mundo, filas por partição, workers por região. |
| **5 — Alta disponibilidade** | Resiliência | PostgreSQL com réplica/failover, RabbitMQ em cluster, Redis com réplica/Sentinel, múltiplos hosts, balanceamento, recuperação regional. |

**Extração de serviço** só ocorre quando o módulo tem fronteira estável, carga própria, necessidade de escalar de forma independente e benefício superior ao custo de rede. A preparação (contratos públicos, eventos, repositórios próprios, dados identificáveis, sem importações internas indevidas) é mantida desde o início; a separação de aplicação e de dados pode ocorrer em fases distintas, e uma **anti-corruption layer** protege o domínio ao integrar módulos antigos, novos serviços ou fornecedores. Não se adota **2PC** entre serviços — consistência entre limites usa Outbox/Inbox, idempotência, sagas e compensações (ver `./01-arquitetura-de-dados.md`).

---

## 11. Documentos relacionados

- **Modelagem de dados e transações:** `./01-arquitetura-de-dados.md`
- **Schema (modelo de dados):** `./02-modelo-de-dados.md`
- **Catálogo de regras e fórmulas:** `./05-catalogo-de-regras-e-formulas.md`
- **Ordem de construção:** `./06-roadmap-de-implementacao.md`
