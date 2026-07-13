# Contracts: Encerramento e virada de temporada

**Feature**: GP-006  
**Version**: 1.0.0  
**Ownership**: C2 orquestra SAGA-02; C4/C6/C7/C9/C11 escrevem seus estados; C8 fornece resultados; X-002 entrega/checkpointa

## Intents/commands consumidos

`RequestSeasonRollover` e `ResumeSeasonRollover` (C2); commands de checkpoint dirigidos a C4/C6/C7/C9/C11.

Envelope mínimo:

```text
commandId, commandType, gameWorldId, actorId, aggregateId,
expectedVersion, idempotencyKey, rulesetVersion, requestedAt, payload
```

O gateway/cliente envia a intenção ao owner declarado. O process manager pode coordenar steps, mas não escreve aggregates.

## Queries consumidas

`GetSeasonRolloverStatus`, `GetRolloverCheckpoint`, `GetSeasonClosureReport`.

Toda resposta inclui `gameWorldId`, `worldSequence`, `generatedAt`, estado de frescor e links para próximas ações. Estados `loading`, `empty`, `blocked`, `error`, `offline` e `stale` permanecem distinguíveis.

## Eventos observados

`SeasonDue`, `CompetitionEditionHomologated`, `SeasonRolloverCompleted`, `SeasonStarted`.

Eventos usam passado, versão de contrato, aggregate version, world sequence, correlation/causation IDs e idempotency key. Entrega duplicada é segura; gap de sequência força resync.

## Erros observáveis

`UNRESOLVED_COMPETITION`, `ROLLOVER_STEP_FAILED`, `ROLLOVER_FENCED`, `SEASON_ALREADY_ROLLED_OVER`; além de `WORLD_SCOPE_MISMATCH`, `EXPECTED_VERSION_CONFLICT` e `COMMAND_NOT_AUTHORIZED`.

Erros não escondem escrita parcial: informam owner, step, retryability e ação segura. Conflitos não são convertidos automaticamente em sucesso.

## Compatibility and retry

- Campos novos opcionais preservam compatibilidade minor; mudança semântica exige nova versão.
- Retry reutiliza `commandId` e `idempotencyKey`.
- Timeout é estado desconhecido até consulta pelo command/journey ID.
- Cliente offline pode apenas enfileirar intents incluídas na whitelist e dentro do TTL canônico.
