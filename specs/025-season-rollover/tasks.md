# Tasks: Virada de temporada (GP-006)

**Golden path**: teste de convergência cross-context. **Contexts**: C2 (temporada/scheduler), C7 (competição), C11 (histórico).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: nova temporada cria edição/calendário sem apagar a anterior; ambas coexistem com fixtures próprias determinísticas, em packages/core/tests/golden-paths/gp-006-season-rollover.test.ts

## Pendente (jornada E2E completa)

- [ ] T002 [US1] Homologação da temporada anterior (C7) antes do rollover + promoção/rebaixamento definitivos
- [ ] T003 [US1] Rollover do scheduler (C2) e arquivamento de records/timeline (C11)
- [ ] T004 Orquestração via X-002 (SAGA de rollover)

## Notes

- Fatos são append-only entre temporadas; nada da temporada anterior é reescrito.
