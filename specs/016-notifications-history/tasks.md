# Tasks: Notificações, relatórios e memória

**Input**: Design documents from `/specs/016-notifications-history/`
**Prerequisites**: Event log / envelope versionado (X-002); fatos oficiais dos contexts.
**Tests**: Requeridos pela spec (P1/P2/P3) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar consumed-envelope/commands/events/errors em specs/016-notifications-history/contracts/README.md
- [x] T002 Reconciliar entidades (notification, thread, digest, report, timeline, record) em data-model.md
- [x] T003 Criar módulo C11 em packages/core/src/notifications/ e testes em packages/core/tests/notifications/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 IDs branded, notification/timeline/record/report e eventos em packages/core/src/notifications/notifications-types.ts
- [x] T005 [P] InboxRepository (optimistic concurrency) em packages/core/src/notifications/notifications-repository.ts
- [x] T006 Bootstrap de mundo vazio + dedupKey única (invariante) em packages/core/src/notifications/world-inbox.ts
- [x] T007 Exportar contrato público C11 em packages/core/src/index.ts

## Phase 3: User Story 1 — Receber decisões priorizadas (Priority: P1) 🎯 MVP

**Independent Test**: eventos duplicados/fora de ordem → uma única notification por chave, prioridade/prazo corretos e thread estável; digest não atrasa urgentes nem duplica.

- [x] T008 [US1] projectNotification com dedup por dedupKey (evento duplicado = efeito único) + NotificationCreated
- [x] T009 [US1] markNotificationRead/dismissNotification (transições) + NotificationRead
- [x] T010 [US1] buildDigest agrupando por destinatário, excluindo URGENT e sem duplicar + DigestReady
- [x] T011 [US1] Casos de uso com optimistic concurrency em packages/core/src/notifications/notifications-use-cases.ts
- [x] T012 [US1] Testes P1 (dedup, read/dismiss, digest sem urgente/sem dup) em packages/core/tests/notifications/notifications.test.ts

**Checkpoint**: US1 funcional e testável isoladamente.

## Phase 4: User Story 2 — Consultar relatórios reconstruíveis (Priority: P2)

**Independent Test**: apagar projeções, reconstruir do event log e comparar hashes/pontos de corte.

- [x] T013 [US2] generateReport com hash canônico reproduzível (definition/version/asOf/sourceVersions)
- [x] T014 [US2] RebuildProjection com cursor contíguo, ProjectionGapDetected (PROJECTION_GAP) e ProjectionRebuilt + checkpoint reconstruível
- [x] T015 [US2] Relatório versionado (definitionId/version/asOf/sourceVersions) com hash canônico reproduzível

## Phase 5: User Story 3 — Preservar memória do mundo (Priority: P3)

**Independent Test**: timeline, recordes e rankings sem reescrita retroativa.

- [x] T016 [US3] appendTimelineEntry append-only (dedup por factRef) e establishRecord idempotente + RecordEstablished
- [x] T017 [US3] Timeline/records append-only (dedup por factRef/idempotencyKey) preservam a memória sem reescrever fatos

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T018 [P] DeliveryAttempt + RetryDelivery (RETRYING→FAILED com DeliveryFailed e DELIVERY_RETRY_EXHAUSTED, idempotente)
- [x] T019 [P] Adapter de persistência da inbox em apps/simulator (schemaVersion 15, round-trip + recovery); consumo do event log usa o barramento de X-002
- [x] T020 Rodar gate (pnpm lint && pnpm typecheck && pnpm test && pnpm build) e promover evidência

## Implementation Strategy

- **DELIVERED**: US1 (inbox dedup + read/dismiss + digest sem urgente), US2 (relatório reconstruível com hash canônico + RebuildProjection com detecção de gap) e US3 (timeline/records append-only). Entrega com retry/DeliveryAttempt. Adapter schemaVersion 15.
- **Nota**: C11 consome o event log versionado de X-002; projeções reconstruíveis por cursor contíguo (gap bloqueia o checkpoint).

## Notes

- Uma notification por dedupKey; digest nunca atrasa urgentes; relatórios reconstruíveis (mesmo hash); timeline/records append-only.
