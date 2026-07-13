# Data Model: Crise financeira

GP-016 não possui aggregate autoritativo próprio.

- **Ledger/FinanceSnapshot/Debt** (C9): fatos, caixa, obrigações e dívida.
- **ClubRecoveryPlan/Governance** (C3): medidas, compromissos e progresso.
- **Supporter/Narrative** (C10): percepção derivada.
- **CrisisProjection/Notification** (C11): alerta, diagnóstico e timeline.
- **Sanction/Appeal/AuditLog** (C12): sanção, recurso e cadeia de integridade.
- **AIDecision** (X1): razões e commands autorizados.

Estados projetados: `HEALTHY → AT_RISK → CRISIS → RESTRUCTURING → RECOVERED`; `SANCTIONED` é estado de C12 associado, não mutação do ledger.
