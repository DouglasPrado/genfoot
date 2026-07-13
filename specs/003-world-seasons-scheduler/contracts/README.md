# Contracts: Mundo, temporadas e scheduler

**Version**: 1.0.0 · **Owner**: C2 · Mundo/Temporada · **Compatibility**: aditiva dentro da major.

## Envelope de command

Todo command inclui `commandId`, `idempotencyKey`, `worldId`, `expectedVersion`, `occurredAt` lógico, `rulesetVersion` e identidade do actor quando aplicável. A combinação `(worldId, idempotencyKey)` é única. Repetição com o mesmo payload devolve o receipt original; reutilização da chave com payload diferente falha com `IDEMPOTENCY_KEY_CONFLICT`.

## Commands

### `AdvanceWorldDay`

```text
input:  command envelope + expectedDate
output: worldId, previousDate, currentDate, worldVersion,
        fencingToken, processedTaskIds, rulesetVersion
```

O command adquire lease do relógio, recupera tarefas interrompidas, verifica `expectedDate` e versão, avança exatamente um dia, processa tarefas devidas e persiste o receipt antes de liberar o lease. Retry retorna o mesmo output sem novo evento.

### Scheduler

- `ClaimDueTasks(workerId, logicalDate)` retorna ocorrências ordenadas por data, prioridade e ID.
- `CompleteTask(taskId, fencingToken)` rejeita worker obsoleto.
- `RegisterTemporalWindow(window)` exige intervalo inclusivo válido, `rulesetVersion` e `configVersion`.

### SAGA-02

- `StartSeasonRollover(seasonId, nextSeason)` cria uma instância única por temporada.
- `ResumeSeasonRollover(sagaId)` retoma o primeiro dos 20 checkpoints não concluídos.
- `InspectSeasonRollover(sagaId)` é query e não adquire lease.

Handlers de passos recebem somente IDs, idempotency key, fencing token e ruleset. Eles escrevem em seus próprios contexts; C2 persiste apenas checkpoint/evidência e nunca altera aggregates externos.

## Queries

- Consulta por ID e `worldId`, com paginação cursor-based para coleções.
- `ListTemporalWindows(worldId, asOf, type?)` usa limites inclusivos e retorna apenas a configuração do ruleset do mundo.
- `InspectSeasonRollover(worldId, sagaId)` retorna fase, passo corrente, tentativas e evidência por checkpoint.
- Respostas carregam `schemaVersion`, `aggregateVersion` e `asOf`.
- Consumers não recebem permissão de escrita por meio de query.

## Events

- `WorldActivated`, `WorldDayAdvanced`, `SeasonStarted`, `SeasonDue`, `SeasonRolloverCheckpointed`, `SeasonClosed`.

`SeasonRolloverCheckpointed` inclui `rolloverId`, `seasonId`, `stepId`, `stepNumber` e evidência não sensível. O passo 20 emite `SeasonClosed` e `SeasonStarted` para N+1 uma única vez.

Envelope: `eventId`, `eventType`, `eventVersion`, `worldId`, `aggregateId`, `aggregateVersion`, `occurredAt`, `rulesetVersion`, `correlationId` e payload.

## Errors

- `WORLD_DATE_CONFLICT`, `AGGREGATE_VERSION_CONFLICT`, `RULESET_VERSION_MISMATCH`;
- `IDEMPOTENCY_KEY_CONFLICT`, `TEMPORAL_WINDOW_CONFLICT`;
- `WORLD_CLOCK_LEASE_HELD`, `ROLLOVER_LEASE_HELD`, `STALE_FENCING_TOKEN`;
- `ROLLOVER_STEP_WAITING`, `ROLLOVER_MANUAL_REVIEW`, `ROLLOVER_VERIFICATION_FAILED`.

Erros usam código estável, detalhes não sensíveis e classificação retryable. Timeout não confirma falha: o caller consulta por `idempotencyKey` antes de repetir.

## Consumers and Evolution

Consumers dependem apenas deste contrato. Campo novo é opcional; quebra semântica cria nova major; eventos publicados não são reescritos. Snapshots locais v1–v4 continuam legíveis; o writer atual materializa `scheduler.schemaVersion = 2`, janelas, receipts e rollovers vazios quando ausentes.

## Ordem normativa da SAGA-02

Os checkpoints seguem exatamente os passos 1–20 de `docs/02-tecnico/16-sagas-e-workflows.md`. Homologação (passo 3) precede premiação (passo 4). Depois do passo 17, `VERIFYING` exige standings consistentes, ledger balanceado e população na banda antes dos passos 18–20. Recuperação é sempre para frente: checkpoint concluído nunca é reaplicado.
