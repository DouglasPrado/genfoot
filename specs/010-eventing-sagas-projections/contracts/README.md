# Contracts: Eventing, sagas, projeções e realtime

**Version**: 1.0.0 · **Owner**: Concern · Eventing/Projeção · evolução aditiva dentro da major.

## Commands

- `PublishOutboxBatch`
- `ConsumeEvent`
- `RetryDeadLetter`
- `StartSaga`
- `ClaimSaga`
- `AdvanceSagaStep`
- `CompensateSaga`
- `RebuildProjection`
- `ResumeRealtimeStream`

Envelope: commandId, idempotencyKey, worldId, expectedVersion, actor, logicalTime e payloadVersion.

## Queries

Por ID/world ou cursor; resposta traz schemaVersion, aggregateVersion e asOf; query não concede escrita.

## Events

- `OutboxPublished`
- `MessageDeadLettered`
- `SagaStarted`
- `SagaCheckpointed`
- `SagaCompleted`
- `ProjectionAdvanced`

Envelope: eventId/type/version, worldId, aggregateId/version, occurredAt, ruleset, correlation/causation e payload.

## Errors, Retry and Compatibility

schema desconhecido; payloadHash divergente; sequence gap; lease/fencing obsoleto; retry esgotado. Erros têm código estável/retryable; timeout exige lookup por chave. Quebra semântica cria major e evento publicado não é reescrito.
