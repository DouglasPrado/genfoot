# Data Model: Eventing, sagas, projeções e realtime

**Owner**: Concern · Eventing/Projeção. Estado persistido inclui world, versão, datas lógicas e ruleset/schema aplicável.

## Entities

### 1. EventRegistryEntry

eventType/version, owner, schemaHash e compatibility.

### 2. OutboxMessage

event envelope, status, attempts, nextAttempt e publishedAt.

### 3. InboxReceipt

consumer/event, receivedAt, result e payloadHash.

### 4. SagaInstance

sagaType/version, world, status, currentStep, lease/fencing.

### 5. SagaStep

attempt, command/event refs, checkpoint e compensation.

### 6. ProjectionCheckpoint

projection/partition, sequence, schemaVersion e stateHash.

### 7. RealtimeCursor

audience/stream, lastSequence, expiresAt e resumeToken.

## Relationships and Validation

Referências externas são IDs lógicos. Coleções/IDs são únicos, mutação exige expectedVersion/idempotencyKey e transição inválida não emite evento.

## State, History and Migration

Command do owner muda estado; terminal rejeita mutação; retry retorna resultado gravado; workflow retoma checkpoint. Fatos são append-only, snapshots versionados, projeções reconstruíveis e migrações aditivas.
