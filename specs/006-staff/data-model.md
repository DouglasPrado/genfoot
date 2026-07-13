# Data Model: Staff

**Owner**: C5 · Staff. Persistidos carregam `worldId`, versão, datas lógicas e ruleset quando comportamental.

## Entities

### 1. StaffMember

identidade, especialidades, atributos, reputação e disponibilidade.

### 2. StaffContract

staffId, clubId, role, vigência, compensationRef e status.

### 3. StaffAssignment

contractId, departmentRef, workload, start/end e version.

### 4. CapabilitySnapshot

staff/club, área, score, confidence, asOf e ruleset.

## Relationships, Validation and State

Referências externas são IDs lógicos. IDs/coleções são únicos, transições inválidas não emitem eventos e mutações exigem versão/chave. Estados terminais rejeitam mudança; retry retorna resultado gravado; workflow retoma do checkpoint.

## History and Migration

Fatos são append-only, snapshots versionados e projeções reconstruíveis. Migrações são aditivas e remoções aguardam todos os readers.
