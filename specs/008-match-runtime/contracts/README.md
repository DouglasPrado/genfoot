# Contracts: Partida e runtime

**Version**: 1.0.0 · **Owner**: C8 · Partida/Runtime · evolução aditiva dentro da major.

## Commands

- `CreateMatchManifest`
- `StartMatch`
- `SubmitMatchCommand`
- `AdvanceMatchTicks`
- `CheckpointMatch`
- `ResumeMatch`
- `FinalizeMatch`
- `ReplayMatch`

Envelope: commandId, idempotencyKey, worldId, expectedVersion, actor, logicalTime e payloadVersion.

## Queries

Por ID/world ou cursor; resposta traz schemaVersion, aggregateVersion e asOf; query não concede escrita.

## Events

- `MatchStarted`
- `MatchCommandAccepted`
- `MatchCheckpointed`
- `MatchFinished`
- `MatchResultOfficial`

Envelope: eventId/type/version, worldId, aggregateId/version, occurredAt, ruleset, correlation/causation e payload.

## Errors, Retry and Compatibility

manifesto/hash inválido; command atrasado/duplicado; cooldown; sequence gap; checkpoint incompatível. Erros têm código estável/retryable; timeout exige lookup por chave. Quebra semântica cria major e evento publicado não é reescrito.
