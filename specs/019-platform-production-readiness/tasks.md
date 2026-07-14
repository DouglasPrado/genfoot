# Tasks: Plataforma e prontidão de produção

**Input**: Design documents from `/specs/019-platform-production-readiness/`
**Prerequisites**: Todos os contexts; VAL-001 para gate G1–G8.
**Tests**: Requeridos pela spec (P1/P2/P3) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar telemetry/health/operations/evidence/errors em specs/019-platform-production-readiness/contracts/README.md
- [x] T002 Reconciliar entidades (SLO, incident, deployment, backup/restore, promotion) em data-model.md
- [x] T003 Criar kernel de plataforma em packages/core/src/platform/ e testes em packages/core/tests/platform/

## Phase 2: Foundational — kernel de operação (pura lógica testável)

- [x] T004 Tipos de health/SLO/deployment/restore em packages/core/src/platform/platform-types.ts
- [x] T005 evaluateSlo (AT_MOST/AT_LEAST) e aggregateHealth (HEALTHY/DEGRADED/READ_ONLY/UNAVAILABLE)
- [x] T006 Exportar contrato público do kernel de plataforma em packages/core/src/index.ts

## Phase 3: User Story 1 — Detectar e conter incidente (Priority: P1) 🎯 MVP

**Independent Test**: injetar falha, correlacionar ponta a ponta e provar alerta/runbook/read-only sem escrita corrompida.

- [x] T007 [US1] aggregateHealth: dependência crítica DOWN → UNAVAILABLE; risco de integridade → READ_ONLY
- [x] T008 [US1] isCommandAllowed: READ_ONLY bloqueia commands críticos, mantém queries seguras; UNAVAILABLE bloqueia tudo
- [x] T009 [US1] Testes P1 (SLO, health, read-only gating) em packages/core/tests/platform/platform.test.ts
- [ ] T010 [US1] Telemetria (logs/traces/metrics) com correlation/trace por mundo e AlertRule testada + runbook
- [ ] T011 [US1] Kill switch operacional por escopo (worldId/serviço)

## Phase 4: User Story 2 — Restaurar dentro de RPO/RTO (Priority: P2)

**Independent Test**: gameday restaura em ambiente isolado, roda checks/replay e mede RPO/RTO reais.

- [x] T012 [US2] evaluateRestore (integridade → BACKUP_INVALID; objetivos → RPO_RTO_MISSED)
- [ ] T013 [US2] BackupSet imutável (hash/encryption/retention) + RestoreExercise isolado com replay + audit chain
- [ ] T014 [US2] DRExercise regional medindo dataGap/RPO/RTO com gate

## Phase 5: User Story 3 — Promover e reverter uma release (Priority: P3)

- [x] T015 [US3] advanceDeployment progressivo (PLANNED→CANARY→ROLLING_OUT→COMPLETE|ROLLED_BACK|FAILED) com rollback seguro
- [ ] T016 [US3] ReleasePromotion G1–G8 conjuntiva (reusa evaluatePromotionGate de VAL-001) + MIGRATION_INCOMPATIBLE/ROLLBACK_UNSAFE

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T017 [P] CapacityReport (load/soak) e perfis de topologia
- [ ] T018 [P] Runbooks operacionais + IaC/deploy real em apps/ops
- [ ] T019 Rodar quickstart (pnpm typecheck && pnpm test) e promover evidência

## Implementation Strategy

- **Incremento atual**: kernel de operação — SLO, agregação de health, read-only gating, restore RPO/RTO e máquina de deployment (US1/US2/US3 em lógica pura).
- **Pendente**: telemetria/alertas reais (T010-T011), backup/restore/DR completos (T013-T014), promoção G1–G8 + IaC (T016-T018).

## Notes

- Kernel puro e determinístico; integração real (telemetria/IaC) fica nos adapters/ops.
- Read-only preserva queries seguras e bloqueia writes críticos; restore só libera com integridade e dentro de RPO/RTO.
