# Contract: projeto de infraestrutura v1

**Commands**: `ProposeInfrastructureProject`, `ApproveInfrastructureProject`, `FundInfrastructureProject`, `AdvanceProjectStage`, `InspectProject`, `CancelProject`.  
**Queries**: `GetProject`, `GetInfrastructureCapacity`, `GetProjectFinancials`.  
**Events**: `ProjectApproved`, `ProjectFunded`, `ProjectStageCompleted`, `ProjectInspectionPassed`, `InfrastructureActivated`, `ProjectCompensated`.  
**Errors**: `PROJECT_NOT_VIABLE`, `APPROVAL_REQUIRED`, `INSUFFICIENT_FUNDS`, `INVALID_PROJECT_TRANSITION`, `INSPECTION_FAILED`, `SEGREGATION_OF_DUTIES`.

Commands de alto risco exigem confirmação e validação server-side; eventos possuem mundo, sequência e ruleset.
