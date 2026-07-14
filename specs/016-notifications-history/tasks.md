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
- [ ] T014 [US2] RebuildProjection com ProjectionGapDetected/Rebuilt e proveniência de números
- [ ] T015 [US2] ReportDefinition versionada + REPORT_SOURCE_STALE/REPORT_NOT_READY

## Phase 5: User Story 3 — Preservar memória do mundo (Priority: P3)

**Independent Test**: timeline, recordes e rankings sem reescrita retroativa.

- [x] T016 [US3] appendTimelineEntry append-only (dedup por factRef) e establishRecord idempotente + RecordEstablished
- [ ] T017 [US3] Rankings históricos derivados + supersedes sem reescrever fatos

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Entrega/DeliveryAttempt + RetryDelivery (DELIVERY_RETRY_EXHAUSTED)
- [ ] T019 [P] Adapter de persistência + consumo do event log via X-002 em apps/simulator
- [ ] T020 Rodar quickstart (pnpm typecheck && pnpm test) e promover evidência

## Implementation Strategy

- **Incremento atual**: US1 (inbox dedup + read/dismiss + digest), US2 núcleo (relatório reconstruível), US3 (timeline/records append-only).
- **Pendente**: rebuild/gap/proveniência (T014-T015), rankings (T017), entrega/retry (T018), adapter (T019).

## Notes

- Uma notification por dedupKey; digest nunca atrasa urgentes; relatórios reconstruíveis (mesmo hash); timeline/records append-only.
