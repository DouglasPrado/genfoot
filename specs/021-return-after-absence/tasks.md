# Tasks: Retorno após ausência (GP-002)

**Golden path**: teste de convergência cross-context. **Contexts**: C1 (controle/cooldown), X-003 (realtime), C11 (pendências).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: encerrar controle → cooldown → troca bloqueada no cooldown e liberada depois; histórico preservado; realtime aplica/ignora-duplicata/detecta-gap, em packages/core/tests/golden-paths/gp-002-return-after-absence.test.ts

## Pendente (jornada E2E completa)

- [x] T002 [US2] Retomada de jornada interrompida com diagnóstico e compensação auditável
- [x] T003 [US1] Reconciliação de pendências herdadas (C11) e re-sincronização de snapshot no retorno
- [x] T004 Integração realtime real (X-002 sequence/resume token)

## Notes

- Fatos consumados não são reescritos; o retorno respeita cooldown e é idempotente.
