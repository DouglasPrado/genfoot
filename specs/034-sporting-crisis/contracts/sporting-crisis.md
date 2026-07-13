# Contract: crise esportiva v1

**Commands**: `AcknowledgeSportingCrisis`, `SetSportingRecoveryPlan`, `RespondToBoard`, `MakePublicPromise`.  
**Queries**: `GetSportingCrisisDiagnosis`, `GetBoardAssessment`, `GetSupporterResponse`.  
**Events**: `SportingCrisisDetected`, `RecoveryPlanSet`, `BoardResponseRecorded`, `SportingCrisisResolved`.  
**Errors**: `CRISIS_NOT_ACTIVE`, `PLAN_NOT_ALLOWED`, `INFORMATION_NOT_AUTHORIZED`, `VERSION_CONFLICT`.

Diagnósticos incluem facts/ruleset/input hash. IA e cliente usam os mesmos commands; cada evento é roteado ao owner competente.
