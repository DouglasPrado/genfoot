# Contracts: Economia e ledger

**Version**: 1.0.0 · **Owner**: C9 · Economia/Ledger · evolução aditiva dentro da major.

## Commands

- `OpenLedgerAccount`
- `PostTransaction`
- `ReserveFunds`
- `SettleReservation`
- `ReleaseReservation`
- `AccrueDebt`
- `CloseAccountingPeriod`
- `ReconcileWorldLedger`

Envelope: commandId, idempotencyKey, worldId, expectedVersion, actor, logicalTime e payloadVersion.

## Queries

Por ID/world ou cursor; resposta traz schemaVersion, aggregateVersion e asOf; query não concede escrita.

## Events

- `TransactionPosted`
- `FundsReserved`
- `ReservationSettled`
- `DebtAccrued`
- `AccountingPeriodClosed`
- `LedgerReconciled`

Envelope: eventId/type/version, worldId, aggregateId/version, occurredAt, ruleset, correlation/causation e payload.

## Errors, Retry and Compatibility

valor/moeda inválidos; transação desbalanceada; fundos indisponíveis; reserva expirada; idempotency conflict. Erros têm código estável/retryable; timeout exige lookup por chave. Quebra semântica cria major e evento publicado não é reescrito.
