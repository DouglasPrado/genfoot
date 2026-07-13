# Contracts: Contratação de jogador

**Feature**: GP-008  
**Version**: 1.0.0  
**Ownership**: C6 possui scouting/negociação/contrato; C4 exame; C7 inscrição; C9 reserva/liquidação; X-002 orquestra SAGA-01; X-003 apresenta

## Intents/commands consumidos

`StartScoutMission`, `MakeTransferOffer`, `MakeCounterOffer`, `AcceptOffer`, `SignTransfer` (C6), com steps dirigidos a C4/C7/C9.

Envelope mínimo:

```text
commandId, commandType, gameWorldId, actorId, aggregateId,
expectedVersion, idempotencyKey, rulesetVersion, requestedAt, payload
```

O gateway/cliente envia a intenção ao owner declarado. O process manager pode coordenar steps, mas não escreve aggregates.

## Queries consumidas

`GetScoutReport`, `CompareTransferTargets`, `GetTransferCase`, `GetTransferSagaStatus`.

Toda resposta inclui `gameWorldId`, `worldSequence`, `generatedAt`, estado de frescor e links para próximas ações. Estados `loading`, `empty`, `blocked`, `error`, `offline` e `stale` permanecem distinguíveis.

## Eventos observados

`TransferAgreementReached`, `FinancialReservationCreated`, `MedicalExamCompleted`, `TransferSigned`, `PlayerRegistered`.

Eventos usam passado, versão de contrato, aggregate version, world sequence, correlation/causation IDs e idempotency key. Entrega duplicada é segura; gap de sequência força resync.

## Erros observáveis

`TRANSFER_WINDOW_CLOSED`, `OFFER_VERSION_CONFLICT`, `INSUFFICIENT_RESERVED_FUNDS`, `MEDICAL_EXAM_FAILED`, `REGISTRATION_REJECTED`; além de `WORLD_SCOPE_MISMATCH`, `EXPECTED_VERSION_CONFLICT` e `COMMAND_NOT_AUTHORIZED`.

Erros não escondem escrita parcial: informam owner, step, retryability e ação segura. Conflitos não são convertidos automaticamente em sucesso.

## Compatibility and retry

- Campos novos opcionais preservam compatibilidade minor; mudança semântica exige nova versão.
- Retry reutiliza `commandId` e `idempotencyKey`.
- Timeout é estado desconhecido até consulta pelo command/journey ID.
- Cliente offline pode apenas enfileirar intents incluídas na whitelist e dentro do TTL canônico.
