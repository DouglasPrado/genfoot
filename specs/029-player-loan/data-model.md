# Data Model: Empréstimo de jogador

- **PlayerLoanAgreement** (C6): partes, início/fim, salário, taxas, recall, opção/obrigação, estado e ruleset.
- **PlayerContract** (C6): vínculo principal/temporário e histórico.
- **CompetitionRegistration** (C7): inscrição temporal por edição.
- **PaymentSchedule/LedgerTransaction** (C9): obrigações e liquidações.
- **PlayerAvailability** (C4): leitura de saúde/elegibilidade.

Estados: `NEGOTIATING → AGREED → ACTIVE → RETURNING|PURCHASING → COMPLETED`; falha → `COMPENSATING`; cancelamento pré-ativação → `CANCELLED`.

Chaves por mundo, versão otimista, `commandId` e `sagaId`; constraint de um desfecho terminal.
