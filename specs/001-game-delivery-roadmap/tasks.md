# Tasks: Programa completo de entrega do Grinta

**Input**: Design documents from `/specs/001-game-delivery-roadmap/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/feature-catalog.md, quickstart.md

**Tests**: A specification requires independently verifiable coverage, dependency and evidence checks. Validator tests are therefore included before their implementations.

**Organization**: Tasks are grouped by user story. This feature materializes the complete planning portfolio; gameplay implementation remains delegated to the generated child features.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it writes different files and consumes only frozen master artifacts.
- **[Story]**: Maps the task to US1, US2 or US3 from spec.md.
- Every task names its output path.

## Phase 1: Setup (Shared Portfolio Infrastructure)

**Purpose**: Establish machine-readable identities, source routing and validation locations before generating child features.

- [x] T001 Materialize all 34 stable IDs, slugs, statuses, milestones and child-directory names from contracts/feature-catalog.md into specs/001-game-delivery-roadmap/contracts/feature-index.yaml
- [x] T002 [P] Define the mandatory child packet structure and required spec/plan/checklist sections in specs/001-game-delivery-roadmap/contracts/child-feature-template.md
- [x] T003 [P] Map canonical docs, headings, decision IDs and ownership aliases for every FND/BC/X/VAL/OPS/GP ID in specs/001-game-delivery-roadmap/contracts/source-map.md
- [x] T004 [P] Document validator inputs, generated reports and pass/fail semantics in specs/001-game-delivery-roadmap/validation/README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Freeze the catalog contract and build automated checks that block incomplete, cyclic or untraceable child packets.

**⚠️ CRITICAL**: No user-story phase starts until the feature index, DAG and validators are complete.

- [x] T005 Define JSON-Schema-equivalent constraints for Feature, Dependency, Milestone, Evidence, CanonicalSource and CoverageLink in specs/001-game-delivery-roadmap/contracts/feature-index.schema.json
- [x] T006 [P] Encode every directed dependency and its kind/reason from contracts/feature-catalog.md in specs/001-game-delivery-roadmap/contracts/dependency-graph.yaml
- [x] T007 [P] Encode M0–M4 membership, entry conditions and exit evidence in specs/001-game-delivery-roadmap/contracts/milestones.yaml
- [x] T008 [P] Define evidence types, PASS/FAIL rules, seed/ruleset requirements and the prohibition on treating missing evidence as PASS in specs/001-game-delivery-roadmap/contracts/evidence-schema.md
- [x] T009 [P] Add failing coverage, schema, duplicate-ID and cycle tests for the roadmap manifests in scripts/roadmap/validate-feature-roadmap.test.ts
- [x] T010 Include scripts/roadmap/**/*.test.ts in the test runner without dropping existing package/simulator tests in vitest.config.ts
- [x] T011 Implement catalog/schema/directory validation with actionable errors in scripts/roadmap/validate-feature-index.mjs
- [x] T012 [P] Implement topological sorting, self-dependency and cycle detection for dependency-graph.yaml in scripts/roadmap/validate-dependency-graph.mjs
- [x] T013 [P] Implement 12-context, 3-concern, 16-golden-path and 34-total coverage checks in scripts/roadmap/validate-coverage.mjs

**Checkpoint**: The master manifests can be validated before any child packet is accepted.

---

## Phase 3: User Story 1 — Enxergar todo o produto como entregas executáveis (Priority: P1) 🎯 MVP

**Goal**: Create one complete, independently readable Spec Kit packet for every feature in the catalog while preserving delivered/partial evidence.

**Independent Test**: Run the roadmap validators and confirm that all 34 indexed directories contain a validated spec, checklist, plan, research, data model, contracts and quickstart with no unresolved clarification.

### Feature packets for User Story 1

- [x] T014 [P] [US1] Create the retrospective FND-001 packet for the delivered deterministic kernel/CLI using docs/02-tecnico/{00-arquitetura-geral.md,05-catalogo-de-regras-e-formulas.md,06-roadmap-de-implementacao.md,07-arquitetura-do-core-ecs.md,15-ruleset-e-replay.md} at specs/002-domain-kernel-simulator/spec.md with plan.md, research.md, data-model.md, quickstart.md, contracts/ and checklists/requirements.md
- [x] T015 [P] [US1] Create the BC-002 completion packet for world, windows, seasons, scheduler and rollover using blueprint C2 and docs 01-game-design/{01-mundo-persistente-e-clubes.md,06-temporada-e-competicoes.md} at specs/003-world-seasons-scheduler/spec.md with all sibling design artifacts and checklist
- [x] T016 [P] [US1] Create the BC-003 packet for club, squad, departments, stadium, infrastructure, commercial and board governance using blueprint C3 and GDD 04/08 at specs/004-club-squad-infrastructure/spec.md with all sibling design artifacts and checklist
- [x] T017 [P] [US1] Create the BC-004 completion packet for player training, health, youth, aging, retirement and demography using blueprint C4 and docs/01-game-design/02-sistema-de-jogadores.md at specs/005-player-development-health-youth/spec.md with all sibling design artifacts and checklist
- [x] T018 [P] [US1] Create the BC-005 packet for staff identities, roles, contracts, capacity and query-only effects using blueprint C5 and GDD 04/07 at specs/006-staff/spec.md with all sibling design artifacts and checklist
- [x] T019 [P] [US1] Create the BC-007 completion packet for data-driven competitions, registration, fixtures, standings, discipline, promotion and homologation using blueprint C7 and GDD 06/12 at specs/007-competitions-calendar/spec.md with all sibling design artifacts and checklist
- [x] T020 [P] [US1] Create the BC-008 packet for one authoritative automatic/live/offline/replay match runtime using blueprint C8, GDD 05 and technical docs 07/14/15 at specs/008-match-runtime/spec.md with all sibling design artifacts and checklist
- [x] T021 [P] [US1] Create the BC-009 packet for balanced ledger, reservations, budgets, payroll, debt, faucets/sinks and reconciliation using blueprint C9, GDD 03 and technical doc 13 at specs/009-economy-ledger/spec.md with all sibling design artifacts and checklist
- [x] T022 [P] [US1] Create the X-002 completion packet for versioned events, Outbox/Inbox/DLQ, sagas, projections, replay and realtime delivery using technical docs 01/08/15/16 at specs/010-eventing-sagas-projections/spec.md with all sibling design artifacts and checklist
- [x] T023 [P] [US1] Create the BC-006 packet for scouting, listings, offers, transfers, loans, contracts and authoritative player-club linkage using blueprint C6, GDD 02/03 and SAGA-01/SAGA-05 at specs/011-market-scouting-contracts/spec.md with all sibling design artifacts and checklist
- [x] T024 [P] [US1] Create the X-001 packet for Strategic/Squad/Match/Narrative AI that emits normal commands and reproducible explanations using GDD 07 and CA-IA criteria at specs/012-automation-ai/spec.md with all sibling design artifacts and checklist
- [x] T025 [P] [US1] Create the VAL-001 packet for long-horizon reports, R-34/R-88 batches, BS/BE/BD bands and G1–G8 promotion using technical doc 17 at specs/013-simulation-calibration/spec.md with all sibling design artifacts and checklist
- [x] T026 [P] [US1] Create the BC-001 packet for account, session, world participation, club reservation/control, cooldown and exit/switch using blueprint C1, GDD 09 and multiplayer docs at specs/014-identity-club-control/spec.md with all sibling design artifacts and checklist
- [x] T027 [P] [US1] Create the BC-010 packet for supporters, satisfaction, rivalries, reputation, press, promises, conversations and crises using blueprint C10 and GDD 11 at specs/015-supporters-narrative/spec.md with all sibling design artifacts and checklist
- [x] T028 [P] [US1] Create the BC-011 packet for inbox, threads, delivery, digest, timeline, records, statistics and reconstructible reports using blueprint C11 and GDD 13 at specs/016-notifications-history/spec.md with all sibling design artifacts and checklist
- [x] T029 [P] [US1] Create the BC-012 packet for risk, anti-abuse, quarantine, sanctions, appeals, corrections, audit hash-chain, support and reprocessing using blueprint C12 and technical docs 09/19 at specs/017-anti-abuse-admin/spec.md with all sibling design artifacts and checklist
- [x] T030 [P] [US1] Create the X-003 packet for non-authoritative Expo mobile and Next.js admin clients, common contracts, offline whitelist, realtime recovery, design system and accessibility using technical doc 08 and UI/UX 00–24 at specs/018-mobile-admin-clients/spec.md with all sibling design artifacts and checklist
- [x] T031 [P] [US1] Create the OPS-001 packet for API/workers operations, security, privacy, telemetry, load, backup, isolated restore, DR, deployment and rollback using technical docs 04/18/19 at specs/019-platform-production-readiness/spec.md with all sibling design artifacts and checklist
- [x] T032 [P] [US1] Create the GP-001 vertical packet for account-to-club creation/reservation/onboarding/control/central using flow 1 and UX onboarding at specs/020-club-entry/spec.md with all sibling design artifacts and checklist
- [x] T033 [P] [US1] Create the GP-002 vertical packet for idempotent catch-up, explainable offline decisions, summary and priorities using flow 2 at specs/021-return-after-absence/spec.md with all sibling design artifacts and checklist
- [x] T034 [P] [US1] Create the GP-003 vertical packet for ending control, cooldown, eligible switch and preserved history using flow 3 at specs/022-club-exit-switch/spec.md with all sibling design artifacts and checklist
- [x] T035 [P] [US1] Create the GP-004 vertical packet for rollover output, calendar, objectives, budget, squad and registrations using flow 4 at specs/023-season-start/spec.md with all sibling design artifacts and checklist
- [x] T036 [P] [US1] Create the GP-005 vertical packet for the complete weekly decision/training/market/finance/tactics/match loop using flow 5 at specs/024-weekly-management-cycle/spec.md with all sibling design artifacts and checklist
- [x] T037 [P] [US1] Create the GP-006 vertical packet for homologation, standings, prizes, promotion, reports, contracts, retirement, youth and next season using flow 6 and SAGA-02 at specs/025-season-rollover/spec.md with all sibling design artifacts and checklist
- [x] T038 [P] [US1] Create the GP-007 vertical packet for analysis, eligible lineup/tactics, runtime, live decisions, official result and fan-out using flow 7 at specs/026-match-journey/spec.md with all sibling design artifacts and checklist
- [x] T039 [P] [US1] Create the GP-008 vertical packet for discovery, scouting, offer, negotiation, reservation/liquidation, contract and registration using flow 8 at specs/027-player-signing/spec.md with all sibling design artifacts and checklist
- [x] T040 [P] [US1] Create the GP-009 vertical packet for listing/approach, evaluation, negotiation, single settlement, exit and replacement using flow 9 at specs/028-player-sale/spec.md with all sibling design artifacts and checklist
- [x] T041 [P] [US1] Create the GP-010 vertical packet for loan duration/cost/options, registration, monitoring and deterministic return/purchase using flow 10 at specs/029-player-loan/spec.md with all sibling design artifacts and checklist
- [x] T042 [P] [US1] Create the GP-011 vertical packet for youth intake, assessment, promotion, training/minutes, contract and consolidation/exit using flow 11 at specs/030-youth-journey/spec.md with all sibling design artifacts and checklist
- [x] T043 [P] [US1] Create the GP-012 vertical packet for injury, diagnosis, medical plan, unavailability, reassessment and gradual return using flow 12 at specs/031-injury-recovery/spec.md with all sibling design artifacts and checklist
- [x] T044 [P] [US1] Create the GP-013 vertical packet for revenues, obligations, payroll, balanced close, forecast, alerts and adjustments using flow 13 at specs/032-monthly-finance/spec.md with all sibling design artifacts and checklist
- [x] T045 [P] [US1] Create the GP-014 vertical packet for feasibility/approval, financing, construction, inspection, operation and maintenance using flow 14 and SAGA-04 at specs/033-infrastructure-project/spec.md with all sibling design artifacts and checklist
- [x] T046 [P] [US1] Create the GP-015 vertical packet for results, morale, supporters, press, board diagnosis and recovery plan using flow 15 at specs/034-sporting-crisis/spec.md with all sibling design artifacts and checklist
- [x] T047 [P] [US1] Create the GP-016 vertical packet for cash alert, restrictions, measures, sanctions and restructuring without erasing facts or arbitrary expulsion using flow 16 at specs/035-financial-crisis/spec.md with all sibling design artifacts and checklist
- [x] T048 [US1] Reconcile child-packet scope/status/evidence back into the 34 canonical rows in specs/001-game-delivery-roadmap/contracts/feature-catalog.md
- [x] T049 [US1] Run the feature-index and coverage validators and record per-directory completeness, duplicate IDs and unresolved markers in specs/001-game-delivery-roadmap/validation/portfolio-completeness.md
- [x] T050 [US1] Publish a navigable ID/status/milestone index linking all 34 child specs in specs/README.md

**Checkpoint**: Every feature is independently readable and the complete product portfolio can be inspected without hidden scope.

---

## Phase 4: User Story 2 — Executar na ordem que reduz risco (Priority: P2)

**Goal**: Turn the feature catalog into an acyclic, milestone-driven execution sequence with explicit freeze points and safe parallel lanes.

**Independent Test**: Topologically sort the manifest and confirm zero cycles, every planned feature reachable from FND-001, every feature assigned to a milestone and clients/production blocked behind their authoritative prerequisites.

### Implementation for User Story 2

- [x] T051 [P] [US2] Define topological waves from delivered foundation through OPS-001, including start/finish conditions for each wave, in specs/001-game-delivery-roadmap/contracts/execution-waves.md
- [x] T052 [P] [US2] Render the complete directed graph and list every edge reason from dependency-graph.yaml in specs/001-game-delivery-roadmap/contracts/dependency-graph.md
- [x] T053 [P] [US2] Define command/query/event/schema freeze points that permit contract-only parallel work without cross-context writes in specs/001-game-delivery-roadmap/contracts/contract-freeze-points.md
- [x] T054 [P] [US2] Allocate safe parallel lanes for Club/Player/Competition, Market/Infrastructure, AI/Identity/Narrative and API/client prototypes in specs/001-game-delivery-roadmap/contracts/parallel-work-lanes.md
- [x] T055 [P] [US2] Convert M0–M4 exit criteria into executable checklists with blocking evidence and rollback conditions in specs/001-game-delivery-roadmap/contracts/milestone-exit-checklists.md
- [x] T056 [US2] Add wave, prerequisite, contract-freeze and milestone fields for all 34 entries in specs/001-game-delivery-roadmap/contracts/feature-index.yaml
- [x] T057 [US2] Document deterministic next-feature selection, BLOCKED/DEFERRED handling and no-ID-reuse rules in specs/001-game-delivery-roadmap/contracts/next-feature-policy.md
- [x] T058 [US2] Run topological validation and record ordered waves, unreachable nodes, cycles and safe-parallel groups in specs/001-game-delivery-roadmap/validation/dependency-report.md

**Checkpoint**: The portfolio has one valid execution order, documented parallelism and no dependency cycle.

---

## Phase 5: User Story 3 — Provar cobertura e conclusão (Priority: P3)

**Goal**: Make every status and promotion claim traceable to canonical sources and reproducible evidence.

**Independent Test**: Select any feature ID and follow it from index to child spec, source sections, requirements, invariants, acceptance scenarios and actual PASS/FAIL evidence; missing evidence must never resolve as PASS.

### Tests for User Story 3

- [x] T059 [P] [US3] Add failing evidence-integrity tests for missing files, invalid PASS claims, absent ruleset/seed metadata and stale source references in scripts/roadmap/validate-evidence.test.ts

### Implementation for User Story 3

- [x] T060 [P] [US3] Map every feature to source sections, FR/SC items, CA/INV/BS/BE/BD/G IDs and owning context in specs/001-game-delivery-roadmap/contracts/traceability-matrix.md
- [x] T061 [P] [US3] Register current and expected TEST/BUILD/REPORT/TRACE/MIGRATION/LOAD_TEST/SECURITY_TEST/GAMEDAY evidence slots for all 34 IDs in specs/001-game-delivery-roadmap/contracts/evidence-registry.yaml
- [x] T062 [P] [US3] Consolidate G1–G8, DB-01…DB-16, R-34/R-88 and milestone gates with exact blocking semantics in specs/001-game-delivery-roadmap/contracts/quality-gates.md
- [x] T063 [P] [US3] Audit the four delivered foundations against local code, Git history and 47 current tests in specs/001-game-delivery-roadmap/validation/current-evidence.md
- [x] T064 [P] [US3] Record the 12/12 context, 3/3 concern and 16/16 golden-path cross-coverage audit in specs/001-game-delivery-roadmap/validation/coverage-report.md
- [x] T065 [US3] Implement evidence metadata, missing-evidence-is-failure and stale-source validation in scripts/roadmap/validate-evidence.mjs
- [x] T066 [P] [US3] Define versioned change control, impact analysis, source precedence and new-ID requirements in specs/001-game-delivery-roadmap/contracts/change-control.md
- [x] T067 [P] [US3] Define the reusable completion checklist for tests, determinism, invariants, contracts, migrations, load, security, accessibility and recovery in specs/001-game-delivery-roadmap/contracts/completion-checklist.md
- [x] T068 [US3] Run all roadmap validators and record feature-by-feature traceability and evidence PASS/FAIL results in specs/001-game-delivery-roadmap/validation/final-evidence-report.md

**Checkpoint**: No feature can be called delivered or promoted without reproducible evidence and canonical traceability.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Integrate the portfolio with repository navigation and prove the master feature remains healthy.

- [x] T069 [P] Link the master roadmap, feature index and child-spec index from docs/README.md
- [x] T070 [P] Add validator commands and expected outputs for portfolio, DAG, coverage and evidence checks to specs/001-game-delivery-roadmap/quickstart.md
- [x] T071 [P] Document the constitution-placeholder governance risk and the future ratification handoff without inventing principles in specs/001-game-delivery-roadmap/validation/governance-risk.md
- [x] T072 Run Markdown formatting and internal-link validation across specs/001-game-delivery-roadmap/ and specs/002-domain-kernel-simulator/ through specs/035-financial-crisis/, recording results in specs/001-game-delivery-roadmap/validation/document-integrity.md
- [x] T073 Run pnpm format:check, pnpm lint, pnpm typecheck, pnpm test and pnpm build and record command results in specs/001-game-delivery-roadmap/validation/workspace-gates.md
- [x] T074 Verify every checklist task in specs/001-game-delivery-roadmap/tasks.md follows the checkbox/ID/[P]/[US] and file-path format and record the audit in specs/001-game-delivery-roadmap/validation/task-format.md
- [x] T075 Perform the full specs/001-game-delivery-roadmap/quickstart.md validation and record the final go/no-go decision for child-feature implementation in specs/001-game-delivery-roadmap/validation/quickstart-report.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: starts immediately.
- **Phase 2 — Foundational**: depends on T001–T004 and blocks every user story.
- **Phase 3 — US1**: depends on T005–T013; produces all child packets and the MVP portfolio.
- **Phase 4 — US2**: depends on US1 because ordering must reference validated child IDs and contracts.
- **Phase 5 — US3**: depends on US1; its source/evidence work may run in parallel with US2 after T050.
- **Phase 6 — Polish**: depends on the desired stories being complete; full go/no-go requires US1–US3.

### User Story Dependencies

- **US1 (P1)**: no story dependency after Foundational; creates the complete portfolio.
- **US2 (P2)**: depends on US1 packet identity/scope but is independently testable through topological validation.
- **US3 (P3)**: depends on US1 packet identity/source mapping; independent from US2 except the final combined report.

### Child Feature Execution Order

The child packets are documentation deliverables and may be authored in parallel after the frozen index. Their later gameplay implementations follow this capability order:

1. FND-001 → BC-002.
2. BC-003 and BC-004 in parallel; then BC-005 and BC-007.
3. BC-008 and BC-009; X-002 contracts evolve alongside them.
4. BC-006 → X-001 → VAL-001.
5. BC-001, BC-010 and BC-011; then BC-012.
6. X-003 → OPS-001.
7. GP-001…GP-016 converge as vertical acceptance slices when their context prerequisites are ready.

### Within Each Child Packet

1. Write and validate spec.md with no unresolved clarification.
2. Research technical unknowns and decisions.
3. Complete plan.md and constitution/baseline gates.
4. Generate data-model.md and external contracts.
5. Create quickstart.md with independent validation evidence.
6. Mark checklist complete only after all artifacts agree.

---

## Parallel Opportunities

- T002–T004 can run in parallel after T001 identifies the catalog.
- T006–T009 can run in parallel because each owns a separate manifest/test file.
- T012–T013 can run in parallel after T009 defines expectations.
- T014–T047 are the primary parallel batch: each owns a different child directory and consumes frozen master sources.
- T051–T055 can run in parallel before T056 integrates their results.
- T060–T064 and T066–T067 can run in parallel before T068.
- US2 and US3 may run concurrently after T050.

## Parallel Example: User Story 1

```text
Task T016: Create BC-003 packet in specs/004-club-squad-infrastructure/
Task T017: Create BC-004 packet in specs/005-player-development-health-youth/
Task T019: Create BC-007 packet in specs/007-competitions-calendar/
Task T021: Create BC-009 packet in specs/009-economy-ledger/
```

These tasks write separate directories and use the same frozen catalog/source map.

## Parallel Example: User Story 2

```text
Task T051: Define execution waves in contracts/execution-waves.md
Task T053: Define contract freeze points in contracts/contract-freeze-points.md
Task T054: Define parallel lanes in contracts/parallel-work-lanes.md
Task T055: Define milestone exit checklists in contracts/milestone-exit-checklists.md
```

## Parallel Example: User Story 3

```text
Task T060: Build traceability matrix
Task T061: Build evidence registry
Task T062: Consolidate quality gates
Task T063: Audit current delivered evidence
Task T064: Audit coverage
```

---

## Implementation Strategy

### MVP First — User Story 1

1. Complete Setup and Foundational tasks.
2. Generate all 34 child packets through T047.
3. Reconcile and validate them through T050.
4. Stop and verify that any team member can select and understand a feature in under five minutes.

The MVP is a complete, validated feature portfolio. It intentionally does not claim gameplay implementation.

### Incremental Delivery

1. **US1**: complete portfolio and child packets.
2. **US2**: deterministic execution waves and safe parallel lanes.
3. **US3**: evidence-backed completion and promotion controls.
4. **Polish**: repository integration and final go/no-go.
5. Implement gameplay by activating one child feature at a time in the order selected by next-feature-policy.md.

### Recommended First Runtime Child

After the master portfolio is complete, continue with `specs/003-world-seasons-scheduler/` to finish BC-002, because it extends the delivered scheduler and unlocks the remaining headless contexts without duplicating completed work.

## Notes

- `[P]` means separate output files/directories and no dependency on incomplete work.
- `[US1]`, `[US2]` and `[US3]` map directly to the master specification.
- Child packet creation is planning work; runtime code belongs to each child's own tasks.md.
- A status is evidence-backed; missing evidence is never PASS.
- Commit after each child packet or coherent validator group.
- Do not overwrite user changes or treat the current Prisma scaffold as production migrations.
