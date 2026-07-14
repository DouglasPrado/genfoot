# Tasks: Jornada da partida (GP-007)

**Golden path**: teste de convergência cross-context. **Contexts**: C7 (fixture), C8 (runtime), C9 (prêmios), C10 (narrativa).

## Phase 1: Convergence test

- [x] T001 [US1] Teste de convergência: fixture agendada (C7) → manifesto/partida (C8) → resultado oficial finalizado uma vez + replay determinístico, em packages/core/tests/golden-paths/gp-007-match-journey.test.ts

## Pendente (jornada E2E completa)

- [x] T002 [US1] RecordOfficialResult (C7) atualizando standings a partir do MatchResultOfficial (C8) via X-002
- [x] T003 [US1] Efeitos: satisfação da torcida (C10), prêmios/bilheteria (C9), disponibilidade de jogadores (C4)
- [x] T004 [US2] Live match commands/ticks/checkpoints (C8 US2)

## Notes

- Kernel único e determinístico; resultado oficial finaliza uma vez e propaga por eventos.
