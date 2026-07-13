# Contracts: Criação e entrada em clube

**Feature**: GP-001  
**Version**: 1.0.0  
**Ownership**: C1 controla conta, reserva e vínculo; C3 conserva o clube; C12 avalia risco; X-003 apenas apresenta

## Intents/commands consumidos

`ReserveClubSlot` (C1), `ActivateClubControl` (C1), `ExpireClubEntryReservation` (C1).

Envelope mínimo:

```text
commandId, commandType, gameWorldId, actorId, aggregateId,
expectedVersion, idempotencyKey, rulesetVersion, requestedAt, payload
```

O gateway/cliente envia a intenção ao owner declarado. O process manager pode coordenar steps, mas não escreve aggregates.

## Queries consumidas

`ListEligibleClubs`, `GetClubEntryPreview`, `GetInitialClubReview`.

Toda resposta inclui `gameWorldId`, `worldSequence`, `generatedAt`, estado de frescor e links para próximas ações. Estados `loading`, `empty`, `blocked`, `error`, `offline` e `stale` permanecem distinguíveis.

## Eventos observados

`ClubEntryReserved`, `ClubControlActivated`, `ClubEntryReservationExpired`.

Eventos usam passado, versão de contrato, aggregate version, world sequence, correlation/causation IDs e idempotency key. Entrega duplicada é segura; gap de sequência força resync.

## Erros observáveis

`CLUB_SLOT_UNAVAILABLE`, `ENTRY_NOT_ELIGIBLE`, `RESERVATION_EXPIRED`, `CONTROL_ALREADY_ACTIVE`; além de `WORLD_SCOPE_MISMATCH`, `EXPECTED_VERSION_CONFLICT` e `COMMAND_NOT_AUTHORIZED`.

Erros não escondem escrita parcial: informam owner, step, retryability e ação segura. Conflitos não são convertidos automaticamente em sucesso.

## Compatibility and retry

- Campos novos opcionais preservam compatibilidade minor; mudança semântica exige nova versão.
- Retry reutiliza `commandId` e `idempotencyKey`.
- Timeout é estado desconhecido até consulta pelo command/journey ID.
- Cliente offline pode apenas enfileirar intents incluídas na whitelist e dentro do TTL canônico.
