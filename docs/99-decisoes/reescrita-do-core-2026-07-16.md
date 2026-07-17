# Reescrita do core: agregados, eventos, tempo, dinheiro — R-175 a R-187

> **Status:** CANÔNICO / RATIFICADO · **Data:** 2026-07-16 · **Autoridade:** decisão do dono do produto · **Escopo:** `packages/core`, `prisma/schema.prisma`, todos os 16 contextos

## Por que existe

[R-173](conta-global-e-postgres-2026-07-16.md) tornou o Postgres o único armazenamento. A primeira porta migrada (`UserAccount`) revelou que a divergência entre domínio e modelo físico não era daquela porta: era estrutural. Um levantamento dos 16 contextos, comparando **snapshot do domínio × aggregate roots do [context map](../02-tecnico/12-context-map-e-blueprint.md) × models do `prisma/schema.prisma`**, encontrou três modelos paralelos que **nunca se encontraram** — porque o JSON aceita qualquer forma, e era o JSON que rodava.

O achado que enquadra todos os outros: **nenhuma das três fontes é confiável sozinha.**

- O domínio construiu **16 mega-agregados** (`World<X>`, um por mundo) onde o context map define **~70 roots por entidade**.
- O schema **viola o próprio canon** em pelo menos dois pontos: `Player.clubId` existe (o doc, na sua pergunta Q5, proíbe `Player` de carregar clubId autoritativo) e `StaffContract.club` usa FK simples onde a Decisão 19.8 — declarada no mesmo arquivo, linhas 26-29 — exige composta world-scoped.
- O doc canônico nomeia roots que **não existem em lado nenhum**: `WorldEntryProcess`, `MaintenancePlan`, `NotificationThread`, `PressResponse`, `AutomationRuleVersion`, `Budget`, `Payment`, `CompetitionRuleSet`, `CreditFacility`.

Portanto: a reescrita **arbitra caso a caso contra o doc**, e onde o doc é omisso, decide. Não é "domínio obedece schema" nem o contrário.

### O que estava fisicamente impossível

Três garantias que o produto declara e que **não existem no físico**:

1. **`GameWorld.seed` não tem coluna.** O determinismo e o replay são invariante canônica (context map:149), o `GameWorldSnapshot.seed` existe (`world-types.ts:35`), e o `model GameWorld` não tem onde guardá-lo. Sem seed persistido, o mundo não é reproduzível. Idem `startDate` e `worldSequence` — este último só existe **dentro** de `OutboxEvent.sequence`/`DomainEventLog.sequence`, isto é: o contador do mundo mora na tabela de eventos.
2. **O outbox não pode publicar.** `OutboxMessageSnapshot` carrega **`payloadHash`, não o payload** (`eventing-types.ts:39`); `OutboxEvent.payloadJson` é `Json` **NOT NULL** (`schema.prisma:1963`) e não tem origem possível. E não há ponte: `PublishOutboxBatch` (`eventing-use-cases.ts:79`) recebe as mensagens do chamador **à mão** — nada lê `snapshot.events`. Os eventos de domínio nascem e morrem dentro do JSON do contexto.
3. **[R-133](registro-de-decisoes.md) (cadeia de auditoria) está quebrado em três frentes.** O hash cobre `"${sequence}|${actor}|${action}|${target}|${prevHash}"` (`world-admin.ts:1048-1055`) — **quatro escalares, não o payload**: `beforeJson`/`afterJson` podem ser adulterados sem quebrar a cadeia. O domínio não tem `beforeJson`/`afterJson`/timestamp. E `saveAdmin` **reescreve a cadeia inteira a cada comando** — o oposto exato do INSERT-only que R-133 exige.

---

## Decisões ratificadas

### R-175 — O agregado é a entidade, não o mundo. `revision` morre.

Cada aggregate root do context map vira um agregado carregável e salvável isoladamente, com **`version` por linha**. O `revision` por contexto por mundo — presente em 15 dos 16 snapshots — **deixa de existir**, e não tem tabela em lugar nenhum justamente porque é artefato do mega-agregado.

Motivo: hoje qualquer escrita em qualquer jogador de um mundo contende no mesmo inteiro. `WorldIdentitySnapshot.revision` serializa reservas + controles + participações + cooldowns do mundo inteiro: dois jogadores reservando **clubes diferentes** colidem. `WorldSchedulerSnapshot.revision` faz avançar o relógio disputar revisão com salvar uma temporada. `WorldClubPortfolioSnapshot.revision` põe os 16 clubes numa revisão só.

**O domínio já sabia que era gargalo**: `ClubCommandReceipt` carrega os dois contadores — `aggregateVersion` **e** `portfolioRevision` (`club-types.ts:151-152`).

Consequências aceitas:
- As 16 portas `find<X>ByWorldId` / `save<X>(snapshot, expectedRevision)` são substituídas por portas por root, com escopo `(gameWorldId, id)`.
- `expectedRevision` some do vocabulário; `expectedVersion` por agregado assume.
- Roots que hoje não têm `id` — `WorldParticipationSnapshot`, `CooldownSnapshot`, `SquadMembershipSnapshot`, `RivalrySnapshot`, `AutomationExecutionSnapshot`, `InboxRecordSnapshot`, `RiskAssessmentSnapshot` — ganham `id`. Sem isso, `ClubControl.worldParticipantId` (`schema.prisma:895`) é uma FK que o domínio **não consegue produzir**.

### R-176 — Eventos vivem em `DomainEventLog`, tipados, com hash sobre o payload. Corrige R-133.

O `events[]` dentro do estado — 12 dos 16 snapshots — **acaba**. Hoje ele **nunca é drenado**: todo comando faz `events: [...this.state.events, event]` e o array cresce sem limite dentro do blob reescrito por inteiro a cada save. Não existe `drain`/`pull`/`clear` no repositório inteiro.

Fica assim:

| Papel | Onde | Regra |
|---|---|---|
| Histórico do agregado | `DomainEventLog` | append-only, `@@unique([gameWorldId, aggregateType, aggregateId, aggregateVersion])` |
| Publicação | `OutboxEvent` | **com `payloadJson`**, não só o hash |
| Dedup de consumo | `InboxDedup` | por `(consumerName, eventId)` |
| Idempotência de command | `IdempotencyKey` | tabela, não string espalhada por entidade com varredura O(n) |

**Estilo do evento:** união discriminada com payload tipado (o estilo de `IdentityDomainEvent`, `identity-types.ts:167-174`), **não** `type: string` livre + `payload: Record<string, unknown>` (o estilo de `ClubDomainEvent`, `club-types.ts:159,168`). Dois estilos incompatíveis conviviam no mesmo core; um payload opaco quebra o replay determinístico que `MatchSimulation` inteiro existe para garantir.

Todo evento passa a carregar o que as tabelas exigem e nenhum evento hoje tem: `aggregateType`, `aggregateId`, `aggregateVersion`, `sequence` (worldSequence monotônico **por mundo**, não máximo local de um array como em `world-eventing.ts:159-161`), `correlationId`, `causationId`.

**A cadeia de hash de R-133 passa a cobrir o payload canônico**, como R-133 sempre disse: `eventHash(n) = H(canonical(payload) ‖ prevEventHash(n))`. `beforeJson`/`afterJson`/`createdAt` viram obrigatórios, e `integrityHash`/`previousIntegrityHash` deixam de ser nullable — uma cadeia à prova de adulteração com hash opcional admite linha sem hash.

**A cadeia é uma só, por mundo, ordenada por `worldSequence`** — não uma por agregado. R-133 é explícita: `integrityHash` = `eventHash`, encadeada por `[gameWorldId, sequence]` do `DomainEventLog`, materializada no `GameAuditLog` e cruzada com o log de domínio.

#### Consequência que R-175 **não** elimina: o ponto de serialização por mundo

`DomainEventLog.sequence` é NOT NULL com `@@unique([gameWorldId, sequence])`, e [CA-REG-01](../02-tecnico/17-criterios-de-aceite-e-bandas.md) exige `worldSequence` **monotônico sem gap nem duplicata**. Logo o `worldSequence` vem de um contador por mundo (`UPDATE GameWorld SET worldSequence = worldSequence + 1 ... RETURNING`), cujo lock de linha dura até o commit: **comandos do mesmo mundo que emitem evento serializam no commit**. Uma sequência global do Postgres não serve — teria buracos.

Isso é aceito, e é diferente do gargalo que R-175 mata:

| | Hoje (`revision`) | Depois (contador + `version` por linha) |
|---|---|---|
| Trabalho por comando | **O(mundo)** — lê, revalida e reescreve o blob inteiro | **O(1)** — lê e escreve as linhas tocadas |
| Duração do lock | toda a janela load→save | só a janela bump→commit |
| Ordem total por mundo | acidental | explícita, e é o que sustenta replay, fencing (INV-31) e o stream de tempo real (doc 08) |

Para um mundo de 16 clubes, serializar o commit é barato e desejável. O que era inaceitável era pagar O(mundo) para reservar um clube.

Consequência aceita: a DLQ **não existe em nenhuma das três fontes** (só valores de enum órfãos em lados opostos: `InboxStatus.DEAD_LETTERED` no domínio, `OutboxStatus.DEAD_LETTER` no schema). Ela é responsabilidade canônica declarada (context map:56,130) e entra como tabela nova.

### R-177 — O tempo do mundo é data (`YYYY-MM-DD`). Tick existe só dentro da partida.

O domínio inteiro usa `"YYYY-MM-DD"`. O schema tem `*WorldTick` em **exatamente um lugar** — `ClubControl.startsAtWorldTick`/`endsAtWorldTick` (`schema.prisma:898-899`) — e não existe conversor data↔tick em lugar algum. `GameWorldSnapshot` tem `currentDate: string` e `worldSequence: number`, e `worldSequence` é contador de evento, **não relógio**.

- **Calendário, temporada, contrato, janela, agendamento, controle de clube: data do mundo.** `ClubControl.startsAtWorldTick` vira `startsOn`.
- **Dentro dos 90 minutos: tick.** E tick **não é minuto** — o domínio o chama de *chance* (`SimulationManifest.timestepChances`) e o kernel ordena por `tick`, não por relógio. `MatchSimulationTick.minute`/`second` (`schema.prisma:1630-1631`) não representam a mesma grandeza; a conversão seria lossy. A coluna passa a ser `tick`, e minuto — se o jogador precisar ver — é derivado.

São grandezas diferentes e continuam diferentes. O que não pode é uma virar a outra em silêncio.

### R-178 — Só partidas dobradas. `FinancialTransaction` morre.

O schema tinha **duas contabilidades concorrentes**: `FinancialTransaction` (`:1435` — um `amountMinor`, um `clubId`, um `type`, **sem contrapartida**) e `JournalEntry`/`JournalLine` (`:2129`/`:2154` — partidas dobradas). Nada impedia lançar dinheiro por fora do razão balanceado.

`FinancialTransaction` sai. Toda moeda que entra sai de algum lugar — é o que sustenta a invariante de oferta monetária (só `FAUCET`/`SINK` movem `totalMoney`, INV-3b) e a **Decisão 19.10**: *saldo oficial deriva do ledger, nunca de projeção*.

Consequências aceitas:
- **`LedgerAccountSnapshot.balanceMinor` sai** (`ledger-types.ts:71`). O domínio cacheava saldo dentro da conta, contradizendo 19.10 frontalmente — e é por isso que `FinancialAccount` **não tem coluna de saldo**, por design.
- `JournalEntry` mantém o ciclo `DRAFT→POSTING→POSTED→REVERSED`: só `POSTED` afeta saldo, e reversão cria **lançamento novo** via `reversalOfJournalEntryId`. Publicado nunca é editado. O domínio, que não tinha status nem reversão, ganha os dois.
- `transactionClass: string` livre vira `flowClass: MoneyFlowClass`. String livre não sustenta a invariante de oferta monetária.
- `ClubFinanceSnapshot` é **projeção reconstruível**, nunca fonte.
- A moeda fica **na linha** (`JournalLine.currencyId`), não na transação: a invariante canônica é "Σ débitos = Σ créditos **por moeda**", que só é expressável assim.

### R-179 — Jogador tem 32 atributos granulares. Os 4 grupos são rollup derivado.

O domínio tinha 4 escalares agrupados (`PlayerAttributeGroups`, `player-lifecycle-types.ts:55`); o schema tem ~32 colunas (`PlayerAttributes`, `:1039`). Não há como reidratar 32 a partir de 4 — a perda é irreversível, e por [R-173](conta-global-e-postgres-2026-07-16.md) não há dado a preservar.

Valem os 32. Com 4, scouting vira ruído (não há o que descobrir), treino não tem eixo e tática não tem sobre o que operar — os três pilares do gênero. Os grupos continuam existindo como **rollup derivado para exibição**, nunca como fonte.

Consequência aceita: `trainingFocus` passa de `PlayerAttributeCode` (4 valores) para `TrainingFocus` (9 valores, `schema.prisma:430`).

### R-180 — IA é a ausência de controle, não um tipo de controle.

`ClubControl.controlType = USER|AI` (`schema.prisma:896`) é incoerente com a própria tabela: `worldParticipantId` é **NOT NULL**, então um controle de IA exigiria um `WorldParticipant` fantasma. E `Club.controlType` (`:850`) duplicava o campo.

Clube **sem `ClubControl` ativo é tocado pela IA**. `ClubControl.controlType` e `Club.controlType` saem. `ClubAIProfile` pendura no clube, não no controle.

Consequência aceita: `ClubStatus.BOT_RESERVED` (`schema.prisma:99-104`) perde sentido como status — clube reservado para bot é clube sem controle ativo. (Ver pendência sobre enums de status abaixo.)

### R-181 — Dinheiro é `bigint` + `currencyId`. A `model Currency` passa a existir.

O domínio usa `number` para **todo** dinheiro: `balanceMinor`, `amountMinor`, `feeMinor`, `wageMinor`, `askingFeeMinor`, `optionFeeMinor`, `principalMinor`, `supplyMinor`, `priceMinor`. `number` em JS é um double IEEE-754: inteiro exato só até 2^53. O código guarda com `Number.isSafeInteger`, mas **não é o mesmo tipo que `BigInt`** e estoura em silêncio acima de ~9×10^15 minor units — teto alcançável por `supplyMinor`, que agrega a oferta monetária do **mundo inteiro**.

Passa a `bigint`, alinhando com o `BigInt` que o schema já exige (`schema.prisma:19-21`) e cumpre.

**E `model Currency` é criada.** Hoje **17 colunas `currencyId @db.Uuid` apontam para uma tabela inexistente**, e o próprio schema admite em `:22-23`: *"referencia a **futura** entidade `Currency` (catálogo)"*. Nenhum tipo do domínio tem `currencyId`; o domínio usa `currency: string` (código ISO). Vale o catálogo com FK.

Casos que não são dinheiro e seguem como estão: `interestRateBps` (bps inteiro, correto), multiplicadores de `GameEconomyConfig` e métricas de partida em `Decimal` (legítimo, não-monetário).

Consequência aceita: `StaffContractSnapshot.compensationRef: string` (`staff-types.ts:70`) — uma **referência opaca** onde deveria haver valor — vira `salaryPerSeasonMinor: bigint` + `currencyId`. O domínio simplesmente não modelava remuneração de comissão técnica como dinheiro.

### R-182 — Seed, data inicial e sequência do mundo são colunas. O determinismo é físico.

`GameWorld` ganha `seed`, `startDate` e `worldSequence`. Sem seed persistido não há replay, e replay é invariante canônica (context map:149) e o objeto do doc 15 inteiro.

`worldSequence` é **monotônico por mundo** e sai da tabela de eventos para o mundo — o contador do mundo não pode morar no log de eventos.

E o **mundo inicial deixa de ser literal de tipo**: `GeneratedCompetition.name: "Liga Inicial"`, `seasonNumber: 1`, `rounds: 30` (`genesis-types.ts:76-78`) e `WorldProvisioningEvidence` com `generatedClubCount: 16`, `generatedPlayerCount: 368` (`world-types.ts:25-32`) são **literais no tipo** — um mundo de 20 clubes não compila. Viram configuração (`GameRuleConfig`/`GameEconomyConfig`), com os campos que o schema já previu e o domínio não tem: `maxClubs`, `seasonDays` (R-107), `initialClubCashMinor`.

### R-183 — Nem todo root do context map é root. Departamento e estádio são filhos do clube.

**Contraria [context map:77](../02-tecnico/12-context-map-e-blueprint.md), que lista `ClubDepartment` e `Stadium`/`Facility` como aggregate roots.** Está aqui porque contrariar o canon exige decisão nova, não mensagem de commit.

R-175 quebrou o mega-agregado por um motivo específico: **contenção**. Dois jogadores mexendo em clubes diferentes travavam um ao outro porque o mundo inteiro era um agregado. Esse motivo **não existe** entre um clube e o seu departamento: ninguém disputa o departamento de um clube com outro clube. O que existe é o contrário — `Club.setDepartmentPlan` (`club.ts:110`) muta o departamento, ou seja, ele já está dentro da fronteira de consistência do clube. Root com dono é contradição.

Consequências, cada uma com evidência:

| O quê | Decisão | Por quê |
|---|---|---|
| `ClubDepartmentSnapshot.version` | **morre** | Ninguém o comparava — `club-maintenance.ts:50` e `world-club-portfolio.ts:501` só incrementavam, e nenhum teste o assertava. Concorrência otimista que nada checa é ruído com nome de invariante. Quem versiona o departamento é o `Club`. |
| `ClubDepartment.id` (coluna) | **morre** | Uuid sintético que nada referencia: o `InfrastructureProject` aponta o alvo pelo `kind`, e o domínio nunca teve `ClubDepartmentId`. A chave natural `(gameWorldId, clubId, type)` vira a primária — "um departamento de cada tipo por clube" deixa de ser convenção e vira constraint. |
| `DepartmentType` | **10 → os 6 do domínio** | `STADIUM` virou entidade (não pode ser as duas coisas); `INFRASTRUCTURE` colide com o root `InfrastructureProject`; `BOARD` é governança e `FINANCE` é do C9 — não são coisas de que se sobe o nível; `COMMUNICATION`/`DATA_ANALYSIS` não têm command. `maxLevel` **fica**: sem ele a invariante `level ≤ maxLevel` (context map:154) é inexpressável. |
| **Estádio** | **entidade, 1 por clube** | O domínio o tem como campo obrigatório, não lista (`club-types.ts:122`). Vira tabela própria com `@@unique([gameWorldId, clubId])` — mas segue **dentro** da fronteira do clube: `operateInfrastructureProject` muta `club.stadium` **e** `club.version` juntos (`world-club-portfolio.ts:475-483`). Entidade ≠ root. |
| **Identidade do clube** | **período, não coluna** | O rebranding (BC-003) apagaria o histórico se o nome fosse coluna. A unicidade de nome muda de casa: vira **índice único parcial** sobre o período vigente (`WHERE effectiveThrough IS NULL`), o que substitui a varredura de array em `world-club-portfolio.ts:157`. Parcial de propósito — um unique total proibiria o nome abandonado de voltar ao pool. |

`ClubStatus` fica com o do domínio (`ACTIVE|SUSPENDED|DISSOLVED`): `BANKRUPT` é do C9, `BOT_RESERVED` morreu com R-180, `INACTIVE` era vago.

**A regra geral que isto estabelece:** o context map lista ~70 roots, e a lista foi feita por *vocabulário*, não por fronteira de consistência. Root é o que precisa de fronteira própria por contenção ou por invariante que ninguém de fora garante. Todo contexto seguinte deve reexaminar a sua lista com esse critério, em vez de materializar 70 tabelas versionadas.

### R-184 — A idempotência guarda o fingerprint do PEDIDO. `IDEMPOTENCY_KEY_REUSED` passa a existir.

O [catálogo de commands](../02-tecnico/10-catalogo-de-commands.md) fixa, na linha 61, um errorCode **comum a toda mutação**: `IDEMPOTENCY_KEY_REUSED` — *"mesma `idempotencyKey` com payload divergente"*. Ele **não existia em lugar nenhum do código**, e a `IdempotencyKey` não tinha como detectá-lo: sem o fingerprint do pedido, a chave sabia que já fora usada, mas não **com o quê**.

A dívida declarada em R-176 era "a `IdempotencyKey` está provada e não ligada". Estava errada: ela também estava **incompleta**.

| Decisão | Por quê |
|---|---|
| Coluna `requestFingerprint`, **NOT NULL sem default** | O default `''` da migration é temporário e cai em seguida. Se sobrevivesse, um insert que esquecesse o campo pegaria `''` calado — e toda chave com fingerprint vazio casaria com toda outra, transformando reúso em replay. |
| O fingerprint é **serialização canônica, não hash** | Comparação exata, zero superfície de colisão, e o core roda no React Native, sem `node:crypto`. O custo é uma coluna TEXT maior — a esta escala, não paga uma dependência criptográfica. |
| `canonicalJson`, **nunca `JSON.stringify`** | `world-club-portfolio.ts:78` usava `stringify`, cuja ordem de chaves segue a **inserção**: o mesmo comando montado por outro caminho produzia outro fingerprint, e um reenvio legítimo seria recusado como reúso. |
| `IdempotencyOutcome` vira **união discriminada** | Com `{ claimed: boolean }` o chamador podia ignorar o reúso sem o compilador reclamar. Ignorá-lo é devolver ao cliente o resultado de um comando que ele não pediu. |
| **Reúso vence FAILED** | A ordem é regra, não estilo: um comando divergente não pode reabrir a chave de um comando que falhou e rodar no lugar dele. Erro do cliente vale qualquer que seja o desfecho do primeiro. |

O nome inventado `IDEMPOTENCY_KEY_CONFLICT` (`world-club-portfolio.ts`, `world-scheduler.ts`, `scheduling-use-cases.ts`) morre junto com os mega-agregados que o usam — o canon nunca o conheceu.

### R-186 — O barramento valida o payload. Os errorCodes passam a ser os do catálogo.

Achado ao provar `identity:confirm-onboarding` por HTTP — 544 testes verdes não o pegaram, porque **as fixtures montavam o input à mão** e nunca atravessavam a borda.

**Os commands de C1 não validavam payload.** O `ic()` repassava `...payload` como `never` direto ao caso de uso. Campo obrigatório ausente não virava `COMMAND_PAYLOAD_INVALID`: descia até o Prisma e voltava como crash — **com o caminho do arquivo e o código-fonte do adapter dentro da resposta HTTP**. Vazar o interior do servidor para quem chamou é o defeito mais grave dos quatro, e era invisível.

| Decisão | Por quê |
|---|---|
| Schema zod por command de C1, na borda | O catálogo já fixa o payload de cada um (`10-catalogo-de-commands.md`). Sem schema, o contrato existia só no papel. |
| A mensagem da exceção **não vai** para o cliente | Vai para o log, onde tem dono. O cliente recebe `COMMAND_EXECUTION_FAILED` seco. |
| `acceptInheritedState` é `literal(true)`, não `boolean` | O catálogo (`:81`) o define como confirmação de assumir o clube **com o estado herdado** (dívidas, contratos, promessas), e marca o command como risco alto. `false` não é "outro caminho", é ausência de consentimento — recusá-lo na borda deixa o domínio livre de um flag que só pode valer `true`. |

**Os errorCodes eram inventados.** O domínio nomeava por conta própria o que o catálogo já fixara:

| Domínio (inventado) | Catálogo | O que mudou |
|---|---|---|
| `RESERVATION_EXPIRED` | `CLUB_SLOT_RESERVATION_EXPIRED` | nome |
| `ACCOUNT_IN_COOLDOWN` | `ACCOUNT_COOLDOWN_ACTIVE` | nome |
| `CLUB_TAKEN` | `CLUB_SLOT_UNAVAILABLE` **ou** `CLUB_ALREADY_CONTROLLED` | **semântica** |

O último não é cosmético. `CLUB_TAKEN` **fundia dois códigos canônicos em um**: o domínio já distinguia "reservado por outro" de "já tem gestor" em branches separados (`identity-commands.ts:447,454`) e emitia o mesmo código. Reserva é retenção **mole com prazo** (R-25) — o clube volta em minutos; controle ativo é dono. O cliente não tinha como saber se esperava ou desistia. Nenhum cliente dependia dos nomes antigos (grep em `apps/mobile`, `apps/admin`, `api-client`: zero), então alinhar não quebrou ninguém.

**A lição, que já é a quinta vez:** teste verde concorda consigo mesmo. A borda só se prova atravessando-a.

### R-187 — Um comando, um evento. `ClubIdentityPeriod` não é root.

Achado ao devolver o BC-003 (task #22), e forçado por teste — não por leitura.

O [catálogo](../02-tecnico/10-catalogo-de-commands.md) promete DOIS eventos para `ApplyClubIdentity` (`:390`): `ClubIdentityApplied` **+ `ClubIdentityPeriodOpened` quando muda identidade oficial**. O `DomainEventLog` recusa: `@@unique([gameWorldId, aggregateType, aggregateId, aggregateVersion])` (R-176) — **um evento por versão de agregado**, porque duas linhas na mesma versão são duas histórias.

A saída óbvia seria dizer que o período é outro agregado — o [context map:77](../02-tecnico/12-context-map-e-blueprint.md) o lista como root. **É falso, e o físico prova:** `ClubIdentityPeriod` não tem coluna `version`. E pela régua que a R-183 estabeleceu — *root é o que precisa de fronteira própria por **contenção*** — ele não é: ninguém disputa o período de um clube com outro clube, e `Club.updateIdentity` o muta de dentro. É a mesma lista feita por **vocabulário** que já promovera departamento e estádio.

O teste fechou o argumento: rebranding no mesmo dia lógico **substitui** o período aberto (regra de `5f1c654`) — mesmo id, mesma "versão 1". Dois `ClubIdentityPeriodOpened` para o mesmo período. **Um root de verdade não tem duas versões 1.**

Portanto: **um comando, um fato, um evento.** `ClubIdentityApplied` carrega `periodOpened: boolean`, e a distinção que o catálogo queria sobrevive — trocar só o escudo é "sem efeito esportivo" (`:387`) e não abre período — sem inventar um root que o físico não tem.

**A regra geral:** quando o catálogo pedir N eventos por comando, pergunte de quantos AGREGADOS eles falam. Se for um só, é um evento com o fato dentro — o unique do log não é obstáculo, é a definição de história.

**Corolário para os 13 contextos restantes:** a lista de ~70 roots do context map precisa passar por dois testes, não um. Contenção (R-183) **e** `version` no físico. Root sem `version` não é root — é entidade dentro de alguém.

---

### R-188 — O grid de atributos é o do GDD §2. O schema copiou o Football Manager.

**Corrige a premissa da [R-179](#r-179--jogador-tem-32-atributos-granulares-os-4-grupos-são-rollup-derivado), não a decisão.** A R-179 escolheu granular sobre agrupado e estava certa; ela só comparou o domínio (4 grupos) com o schema (33 colunas) e nunca conferiu o schema contra o game design. Ao materializar C4 a divergência apareceu.

As colunas de `PlayerAttributes` (`schema.prisma:1039`) são o grid do **Football Manager**, com os nomes dele: `technique`, `flair`, `teamwork`, `workRate`, `aggression`. O GDD §2 define outro grid, e diz de si mesmo (`02-sistema-de-jogadores.md:107`):

> Esta subseção é a **fonte única** da lista de atributos do jogador. O overview (§7) e a IA de comportamento (§3.4) apenas **referenciam** esta lista — não mantêm listas próprias.

**Vale o GDD**, e não é preferência: a §2 se declara fonte única; a [R-09](registro-de-decisoes.md) manda o `overall` ser "média ponderada **do grid canônico** por posição" — o canônico, não o do schema; e o treino (§6) evolui pelos eixos da §2. Um schema que não os tem deixa a R-09 sem grid e o treino sem eixo, que é exatamente o vazio que a R-179 queria fechar.

**São 39, não 33** — técnicos 12, físicos 9, mentais 10, goleiro 8.

O que **morre** (FM, sem contraparte no GDD): `technique`, `flair`, `teamwork`, `workRate`. E `aggression`, que é caso à parte: o GDD o classifica explicitamente como **traço** ("temperamento"), não atributo — traço tem intensidade e **visibilidade**, não é nota que sobe com treino.

O que **nasce**: `shortPassing`/`longPassing` (o GDD separa passe curto de lançamento; o schema tinha um `passing` só), `setPieces`, `vision`, `explosiveness`, `recovery`, `discipline`, `consistency`, `resilience`, `goalkeeperAerial`, `goalkeeperPenalty`, `goalkeeperCommand`.

O que **muda de bloco**: `positioning` sai de técnico e vira mental — no GDD é "inteligência tática (leitura de jogo / posicionamento)", e ler o jogo não é um gesto técnico.

O que **muda de tabela**: `Player.consistency` é a "regularidade" da §2 — atributo mental, e estava solto no root.

**Os 4 grupos seguem sendo rollup** (R-179), agora sobre 39. E `overall` **nunca é coluna**: o GDD é explícito (`:120`) — "derivado, não armazenado como atributo".

Consequência aceita: a migração é destrutiva. Não há o que preservar — por [R-173](conta-global-e-postgres-2026-07-16.md) não há dado a migrar, e um mundo se regenera do seed (R-182).

**Não resolvido aqui, e listado como pendência:** os **traços** divergem em três lugares ao mesmo tempo — `Player.ambition/loyalty/professionalism`, `PlayerPersonality` (com outros nomes: `grit`, `ego`, `adaptability`…) e a lista canônica do GDD. `PlayerPersonality.discipline` ainda duplica o atributo mental homônimo. C4 materializa os atributos; os traços esperam decisão.

---

## Pendências abertas — decisões de produto que a reescrita expôs e não resolve

Nenhuma bloqueia o piloto (C1). Todas bloqueiam o contexto onde moram.

- **`BoardPromise`: três modelos incompatíveis do mesmo conceito.** O canônico pede **promessa verificável** (command `MakePublicPromise`); o domínio entrega **decisão registrada** (`BoardDecisionSnapshot` — isso é auditoria, não promessa: não há o que verificar); o schema entrega **dois escalares de humor** (`boardPatience`, `pressureLevel`). Nenhum dos três é o outro.
- **`UserSession.isOnline` é estado de jogo, não de auth** (`schema.prisma:649` — "habilita interação na partida ao vivo"). [R-174](conta-global-e-postgres-2026-07-16.md) entregou sessão ao Clerk; se a tabela morre junto, **C8 perde o sinal de presença ao vivo**. Presença precisa de lar próprio.
- **Contrato comercial não sabe quanto vale.** `CommercialAgreementSnapshot` não tem **nenhum** valor monetário nem referência a valor. O dinheiro é do C9, mas sem sequer uma referência o patrocínio é um contrato sem preço.
- **Categorização de elenco: no membro ou no elenco?** Domínio categoriza o membro (`category: SENIOR|RESERVE|YOUTH`); schema categoriza o elenco em **três eixos** (`type`, `category`, `youthAgeCategory`).
- **`MaintenancePlan`: plano ou vencimento?** Root canônico que não existe em nenhum lado; hoje é `maintenanceDueOn` disperso + `processedMaintenanceDayKeys[]`, um array de dedupe que cresce sem limite dentro do agregado do mundo.
- **Roots canônicos sem materialização em lado nenhum:** `WorldEntryProcess`, `NotificationThread`, `PressResponse`, `AutomationRuleVersion`, `Budget`, `Payment`/`TransferPaymentSchedule`, `CompetitionRuleSet`, `CreditFacility`, `ScoutingMission`, `TransferStrategy`, `Watchlist`, `PlayerCareerPlan`, `YouthClass`.
- **X-001 não tem `level`, `risk` nem `priority` simultaneamente.** `AutomationLevel` é o conceito central da automação e não existe no domínio; as duas invariantes canônicas ("alto risco não delegável", "sem conflito de precedência") dependem de `risk` e `priority`, que não existem no schema. A automação não é expressável em nenhuma das duas fontes.
- **`UserAccount.createdOn` é data de mundo gravada em coluna de instante de plataforma.** A reescrita expôs uma distinção que vale para os ~70 roots e não estava dita:

  | | Quem manda | Coluna | Default |
  |---|---|---|---|
  | **Data do mundo** — rege regra de jogo, tem de ser determinística (`WorldParticipant.joinedOn`) | o domínio | `DATE` | **nenhum** — um default de relógio inventaria a data e mataria o replay |
  | **Instante de plataforma** — auditoria/ops, nunca rege regra (`UserAccount.createdAt`, `lastLoginAt`) | a infra | `DateTime` | `now()` é **correto**: é um relógio que o domínio deliberadamente não pode ter |

  `UserAccount` é global (R-172): não tem mundo, logo não tem data de mundo. O `createdOn` do snapshot existe só para semear o id determinístico, e `prisma-user-account-repository.ts` o grava em `createdAt` — perdendo quando a conta nasceu de fato. Decidir: o `createdOn` sai do snapshot (é só semente) ou ganha coluna própria?

- **Gate DB-01..DB-16 segue devido** (herdado de R-173): constraints PostgreSQL não expressáveis no Prisma e conversão das FKs world-scoped restantes em compostas — incluindo o bug de `StaffContract.club` (`schema.prisma:1264`), FK simples onde a Decisão 19.8 exige composta.

## Efeito

Substitui a estrutura de `packages/core`, não as regras de jogo: fórmulas, balanceamento e Série R seguem valendo. Não altera R-85, R-171, R-172, R-173 nem R-174 — materializa o que R-173 exigiu.

Corrige R-133, que estava declarado e não cumprido.

A ordem é **um contexto por vez, com o gate verde entre eles**, começando por **C1 (identidade)**, que já tem o primeiro root extraído (`UserAccount`) e o primeiro adapter Prisma provado contra Postgres real. Enquanto houver contexto não reescrito, o estado é **parcial e declarado como tal** — nunca "pronto".
