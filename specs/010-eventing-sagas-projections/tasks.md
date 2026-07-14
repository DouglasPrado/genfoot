# Tasks: Eventing, sagas, projeções e realtime

**Input**: Design documents from `/specs/010-eventing-sagas-projections/`
**Prerequisites**: FND-001 e BC-002 (contratos congelados).
**Tests**: Requeridos pela spec (P1/P2) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar command/query/event/error schemas v1 em specs/010-eventing-sagas-projections/contracts/README.md
- [x] T002 Reconciliar entidades (outbox/inbox/DLQ, saga, projeção) em data-model.md
- [x] T003 Criar módulo do concern em packages/core/src/eventing/ e testes em packages/core/tests/eventing/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 IDs branded, outbox/inbox, status e eventos em packages/core/src/eventing/eventing-types.ts
- [x] T005 [P] EventingRepository (optimistic concurrency) em packages/core/src/eventing/eventing-repository.ts
- [x] T006 Bootstrap de mundo vazio (initialize/fromSnapshot) em packages/core/src/eventing/world-eventing.ts
- [x] T007 Exportar contrato público do concern em packages/core/src/index.ts

## Phase 3: User Story 1 — Publicar e consumir fatos duráveis uma vez (Priority: P1) 🎯 MVP

**Independent Test**: commit+outbox sobrevivem falha e deliveries duplicados geram um único efeito por consumer.

- [x] T008 [US1] PublishOutboxBatch com sequência por stream e idempotência por batch + OutboxPublished
- [x] T009 [US1] ConsumeEvent com dedup por (consumer, messageId) — entrega duplicada = efeito único
- [x] T010 [US1] DLQ: falha esgota tentativas (maxAttempts) → MessageDeadLettered; RetryDeadLetter reprocessa
- [x] T011 [US1] Casos de uso com optimistic concurrency em packages/core/src/eventing/eventing-use-cases.ts
- [x] T012 [US1] Testes P1 (sequência, dedup, DLQ, retry, idempotência) em packages/core/tests/eventing/eventing.test.ts

**Checkpoint**: US1 funcional e testável isoladamente.

## Phase 4: User Story 2 — Retomar saga/projeção/realtime por sequência (Priority: P2)

**Independent Test**: SAGA-01…05 retomam por checkpoint/fencing; projeção e cliente recuperam gap por cursor.

- [x] T013 [US2] Ordenação estrita por stream + detecção de gap por cursor (SEQUENCE_GAP) e replay (via rebuildProjection contíguo)
- [x] T014 [US2] Saga durável: StartSaga/ClaimSaga(lease+fencing)/AdvanceSagaStep(checkpoint)/CompensateSaga (parametrizável para SAGA-01…05)
- [x] T015 [US2] Projeções reconstruíveis: RebuildProjection + ProjectionAdvanced por cursor
- [x] T016 [US2] Realtime recuperável: ResumeRealtimeStream por sequence/resume token

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T017 [P] Adapter de persistência para eventing em apps/simulator (schemaVersion 10, round-trip + recovery)
- [x] T018 Registry de eventos versionado (EventRegistryEntry: owner/schemaHash/compatibility) + registerEventType
- [x] T019 Rodar gate (pnpm lint && pnpm typecheck && pnpm test && pnpm build) e promover evidência

## Implementation Strategy

- **DELIVERED**: US1 (outbox sequenciada + inbox dedup + DLQ/retry) + US2 (saga durável com lease/fencing e checkpoint, compensação, projeções reconstruíveis por cursor com detecção de gap, realtime por resume token) + registry versionado + adapter de persistência (schemaVersion 10).
- **Fora de escopo (owner dos aggregates de negócio)**: os passos concretos das sagas SAGA-01…05 são dirigidos pelos owners (C6 transferência, C1 onboarding); X-002 entrega a máquina durável parametrizável.

## Notes

- O concern transporta fatos e coordena workflows sem possuir aggregates competitivos.
- Toda escrita carrega `worldId`, `expectedVersion`/revisão, chave idempotente e ruleset; fatos publicados não mudam.
