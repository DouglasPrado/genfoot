# Tasks: Saída ou troca de clube (GP-003)

**Golden path**: teste de convergência cross-context. **Contexts**: C1 (controle/cooldown), C3 (clube), C11 (pendências).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: controle ativo bloqueia reserva de terceiros → saída libera a vaga → handover assume uma única vez; histórico do anterior preservado, em packages/core/tests/golden-paths/gp-003-club-exit-switch.test.ts

## Pendente (jornada E2E completa)

- [ ] T002 [US1] Transferência de pendências/objetivos ao novo controlador (C3/C11) e cooldown/limite de trocas
- [ ] T003 [US2] Compensação de saída interrompida com auditoria
- [ ] T004 Integração via X-002 (SAGA de handover)

## Notes

- Um único controle ativo por clube em todo momento; saída não apaga fatos.
