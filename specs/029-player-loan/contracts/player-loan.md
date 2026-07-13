# Contract: empréstimo v1

**Commands**: `ProposeLoan`, `AcceptLoan`, `ActivateLoan`, `RecallLoan`, `ExerciseLoanOption`, `CompleteLoan`.  
**Queries**: `GetLoanCase`, `GetLoanEligibility`, `GetLoanFinancialSchedule`.  
**Events**: `LoanActivated`, `LoanPaymentDue`, `LoanRecallRequested`, `LoanReturned`, `LoanConvertedToTransfer`, `LoanCompensated`.  
**Errors**: `LOAN_NOT_ELIGIBLE`, `RECALL_NOT_ALLOWED`, `OPTION_EXPIRED`, `MEDICAL_CLEARANCE_REQUIRED`, `WINDOW_CLOSED`, `VERSION_CONFLICT`.

Commands carregam mundo, ator, `commandId` e versão. Eventos possuem sequência, ruleset e dedupe key.
