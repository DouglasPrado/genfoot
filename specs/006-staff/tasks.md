# Tasks: Staff

**Input**: Design documents from `/specs/006-staff/`
**Prerequisites**: FND-001 e BC-003 `DELIVERED`; contratos v1.0.0 congelados em contracts/README.md.
**Tests**: Requeridos pela spec (testes independentes P1/P2) e pelo workflow TDD do repositório.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos distintos)
- **[Story]**: US1 (P1 contratar/alocar), US2 (P2 consultar capacidade)

## Phase 1: Setup and contract freeze

- [x] T001 Congelar command/query/event/error schemas v1 em specs/006-staff/contracts/README.md
- [x] T002 Reconciliar entidades e invariantes (F21, vínculo único) em specs/006-staff/data-model.md
- [x] T003 Criar estrutura do módulo C5 em packages/core/src/staff/ e testes em packages/core/tests/staff/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Definir IDs branded, StaffMember/StaffContract/StaffAssignment, capacidades e eventos em packages/core/src/staff/staff-types.ts
- [x] T005 [P] Definir StaffRepository (optimistic concurrency) em packages/core/src/staff/staff-repository.ts
- [x] T006 Bootstrap determinístico de mundo vazio em WorldStaff.initialize/fromSnapshot em packages/core/src/staff/world-staff.ts
- [x] T007 Exportar contrato público C5 sem adapter em packages/core/src/index.ts

**Checkpoint**: Tipos C5 compilam; um mundo descreve deterministicamente um staff vazio.

## Phase 3: User Story 1 — Contratar e alocar staff por função (Priority: P1) 🎯 MVP

**Goal**: Criar membro, ofertar/aceitar contrato com vínculo ativo único por função/clube, alocar em departamento e encerrar contrato.

**Independent Test**: contratação válida cria vínculo único e impede sobreposição incompatível; command repetido com a mesma chave produz um único efeito; dois mundos isolados.

- [x] T008 [US1] CreateStaffMember + StaffMemberCreated (idempotente por evento) em WorldStaff.createStaffMember
- [x] T009 [US1] OfferStaffContract (OFFERED, role == member.role) em WorldStaff.offerStaffContract
- [x] T010 [US1] AcceptStaffContract com regra de vínculo ativo único (sem sobreposição) + StaffContractActivated em WorldStaff.acceptStaffContract
- [x] T011 [US1] AssignStaff (requer contrato ATIVO) + StaffAssigned + disponibilidade ASSIGNED em WorldStaff.assignStaff
- [x] T012 [US1] EndStaffContract (terminal), fecha alocações e libera membro + StaffContractEnded em WorldStaff.endStaffContract
- [x] T013 [US1] Casos de uso com optimistic concurrency em packages/core/src/staff/staff-use-cases.ts
- [x] T014 [US1] Testes P1 (ciclo completo, vínculo único, não-ativo, terminal, idempotência) em packages/core/tests/staff/staff.test.ts

**Checkpoint**: US1 funcional e testável isoladamente.

## Phase 4: User Story 2 — Consultar capacidade sem escrita cruzada (Priority: P2)

**Independent Test**: consumers recebem CapabilitySnapshot versionado as-of e não alteram StaffMember.

- [x] T015 [US2] Query de capacidade as-of do contrato ativo (score/confidence, sem escrita) em WorldStaff.capability
- [ ] T016 [US2] Alocação respeitando capacidade do departamento consultada de C3 (integração X-002) em packages/core/src/staff/
- [ ] T017 [US2] Contratos de query cursor-based para C4/C6/C8 em packages/core/src/staff/

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Adapter Prisma/JSON + outbox para staff (persistência) em apps/simulator
- [ ] T019 Recovery/replay após falha pós-commit em testes de integração
- [ ] T020 Rodar quickstart.md (pnpm typecheck && pnpm test) e promover PLANNED→PARTIAL/DELIVERED com evidência

## Implementation Strategy

- **MVP entregue**: US1 completo (criar/ofertar/aceitar/alocar/encerrar) + US2 capacidade as-of.
- **Pendente**: integração de capacidade do departamento (T016-T017), adapter/recovery (T018-T019).

## Notes

- Domínio puro: `packages/core` não importa adapters.
- Toda escrita carrega `worldId`, `expectedVersion`/revisão, chave idempotente e ruleset; fatos append-only.
