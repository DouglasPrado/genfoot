# Plataforma, Segurança e Operações

> **Status:** CANÔNICO · **Fontes:** chats/ux-do-jogo.md · **Revisão:** 2026-07-10

Este documento consolida as decisões de **administração técnica, segurança, auditoria, operações do mundo, arquitetura de serviços e integridade do modelo de dados** do **Grinta**. A premissa que atravessa tudo é uma só:

> A administração técnica pode **corrigir o funcionamento do mundo**, mas **não pode administrar secretamente a competição**.

A plataforma protege o mundo — disponibilidade, consistência, segurança e recuperabilidade — sem deter poder oculto sobre resultados, saldos ou classificações. Toda ação relevante é auditável, recuperável e explicável.

## Sumário

1. [Princípios](#1-princípios)
2. [Modelo de permissões por função](#2-modelo-de-permissões-por-função)
3. [Autenticação e autorização do jogador](#3-autenticação-e-autorização-do-jogador)
4. [Reautenticação e ações críticas](#4-reautenticação-e-ações-críticas)
5. [Auditoria de ações administrativas](#5-auditoria-de-ações-administrativas)
6. [Correções administrativas e suporte](#6-correções-administrativas-e-suporte)
7. [Feature flags e kill switches](#7-feature-flags-e-kill-switches)
8. [Filas, jobs e projeções](#8-filas-jobs-e-projeções)
9. [Observabilidade, alertas e incidentes](#9-observabilidade-alertas-e-incidentes)
10. [Backups, snapshots e recuperação](#10-backups-snapshots-e-recuperação)
11. [Deployment, manutenção e migrações](#11-deployment-manutenção-e-migrações)
12. [Arquitetura técnica](#12-arquitetura-técnica)
13. [Modelo de dados e integridade](#13-modelo-de-dados-e-integridade)
14. [Pendências resolvidas](#14-pendências-resolvidas)

---

## 1. Princípios

- Nenhum funcionário interno recebe **acesso total por padrão**; permissões são concedidas por função e por **menor privilégio**.
- Acesso a **produção é restrito** e exige autenticação reforçada.
- Administração **técnica** e **competitiva** são separadas: um engenheiro não decide sozinho um resultado esportivo.
- Administração da **plataforma** e de **mundos** são separadas: administrar um mundo não concede acesso global.
- Nenhuma ação técnica cria dinheiro, jogadores ou resultados sem processo oficial.
- Nenhuma correção acontece silenciosamente; toda operação relevante é auditável, recuperável e explicável.
- O servidor é autoritativo e **nunca confia no cliente**; o cache **nunca é fonte de verdade**.
- **Dinheiro real e economia do jogo são separados**; nenhuma operação técnica confunde os dois.
- **Produção tem identificação visual própria**, para evitar erro de ambiente.

### Domínios administrativos

`PLATFORM_ADMINISTRATION` · `WORLD_OPERATIONS` · `TECHNICAL_OPERATIONS` · `CUSTOMER_SUPPORT` · `SECURITY_OPERATIONS` · `MODERATION_OPERATIONS` · `DATA_OPERATIONS` · `FINANCIAL_OPERATIONS` · `COMPETITION_OPERATIONS` · `INCIDENT_RESPONSE` · `COMPLIANCE_OPERATIONS`

---

## 2. Modelo de permissões por função

Cada operador tem apenas os **sistemas, mundos, ações, período e dados necessários**. As funções administrativas previstas:

| Função | Alcance |
| --- | --- |
| `PLATFORM_OWNER` | Gerencia administradores principais, aprova políticas globais, autoriza alto impacto e acesso emergencial; não executa rotina |
| `PLATFORM_ADMIN` | Configura serviços e ambientes, coordena manutenção; sem acesso automático a mensagens privadas, dados médicos, competição ou contas |
| `SECURITY_ADMIN` / `SECURITY_ANALYST` | Investigam sessões suspeitas, acesso indevido, vazamentos, fraude, incidentes internos |
| `SITE_RELIABILITY_ENGINEER` | Consulta saúde, reinicia workers, retoma jobs, abre manutenção, executa runbooks |
| `DATABASE_OPERATOR` | Operações de banco autorizadas |
| `DEPLOYMENT_OPERATOR` | Deployments e rollback |
| `DATA_ENGINEER` | Operações de dados |
| `WORLD_OPERATOR` | Estado, calendário e manutenções específicas do mundo |
| `COMPETITION_OPERATOR` | Recursos, resultados administrativos, licenças, punições, regulamentos (âmbito competitivo, separado do técnico) |
| `SUPPORT_AGENT` / `SUPPORT_SUPERVISOR` | Consulta conta e processos, orienta, reenvia comunicação; **não** altera saldo/transferências/contratos/resultados nem lê mensagens privadas |
| `MODERATOR` / `MODERATION_SUPERVISOR` | Moderação |
| `COMPLIANCE_REVIEWER` | Conformidade |
| `AUDITOR` | Somente leitura de ações, aprovações, correções, incidentes, acessos, evidências permitidas |
| `READ_ONLY_ANALYST` | Somente leitura analítica |

### Matriz de ações

Cada ação é classificada: `VIEW` · `INVESTIGATE` · `PROPOSE` · `APPROVE` · `EXECUTE` · `ROLLBACK` · `EXPORT` · `DELETE` · `ANONYMIZE` · `IMPERSONATE` · `BREAK_GLASS`.

### Escopo das permissões

Uma permissão pode ser limitada por: `environment`, `gameWorldId`, `service`, `entityType`, `entityId`, `operation`, `dataClassification`, `validFrom`, `validUntil`.

Ambientes: `LOCAL` · `DEVELOPMENT` · `TEST` · `STAGING` · `PRODUCTION` · `DISASTER_RECOVERY`.

> Regra fechada: **permissão em teste não concede permissão em produção**.

### Contas e sessões

- Operadores usam **conta administrativa separada** da conta de jogo, com autenticação reforçada e histórico próprio; a conta administrativa não é usada para jogar.
- Sessões administrativas são **curtas e auditadas**, com estados `ACTIVE`, `IDLE`, `REAUTHENTICATION_REQUIRED`, `RESTRICTED`, `SUSPICIOUS`, `REVOKED`, `EXPIRED`.
- Permissões elevadas e acesso temporário exigem **motivo, aprovação, escopo e expiração**; acesso emergencial (`BREAK_GLASS`) é excepcional e sempre revisado.

### Segregação de funções e conflito de interesse

A mesma pessoa não deve propor e aprovar sua própria correção crítica, investigar denúncia contra si, criar e validar seu próprio acesso emergencial, ou executar e auditar sozinha a mesma ação. O sistema pode **bloquear automaticamente** quando o operador participa do mundo afetado, controla clube nele, está denunciado no caso ou é autor da ação investigada.

Ver [anti-abuso e onboarding (design)](../01-game-design/09-anti-abuso-e-onboarding.md).

---

## 3. Autenticação e autorização do jogador

A autenticação inicial é **própria da plataforma**, com possibilidade de provedores externos no futuro. Ela utiliza:

- **Senhas com Argon2id** (hashing).
- **Access token de curta duração** — contém apenas identificador, sessão, escopos mínimos e versão de autenticação; **não** carrega permissões de clube completas, dados privados nem estado mutável extenso.
- **Refresh token rotativo** — armazenado de forma protegida, vinculado à sessão, revogável e **detectável em caso de reutilização**.
- **Sessões persistidas** e **revogação**.
- **Segundo fator (2FA)**: opcional para jogadores, **obrigatório para administradores**.

A **autorização é sempre calculada no servidor** (nunca no cliente), combinando usuário, sessão, mundo, clube, função e autonomia. Isso decorre do princípio de que o servidor é autoritativo — ver [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md) para o modelo de cliente não-autoritativo.

> **Decisão ratificada — R-85:** provedores de identidade externos. Proposta: manter o **login próprio (Argon2id)** como base e adicionar, quando houver demanda, **OAuth/OIDC com Google e Apple** primeiro (cobrem a maioria do público mobile e o *Sign in with Apple* é exigência de loja quando há outro login social no app), com a plataforma como **fonte de verdade da conta** (o provedor externo apenas autentica; papéis, permissões e vínculo com clube/mundo continuam calculados no servidor). Provedores corporativos/SAML ficam fora de escopo até haver necessidade B2B. Racional: cobre o essencial de conveniência sem multiplicar integrações nem enfraquecer o modelo de autorização server-side. Compartilha **R-85** com os parâmetros de drenagem (§11).

---

## 4. Reautenticação e ações críticas

Exigem **reautenticação**: exportar dados, acessar dados sensíveis, assumir sessão de suporte, aplicar correção, executar rollback, alterar permissão e usar acesso emergencial.

Ações de alto impacto exigem **aprovação dupla** (`FOUR_EYES_APPROVAL`): restaurar mundo, corrigir resultado oficial, reverter transferências em massa, excluir grande volume de dados, alterar economia global, ativar acesso emergencial e modificar histórico homologado.

---

## 5. Auditoria de ações administrativas

O **log de auditoria é separado** do log técnico/de aplicação. Ele é durável, estruturado, **imutável por operação comum**, consultável, exportável com permissão, e sempre ligado à ação e ao ator.

Toda ação administrativa responde: **quem** executou, em qual **ambiente** e **mundo**, sobre qual **entidade**, por qual **motivo** e **autorização**, qual o **estado anterior** e o **novo**, quem foi afetado, se é **reversível** e se houve **revisão independente**.

### Evento de auditoria (contrato mínimo)

`auditEventId` · `environment` · `actorType` · `actorId` · `sessionId` · `action` · `targetType` · `targetId` · `gameWorldId` · `reason` · `ticketReference` · `approvalReferences` · `beforeReference` · `afterReference` · `result` · `occurredAt` · `integrityHash` · `version`.

Atores possíveis: `USER`, `STAFF_AI`, `SYSTEM`, `ADMIN_OPERATOR`, `SUPPORT_AGENT`, `MODERATOR`, `INTEGRATION`, `MIGRATION`, `RECOVERY_PROCESS`.

### Imutabilidade

Correções no log **nunca sobrescrevem** o evento original: geram evento complementar, com explicação e referência ao evento anterior.

### Cobertura obrigatória

São auditados: login administrativo e falhas de autenticação, permissões, elevação temporária, acesso emergencial, dados sensíveis visualizados, exportações, impersonação, correções, scripts, jobs, backups, restaurações, migrações, deployments, feature flags, incidentes, alterações de mundo, anonimizações, exclusões, ações de organizadores e **tentativas bloqueadas**.

### Logs técnicos e correlação

- Tipos de log: `APPLICATION_LOG` · `SECURITY_LOG` · `AUDIT_LOG` · `ACCESS_LOG` · `DATABASE_LOG` · `JOB_LOG` · `INTEGRATION_LOG` · `INCIDENT_LOG`.
- Estrutura mínima: `timestamp`, `environment`, `service`, `severity`, `traceId`, `requestId`, `gameWorldId`, `userId`, `operatorId`, `entityType`, `entityId`, `eventCode`, `message`, `metadata`.
- Severidade: `TRACE` · `DEBUG` · `INFO` · `WARN` · `ERROR` · `CRITICAL`. Regra fechada: **eventos competitivos normais não são registrados como erros técnicos**.
- **Proibido em logs comuns**: senhas, tokens completos, chaves, diagnósticos completos, mensagens privadas completas, dados de cartão e documentos pessoais completos.
- Uma operação é rastreável por `traceId`, `requestId`, `commandId`, `eventId`, `jobId` e `incidentId`.

### Classificação de dados e mascaramento

- Níveis: `PUBLIC` (resultados, tabelas, perfis públicos, títulos) · `INTERNAL` (métricas de serviço, config não sensível, estado de filas, versões) · `CONFIDENTIAL` (finanças privadas do clube, estratégias, relatórios de observação, contratos não publicados, diagnósticos médicos) · `RESTRICTED` (mensagens privadas, evidências de moderação, informações de segurança, dados pessoais, sessões) · `HIGHLY_RESTRICTED` (segredos, chaves, tokens, material de recuperação, credenciais, dados financeiros externos completos).
- Interfaces internas **mascaram** e-mails, telefones, tokens, documentos, endereços, dados de pagamento e segredos.
- **Revelação temporária** exige permissão, reautenticação, motivo, duração curta e auditoria.
- Buscas por dado sensível (e-mail, telefone, endereço técnico, identificador de pagamento) exigem permissão específica e geram auditoria.

### Auditoria vs. narrativa

A auditoria (registro técnico de quem fez o quê no sistema) é **distinta da narrativa do jogo** (a história pública/esportiva que os usuários leem). Segredos competitivos não aparecem em métricas nem logs; a auditoria interna não vira conteúdo narrativo.

> A regra reforçada em todo o bloco: a administração pode corrigir o mundo, mas **não pode administrar secretamente a competição**. Organizadores de mundos privados têm poderes limitados e **não podem alterar resultados ou saldos**; organizadores que também competem sofrem restrições adicionais.

### Organizadores de mundos privados

- **Podem**: convidar, gerir canais, publicar anúncios, configurar regras permitidas, solicitar correções e moderar casos leves.
- **Não podem**: consultar dados pessoais internos, ver atributos secretos, criar dinheiro, editar jogadores, alterar resultados, apagar dívidas, executar restore, acessar banco, ver logs de segurança ou assumir conta.
- **Organizador que também compete** tem restrições extras: não moderar caso próprio, não acessar informação privada de rival, não alterar regras durante disputa sem processo, não remover concorrente sem revisão e não controlar o calendário arbitrariamente.

---

## 6. Correções administrativas e suporte

- Correções usam **comandos estruturados** que validam regras e invariantes; **edição direta de banco é excepcional**.
- Scripts administrativos são versionados e revisados; correções em lote têm **dry run**; ações críticas têm **plano de rollback**.
- Correções preservam o **histórico anterior** (`beforeSnapshotReference` / `afterSnapshotReference`), com `reason`, `ticketReference`, `dryRunResult`, `rollbackPlan`.
- Correções financeiras usam **estornos e lançamentos** (nunca sobrescrita); correções de transferência tratam todas as dependências.
- Estatísticas e classificações podem ser **reconstruídas**, mas **tabelas alteradas exigem nova validação oficial**; a **população de jogadores não é regenerada arbitrariamente**; **replays em produção exigem operação formal**.

### Tipos, estados e escopo da correção

- Tipos: `DATA_CORRECTION` · `STATE_REPAIR` · `EVENT_REPLAY` · `EVENT_COMPENSATION` · `PROJECTION_REBUILD` · `TRANSACTION_REVERSAL` · `HISTORICAL_CORRECTION` · `ACCESS_CORRECTION` · `CONFIGURATION_CORRECTION`.
- Estados: `DRAFT` → `VALIDATING` → `DRY_RUN_COMPLETED` → `AWAITING_APPROVAL` → `APPROVED` → `SCHEDULED` → `EXECUTING` → `PARTIALLY_COMPLETED`/`COMPLETED`/`FAILED` → `ROLLING_BACK` → `ROLLED_BACK`/`CANCELLED`.
- **Correção de projeção** (fato oficial correto, tela/estatística errada): reconstrói projeção, invalida cache, reindexa busca e mantém os fatos intactos. **Correção de fato-base**: processo reforçado, com avaliação de dependências, nova versão, compensações, comunicação e auditoria.
- **Compensação**: quando a ação original não pode ser apagada, cria-se evento compensatório que reverte o efeito, preserva histórico e atualiza projeções.
- **Limite de escopo**: todo job de correção exige mundo, temporada, tipo, filtro, quantidade máxima e confirmação do total; um script que afeta mais entidades que o esperado é bloqueado.
- **Jogador duplicado** é consolidado (registro principal, migração de relações, contratos e estatísticas, redirecionamentos, auditoria preservada), não apagado.

### Correção em partida ao vivo e pós-partida

- Operação manual em partida ao vivo é **apenas técnica**: pausar, reiniciar transmissão, reconectar serviço, recuperar snapshot, marcar incidente. **Nunca** inserir gol, remover cartão, ordenar substituição, alterar aleatoriedade ou mudar tática.
- **Correção de resultado é do processo competitivo**, mesmo quando causada por bug técnico: a equipe técnica fornece evidências, corrige cálculo e reprocessa dependências, mas não decide campeão, pontuação administrativa nem sanção esportiva.
- Se o motor produz estado inválido, o resultado fica **pendente**, um incidente é aberto e a competição decide os efeitos oficiais.

### Privacidade, anonimização e retenção

- Dados pessoais podem ser **anonimizados sem apagar fatos competitivos** (resultados e histórico permanecem).
- **Exportações respeitam a privacidade de terceiros**; dados de outras pessoas são omitidos ou mascarados.
- **Legal hold** é suportado: dados sob retenção legal não são apagados nem anonimizados enquanto ela vigorar.
- **Dados de produção não são usados em testes sem proteção**; dados **sintéticos** são preferidos.
- Solicitações de privacidade cobrem: acesso, correção, exportação, exclusão, restrição e anonimização.
- **Separação dado pessoal × fato competitivo**: nome pessoal e identidade de conta podem ser removidos/anonimizados; resultados, clube, transferências e controle histórico (anonimizado) **permanecem**, com auditoria essencial conforme política.
- **Exportação** inclui só dados permitidos do próprio usuário — nunca segredos de outros clubes, mensagens de terceiros sem base, evidências internas protegidas, atributos ocultos ou dados de segurança.
- Exclusão em processamento: `REQUESTED` → `IDENTITY_VERIFICATION` → `UNDER_REVIEW` → `WAITING_RETENTION_PERIOD` → `ANONYMIZING` → `COMPLETED` (`REJECTED`/`CANCELLED`).

### Suporte

Impersonação é **somente leitura por padrão**; suporte não joga pelo usuário. Sessões de suporte (`supportAccessSessionId`) são **visíveis, temporárias, aprovadas** e notificam o usuário (`userNotificationId`).

- **Verificação de identidade** é exigida antes de operar sobre conta; informação fornecida em conversa **não basta** para operações de alto risco.
- Estados do ticket: `OPEN` · `TRIAGED` · `WAITING_USER` · `WAITING_INTERNAL` · `IN_PROGRESS` · `ESCALATED` · `RESOLVED` · `CLOSED` · `REOPENED` · `DUPLICATE` · `INVALID`.
- Modos de impersonação: `READ_ONLY_IMPERSONATION` (padrão, só visualiza) e `ASSISTED_IMPERSONATION` (navegação guiada; ações críticas ainda exigem confirmação do usuário).
- **Proibido durante impersonação**: transferir jogador, alterar senha, aceitar contrato, gastar recursos, excluir conta, enviar mensagem como usuário, controlar partida e desativar segurança.
- Disputas de propriedade de clube **não são decididas pelo suporte sozinho**: seguem processo específico de conta e governança.

---

## 7. Feature flags e kill switches

Toda flag possui **responsável, motivo, escopo e prazo** (`reviewAt`, `expiresAt`, `removalPlan`); flags antigas são removidas.

- Escopos: `GLOBAL`, `ENVIRONMENT`, `REGION`, `WORLD`, `USER_COHORT`, `USER`, `SERVICE`.
- **Regras competitivas não são alteradas por flags invisíveis** nem ativadas apenas para alguns clubes de um mesmo contexto oficial — nenhuma flag gera vantagem competitiva seletiva.
- **Kill switches** desativam rapidamente mercado, chat, notificações externas, funcionalidade nova, integração ou job defeituoso.
- Configurações dinâmicas são versionadas.

---

## 8. Filas, jobs e projeções

- Jobs administrativos têm estados, **heartbeat** e **checkpoint**, são **idempotentes** e retomáveis quando parcialmente concluídos.
- Filas críticas são duráveis, com **dead letter handling**: mensagens defeituosas são isoladas sem travar a fila; reprocessamentos **não duplicam eventos**.
- Eventos são gravados em **outbox transacional**; consumidores usam **inbox** e são todos idempotentes. A mensageria garante entrega **ao menos uma vez**, tolerada pela idempotência.
- Eventos têm **versão**; eventos do mundo têm **sequência** ordenada.
- **Projeções (read models) podem ser reconstruídas** por jobs de rebuild; não há event sourcing completo obrigatório, mas eventos relevantes são imutáveis. Consultas pesadas usam projeções ou jobs.
- Conciliações validam os principais domínios continuamente.

### Tipos, estados e contrato do job

- Tipos: `SCHEDULED_JOB` · `EVENT_CONSUMER` · `BATCH_JOB` · `MIGRATION_JOB` · `REBUILD_JOB` · `CLEANUP_JOB` · `RECONCILIATION_JOB` · `BACKUP_JOB` · `RESTORE_JOB`.
- Estados: `CREATED` → `QUEUED` → `STARTING` → `RUNNING` → `PAUSED`/`WAITING_DEPENDENCY`/`RETRYING` → `PARTIALLY_COMPLETED`/`COMPLETED`/`FAILED`/`CANCELLED`/`DEAD_LETTERED`. Job sem heartbeat vira `STALLED` (investigado, retomado, cancelado ou reatribuído).
- Contrato mínimo: `jobId`, `jobType`, `environment`, `gameWorldId`, `status`, `parameters`, `checkpoint`, `progress`, `attemptCount`, `startedAt`, `lastHeartbeatAt`, `completedAt`, `failureReason`, `idempotencyKey`, `version`.
- Cancelamento: `GRACEFUL`, `IMMEDIATE`, `AFTER_CURRENT_ITEM`. Jobs parciais expõem itens concluídos/falhos/pendentes, possibilidade de retomada e efeitos já persistidos.

### Conciliação (reconciliation)

- Verifica: contratos×registros, lançamentos×saldos, partidas×tabelas, jogadores×clubes, eventos×projeções, locks, filas, notificações e ativos comerciais.
- Frequência: contínua, diária, semanal, na transição, sob demanda ou após incidente.
- Resultado: `CONSISTENT` · `MINOR_DIFFERENCES` · `REPAIRABLE` · `CRITICAL_INCONSISTENCY` · `MANUAL_REVIEW_REQUIRED`.

### DLQ, poison message, ordenação e backpressure

- Dead letter guarda motivo, payload protegido, tentativas, serviço e data; o reprocessamento revalida schema e estado, preserva `eventId` e impede duplicidade.
- **Poison message** (evento que sempre falha) é isolada para não bloquear a fila inteira.
- Filas críticas podem exigir **ordenação** por mundo, entidade, agregado, partida ou contrato.
- **Backpressure**: sob sobrecarga, reduz produção não crítica, aumenta workers, prioriza eventos críticos, agrupa atualizações e alerta operações.

---

## 9. Observabilidade, alertas e incidentes

- Observabilidade combina **métricas, logs, traces e invariantes**; OpenTelemetry desde o início, com Prometheus, Grafana, Loki e Tempo.
- **Métricas internas não revelam segredos competitivos.**
- **Alertas têm responsável**, são agrupados quando duplicados, e disparam quando invariantes são violadas.
- Incidentes têm `severity`, `incidentCommanderId` e `responderIds`; usuários afetados recebem comunicação contextual; incidentes relevantes têm revisão posterior com ações corretivas responsabilizadas e com prazo.
- Verificação **contínua de invariantes**; auto-repair só em situações comprovadamente seguras.
- **Capacidade e armazenamento são monitorados**; logs têm **correlação distribuída** (trace/correlation IDs) ligando ação, evento e efeito.

### Composição, métricas e health checks

- Pilares: `METRICS` · `LOGS` · `TRACES` · `EVENTS` · `AUDIT` · `SYNTHETIC_CHECKS` · `BUSINESS_INVARIANTS`.
- Métricas **técnicas** (latência, taxa de erro, CPU, memória, disco, conexões, fila, tempo de job, disponibilidade, cache) e **de negócio operacionais** (partidas iniciadas/travadas, transferências concluídas, pagamentos duplicados bloqueados, mundos atrasados, jobs diários, erros de inscrição, conflitos de versão).
- **Métricas competitivas protegidas**: não revelam potencial real dos jogadores, seeds futuros, aleatoriedade de partidas, estratégias privadas nem alvos de mercado.
- Tracing distribuído liga API, serviço, banco, fila, worker, notificação e integração. Dashboards por plataforma, mundo, serviço, competição, partida, transição, mercado, segurança e backups.
- Health checks: `LIVENESS` (processo vivo) · `READINESS` (pode receber tráfego) · `DEPENDENCY` · `DEEP_HEALTH` (testa banco/fila/cache/storage/integrações/consistência mínima, sem execução excessiva). **Synthetic checks** simulam fluxos controlados (login técnico, consulta de mundo, criação em teste, leitura de calendário, evento sintético).

### Incidentes: severidade, estados e timeline

- Severidade: `SEV_5_INFORMATIONAL` (sem impacto visível) · `SEV_4_MINOR` (interface parcialmente degradada) · `SEV_3_MAJOR` (função relevante indisponível para grupo) · `SEV_2_CRITICAL` (mundo/serviço crítico comprometido) · `SEV_1_CATASTROPHIC` (risco de perda ampla de dados, segurança ou indisponibilidade geral).
- Estados: `DETECTED` → `ACKNOWLEDGED` → `INVESTIGATING` → `MITIGATING` → `MONITORING` → `RESOLVED` → `POST_INCIDENT_REVIEW` → `CLOSED` (`REOPENED` possível). Estado público: `INVESTIGATING`/`IDENTIFIED`/`MITIGATING`/`MONITORING`/`RESOLVED`.
- A **timeline** registra detecção, primeira resposta, escalonamento, mitigação, recuperação, resolução e comunicação.
- **Comunicação segmentada**: só usuários afetados recebem alertas específicos, salvo incidente global. Mitigação pode desativar função, entrar em somente leitura, pausar fila, reduzir carga, trocar dependência, restaurar réplica, reverter deployment ou aplicar feature flag. Resolução exige serviço estável, integridade validada, processamentos pendentes tratados e usuários informados.

### Post-incident review e ações corretivas

- A revisão identifica impacto, linha do tempo, causa, fatores contribuintes, detecção, resposta, o que funcionou/falhou e ações preventivas.
- **Cultura sem culpabilização simplista**: foco em sistema, processo, barreiras, decisões e contexto — sem impedir responsabilização por abuso deliberado.
- Ações corretivas têm responsável, prioridade, prazo, evidência de conclusão e estado: `OPEN` · `PLANNED` · `IN_PROGRESS` · `BLOCKED` · `COMPLETED` · `CANCELLED` · `OVERDUE`.

### Invariantes e auto-repair

- Exemplos de invariante técnica: um mundo tem uma data oficial ativa; um clube tem um controlador principal; um pagamento não é liquidado duas vezes; um contrato não está ativo e expirado ao mesmo tempo; uma partida oficial tem resultado consistente; um job concluído não reexecuta sem nova tentativa registrada.
- Verificação após comando, evento, job periódico, transição, deployment e restauração. Violação crítica **bloqueia operações relacionadas**, cria incidente, preserva estado e evita correção automática arriscada.
- **Auto-repair** só em situações bem definidas, reversíveis e testadas (reconstruir cache, recriar projeção, liberar lock expirado, reenfileirar evento seguro). **Nunca** decide campeão, destino de dinheiro controverso, razão em disputa, anulação de transferência nem autor de gol.

### Estado operacional do mundo

- Estados: `HEALTHY` · `DEGRADED` · `AT_RISK` · `MAINTENANCE` · `READ_ONLY` · `RECOVERING` · `SUSPENDED` · `ARCHIVED`.
- `AT_RISK`: mundo ainda funciona, mas com fila crescente, backup atrasado, falha de conciliação, capacidade no limite, dependência instável ou job crítico em retry.
- **Somente leitura automático** entra quando integridade financeira falha, há duplicidade de jogadores, sequência de eventos quebra, banco fica inconsistente ou segurança exige contenção. A saída exige causa resolvida, invariantes válidas, jobs conciliados, aprovação, comunicação e monitoramento reforçado.

---

## 10. Backups, snapshots e recuperação

- Backups são **automáticos, criptografados e validados**; ficam **fora** do servidor principal (WAL-G + Cloudflare R2).
- **Um backup não testado não é válido** — é marcado como tal; testes de restauração são periódicos.
- **Snapshots do mundo são consistentes**; partidas em andamento têm política de snapshot própria.
- Restaurações são validadas em ambiente isolado quando necessário e **não duplicam eventos**; efeitos externos não são repetidos em replay.
- Mundos podem ser restaurados **isoladamente** — falha de um mundo não corrompe os demais, e falha de um serviço não derruba a plataforma (degradação graciosa).
- Recuperação de desastre tem **runbook** e exercícios praticados; **integridade tem prioridade sobre reabertura rápida**.

### Tipos, RPO/RTO e estados

- Tipos de backup: `FULL` · `INCREMENTAL` · `TRANSACTION_LOG` · `SNAPSHOT` · `CONFIGURATION` · `OBJECT_STORAGE` · `AUDIT_ARCHIVE`.
- **RPO** (*Recovery Point Objective*): máximo de dados que se aceita perder. **RTO** (*Recovery Time Objective*): tempo-alvo para restaurar o serviço. Ambos definidos por política, junto de frequência, retenção, local, criptografia, redundância, teste e responsável.
- Backups isolados protegem contra exclusão acidental, credencial comprometida, ransomware, corrupção e falha regional; criptografia **em trânsito e em repouso**, com gestão separada de chaves.
- Estados do backup: `SCHEDULED` → `RUNNING` → `COMPLETED` → `VALIDATING` → `VALID`/`INVALID`/`FAILED` → `EXPIRED`/`DELETED`. Backup não testado é marcado `UNVERIFIED_BACKUP`.

### Restauração, replay e disaster recovery

- Tipos de restauração: `FULL_PLATFORM_RESTORE` · `WORLD_RESTORE` · `SERVICE_RESTORE` · `DATABASE_RESTORE` · `ENTITY_REPAIR` · `POINT_IN_TIME_RECOVERY`.
- Pré-condições: incidente aberto, backup validado, escopo, plano, comunicação, aprovação, ambiente de validação e estratégia para eventos posteriores.
- Estados: `REQUESTED` → `PLANNING` → `AWAITING_APPROVAL` → `RESTORING_TO_ISOLATED_ENVIRONMENT` → `VALIDATING` → `READY_TO_APPLY` → `APPLYING` → `REPLAYING_EVENTS` → `VERIFYING` → `COMPLETED`/`FAILED`/`ROLLED_BACK`.
- **Replay** reaplica eventos posteriores ao backup apenas se íntegros, idempotentes e com schema compatível; evento suspeito **interrompe** o replay. Integrações externas usam **modo seguro** para não cobrar, enviar e-mail, criar pagamento ou publicar mensagem novamente.
- Disaster recovery cobre perda de região, banco, storage, credencial comprometida, corrupção ampla, falha de provedor e exclusão acidental; ativações e exercícios são registrados. **Continuidade degradada** prioriza segurança, estado dos mundos, partidas em andamento e processamentos críticos.

---

## 11. Deployment, manutenção e migrações

### Deployment

- Estados: `PLANNED` → `APPROVED` → `DEPLOYING` → `VERIFYING` → `COMPLETED`/`FAILED` → `ROLLING_BACK` → `ROLLED_BACK`/`CANCELLED`.
- Estratégias: `ROLLING`, `BLUE_GREEN`, `CANARY`, `RECREATE`, conforme capacidade.
- Verificação pós-deployment: health checks, taxa de erro, latência, jobs, filas, invariantes, fluxos críticos e logs. **Rollback** dispara quando erros críticos sobem, invariantes falham, processamento quebra, migração é incompatível ou segurança é afetada.
- **Código antigo × schema novo**: a compatibilidade é planejada para permitir rollback seguro; um deployment incompatível é bloqueado ou exige migração compatível.
- **Drenagem na troca de versão (graceful drain)**: durante a atualização, a substituição de instâncias respeita drenagem ordenada (fonte: escopo estrutural-operacional §6.3 e §23.4):
    - Serviços **sem estado** só são substituídos após aprovação de saúde da nova instância.
    - **Conexões de tempo real entram em drenagem**, orientam a reconexão e preservam a resincronização — o cliente detecta lacunas, solicita resincronização e recebe um retrato de estado válido antes de continuar; **a reinicialização da conexão não reinicia a partida**.
    - **Processos de execução** param de buscar novas tarefas, concluem ou devolvem as tarefas ativas e salvam pontos de recuperação (checkpoints).
    - **Executores de partida antigos deixam de receber partidas novas e concluem as já iniciadas**; uma nova versão do executor recebe **apenas partidas novas** enquanto a versão anterior finaliza as em andamento.
    - Novas versões podem ser liberadas **progressivamente por mundos ou escopos controlados**; a reversão reutiliza artefatos anteriores, **sem recompilação**.

> **Decisão ratificada — R-85:** parâmetros de drenagem na troca de versão (1ª passada). **Drain de conexões de tempo real** com janela de **30 s** (orienta reconexão e ressincronização; após o prazo, força reconexão do cliente, que solicita retrato de estado); **partidas em andamento** concluídas pelo executor antigo com **teto de 10 min** antes de forçar **checkpoint + handoff** ao novo executor (a partida não reinicia); **processos de execução** param de puxar novas tarefas imediatamente e têm **até 60 s** para concluir/devolver a tarefa ativa antes do checkpoint. Racional: janelas curtas para não travar o deploy, com teto de partida alto o suficiente para a maioria terminar naturalmente. Compartilha **R-85** com os provedores de identidade (§3). Calibrar por telemetria de duração real de partida/handoff.

### Manutenção

- Tipos: `PLANNED`, `EMERGENCY`, `WORLD_SPECIFIC`, `SERVICE_SPECIFIC`, `DATABASE`, `MIGRATION`, `SECURITY`.
- A janela define início, duração, serviços, mundos, prazos, partidas, modo de acesso e comunicação.
- **Congelamento de prazo**: durante manutenção, prazos podem continuar, ser estendidos, congelados ou reabertos — a política é definida antes quando possível.
- Manutenção emergencial começa sem aviso longo, mas informa assim que possível, registra motivo, protege partidas/prazos e produz revisão posterior.

### Migrações

Migrações são versionadas, testadas e retomáveis, com estados `DRAFT` → `REVIEWED` → `TESTED` → `APPROVED` → `SCHEDULED` → `RUNNING` → `VALIDATING` → `COMPLETED`/`FAILED`/`ROLLED_BACK`/`MANUAL_INTERVENTION_REQUIRED`. Princípios: compatibilidade, idempotência, checkpoints, monitoramento, backup, dry run quando possível, validação e rollback/compensação.

Migrações **destrutivas** ocorrem em etapas (**expand-contract**):

```
Parar escrita  →  Migrar leitura  →  Validar  →  Arquivar dado  →  Remover posteriormente
```

**Backfills** são particionados, retomáveis, não bloqueiam produção, validam valores, registram progresso e evitam duplicidade. Deployments têm verificação prévia e rollback; um deployment incompatível é bloqueado ou exige migração compatível. Seeds estruturais são idempotentes.

---

## 12. Arquitetura técnica

> Detalhamento em [Arquitetura de dados e transações](./01-arquitetura-de-dados.md).

- **Monólito modular** (sem microsserviços prematuros); processos especializados (ex.: motor de partidas) implantados à parte.
- Backend **NestJS/TypeScript** (candidato preferencial — ver pendência de framework de API em [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md)); **dois clientes distintos** — o **app do jogador é Expo/React Native (nativo)** e o **admin é Next.js** —, detalhados em [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md) e [`../04-ui-ux/`](../04-ui-ux/); monorepo pnpm + Turborepo.
- **PostgreSQL** como banco principal, **Prisma** como ORM, **Redis** para cache/estado temporário, **RabbitMQ** para mensageria, **Cloudflare R2** para arquivos e backups.
- API principal **REST versionada**; tempo real por **WebSocket/Socket.IO**, que **não é fonte de verdade**.
- Commands idempotentes; agregados críticos com **concorrência otimista**; servidor autoritativo.
- **Redis nunca armazena sozinho** saldos, contratos ou resultados; prazos oficiais persistem no PostgreSQL. A perda do Redis causa degradação, não perda de mundo.
- **Scheduler com leases**: apenas um scheduler avança cada mundo; motor de partidas isolado, determinístico, registra seed e versão, usa checkpoints e sobrevive à perda do worker.
- Cada partida tem um **único actor lógico**; **partidas offline usam o mesmo motor**; a **IA não conhece dados secretos** dos clubes.
- Processos longos usam **sagas** com compensação; **sem 2PC**. CQRS pragmático.
- Implantação inicial no **EasyPanel** (R2 externo); PostgreSQL/Redis/RabbitMQ não públicos; tráfego público HTTPS; health checks. CI/CD por GitHub Actions, imagens no GHCR; ambientes separados; segredos fora do código; dev local em Docker Compose; staging reproduz a arquitetura de produção; configurações validadas na inicialização.

### Endurecimento e segurança de aplicação

- **Rate limiting** protege contra abuso, aplicável por conta, sessão, endereço, mundo, comando, serviço e risco — sem prejudicar ações legítimas próximas de prazo; comandos repetidos são idempotentes.
- **Proteção contra replay de comando**: comandos críticos usam `commandId`, `idempotencyKey`, timestamp, sessão, assinatura/token e janela de validade. Conhecer um identificador **não** concede autoridade.
- **Vulnerabilidades têm processo próprio** com estados `REPORTED` → `TRIAGED` → `CONFIRMED` → `MITIGATING` → `PATCHED` → `VERIFYING` → `RESOLVED` (`DUPLICATE`/`NOT_APPLICABLE`); severidade considera impacto, explorabilidade, dados, privilégio, escopo e disponibilidade de exploração. Há **divulgação responsável** com canal próprio e proteção a pesquisadores legítimos.
- **Dependências são monitoradas** (vulnerabilidades conhecidas, versões obsoletas, licenças, integridade de pacotes); atualização passa por testes, staging, verificação e rollback.
- **Cadeia de build** protege código, pipelines, artefatos, credenciais, assinaturas, dependências e deployments. O artefato tem versão, commit, build, checksum, ambiente, aprovação e data; um artefato alterado ou não reconhecido **não é implantado** (imagens rastreáveis no GHCR).
- **Segredos são rotacionáveis** (nova versão, atualização de consumidores, sobreposição quando necessário, revogação da versão antiga), ficam fora do código e **nunca aparecem em logs**; interfaces internas **mascaram** dados sensíveis.

### Segurança da API web

- **CORS controlado**, **headers de segurança**, **sanitização** de entrada e **logs seguros** são requisitos de base da API.
- **CSRF:** quando a autenticação usar cookies, há proteção CSRF apropriada.
- **XSS:** conteúdo gerado por usuários é escapado, sanitizado, limitado e renderizado de forma segura.
- **SQL injection:** o acesso usa Prisma e parâmetros; **SQL direto nunca concatena entrada do usuário**.
- **Upload malicioso:** todo upload é validado antes da publicação (ver também URLs assinadas em [Busca, analytics e arquivos](#busca-analytics-e-arquivos)).
- **Rate limiting diferenciado** por tipo de operação — login, commands, busca, mensagens, upload, WebSocket e partida — com **limite competitivo** que considera sessão, tipo, histórico, risco e janela para não bloquear commands legítimos perto do prazo.
- **Auditoria de command:** commands críticos registram `actor`, `session`, `device`, `commandId`, `expectedVersion`, `result` e `correlationId`.

### Capacidade, escalonamento e resiliência

- Capacidade é monitorada (crescimento do banco, eventos, arquivos, partidas, mundos, usuários, filas, cache, conexões); o planejamento considera tendência, sazonalidade, picos de partidas, fechamento de janela e transição de temporada.
- Escalonamento: `VERTICAL`, `HORIZONTAL`, `SCHEDULED`, `EVENT_DRIVEN`, `MANUAL`.
- **Prioridade sob carga**: segurança > comandos competitivos > partidas > processamentos obrigatórios > consultas essenciais > mercado > notificações > estatísticas > social > rebuilds históricos.
- **Degradação graciosa**: desativar gráficos avançados, atrasar rankings, agrupar notificações, pausar rebuilds e limitar busca histórica — mantendo partida e mercado ativos.
- **Proteção contra cascata**: timeouts, circuit breakers, filas, limites, isolamento, fallbacks e bulkheads. Dependência externa indisponível usa retry controlado, abre circuito, preserva comandos e evita avalanche.

### Busca, analytics e arquivos

- **Busca inicial no PostgreSQL**; motor externo de busca só por necessidade comprovada.
- **Analytics inicial** usa o banco principal e projeções.
- Arquivos vão **direto ao R2** quando possível; arquivos privados usam **URLs temporárias (assinadas)** e **uploads são validados**.

### Integrações externas

- Integrações usam **adapters**, com **credenciais isoladas** por integração; terceiros/fornecedores têm contrato, escopo, dados mínimos, chaves próprias, auditoria, revogação e limite de retenção.
- **Integração comprometida**: revogar credencial, bloquear tráfego, avaliar dados, abrir incidente, rotacionar segredos e informar afetados quando necessário.
- **Webhooks são autenticados, validados e idempotentes**; webhooks fora de ordem usam versão, estado, timestamp e identificador externo para impedir regressão de processo. **E-mail e push são assíncronos**.
- Pagamentos externos usam identificador idempotente, estado, reconciliação e webhook verificado — **dinheiro real da plataforma e economia fictícia do mundo são domínios separados**.

### Testes como parte da arquitetura

A estratégia de testes combina dez tipos, cada um cobrindo uma classe de risco:

| Tipo | Cobre |
| --- | --- |
| **Unitários** | Regras, políticas, objetos de valor, invariantes, cálculos e decisões — **sem depender de banco**. |
| **Integração** | Instâncias reais de PostgreSQL, Redis e RabbitMQ (preferencialmente via **Testcontainers**). |
| **Contrato** | API, eventos, WebSocket, schemas e compatibilidade entre versões. |
| **End-to-end** | Fluxos completos: criar mundo, entrar em clube, montar escalação, disputar partida, transferência, processar temporada. |
| **Concorrência** | Cenários obrigatórios: duas propostas pelo mesmo jogador, dois commands no mesmo contrato, dois schedulers no mesmo mundo, dois workers na mesma partida, pagamento repetido, aceite duplicado, retry de evento. |
| **Propriedade** | Invariantes: saldo não diverge do razão, jogador não pertence a dois clubes incompatíveis, soma de percentuais dentro do limite, calendário sem partida duplicada, simulação sempre termina em estado válido. |
| **Motor / golden** | Seeds fixas + **golden files**: uma seed e um snapshot produzem a sequência esperada de eventos para dada **versão do motor**. Mudança intencional de resultados **incrementa a versão do motor** e atualiza os golden files conscientemente; partidas antigas permanecem na versão anterior. |
| **Estatístico** | Milhares de simulações verificam distribuição de gols, cartões, lesões, posse, vantagem de mando e impacto tático, sem resultados impossíveis frequentes. |
| **Carga** | Muitos usuários conectados, rodada simultânea, fechamento de janela, transição de temporada, muitos eventos, notificações e busca histórica. |
| **Migração e recuperação** | Migrações de schema e recuperação após falha; testes de **arquitetura** protegem as fronteiras dos módulos.

---

## 13. Modelo de dados e integridade

O modelo é **relacional, histórico, versionado, auditável e preparado para múltiplos mundos e clusters** — o schema representa as regras do mundo e protege suas invariantes estruturais.

As convenções canônicas de modelagem — chaves (UUIDv7, escopo `(world_id, id)`), tipos (dinheiro em unidade mínima, PascalCase/snake_case, tempo real vs. tempo do mundo), uso de JSONB, particionamento por mundo (`gameWorldId`) e FKs compostas, invariantes protegidas no banco (constraints como última defesa) e o papel do Prisma fora do domínio — são definidas em [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md) (seção "Convenções de dados e tipos" e Decisões 19.7–19.10). O schema concreto (models e enums) está em [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md).

---

## 14. Pendências resolvidas

> **Resolvido (reconciliação):** o **Plano de Implementação / MVP / Fases / Critérios de Entrega** — ausente na fonte original — foi produzido e vive em [`./06-roadmap-de-implementacao.md`](./06-roadmap-de-implementacao.md); as fases de evolução da arquitetura estão em [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md) (seção 10). Este documento cobre plataforma, segurança e operações e não reespecifica o roadmap.

> **Resolvido (reconciliação):** a especificação de **UX/UI de telas** (fluxos, navegação, telas por área, estados de interface) — inexistente nas fontes originais — foi produzida e vive em [`../04-ui-ux/`](../04-ui-ux/) (visão geral, arquitetura de informação e telas mobile por área). Este documento trata de arquitetura de backend, segurança e operações e **não** é a spec de UX; os dois se complementam.
