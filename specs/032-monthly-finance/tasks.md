# Tasks: Fecho financeiro mensal (GP-013)

**Golden path**: teste de convergência cross-context. **Contexts**: C9 (ledger), C11 (relatório), C3 (orçamento).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: receita + folha em dobro (conservação) → reconciliação residual zero (C9) → relatório financeiro reconstruível (C11), em packages/core/tests/golden-paths/gp-013-monthly-finance.test.ts

## Pendente (jornada E2E completa)

- [ ] T002 [US1] CloseAccountingPeriod (C9) fechando o período e congelando projeções
- [ ] T003 [US1] Orçamento/saúde financeira (C3) e alertas de estouro (C11)
- [ ] T004 Job mensal recorrente via X-002

## Notes

- Dinheiro inteiro e conservado; relatórios reconstruíveis com hash canônico.
