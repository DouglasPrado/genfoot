# Tasks: Projeto de infraestrutura (GP-014)

**Golden path**: teste de convergência cross-context. **Contexts**: C3 (obra/SAGA-04, owner), C9 (financiamento), C11 (memória).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: financiamento por fases (reserva+liquidação por parcela) com conservação (C9) + registro de conclusão idempotente (C11), em packages/core/tests/golden-paths/gp-014-infrastructure-project.test.ts

## Já existente (owner C3)

- [x] SAGA-04 InfrastructureProject (lease/steps/milestones/compensation) em packages/core/src/clubs/infrastructure-project*.ts (testes infrastructure-project*.test.ts)

## Pendente (jornada E2E completa)

- [ ] T002 [US1] Orquestrar SAGA-04 (C3) com as liquidações por milestone (C9) via X-002
- [ ] T003 [US1] Impacto da obra (capacidade do estádio → receita) no ledger e na torcida
- [ ] T004 Compensação financeira ao abortar a obra

## Notes

- A obra é owner de C3 (SAGA-04 já entregue); esta convergência prova o lado financeiro por fases.
