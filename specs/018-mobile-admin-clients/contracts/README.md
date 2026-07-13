# Contracts: X-003 Clientes

## HTTP command

Request: contractVersion, commandType, payload, worldId, expectedVersion, idempotencyKey, correlationId. Response: commandId e `ACCEPTED|REJECTED|ALREADY_APPLIED`; efeito é acompanhado por query/event.

## Query

Envelope inclui data, asOf, projectionVersion, pagination e authorization scope. Cache nunca remove scope/version.

## Realtime event

eventId, worldId, streamId, sequence, eventType/version, occurredAt, correlationId e payload. Duplicata é ignorada; gap aciona delta/snapshot.

## Standard error

code, messageKey, correlationId, retryable, fieldErrors, blockingReason e recoveryAction. Cliente não decide retry de ação irreversível.

## Offline whitelist

Contrato enumerado/versionado; ausência de um command na lista significa proibido. Transferência, finanças, escalação final, resultado e admin são proibidos.

## Screen contract

Cada screen registra route, owners, queries/commands/events, states, risk confirmation, accessibility e goldenPathRefs.
