# Tasks: Ciclo semanal de gestão (GP-005)

**Golden path**: teste de convergência cross-context. **Contexts**: C4 (desenvolvimento diário), C5 (staff), C7 (calendário), C11 (notificações).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: avançar a semana dia a dia sem duplicar o tick (C4) + digest semanal sem urgentes/duplicatas (C11), em packages/core/tests/golden-paths/gp-005-weekly-management-cycle.test.ts

## Pendente (jornada E2E completa)

- [ ] T002 [US1] Treino/staff (C5) influenciando o accrual diário e a preparação do jogo
- [ ] T003 [US1] Encadeamento com fixtures da rodada (C7) e resultado oficial (C8)
- [ ] T004 Orquestração via X-002 (jobs recorrentes) e adapters

## Notes

- Ciclo diário determinístico e idempotente; o digest prioriza sem atrasar urgentes.
