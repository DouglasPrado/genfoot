# Contracts: Retorno após ausência longa

**Feature**: GP-002  
**Version**: 1.0.0  
**Ownership**: C2 possui relógio e catch-up; C11 possui resumo/notificações; X-001 emite decisões normais; X-003 apenas apresenta

## Intents/commands consumidos

`AcknowledgeReturnSummary` (C11) e commands normais emitidos por X-001 durante a ausência.

Envelope mínimo:

```text
commandId, commandType, gameWorldId, actorId, aggregateId,
expectedVersion, idempotencyKey, rulesetVersion, requestedAt, payload
```

O gateway/cliente envia a intenção ao owner declarado. O process manager pode coordenar steps, mas não escreve aggregates.

## Queries consumidas

`GetAbsenceWindow`, `GetReturnSummary`, `ListReturnPriorities`, `GetAutomatedDecisionExplanation`.

Toda resposta inclui `gameWorldId`, `worldSequence`, `generatedAt`, estado de frescor e links para próximas ações. Estados `loading`, `empty`, `blocked`, `error`, `offline` e `stale` permanecem distinguíveis.

## Eventos observados

`WorldCatchUpCompleted`, `AutomatedDecisionApplied`, `ReturnSummaryPrepared`.

Eventos usam passado, versão de contrato, aggregate version, world sequence, correlation/causation IDs e idempotency key. Entrega duplicada é segura; gap de sequência força resync.

## Erros observáveis

`CATCH_UP_IN_PROGRESS`, `SUMMARY_SEQUENCE_GAP`, `STALE_RETURN_SUMMARY`; além de `WORLD_SCOPE_MISMATCH`, `EXPECTED_VERSION_CONFLICT` e `COMMAND_NOT_AUTHORIZED`.

Erros não escondem escrita parcial: informam owner, step, retryability e ação segura. Conflitos não são convertidos automaticamente em sucesso.

## Compatibility and retry

- Campos novos opcionais preservam compatibilidade minor; mudança semântica exige nova versão.
- Retry reutiliza `commandId` e `idempotencyKey`.
- Timeout é estado desconhecido até consulta pelo command/journey ID.
- Cliente offline pode apenas enfileirar intents incluídas na whitelist e dentro do TTL canônico.
