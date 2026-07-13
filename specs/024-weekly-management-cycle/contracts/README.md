# Contracts: Ciclo semanal de gestão

**Feature**: GP-005  
**Version**: 1.0.0  
**Ownership**: C2 coordena tempo; C3…C11 escrevem somente seus aggregates; X-001 usa commands normais; X-003 apresenta read models

## Intents/commands consumidos

intents roteadas aos owners: `UpdateTrainingPlan`, `RespondTransferOffer`, `SetMatchLineup`, `SetMatchTacticalPlan`, `ConfigureAutomationRule`.

Envelope mínimo:

```text
commandId, commandType, gameWorldId, actorId, aggregateId,
expectedVersion, idempotencyKey, rulesetVersion, requestedAt, payload
```

O gateway/cliente envia a intenção ao owner declarado. O process manager pode coordenar steps, mas não escreve aggregates.

## Queries consumidas

`GetManagementCentral`, `ListUrgentDecisions`, `GetSquadCondition`, `GetNextMatchPreparation`, `GetPostMatchSummary`.

Toda resposta inclui `gameWorldId`, `worldSequence`, `generatedAt`, estado de frescor e links para próximas ações. Estados `loading`, `empty`, `blocked`, `error`, `offline` e `stale` permanecem distinguíveis.

## Eventos observados

eventos oficiais de C3…C11 projetados em `ManagementCentralUpdated`.

Eventos usam passado, versão de contrato, aggregate version, world sequence, correlation/causation IDs e idempotency key. Entrega duplicada é segura; gap de sequência força resync.

## Erros observáveis

`ACTION_DEADLINE_PASSED`, `PLAYER_UNAVAILABLE`, `COMMAND_NOT_AUTHORIZED`, `STALE_CENTRAL_SEQUENCE`; além de `WORLD_SCOPE_MISMATCH`, `EXPECTED_VERSION_CONFLICT` e `COMMAND_NOT_AUTHORIZED`.

Erros não escondem escrita parcial: informam owner, step, retryability e ação segura. Conflitos não são convertidos automaticamente em sucesso.

## Compatibility and retry

- Campos novos opcionais preservam compatibilidade minor; mudança semântica exige nova versão.
- Retry reutiliza `commandId` e `idempotencyKey`.
- Timeout é estado desconhecido até consulta pelo command/journey ID.
- Cliente offline pode apenas enfileirar intents incluídas na whitelist e dentro do TTL canônico.
