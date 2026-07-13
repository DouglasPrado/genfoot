# Contracts: Competições e calendário

**Version**: 1.0.0 · **Owner**: C7 · Competição/Calendário · compatibilidade aditiva dentro da major.

## Commands

- `CreateCompetitionEdition`
- `RegisterParticipant`
- `GenerateFixtures`
- `RecordOfficialResult`
- `ApplyDiscipline`
- `HomologateCompetition`

Envelope obrigatório: `commandId`, `idempotencyKey`, `worldId`, `expectedVersion`, actor, data lógica e payload versionado.

## Queries

Por ID/world e coleções cursor-based; resposta inclui `schemaVersion`, `aggregateVersion` e `asOf`; query nunca concede escrita.

## Events

- `CompetitionCreated`
- `FixturesPublished`
- `RegistrationAccepted`
- `StandingChanged`
- `CompetitionHomologated`

Envelope inclui ID/tipo/versão, world/aggregate/version, occurredAt, ruleset, correlation e payload.

## Errors and Retry

formato inválido; colisão de calendário; inelegibilidade; resultado duplicado; homologação prematura. Código é estável e classificado como retryable; timeout exige consulta pela chave antes de repetição. Nova semântica cria major; evento publicado não é reescrito.
