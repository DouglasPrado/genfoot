# Contracts: Staff

**Version**: 1.0.0 · **Owner**: C5 · Staff · compatibilidade aditiva dentro da major.

## Commands

- `CreateStaffMember`
- `OfferStaffContract`
- `AcceptStaffContract`
- `AssignStaff`
- `EndStaffContract`

Envelope obrigatório: `commandId`, `idempotencyKey`, `worldId`, `expectedVersion`, actor, data lógica e payload versionado.

## Queries

Por ID/world e coleções cursor-based; resposta inclui `schemaVersion`, `aggregateVersion` e `asOf`; query nunca concede escrita.

## Events

- `StaffMemberCreated`
- `StaffContractActivated`
- `StaffAssigned`
- `StaffContractEnded`

Envelope inclui ID/tipo/versão, world/aggregate/version, occurredAt, ruleset, correlation e payload.

## Errors and Retry

função inválida; contrato sobreposto; capacidade excedida; versão concorrente; referência externa inelegível. Código é estável e classificado como retryable; timeout exige consulta pela chave antes de repetição. Nova semântica cria major; evento publicado não é reescrito.
