# Data Model: Contratação de jogador

## Ownership

GP-008 não possui aggregate nem tabela autoritativa. C6 possui scouting/negociação/contrato; C4 exame; C7 inscrição; C9 reserva/liquidação; X-002 orquestra SAGA-01; X-003 apresenta. Os tipos abaixo são projeções/referências descartáveis e reconstruíveis.

## Read models

### PlayerSigningView

- `gameWorldId`: mundo isolado.
- `journeyId`: correlação da instância.
- `status`: `NOT_STARTED | IN_PROGRESS | BLOCKED | COMPLETED | FAILED`.
- `currentStep`: etapa observada de “identificar necessidade → observar/comparar → consultar disponibilidade → negociar oferta → reservar recursos → negociar contrato → realizar exame → validar integridade → assinar/registrar/liquidar → inscrever → integrar”.
- `nextActions`: ações permitidas e respectivos owners.
- `worldSequence`: sequência da projeção.
- `rulesetVersion`: versão fixada quando aplicável.
- `updatedAt`: instante de atualização da projeção.

### JourneyStepReference

- `ownerId`: C1…C12 ou concern participante.
- `aggregateId` e `aggregateVersion`: referência, nunca cópia autoritativa.
- `commandId` / `eventId`: correlação e idempotência.
- `status`: `PENDING | ACCEPTED | REJECTED | COMPENSATED`.
- `errorCode`: erro estável quando rejeitado.

## Relationships

Uma projeção de jornada referencia zero ou mais aggregates dos owners participantes e uma sequência ordenada de steps. A exclusão da projeção não remove fatos oficiais; ela é reconstruída pelos eventos.

## Validation and invariants

- Toda referência compartilha o mesmo `gameWorldId`.
- `journeyId + step + commandId` é único.
- `worldSequence` não retrocede; gaps exigem resync.
- `COMPLETED` requer todas as condições de uma contratação completa exatamente uma vez; falha em qualquer step compensa reserva/inscrição aplicável sem duplicar contrato ou ledger.
- Nenhum campo da projeção substitui saldo, vínculo, elegibilidade, resultado ou outro estado oficial.
- Ruleset/manifesto fixado não muda no meio da instância.

## State transitions

```text
NOT_STARTED -> IN_PROGRESS -> COMPLETED
                   |   ^
                   v   |
                BLOCKED
                   |
                   v
                 FAILED
```

`BLOCKED` pode retornar a `IN_PROGRESS` após retry seguro. `FAILED` exige nova intenção ou compensação explícita; fatos aceitos permanecem históricos.
