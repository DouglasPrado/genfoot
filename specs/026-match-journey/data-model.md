# Data Model: Preparação e partida

## Ownership

GP-007 não possui aggregate nem tabela autoritativa. C8 possui runtime/resultado; C4 possui saúde/desenvolvimento; C5 staff; C7 elegibilidade/homologação; concerns só decidem, transportam e apresentam. Os tipos abaixo são projeções/referências descartáveis e reconstruíveis.

## Read models

### MatchJourneyView

- `gameWorldId`: mundo isolado.
- `journeyId`: correlação da instância.
- `status`: `NOT_STARTED | IN_PROGRESS | BLOCKED | COMPLETED | FAILED`.
- `currentStep`: etapa observada de “agendar → preparar dossiê/treino/logística → definir escalação/tática/delegação → validar elegibilidade → congelar kickoff → simular ticks/decisões → finalizar resultado → homologar → aplicar fan-out e relatório”.
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
- `COMPLETED` requer todas as condições de mesma seed, ruleset, manifesto e command log produzem o mesmo hash/result em todos os modos e um único fan-out oficial.
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
