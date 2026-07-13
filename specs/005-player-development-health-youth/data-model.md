# Data Model: Jogador, desenvolvimento, saúde e base

**Owner**: C4 · Jogador/Desenvolvimento. Persistidos carregam `worldId`, versão, datas lógicas e ruleset quando comportamental.

## Entities

### 1. Person

identidade, origem, nascimento e estado vital.

### 2. Player

personId, atributos, potencial, posição, disponibilidade e version.

### 3. DevelopmentAccrual

jogador/data, cargas direcionais, recovery e ruleset.

### 4. MedicalCase

diagnóstico, severidade, plano, disponibilidade e retorno.

### 5. YouthCohort

temporada, região, candidatos e destino.

### 6. CareerHistory

fatos append-only de promoção, contrato referenciado e aposentadoria.

## Relationships, Validation and State

Referências externas são IDs lógicos. IDs/coleções são únicos, transições inválidas não emitem eventos e mutações exigem versão/chave. Estados terminais rejeitam mudança; retry retorna resultado gravado; workflow retoma do checkpoint.

## History and Migration

Fatos são append-only, snapshots versionados e projeções reconstruíveis. Migrações são aditivas e remoções aguardam todos os readers.
