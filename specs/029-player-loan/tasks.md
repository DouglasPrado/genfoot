# Tasks: Empréstimo de jogador (GP-010)

**Golden path**: teste de convergência cross-context. **Contexts**: C6 (vínculo/empréstimo), C9 (custos), C4 (jogador).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: empréstimo (vínculo LOAN no destino) → retorno exatamente uma vez (idempotente) → reativação da origem; um único vínculo ativo em todo momento, em packages/core/tests/golden-paths/gp-010-player-loan.test.ts

## Pendente (jornada E2E completa)

- [ ] T002 [US1] LoanAgreement dedicado (período, custos, opção de compra) com propriedade suspensa da origem (não reencerrar/reativar contrato)
- [ ] T003 [US1] ExerciseLoanOption (compra) e custos de empréstimo no ledger (C9)
- [ ] T004 Retorno automático por data lógica (job agendado) via X-002

## Notes

- Retorno OU compra ocorrem exatamente uma vez; um único vínculo ativo por jogador.
- Simplificação atual: origem é reencerrada/reativada; o modelo de propriedade suspensa fica pendente.
