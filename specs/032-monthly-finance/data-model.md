# Data Model: Ciclo financeiro mensal

- **LedgerAccount/Transaction/Entry** (C9): conta, transação, débitos/créditos e origem.
- **FinancialObligation** (C9): competência, valor, vencimento, origem e status.
- **FinancialReservation** (C9): valor reservado/liberado/liquidado.
- **MonthlyClose** (C9): competência, checkpoints, reconciliação e ruleset.
- **ClubFinanceSnapshot** (C9): resultado oficial do período.
- **FinanceProjection/Notification** (C11): read model e alerta.

Estados: `OPEN → PROCESSING → VERIFYING → CLOSED`; falha → `FAILED/RETRY`; correção → nova transação referenciada. Chaves: mundo, competência, origem e `commandId`.
