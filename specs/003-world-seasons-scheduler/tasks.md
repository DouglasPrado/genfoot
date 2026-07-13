# Tasks: Mundo, temporadas e scheduler

**Input**: Design documents from `/specs/003-world-seasons-scheduler/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md, quickstart.md

**Tests**: Required by the specification for idempotency, concurrency, recovery, replay and world isolation. Test tasks precede their implementations.

**Organization**: Tasks are grouped by user story so the safe world-advance slice and the season-rollover slice remain independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it writes a different file and depends only on completed phases.
- **[Story]**: Maps the task to US1 or US2 from spec.md.
- Every task names an exact output path.

## Phase 1: Setup (Contract Freeze)

**Purpose**: Freeze the observable BC-002 boundary before changing snapshots or consumers.

- [x] T001 Expand the v1 BC-002 command, query, event, error, idempotency and compatibility schemas in specs/003-world-seasons-scheduler/contracts/README.md
- [x] T002 [P] Add deterministic builders for worlds, schedulers, windows and rollover handlers in packages/core/tests/helpers/scheduling-fixtures.ts

---

## Phase 2: Foundational (Shared Domain Types)

**Purpose**: Establish versioned types used by both stories without changing runtime behavior.

**⚠️ CRITICAL**: User-story implementation starts only after the snapshot contract and exports compile.

- [x] T003 Add temporal-window, command-receipt and schema-version fields to packages/core/src/scheduling/scheduling-types.ts
- [x] T004 [P] Add the 20 canonical SAGA-02 step IDs, phases, statuses, handler context/results and rollover snapshot types to packages/core/src/scheduling/season-rollover-types.ts
- [x] T005 Update the scheduling repository contract for idempotent command lookup and optimistic rollover persistence in packages/core/src/scheduling/scheduling-repository.ts
- [x] T006 Export all new BC-002 public types without leaking adapter concerns from packages/core/src/index.ts

**Checkpoint**: BC-002 types compile and its frozen contract can be consumed independently.

---

## Phase 3: User Story 1 — Avançar o mundo com segurança (Priority: P1) 🎯 MVP

**Goal**: Advance one logical day exactly once, expose ruleset-versioned windows and reject stale/concurrent/cross-world mutations.

**Independent Test**: Execute the same command key twice and recover an expired lease; both calls return the same receipt, emit one day of effects and never touch another world.

### Tests for User Story 1

> Write these tests first and confirm the new assertions fail before implementation.

- [x] T007 [P] [US1] Add configurable time-window boundary and ruleset-version tests in packages/core/tests/time-window.test.ts
- [x] T008 [P] [US1] Add duplicate command, expected-date conflict, expired-lease recovery and stale-fencing tests in packages/core/tests/world-scheduler-idempotency.test.ts
- [x] T009 [P] [US1] Add two-world isolation and deterministic receipt/replay integration tests in packages/core/tests/world-advance-command.test.ts
- [x] T010 [P] [US1] Add backward-compatible scheduler snapshot and command-receipt persistence tests in apps/simulator/tests/json-world-repository.test.ts

### Implementation for User Story 1

- [x] T011 [US1] Implement ruleset-versioned temporal windows and boundary queries in packages/core/src/scheduling/time-window.ts
- [x] T012 [US1] Add unique window registration, command receipt lookup/recording and stale fencing guards to packages/core/src/scheduling/world-scheduler.ts
- [x] T013 [US1] Implement the idempotent AdvanceWorldDay command with expected date/version, lease recovery and deterministic response in packages/core/src/scheduling/scheduling-use-cases.ts
- [x] T014 [US1] Persist the new scheduler fields with compatible v1–v4 reads and a new snapshot version in apps/simulator/src/json-world-repository.ts
- [x] T015 [US1] Expose `world:windows` and idempotent `day:advance` commands in apps/simulator/src/cli.ts
- [x] T016 [US1] Cover the public CLI commands and duplicate-response behavior in apps/simulator/tests/cli.test.ts

**Checkpoint**: US1 passes independently with one committed effect per command key and strict `worldId` isolation.

---

## Phase 4: User Story 2 — Encerrar e abrir temporadas por checkpoints (Priority: P2)

**Goal**: Run SAGA-02 as 20 forward-only checkpoints, recover safely and open the next season only after homologation and invariant verification.

**Independent Test**: Interrupt after a persisted checkpoint, resume with a newer fencing token and prove completed steps are not rerun, prize-before-homologation is impossible and season N+1 opens once.

### Tests for User Story 2

> Write these tests first and confirm the new assertions fail before implementation.

- [x] T017 [P] [US2] Add the 20-step order, phase projection and terminal-state tests in packages/core/tests/season-rollover.test.ts
- [x] T018 [P] [US2] Add checkpoint recovery, retry budget, stale fencing and duplicate-side-effect tests in packages/core/tests/season-rollover-recovery.test.ts
- [x] T019 [P] [US2] Add homologation-before-award, VERIFYING gates, next-season uniqueness and world-isolation use-case tests in packages/core/tests/season-rollover-use-cases.test.ts
- [x] T020 [P] [US2] Add persisted rollover migration and interrupted-process recovery tests in apps/simulator/tests/json-world-repository.test.ts
- [x] T021 [P] [US2] Add start/resume/inspect rollover CLI journey tests in apps/simulator/tests/cli.test.ts

### Implementation for User Story 2

- [x] T022 [US2] Implement the forward-only SeasonRollover aggregate, phase projection, retry budget, lease and fencing rules in packages/core/src/scheduling/season-rollover.ts
- [x] T023 [US2] Store one rollover per season and apply atomic checkpoint/season transitions in packages/core/src/scheduling/world-scheduler.ts
- [x] T024 [US2] Implement StartSeasonRollover, ResumeSeasonRollover and InspectSeasonRollover orchestration with typed step handlers in packages/core/src/scheduling/season-rollover-use-cases.ts
- [x] T025 [US2] Start SAGA-02 idempotently from SeasonDue and emit checkpoint/closed/started events in packages/core/src/scheduling/scheduling-use-cases.ts
- [x] T026 [US2] Persist rollover snapshots and migrate prior scheduler envelopes compatibly in apps/simulator/src/json-world-repository.ts
- [x] T027 [US2] Expose `season:rollover:start`, `season:rollover:resume` and `season:rollover:inspect` in apps/simulator/src/cli.ts
- [x] T028 [US2] Export rollover aggregate/use cases and public event contracts from packages/core/src/index.ts

**Checkpoint**: US1 and US2 pass independently; restart resumes SAGA-02 from the first unfinished checkpoint and never archives a partial season.

---

## Phase 5: Polish & Cross-Cutting Validation

**Purpose**: Prove compatibility, documentation and delivery evidence without overstating unavailable cross-context implementations.

- [x] T029 [P] Update executable US1/US2 commands, failure injection and expected output in specs/003-world-seasons-scheduler/quickstart.md
- [x] T030 [P] Reconcile the implemented model, storage version and recovery decisions in specs/003-world-seasons-scheduler/data-model.md and specs/003-world-seasons-scheduler/research.md
- [x] T031 Run format, lint, typecheck, full tests and build and record reproducible results in specs/003-world-seasons-scheduler/validation/implementation-evidence.md
- [x] T032 Execute the complete specs/003-world-seasons-scheduler/quickstart.md, reconcile PARTIAL/DELIVERED honestly in spec/catalog/index/evidence registry, and record the decision in specs/003-world-seasons-scheduler/validation/quickstart-report.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup**: starts immediately and freezes the public boundary.
- **Foundational**: depends on T001 and blocks both stories.
- **US1**: depends on the foundational types; tests T007–T010 precede T011–T016.
- **US2**: depends on US1 scheduler receipts/lease behavior; tests T017–T021 precede T022–T028.
- **Polish**: depends on both stories and cannot promote status without reproducible evidence.

### User Story Dependencies

- **US1 (P1)**: independently delivers safe world advancement and windows after the foundation.
- **US2 (P2)**: reuses US1 persistence, lease and fencing primitives but has its own aggregate, handlers and recovery tests.

### Parallel Opportunities

- T002 and T004 write independent helper/type files.
- US1 test files T007–T010 can be authored in parallel before runtime changes.
- US2 test files T017–T021 can be authored in parallel after US1 passes.
- T029 and T030 are independent documentation updates after implementation.

## Parallel Example: User Story 1

```text
T007 packages/core/tests/time-window.test.ts
T008 packages/core/tests/world-scheduler-idempotency.test.ts
T009 packages/core/tests/world-advance-command.test.ts
T010 apps/simulator/tests/json-world-repository.test.ts
```

## Parallel Example: User Story 2

```text
T017 packages/core/tests/season-rollover.test.ts
T018 packages/core/tests/season-rollover-recovery.test.ts
T019 packages/core/tests/season-rollover-use-cases.test.ts
T020 apps/simulator/tests/json-world-repository.test.ts
T021 apps/simulator/tests/cli.test.ts
```

## Implementation Strategy

### MVP First

1. Freeze contracts and compile foundational types.
2. Write failing US1 tests.
3. Implement windows, receipts and `AdvanceWorldDay`.
4. Validate US1 independently before starting rollover.

### Incremental Delivery

1. US1 provides safe clock/window behavior without SAGA-02.
2. US2 adds the forward-recovery workflow without taking ownership of C3/C4/C6/C7/C8/C9/C10/C11 writes; those remain typed handlers.
3. Promotion occurs only after workspace gates, restart smoke and evidence reconciliation.

## Notes

- `[P]` means different files and no dependency on an incomplete task.
- Tests must demonstrate RED before the corresponding implementation and GREEN afterward.
- Completed tasks are marked `[X]`; Prettier may normalize them to `[x]`.
- Published events and snapshots remain backward-readable; historical facts are never rewritten.
