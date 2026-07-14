# Tasks: Início de temporada (GP-004)

**Golden path**: teste de convergência cross-context. **Contexts**: C2 (calendário/temporada), C7 (competição), C3 (participantes).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: criar edição → inscrever participantes → gerar fixtures turno-returno no calendário; arranque idempotente, em packages/core/tests/golden-paths/gp-004-season-start.test.ts

## Pendente (jornada E2E completa)

- [ ] T002 [US1] Integração com o scheduler (C2) avançando o relógio até o kickoff da temporada
- [ ] T003 [US1] Objetivos de clube (C3) e inscrição/elegibilidade (C7) no arranque
- [ ] T004 Orquestração via X-002 (jobs recorrentes de rodada)

## Notes

- Fixtures determinísticas dentro do calendário; arranque idempotente por chave.
