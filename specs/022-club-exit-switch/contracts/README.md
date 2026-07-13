# Contracts: Abandono ou troca de clube

**Feature**: GP-003  
**Version**: 1.0.0  
**Ownership**: C1 encerra/ativa controle e cooldown; C11 preserva histórico; C12 audita risco; X-001 garante continuidade; X-003 apresenta

## Intents/commands consumidos

`RequestClubControlExit` (C1), `EndClubControl` (C1), `ActivateClubControl` (C1).

Envelope mínimo:

```text
commandId, commandType, gameWorldId, actorId, aggregateId,
expectedVersion, idempotencyKey, rulesetVersion, requestedAt, payload
```

O gateway/cliente envia a intenção ao owner declarado. O process manager pode coordenar steps, mas não escreve aggregates.

## Queries consumidas

`GetExitImpact`, `GetControlCooldown`, `ListEligibleClubs`.

Toda resposta inclui `gameWorldId`, `worldSequence`, `generatedAt`, estado de frescor e links para próximas ações. Estados `loading`, `empty`, `blocked`, `error`, `offline` e `stale` permanecem distinguíveis.

## Eventos observados

`ClubControlEnded`, `ClubAIControlActivated`, `ClubControlCooldownStarted`.

Eventos usam passado, versão de contrato, aggregate version, world sequence, correlation/causation IDs e idempotency key. Entrega duplicada é segura; gap de sequência força resync.

## Erros observáveis

`EXIT_WINDOW_CLOSED`, `CONTROL_COOLDOWN_ACTIVE`, `TRANSFER_RESTRICTION_ACTIVE`, `RISK_REVIEW_REQUIRED`; além de `WORLD_SCOPE_MISMATCH`, `EXPECTED_VERSION_CONFLICT` e `COMMAND_NOT_AUTHORIZED`.

Erros não escondem escrita parcial: informam owner, step, retryability e ação segura. Conflitos não são convertidos automaticamente em sucesso.

## Compatibility and retry

- Campos novos opcionais preservam compatibilidade minor; mudança semântica exige nova versão.
- Retry reutiliza `commandId` e `idempotencyKey`.
- Timeout é estado desconhecido até consulta pelo command/journey ID.
- Cliente offline pode apenas enfileirar intents incluídas na whitelist e dentro do TTL canônico.
