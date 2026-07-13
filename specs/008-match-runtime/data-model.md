# Data Model: Partida e runtime

**Owner**: C8 · Partida/Runtime. Estado persistido inclui world, versão, datas lógicas e ruleset/schema aplicável.

## Entities

### 1. Match

world/competition refs, kickoff, status, participants e officialResultVersion.

### 2. KickoffSnapshot

jogadores/tática/staff/contexto imutáveis e inputHash.

### 3. SimulationManifest

ruleset, engineBuild, timestep, seed streams e hashes.

### 4. MatchCommandLog

matchSequence, tick, actor, command, accepted/reason.

### 5. MatchCheckpoint

tick, stateHash, RNG cursors e commandSequence.

### 6. MatchResult

score, stats, resultHash, statsHash e finalizedAt.

## Relationships and Validation

Referências externas são IDs lógicos. Coleções/IDs são únicos, mutação exige expectedVersion/idempotencyKey e transição inválida não emite evento.

## State, History and Migration

Command do owner muda estado; terminal rejeita mutação; retry retorna resultado gravado; workflow retoma checkpoint. Fatos são append-only, snapshots versionados, projeções reconstruíveis e migrações aditivas.
