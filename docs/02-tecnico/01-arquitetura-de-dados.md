# Arquitetura de Dados e Transações (ADRs)

> **Status:** Rascunho consolidado · **Fontes:** chats/arquitetura-jogo.md, chats/ux-do-jogo.md (Bloco 25) · **Revisão:** 2026-07-10

Este documento consolida as decisões arquiteturais (ADRs) que governam a camada de dados e transações do **Grinta**, um manager de futebol online multi-mundo. Ele descreve como o banco PostgreSQL é organizado por domínio, como a integridade referencial é garantida com isolamento por mundo, e como concorrência e transações são tratadas para preservar invariantes de negócio sob carga.

As decisões estão registradas no formato ADR e mantêm seus identificadores originais (ex.: **Decisão 19.7**, **Decisão 19.8**). Preserve esses identificadores em revisões futuras.

- **Schema concreto** (models e enums Prisma): consulte [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md).
- **Registro central de decisões:** consulte [`../99-decisoes/registro-de-decisoes.md`](../99-decisoes/registro-de-decisoes.md).

## Sumário

- [Decisão 19.7 — Schemas PostgreSQL por domínio](#decisão-197--schemas-postgresql-por-domínio)
- [Decisão 19.8 — Foreign keys, isolamento por mundo e relações entre domínios](#decisão-198--foreign-keys-isolamento-por-mundo-e-relações-entre-domínios)
  - [Chave primária global e chave de escopo](#chave-primária-global-e-chave-de-escopo)
  - [Foreign key composta por mundo](#foreign-key-composta-por-mundo)
  - [Entidades globais e FKs simples](#entidades-globais-e-fks-simples)
  - [FKs entre schemas e ownership](#fks-entre-schemas-e-ownership)
  - [Quando a referência é lógica (sem FK física)](#quando-a-referência-é-lógica-sem-fk-física)
  - [Política ON DELETE](#política-on-delete)
  - [FKs circulares e constraints DEFERRABLE](#fks-circulares-e-constraints-deferrable)
  - [Índices de suporte para FKs](#índices-de-suporte-para-fks)
  - [Migração de FK em 6 passos](#migração-de-fk-em-6-passos)
  - [Prisma e relações compostas](#prisma-e-relações-compostas)
- [Decisão 19.9 — Índices, paginação e particionamento](#decisão-199--índices-paginação-e-particionamento)
- [Decisão 19.10 — Transações, concorrência, locks e consistência](#decisão-1910--transações-concorrência-locks-e-consistência)
  - [Fluxos transacionais passo a passo](#fluxos-transacionais-passo-a-passo)
- [Convenções de dados e tipos](#convenções-de-dados-e-tipos)
- [Mensageria durável (RabbitMQ)](#mensageria-durável-rabbitmq)
- [Cache e dados efêmeros (Redis)](#cache-e-dados-efêmeros-redis)
- [Agendador persistente e relógio do mundo](#agendador-persistente-e-relógio-do-mundo)
- [CQRS pragmático, read models e projeções](#cqrs-pragmático-read-models-e-projeções)
- [Sagas e process managers](#sagas-e-process-managers)
- [Busca, analytics e arquivos](#busca-analytics-e-arquivos)
- [Registro de decisões](#registro-de-decisões)

---

## Decisão 19.7 — Schemas PostgreSQL por domínio

**Decisão 19.7:** schemas PostgreSQL separados por domínio e capacidade técnica, nomes físicos em snake_case, ownership único por tabela e mapeamento explícito no Prisma.

Princípios:

- **Separação por domínio:** cada domínio de negócio (ex.: `players`, `clubs`, `contracts`, `finance`, `matches`, `competitions`, `identity`, `worlds`, `messaging`, `notifications`, `audit`, `operations`, `projections`) reside em um schema PostgreSQL próprio.
- **Nomes físicos em snake_case:** tabelas e colunas usam snake_case (ex.: `player_contracts`, `world_id`, `scheduled_game_at`).
- **Ownership único por tabela:** cada tabela pertence a um único domínio. Schemas separam ownership, mas não transformam cada domínio em um banco independente.
- **Mapeamento explícito no Prisma:** cada model declara `@@schema(...)`, `@@map(...)` para o nome físico e `@map(...)` por coluna. Recursos não expressáveis pelo Prisma serão implementados por migration SQL personalizada.

O concreto (lista de models e enums por schema) vive em [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md).

---

## Decisão 19.8 — Foreign keys, isolamento por mundo e relações entre domínios

**Decisão 19.8:** relações oficiais no mesmo banco usarão FKs fortes, com escopo composto por `world_id`, `ON DELETE RESTRICT` por padrão e referências lógicas apenas quando projeções, histórico ou separação física justificarem.

### O problema

O uso de UUIDv7 garante unicidade global, mas **não** garante que duas entidades relacionadas pertençam ao mesmo mundo. Estado tecnicamente possível, porém inválido:

| Campo | Mundo |
|-------|-------|
| `contract.world_id` | World A |
| `contract.player_id` | jogador do World B |
| `contract.club_id` | clube do World A |

Uma FK simples (`FOREIGN KEY (player_id) REFERENCES players.players(id)`) validaria apenas que o jogador existe — não impediria a relação entre mundos diferentes.

O banco também precisa estar preparado para: múltiplos mundos na mesma instância, migração futura de mundos entre shards, relações entre schemas, registros históricos imutáveis, projeções reconstruíveis, imports/backfills, e processos transacionais que criam várias entidades.

### Alternativas avaliadas

| Opção | Descrição | Veredito |
|-------|-----------|----------|
| **A** | Não usar FKs; a aplicação valida todas as relações. | Rejeitada — a aplicação não é a única escritora ao longo da vida do sistema (migrations, backfills, ferramentas administrativas, recuperação). Risco de órfãos e relações entre mundos. |
| **B** | FKs simples por ID em todas as relações. | Insuficiente — garante existência, mas a relação ainda poderia atravessar mundos; cascatas poderiam cruzar domínios. |
| **C** | FKs fortes no mesmo banco, com chaves compostas por `world_id`, RESTRICT por padrão e referências lógicas apenas para projeções, histórico ou limites físicos. | **Escolhida.** |

Regra central: **usar a proteção mais forte disponível na unidade física atual**, preservando adapters e boundaries que permitam substituir a FK por contrato quando a separação física realmente ocorrer.

### Chave primária global e chave de escopo

Entidades continuam usando UUIDv7 como chave primária. O par `(world_id, id)` é disponibilizado como **chave candidata** para relações que precisam comprovar o escopo:

```sql
CREATE TABLE players.players (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  world_id UUID NOT NULL,
  -- outros campos
  CONSTRAINT uq_players_world_id_id
    UNIQUE (world_id, id)
);
```

- `id` → identidade global.
- `world_id + id` → identidade validada dentro do escopo do mundo.

A constraint composta **não** substitui a chave primária.

### Foreign key composta por mundo

Relações world-scoped usam FK composta `(world_id, entity_id)`, rejeitando referências que atravessem mundos mesmo que a entidade exista:

```sql
CREATE TABLE contracts.player_contracts (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  world_id UUID NOT NULL,
  player_id UUID NOT NULL,
  club_id UUID NOT NULL,

  CONSTRAINT fk_player_contracts_player_world
    FOREIGN KEY (world_id, player_id)
    REFERENCES players.players (world_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_player_contracts_club_world
    FOREIGN KEY (world_id, club_id)
    REFERENCES clubs.clubs (world_id, id)
    ON DELETE RESTRICT
);
```

**Ordem padronizada das chaves compostas:** sempre `(world_id, entity_id)`, nunca alternando com `(entity_id, world_id)`. Isso torna migrations previsíveis, índices reutilizáveis e joins consistentes.

`world_id` não será uma FK decorativa. Toda tabela world-scoped precisa responder: a entidade pertence a um mundo? A relação com o mundo está protegida? As referências relacionadas validam o mesmo `world_id`? O índice começa por `world_id`? O registro pode ser migrado junto com o mundo? Não se aceita apenas `world_id UUID NOT NULL` sem proteção sobre as demais relações.

### Entidades globais e FKs simples

Nem toda entidade pertence a um mundo. Exemplos: usuário humano, país, moeda, idioma, release da plataforma, feature flag global, operador administrativo. Essas relações usam FK simples:

```sql
FOREIGN KEY (user_id) REFERENCES identity.users(id)
```

Uma participação em mundo combina os dois conceitos:

```sql
CREATE TABLE identity.world_memberships (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  world_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status VARCHAR(32) NOT NULL,

  CONSTRAINT fk_world_memberships_world
    FOREIGN KEY (world_id) REFERENCES worlds.worlds(id) ON DELETE RESTRICT,
  CONSTRAINT fk_world_memberships_user
    FOREIGN KEY (user_id) REFERENCES identity.users(id) ON DELETE RESTRICT,
  CONSTRAINT uq_world_memberships_world_user
    UNIQUE (world_id, user_id)
);
```

### FKs entre schemas e ownership

**FKs físicas entre schemas serão permitidas** quando as tabelas estiverem no mesmo banco lógico, a relação for oficial, a existência for uma invariante, o ciclo de vida for compatível, a futura separação não for imediata e a integridade justificar o acoplamento.

**FK não concede ownership de escrita.** Que `contracts.player_contracts.player_id → players.players.id` exista significa apenas que um contrato não pode referenciar jogador inexistente ou de outro mundo. **Não** significa que o domínio de contratos possa atualizar o jogador. Ownership de escrita continua protegido por repositories, packages, dependency rules, commands, permissões de banco e revisão de migrations.

**Relações transacionais entre domínios:** alguns comandos alteram mais de um domínio na mesma transação (ex.: registro definitivo de transferência toca Transfers, Contracts, Finance e Players). A coordenação é feita pela camada de aplicação e Unit of Work. FKs garantem integridade estrutural, mas não substituem invariantes de domínio, ordem das operações, locks, optimistic concurrency, Process Managers e eventos de domínio.

### Relações 1:1 e N:N

- **1:1** garantida por FK única, ex.: `UNIQUE (world_id, match_id)` em `matches.match_results` — não dependeremos apenas da aplicação para impedir dois resultados oficiais ativos.
- **N:N** usa chave composta como PK, ex.: `PRIMARY KEY (world_id, competition_edition_id, club_id)` em `competitions.participants`, com FKs compostas para cada lado.
- **Chaves naturais** continuam protegidas por UNIQUE de negócio — UUID não substitui unicidade de negócio. Não se cria UUID para permitir duplicatas que o domínio considera impossíveis.
- **Relações polimórficas** (`resource_type` + `resource_id`) não têm FK genérica: `resource_type` é enum/código controlado, o schema do evento é versionado, a aplicação valida o recurso na criação. Não se cria uma tabela universal `entities` só para permitir a FK.

### Quando a referência é lógica (sem FK física)

Uma referência pode ser lógica quando estiver em uma destas categorias:

- **Destino em outro banco** (ex.: Game Shard referenciando usuário no Identity Database) — PostgreSQL não oferece FK entre bancos. Persiste-se `user_id` + `identity_source`, validado por contrato.
- **Provedor externo** — `external_provider` + `external_id`; o provider não é tabela interna confiável.
- **Documento histórico autocontido** — um evento preserva IDs que já podem não ter entidade operacional acessível.
- **Projeção reconstruível** — read models armazenam IDs para navegação sem bloquear rebuilds.
- **Referência polimórfica controlada** — não usa FK tradicional para várias tabelas.

**Projeções não terão FKs fortes por padrão** (são derivadas, descartáveis, reconstruíveis, eventualmente consistentes). Podem conter `world_id`, `club_id`, `player_id`, `source_version` sem que todas sejam FKs físicas. Podem ter constraints locais (PK, CHECK) que garantem estrutura local sem impedir rebuild. A consistência é garantida pelo Projection Worker e por verificadores.

**Eventos e Outbox:** o event store histórico ou arquivo de auditoria pode usar referências lógicas (o evento é imutável, pode ser importado/arquivado, precisa preservar a referência original). A Outbox pode ter FK para o agregado enquanto ainda estiver operacional.

**Registro de referências sem FK:** toda referência lógica relevante é catalogada com destino conceitual, motivo da ausência de FK, owner da validação, frequência de reconciliação, comportamento quando o destino não existe e política de retenção. Uma coluna terminada em `_id` sem FK nem justificativa é considerada suspeita. Verificadores de integridade referencial cobrem relações que não podem usar FK (usuário entre shard e Identity, `StoredObjectId` versus Cloudflare R2, documento do Meilisearch versus projeção, evento histórico versus aggregate reference, deployment versus release manifest) e produzem resultados `HEALTHY`, `MISSING_TARGET`, `SCOPE_MISMATCH`, `STALE_REFERENCE`, `DUPLICATED_REFERENCE`, `UNRESOLVABLE`. Esses verificadores não substituem FKs onde elas são possíveis.

### Política ON DELETE

| Comportamento | Quando | Exemplos |
|---------------|--------|----------|
| **RESTRICT** (padrão) | Entidades oficiais com dependências. Uma remoção física é recusada enquanto existirem dependências. Protege contra scripts e operações administrativas incorretas. | Player com contratos; clube com partidas; partida com resultado; conta com ledger entries; competition edition com participantes. |
| **CASCADE** | Somente quando o filho não tem significado independente, não é histórico, não sobrevive ao pai, não é referenciado externamente, pode ser recriado/descartado e pertence exclusivamente ao agregado. Sempre declarado e revisado. | Upload intent → partes multipart temporárias; draft não publicado → linhas internas; game session → nonces efêmeros. |
| **SET NULL** | Raro. Apenas quando a ausência posterior tiver significado válido. Frequentemente prefere-se preservar `created_by_actor_reference` ou um tombstone. Nunca quando a relação é essencial para interpretar o registro. | Relatório técnico gerado por sessão administrativa já removida. |

### Exclusão mútua e períodos sobrepostos

Algumas invariantes não são FKs mas dependem de relações (ex.: um jogador não pode ter dois contratos ativos incompatíveis no mesmo período). Usa-se exclusion constraint:

```sql
EXCLUDE USING gist (
  world_id WITH =,
  player_id WITH =,
  contract_period WITH &&
) WHERE (status = 'ACTIVE');
```

Ou combinação de locks, consultas de conflito, constraints auxiliares e índices únicos parciais. A estratégia é específica por agregado.

### FKs circulares e constraints DEFERRABLE

Relações circulares podem ocorrer (ex.: Competition Edition → `currentStageId`; Competition Stage → `competitionEditionId`). Opções preferidas, em ordem:

1. Remover a redundância.
2. Inserir em ordem com coluna temporariamente nula quando semanticamente válido.
3. Criar entidade de estado separada.
4. Usar constraint adiável apenas quando necessário.

**Política de DEFERRABLE:** constraints imediatas por padrão. `DEFERRABLE INITIALLY DEFERRED` somente com caso documentado e teste transacional, quando a invariante precisar ser validada apenas no commit (ex.: troca atômica de posição entre dois registros, reorganização de ordem única, importação transacional de grafo, substituição de vínculo 1:1 sem estado intermediário válido). Não usar DEFERRABLE automaticamente para todas as FKs — uso indiscriminado esconde erros até o commit, dificulta diagnóstico e pode mascarar modelagem ruim.

### Índices de suporte para FKs

O PostgreSQL cria índice para PRIMARY KEY e UNIQUE, mas **não** cria índice automático na coluna filha de toda FK. Relações usadas em joins, verificação de delete, busca por pai ou processamento por mundo recebem índice apropriado, geralmente na mesma ordem da FK:

```sql
CREATE INDEX idx_player_contracts_world_player
ON contracts.player_contracts (world_id, player_id);
```

A ordem `(world_id, player_id)` favorece consulta por mundo e jogador, migração por mundo, purge por escopo e futura partição por mundo/shard. Não se criam todos os índices possíveis sem análise, mas FKs importantes têm suporte físico planejado.

### Migração de FK em 6 passos

Em tabelas grandes, a criação imediata gera validação pesada. Adiciona-se a FK como `NOT VALID` e valida-se depois:

```sql
-- Passo 2
ALTER TABLE contracts.player_contracts
ADD CONSTRAINT fk_player_contracts_player_world
FOREIGN KEY (world_id, player_id)
REFERENCES players.players (world_id, id)
NOT VALID;

-- Passo 6
ALTER TABLE contracts.player_contracts
VALIDATE CONSTRAINT fk_player_contracts_player_world;
```

Fluxo:

1. Criar suporte de índice.
2. Adicionar FK como `NOT VALID`.
3. Novas escritas já respeitam a FK.
4. Verificar registros antigos.
5. Corrigir divergências.
6. Validar a constraint.

A constraint não permanecerá `NOT VALID` indefinidamente sem plano registrado.

### Imports e preparação para shards

**Imports** seguem um manifesto de dependências (World → Clubs/Players → Contracts → Competitions → Matches → Finance → históricos/projeções). Constraints adiáveis são ativadas apenas dentro da transação de importação. Não se desabilitam globalmente todas as FKs presumindo dados corretos. Após o import: constraints validadas, contagens reconciliadas, checksums comparados, relações sem destino relatadas, projeções reconstruídas.

**Shards:** enquanto os mundos estiverem no mesmo banco, FKs físicas completas. Quando um mundo for movido para um shard, um World Registry central conhece o shard atual; o banco do shard contém todas as tabelas world-scoped daquele mundo; entidades mantêm os mesmos UUIDs; as FKs compostas por `world_id` continuam válidas dentro do shard. Entre banco central e shard não existe FK física — usam-se contratos versionados, caches controlados, replicação de referências, verificadores e reconciliação. Não se projeta o banco atual como se já estivesse distribuído: a migration para shard incluirá a mudança explícita de garantias.

### Prisma e relações compostas

```prisma
model Player {
  id      String @id @db.Uuid
  worldId String @map("world_id") @db.Uuid
  contracts PlayerContract[]

  @@unique([worldId, id], map: "uq_players_world_id_id")
  @@map("players")
  @@schema("players")
}

model PlayerContract {
  id       String @id @db.Uuid
  worldId  String @map("world_id") @db.Uuid
  playerId String @map("player_id") @db.Uuid

  player Player @relation(
    fields: [worldId, playerId],
    references: [worldId, id],
    onDelete: Restrict,
    map: "fk_player_contracts_player_world"
  )

  @@index([worldId, playerId], map: "idx_player_contracts_world_player")
  @@map("player_contracts")
  @@schema("contracts")
}
```

O SQL gerado será revisado, especialmente em constraints compostas, nomes físicos, `ON DELETE`, índices, deferrability e exclusion constraints. Recursos não suportados pelo Prisma são implementados em migrations SQL controladas. Relações Prisma não serão carregadas indiscriminadamente (`include` amplo) — servem para integridade e queries orientadas ao caso de uso, não para reconstruir o mundo como grafo em memória.

---

## Decisão 19.9 — Índices, paginação e particionamento

**Decisão 19.9:** índices orientados por access patterns, paginação por cursor e particionamento somente quando volume, retenção ou manutenção comprovarem sua necessidade.

Regra central: **todo índice deve corresponder a uma invariante, query, ordenação ou processo operacional documentado.** Índices excessivos amplificam escrita, consomem memória/armazenamento, aumentam WAL/replicação e tornam vacuum mais pesado.

### Access patterns e ordem de colunas

Antes de criar uma tabela importante, registra-se um catálogo de access patterns (filtros, ordenação, locks) que alimenta índices, testes, query repositories, monitoramento e revisão de migrations. Consultas internas de um mundo geralmente começam por `world_id`:

```sql
CREATE INDEX idx_matches_world_scheduled_game_at
ON matches.matches (world_id, scheduled_game_at, id);
```

A ordem das colunas reflete igualdades frequentes, escopo obrigatório, faixas, ordenação e desempates — não uma listagem de colunas "aparentemente relevantes".

**Consultas com OR (ex.: `home_club_id`/`away_club_id`):** a busca de partidas de um clube (`WHERE home_club_id = $1 OR away_club_id = $1`) não é resolvida por um índice composto `(home_club_id, away_club_id)`. O repository escolhe conforme o access pattern: dois índices separados, `UNION ALL` de duas consultas, tabela associativa de participantes ou projeção de agenda do clube.

### Tipos de índice

| Tipo | Uso |
|------|-----|
| **B-tree** (padrão) | Igualdade, ordenação, intervalos, paginação, uniques, FKs, claims. |
| **Parcial** | Subconjuntos operacionais pequenos (Outbox pendente `WHERE published_at IS NULL`; sessões ativas; notificações não lidas). |
| **Único parcial** | Unicidades condicionais (ex.: um vínculo principal ativo por jogador: `UNIQUE (world_id, player_id) WHERE status = 'ACTIVE'`). |
| **INCLUDE** (cobertura) | Poucas colunas adicionais frequentes, apenas após validar o plano. |
| **Expressão** | Transformação estável frequente (ex.: `lower(normalized_name)`); prefere-se coluna normalizada persistida quando há regra de domínio. |
| **GIN** | Arrays pequenos, JSONB documental, full-text interno limitado — só com consultas reais compatíveis. Busca pública fica no Meilisearch. |
| **BRIN** | Tabelas grandes, append-only, naturalmente ordenadas por tempo/sequência (ex.: `audit.security_events`, `messaging.outbox_messages`, `matches.match_events`). |

### Paginação e limites

- **Keyset (cursor)** para listas extensas; o cursor contém os campos da ordenação.
- **OFFSET** limitado a catálogos pequenos e telas administrativas de baixo volume — nunca como estratégia principal para jogadores, eventos, notificações, histórico financeiro, partidas, auditoria ou market listings (custo crescente e páginas inconsistentes sob inserção concorrente).
- **Ordenação sempre determinística**, com desempate por `id` ou coluna de sequência (ex.: `ORDER BY created_at DESC, id DESC`; streams por `runtime_epoch ASC, match_sequence ASC`).
- **Limites máximos de página** por endpoint (padrão ~20, máximo comum ~100). Grandes extrações usam export job assíncrono, streaming controlado, snapshot e arquivo no R2.

### Claims concorrentes

Queries de claim (Outbox, Scheduler, workers) usam `FOR UPDATE SKIP LOCKED` e são projetadas junto com seu índice parcial correspondente:

```sql
SELECT id FROM scheduling.scheduled_events
WHERE status = 'PENDING' AND available_at <= transaction_timestamp()
ORDER BY priority DESC, available_at ASC, local_sequence ASC
FOR UPDATE SKIP LOCKED LIMIT $1;

CREATE INDEX idx_scheduled_events_pending_claim
ON scheduling.scheduled_events (priority DESC, available_at ASC, local_sequence ASC)
WHERE status = 'PENDING';
```

### Planos, telemetria e N+1

Queries críticas têm fixtures de volume representativo, orçamento (`p95BudgetMs`, `mustUseIndex`) e são verificadas com `EXPLAIN`/`EXPLAIN ANALYZE`. "Usou índice" não é sinônimo automático de "bom plano". Telemetria identifica queries por fingerprint (frequentes, raras caras, regressivas, N+1 do Prisma). Repositories evitam N+1 com join orientado ao caso de uso, batch loader, projeção ou agregação SQL — não carregando grafos gigantes.

Índices redundantes/não utilizados são revisados, não removidos cegamente (sazonalidade, jobs raros). Índices que sustentam constraints (PK, unique de negócio, exclusion, chave candidata de FK) não são removidos por baixa utilização — têm função de integridade. Fluxo de remoção: candidato → confirmar ausência de função de integridade → analisar consultas históricas e sazonalidade → remover em teste → monitorar → remover em produção.

### Estatísticas e manutenção física

- **Estatísticas do planejador:** colunas com distribuição incomum (`world_id`, status muito desbalanceados, tipos de evento, categorias operacionais, shard assignment) podem receber `ALTER COLUMN ... SET STATISTICS` maior; correlações fortes entre colunas (`world_id + status`, `competition_id + stage_id`, `provider + delivery_status`) podem usar **estatísticas estendidas multicoluna**. Sempre após análise de plano real, nunca elevado globalmente.
- **Criação de índices em produção:** em tabelas grandes, criação sem bloqueio prolongado das escritas, com estimativa de tamanho/duração, controle de CPU/I/O/WAL, verificação de validade, associação à constraint quando aplicável e monitoramento de réplicas/latência. Operações que não podem ocorrer dentro de transação são etapas explícitas do migration runner.
- **Bloat, reindexação e `fillfactor`:** monitoram-se tamanho de tabela/índices, tuplas mortas, page splits, autovacuum e crescimento de WAL. Reindexação é orientada por diagnóstico, não cron cego. `fillfactor` pode ser ajustado em tabelas/índices com updates frequentes (estado atual de partida, projeções, Process Managers, status de deliveries); append-only geralmente não precisa. Não há `fillfactor` global.

### Particionamento

Considerado apenas com motivadores comprovados (retenção por período, tabela muito grande, vacuum difícil, queries limitadas por período/escopo, remoção em blocos, migração por unidades). **Não** por uma tabela "poder crescer".

- **Não haverá uma partição por mundo** — geraria milhares de partições e não equivale a sharding físico. O isolamento continua por `world_id`; quando necessário, o mundo inteiro é movido para outro banco/shard.
- **Particionamento temporal real** (`occurred_at`) é a primeira opção para dados técnicos append-only, permitindo retenção por `DROP PARTITION`. Tempo lógico (`occurred_game_at`) permanece indexado quando necessário para consultas de jogo, mas não governa a retenção física (mundos avançam em velocidades diferentes).
- **Fortes candidatas:** `matches.match_events`, `messaging.outbox_messages`, `messaging.inbox_messages`, `notifications.deliveries`, `audit.security_events`, `operations.job_execution_summaries`, entre outras.
- **Não particionar prematuramente:** entidades centrais (`players.players`, `clubs.clubs`, `contracts.player_contracts`, `worlds.worlds`, `identity.users`). O **ledger financeiro** exige análise específica antes de qualquer particionamento, sem romper a atomicidade da transação financeira.
- Partições futuras criadas antecipadamente; particionamento não substitui índices locais; UUIDv7 permanece a identidade global (a data da partição não vira parte conceitual da identidade). Quando uma constraint única física exigir a chave de partição, usa-se `PRIMARY KEY (partition_key, id)` preservando `id` como identidade global de domínio.
- **Partição default** somente com política clara (alertar, reclassificar, esvaziar) — nunca deixando dados esquecidos.
- **Subparticionamento** (ex.: `match_events` RANGE por mês real + HASH por `world_id`/`match_id`) apenas em volume realmente elevado e após medições — aumenta objetos, complexidade de migrations e risco de partições ausentes; não é implementado inicialmente.
- **Dados quentes e frios:** partições recentes no banco principal com índices completos; antigas com índices reduzidos ou storage de arquivo; histórico muito antigo exportado para R2 quando a categoria permitir. Registros oficiais não são removidos só por serem antigos — a política de retenção define o destino.

---

## Decisão 19.10 — Transações, concorrência, locks e consistência

**Decisão 19.10:** estratégia híbrida por tipo de operação. `READ COMMITTED` como padrão, optimistic concurrency nos agregados, row/advisory locks para seções críticas, SERIALIZABLE seletivo, SKIP LOCKED para claims e Process Managers para operações longas.

O sistema tem operações concorrentes (duas propostas pelo mesmo jogador, usuário e IA na mesma escalação, dois workers no mesmo evento, liquidação financeira simultânea, dois runtimes finalizando a mesma partida). Precisa impedir: atualizações perdidas, duplo processamento, saldo incorreto, contratos ativos duplicados, decisões incompatíveis, deadlocks recorrentes, transações abertas durante chamadas externas, e retry duplicando efeitos.

### Alternativas avaliadas

| Opção | Descrição | Veredito |
|-------|-----------|----------|
| **A** | Somente READ COMMITTED, sem versionamento nem locks. | Rejeitada — atualizações perdidas (dois processos leem 100, um grava 70, outro grava 50; o correto seria 20). |
| **B** | Tudo em SERIALIZABLE. | Rejeitada como padrão global — muitos aborts/retries sob carga, custo desnecessário, mascara ausência de versionamento; ainda exige idempotência e não substitui locks distribuídos. |
| **C** | Híbrida por tipo de operação. | **Escolhida.** |

Regra central: **usar a garantia de concorrência mais específica e barata que preserve corretamente a invariante.**

### Isolamento e limite transacional

- **`READ COMMITTED`** é o nível padrão, adequado a commands simples, inserts independentes, atualizações com controle de versão, claims com row lock e escrita da Outbox junto ao agregado. Não se depende do isolamento padrão sozinho para proteger agregados.
- **Sem transação automática por requisição.** A transação é aberta pelo caso de uso (Application Service define o limite; domínio valida/altera estado; repository persiste na transação recebida; Unit of Work faz commit/rollback; Outbox registra eventos na mesma transação) apenas quando há necessidade de atomicidade. Abrir transação em toda requisição HTTP manteria snapshots/locks desnecessários e pressionaria o pool.

### Optimistic concurrency

Agregados mutáveis têm `version INTEGER NOT NULL`. O update condiciona à versão esperada:

```sql
UPDATE transfers.transfer_negotiations
SET status = $1, version = version + 1, updated_at = transaction_timestamp()
WHERE id = $2 AND version = $3;
```

- **1 linha atualizada** → sucesso.
- **0 linhas** → versão mudou ou entidade não existe. O repository distingue entidade inexistente, conflito de concorrência e estado já alterado.

Conflito otimista **nunca** é sobrescrito silenciosamente removendo a condição de versão. Na divergência: recarregar estado, reavaliar intenção, decidir se pode repetir, retornar conflito quando a intenção deixou de ser válida. **Retry automático** só quando a operação é idempotente, a intenção ainda é válida após recarregar, não há efeitos externos executados, o número de tentativas é limitado e há jitter quando necessário.

### Locks

| Mecanismo | Uso |
|-----------|-----|
| **`SELECT FOR UPDATE`** | Bloquear linhas existentes em seções críticas curtas (liquidação entre contas, reserva financeira, consumo de recurso limitado). Lock termina no commit/rollback. |
| **Ordem global de locks** | Múltiplos recursos bloqueados em ordem determinística (ex.: contas por `account_id` crescente; ordem conceitual World → Competition → Club → Player → Contract → Negotiation → Financial accounts). Reduz deadlocks. Documentada por workflow crítico. |
| **`pg_advisory_xact_lock`** | Coordenação por chave de negócio sem linha única apropriada (criação única de temporada, fechamento de ciclo, publicação única de standings). Preferidos aos locks de sessão (liberados no fim da transação). Derivados de `namespace + identificador` via `TransactionLockManager` central e documentados (namespace, chave, invariante, ordem, timeout, teste). |
| **`SERIALIZABLE` seletivo** | Invariantes multi-registro que não podem ser protegidas por unique/exclusion/optimistic/row/advisory lock. Transações curtas, determinísticas, idempotentes, preparadas para retry, monitoradas à parte. |
| **`SKIP LOCKED`** | Claims de filas e agendas (Outbox, Scheduler, Inbox, backfills). Vários workers rodam a mesma query sem selecionar as mesmas linhas. |
| **`NOWAIT`** | Quando aguardar o lock não faz sentido (ação realtime com deadline, ferramenta de manutenção). O erro é traduzido para estado operacional, não exposto como erro SQL. |

**Locks não são mantidos durante chamadas externas.** Proibido bloquear e chamar Keycloak/R2/email/provider dentro da transação. Fluxo correto: transação valida, persiste intenção, grava Outbox, commit; após o commit, um worker executa a integração externa. Isso evita transações longas, esgotamento do pool e rollback de estado já decidido por falha externa.

**Lock de banco não substitui lease distribuído.** Processos longos (simulação, upload, relatório, temporada, execução de partida) usam estado persistente, lease, heartbeat, checkpoint e idempotência — não uma transação aberta. O claim admite duas estratégias: processamento curto inteiramente dentro da transação (operação local ao PostgreSQL, poucos milissegundos, poucas linhas, sem chamada externa) ou claim com lease persistido quando o processamento continua após o commit. Padrão de claim com lease: `PENDING → CLAIMED → PROCESSING → COMPLETED`, com `claimed_by_worker_id`, `claim_expires_at`, `attempt_count`; o worker faz o claim em transação curta, commita, processa e finaliza em nova transação; outro worker recupera se o lease expirar.

### Timeouts e transação ociosa

Cada runtime tem limites compatíveis com sua função (`statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`): API interativa com statement timeout curto, worker de relatório com timeout maior explícito, realtime com lock timeout muito curto. Não há timeout global único.

**Transação ociosa (`idle in transaction`) é tratada como falha** — segura locks, impede vacuum, mantém snapshots antigos, aumenta bloat, bloqueia migrations. Terá timeout específico, métrica, alerta, CorrelationId, identificação do serviço e diagnóstico de stack quando possível.

### Outbox, Inbox e idempotência

- **Outbox atômica:** mudança de domínio e evento correspondente são persistidos na mesma transação (`UPDATE aggregate` + `INSERT outbox_message` + `COMMIT`). Não se faz commit do agregado seguido de tentativa de publicar no NATS — uma falha entre as etapas mudaria o estado sem o evento.
- **Inbox e idempotência de consumo:** o consumer, em transação, tenta registrar a inbox key; se já existe, encerra como duplicado; senão aplica o efeito e grava eventos de saída. A constraint `UNIQUE (consumer_name, message_id)` é a proteção final contra processamento duplicado.
- **Idempotência de commands externos:** commands HTTP/mobile podem ter `idempotency_key` (escopo `userId + commandType + idempotencyKey`), registrada como `CommandExecution` com `payloadHash` e `status` (`PROCESSING`/`SUCCEEDED`/`FAILED_RETRYABLE`/`FAILED_FINAL`). A mesma chave com payload diferente é rejeitada. Não é apenas cache de resposta — protege o efeito de negócio (dois toques em "enviar proposta" não criam duas propostas) e o registro participa da transação da operação.
- **Constraints são a última defesa:** mesmo com locks e versionamento, o banco protege invariantes (um contrato ativo por jogador, uma participação por clube e competição, uma Inbox por consumer/messageId, um fechamento financeiro por obrigação e período, uma sequência por stream). Locks reduzem conflitos; constraints impedem que uma corrida imprevista produza estado inválido.

### Savepoints e transações aninhadas

Savepoints (`SAVEPOINT item_processing`) são usados em rotinas técnicas específicas (importação em lote, processamento de itens independentes) — nunca para ignorar falhas de domínio e prosseguir com transação incoerente. Em operações de negócio, uma invariante que falha causa rollback da unidade inteira. Domínio e repositories não abrem transações independentes: a Unit of Work fornece um `TransactionContext` explícito, sem transação implícita global invisível.

### Efeitos pré e pós-commit; sem 2PC

- **Pós-commit** (publicar no NATS, push, invalidar cache, atualizar Meilisearch) é originado pela Outbox — não por callbacks em memória como única garantia. Se o processo cair após o commit, a Outbox ainda executa.
- **Pré-commit** (ex.: reservar upload no R2): cria-se intenção interna → autorização temporária → cliente faz upload → valida objeto → transação confirma associação. Objetos abandonados são removidos por retenção.
- **Sem 2PC distribuído** entre PostgreSQL, NATS, Redis, R2, Keycloak, Meilisearch ou providers. Usam-se Outbox, Inbox, idempotência, Process Managers, compensações, reconciliação e estados intermediários explícitos. A consistência forte permanece dentro da transação PostgreSQL local.

### Classificação de erros e retry sem duplicar efeitos

| Categoria | Exemplos | Tratamento |
|-----------|----------|------------|
| **Não transitórios** | Unique violation de negócio, check constraint, FK inválida, estado incompatível, payload inválido. | Falha definitiva. |
| **Transitórios** | Serialization failure, deadlock detected, lock timeout (conforme operação), conexão temporariamente indisponível, failover. | Retry da transação inteira com backoff + jitter — nunca apenas a última query; toda a lógica é reexecutada sobre novo snapshot. |
| **Ambíguos** | Conexão perdida durante commit. | Não presumir se o commit ocorreu. Recuperar via idempotency key, commandId, consulta do estado, registro de execução e reconciliação. |

**Retry não pode duplicar efeitos.** Antes de repetir após falha ambígua: consultar `CommandExecution`, `aggregateVersion`, evento esperado e chave de negócio. Ex.: timeout após enviar proposta → cliente repete com a mesma idempotency key → a API retorna o resultado já persistido em vez de criar nova proposta. Deadlocks recorrentes não se resolvem só aumentando retries — exigem revisão da ordem de locks.

### Observabilidade e testes

**Observabilidade transacional:** duração de transações, tempo aguardando lock, conflitos otimistas, serialization failures, deadlocks, retries, lock timeouts, transações ociosas, claims recuperados após lease, commits ambíguos reconciliados. Dimensões controladas: `service`, `workflow`, `database`, `result`, `release`. Não se usam IDs individuais como labels de alta cardinalidade.

**Testes concorrentes** com PostgreSQL real via Testcontainers: duas aceitações concorrentes da mesma oferta, dois workers fechando a mesma temporada, dois débitos sobre o mesmo saldo, dois runtimes finalizando a mesma partida, claim paralelo com SKIP LOCKED, retry após deadlock, lease expirado assumido por outro worker, idempotency key repetida, mesma key com payload diferente. Mocks não validam locks e níveis de isolamento.

### Fluxos transacionais passo a passo

#### Aceitar proposta de transferência

1. Iniciar transação.
2. Carregar negociação com versão esperada.
3. Bloquear ou validar a proposta selecionada.
4. Confirmar que a negociação continua aberta.
5. Confirmar que nenhuma oferta já foi aceita.
6. Atualizar negociação com optimistic concurrency.
7. Criar acordo.
8. Registrar Outbox.
9. Commit.

A criação do contrato e a liquidação podem ocorrer na mesma transação (quando a regra exigir atomicidade imediata) ou por Process Manager (quando dependerem de etapas futuras), conforme o estado de negócio da transferência.

#### Transferência financeira entre contas (ledger balanceado)

1. Iniciar transação.
2. Ordenar `accountId`s.
3. Bloquear contas nessa ordem (`SELECT FOR UPDATE`).
4. Verificar moeda.
5. Verificar disponibilidade financeira.
6. Criar ledger transaction.
7. Criar débitos e créditos.
8. Validar balanceamento (soma de débitos = soma de créditos).
9. Atualizar projeções de saldo.
10. Gravar Outbox.
11. Commit.

Não há chamada externa dentro dessa transação.

#### Finalização de partida (resultado oficial único)

A finalização precisa impedir dois runtimes de oficializarem a mesma partida. Proteções: `runtimeEpoch` esperado, `matchSequence` final, `aggregateVersion`, status atual, unique result version, `finalStateHash`.

1. Iniciar transação.
2. Bloquear a partida ou validar versão esperada.
3. Confirmar runtime assignment ativo.
4. Confirmar `runtimeEpoch`.
5. Confirmar que não existe resultado oficial concorrente.
6. Persistir resultado e versão final.
7. Atualizar estado da partida.
8. Registrar eventos na Outbox.
9. Commit.

Um retry com o mesmo resultado é idempotente. Um resultado diferente para a mesma versão é incidente de integridade.

#### Processos longos (ex.: fechamento de temporada)

Não são representados por uma única transação. Máquina de estados: `REQUESTED → PREPARING → VALIDATING → FREEZING_INPUTS → CALCULATING → APPLYING_RESULTS → VERIFYING → COMPLETED`. Cada etapa tem transação curta, checkpoint, idempotência, versão, lease, eventos e possibilidade de retomada. O mundo pode permanecer pausado logicamente sem manter locks SQL durante todo o processo.

---

## Convenções de dados e tipos

Complementam as decisões acima com as convenções de modelagem aplicadas a todas as entidades persistentes.

### Identificadores e campos padrão

- **Identidade:** UUIDv7 (unicidade distribuída, ordenação temporal aproximada, geração fora do banco, migração entre clusters). Ver Decisão 19.8 para a chave de escopo `(world_id, id)`.
- **Identificadores públicos:** quando necessário, uma entidade combina UUID interno + código público curto + nome legível + slug **não autoritativo**.
- **Campos padrão** (quando aplicável): `id`, `world_id` (`gameWorldId`), `created_at`, `updated_at`, `version`, `deleted_at`.
- **Concorrência otimista** via `version` — ver Decisão 19.10.
- **Exclusão lógica** (`deleted_at`) apenas quando houver necessidade de recuperação, auditoria, retenção ou histórico. Nem toda tabela usa soft delete automaticamente.

### Valores monetários e numéricos

- **Dinheiro** em unidade mínima: `amount_minor: bigint` + `currency_code: string` (ex.: R$ 10,50 → `amount_minor = 1050`, `currency_code = BRL`). A moeda interna do mundo pode usar código próprio quando não representar moeda real.
- **Ponto flutuante é proibido** para dinheiro, percentuais contratuais, parcelas, pontos e saldos.
- **Percentuais** em pontos-base / inteiro escalado / decimal controlado, com a escala definida no contrato do valor.

### Tempo real vs. tempo do mundo

- **Datas reais** (login, criação, deployment, entrega de notificação, auditoria) em **UTC**.
- **Tempo do mundo** armazenado separadamente (`world_date`, `world_day`, `world_minute`, `world_tick`, `season_id`). Uma entidade pode carregar ambos: `occurred_at_real` e `occurred_at_world`.
- A retenção física segue o tempo real, não o tempo lógico (ver Decisão 19.9).

### JSONB e relações

- **JSONB** para payloads de eventos, snapshots, metadados, configurações versionadas, resultados de simulação e dados extensíveis. **Não** substitui indiscriminadamente relações centrais.
- Contratos, participantes, proprietários, jogadores inscritos, parcelas e títulos são modelados **relacionalmente**.
- **SQL direto** é permitido (locks, `FOR UPDATE SKIP LOCKED`, particionamento, consultas analíticas, operações em lote, CTEs, extensões PostgreSQL), sempre encapsulado na infraestrutura e nunca concatenando entrada de usuário.

---

## Mensageria durável (RabbitMQ)

A mensageria transporta eventos de domínio, commands assíncronos, jobs distribuídos, notificações, simulação, rebuilds e integrações internas. A garantia é **`AT_LEAST_ONCE_DELIVERY`** — o sistema **não** depende de *exactly once*; a idempotência de consumo (Inbox, ver Decisão 19.10) é a proteção final contra efeitos duplicados.

> **Pendência (broker):** o chat de UX (Bloco 25) especifica **RabbitMQ**; a fonte `arquitetura-jogo.md` (Decisão 19.10) descreve a publicação pós-commit sobre **NATS**. A modelagem de Outbox/Inbox é independente do broker; ratificar o broker oficial junto à pendência de mensageria em `./00-arquitetura-geral.md`.

- **Exchanges recomendadas:** `domain.events`, `application.commands`, `simulation.commands`, `notifications.events`, `operations.jobs`, `dead.letters`.
- **Routing keys** por evento, ex.: `match.started`, `match.command.submitted`, `transfer.completed`, `contract.expired`, `world.day.advanced`, `notification.requested`.
- **Filas críticas** duráveis, com mensagens persistentes, dead letter, limites e monitoramento.
- **Evolução:** nó único com volume persistente na primeira infraestrutura; cluster com **filas quorum** depois.
- **Ordenação:** eventos de um agregado usam `aggregate_version`; eventos de um mundo usam `world_sequence`. Evento fora de ordem faz o consumidor aguardar a versão anterior, reenfileirar, solicitar snapshot, marcar inconsistência ou reconstruir a projeção.

---

## Cache e dados efêmeros (Redis)

O Redis serve cache, sessões temporárias, rate limiting, presença, adapter de Socket.IO, locks não críticos e chaves de curta duração. **Nunca é fonte definitiva** para saldo, contrato, resultado, propriedade de jogador, inscrição, título, pagamento ou prazo oficial.

- **Persistência AOF** na implantação inicial; ainda assim, a perda total do Redis deve ser recuperável a partir do PostgreSQL (perde-se cache/presença, não dados de mundo).
- **Anatomia de cada cache:** chave, escopo de mundo, TTL, versão, estratégia de invalidação e fonte oficial. Alvos típicos: perfil público, tabela, calendário, resumo de clube, configurações, permissões estáveis.
- **Invalidação** por evento, versão, TTL, operação administrativa ou rebuild. Quando cache e projeção discordam, prevalece a projeção oficial/banco e o cache é invalidado.
- **Cache stampede** controlado por locks curtos, TTL aleatório, revalidação antecipada, *stale-while-revalidate* e limite de concorrência.
- **Locks críticos** preferem row lock / advisory lock do PostgreSQL, lease persistido e restrição única — o Redis **não** é a única garantia para contratos, finanças ou transferências (ver Decisão 19.10).

---

## Agendador persistente e relógio do mundo

Prazos oficiais **sempre** são persistidos no PostgreSQL — timers em memória seriam perdidos em restart, deployment, falha, migração ou escalonamento.

- **Tarefas agendadas** (`scheduled_task_id`, `world_id`, `task_type`, `due_at_world`, `due_at_real`, `status`, `payload`, `priority`, `attempt_count`, `lease_owner`, `lease_expires_at`, `last_failure`). Workers reivindicam lotes vencidos com `FOR UPDATE SKIP LOCKED` (ver Decisão 19.9).
- **Relógio do mundo** (`world_clock_id`, `current_world_time`, `status`, `processing_lease`, `last_processed_at`, `next_scheduled_at`, `version`). O avanço segue: adquire lease → verifica estado → executa etapa → registra checkpoint → publica eventos → atualiza relógio → libera lease. Apenas o detentor do lease avança o mundo; um mundo atrasado processa as etapas pendentes em ordem, com carga limitada, sem pular etapas obrigatórias.
- **Runtime de partida:** o estado em andamento (`match_runtime_id`, `status`, `current_simulation_time`, `last_event_sequence`, `active_worker_lease`, `checkpoint_reference`, `heartbeat_at`) é separado do resultado oficial final. Cada partida tem um único actor lógico; checkpoints periódicos (após gol, cartão relevante, substituição, intervalo, fim, desligamento) permitem que outro worker assuma um lease expirado, carregue o último checkpoint e continue sem duplicar efeitos. A conclusão persiste atomicamente resultado, eventos, estatísticas, estados de jogador, suspensões, consequências e Outbox, passando de `FINISHED_PENDING_VALIDATION` a `OFFICIAL`. A finalização com resultado oficial único está detalhada na Decisão 19.10.

### Catálogo de jobs recorrentes (`task_type`)

Os tipos de tarefa agendada naturais do jogo — cada um é um `task_type` do agendador acima:

| Job | Responsabilidade |
| --- | --- |
| `world:daily-tick` | Avanço diário do relógio do mundo |
| `season:check-start-end` | Início/fim de temporada |
| `competition:generate-fixtures` | Geração de tabelas/calendário |
| `match:start-scheduled` · `match:simulate-live` · `match:simulate-offline` · `match:finish` | Ciclo de vida das partidas (agendada → ao vivo/offline → finalização) |
| `training:process-results` · `medical:process-recovery` | Treino e recuperação médica |
| `finance:pay-wages` · `economy:rebalance` · `contracts:check-expiration` | Ciclos financeiro, econômico e contratual |
| `players:process-aging` · `players:process-retirement` · `scouting:process-missions` | Envelhecimento, aposentadoria e olheiros |
| `notifications:cleanup` · `narratives:update` | Manutenção de notificações e narrativa |

---

## CQRS pragmático, read models e projeções

O sistema separa **logicamente** commands e queries, mas **não** exige bancos diferentes inicialmente (leitura e escrita no mesmo cluster, com limites distintos; réplica de leitura só no futuro, e nunca para commands que precisam do estado mais recente).

- **Commands** passam por aplicação → autorização → domínio → repositório → transação → Outbox.
- **Queries** leem tabelas de domínio, projeções, views, materialized views ou cache.
- **Projeções** são atualizadas por eventos e rastreiam `projection_name`, `projection_version`, `last_processed_event`, `rebuild_status`. Podem ser **descartadas e reconstruídas** sem alterar o fato-base (ver Decisão 19.8: projeções não têm FKs fortes).
- **Rebuild com troca atômica:** nova versão é construída → validada → o alias/ponteiro ativo é trocado → a versão anterior é removida depois. Uma projeção incorreta é reconstruída a partir dos eventos e fatos oficiais.
- **Event sourcing híbrido:** estado relacional atual + log imutável de eventos relevantes + Outbox + snapshots históricos — **não** event sourcing completo para todos os agregados. Eventos técnicos (ex.: `CACHE_INVALIDATED`) diferenciam-se de eventos de domínio (`PLAYER_TRANSFER_COMPLETED`) e históricos (`CLUB_WON_FIRST_NATIONAL_TITLE`). Eventos competitivos e financeiros essenciais são preservados enquanto o mundo existir; eventos técnicos de baixa relevância têm retenção menor e podem ser particionados, compactados ou exportados para R2 (ver Decisão 19.9).

---

## Sagas e process managers

Processos longos são coordenados por **saga / process manager**, nunca por transação distribuída de duas fases (**sem 2PC**, ver Decisão 19.10). Exemplos: transferência, contratação, construção, transição de temporada, entrada de usuário, restauração, licenciamento.

- **Estados da saga:** `CREATED`, `RUNNING`, `WAITING`, `COMPENSATING`, `COMPLETED`, `FAILED`, `MANUAL_REVIEW`.
- **Compensação:** quando uma etapa posterior falha, as etapas já confirmadas permanecem registradas, a saga aplica compensação (libera reservas, corrige estados) e o usuário recebe explicação.
- **Exemplo (transferência):** reservar orçamento → aceitar proposta → negociar contrato → realizar exame → registrar jogador → liquidar valores → concluir. Uma falha no registro pode manter o acordo pendente e impedir a liquidação final, conforme as regras.

O estado da saga é persistido (`process_manager_id`, `process_type`, `subject_type`, `subject_id`, `status`, `current_step`, `state_payload`, `completed_steps`, `compensation_steps`, `waiting_for_event_types`, `version`). O detalhamento em `./02-modelo-de-dados.md`.

---

## Busca, analytics e arquivos

- **Busca:** a primeira versão usa **PostgreSQL Full Text Search + índices trigram**. Um motor externo (Meilisearch, OpenSearch) só entra quando volume, latência, relevância e operação justificarem. A busca **não é autoritativa** — apenas localiza a entidade; a abertura carrega sempre o estado oficial.
- **Analytics:** na primeira fase, PostgreSQL, views, materialized views, projeções e exportações. Banco analítico (ex.: ClickHouse) só quando o volume de telemetria/histórico justificar.
- **Arquivos (Cloudflare R2):** o binário fica no R2; o PostgreSQL guarda apenas metadados (`file_id`, `owner_type`, `owner_id`, `bucket`, `object_key`, `content_type`, `size`, `checksum`, `visibility`, `status`, `created_at`, …). O upload é direto ao R2 via URL pré-assinada, confirmado pelo cliente e validado por worker (tipo, tamanho, checksum, inspeção, quarentena); uploads não confirmados são limpos por job. Arquivos privados usam URL temporária com verificação de permissão e expiração; chaves de objeto evitam nomes previsíveis com informação privada. A exclusão lógica precede a física, respeitando retenção de histórico/auditoria.
- **Backups:** PostgreSQL com **WAL-G** para destino S3-compatível no R2 (WAL contínuo + base diário + longa retenção semanal + teste de restauração + checksum + criptografia). Backups não ficam apenas no mesmo host do banco. A recuperação de um mundo **não** depende de backup de Redis ou RabbitMQ — reconstrói-se a partir do PostgreSQL, Outbox e jobs persistidos.

> **Pendência (busca):** a Decisão 19.9 assume que "a busca pública fica no Meilisearch", enquanto o Bloco 25 de UX adota PostgreSQL FTS + trigram como padrão inicial, com motor externo apenas sob necessidade. Ratificar a estratégia oficial de busca.

---

## Registro de decisões

| ADR | Tema | Resolução |
|-----|------|-----------|
| **19.7** | Schemas por domínio | Schemas PostgreSQL separados por domínio; snake_case; ownership único por tabela; mapeamento explícito no Prisma. |
| **19.8** | Foreign keys e isolamento por mundo | FKs fortes no mesmo banco, escopo composto por `world_id`, `ON DELETE RESTRICT` por padrão, referências lógicas apenas para projeções/histórico/limites físicos (Opção C). |
| **19.9** | Índices, paginação e particionamento | Índices orientados por access patterns, paginação por cursor, particionamento só com volume/retenção/manutenção comprovados (Opção C). |
| **19.10** | Transações e concorrência | Estratégia híbrida: READ COMMITTED padrão, optimistic concurrency, row/advisory locks, SERIALIZABLE seletivo, SKIP LOCKED, Process Managers (Opção C). |

O registro central e transversal de todas as decisões do projeto vive em [`../99-decisoes/registro-de-decisoes.md`](../99-decisoes/registro-de-decisoes.md).
