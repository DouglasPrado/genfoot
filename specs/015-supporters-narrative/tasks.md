# Tasks: Torcida, imprensa e narrativa

**Input**: Design documents from `/specs/015-supporters-narrative/`
**Prerequisites**: Fatos oficiais de C7/C8/C9 (consumidos); X-002 para transporte.
**Tests**: Requeridos pela spec (P1/P2/P3) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar consumed-facts/commands/events/errors em specs/015-supporters-narrative/contracts/README.md
- [x] T002 Reconciliar entidades (fanbase, promessa, crise, reputação) em data-model.md
- [x] T003 Criar módulo C10 em packages/core/src/narrative/ e testes em packages/core/tests/narrative/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 IDs branded, fanbase/promessa/crise/reputação e eventos em packages/core/src/narrative/narrative-types.ts
- [x] T005 [P] NarrativeRepository (optimistic concurrency) em packages/core/src/narrative/narrative-repository.ts
- [x] T006 Bootstrap de mundo vazio (initialize/fromSnapshot) + clamp 0–100 em packages/core/src/narrative/world-narrative.ts
- [x] T007 Exportar contrato público C10 em packages/core/src/index.ts

## Phase 3: User Story 1 — Observar reação coerente da torcida (Priority: P1) 🎯 MVP

**Independent Test**: sequência fixa de fatos → mesmo snapshot/explicação por segmento; evento duplicado não muda de novo.

- [x] T008 [US1] applyMatchFact determinístico por segmento (0–100, fatores explícitos) + SupporterSatisfactionChanged
- [x] T009 [US1] Idempotência por factId (evento duplicado não altera satisfação/reputação)
- [x] T010 [US1] Casos de uso com optimistic concurrency em packages/core/src/narrative/narrative-use-cases.ts
- [x] T011 [US1] Testes P1 (determinismo, idempotência) em packages/core/tests/narrative/narrative.test.ts

**Checkpoint**: US1 funcional e testável isoladamente.

## Phase 4: User Story 2 — Responder à imprensa e cumprir promessas (Priority: P2)

**Independent Test**: criar promessa, avançar prazo e verificar cumprimento/quebra uma vez, com reputação explicável.

- [x] T012 [US2] MakePublicPromise (conflito por métrica ativa → PROMISE_CONFLICT) + PromiseMade
- [x] T013 [US2] EvaluatePromise uma única vez (FULFILLED/BROKEN) + ReputationChanged
- [ ] T014 [US2] ChooseConversationOption com opções aprovadas (OPTION_NOT_AVAILABLE) + MediaStoryPublished
- [ ] T015 [US2] CancelPromise e prazo (PROMISE_EXPIRED) por avaliador diário

## Phase 5: User Story 3 — Diagnosticar uma crise (Priority: P3)

**Independent Test**: crise esportiva/financeira com facts versionados; transições, explicação e resolução determinísticas.

- [x] T016 [US3] AcknowledgeCrisis (OPEN) / SubmitRecoveryPlan (RECOVERY) / resolveCrisis (RESOLVED) + NarrativeCrisisOpened/Resolved
- [ ] T017 [US3] Arco WATCH→OPEN automático por severidade agregada (protestos/apoio/imprensa)

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Rivalidades simétricas + reputação multidimensional
- [ ] T019 [P] Adapter de persistência + consumo de fatos oficiais via X-002 em apps/simulator
- [ ] T020 Rodar quickstart (pnpm typecheck && pnpm test) e promover evidência

## Implementation Strategy

- **Incremento atual**: US1 (satisfação determinística/idempotente), US2 núcleo (promessas avaliadas uma vez + reputação), US3 (ciclo de crise open→recovery→resolved).
- **Pendente**: conversas/mídia (T014), rivalidades/reputação multidimensional (T018), adapter/consumo de fatos (T019).

## Notes

- C10 não tem autoridade competitiva; consome apenas fatos oficiais versionados.
- Satisfação e reputação em 0–100; idempotência por factId; toda escrita versionada.
