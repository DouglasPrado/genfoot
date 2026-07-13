# Tasks: Clube, elenco e infraestrutura

**Input**: Design documents from `/specs/004-club-squad-infrastructure/`  
**Prerequisites**: BC-002 is `DELIVERED`; requirements checklist is 17/17 complete.  
**Tests**: Required by the specification's independent tests and the repository TDD workflow.

## Phase 1: Setup and contract freeze

**Purpose**: Freeze the observable C3 boundary before changing persisted snapshots.

- [x] T001 Expand BC-003 v1 command, query, event, error, receipt and SAGA-04 schemas in specs/004-club-squad-infrastructure/contracts/README.md
- [x] T002 Reconcile aggregate boundaries, limits, project milestones, maintenance and compatibility decisions in specs/004-club-squad-infrastructure/data-model.md and specs/004-club-squad-infrastructure/research.md
- [x] T003 Create the C3 module and focused test structure in packages/core/src/clubs/ and packages/core/tests/clubs/

---

## Phase 2: Foundational domain model

**Purpose**: Establish shared C3 snapshots, repository ports and deterministic genesis bootstrap required by both stories.

- [x] T004 Define branded IDs, club/squad/department/stadium/commercial/governance snapshots, command receipts and world portfolio schema in packages/core/src/clubs/club-types.ts
- [x] T005 [P] Define ClubPortfolioRepository optimistic-concurrency and idempotency lookup ports in packages/core/src/clubs/club-repository.ts
- [x] T006 Implement deterministic conversion of WorldGenesisSnapshot into a versioned C3 portfolio in packages/core/src/clubs/club-bootstrap.ts
- [x] T007 Export the public C3 contract without adapter dependencies from packages/core/src/index.ts

**Checkpoint**: C3 types compile and a genesis snapshot can deterministically describe the initial portfolio.

---

## Phase 3: User Story 1 — Gerir o clube e seu elenco (P1)

**Goal**: Manage club identity, squad membership, departments, stadium policy, commercial agreements and board decisions with one effect per command.

**Independent Test**: A repeated command returns the same receipt, a stale version changes nothing, a player occupies one primary slot, and two worlds remain isolated.

### Tests for User Story 1

- [x] T008 [P] [US1] Add RED aggregate tests for identity periods, departments, stadium/ticket policy, commercial exclusivity and board audit fields in packages/core/tests/clubs/club.test.ts
- [x] T009 [P] [US1] Add RED squad tests for capacity, unique player membership and external-reference-only behavior in packages/core/tests/clubs/squad.test.ts
- [x] T010 [P] [US1] Add RED command tests for receipts, expected version, ruleset mismatch and world isolation in packages/core/tests/clubs/club-command-use-cases.test.ts
- [x] T011 [P] [US1] Add RED genesis bootstrap and replay tests for all 16 clubs and squads in packages/core/tests/clubs/club-bootstrap.test.ts

### Implementation for User Story 1

- [x] T012 [P] [US1] Implement the Club aggregate identity, department, stadium, ticket, commercial and governance invariants in packages/core/src/clubs/club.ts
- [x] T013 [P] [US1] Implement Squad membership assignment/removal, capacity and uniqueness invariants in packages/core/src/clubs/squad.ts
- [x] T014 [US1] Implement the world-scoped ClubPortfolio aggregate, receipts and versioned mutations in packages/core/src/clubs/world-club-portfolio.ts
- [x] T015 [US1] Implement bootstrap, inspect, update identity, assign squad slot, plan department, set ticket prices, sign commercial deal and record board decision use cases in packages/core/src/clubs/club-use-cases.ts
- [x] T016 [US1] Bootstrap C3 exactly once from genesis during world provisioning in packages/core/src/genesis/world-genesis-use-cases.ts
- [x] T017 [US1] Add JSON envelope v6 read/write compatibility and C3 repository concurrency to apps/simulator/src/json-world-repository.ts
- [x] T018 [US1] Add club bootstrap/inspect/identity/squad/department/ticket/commercial/board commands to apps/simulator/src/cli.ts
- [x] T019 [US1] Add JSON adapter and CLI integration coverage for restart, duplicate command and world isolation in apps/simulator/tests/json-world-repository.test.ts and apps/simulator/tests/cli.test.ts

**Checkpoint**: User Story 1 is independently executable from genesis through restart and replay.

---

## Phase 4: User Story 2 — Executar uma evolução de infraestrutura (P2)

**Goal**: Run SAGA-04 through approval, finance, milestones, licensing and operation with recovery and immutable compensation evidence.

**Independent Test**: Failure after any checkpoint resumes without duplicate financing or milestone, stale fencing is rejected, and the asset only operates after licensing.

### Tests for User Story 2

- [x] T020 [P] [US2] Add RED SAGA-04 transition, milestone, sunk-cost and licensing tests in packages/core/tests/clubs/infrastructure-project.test.ts
- [x] T021 [P] [US2] Add RED lease takeover, stale fencing, retry, compensation and manual-review tests in packages/core/tests/clubs/infrastructure-project-recovery.test.ts
- [x] T022 [P] [US2] Add RED orchestration tests with synthetic C9 financing and licensing ports in packages/core/tests/clubs/infrastructure-project-use-cases.test.ts
- [x] T023 [P] [US2] Add RED daily maintenance, deterioration and due-event tests in packages/core/tests/clubs/club-maintenance.test.ts

### Implementation for User Story 2

- [ ] T024 [P] [US2] Define the five canonical SAGA-04 steps, statuses, milestones, lease/fencing and external port contracts in packages/core/src/clubs/infrastructure-project-types.ts
- [ ] T025 [US2] Implement the forward-only InfrastructureProject aggregate with checkpointed milestones and reverse compensation in packages/core/src/clubs/infrastructure-project.ts
- [ ] T026 [US2] Implement propose, inspect, resume, abort and compensate orchestration with persistence after every checkpoint in packages/core/src/clubs/infrastructure-project-use-cases.ts
- [ ] T027 [US2] Integrate project snapshots and terminal asset/department effects into packages/core/src/clubs/world-club-portfolio.ts
- [ ] T028 [US2] Implement deterministic maintenance/deterioration processing and a scheduler task handler in packages/core/src/clubs/club-maintenance.ts
- [ ] T029 [US2] Register the C3 daily task during activation and execute it from simulator day handlers in packages/core/src/world/world-use-cases.ts and apps/simulator/src/cli.ts
- [ ] T030 [US2] Extend JSON envelope v6 validation for projects, milestones and compensation state in apps/simulator/src/json-world-repository.ts
- [ ] T031 [US2] Add project propose/inspect/resume/abort and maintenance summary commands with explicit synthetic financing/licensing harnesses in apps/simulator/src/cli.ts
- [ ] T032 [US2] Add restart and CLI smoke coverage for successful, resumed and compensated projects in apps/simulator/tests/json-world-repository.test.ts and apps/simulator/tests/cli.test.ts

**Checkpoint**: User Story 2 completes or compensates SAGA-04 without cross-context writes.

---

## Phase 5: Polish, evidence and promotion

**Purpose**: Reconcile the executable contract, prove delivery and update portfolio governance honestly.

- [ ] T033 [P] Update executable P1/P2 commands, failure injection and expected output in specs/004-club-squad-infrastructure/quickstart.md
- [ ] T034 [P] Reconcile implemented storage version, limits and recovery decisions in specs/004-club-squad-infrastructure/data-model.md and specs/004-club-squad-infrastructure/research.md
- [ ] T035 Run format, lint, typecheck, focused/full tests and build and record results in specs/004-club-squad-infrastructure/validation/implementation-evidence.md
- [ ] T036 Execute the complete quickstart, reconcile PARTIAL/DELIVERED in spec/catalog/index/evidence registry, and record the boundary decision in specs/004-club-squad-infrastructure/validation/quickstart-report.md

---

## Dependencies and execution order

- Phase 1 precedes all implementation because it freezes the public contract.
- Phase 2 blocks both user stories.
- US1 is the MVP and supplies the portfolio/repository required by US2.
- US2 starts after US1's portfolio persistence is green.
- T033 and T034 may run in parallel after both stories; T035 precedes T036.

## Parallel opportunities

- T005 can proceed independently after T004's names are fixed.
- T008–T011 are separate RED suites and can be authored independently.
- T012 and T013 affect separate aggregates.
- T020–T023 cover separate SAGA, orchestration and maintenance concerns.
- T033 and T034 edit independent documentation sets.

## Implementation strategy

1. Freeze contracts and bootstrap the existing genesis into C3.
2. Deliver US1 end-to-end, including JSON restart and CLI evidence.
3. Add US2 using explicit C9/licensing ports; synthetic CLI handlers prove C3 orchestration only.
4. Run the workspace gates and quickstart before promoting BC-003.
