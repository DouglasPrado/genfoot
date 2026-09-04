# Grinta Football Engine

**A deterministic football manager engine built around a persistent world, a headless domain core and reliable simulation infrastructure.**

Grinta is a football management simulation where the world keeps evolving beyond individual matches.

Clubs, players, competitions, careers and seasons live inside a persistent simulation designed to be **deterministic, reproducible and independent from infrastructure concerns**.

The project separates football rules from databases, queues, HTTP APIs and user interfaces so the simulation can evolve as a standalone domain engine.

---

## Why Grinta?

Most football games are centered around the next match.

Grinta is centered around the **world**.

The goal is to simulate an ecosystem where:

* every player has an individual lifecycle
* clubs evolve over multiple seasons
* competitions have persistent history
* decisions create long-term consequences
* the simulation can progress without a connected user
* the same inputs can reproduce the same result
* failures in infrastructure do not corrupt the simulation timeline

This makes Grinta as much an **engineering experiment in persistent simulation** as it is a football manager.

---

# Core Principles

## Persistent World

A Grinta world exists independently from a player session.

The simulation has its own clock, state and history.

```text
World
 ├── Clubs
 ├── Players
 ├── Squads
 ├── Competitions
 ├── Seasons
 ├── Fixtures
 ├── Events
 └── Scheduled Tasks
```

The world can continue evolving as seasons advance and scheduled events are processed.

---

## Deterministic Simulation

Competitive randomness never relies directly on `Math.random()`.

Grinta uses a seeded random number generator based on **PCG32**, with derived streams generated from the world seed and execution context.

Conceptually:

```text
worldSeed
    │
    ├── player-generation
    ├── club-generation
    ├── competition
    ├── match
    └── other simulation contexts
```

The objective is simple:

> Given the same world state, seed and ordered inputs, the simulation should produce the same result.

Determinism makes the engine easier to:

* test
* debug
* reproduce
* inspect
* simulate
* replay
* evolve safely

---

## Headless Domain Core

The football domain does not depend on:

```text
Prisma
PostgreSQL
Redis
HTTP
React
Expo
Next.js
queues
workers
```

Those are infrastructure concerns.

The core owns football rules and simulation behavior.

```text
                 ┌──────────────────┐
                 │   Grinta Core    │
                 │                  │
                 │ Football Domain  │
                 │ World Engine     │
                 │ Deterministic RNG│
                 └─────────┬────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         Persistence      API       Applications
```

This boundary allows the simulation engine to run independently from the production platform.

---

## Reliable Scheduling

A persistent world requires more than a cron job.

Grinta includes a scheduler designed around concepts normally found in reliable backend systems:

* persistent tasks
* deterministic ordering
* idempotency
* bounded retries
* checkpoints
* leases
* fencing tokens
* cancellation
* explicit retry
* recurring jobs

This allows simulation work to be resumed safely without unintentionally processing the same effect twice.

---

# World Lifecycle

A world starts in a controlled creation state.

```text
CREATING
   │
   ▼
GENESIS
   │
   ▼
VALIDATION
   │
   ▼
ACTIVATION
   │
   ▼
ACTIVE
   │
   ▼
SIMULATION
```

Creation and activation are intentionally separate operations.

The world is not activated until its generated state has been validated.

---

# World Genesis

The current genesis implementation deterministically creates an initial football universe containing:

```text
16 clubs

368 people / players

16 squads

23 players per squad

1 initial league

30 league rounds
```

All entities are generated from the world seed.

Example:

```bash
pnpm simulator world:create \
  --seed grinta-001 \
  --start-date 2026-01-01
```

Inspect the world:

```bash
pnpm simulator world:inspect --world <world-id>
```

Generate the initial universe:

```bash
pnpm simulator world:genesis --world <world-id>
```

Activate it:

```bash
pnpm simulator world:activate --world <world-id>
```

Only after validation and activation can the simulation clock advance.

---

# Simulation Clock

Time inside Grinta belongs to the world.

Advancing a day is a domain operation:

```bash
pnpm simulator day:simulate \
  --world <world-id> \
  --days 1
```

During advancement, the scheduler finds tasks whose execution date has arrived and processes them according to:

```text
due date
   ↓
priority
   ↓
stable task identity
```

This allows world progression to remain predictable and reproducible.

---

# Scheduler

Inspect scheduler state:

```bash
pnpm simulator scheduler:inspect --world <world-id>
```

Execute pending tasks:

```bash
pnpm simulator scheduler:run --world <world-id>
```

Schedule work:

```bash
pnpm simulator scheduler:schedule \
  --world <world-id> \
  --type <task-type> \
  --due-on 2026-01-10 \
  --idempotency-key <key>
```

Retry a failed task:

```bash
pnpm simulator scheduler:retry \
  --world <world-id> \
  --task <task-id>
```

Cancel a task:

```bash
pnpm simulator scheduler:cancel \
  --world <world-id> \
  --task <task-id>
```

---

# Idempotency

Simulation infrastructure must tolerate retries.

A command with the same idempotency identity should not apply the same domain effect twice.

```text
Command A
   │
   ▼
processed
   │
   ▼
result persisted


Command A
   │
   ▼
already processed
   │
   ▼
previous result / no duplicate effect
```

This becomes particularly important as the engine moves from local simulation toward distributed workers.

---

# Leases and Fencing

A lease prevents multiple workers from intentionally owning the same scheduled work at the same time.

But a lease alone is insufficient.

A stalled worker may resume after its lease has expired.

Grinta therefore combines leases with **fencing tokens**.

```text
Worker A
lease = 41
fence = 41

        ↓ loses lease

Worker B
lease = 42
fence = 42

        ↓

Worker A wakes up
fence = 41

        ↓

rejected as stale
```

This protects simulation execution from stale workers performing obsolete work.

---

# Player Lifecycle

Players are not only attributes used during a match.

They are persistent entities inside the world.

The genesis process creates the authoritative lifecycle for each generated player and emits a `PlayerGenerated` event for every athlete.

Inspect the current player population:

```bash
pnpm simulator players:summary --world <world-id>
```

Inspect an individual player:

```bash
pnpm simulator player:inspect \
  --world <world-id> \
  --player <player-id>
```

The broader game design expands player simulation into areas such as:

* identity
* origin
* attributes
* personality
* development
* career history
* contracts
* physical condition
* reputation
* relationships
* retirement

---

# Architecture

Grinta is organized around a domain-first architecture.

```text
                       Applications
        ┌───────────────┼─────────────────┐
        │               │                 │
        ▼               ▼                 ▼
      Mobile           Admin             Guide
        │               │
        └───────────────┼─────────────────┘
                        │
                        ▼
                       API
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
   Persistence      API Client      Design System
        │
        └───────────────┐
                        ▼
                  ┌───────────┐
                  │   Core    │
                  │           │
                  │  Domain   │
                  │  Rules    │
                  │ World     │
                  │ Engine    │
                  │ RNG       │
                  └─────┬─────┘
                        │
                        ▼
                      Shared
```

The central rule is:

> Infrastructure can depend on the domain.
> The domain must not depend on infrastructure.

---

# Repository Structure

```text
grinta-football-engine/
│
├── apps/
│   ├── admin/              # Administrative application
│   ├── api/                # Backend API
│   ├── guide/              # Public game guide
│   └── mobile/             # Player application
│
├── packages/
│   ├── api-client/         # Typed API client
│   ├── core/               # Domain rules, RNG and World Engine
│   ├── design-system/      # Shared interface primitives
│   ├── persistence/        # Persistence implementation
│   └── shared/             # Shared types, IDs and contracts
│
├── docs/
│   ├── 00-produto/
│   ├── 01-game-design/
│   ├── 02-tecnico/
│   ├── 03-guia-do-jogador/
│   ├── 04-ui-ux/
│   └── 99-decisoes/
│
├── prisma/
├── scripts/
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

# Applications

## Mobile

The primary player-facing application.

The mobile experience is designed around the day-to-day work of managing a football club rather than exposing the internals of the simulation engine.

---

## Admin

Administrative and operational interface for managing and inspecting the platform.

---

## API

Backend entry point connecting applications to the domain and persistence layers.

The API acts as an application boundary rather than containing the football domain itself.

---

## Guide

Public-facing documentation for players, explaining the world, systems and rules of Grinta.

---

# Packages

## `@grinta/core`

The most important package in the repository.

It contains:

* football domain rules
* world lifecycle
* world generation
* seeded random infrastructure
* simulation logic
* scheduler concepts
* domain events

The package is designed to remain independent from infrastructure.

---

## `@grinta/persistence`

Persistence boundary and implementation for durable application state.

Keeping persistence outside the core prevents database concerns from leaking into football rules.

---

## `@grinta/shared`

Shared primitives used across packages and applications.

Examples include:

* IDs
* dates
* contracts
* common types

---

## `@grinta/api-client`

Typed communication layer used by applications consuming the backend API.

---

## `@grinta/design-system`

Reusable interface components and design primitives shared by Grinta applications.

---

# Documentation

Grinta includes extensive product, game-design and engineering documentation.

```text
docs/
│
├── 00-produto
│   └── Product vision, positioning and identity
│
├── 01-game-design
│   └── Game Design Document and simulation systems
│
├── 02-tecnico
│   └── Architecture, data model and implementation
│
├── 03-guia-do-jogador
│   └── Player-facing documentation
│
├── 04-ui-ux
│   └── Application flows and interface design
│
└── 99-decisoes
    └── Architectural Decision Records
```

The documentation is intentionally separated into:

```text
WHY
 ↓
WHAT
 ↓
HOW
 ↓
DECISIONS
```

This keeps product rules, game design, implementation details and historical decisions independently traceable.

---

# Game Systems

The broader Grinta design covers systems including:

### Persistent World

Clubs and competitions continue evolving over multiple seasons.

### Players

Generation, attributes, development, history and lifecycle.

### Club Management

Squads, staff, finances, infrastructure and sporting decisions.

### Economy

Club-level and world-level economic simulation.

### Match Engine

Deterministic football match simulation.

### Seasons and Competitions

Calendars, leagues, competitions and progression.

### Artificial Intelligence

Decision engines controlling non-human actors in the world.

### Stadium, Region and Weather

Environmental variables that affect the football ecosystem.

### Supporters and Media

Fan sentiment, press, reputation and narrative.

### International Football

National teams and international calendars.

These systems are documented individually under `docs/01-game-design`.

---

# Technology

The workspace is currently built around:

```text
TypeScript
Node.js 22
pnpm
Turborepo
Vitest
ESLint
Prettier
Prisma
Docker
```

The repository follows a monorepo architecture so applications and shared domain packages can evolve together while maintaining explicit boundaries.

---

# Requirements

```text
Node.js >= 22 < 23
pnpm >= 10 < 11
```

The repository currently pins:

```text
pnpm 10.33.2
```

Enable Corepack:

```bash
corepack enable
```

Install dependencies:

```bash
pnpm install
```

---

# Development

Run development tasks across the workspace:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

Watch tests:

```bash
pnpm test:watch
```

Type check:

```bash
pnpm typecheck
```

Lint:

```bash
pnpm lint
```

Check formatting:

```bash
pnpm format:check
```

Format the repository:

```bash
pnpm format
```

---

# Local Simulator

The simulator provides a way to exercise the world engine without depending on the production application stack.

This is useful for:

* domain development
* debugging
* deterministic reproduction
* world inspection
* testing scheduler behavior
* simulation experiments

Local world snapshots are stored under:

```text
.grinta/simulator/worlds
```

A custom location can be configured through:

```text
GRINTA_SIMULATOR_DATA_DIR
```

---

# Engineering Goals

Grinta deliberately optimizes for several properties.

## Reproducibility

A simulation bug should be reproducible from its inputs.

## Explicit State

Important world transitions should be represented by explicit state rather than hidden side effects.

## Domain Isolation

Football rules should remain independent from frameworks and infrastructure.

## Reliable Execution

Retrying infrastructure should not mean repeating domain effects.

## Long-Term Evolution

The architecture should support a game world that survives many seasons and increasingly complex systems.

## Observability

The state of a world, player, scheduler or simulation should be inspectable instead of opaque.

---

# Design Decisions

Several architectural decisions define the project.

### Determinism over uncontrolled randomness

All competitive randomness flows through seeded generators.

This makes simulations reproducible.

### Domain before infrastructure

Core football behavior is implemented before coupling it to databases, APIs or queues.

### Persistent scheduler over simple timers

World progression requires durable execution semantics.

### Idempotency over assuming exactly-once delivery

Infrastructure can retry.

Domain effects therefore need stable identities.

### Leases plus fencing over naive distributed locking

A worker holding an expired lease must not be able to perform stale work.

### Explicit lifecycle over partially-created worlds

World creation, genesis, validation and activation are separate operations.

### Documentation as part of architecture

Important product and engineering decisions are captured in documentation and ADRs rather than existing only in implementation history.

---

# Project Status

Grinta is under active development.

The project already contains the foundations for:

* deterministic world generation
* persistent world state
* player lifecycle
* season scheduling
* reliable scheduled tasks
* idempotent execution
* seeded randomness
* local simulation
* domain-driven architecture

The broader game and platform are being built incrementally on top of those foundations.

Public APIs, persistence models and game rules may evolve while the project is under development.

---

# Quality

Before submitting changes:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

A particularly important invariant:

> Competitive randomness inside the core must go through `SeededRandom`.

Do not introduce `Math.random()` into domain simulation code.

---

# Contributing

Grinta is currently under active development.

If you want to explore the architecture, the best starting points are:

```text
packages/core/
docs/01-game-design/
docs/02-tecnico/
docs/99-decisoes/
```

For implementation work, preserve the most important architectural boundary:

```text
Domain
  ↑
Application
  ↑
Infrastructure
```

Infrastructure concerns should not become dependencies of the football domain.

---

# Philosophy

Football management becomes more interesting when the world remembers what happened.

Players age.

Careers emerge.

Clubs rise and fall.

Managers leave histories behind.

Competitions create traditions.

Decisions made today affect seasons that have not happened yet.

Grinta is built around that idea:

> **The match is an event. The world is the game.**

---

## License

License information will be documented as the project moves toward public distribution.
