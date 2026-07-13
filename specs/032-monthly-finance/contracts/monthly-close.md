# Contract: fechamento mensal v1

**Commands**: `RegisterFinancialObligation`, `SettleObligation`, `RunMonthlyClose`, `CorrectLedgerTransaction`.  
**Queries**: `GetClubLedger`, `GetMonthlyClose`, `GetCashForecast`.  
**Events**: `ObligationSettled`, `MonthlyFinanceClosed`, `CashRiskDetected`, `LedgerCorrectionPosted`.  
**Errors**: `LEDGER_UNBALANCED`, `PERIOD_ALREADY_CLOSED`, `INSUFFICIENT_FUNDS`, `DUPLICATE_OBLIGATION`, `CLOSE_IN_PROGRESS`.

BC-009 é o único owner de lançamento; BC-003/BC-006 emitem fatos/commands; BC-011 projeta e alerta.
