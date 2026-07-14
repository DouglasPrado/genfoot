# Tasks: Crise financeira (GP-016)

**Golden path**: teste de convergência cross-context. **Contexts**: C9 (ledger), C10 (narrativa/crise), C12 (fair-play financeiro).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: reserva além do disponível recusada (C9 aperto) → abrir crise financeira → plano de austeridade → resolver; conservação preservada e reserva reduzida passa depois, em packages/core/tests/golden-paths/gp-016-financial-crisis.test.ts

## Pendente (jornada E2E completa)

- [x] T002 [US1] Detecção automática de insolvência (orçamento/dívida) e sanção/fair-play (C12)
- [x] T003 [US1] Plano de recuperação com efeitos reais no ledger (corte de folha, venda de ativos)
- [x] T004 Consumo dos fatos financeiros (LedgerPeriodClosed) via X-002

## Notes

- Dinheiro conservado: uma reserva recusada não altera a oferta; a crise é recuperável e determinística.
