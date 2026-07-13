# Contract: lesão e recuperação v1

**Commands**: `DiagnoseInjury`, `SetMedicalPlan`, `AdvanceMedicalPhase`, `RequestReturnTest`, `ClearPlayerReturn`.  
**Queries**: `GetPlayerMedicalCase`, `GetPlayerAvailability`, `GetMedicalPlan`.  
**Events**: `PlayerInjured`, `InjuryDiagnosed`, `MedicalPhaseCompleted`, `PlayerRehabilitationStarted`, `PlayerCleared`.  
**Errors**: `PLAYER_MEDICALLY_INELIGIBLE`, `INVALID_MEDICAL_TRANSITION`, `PHASE_ALREADY_PROCESSED`, `RETURN_GUARD_FAILED`.

Todos os envelopes carregam mundo, jogador, sequence/ruleset e idempotency key. C8 e clientes apenas consultam disponibilidade.
