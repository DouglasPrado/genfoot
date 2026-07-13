# Contracts: Início de temporada

**Feature**: GP-004  
**Version**: 1.0.0  
**Ownership**: C2 orquestra temporada/janelas; C3 possui objetivos e elenco; C7 publica competição/inscrição; C9 possui orçamento; C11 comunica

## Intents/commands consumidos

`StartSeasonRollover` (C2), `OpenRegistrationWindow` (C2/C7 por saga), `StartSeason` (C2).

Envelope mínimo:

```text
commandId, commandType, gameWorldId, actorId, aggregateId,
expectedVersion, idempotencyKey, rulesetVersion, requestedAt, payload
```

O gateway/cliente envia a intenção ao owner declarado. O process manager pode coordenar steps, mas não escreve aggregates.

## Queries consumidas

`GetSeasonOpening`, `GetPublishedCalendar`, `GetClubSeasonPlan`.

Toda resposta inclui `gameWorldId`, `worldSequence`, `generatedAt`, estado de frescor e links para próximas ações. Estados `loading`, `empty`, `blocked`, `error`, `offline` e `stale` permanecem distinguíveis.

## Eventos observados

`SeasonStarted`, `CompetitionCalendarPublished`, `RegistrationWindowOpened`, `ClubSeasonObjectivesPublished`.

Eventos usam passado, versão de contrato, aggregate version, world sequence, correlation/causation IDs e idempotency key. Entrega duplicada é segura; gap de sequência força resync.

## Erros observáveis

`PREVIOUS_SEASON_NOT_HOMOLOGATED`, `CALENDAR_INVALID`, `SEASON_ALREADY_STARTED`, `ROLLOVER_INCOMPLETE`; além de `WORLD_SCOPE_MISMATCH`, `EXPECTED_VERSION_CONFLICT` e `COMMAND_NOT_AUTHORIZED`.

Erros não escondem escrita parcial: informam owner, step, retryability e ação segura. Conflitos não são convertidos automaticamente em sucesso.

## Compatibility and retry

- Campos novos opcionais preservam compatibilidade minor; mudança semântica exige nova versão.
- Retry reutiliza `commandId` e `idempotencyKey`.
- Timeout é estado desconhecido até consulta pelo command/journey ID.
- Cliente offline pode apenas enfileirar intents incluídas na whitelist e dentro do TTL canônico.
