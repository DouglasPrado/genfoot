# Data Model: Competições e calendário

**Owner**: C7 · Competição/Calendário. Persistidos carregam `worldId`, versão, datas lógicas e ruleset quando comportamental.

## Entities

### 1. CompetitionFormat

version, fases, pareamento, critérios e regras disciplinares.

### 2. CompetitionEdition

world/season, formatVersion, status e participantes.

### 3. Registration

club/player refs, eligibilitySnapshot, window e status.

### 4. Fixture

edição/fase/rodada, participantes, kickoff e status.

### 5. StandingEntry

edição/fase, pontos, gols, disciplina e rank provisório.

### 6. Homologation

edição, inputHash, decisão, actor e timestamp.

## Relationships, Validation and State

Referências externas são IDs lógicos. IDs/coleções são únicos, transições inválidas não emitem eventos e mutações exigem versão/chave. Estados terminais rejeitam mudança; retry retorna resultado gravado; workflow retoma do checkpoint.

## History and Migration

Fatos são append-only, snapshots versionados e projeções reconstruíveis. Migrações são aditivas e remoções aguardam todos os readers.
