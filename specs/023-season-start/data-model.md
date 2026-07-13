# Data Model: Início de temporada

## Ownership

GP-004 não possui aggregate nem tabela autoritativa. C2 orquestra temporada/janelas; C3 possui objetivos e elenco; C7 publica competição/inscrição; C9 possui orçamento; C11 comunica. Os tipos abaixo são projeções/referências descartáveis e reconstruíveis.

## Read models

### SeasonOpeningView

- `gameWorldId`: mundo isolado.
- `journeyId`: correlação da instância.
- `status`: `NOT_STARTED | IN_PROGRESS | BLOCKED | COMPLETED | FAILED`.
- `currentStep`: etapa observada de “confirmar rollover anterior → confirmar participantes → publicar calendário/regulamento → abrir janelas/inscrições → disponibilizar orçamento/objetivos → iniciar pré-temporada → iniciar temporada oficial”.
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
- `COMPLETED` requer todas as condições de uma temporada só entra em estado oficial após todos os pré-requisitos e retries não repetem calendário, orçamento, janelas ou notificações.
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
