# Plataforma, Segurança e Operações

> **Status:** Rascunho consolidado · **Fontes:** chats/ux-do-jogo.md · **Revisão:** 2026-07-10

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
11. [Migrações expand-contract](#11-migrações-expand-contract)
12. [Arquitetura técnica](#12-arquitetura-técnica)
13. [Modelo de dados e integridade](#13-modelo-de-dados-e-integridade)
14. [Pendências](#14-pendências)

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

> **Pendência:** provedores de identidade externos (login social/corporativo) são citados como possibilidade futura, sem decisão de qual(is) adotar.

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

### Auditoria vs. narrativa

A auditoria (registro técnico de quem fez o quê no sistema) é **distinta da narrativa do jogo** (a história pública/esportiva que os usuários leem). Segredos competitivos não aparecem em métricas nem logs; a auditoria interna não vira conteúdo narrativo.

> A regra reforçada em todo o bloco: a administração pode corrigir o mundo, mas **não pode administrar secretamente a competição**. Organizadores de mundos privados têm poderes limitados e **não podem alterar resultados ou saldos**; organizadores que também competem sofrem restrições adicionais.

---

## 6. Correções administrativas e suporte

- Correções usam **comandos estruturados** que validam regras e invariantes; **edição direta de banco é excepcional**.
- Scripts administrativos são versionados e revisados; correções em lote têm **dry run**; ações críticas têm **plano de rollback**.
- Correções preservam o **histórico anterior** (`beforeSnapshotReference` / `afterSnapshotReference`), com `reason`, `ticketReference`, `dryRunResult`, `rollbackPlan`.
- Correções financeiras usam **estornos e lançamentos** (nunca sobrescrita); correções de transferência tratam todas as dependências.
- Estatísticas e classificações podem ser **reconstruídas**, mas **tabelas alteradas exigem nova validação oficial**; a **população de jogadores não é regenerada arbitrariamente**; **replays em produção exigem operação formal**.

### Privacidade, anonimização e retenção

- Dados pessoais podem ser **anonimizados sem apagar fatos competitivos** (resultados e histórico permanecem).
- **Exportações respeitam a privacidade de terceiros**; dados de outras pessoas são omitidos ou mascarados.
- **Legal hold** é suportado: dados sob retenção legal não são apagados nem anonimizados enquanto ela vigorar.
- **Dados de produção não são usados em testes sem proteção**; dados **sintéticos** são preferidos.

### Suporte

Impersonação é **somente leitura por padrão**; suporte não joga pelo usuário. Sessões de suporte (`supportAccessSessionId`) são **visíveis, temporárias, aprovadas** e notificam o usuário (`userNotificationId`).

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

---

## 9. Observabilidade, alertas e incidentes

- Observabilidade combina **métricas, logs, traces e invariantes**; OpenTelemetry desde o início, com Prometheus, Grafana, Loki e Tempo.
- **Métricas internas não revelam segredos competitivos.**
- **Alertas têm responsável**, são agrupados quando duplicados, e disparam quando invariantes são violadas.
- Incidentes têm `severity`, `incidentCommanderId` e `responderIds`; usuários afetados recebem comunicação contextual; incidentes relevantes têm revisão posterior com ações corretivas responsabilizadas e com prazo.
- Verificação **contínua de invariantes**; auto-repair só em situações comprovadamente seguras.
- **Capacidade e armazenamento são monitorados**; logs têm **correlação distribuída** (trace/correlation IDs) ligando ação, evento e efeito.

---

## 10. Backups, snapshots e recuperação

- Backups são **automáticos, criptografados e validados**; ficam **fora** do servidor principal (WAL-G + Cloudflare R2).
- **Um backup não testado não é válido** — é marcado como tal; testes de restauração são periódicos.
- **Snapshots do mundo são consistentes**; partidas em andamento têm política de snapshot própria.
- Restaurações são validadas em ambiente isolado quando necessário e **não duplicam eventos**; efeitos externos não são repetidos em replay.
- Mundos podem ser restaurados **isoladamente** — falha de um mundo não corrompe os demais, e falha de um serviço não derruba a plataforma (degradação graciosa).
- Recuperação de desastre tem **runbook** e exercícios praticados; **integridade tem prioridade sobre reabertura rápida**.

---

## 11. Migrações expand-contract

Migrações são versionadas, testadas e retomáveis. Princípios: compatibilidade, idempotência, checkpoints, monitoramento, backup, dry run quando possível, validação e rollback/compensação.

Migrações **destrutivas** ocorrem em etapas (**expand-contract**):

```
Parar escrita  →  Migrar leitura  →  Validar  →  Arquivar dado  →  Remover posteriormente
```

**Backfills** são particionados, retomáveis, não bloqueiam produção, validam valores, registram progresso e evitam duplicidade. Deployments têm verificação prévia e rollback; um deployment incompatível é bloqueado ou exige migração compatível. Seeds estruturais são idempotentes.

---

## 12. Arquitetura técnica

> Detalhamento em [Arquitetura de dados e transações](./01-arquitetura-de-dados.md).

- **Monólito modular** (sem microsserviços prematuros); processos especializados (ex.: motor de partidas) implantados à parte.
- Backend **NestJS/TypeScript**; frontend **Next.js** (mobile-first, PWA); monorepo pnpm + Turborepo.
- **PostgreSQL** como banco principal, **Prisma** como ORM, **Redis** para cache/estado temporário, **RabbitMQ** para mensageria, **Cloudflare R2** para arquivos e backups.
- API principal **REST versionada**; tempo real por **WebSocket/Socket.IO**, que **não é fonte de verdade**.
- Commands idempotentes; agregados críticos com **concorrência otimista**; servidor autoritativo.
- **Redis nunca armazena sozinho** saldos, contratos ou resultados; prazos oficiais persistem no PostgreSQL. A perda do Redis causa degradação, não perda de mundo.
- **Scheduler com leases**: apenas um scheduler avança cada mundo; motor de partidas isolado, determinístico, registra seed e versão, usa checkpoints e sobrevive à perda do worker.
- Cada partida tem um **único actor lógico**; **partidas offline usam o mesmo motor**; a **IA não conhece dados secretos** dos clubes.
- Processos longos usam **sagas** com compensação; **sem 2PC**. CQRS pragmático.
- Implantação inicial no **EasyPanel** (R2 externo); PostgreSQL/Redis/RabbitMQ não públicos; tráfego público HTTPS; health checks. CI/CD por GitHub Actions, imagens no GHCR; ambientes separados; segredos fora do código; dev local em Docker Compose; staging reproduz a arquitetura de produção; configurações validadas na inicialização.

### Endurecimento e segurança de aplicação

- **Rate limiting** protege contra abuso; comandos repetidos são idempotentes.
- **Vulnerabilidades têm processo próprio** e **dependências são monitoradas**; artefatos de deployment são **verificáveis** (imagens rastreáveis no GHCR).
- **Segredos são rotacionáveis**, ficam fora do código e **nunca aparecem em logs**; interfaces internas **mascaram** dados sensíveis.

### Busca, analytics e arquivos

- **Busca inicial no PostgreSQL**; motor externo de busca só por necessidade comprovada.
- **Analytics inicial** usa o banco principal e projeções.
- Arquivos vão **direto ao R2** quando possível; arquivos privados usam **URLs temporárias (assinadas)** e **uploads são validados**.

### Integrações externas

- Integrações usam **adapters**, com **credenciais isoladas** por integração.
- **Webhooks são autenticados e idempotentes**; **e-mail e push são assíncronos**.

### Testes como parte da arquitetura

- Testes de **domínio, integração, concorrência e simulação** são obrigatórios.
- O motor tem **golden tests** e **testes estatísticos**; há **testes de recuperação** e testes que protegem as **fronteiras dos módulos**.

---

## 13. Modelo de dados e integridade

> Schema canônico detalhado em [Modelo de dados](./02-modelo-de-dados.md).

O modelo é **relacional, histórico, versionado, auditável e preparado para múltiplos mundos e clusters**. O schema representa as regras do mundo — a aplicação não compensa permanentemente um banco incapaz de proteger suas invariantes estruturais.

### Multi-mundo e particionamento

- Usuários são **globais**; entidades esportivas pertencem a um mundo.
- Toda relação competitiva crítica carrega **`gameWorldId`**, a **chave de particionamento** desde o primeiro schema (particionamento físico introduzido só por necessidade comprovada).
- **Foreign keys compostas** impedem relações entre mundos diferentes; propriedade, dinheiro e elegibilidade usam FKs explícitas.
- Mundos poderão ser movidos para clusters diferentes no futuro.

### Identidade, tipos e versionamento

- Identificadores internos em **UUIDv7**, separados de códigos públicos; models em PascalCase, banco em snake_case.
- Entidades críticas têm `version`; datas reais em `timestamptz`; tempo simulado em `worldTick`.
- Dinheiro em **unidade mínima**; percentuais e atributos em inteiros escalados; JSONB só em estruturas versionadas adequadas.
- Enums estáveis para ciclos fechados; taxonomias expansíveis em catálogos; regulamentos versionados; traduções fora de enums.

### Invariantes protegidas no banco

Regras críticas são protegidas em mais de uma camada — **validação da aplicação + invariante do domínio + constraint do banco**. O PostgreSQL protege: unicidade, valores não negativos, estados válidos, relações obrigatórias, associação ativa exclusiva, inscrição única. Sobreposições temporais críticas e exclusões de histórico são bloqueadas; cascade só para filhos descartáveis; soft delete não é padrão universal; snapshots são imutáveis; unicidades condicionais via índices parciais. Agregados têm limites claros; **locks têm ordem documentada** (para evitar deadlock); **idempotência é protegida por constraints**; **gerações têm seeds persistidas**; **status só muda por casos de uso**.

### Prisma fora do domínio

O **Prisma permanece fora do domínio**: é a camada de modelagem relacional e de operações comuns, complementada por **migrações SQL nativas** e SQL direto dentro da infraestrutura. Transações são curtas e **chamadas externas não ocorrem dentro de transações**. Views e materialized views são reconstruíveis e **não são fonte de verdade**. Toda invariante crítica tem sua camada de proteção definida.

---

## 14. Pendências

> **Pendência:** O roteiro do chat previa blocos posteriores que **não foram redigidos** nesta fonte — notadamente o **Plano de Implementação, MVP, Fases e Critérios de Entrega** (transformar a arquitetura em ordem prática de construção), além de um último bloco de fechamento. Esses conteúdos precisam ser produzidos e documentados separadamente.

> **Pendência:** Apesar do nome do arquivo de origem (`ux-do-jogo.md`), **não existe em nenhum chat uma verdadeira especificação de UX/UI de telas** (fluxos, wireframes, componentes, estados de interface, navegação). Essa spec de UX/UI ainda **precisa ser criada** e não deve ser confundida com este documento, que trata de arquitetura de backend, segurança e operações.
