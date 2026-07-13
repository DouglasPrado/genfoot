# Data Model: Mundo, temporadas e scheduler

**Owner**: C2 · Mundo/Temporada. Todas as entidades persistidas carregam `worldId`, versão e timestamps lógicos.

## Entities

### 1. World

worldId, status, currentDate, activeRulesetVersion e configVersion.

### 2. Season

seasonId, worldId, ordinal, phase, startsAt, dueAt e status.

### 3. ScheduledTask

taskId, occurrenceKey, dueDate, status, attempts, leaseUntil e fencingToken.

### 4. SeasonRollover

sagaId, worldId, seasonId, nextSeason, rulesetVersion, phase, status, currentStepIndex, 20 step snapshots, retry budget, lease owner/expiry, fencing token, verification evidence e revision.

### 5. TemporalWindow

windowId, worldId, type, name, opensOn/closesOn inclusivos, rulesetVersion, configVersion e version. IDs repetidos só são idempotentes quando todo o conteúdo coincide.

### 6. WorldCommandReceipt

commandId, idempotencyKey, worldId, expected/result date, result world version, fencing token, rulesetVersion e processedTaskIds. O receipt é a resposta autoritativa de retry.

## Relationships and Validation

- Referências externas são IDs lógicos validados por contrato; não transferem ownership.
- IDs são estáveis, coleções respeitam unicidade/capacidade e datas usam o calendário do mundo.
- Mutação exige versão esperada e chave de idempotência; conflito não produz evento.
- Estado derivado pode ser reconstruído; fatos históricos registram ruleset e versão do schema.
- O scheduler snapshot v2 contém `windows`, `commandReceipts` e `rollovers`; readers materializam arrays vazios para snapshots anteriores.

## State Transitions

Somente commands do owner realizam transições. Estados terminais rejeitam mutação; retry da mesma ocorrência retorna o resultado gravado; recuperação continua do último checkpoint confirmado. SAGA-02 é linear: passos 1–17, `VERIFYING`, passos 18–20. `COMPLETED` arquiva N e cria N+1 na mesma revisão do scheduler.

## History and Migration

Eventos e snapshots são append/versionados. O envelope JSON atual é v5 e lê v1–v4; scheduler legado é normalizado para schema v2. Novos campos começam compatíveis, backfill é reproduzível e remoção só ocorre depois de todos os readers migrarem.
