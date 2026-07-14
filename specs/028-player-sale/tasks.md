# Tasks: Venda de jogador (GP-009)

**Golden path**: teste de convergência cross-context. **Contexts**: C6 (vínculo/contrato), C9 (ledger), C4 (jogador).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: encerrar vínculo do vendedor + ativar do comprador (um único ativo) com a taxa transitando entre caixas (transfer) e conservação preservada, em packages/core/tests/golden-paths/gp-009-player-sale.test.ts

## Pendente (jornada E2E completa)

- [x] T002 [US1] SAGA de venda cross-context (C6 vínculo + C9 liquidação + C7 desinscrição) via X-002
- [x] T003 [US1] Cláusulas (sell-on, luvas) e impostos/taxas no ledger
- [x] T004 Compensação após falha pós-transferência

## Notes

- Transfer usa contas de clube (não faucet/sink): a oferta monetária não muda, só troca de mãos.
