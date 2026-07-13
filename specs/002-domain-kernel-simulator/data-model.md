# Data Model: Domain Kernel e simulador determinístico

**Owner**: Fundação compartilhada. Todas as entidades persistidas carregam `worldId`, versão e timestamps lógicos.

## Entities

### 1. GameWorld

id, seed, currentDate, status e rulesetVersion; CREATED → ACTIVE → ARCHIVED.

### 2. WorldSnapshot

schemaVersion e projeções persistidas; migração somente para frente.

### 3. DomainEvent

id, worldId, occurredAt, type e payload versionado.

### 4. ScheduledTask

occurrenceKey, dueDate, status, attempts e fencingToken.

## Relationships and Validation

- Referências externas são IDs lógicos validados por contrato; não transferem ownership.
- IDs são estáveis, coleções respeitam unicidade/capacidade e datas usam o calendário do mundo.
- Mutação exige versão esperada e chave de idempotência; conflito não produz evento.
- Estado derivado pode ser reconstruído; fatos históricos registram ruleset e versão do schema.

## State Transitions

Somente commands do owner realizam transições. Estados terminais rejeitam mutação; retry da mesma ocorrência retorna o resultado gravado; recuperação continua do último checkpoint confirmado.

## History and Migration

Eventos e snapshots são append/versionados. Novos campos começam compatíveis, backfill é reproduzível e remoção só ocorre depois de todos os readers migrarem.
