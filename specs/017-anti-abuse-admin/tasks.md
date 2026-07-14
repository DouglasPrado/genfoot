# Tasks: Anti-abuso, suporte e administração

**Input**: Design documents from `/specs/017-anti-abuse-admin/`
**Prerequisites**: Owners dos aggregates (correções sem cross-write); X-002 para reprocessamento.
**Tests**: Requeridos pela spec (P1/P2/P3) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar commands/queries/events/errors + CorrectionCommand em specs/017-anti-abuse-admin/contracts/README.md
- [x] T002 Reconciliar entidades (sinal/assessment/case/sanção/appeal/audit) em data-model.md
- [x] T003 Criar módulo C12 em packages/core/src/admin/ e testes em packages/core/tests/admin/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 IDs branded, sinal/assessment/sanção/audit e eventos em packages/core/src/admin/admin-types.ts
- [x] T005 [P] AdminRepository (optimistic concurrency) em packages/core/src/admin/admin-repository.ts
- [x] T006 Bootstrap + audit hash-chain (invariante AUDIT_CHAIN_INVALID) em packages/core/src/admin/world-admin.ts
- [x] T007 Exportar contrato público C12 em packages/core/src/index.ts

## Phase 3: User Story 1 — Investigar risco sem punição automática opaca (Priority: P1) 🎯 MVP

**Independent Test**: sinais duplicados/contraditórios, score versionado recalculado; ação grave exige evidência, RBAC e revisão.

- [x] T008 [US1] RecordRiskSignal (dedup, imutável) + RiskAssessment versionado + RiskThresholdReached no limiar
- [x] T009 [US1] ProposeSanction exige evidência para severidade alta (EVIDENCE_INSUFFICIENT)
- [x] T010 [US1] ApproveSanction quatro-olhos (SEGREGATION_CONFLICT) → SanctionActivated
- [x] T011 [US1] Audit hash-chain append-only verificável (AUDIT_CHAIN_INVALID)
- [x] T012 [US1] Testes P1 (dedup/limiar, evidência, quatro-olhos, adulteração) em packages/core/tests/admin/admin.test.ts
- [ ] T013 [US1] OpenCase/PlaceQuarantine com escopo/RBAC completo

## Phase 4: User Story 3 — Aplicar sanção com recurso (Priority: P3)

**Independent Test**: justificativa, prazo e recurso; sanções proporcionais e revisáveis.

- [x] T014 [US3] File/DecideAppeal independente (revisor != proposer/approver) → SanctionReversed
- [ ] T015 [US3] Proporcionalidade por severidade/escopo/período e expiração automática

## Phase 5: User Story 2 — Corrigir e reprocessar sem apagar fatos (Priority: P2)

- [ ] T016 [US2] Request/ApproveCorrection (fato compensatório referenciando original; C12 não escreve o aggregate)
- [ ] T017 [US2] RequestReprocessing da DLQ idempotente (poison message não duplica efeito)

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Suporte (Open/ResolveSupportCase) com PII minimizada
- [ ] T019 [P] Adapter de persistência + integração de correção via X-002 em apps/simulator
- [ ] T020 Rodar quickstart (pnpm typecheck && pnpm test) e promover evidência

## Implementation Strategy

- **Incremento atual**: US1 (risco→limiar, evidência, quatro-olhos, audit hash-chain) e US3 (recurso independente que reverte).
- **Pendente**: correção/reprocessamento cross-context (T016-T017), quarentena/caso RBAC completos (T013), suporte (T018), adapter (T019).

## Notes

- C12 não escreve aggregates alheios; correções são compensatórias via owner.
- Audit é append-only com hash-chain verificável; toda escrita versionada e idempotente.
