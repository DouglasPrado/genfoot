# Tasks: Criação e entrada em clube (GP-001)

**Golden path**: teste de convergência cross-context (não toma ownership dos contexts).
**Contexts**: C1 (identidade/controle), C12 (risco), C3 (clube).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: elegibilidade (C12) → reserva única (C1) → controle ativo uma vez → idempotência; disputa da última vaga resolvida por vencedor único, em packages/core/tests/golden-paths/gp-001-club-entry.test.ts

## Pendente (jornada E2E completa)

- [x] T002 [US1] Orquestração SAGA-03 real (C1 reserva/onboarding + C12 risco + C3 herança de objetivos/pendências) via X-002
- [x] T003 [US2] Retomada/compensação com histórico auditável entre etapas
- [x] T004 [US1] Programa de Clube Novo (criação de clube) além de assumir clube existente
- [x] T005 Screen contract no cliente (X-003) cobrindo os estados da jornada

## Notes

- Cada owner aplica só a sua mudança; a jornada apresenta resultado único e idempotente.
- Convergência provada em nível de aggregate; a saga cross-context real fica em X-002.
