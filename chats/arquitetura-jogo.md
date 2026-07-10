Pensou por 10s

Fechado.

Decisão 19.7: schemas PostgreSQL separados por domínio e capacidade técnica, nomes físicos em snake_case, ownership único por tabela e mapeamento explícito no Prisma.

Bloco 19.8 — Foreign keys, isolamento por mundo e relações entre domínios

O uso de UUIDv7 garante unicidade global, mas não garante que duas entidades relacionadas pertençam ao mesmo mundo.

Exemplo de estado tecnicamente possível, porém inválido:

Contrato:
world_id = World A
player_id = jogador do World B
club_id = clube do World A

Uma FK simples validaria apenas que o jogador existe:

FOREIGN KEY (player_id)
REFERENCES players.players(id)

Ela não impediria a relação entre mundos diferentes.

Também precisamos preparar o banco para:

Múltiplos mundos na mesma instância.
Migração futura de mundos entre shards.
Relações entre schemas.
Registros históricos imutáveis.
Projeções reconstruíveis.
Imports e backfills.
Processos transacionais que criam várias entidades.
Separação física futura de alguns domínios.
Opção A — Não usar foreign keys

A aplicação validaria todas as relações.

Repository
→ consulta entidade relacionada
→ verifica worldId
→ persiste referência
Vantagens
Inserts e migrations mais simples.
Menor acoplamento físico entre schemas.
Facilita separar bancos futuramente.
Evita alguns locks associados a FKs.
Imports podem ser executados em qualquer ordem.
Problemas

Bugs, scripts, migrations e processos concorrentes poderiam gerar:

Contratos apontando para jogadores inexistentes.
Transferências ligando clubes de mundos diferentes.
Eventos apontando para partidas removidas.
Ledger entries sem conta válida.
Lineups com jogador de outro clube.
Dados órfãos após falhas parciais.

A aplicação não é a única escritora do banco ao longo da vida do sistema. Também existirão migrations, backfills, ferramentas administrativas e processos de recuperação.

Não recomendo.

Opção B — FKs simples em todas as relações

Exemplo:

FOREIGN KEY (player_id)
REFERENCES players.players(id)
Vantagens
Garante existência.
Modelagem conhecida.
Boa integração com Prisma.
Impede grande parte dos registros órfãos.
Facilita navegação e administração.
Problemas

A relação ainda poderia atravessar mundos:

contract.world_id = A
player.world_id = B

Além disso:

Nem toda referência histórica deve exigir que a entidade atual permaneça.
Projeções não devem bloquear exclusões e reconstruções.
FKs indiscriminadas dificultariam uma futura separação física.
Cascatas automáticas poderiam atravessar domínios indevidamente.

É melhor que ausência de FKs, mas insuficiente.

Opção C — FKs fortes com escopo composto e exceções explícitas
Entidades oficiais no mesmo banco
→ foreign keys reais.

Relações pertencentes a um mundo
→ foreign keys compostas com world_id.

Projeções e caches
→ referências lógicas reconstruíveis.

Integrações externas
→ referências externas sem FK interna ao provider.

Relações entre bancos ou shards
→ referência lógica validada pela aplicação.

ON DELETE
→ RESTRICT por padrão.

Constraints adiáveis
→ somente quando o fluxo transacional exigir.
Minha recomendação: Opção C

O banco garantirá tanto a existência da entidade quanto a consistência do mundo sempre que a relação estiver dentro da mesma unidade física.

1. Chave primária global e chave de escopo

As entidades continuarão usando UUIDv7 como chave primária:

CREATE TABLE players.players (
  id UUID PRIMARY KEY DEFAULT uuidv7(),

  world_id UUID NOT NULL,

  -- outros campos

  CONSTRAINT uq_players_world_id_id
    UNIQUE (world_id, id)
);

Embora id já seja globalmente único, o par:

world_id + id

será disponibilizado como chave candidata para relações que precisam comprovar o escopo.

A constraint composta não substitui a chave primária.

id
→ identidade global.

world_id + id
→ identidade validada dentro do escopo do mundo.
2. Foreign key composta por mundo

Exemplo de contrato:

CREATE TABLE contracts.player_contracts (
  id UUID PRIMARY KEY DEFAULT uuidv7(),

  world_id UUID NOT NULL,
  player_id UUID NOT NULL,
  club_id UUID NOT NULL,

  -- demais campos

  CONSTRAINT fk_player_contracts_player_world
    FOREIGN KEY (world_id, player_id)
    REFERENCES players.players (
      world_id,
      id
    )
    ON DELETE RESTRICT,

  CONSTRAINT fk_player_contracts_club_world
    FOREIGN KEY (world_id, club_id)
    REFERENCES clubs.clubs (
      world_id,
      id
    )
    ON DELETE RESTRICT
);

Esse modelo rejeita:

world_id do contrato = A
player_id pertencente ao mundo = B

mesmo que o jogador exista.

3. Ordem padronizada das chaves compostas

Usaremos:

(world_id, entity_id)

e não alternaremos entre:

(entity_id, world_id)

em diferentes tabelas.

Padrão:

UNIQUE (world_id, id)

Referência:

FOREIGN KEY (world_id, player_id)
REFERENCES players.players (world_id, id)

Isso torna:

Migrations previsíveis.
Índices reutilizáveis.
Joins consistentes.
Geração de schema mais simples.
Revisão arquitetural mais clara.
4. Entidades globais

Nem toda entidade pertence a um mundo.

Exemplos:

Usuário humano
País
Moeda
Idioma
Release da plataforma
Feature flag global
Operador administrativo

Essas relações utilizarão FK simples:

FOREIGN KEY (user_id)
REFERENCES identity.users(id)

Uma participação em mundo combina os dois conceitos:

CREATE TABLE identity.world_memberships (
  id UUID PRIMARY KEY DEFAULT uuidv7(),

  world_id UUID NOT NULL,
  user_id UUID NOT NULL,

  status VARCHAR(32) NOT NULL,

  CONSTRAINT fk_world_memberships_world
    FOREIGN KEY (world_id)
    REFERENCES worlds.worlds(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_world_memberships_user
    FOREIGN KEY (user_id)
    REFERENCES identity.users(id)
    ON DELETE RESTRICT,

  CONSTRAINT uq_world_memberships_world_user
    UNIQUE (world_id, user_id)
);
5. world_id não será uma FK decorativa

Toda tabela world-scoped deverá responder:

A entidade realmente pertence a um mundo?
A relação com o mundo está protegida?
As referências relacionadas validam o mesmo world_id?
O índice começa por world_id nas consultas mais importantes?
O registro poderá ser migrado junto com o mundo?
Há algum relacionamento que permita atravessar mundos?

Não aceitaremos apenas:

world_id UUID NOT NULL

sem nenhuma proteção sobre as demais relações.

6. FKs entre schemas serão permitidas

Exemplo:

contracts.player_contracts
→ players.players
→ clubs.clubs

As FKs físicas entre schemas serão usadas quando:

As tabelas estiverem no mesmo banco lógico.
A relação for oficial.
A existência for uma invariante.
O ciclo de vida for compatível.
A futura separação não for imediata.
A integridade justificar o acoplamento físico.

Schemas separam ownership, mas não transformam cada domínio em um banco independente.

7. FK não concede ownership

O domínio de contratos pode possuir uma FK para jogador:

contracts.player_contracts.player_id
→ players.players.id

Isso significa:

Um contrato não pode referenciar um jogador inexistente ou de outro mundo.

Não significa:

O domínio de contratos pode atualizar o jogador.

Ownership de escrita continuará protegido por:

Repositories.
Packages.
Dependency rules.
Commands.
Permissões de banco.
Revisão de migrations.
8. Relações transacionais entre domínios

Alguns comandos precisarão alterar mais de um domínio dentro da mesma transação PostgreSQL.

Exemplo de registro definitivo de transferência:

Transfers
→ confirma o acordo.

Contracts
→ encerra contrato anterior e cria o novo.

Finance
→ cria obrigações e lançamentos.

Players
→ atualiza vínculo esportivo atual.

A coordenação será feita pela camada de aplicação e Unit of Work.

As FKs garantem integridade estrutural, mas não substituem:

Invariantes de domínio.
Ordem das operações.
Locks.
Optimistic concurrency.
Process Managers.
Eventos de domínio.
9. Quando não criar FK física

Uma referência poderá ser lógica quando estiver em uma destas categorias.

Destino em outro banco

Exemplo futuro:

Game Shard
→ referencia usuário no Identity Database

PostgreSQL não oferece FK normal entre bancos.

Persistiremos:

user_id
identity_source

e validaremos por contrato de aplicação.

Provedor externo
external_provider
external_id

O provider não é uma tabela interna confiável.

Documento histórico autocontido

Um evento poderá preservar um ID que já não possui entidade operacional acessível.

Projeção reconstruível

Read models podem armazenar IDs para navegação sem bloquear rebuilds.

Referência polimórfica controlada

Casos como:

resource_type
resource_id

não conseguem usar uma FK tradicional para várias tabelas.

Essas referências precisarão de validação e catálogo explícitos.

10. Projeções não terão FKs fortes por padrão

Exemplo:

projections.club_dashboards
projections.competition_tables
projections.observed_player_search

Essas tabelas são:

Derivadas.
Descartáveis.
Reconstruíveis.
Eventualmente consistentes.

Uma FK para todas as entidades de origem poderia:

Impedir rebuilds.
Bloquear purges.
Aumentar custo de escrita.
Criar acoplamento desnecessário.
Fazer uma projeção atrasada bloquear o domínio oficial.

As projeções poderão conter:

world_id
club_id
player_id
source_version

sem que todas sejam FKs físicas.

A consistência será garantida pelo Projection Worker e pelos verificadores.

11. Read models críticos podem ter constraints locais

A ausência de FK externa não significa ausência total de constraints.

Exemplo:

CREATE TABLE projections.club_dashboards (
  world_id UUID NOT NULL,
  club_id UUID NOT NULL,

  projection_version BIGINT NOT NULL,
  payload JSONB NOT NULL,

  PRIMARY KEY (world_id, club_id),

  CONSTRAINT ck_club_dashboards_version_positive
    CHECK (projection_version >= 0)
);

A projeção garante sua estrutura local, mas continua reconstruível.

12. Eventos e referências históricas

Um evento como:

player.transferred.v1

pode carregar:

playerId
fromClubId
toClubId
contractId

O registro histórico do evento não precisa obrigatoriamente possuir FKs para todas essas entidades.

Motivos:

O evento é imutável.
Pode sobreviver à anonimização ou arquivamento.
Pode ser importado.
Precisa preservar exatamente a referência original.
Uma FK poderia impedir processos legítimos de retenção.

A Outbox poderá possuir FK para o agregado enquanto ainda estiver operacional, mas o event store histórico ou arquivo de auditoria pode usar referências lógicas.

13. Relações polimórficas

Exemplo:

audit_entry
→ pode se referir a Club, Player, Match, Contract ou User.

Modelo:

resource_type VARCHAR(80) NOT NULL,
resource_id UUID NOT NULL

Não haverá uma FK genérica.

Para evitar referências arbitrárias:

resource_type será enum/código controlado.
O schema do evento será versionado.
A aplicação validará o recurso na criação.
O registro poderá guardar world_id.
Testes verificarão resolvers.
Ferramentas administrativas tratarão recurso ausente.

Não criaremos uma tabela universal entities somente para permitir essa FK.

14. Relações um-para-um

Uma relação 1:1 será garantida por FK única.

Exemplo:

CREATE TABLE matches.match_results (
  id UUID PRIMARY KEY DEFAULT uuidv7(),

  world_id UUID NOT NULL,
  match_id UUID NOT NULL,

  -- resultado

  CONSTRAINT uq_match_results_match
    UNIQUE (world_id, match_id),

  CONSTRAINT fk_match_results_match_world
    FOREIGN KEY (world_id, match_id)
    REFERENCES matches.matches (
      world_id,
      id
    )
    ON DELETE RESTRICT
);

Não dependeremos apenas da aplicação para impedir dois resultados oficiais ativos.

Quando houver versões de resultado, a unicidade será adaptada ao lifecycle.

15. Relações muitos-para-muitos

Associações simples usarão chave composta.

Exemplo:

CREATE TABLE competitions.participants (
  world_id UUID NOT NULL,
  competition_edition_id UUID NOT NULL,
  club_id UUID NOT NULL,

  registration_status VARCHAR(32) NOT NULL,

  PRIMARY KEY (
    world_id,
    competition_edition_id,
    club_id
  ),

  CONSTRAINT fk_participants_edition_world
    FOREIGN KEY (
      world_id,
      competition_edition_id
    )
    REFERENCES competitions.competition_editions (
      world_id,
      id
    )
    ON DELETE RESTRICT,

  CONSTRAINT fk_participants_club_world
    FOREIGN KEY (world_id, club_id)
    REFERENCES clubs.clubs (
      world_id,
      id
    )
    ON DELETE RESTRICT
);

Se a participação tiver lifecycle complexo, poderá receber UUID próprio além da chave natural.

16. Chaves naturais continuarão protegidas

UUID não substitui unicidade de negócio.

Exemplos:

UNIQUE (
  world_id,
  competition_edition_id,
  club_id
)
UNIQUE (
  world_id,
  user_id
)
UNIQUE (
  world_id,
  match_id,
  player_id,
  lineup_role
)

A escolha exata depende da invariante.

Não criaremos UUIDs para permitir duplicatas que o domínio considera impossíveis.

17. ON DELETE RESTRICT como padrão

Para entidades oficiais:

ON DELETE RESTRICT

ou o comportamento equivalente NO ACTION.

Exemplos:

Player com contratos
Clube com partidas
Partida com resultado
Conta com ledger entries
Competition edition com participantes

Uma tentativa de remoção física será recusada enquanto existirem dependências.

Isso protege contra scripts e operações administrativas incorretas.

18. Quando usar ON DELETE CASCADE

Somente quando o filho:

Não possui significado independente.
Não é histórico.
Não precisa sobreviver ao pai.
Não é referenciado externamente.
Pode ser recriado ou descartado.
Pertence exclusivamente ao agregado.

Exemplos possíveis:

Upload intent
→ multipart parts temporárias.

Draft não publicado
→ linhas internas do draft.

Game Session
→ nonces efêmeros daquela sessão.

Feature flag draft
→ regras ainda não publicadas.

Mesmo nesses casos, a cascata precisará ser declarada e revisada.

19. Quando usar ON DELETE SET NULL

Será raro.

Permitido apenas quando a ausência posterior tiver significado válido.

Exemplo potencial:

Relatório técnico gerado por uma sessão administrativa já removida.

Ainda assim, frequentemente será preferível preservar:

created_by_actor_reference

ou um tombstone.

Não usaremos SET NULL quando a relação for essencial para interpretar o registro.

20. FKs circulares

Relações circulares podem ocorrer:

Competition Edition
→ currentStageId

Competition Stage
→ competitionEditionId

Opções preferidas:

Remover a redundância.
Inserir em ordem com coluna temporariamente nula quando semanticamente válida.
Criar entidade de estado separada.
Usar constraint adiável apenas quando necessário.

Não usaremos DEFERRABLE automaticamente para todas as FKs.

21. Constraints DEFERRABLE

Uma FK ou unique constraint poderá ser:

DEFERRABLE INITIALLY DEFERRED

quando a invariante precisar ser validada somente no commit.

Exemplos possíveis:

Troca atômica de posição entre dois registros.
Reorganização de ordem única.
Importação transacional de grafo.
Substituição de vínculo 1:1 sem estado intermediário válido.

Problemas do uso indiscriminado:

Erros aparecem apenas no commit.
Diagnóstico fica mais difícil.
Transações mantêm estados temporariamente inválidos.
Pode esconder modelagem ruim.

Política:

Constraints imediatas por padrão.
Deferrable somente com caso documentado e teste transacional.
22. Exclusão mútua e períodos sobrepostos

Algumas invariantes não são FKs, mas dependem de relações.

Exemplo:

Um jogador não pode ter dois contratos ativos incompatíveis no mesmo período.

Podemos usar exclusion constraints:

EXCLUDE USING gist (
  world_id WITH =,
  player_id WITH =,
  contract_period WITH &&
)
WHERE (status = 'ACTIVE');

Ou uma combinação de:

Locks.
Consultas de conflito.
Constraints auxiliares.
Índices únicos parciais.

A estratégia será específica por agregado.

Não tentaremos resolver todas as regras apenas com FKs.

23. Migrações adicionando FKs

Em tabelas grandes, a criação imediata pode gerar validação pesada.

Estratégia:

ALTER TABLE contracts.player_contracts
ADD CONSTRAINT fk_player_contracts_player_world
FOREIGN KEY (world_id, player_id)
REFERENCES players.players (world_id, id)
NOT VALID;

Depois:

ALTER TABLE contracts.player_contracts
VALIDATE CONSTRAINT fk_player_contracts_player_world;

Fluxo:

1. Criar suporte de índice.
2. Adicionar FK como NOT VALID.
3. Novas escritas já respeitam a FK.
4. Verificar registros antigos.
5. Corrigir divergências.
6. Validar a constraint.

A constraint não permanecerá NOT VALID indefinidamente sem plano registrado.

24. Índices de suporte para FKs

O PostgreSQL cria índice para PRIMARY KEY e UNIQUE, mas não cria automaticamente índice na coluna filha de toda FK.

Portanto, relações usadas em:

Joins.
Verificação de delete.
Busca por pai.
Processamento por mundo.

terão índices apropriados.

Exemplo:

CREATE INDEX idx_player_contracts_world_player
ON contracts.player_contracts (
  world_id,
  player_id
);

A criação dependerá dos padrões de consulta e do volume.

Não criaremos todos os índices possíveis sem análise, mas FKs importantes terão suporte físico planejado.

25. FKs e ordem dos índices

Para uma FK:

(world_id, player_id)

o índice usual será:

(world_id, player_id)

Isso favorece:

Consulta por mundo e jogador.
Migração por mundo.
Purge por escopo.
Verificação de relacionamentos.
Futura partição por mundo ou shard.

Um índice apenas em player_id poderá ser adicional se houver consultas globais legítimas.

26. FKs em tabelas particionadas

Quando uma tabela de alto volume for particionada, as FKs precisarão ser avaliadas conforme:

Coluna de particionamento.
Volume de escrita.
Custo de validação.
Estratégia de retenção.
Compatibilidade da versão do PostgreSQL.
Necessidade de referência reversa.

Não removeremos automaticamente todas as FKs apenas porque a tabela é grande.

Particionamento será tratado no subbloco específico.

27. Preparação para shards

Enquanto os mundos estiverem no mesmo banco:

FKs físicas completas.

Quando um mundo for movido para um shard:

World Registry central
→ conhece shard atual.

Banco do shard
→ contém todas as tabelas world-scoped daquele mundo.

Entidades do mundo
→ continuam com os mesmos UUIDs.

Dentro de cada shard, as FKs compostas por world_id continuarão válidas.

Entre banco central e shard:

Não existe FK física.

Exemplos:

Shard → user_id global
Shard → release_id central
Shard → identity_subject central

Essas relações usarão:

Contratos versionados.
Caches controlados.
Replicação de referências quando necessária.
Verificadores de integridade.
Processos de reconciliação.
28. Não projetar o banco atual como se já estivesse distribuído

Evitar FKs agora apenas porque talvez exista sharding no futuro causaria perda de integridade desde o início.

A política será:

Usar a proteção mais forte disponível na unidade física atual, preservando adapters e boundaries que permitam substituir a FK por contrato quando a separação física realmente ocorrer.

A migration para shard incluirá a mudança explícita de garantias.

29. Registro de referências sem FK

Toda referência lógica relevante deverá ser classificada.

Exemplo de catálogo:

operations.deployment_records.release_id:
  target: release-registry
  enforcement: logical
  reason: external-control-plane
  validator: deployment-integrity-checker

Campos exigidos:

Destino conceitual.
Motivo da ausência de FK.
Owner da validação.
Frequência de reconciliação.
Comportamento quando o destino não existe.
Política de retenção.

Uma coluna terminada em _id sem FK nem justificativa será considerada suspeita.

30. Prisma e relações compostas

Modelo conceitual:

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

  @@index(
    [worldId, playerId],
    map: "idx_player_contracts_world_player"
  )

  @@map("player_contracts")
  @@schema("contracts")
}

O SQL gerado será revisado, especialmente em:

Constraints compostas.
Nomes físicos.
ON DELETE.
Índices.
Deferrability.
Exclusion constraints.

Recursos não expressáveis pelo Prisma serão implementados por migration SQL personalizada.

31. Relações Prisma não serão carregadas indiscriminadamente

Mesmo com relações declaradas, repositories não farão:

include: {
  player: true,
  club: true,
  competition: true,
  contracts: true,
  finances: true,
}

sem necessidade específica.

As relações servem para:

Integridade.
Queries orientadas ao caso de uso.
Mapeamento controlado.

Não para reconstruir todo o mundo como um grafo em memória.

32. Integridade na importação

Imports seguirão um manifesto de dependências.

Exemplo:

1. World.
2. Clubs e Players.
3. Contracts.
4. Competitions.
5. Matches.
6. Finance.
7. Históricos e projeções.

Quando constraints adiáveis forem necessárias, serão ativadas apenas dentro da transação de importação.

Não desabilitaremos globalmente todas as FKs e depois presumiremos que os dados estão corretos.

Após o import:

Constraints são validadas.
Contagens são reconciliadas.
Checksums são comparados.
Relações sem destino são relatadas.
Projeções são reconstruídas.
33. Ferramentas de integridade referencial

Além das FKs, teremos verificadores para relações lógicas:

Referência de usuário entre shard e Identity.
StoredObjectId versus Cloudflare R2.
Documento do Meilisearch versus projeção.
Evento histórico versus aggregate reference.
Deployment versus release manifest.

Resultados:

HEALTHY
MISSING_TARGET
SCOPE_MISMATCH
STALE_REFERENCE
DUPLICATED_REFERENCE
UNRESOLVABLE

Esses verificadores não substituem FKs onde elas são possíveis.

Regras propostas
Entidades oficiais no mesmo banco usarão foreign keys.
Relações world-scoped utilizarão world_id na FK quando precisarem garantir isolamento.
O padrão das chaves compostas será (world_id, entity_id).
Entidades world-scoped terão UNIQUE (world_id, id) quando referenciadas dessa forma.
UUID global não substituirá a validação de escopo.
FKs entre schemas serão permitidas.
FK não concede ownership de escrita ao domínio consumidor.
Projeções reconstruíveis não terão FKs externas fortes por padrão.
Referências históricas poderão ser lógicas quando precisarem sobreviver ao lifecycle operacional.
Referências entre bancos ou shards serão lógicas e reconciliadas.
ON DELETE RESTRICT será o padrão.
CASCADE será reservado a filhos estritamente pertencentes e descartáveis.
SET NULL será raro e exigirá ausência semanticamente válida.
Constraints serão imediatas por padrão.
Constraints DEFERRABLE exigirão caso documentado e testes.
Relações muitos-para-muitos manterão unicidade natural.
FKs em tabelas grandes poderão ser adicionadas com NOT VALID e validadas posteriormente.
Constraints não permanecerão sem validação indefinidamente.
Índices de suporte serão definidos conforme a FK e o padrão de consulta.
FKs físicas serão preservadas até que exista separação real de banco.
Toda coluna _id sem FK física precisará de justificativa.
Imports preservarão e validarão integridade referencial.
Verificadores cobrirão referências que não possam usar FKs.
Recursos não suportados pelo Prisma serão implementados em migrations SQL controladas.
Decisão 19.8

A. Não usar foreign keys; todas as relações serão validadas pela aplicação.

B. Usar apenas FKs simples por ID, deixando a consistência do world_id para a aplicação.

C. Usar FKs fortes no mesmo banco, com chaves compostas por world_id para isolamento, RESTRICT por padrão e referências lógicas somente para projeções, históricos ou limites físicos entre bancos.

Minha recomendação é C.

c
Pensou por 12s

Fechado.

Decisão 19.8: relações oficiais no mesmo banco usarão FKs fortes, com escopo composto por world_id, ON DELETE RESTRICT por padrão e referências lógicas apenas quando projeções, histórico ou separação física justificarem.

Bloco 19.9 — Índices, paginação, planos de consulta e particionamento

Índices não serão adicionados apenas porque uma coluna “parece importante”.

Cada índice precisa existir para sustentar um padrão real de acesso:

Consulta
Ordenação
Unicidade
Foreign key
Claim de processamento
Retenção
Reconstrução

Índices excessivos também causam problemas:

Aumentam o custo de cada escrita.
Consomem memória e armazenamento.
Aumentam WAL e replicação.
Tornam vacuum mais pesado.
Alongam migrations.
Podem nunca ser utilizados.
Podem duplicar outros índices.

Também precisamos decidir quando uma tabela deve ser particionada.

Opção A — Indexar amplamente e particionar desde o início
Índice em todas as FKs.
Índice em todos os status.
Índice em todos os timestamps.
Índices GIN em todos os JSONB.
Partições mensais em todas as tabelas grandes.
Partições separadas por mundo.
Vantagens
Muitas consultas encontram algum índice.
Preparação antecipada para volume.
Reduz risco inicial de esquecer um índice.
Algumas operações de retenção ficam rápidas.
Problemas
Grande amplificação de escrita.
Índices redundantes ou inúteis.
Complexidade operacional imediata.
Queries podem escolher planos inferiores.
Partições demais aumentam planejamento e manutenção.
FKs, uniques e migrations ficam mais complexas.
Um mundo por partição pode gerar milhares de partições.

Não recomendo.

Opção B — Quase nenhum índice além das chaves primárias
PRIMARY KEY
UNIQUE essencial
Demais índices somente após lentidão em produção
Vantagens
Escritas mais baratas.
Schema inicial simples.
Menor uso de armazenamento.
Evita otimização especulativa.
Problemas

Consultas previsivelmente importantes ficariam lentas:

Agenda de partidas.
Outbox pendente.
Jobs disponíveis.
Contratos ativos.
Elenco por clube.
Classificação.
Notificações não lidas.
Histórico por jogador.
Claims concorrentes.

Esperar o incidente para criar índices básicos também não é adequado.

Opção C — Índices orientados a access patterns e particionamento baseado em evidência
Índices mínimos previsíveis
+
índices definidos pelos casos de uso
+
validação de planos
+
telemetria de consultas
+
particionamento somente quando volume, retenção ou manutenção justificarem
Minha recomendação: Opção C

A regra central será:

Todo índice deverá corresponder a uma invariante, query, ordenação ou processo operacional documentado.

1. Catálogo de access patterns

Antes de criar uma tabela importante, registraremos suas consultas principais.

Exemplo:

table: matches.matches
accessPatterns:
  - name: list_world_matches_by_schedule
    filters:
      - world_id
      - scheduled_game_at range
    order:
      - scheduled_game_at asc
      - id asc

  - name: list_club_upcoming_matches
    filters:
      - world_id
      - home_club_id or away_club_id
      - status
    order:
      - scheduled_game_at asc

  - name: claim_matches_ready_for_preparation
    filters:
      - status
      - preparation_available_at
    lock:
      - skip_locked

Esse catálogo alimentará:

Índices.
Testes de integração.
Query repositories.
Monitoramento.
Revisão de migrations.
2. Índices começam pelo escopo de mundo

Para consultas internas de um mundo, o padrão geralmente será:

(world_id, ...)

Exemplo:

CREATE INDEX idx_matches_world_scheduled_game_at
ON matches.matches (
  world_id,
  scheduled_game_at,
  id
);

Consulta:

SELECT *
FROM matches.matches
WHERE world_id = $1
  AND scheduled_game_at >= $2
  AND scheduled_game_at < $3
ORDER BY
  scheduled_game_at ASC,
  id ASC
LIMIT $4;

Isso favorece:

Isolamento.
Migração futura do mundo.
Cache local.
Paginação.
Diagnóstico.
Redução do espaço pesquisado.
3. Ordem das colunas importa

Índice:

(world_id, status, scheduled_game_at)

é adequado para:

WHERE world_id = $1
  AND status = $2
ORDER BY scheduled_game_at

Mas não é necessariamente adequado para:

WHERE scheduled_game_at = $1

A ordem será baseada em:

Igualdades frequentes.
Escopo obrigatório.
Faixas.
Ordenação.
Desempates.

Não criaremos índices compostos apenas listando colunas aparentemente relevantes.

4. Índices para foreign keys

FKs relevantes receberão índices no lado filho quando existirem operações como:

Buscar filhos pelo pai.
Verificar dependências antes de excluir.
Realizar joins frequentes.
Migrar dados de um mundo.
Reconciliar relacionamentos.

Exemplo:

CREATE INDEX idx_player_contracts_world_player
ON contracts.player_contracts (
  world_id,
  player_id
);

Outro access pattern pode exigir:

CREATE INDEX idx_player_contracts_world_club_status
ON contracts.player_contracts (
  world_id,
  club_id,
  status
);

Não manteremos automaticamente ambos quando um único índice composto puder atender os usos necessários.

5. Índices parciais

Serão usados para subconjuntos operacionais pequenos.

Outbox pendente
CREATE INDEX idx_outbox_unpublished_available
ON messaging.outbox_messages (
  available_at,
  local_sequence
)
WHERE published_at IS NULL;
Sessões ativas
CREATE INDEX idx_game_sessions_active_expires
ON identity.game_sessions (
  expires_at,
  id
)
WHERE status = 'ACTIVE';
Notificações não lidas
CREATE INDEX idx_notifications_user_unread
ON notifications.notifications (
  user_id,
  created_at DESC,
  id DESC
)
WHERE read_at IS NULL
  AND status <> 'DELETED';

Benefícios:

Índice menor.
Menor custo de manutenção.
Maior seletividade.
Melhor correspondência ao processo operacional.
6. Unicidade parcial

Exemplo:

Um jogador pode possuir vários contratos históricos, mas apenas um vínculo principal ativo.

Possível índice:

CREATE UNIQUE INDEX uq_player_contracts_active_player
ON contracts.player_contracts (
  world_id,
  player_id
)
WHERE status = 'ACTIVE';

Isso protege a invariante diretamente no banco.

Outro exemplo:

CREATE UNIQUE INDEX uq_clubs_active_world_normalized_name
ON clubs.clubs (
  world_id,
  normalized_name
)
WHERE status <> 'DELETED';

A condição precisa corresponder exatamente à regra de negócio.

7. Índices de cobertura com INCLUDE

Quando uma consulta frequente precisa de poucas colunas adicionais:

CREATE INDEX idx_matches_world_schedule
ON matches.matches (
  world_id,
  scheduled_game_at,
  id
)
INCLUDE (
  status,
  home_club_id,
  away_club_id
);

Isso pode permitir leitura sem acessar a heap em determinados cenários.

Porém, INCLUDE não será automático.

Colunas incluídas:

Aumentam o índice.
Tornam updates mais caros.
Podem perder utilidade se a query mudar.

Será usado apenas após validar o plano da consulta.

8. Índices de expressão

Permitidos quando existe uma transformação estável usada frequentemente.

Exemplo de nome normalizado:

CREATE UNIQUE INDEX uq_clubs_world_normalized_name
ON clubs.clubs (
  world_id,
  lower(normalized_name)
);

Preferiremos, porém, persistir uma coluna normalizada quando:

A normalização tiver regra de domínio.
Precisar ser versionada.
For utilizada em várias operações.
Exigir tratamento linguístico específico.

Índices de expressão não esconderão uma regra complexa não documentada.

9. Índices GIN

Adequados para casos específicos:

Busca em arrays pequenos permitidos.
JSONB documental consultado legitimamente.
Full-text search interno limitado.
Operadores de contenção.

Não serão criados automaticamente em todo JSONB.

Exemplo controlado:

CREATE INDEX idx_operational_metadata_gin
ON operations.diagnostic_sessions
USING GIN (metadata);

Somente se consultas reais utilizarem operadores compatíveis.

Busca textual pública continuará no Meilisearch.

10. Índices BRIN

Poderão ser usados em tabelas grandes, append-only e naturalmente ordenadas por tempo ou sequência.

Candidatas futuras:

audit.security_events
messaging.outbox_messages
operations.job_execution_summaries
matches.match_events
notifications.deliveries

Exemplo:

CREATE INDEX idx_security_events_occurred_at_brin
ON audit.security_events
USING BRIN (occurred_at);

BRIN pode ser muito menor que B-tree, mas oferece menor precisão.

É adequado quando:

A tabela é grande.
Os dados têm correlação física com a coluna.
As consultas usam intervalos amplos.
Não é necessário localizar poucos registros aleatórios.
11. B-tree continuará sendo o padrão

B-tree será usado para:

Igualdade.
Ordenação.
Intervalos.
Paginação.
Constraints únicas.
FKs.
Claims operacionais.

Não escolheremos tipos de índice mais especializados sem access pattern correspondente.

12. Paginação por cursor

Listas extensas utilizarão keyset pagination.

Exemplo:

SELECT *
FROM players.players
WHERE world_id = $1
  AND (
    created_at,
    id
  ) < (
    $cursor_created_at,
    $cursor_id
  )
ORDER BY
  created_at DESC,
  id DESC
LIMIT $limit;

Índice:

CREATE INDEX idx_players_world_created_at
ON players.players (
  world_id,
  created_at DESC,
  id DESC
);

O cursor conterá os campos da ordenação.

13. OFFSET terá uso limitado

Permitido para:

Pequenos catálogos.
Telas administrativas com volume baixo.
Navegação curta.
Relatórios materializados pequenos.
Ferramentas internas sem risco de profundidade.

Não será usado como estratégia principal em:

Jogadores.
Eventos.
Notificações.
Histórico financeiro.
Partidas.
Auditoria.
Market listings.

Além do custo crescente, OFFSET pode produzir páginas inconsistentes durante inserções concorrentes.

14. Ordenação sempre será determinística

Evitar:

ORDER BY created_at DESC

Preferir:

ORDER BY
  created_at DESC,
  id DESC

Para streams:

ORDER BY
  runtime_epoch ASC,
  match_sequence ASC

Para agenda:

ORDER BY
  scheduled_game_at ASC,
  world_time_sequence ASC,
  id ASC

A última coluna garante desempate estável.

15. Limites máximos

A API não aceitará:

limit = 100000

Cada endpoint terá limite máximo.

Exemplo conceitual:

Padrão: 20
Máximo comum: 100
Exportações: processo assíncrono

Grandes extrações usarão:

Export job.
Streaming controlado.
Snapshot.
Arquivo no R2.

Não transformarão uma Query API interativa em exportação irrestrita.

16. Busca por clubes de uma partida

A relação:

home_club_id
away_club_id

gera consultas com OR:

WHERE home_club_id = $1
   OR away_club_id = $1

Alternativas:

Dois índices separados.
UNION ALL de duas consultas.
Tabela associativa de participantes.
Projeção de agenda do clube.

Não criaremos um índice composto:

(home_club_id, away_club_id)

presumindo que resolverá eficientemente ambos os lados.

O repository escolherá o modelo conforme o access pattern.

17. Tabelas de claim concorrente

Processos como Outbox, Scheduler e workers internos usarão consultas semelhantes a:

SELECT id
FROM scheduling.scheduled_events
WHERE status = 'PENDING'
  AND available_at <= transaction_timestamp()
ORDER BY
  priority DESC,
  available_at ASC,
  local_sequence ASC
FOR UPDATE SKIP LOCKED
LIMIT $1;

Índice correspondente:

CREATE INDEX idx_scheduled_events_pending_claim
ON scheduling.scheduled_events (
  priority DESC,
  available_at ASC,
  local_sequence ASC
)
WHERE status = 'PENDING';

A query e o índice serão projetados juntos.

18. Estatísticas e seletividade

O planejador depende de estatísticas adequadas.

Colunas com distribuição incomum podem exigir maior nível estatístico, por exemplo:

world_id.
Status muito desbalanceados.
Tipos de eventos.
Categorias operacionais.
Shard assignment.

Alterações serão aplicadas somente após análise:

ALTER TABLE ...
ALTER COLUMN status
SET STATISTICS ...;

Não aumentaremos o nível de estatística globalmente sem necessidade.

19. Estatísticas multicoluna

Quando duas colunas tiverem forte correlação, estatísticas estendidas poderão ser usadas.

Exemplo conceitual:

world_id + status
competition_id + stage_id
provider + delivery_status

Isso pode ajudar o planejador a estimar melhor combinações de filtros.

Será uma otimização baseada em plano real, não configuração inicial universal.

20. Validação de planos

Queries críticas terão fixtures de volume representativo e serão verificadas com:

EXPLAIN

e, em ambiente seguro:

EXPLAIN ANALYZE

Avaliaremos:

Tipo de scan.
Linhas estimadas versus reais.
Ordenações.
Uso de memória.
Loops.
Leitura de buffers.
Índices utilizados.
Tempo total.
Crescimento com volume.

Não trataremos “usou índice” como sinônimo automático de “bom plano”.

21. Queries críticas terão orçamento

Exemplo conceitual:

query: claim_outbox_messages
expectedRows: 100
p95BudgetMs: 50
mustUseIndex:
  - idx_outbox_unpublished_available

Categorias:

Interativa.
Realtime.
Worker crítica.
Backoffice.
Batch.
Exportação.

Cada categoria terá orçamento diferente.

Uma simulação em lote não possui o mesmo limite de uma resposta da API.

22. Telemetria de consultas

Monitoraremos:

Frequência.
Tempo total.
Média.
Percentis.
Linhas retornadas.
Leitura de blocos.
Escrita temporária.
Locks.
Queries repetidas.
Timeouts.
Planos regressivos.

Consultas serão identificadas por fingerprint, não pelo texto com parâmetros específicos.

Isso permitirá localizar:

Query rápida executada milhões de vezes.
Query rara extremamente cara.
Query com plano degradado após crescimento.
N+1 no Prisma.
23. Prevenção de N+1

Repositories e Query Services evitarão:

Listar 100 jogadores
→ executar 100 consultas de contrato
→ executar 100 consultas de clube

Alternativas:

Join orientado ao caso de uso.
Batch loader.
Query específica.
Projeção.
IN limitado e indexado.
Agregação SQL.

Não resolveremos todo N+1 carregando grafos gigantes com include.

24. Índices redundantes

Exemplo:

INDEX (world_id)
INDEX (world_id, status)
INDEX (world_id, status, created_at)

O primeiro ou segundo pode ser redundante, dependendo das consultas.

Toda revisão deverá verificar:

Índices com prefixos sobrepostos.
Índices duplicados por constraint.
Índices criados automaticamente.
Índices não utilizados.
Custo de escrita.
Tamanho.

Índices não utilizados não serão removidos cegamente; primeiro verificaremos sazonalidade e jobs raros.

25. Integridade versus performance

Índices que sustentam constraints não serão removidos apenas por aparecerem como pouco utilizados.

Exemplos:

Primary key.
Unique business key.
Exclusion constraint.
Chave candidata de FK.

Eles têm função de integridade, não apenas de consulta.

26. Criação de índices em produção

Em tabelas grandes, preferiremos criação sem bloqueio prolongado das escritas.

O processo deverá:

Estimar tamanho e duração.
Verificar espaço disponível.
Controlar impacto em CPU, I/O e WAL.
Criar o índice pela estratégia operacional adequada.
Verificar validade.
Associar o índice à constraint, quando aplicável.
Monitorar réplicas e latência.

Operações que não podem ocorrer dentro de transação serão tratadas pelo migration runner como etapas explícitas.

27. Remoção de índices

Fluxo:

Identificar candidato
→ confirmar ausência de função de integridade
→ analisar consultas históricas
→ observar sazonalidade
→ remover em ambiente de teste
→ monitorar
→ remover de produção

Quando houver dúvida, poderemos primeiro impedir seu uso em ambiente de teste ou acompanhar planos antes da remoção definitiva.

28. Quando particionar

Particionamento será considerado quando existir pelo menos um destes motivadores:

Retenção por período.
Tabela muito grande.
Vacuum e manutenção difíceis.
Queries quase sempre limitadas por período ou escopo.
Necessidade de remover dados em blocos.
Índices globais excessivamente grandes.
Migração operacional por unidades previsíveis.
Isolamento de dados quentes e frios.

Não será adotado apenas porque uma tabela “pode crescer”.

29. Tabelas candidatas futuras
Fortes candidatas
matches.match_events
matches.match_checkpoints
messaging.outbox_messages
messaging.inbox_messages
notifications.deliveries
audit.security_events
audit.domain_audit_entries
operations.job_execution_summaries
integrations.webhook_receipts

Características:

Alto volume.
Crescimento temporal.
Processamento sequencial.
Retenção ou arquivamento.
Baixa frequência de updates antigos.
Não particionar inicialmente sem evidência
players.players
clubs.clubs
contracts.player_contracts
competitions.competitions
worlds.worlds
identity.users

São entidades centrais e relativamente estáveis.

30. Particionamento temporal

Para dados técnicos e append-only, o primeiro candidato será particionamento por tempo real.

Exemplo:

audit.security_events
PARTITION BY RANGE (occurred_at)

Partições:

security_events_2026_07
security_events_2026_08

Benefícios:

Retenção por DROP PARTITION.
Índices menores.
Manutenção por período.
Arquivamento previsível.
Queries temporais com pruning.
31. Tempo lógico versus tempo real no particionamento

Eventos do mundo podem possuir:

occurred_at
occurred_game_at

A coluna de particionamento dependerá do lifecycle físico.

Para retenção e operação, geralmente usaremos tempo real:

occurred_at

Motivo:

Retenção é executada no mundo físico.
Mundos podem avançar em velocidades diferentes.
Datas lógicas podem estar décadas à frente.
Um mundo pausado pode permanecer na mesma data lógica por muito tempo.

Tempo lógico continuará indexado quando necessário para consultas de jogo.

32. Não criar uma partição por mundo

Estratégia proibida como padrão:

players_world_1
players_world_2
players_world_3
...

Problemas:

Milhares de partições.
Alto custo de planejamento.
Migrations complexas.
Catálogo inflado.
Operação difícil.
Mundos com tamanhos muito diferentes.
Não equivale a sharding físico.

O isolamento continuará por world_id.

Quando necessário, o mundo inteiro será movido para outro banco/shard.

33. Subparticionamento

Só será considerado em volume realmente elevado.

Exemplo futuro:

match_events
→ RANGE por mês real
→ HASH por world_id ou match_id

Isso não será implementado inicialmente.

Subparticionamento aumenta:

Quantidade de objetos.
Complexidade de migrations.
Monitoramento.
Rebalanceamento.
Risco de partições ausentes.

Será adotado somente após medições.

34. Partições antecipadas

Um processo operacional criará partições futuras antes de serem necessárias.

Exemplo:

Partição atual
Próximas duas ou três partições

Não dependeremos da primeira inserção do mês para descobrir que a partição não existe.

Também existirá uma partição default somente quando houver política clara para:

Alertar.
Reclassificar.
Esvaziar.
Não deixar dados esquecidos.
35. Constraints em tabelas particionadas

Ao particionar, verificaremos:

Se a chave única precisa incluir a chave de partição.
Como FKs serão aplicadas.
Como índices serão criados em todas as partições.
Como Prisma representa a tabela.
Como migrations alcançam partições existentes e futuras.
Como queries usam pruning.
Como o identificador global continua único.

Não alteraremos uma tabela para particionada sem revisar suas invariantes.

36. UUID e unicidade em partições

O UUIDv7 continuará sendo a identidade lógica global.

Quando uma constraint única física exigir incluir a chave de partição, poderemos usar:

PRIMARY KEY (partition_key, id)

ou outra organização compatível, preservando:

id
→ identidade global de domínio.

A aplicação não passará a tratar a data da partição como parte conceitual da identidade.

A decisão será específica para cada tabela particionada.

37. Particionamento não substitui índice

Mesmo com pruning, cada partição pode precisar de índices.

Exemplo:

Partition pruning
→ escolhe julho.

Índice local
→ encontra mensagens não publicadas disponíveis.

Não presumiremos que dividir a tabela automaticamente resolve todas as consultas.

38. Dados quentes e frios

Lifecycle possível:

Partições recentes
→ banco principal e índices completos.

Partições antigas
→ índices reduzidos ou storage de arquivo.

Histórico muito antigo
→ exportado para R2, se permitido pela categoria.

Projeções
→ reconstruídas conforme necessidade.

Registros oficiais não serão removidos apenas por serem antigos; a política de retenção definirá o destino.

39. Ledger financeiro

O ledger poderá crescer muito, mas não será particionado prematuramente.

Antes, avaliaremos:

Volume real.
Frequência de consulta por conta.
Reconciliação.
Constraints de balanceamento.
FKs.
Relatórios.
Correções.
Necessidade de retenção integral.

Se particionado futuramente, provavelmente precisará considerar:

world_id
occurred_at
account_id
transaction_id

sem romper a atomicidade da transação financeira.

40. Match events

São candidatos naturais a organização por:

match_id
runtime_epoch
match_sequence

Consulta principal:

WHERE world_id = $1
  AND match_id = $2
  AND (
    runtime_epoch,
    match_sequence
  ) > ($3, $4)
ORDER BY
  runtime_epoch,
  match_sequence
LIMIT $5;

Índice:

CREATE UNIQUE INDEX uq_match_events_stream_sequence
ON matches.match_events (
  world_id,
  match_id,
  runtime_epoch,
  match_sequence
);

Particionamento físico, quando necessário, poderá seguir tempo real de registro ou outra estratégia operacional, sem alterar a ordem oficial do stream.

41. Reindexação e bloat

Monitoraremos:

Tamanho da tabela.
Tamanho dos índices.
Tuplas mortas.
Frequência de updates.
Page splits.
Índices desproporcionais.
Autovacuum.
Crescimento de WAL.

Reindexação não será um cron cego aplicado a tudo.

Será uma operação orientada por diagnóstico.

42. Fillfactor

Poderá ser ajustado em tabelas ou índices com updates frequentes.

Candidatos possíveis:

Estado atual de partida.
Projeções atualizadas constantemente.
Process Managers.
Configurações operacionais.
Status de deliveries.

Tabelas append-only normalmente não precisam da mesma estratégia.

Não definiremos um fillfactor global.

43. Testes de regressão de queries

Queries críticas terão testes com volume representativo.

Exemplos:

Claim da Outbox não realiza scan completo.
Agenda de clube permanece paginável.
Classificação não executa N+1.
Busca de contratos ativos usa índice parcial.
Timeline da partida respeita sequência.

Não fixaremos cada detalhe do plano, pois o planejador pode escolher alternativas válidas.

Testaremos propriedades importantes:

Tempo dentro do orçamento.
Ausência de scan catastrófico.
Quantidade de linhas processadas.
Ordenação correta.
Uso do escopo de mundo.
Regras propostas
Índices serão orientados a access patterns documentados.
Chaves primárias e constraints de integridade continuarão indexadas independentemente da telemetria de uso.
Consultas de mundo normalmente começarão por world_id.
A ordem das colunas dos índices refletirá igualdade, faixa e ordenação.
FKs importantes terão índices de suporte quando o acesso justificar.
Índices parciais serão usados em subconjuntos operacionais.
Unicidades condicionais usarão índices únicos parciais.
INCLUDE, GIN, BRIN e índices de expressão exigirão caso real.
Paginação de grandes coleções utilizará cursor.
Ordenações terão desempate determinístico.
OFFSET profundo não será estratégia principal.
APIs terão limites máximos de página.
Queries de claim serão projetadas junto com seus índices.
Queries críticas terão orçamento e análise de plano.
Telemetria identificará queries lentas, frequentes e regressivas.
Repositories evitarão N+1 e grafos carregados indiscriminadamente.
Índices redundantes e não utilizados serão revisados, não removidos cegamente.
Índices grandes serão criados por processo operacional controlado.
Particionamento dependerá de volume, retenção ou manutenção comprovados.
Não haverá uma partição por mundo.
Particionamento temporal real será a primeira opção para dados técnicos append-only.
Partições futuras serão criadas antecipadamente.
Particionamento não substituirá índices locais.
Tabelas centrais não serão particionadas prematuramente.
Ledger exigirá análise específica antes de particionamento.
Match events preservarão sequência oficial independentemente da estratégia física.
Bloat, vacuum e tamanho dos índices serão monitorados.
Ajustes como fillfactor serão específicos por tabela.
Queries críticas terão testes de regressão com volume representativo.
Decisão 19.9

A. Criar muitos índices e particionar antecipadamente todas as tabelas que possam crescer.

B. Manter somente PKs e uniques, adicionando índices após problemas em produção.

C. Criar índices a partir de access patterns previsíveis e medidos, usar paginação por cursor e adotar particionamento apenas quando volume, retenção ou manutenção comprovarem sua necessidade.

Minha recomendação é C.

c

Fechado.

Decisão 19.9: índices orientados por access patterns, paginação por cursor e particionamento somente quando volume, retenção ou manutenção comprovarem sua necessidade.

Bloco 19.10 — Transações, concorrência, locks e consistência

O sistema terá operações concorrentes como:

Dois clubes enviando propostas pelo mesmo jogador.
Usuário e IA tentando alterar a mesma escalação.
Dois workers tentando processar o mesmo evento.
Encerramento de contrato junto com uma transferência.
Liquidação financeira simultânea.
Partida sendo finalizada enquanto outro processo tenta corrigi-la.
Scheduler distribuindo eventos entre vários workers.

Precisamos impedir:

Atualizações perdidas.
Duplo processamento.
Saldo incorreto.
Contratos ativos duplicados.
Duas decisões incompatíveis sobre o mesmo agregado.
Deadlocks recorrentes.
Transações abertas durante chamadas externas.
Locks mantidos por processos longos.
Retry duplicando efeitos colaterais.
Opção A — Apenas READ COMMITTED e confiança na última escrita

Fluxo:

Ler registro
→ modificar
→ salvar

Sem versão, lock ou controle adicional.

Vantagens
Implementação simples.
Poucos conflitos visíveis.
Menor quantidade de código.
Boa performance aparente.
Problemas

Duas operações podem ler a mesma versão:

Saldo inicial: 100

Processo A lê 100
Processo B lê 100

A desconta 30 e grava 70
B desconta 50 e grava 50

O resultado correto seria:

20

Mas uma operação foi perdida.

Não recomendo.

Opção B — SERIALIZABLE para todas as transações

Todas as operações seriam executadas no nível máximo de isolamento.

Vantagens
Forte proteção contra anomalias.
Comportamento próximo de execução sequencial.
Reduz a necessidade de raciocinar sobre alguns conflitos.
Problemas
Grande número de aborts e retries sob carga.
Transações comuns pagariam por garantias desnecessárias.
Pode mascarar ausência de versionamento dos agregados.
Fluxos longos seriam especialmente problemáticos.
Ainda exige idempotência para repetir transações.
Não substitui locks distribuídos ou controle de efeitos externos.

Não recomendo como padrão global.

Opção C — Estratégia híbrida por tipo de operação
READ COMMITTED
→ padrão geral.

Optimistic concurrency
→ agregados mutáveis.

SELECT FOR UPDATE
→ seções críticas curtas.

Advisory transaction locks
→ coordenação por chave de negócio.

SERIALIZABLE
→ invariantes multirregistro realmente complexas.

SKIP LOCKED
→ claims de filas e agendas.

Process Managers
→ processos longos, sem transações longas.
Minha recomendação: Opção C

A regra central será:

Utilizar a garantia de concorrência mais específica e barata que preserve corretamente a invariante.

1. Isolamento padrão

O nível padrão será:

READ COMMITTED

Adequado para:

Commands simples.
Inserts independentes.
Atualizações com controle de versão.
Claims usando row locks.
Operações protegidas por constraints.
Escrita da Outbox junto ao agregado.

Não dependeremos do isolamento padrão sozinho para proteger agregados.

2. Limite transacional na camada de aplicação

A transação será aberta pelo caso de uso:

await unitOfWork.execute(async (transaction) => {
  const negotiation =
    await transferRepository.findById(
      negotiationId,
      transaction,
    );

  negotiation.accept(command);

  await transferRepository.save(
    negotiation,
    transaction,
  );

  await outboxRepository.append(
    negotiation.pullDomainEvents(),
    transaction,
  );
});

Responsabilidades:

Application Service
→ define o limite da transação.

Domínio
→ valida e altera estado.

Repository
→ persiste dentro da transação recebida.

Unit of Work
→ commit ou rollback.

Outbox
→ registra eventos na mesma transação.
3. Não haverá transação automática por requisição

Não abriremos uma transação PostgreSQL no início de toda requisição HTTP.

Problemas:

Queries simples manteriam conexão e snapshot desnecessários.
Chamadas externas poderiam prolongar a transação.
Streaming e realtime seriam incompatíveis.
Locks poderiam permanecer durante serialização da resposta.
Aumentaria pressão no pool de conexões.

A transação será aberta somente quando o caso de uso precisar de atomicidade.

4. Optimistic concurrency nos agregados

Agregados mutáveis terão:

version INTEGER NOT NULL

Update:

UPDATE transfers.transfer_negotiations
SET
  status = $1,
  version = version + 1,
  updated_at = transaction_timestamp()
WHERE id = $2
  AND version = $3;

Resultado esperado:

1 linha atualizada
→ sucesso.

0 linhas atualizadas
→ versão mudou ou entidade não existe.

O repository diferencia:

Entidade inexistente.
Conflito de concorrência.
Estado já alterado.
5. Conflito otimista não será ignorado

Exemplo:

Usuário aceita proposta A.
Simultaneamente, proposta A expira.

Quando a segunda operação encontrar versão diferente, ela deverá:

Recarregar o estado atual.
Reavaliar a intenção.
Decidir se pode repetir.
Retornar conflito quando a intenção deixou de ser válida.

Não faremos:

Falhou pela versão
→ remover condição de versão
→ sobrescrever.
6. Retry otimista

Nem todo conflito deve ser mostrado imediatamente ao usuário.

Retry automático pode ocorrer quando:

A operação é idempotente.
A intenção ainda é válida após recarregar.
Não existem efeitos externos executados.
O número de tentativas é limitado.
Há jitter entre tentativas quando necessário.

Exemplo aceitável:

Atualizar contador técnico derivado.

Exemplo que normalmente exige nova decisão:

Aceitar uma transferência cujo valor ou status mudou.
7. SELECT FOR UPDATE

Será usado para bloquear linhas existentes durante seções críticas curtas.

Exemplo:

SELECT *
FROM finance.accounts
WHERE world_id = $1
  AND id = $2
FOR UPDATE;

Adequado para:

Liquidação entre contas.
Reserva financeira.
Consumo de recurso limitado.
Transição que depende do estado atual bloqueado.
Operações que alteram várias linhas relacionadas.

O lock termina no commit ou rollback.

8. Ordem global de locks

Quando uma operação bloquear múltiplos recursos, utilizará ordem determinística.

Exemplo para contas:

Bloquear primeiro o menor account_id.
Depois o maior account_id.

Para entidades de tipos diferentes, teremos ordem conceitual:

1. World
2. Competition
3. Club
4. Player
5. Contract
6. Negotiation
7. Financial accounts

A ordem real será documentada por workflow crítico.

Isso reduz deadlocks como:

Transação A:
bloqueia conta 1
→ espera conta 2

Transação B:
bloqueia conta 2
→ espera conta 1
9. Locks não serão mantidos durante chamadas externas

Proibido:

Abrir transação
→ bloquear contrato
→ chamar Keycloak
→ chamar R2
→ enviar email
→ aguardar provider
→ commit

Fluxo correto:

Transação:
→ validar
→ persistir intenção
→ gravar Outbox
→ commit

Após commit:
→ worker executa integração externa
→ registra resultado

Isso evita:

Transações longas.
Locks prolongados.
Esgotamento do pool.
Falhas externas causando rollback de estado já decidido.
Deadlocks por latência de rede.
10. Advisory transaction locks

Quando a coordenação envolver uma chave de negócio sem uma linha única apropriada, poderemos usar:

pg_advisory_xact_lock(...)

Casos possíveis:

Criação única de temporada para um mundo.
Fechamento de ciclo mundial.
Publicação única de standings.
Inicialização de um processo por worldId.
Liquidação única de uma obrigação.

O lock será derivado deterministicamente de:

namespace + identificador

Exemplo conceitual:

const lockKey = advisoryLockKey(
  "season-close",
  worldId,
  seasonId,
);
11. Advisory locks não serão invisíveis

Cada uso deverá documentar:

Namespace.
Chave.
Invariante protegida.
Ordem em relação a outros locks.
Tempo máximo esperado.
Comportamento em timeout.
Teste de concorrência.

Não espalharemos chamadas diretas a pg_advisory_lock pelos repositories.

Existirá um adapter central:

interface TransactionLockManager {
  acquire(
    transaction: TransactionContext,
    lock: TransactionLockKey,
  ): Promise<void>;
}
12. Preferência por locks transacionais

Usaremos preferencialmente:

pg_advisory_xact_lock

e não locks de sessão.

Motivo:

Liberado automaticamente no final da transação.
Menor risco de conexão devolvida ao pool ainda segurando lock.
Lifecycle previsível.
Recuperação automática em rollback.

Locks de sessão serão reservados a ferramentas administrativas específicas e muito controladas.

13. SERIALIZABLE seletivo

Será considerado quando a invariante depender de leituras e escritas em várias linhas e não puder ser protegida adequadamente por:

Unique constraint.
Exclusion constraint.
Optimistic concurrency.
Row lock.
Advisory lock.

Exemplos possíveis:

Alocação baseada em ausência de registros dentro de um conjunto complexo.
Fechamento financeiro que verifica múltiplas condições agregadas.
Processo de seleção com invariantes cruzadas difíceis de bloquear individualmente.

Essas transações devem ser:

Curtas.
Determinísticas.
Idempotentes.
Preparadas para retry.
Monitoradas separadamente.
14. Retry de falhas serializáveis

O PostgreSQL poderá abortar uma transação serializável.

A aplicação tratará como erro transitório:

SerializationFailure

Fluxo:

Tentar transação
→ conflito serializável
→ rollback
→ pequeno backoff com jitter
→ repetir transação inteira

Nunca repetiremos apenas a última query.

Toda a lógica precisa ser reexecutada sobre um novo snapshot.

15. Deadlocks

Deadlocks podem ocorrer mesmo com boa modelagem.

O banco abortará uma das transações.

A aplicação classificará o erro como transitório quando a operação for segura para retry.

Registro operacional:

Workflow
Entidades envolvidas
Tentativa
Tempo aguardado
Release
Query fingerprint
CorrelationId

Deadlocks recorrentes não serão tratados apenas aumentando retries; exigirão revisão da ordem de locks.

16. SKIP LOCKED para claims

Aplicável a:

Outbox.
Scheduler.
Processamento de Inbox.
Backfills.
Limpeza em lotes.
Processos operacionais internos.

Exemplo:

SELECT id
FROM messaging.outbox_messages
WHERE published_at IS NULL
  AND available_at <= transaction_timestamp()
ORDER BY
  available_at,
  local_sequence
FOR UPDATE SKIP LOCKED
LIMIT $1;

Vários workers podem executar a mesma query sem selecionar as mesmas linhas.

17. Claim e processamento não serão uma transação longa

Duas estratégias serão possíveis.

Processamento curto dentro da transação

Adequado quando:

Toda a operação é local ao PostgreSQL.
Dura poucos milissegundos.
Não há chamada externa.
O número de linhas é pequeno.
Claim com lease persistido

Adequado quando o processamento continua após o commit:

PENDING
→ CLAIMED
→ PROCESSING
→ COMPLETED

Campos:

claimed_by_worker_id UUID,
claim_expires_at TIMESTAMPTZ(3),
attempt_count INTEGER

O worker:

Faz claim em transação curta.
Commit.
Processa.
Finaliza em nova transação.
Outro worker recupera se o lease expirar.
18. Lock de banco não substitui lease distribuído

Um row lock existe apenas enquanto a transação estiver aberta.

Não manteremos uma transação aberta durante:

Simulação longa.
Upload.
Geração de relatório.
Chamada de provider.
Processamento de temporada.
Execução de partida.

Esses casos usarão:

Estado persistente.
Lease.
Heartbeat.
Checkpoint.
Idempotência.
Process Manager.
19. NOWAIT

Poderá ser usado quando aguardar o lock não fizer sentido.

Exemplo:

SELECT ...
FOR UPDATE NOWAIT;

Casos:

Operação administrativa que deve informar “recurso em processamento”.
Ação realtime com deadline curto.
Ferramenta de manutenção que não pode bloquear produção.
Tentativa não essencial de assumir um processo.

O erro será traduzido para estado operacional apropriado, não exposto como erro SQL.

20. Timeouts

Cada runtime terá limites compatíveis com sua função.

Configurações possíveis:

statement_timeout
lock_timeout
idle_in_transaction_session_timeout

Exemplo conceitual:

API interativa
→ statement timeout curto.

Worker de relatório
→ timeout maior e explícito.

Migration
→ configuração própria.

Realtime
→ lock timeout muito curto.

Não haverá um único timeout global adequado para todos os workloads.

21. Transação ociosa será tratada como falha

Conexões em:

idle in transaction

podem:

Segurar locks.
Impedir vacuum.
Manter snapshots antigos.
Aumentar bloat.
Bloquear migrations.

Teremos:

Timeout específico.
Métrica.
Alerta.
CorrelationId.
Identificação do serviço.
Diagnóstico de stack quando possível.
22. Outbox atômica

Mudança de domínio e evento correspondente serão persistidos na mesma transação.

UPDATE aggregate
+
INSERT outbox_message
+
COMMIT

Não faremos:

Commit do agregado
→ tentativa de publicar no NATS

sem Outbox, pois uma falha entre as duas etapas faria o estado mudar sem o evento.

23. Inbox e idempotência

Consumer:

Recebe evento
→ inicia transação
→ tenta registrar inbox key
→ se já existe, encerra como duplicado
→ aplica efeito
→ grava eventos de saída
→ commit

Constraint:

UNIQUE (
  consumer_name,
  message_id
)

A unicidade será a proteção final contra processamento duplicado naquele consumer.

24. Idempotência de commands externos

Commands originados por HTTP ou mobile poderão ter:

idempotency_key

Escopo possível:

userId + commandType + idempotencyKey

Registro:

type CommandExecution = {
  idempotencyKey: string;
  actorId: ActorId;
  commandType: string;

  payloadHash: string;

  status:
    | "PROCESSING"
    | "SUCCEEDED"
    | "FAILED_RETRYABLE"
    | "FAILED_FINAL";

  resultReference?: string;
};

A mesma chave com payload diferente será rejeitada.

25. Idempotência não será apenas cache de resposta

A chave protegerá o efeito de negócio.

Exemplo:

Usuário toca duas vezes em “enviar proposta”.

O sistema não deve criar duas propostas, mesmo que:

A primeira resposta tenha sido perdida.
O cliente tenha reconectado.
A API tenha reiniciado.
O retry tenha chegado a outra instância.

O registro de idempotência precisa participar da transação da operação.

26. Constraints continuam sendo a última defesa

Mesmo com locks e versionamento, o banco continuará protegendo invariantes como:

Um contrato ativo por jogador.
Uma participação por clube e competição.
Uma Inbox por consumer e messageId.
Um fechamento financeiro por obrigação e período.
Uma sequência por stream.

Locks reduzem conflitos.

Constraints impedem que uma corrida não prevista produza um estado inválido.

27. Exemplo: aceitar proposta de transferência

Fluxo:

1. Iniciar transação.
2. Carregar negociação com versão esperada.
3. Bloquear ou validar a proposta selecionada.
4. Confirmar que a negociação continua aberta.
5. Confirmar que nenhuma oferta já foi aceita.
6. Atualizar negociação com optimistic concurrency.
7. Criar acordo.
8. Registrar Outbox.
9. Commit.

A criação do contrato e a liquidação podem ocorrer:

Na mesma transação, quando a regra exigir atomicidade imediata.
Por Process Manager, quando dependerem de etapas futuras.

A decisão dependerá do estado de negócio da transferência.

28. Exemplo: transferência financeira entre contas

Fluxo:

1. Iniciar transação.
2. Ordenar accountIds.
3. Bloquear contas nessa ordem.
4. Verificar moeda.
5. Verificar disponibilidade financeira.
6. Criar ledger transaction.
7. Criar débitos e créditos.
8. Validar balanceamento.
9. Atualizar projeções de saldo.
10. Gravar Outbox.
11. Commit.

Não haverá chamada externa dentro dessa transação.

29. Exemplo: finalização de partida

A finalização precisa impedir dois runtimes de oficializarem a mesma partida.

Proteções:

runtimeEpoch esperado
matchSequence final
aggregateVersion
status atual
unique result version
finalStateHash

Fluxo:

1. Iniciar transação.
2. Bloquear a partida ou validar versão esperada.
3. Confirmar runtime assignment ativo.
4. Confirmar runtimeEpoch.
5. Confirmar que não existe resultado oficial concorrente.
6. Persistir resultado e versão final.
7. Atualizar estado da partida.
8. Registrar eventos na Outbox.
9. Commit.

Um retry com o mesmo resultado será idempotente.

Um resultado diferente para a mesma versão será incidente de integridade.

30. Processos longos

Não serão representados por uma única transação.

Exemplo de fechamento de temporada:

REQUESTED
→ PREPARING
→ VALIDATING
→ FREEZING_INPUTS
→ CALCULATING
→ APPLYING_RESULTS
→ VERIFYING
→ COMPLETED

Cada etapa terá:

Transação curta.
Checkpoint.
Idempotência.
Versão.
Lease.
Eventos.
Possibilidade de retomada.

O mundo pode permanecer pausado logicamente sem manter locks SQL durante todo o processo.

31. Savepoints

Savepoints poderão ser usados em rotinas técnicas específicas:

SAVEPOINT item_processing;

Casos:

Importação em lote.
Ferramenta administrativa.
Processamento de itens independentes dentro de uma unidade maior.

Não serão usados para ignorar falhas de domínio e continuar uma transação parcialmente incoerente.

Em operações de negócio, normalmente:

Uma invariante falhou
→ rollback da unidade inteira.
32. Transações aninhadas

O domínio e os repositories não abrirão transações independentes sem saber se já existe uma transação superior.

A Unit of Work fornecerá um contexto explícito:

type TransactionContext = {
  readonly id: TransactionId;
  readonly database: TransactionDatabasePort;
};

Métodos internos recebem o contexto.

Não dependeremos de uma transação implícita global invisível.

33. Efeitos após commit

Algumas ações só podem ocorrer depois que o commit foi confirmado:

Publicar evento no NATS.
Enviar push.
Invalidar cache.
Solicitar processamento externo.
Atualizar Meilisearch.

Essas ações serão originadas pela Outbox ou por mecanismo equivalente.

Não utilizaremos callbacks em memória como única garantia de pós-commit.

Se o processo cair após o commit, a Outbox ainda permitirá a execução.

34. Efeitos anteriores ao commit

Alguns recursos externos podem exigir preparação antes da confirmação.

Exemplo:

Reservar upload no R2.

A estratégia será:

Criar intenção interna
→ gerar autorização temporária
→ cliente realiza upload
→ validar objeto
→ transação confirma associação

Objetos abandonados serão removidos por retenção.

Não tentaremos transformar PostgreSQL e R2 em uma única transação distribuída.

35. Sem transações distribuídas 2PC entre serviços

Não utilizaremos two-phase commit entre:

PostgreSQL.
NATS.
Redis.
R2.
Keycloak.
Meilisearch.
Providers externos.

Usaremos:

Outbox.
Inbox.
Idempotência.
Process Managers.
Compensações.
Reconciliação.
Estados intermediários explícitos.

A consistência forte permanecerá dentro da transação PostgreSQL local.

36. Classificação de erros

Erros de persistência serão classificados.

Não transitórios
Unique violation de regra de negócio.
Check constraint.
FK inválida.
Estado incompatível.
Payload inválido.
Transitórios
Serialization failure.
Deadlock detected.
Lock timeout, conforme operação.
Conexão temporariamente indisponível.
Failover.
Ambíguos
Conexão perdida durante commit.

Nesses casos, a aplicação não pode presumir automaticamente se o commit ocorreu.

A recuperação usará:

Idempotency key.
CommandId.
Consulta do estado.
Registro de execução.
Reconciliação.
37. Retry não pode duplicar efeitos

Antes de repetir uma operação após falha ambígua:

Consultar CommandExecution
Consultar aggregateVersion
Consultar evento esperado
Consultar chave de negócio

Exemplo:

Timeout após enviar proposta

O cliente repete com a mesma idempotency key.

A API retorna o resultado já persistido, em vez de criar nova proposta.

38. Observabilidade transacional

Registraremos métricas como:

Duração de transações.
Tempo aguardando lock.
Quantidade de conflitos otimistas.
Serialization failures.
Deadlocks.
Retries.
Lock timeouts.
Transações ociosas.
Claims recuperados após lease.
Commits ambíguos reconciliados.

Dimensões controladas:

service
workflow
database
result
release

Não usaremos IDs individuais como labels de Prometheus de alta cardinalidade.

39. Testes concorrentes

Teremos testes reais com PostgreSQL via Testcontainers.

Cenários:

Duas aceitações concorrentes da mesma oferta.
Dois workers tentando fechar a mesma temporada.
Dois débitos concorrentes sobre o mesmo saldo.
Dois runtimes tentando finalizar a mesma partida.
Claim paralelo com SKIP LOCKED.
Retry após deadlock.
Lease expirado assumido por outro worker.
Idempotency key repetida.
Mesma key com payload diferente.

Mocks não são suficientes para validar locks e níveis de isolamento.

Regras propostas
READ COMMITTED será o isolamento padrão.
Agregados mutáveis usarão optimistic concurrency.
Conflitos de versão nunca serão sobrescritos silenciosamente.
SELECT FOR UPDATE será usado em seções críticas curtas.
Locks múltiplos seguirão uma ordem determinística.
Chamadas externas não ocorrerão dentro de transações.
Advisory transaction locks serão usados somente para invariantes documentadas.
Locks de sessão serão excepcionais.
SERIALIZABLE será reservado a workflows específicos.
Falhas serializáveis repetirão a transação inteira.
Deadlocks serão retryable quando a operação for idempotente, mas recorrência exigirá correção.
SKIP LOCKED será utilizado em claims concorrentes.
Processamentos longos usarão leases e checkpoints, não transações abertas.
NOWAIT será permitido em operações que não podem aguardar.
Timeouts serão definidos por perfil de workload.
Transações ociosas serão monitoradas e encerradas.
Mudança de domínio e Outbox serão atômicas.
Inbox usará unicidade para deduplicação.
Commands externos poderão utilizar idempotency keys persistidas.
A mesma idempotency key não poderá ser reutilizada com payload diferente.
Constraints serão a última defesa contra corridas.
Processos longos serão Process Managers com etapas transacionais curtas.
Transações aninhadas serão controladas pela Unit of Work.
Efeitos pós-commit serão executados pela Outbox.
Não haverá transações distribuídas entre PostgreSQL e serviços externos.
Erros serão classificados em transitórios, definitivos e ambíguos.
Falhas ambíguas serão reconciliadas antes de repetir efeitos.
Concorrência será testada contra PostgreSQL real.
Decisão 19.10

A. Utilizar somente READ COMMITTED, sem versionamento ou estratégia formal de locks.

B. Executar todas as transações em SERIALIZABLE.

C. Estratégia híbrida: READ COMMITTED como padrão, optimistic concurrency nos agregados, row/advisory locks para seções críticas, SERIALIZABLE seletivo, SKIP LOCKED para claims e Process Managers para operações longas.

Minha recomendação é C.