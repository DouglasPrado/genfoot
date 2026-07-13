# Data Model: Venda de jogador

- **TransferListing** (BC-006): jogador, clube vendedor, estado, janela, versão.
- **TransferCase/OfferVersion** (BC-006): partes, termos, expiração, `expectedVersion`.
- **TransferAgreement** (BC-006): acordo único e estado de assinatura/liquidação.
- **PlayerContract** (BC-006): vínculo principal encerrado/novo; histórico preservado.
- **FinancialReservation/LedgerTransaction** (BC-009): reserva e liquidação idempotentes.
- **SquadMembership** (BC-003): projeção atualizada por evento.

Transição: `LISTED → NEGOTIATING → AGREED → SETTLING → COMPLETED`; rejeição/expiração/cancelamento → `CANCELLED`; falha recuperável → `COMPENSATING`.

Chaves: `(gameWorldId,id)`, `commandId`, versão do caso e chave de saga. Um jogador possui no máximo um contrato principal ativo.
