# Contracts: Preparação e partida

**Feature**: GP-007  
**Version**: 1.0.0  
**Ownership**: C8 possui runtime/resultado; C4 possui saúde/desenvolvimento; C5 staff; C7 elegibilidade/homologação; concerns só decidem, transportam e apresentam

## Intents/commands consumidos

`SetMatchLineup`, `SetMatchTacticalPlan`, `SubmitMatchCommand`, `StartMatch`, `FinalizeMatch` (C8).

Envelope mínimo:

```text
commandId, commandType, gameWorldId, actorId, aggregateId,
expectedVersion, idempotencyKey, rulesetVersion, requestedAt, payload
```

O gateway/cliente envia a intenção ao owner declarado. O process manager pode coordenar steps, mas não escreve aggregates.

## Queries consumidas

`GetMatchPreparation`, `GetLiveMatchState`, `GetMatchDecisionPoint`, `GetPostMatchReport`.

Toda resposta inclui `gameWorldId`, `worldSequence`, `generatedAt`, estado de frescor e links para próximas ações. Estados `loading`, `empty`, `blocked`, `error`, `offline` e `stale` permanecem distinguíveis.

## Eventos observados

`MatchStarted`, `MatchDecisionPointOpened`, `MatchFinished`, `MatchResultHomologated`.

Eventos usam passado, versão de contrato, aggregate version, world sequence, correlation/causation IDs e idempotency key. Entrega duplicada é segura; gap de sequência força resync.

## Erros observáveis

`LINEUP_INELIGIBLE`, `MATCH_SEQUENCE_CONFLICT`, `DECISION_WINDOW_CLOSED`, `MATCH_ALREADY_FINALIZED`; além de `WORLD_SCOPE_MISMATCH`, `EXPECTED_VERSION_CONFLICT` e `COMMAND_NOT_AUTHORIZED`.

Erros não escondem escrita parcial: informam owner, step, retryability e ação segura. Conflitos não são convertidos automaticamente em sucesso.

## Compatibility and retry

- Campos novos opcionais preservam compatibilidade minor; mudança semântica exige nova versão.
- Retry reutiliza `commandId` e `idempotencyKey`.
- Timeout é estado desconhecido até consulta pelo command/journey ID.
- Cliente offline pode apenas enfileirar intents incluídas na whitelist e dentro do TTL canônico.
