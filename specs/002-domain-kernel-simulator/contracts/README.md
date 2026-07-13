# Contracts: Domain Kernel e simulador determinístico

**Version**: 1.0.0 · **Owner**: Fundação compartilhada · **Compatibility**: aditiva dentro da major.

## Commands

- `world:create --seed --start-date` cria uma vez e devolve o identificador.
- `world:genesis`, `world:activate` e `day:simulate` aplicam transições guardadas.
- `world:inspect`, `player:inspect` e summaries são consultas sem escrita.

Todo command inclui `commandId`, `idempotencyKey`, `worldId`, `expectedVersion`, `occurredAt` lógico e identidade do actor quando aplicável. Repetição devolve o resultado original.

## Queries

- Consulta por ID e `worldId`, com paginação cursor-based para coleções.
- Respostas carregam `schemaVersion`, `aggregateVersion` e `asOf`.
- Consumers não recebem permissão de escrita por meio de query.

## Events

- `WorldCreated`, `WorldGenesisCompleted`, `WorldActivated`, `SeasonStarted`, `SeasonDue`, `PlayerGenerated`.

Envelope: `eventId`, `eventType`, `eventVersion`, `worldId`, `aggregateId`, `aggregateVersion`, `occurredAt`, `rulesetVersion`, `correlationId` e payload.

## Errors

- IDs/datas/seed inválidos; mundo ausente ou em estado incompatível; snapshot desconhecido; escrita atômica não concluída.

Erros usam código estável, detalhes não sensíveis e classificação retryable. Timeout não confirma falha: o caller consulta por `idempotencyKey` antes de repetir.

## Consumers and Evolution

Consumers dependem apenas deste contrato. Campo novo é opcional; quebra semântica cria nova major; eventos publicados não são reescritos.
