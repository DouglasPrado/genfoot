# Tasks: Jogador, desenvolvimento, saúde e base

**Input**: Design documents from `/specs/005-player-development-health-youth/`
**Prerequisites**: FND-001 e BC-002 `DELIVERED`; contratos v1.0.0 congelados em contracts/README.md.
**Tests**: Requeridos pela spec (testes independentes P1/P2) e pelo workflow TDD do repositório.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos distintos, sem dependência pendente)
- **[Story]**: US1 (P1 desenvolvimento diário), US2 (P2 saúde e carreira)
- Itens `[x]` já têm evidência reproduzível no `packages/core`.

## Phase 1: Setup and contract freeze

**Purpose**: Congelar a fronteira observável C4 antes de mutar snapshots persistidos.

- [x] T001 Congelar command/query/event/error schemas v1 em specs/005-player-development-health-youth/contracts/README.md
- [x] T002 Reconciliar entidades, invariantes e migração aditiva em specs/005-player-development-health-youth/data-model.md e research.md
- [x] T003 Estrutura do módulo C4 e testes focados em packages/core/src/players/ e packages/core/tests/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Snapshots compartilhados, ports de repositório e bootstrap determinístico a partir da gênese.

- [x] T004 Definir IDs branded, snapshots Person/Player, estado dinâmico e histórico em packages/core/src/players/player-lifecycle-types.ts
- [x] T005 [P] Definir PlayerLifecycleRepository (optimistic concurrency + idempotência) em packages/core/src/players/player-lifecycle-repository.ts
- [x] T006 Bootstrap determinístico da gênese em WorldPlayerLifecycle.fromGenesis em packages/core/src/players/world-player-lifecycle.ts
- [x] T007 Exportar contrato público C4 sem dependência de adapter em packages/core/src/index.ts

**Checkpoint**: Tipos C4 compilam e a gênese descreve deterministicamente o portfólio de jogadores.

---

## Phase 3: User Story 1 — Processar desenvolvimento diário reproduzível (Priority: P1) 🎯 MVP

**Goal**: Executar o desenvolvimento diário com resultado autoritativo, reproduzível e auditável, sem ultrapassar potencial.

**Independent Test**: mesma seed/ruleset e carga produzem o mesmo histórico diário; dois mundos permanecem isolados.

- [x] T008 [US1] Tick diário determinístico (moral/fadiga/sharpness) idempotente em packages/core/src/players/player.ts (processUntil)
- [x] T009 [US1] Checkpoint diário idempotente por (world,date) em WorldPlayerLifecycle.processDay
- [x] T010 [US1] Evolução de atributo com clamp de delta e potencial em Player.applyAttributeChange
- [x] T011 [US1] Caso de uso ProcessPlayerDay com optimistic concurrency em packages/core/src/players/player-lifecycle-use-cases.ts
- [x] T012 [US1] Agendamento diário recorrente determinístico em buildPlayerDailyTasks
- [x] T013 [US1] Testes P1 (geração única, ordem, idempotência, potencial) em packages/core/tests/player-lifecycle.test.ts
- [x] T014 [US1] Direção de treino (SetTrainingDirection) ponderando o accrual diário em packages/core/src/players/player.ts
- [x] T015 [US1] Fadiga/moral por carga de treino no tick diário em packages/core/src/players/player.ts

**Checkpoint**: US1 funcional e testável isoladamente (accrual central entregue; treino direcional pendente).

---

## Phase 4: User Story 2 — Conduzir saúde e carreira sem duplicação (Priority: P2)

**Goal**: Integrar lesão, recuperação, promoção e aposentadoria respeitando máquinas de estado, versão e retry, sem assumir ownership externo.

**Independent Test**: lesão, recuperação, promoção e aposentadoria respeitam máquinas de estado e retry; repetir um command com a mesma chave produz um único efeito; estado terminal rejeita mudança.

### Tests for User Story 2

- [x] T016 [P] [US2] Testes de caso médico (abrir → reavaliar → alta), idempotência e estado terminal em packages/core/tests/player-medical-career.test.ts
- [x] T017 [P] [US2] Testes de aposentadoria (transição, terminal, ruleset mismatch, isolamento) em packages/core/tests/player-medical-career.test.ts

### Implementation for User Story 2

- [x] T018 [US2] Tipos MedicalCase, severidade, status e eventos PlayerInjured/PlayerCleared/PlayerRetired em packages/core/src/players/player-lifecycle-types.ts
- [x] T019 [US2] Máquina de estado do caso médico (OpenMedicalCase/ReassessMedicalCase) no aggregate em packages/core/src/players/world-player-lifecycle.ts
- [x] T020 [US2] Aposentadoria (RetirePlayer) com transição de careerStatus/disponibilidade no aggregate em packages/core/src/players/world-player-lifecycle.ts
- [x] T021 [US2] Casos de uso OpenMedicalCase/ReassessMedicalCase/RetirePlayer com optimistic concurrency e idempotência em packages/core/src/players/player-medical-career-use-cases.ts
- [x] T022 [US2] Exportar novos casos de uso e tipos em packages/core/src/index.ts
- [x] T023 [US2] Youth cohort (GenerateYouthCohort/PromoteYouth) e destino em packages/core/src/players/ (módulo youth)
- [x] T024 [US2] Controlador demográfico por gap após aposentadorias (sem geradores concorrentes) em packages/core/src/players/

**Checkpoint**: US1 e US2 funcionam independentemente; caso médico + aposentadoria entregues, youth/demografia pendentes.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T025 [P] Adapters Prisma/outbox para casos médicos e carreira em apps/simulator ou packages/core adapters
- [x] T026 Recovery/replay após falha pós-commit (checkpoint) em testes de integração
- [x] T027 Rodar quickstart.md (pnpm typecheck && pnpm test) e atualizar evidência PARTIAL→DELIVERED quando reproduzível

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **US1 (Phase 3)** e **US2 (Phase 4)**.
- US2 depende apenas da Foundational; integra com US1 mas é testável isolada.
- Polish depende das stories desejadas.

### Within Each User Story

- Testes falham antes da implementação (TDD).
- Tipos → aggregate → casos de uso → export.
- Estado terminal e idempotência antes de otimizações.

## Implementation Strategy

- **DELIVERED**: US1 (accrual diário reproduzível + limite de potencial + `SetTrainingDirection`/`ApplyDailyDevelopment` com `PlayerDeveloped`) e US2 (caso médico + aposentadoria + `GeneratePlayer` + youth `GenerateYouthCohort`/`PromoteYouth` com `YouthPromoted`). 8/8 commands, 6/6 events. Adapter JSON persiste os campos novos (trainingFocus/youthProspect) e eventos (PlayerDeveloped/YouthPromoted) — round-trip + recovery.
- **Nota**: geração explícita usa prospecto determinístico; demografia por gap fica como evolução aditiva do mesmo contrato.

## Notes

- Domínio puro: `packages/core` não importa adapters.
- Toda escrita carrega `worldId`, `expectedVersion`/revisão, chave idempotente e ruleset.
- Fatos são append-only; evento publicado não é reescrito.
