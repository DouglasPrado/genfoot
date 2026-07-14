# Tasks: Lesão e recuperação (GP-012)

**Golden path**: teste de convergência cross-context. **Contexts**: C4 (medicina), C5 (staff médico), C11 (notificação).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: abrir caso médico → jogador INJURED (C4) → notificar (C11) → alta → AVAILABLE; tudo idempotente por chave, em packages/core/tests/golden-paths/gp-012-injury-recovery.test.ts

## Pendente (jornada E2E completa)

- [x] T002 [US1] Influência do staff médico (C5) no prazo de retorno e no risco de recaída
- [x] T003 [US1] Indisponibilidade refletida na escalação da partida (C8) e reação da torcida (C10)
- [x] T004 Recuperação por data lógica (job agendado) via X-002

## Notes

- Máquina de estado do caso médico determinística; alta ocorre uma única vez por chave.
