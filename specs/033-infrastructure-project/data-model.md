# Data Model: Projeto de infraestrutura

- **InfrastructureProject** (C3): escopo, custo, prazo, benefício, estado, versão e ruleset.
- **ProjectStage/Checkpoint** (C3): sequência, data lógica, progresso e idempotency key.
- **Facility/Stadium** (C3): capacidade atual e ativação resultante.
- **FinancialReservation/Credit/LedgerTransaction** (C9): financiamento e custos.
- **Approval/AuditLog** (C12): proponente, aprovador, decisão e hash-chain.

Estados: `PROPOSED → EVALUATING → APPROVED → FUNDED → BUILDING → INSPECTING → OPERATIONAL`; falha/cancelamento → `PAUSED|COMPENSATING|CANCELLED`.
