# Modelo físico, constraints e ownership

> **Status:** CANÔNICO · **Decisões:** 19.7–19.10, R-30, R-31, R-109..R-115, R-138..R-148, R-154..R-159, R-169 · **Revisão:** 2026-07-13 · **Objetivo:** fechar B-06 no nível documental e definir o contrato para migrations de produção

## 1. Decisão sobre o modelo conceitual e o físico

O inventário de aproximadamente 250 conceitos de [`02-modelo-de-dados.md`](02-modelo-de-dados.md) é um **modelo conceitual completo**, não uma exigência de uma tabela por conceito. A baseline física inicial possui **75 models materializados** no `prisma/schema.prisma`. Um conceito só se torna tabela quando possui identidade própria, ciclo de vida, concorrência, retenção, consulta ou auditoria independentes.

| Disposição | Quando usar | Persistência |
|---|---|---|
| Aggregate root/entity | identidade e invariantes próprias | tabela materializada |
| Value object | existe apenas dentro do agregado | coluna tipada ou JSON validado/versionado |
| Projection | resultado reconstruível para leitura | tabela/cache regenerável com fonte declarada |
| Catalog/ruleset | taxonomia ou parâmetro versionável | `RuleSet`/`GameRuleConfig`/catálogo |
| Domain event/history | fato imutável com valor histórico | event log ou histórico append-only |
| Runtime-only | estado efêmero do kernel | memória/snapshot; não é fonte da verdade |

É proibido criar tabela apenas para igualar a contagem do modelo conceitual. Também é proibido guardar como JSON genérico um conceito que exija consulta relacional, constraint, concorrência ou histórico próprio.

## 2. Ownership de escrita dos 75 models físicos

Somente o contexto proprietário escreve sua tabela. Outros contextos consultam projeções ou consomem eventos.

| Contexto proprietário | Models |
|---|---|
| Identity & Access | `UserAccount`, `UserSession`, `WorldParticipant`, `UserCredential`, `AuthRefreshToken`, `Permission`, `RolePermission` |
| World & Season | `GameWorld`, `GameEconomyConfig`, `EconomySnapshot`, `Season`, `SeasonHistory`, `GameRuleConfig` |
| Club | `Club`, `ClubControl`, `ClubDepartment`, `ClubAIProfile`, `ClubHistoryEntry` |
| Person & Player Lifecycle | `Person`, `Player`, `PlayerAttributes`, `PlayerBackground`, `PlayerPersonality`, `PlayerDevelopment`, `PlayerDevelopmentAccrual`, `PlayerInjury`, `PlayerCareerHistory` |
| Contract & Staff | `PlayerContract`, `StaffMember`, `StaffContract` |
| Training & Squad | `TrainingPlan`, `TrainingPlayerEntry`, `Squad`, `SquadMembership` |
| Scouting & Market | `ScoutReport`, `TransferListing`, `Offer`, `TransferHistory` |
| Finance | `FinancialAccount`, `JournalEntry`, `JournalLine`, `FinancialTransaction`, `ClubFinanceSnapshot` |
| Competition | `Competition`, `CompetitionSeason`, `CompetitionClub`, `CompetitionStage`, `CompetitionRegistration`, `PlayerRegistration`, `PlayerSuspension`, `PlayerCompetitionDiscipline`, `ClubSeasonStats`, `PlayerSeasonStats`, `RecordBook` |
| Match & Simulation | `Match`, `MatchSimulation`, `MatchSimulationTick`, `MatchTeamState`, `MatchLineup`, `MatchLineupPlayer`, `MatchEvent`, `PlayerMatchStats`, `MatchDecisionPoint`, `MatchActionRecommendation`, `MatchCommandLog` |
| Narrative & Communication | `Narrative`, `Notification` |
| Automation | `AutomationRule` |
| Platform/Eventing | `OutboxEvent`, `InboxDedup`, `DomainEventLog`, `IdempotencyKey`, `SagaInstance`, `SagaStep` |
| Audit & Administration | `GameAuditLog` |

`GameAuditLog`, `DomainEventLog` e históricos recebem fatos de outros contextos, mas apenas seus próprios writers append-only materializam esses fatos. Nenhum consumidor altera a linha de origem.

## 3. Escopo multi-world e integridade referencial

Toda entidade pertencente a um mundo carrega `gameWorldId`. Toda referência entre duas entidades world-scoped usa o par `(gameWorldId, id)`, mesmo que UUIDs sejam globalmente únicos. Relações globais permitidas são apenas usuário, catálogo global explicitamente marcado e credenciais de plataforma.

### 3.1 Constraints obrigatórias para a primeira migration de produção

| ID | Constraint | Camada |
|---|---|---|
| DB-01 | FK composta em toda relação entre entidades world-scoped | banco + teste de schema |
| DB-02 | um `ClubControl` ativo por clube e um controle ativo por participante/mundo | índice parcial + domínio |
| DB-03 | um contrato primário ativo de jogador por instante; períodos não podem se sobrepor | exclusion constraint + domínio |
| DB-04 | contratos incompatíveis de staff não podem sobrepor períodos | exclusion constraint + domínio |
| DB-05 | mandante e visitante distintos e pertencentes ao mesmo mundo/edição | check + FK composta |
| DB-06 | uma simulação oficial por partida; manifesto oficial imutável após homologação | unique + política append-only |
| DB-07 | eventos e commands de partida têm sequência única e monotônica por simulação | unique + domínio |
| DB-08 | inscrição única de clube por edição, jogador único por lista e camisa única quando preenchida | unique composto |
| DB-09 | lançamento postado tem ≥2 linhas, mesma moeda, débitos = créditos e não pode ser editado | transação + validação diferida + append-only |
| DB-10 | idempotência única por ator/command/escopo; inbox deduplica produtor+messageId | unique composto |
| DB-11 | um passo por `(sagaInstanceId, stepIndex)` e fencing token crescente | unique + compare-and-swap |
| DB-12 | estados terminais não retornam a estados ativos | domínio + auditor de invariantes |
| DB-13 | históricos, ledger, auditoria e eventos oficiais são append-only | permissão de banco + aplicação |
| DB-14 | atributos, percentuais, níveis e dinheiro respeitam o dicionário canônico | check constraints |
| DB-15 | anonimização preserva fatos esportivos e separa/remove PII conforme LGPD | domínio + job auditável |
| DB-16 | pessoa, carreira e causas combináveis de indisponibilidade são eixos físicos separados; `FREE_AGENT` é derivado do vínculo e enums legados não recebem novas escritas | migration + check + testes de transição |

Constraints que Prisma não representa nativamente fazem parte da migration SQL revisada e recebem teste automatizado próprio. O schema Prisma é autoridade de sintaxe ORM, mas não substitui constraints nativas do PostgreSQL.

## 4. Estado atual, histórico e projeções

| Família | Fonte da verdade | Estado atual | Histórico/reconstrução |
|---|---|---|---|
| Jogador | `Player` + componentes | componentes vigentes | `PlayerCareerHistory`, accruals e eventos causais |
| Contrato | versões/períodos contratuais | contrato cujo período contém o instante | todas as versões; termos assinados nunca são sobrescritos |
| Transferência | saga/case + propostas versionadas | estado da saga | `TransferHistory`, propostas, ledger e eventos |
| Partida | manifesto + commands + ruleset | resultado homologado | replay determinístico, eventos e hashes |
| Classificação | resultados homologados + regulamento | projeção de standings | reconstruível por edição |
| Economia | ledger de partidas dobradas | saldo derivado/projeção | journal append-only + snapshots reconciliáveis |
| Temporada | máquina de estado e competições | temporada ativa | `SeasonHistory`, regulamento e ruleset efetivo |
| Clube | eventos e agregados | perfil vigente | `ClubHistoryEntry`, controles, finanças e temporadas |

Toda projeção persiste watermark/source version. Se divergir da fonte, é descartada e reconstruída; nunca corrige a fonte silenciosamente.

## 5. Configuração versus estado

- `RuleSet`/`GameRuleConfig`: regra versionada e data efetiva; não guarda resultado.
- Aggregate/entity: estado oficial resultante; referencia a versão de regra que o produziu quando relevante.
- Manifesto de simulação: congela entradas, ruleset, algoritmo RNG e hashes; não contém regra mutável.
- Snapshots: aceleradores de leitura/recovery; não substituem ledger, event log ou manifesto.
- JSON é permitido somente com schema/version discriminante, validação e estratégia de migração.

## 6. Gate para migrations de produção

A primeira migration de produção só pode ser gerada quando:

1. os 75 models possuírem owner e classificação de retenção;
2. DB-01..DB-16 tiverem enforcement e teste atribuídos;
3. nenhuma relação world-scoped usar FK simples;
4. contratos, controles e inscrições tiverem proteção temporal/única no banco;
5. ledger e registros oficiais forem append-only;
6. restore isolado de mundo preservar FKs e watermarks;
7. o schema validar e o diff da migration for revisado por Dados e pelo dono do contexto.

## 7. Situação de B-06

**B-06 está fechado no nível de decisão e especificação:** há modelo físico escolhido, regra de materialização, ownership, constraints, separação estado/histórico/configuração e gate de migration. Implementar migrations pertence ao desenvolvimento da infraestrutura de dados; sua ausência agora não é lacuna documental, mas impede banco de produção até o gate da §6.
