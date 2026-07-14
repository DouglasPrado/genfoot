# Tasks: Contratação de jogador (GP-008)

**Golden path**: teste de convergência cross-context. **Contexts**: C6 (mercado/contrato), C9 (ledger), C4 (jogador), C7 (inscrição).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: scouting → negociação versionada → aceite (C6) → reserva+liquidação de fundos (C9) → ativação de contrato/vínculo único (C6); conservação monetária preservada, em packages/core/tests/golden-paths/gp-008-player-signing.test.ts

## Pendente (jornada E2E completa)

- [x] T002 [US1] SAGA-01 real (StartTransfer/AdvanceTransferStep/CompensateTransfer) com fencing via X-002
- [x] T003 [US1] Compensação após falha pós-reserva (liberar reserva, estados consistentes)
- [x] T004 [US1] Disponibilidade do jogador (C4) e inscrição na competição (C7) após a assinatura

## Notes

- Um único vínculo ativo, uma liquidação balanceada; cada owner aplica só a sua mudança.
- A saga cross-context real (idempotente/compensável) fica em X-002.
