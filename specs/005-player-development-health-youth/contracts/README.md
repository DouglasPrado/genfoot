# Contracts: Jogador, desenvolvimento, saúde e base

**Version**: 1.0.0 · **Owner**: C4 · Jogador/Desenvolvimento · compatibilidade aditiva dentro da major.

## Commands

- `GeneratePlayer`
- `ApplyDailyDevelopment`
- `SetTrainingDirection`
- `OpenMedicalCase`
- `ReassessMedicalCase`
- `GenerateYouthCohort`
- `PromoteYouth`
- `RetirePlayer`

Envelope obrigatório: `commandId`, `idempotencyKey`, `worldId`, `expectedVersion`, actor, data lógica e payload versionado.

## Queries

Por ID/world e coleções cursor-based; resposta inclui `schemaVersion`, `aggregateVersion` e `asOf`; query nunca concede escrita.

## Events

- `PlayerGenerated`
- `PlayerDeveloped`
- `PlayerInjured`
- `PlayerCleared`
- `YouthPromoted`
- `PlayerRetired`

Envelope inclui ID/tipo/versão, world/aggregate/version, occurredAt, ruleset, correlation e payload.

## Errors and Retry

potencial/idade inválidos; carga duplicada; transição médica/carreira ilegal; referência de outro mundo. Código é estável e classificado como retryable; timeout exige consulta pela chave antes de repetição. Nova semântica cria major; evento publicado não é reescrito.
