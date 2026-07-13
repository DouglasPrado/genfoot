# Contract: crise financeira v1

**Commands**: `AcknowledgeFinancialCrisis`, `SetFinancialRecoveryPlan`, `ExecuteRecoveryMeasure`, `ApplyFinancialSanction`, `AppealSanction`.  
**Queries**: `GetFinancialCrisisDiagnosis`, `GetRecoveryPlan`, `GetSanctionCase`.  
**Events**: `FinancialCrisisDetected`, `RecoveryPlanSet`, `RecoveryMeasureExecuted`, `FinancialSanctionApplied`, `FinancialCrisisResolved`.  
**Errors**: `LEDGER_NOT_RECONCILED`, `MEASURE_NOT_ALLOWED`, `AUTHORIZATION_REQUIRED`, `SEGREGATION_OF_DUTIES`, `APPEAL_WINDOW_CLOSED`.

C9 é owner financeiro; C12 é owner de sanção/auditoria. IA/cliente só emitem commands autorizados.
