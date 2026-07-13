# Segurança, RPO/RTO, Alta Disponibilidade e Recuperação de Desastre

> **Status:** CANÔNICO (Série R ratificada em 2026-07-13) · **Bloqueador endereçado:** passo **14** da ordem de correção ([`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md)) — *"Segurança, RPO/RTO, R2, HA e operação"* — respondendo ao diagnóstico da auditoria: *"Segurança parcialmente pronta — bons princípios, mas auth, RBAC e auditoria não executáveis"* e *"falta RPO/RTO, R2, HA e recuperação comprovada"*, com o risco de *"recuperação não comprovada"*. **Liga ao passo 16** (nova auditoria) via [critério de recuperação comprovada](#84-critério-de-recuperação-comprovada) · **Fontes derivadas:** [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) (§2 RBAC, §5 auditoria imutável, §10 backups WAL-G/R2, §8 jobs/DLQ, §11 deploy), [`./09-operacao-e-admin-do-mundo.md`](./09-operacao-e-admin-do-mundo.md) (R-87 6 níveis), [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md) (topologia §7, degradação §8, fases §10), [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md) (WAL-G/R2, Outbox/Inbox, ledger, 19.10), [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md) (`DomainEventLog`, `AuditEvent` §6.3.11, `Backup`/`RestoreOperation`), [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md) (R-95 credencial efêmera, R-85 OIDC), [`./10-catalogo-de-commands.md`](./10-catalogo-de-commands.md) (commands admin, matriz RBAC, `RestoreBackup`/`ProcessDataSubjectRequest`), [`./13-ledger-e-conservacao-economica.md`](./13-ledger-e-conservacao-economica.md) (INV-3a/3b), [`./15-ruleset-e-replay.md`](./15-ruleset-e-replay.md) (`resultHash`, replay), [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md) (INV-34..37) · **Revisão:** 2026-07-12

Este documento **materializa** — sai do "bons princípios" para o "executável" — quatro blocos que a auditoria marcou como não-executáveis ou ausentes: **autenticação (AuthN)**, **autorização/RBAC (AuthZ)**, **auditoria resistente a adulteração**, **RPO/RTO por classe de dado**, **alta disponibilidade (HA)**, **recuperação de desastre (DR) comprovada** e **privacidade/LGPD**. Ele **não** reescreve os princípios já em [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) — os transforma em fluxos concretos, tabelas executáveis, alvos numéricos e runbooks testáveis.

> **Modo CANÔNICO.** AuthN, RBAC, auditoria, RPO/RTO, HA e cadência de gameday foram ratificados em R-131..R-137; isolamento de storage é complementado por R-154. Exercícios reais comprovam a operação antes de produção.

## Sumário

1. [O problema em uma frase](#1-o-problema-em-uma-frase)
2. [Princípios herdados e classes de dado](#2-princípios-herdados-e-classes-de-dado)
3. [AuthN — autenticação](#3-authn--autenticação)
4. [AuthZ/RBAC — a matriz papel→ação materializada](#4-authzrbac--a-matriz-papelação-materializada)
5. [Auditoria resistente a adulteração](#5-auditoria-resistente-a-adulteração)
6. [RPO/RTO por classe de dado](#6-rporto-por-classe-de-dado)
7. [Alta disponibilidade (HA)](#7-alta-disponibilidade-ha)
8. [DR e recuperação comprovada](#8-dr-e-recuperação-comprovada)
9. [Privacidade e LGPD](#9-privacidade-e-lgpd)
10. [Recomendações consolidadas (R-131..R-137)](#10-recomendações-consolidadas-r-131r-137)
11. [Rastreabilidade e documentos relacionados](#11-rastreabilidade-e-documentos-relacionados)

---

## 1. O problema em uma frase

A auditoria reconheceu **bons princípios** de segurança, mas apontou que eles **não eram executáveis**: não havia um **fluxo concreto** de emissão/renovação/revogação de credencial, não havia uma **matriz papel→ação** que um engenheiro pudesse implementar como checagem, e a auditoria imutável estava descrita como intenção (*"imutável por operação comum"*) sem o **mecanismo** que a torna resistente a adulteração. No eixo de continuidade, faltavam **alvos de RPO/RTO**, a topologia de **HA** e — o mais grave — a **recuperação comprovada**: um backup que nunca foi restaurado com sucesso não é um plano de recuperação, é uma esperança. Este documento entrega os mecanismos e os números que faltavam, e define o **critério objetivo** de "recuperação comprovada" que o passo 16 vai cobrar.

---

## 2. Princípios herdados e classes de dado

Os princípios abaixo já são canônicos (por derivação) e **governam** todo este documento; aqui eles só são reafirmados como âncoras.

- **Menor privilégio, sem acesso total por padrão** ([doc 04](./04-plataforma-seguranca-operacoes.md) §1). Toda concessão tem escopo, motivo, aprovação e expiração.
- **Servidor autoritativo, cliente nunca confiável** ([doc 08](./08-frontend-cliente-e-tempo-real.md)). A autorização é **sempre** calculada no servidor.
- **Administração técnica corrige o mundo, não administra a competição** ([doc 04](./04-plataforma-seguranca-operacoes.md), [doc 09](./09-operacao-e-admin-do-mundo.md)). Nenhuma credencial ou papel deste documento confere poder oculto sobre resultados/saldos.
- **Correção sobre o futuro, nunca sobre o passado** ([doc 09](./09-operacao-e-admin-do-mundo.md) §1). Auditoria **append-only**: correção cria novo evento, nunca apaga (INV-34).
- **Integridade tem prioridade sobre reabertura rápida** ([doc 04](./04-plataforma-seguranca-operacoes.md) §10). Um mundo restaurado só reabre depois de validado.

### Classes de dado (a base de RPO/RTO e de privacidade)

Reaproveitando a classificação de sensibilidade do [doc 04](./04-plataforma-seguranca-operacoes.md) §5 e a criticidade de recuperação, o sistema opera sobre **seis classes de dado**. RPO/RTO (§6), HA (§7) e retenção de PII (§9) são definidos **por classe**, não em atacado.

| Classe | Exemplos | Fonte de verdade | Sensibilidade | Reconstruível? |
|---|---|---|---|---|
| **C-A · Mundo ativo** | Estado corrente: partidas em andamento, elenco, mercado, calendário, projeções | PostgreSQL (tabelas de estado) | `CONFIDENTIAL` | Parcial (projeções sim; estado de runtime via checkpoint) |
| **C-B · Ledger e histórico homologado** | `JournalEntry`/`JournalLine`, saldos, transferências concluídas, títulos, `RecordBook`, resultados oficiais | PostgreSQL (ledger + eventos) | `CONFIDENTIAL` | Sim, por replay de eventos append-only (INV-3a/3b) |
| **C-C · Trilha de auditoria e eventos** | `DomainEventLog`, `AuditEvent`/`GameAuditLog`, `OutboxEvent`, `SimulationManifest` | PostgreSQL (append-only) | `RESTRICTED` | **Não** — é a origem; perdê-la é irrecuperável |
| **C-D · Identidade e PII** | `identity.users` (e-mail, credencial), sessões, `Person` (nome/nascimento in-game) | PostgreSQL (`identity`/`person`) | `RESTRICTED` / `HIGHLY_RESTRICTED` (segredos) | Não (PII) |
| **C-E · Efêmero** | Cache, presença, adapter Socket.IO, rate-limit, locks não críticos | Redis (AOF) | `INTERNAL` | Sim, a partir do PostgreSQL (perde-se cache, não mundo) |
| **C-F · Arquivos** | Escudos, avatares, relatórios, snapshots grandes, arquivos históricos | Cloudflare R2 | `PUBLIC`/`CONFIDENTIAL` | Metadados no Postgres; binário durável no R2 |

> **Invariante-âncora (C-B/C-C):** o **saldo oficial deriva do ledger** ([doc 01](./01-arquitetura-de-dados.md) §Convenções), e o ledger deriva de lançamentos **append-only** conservados (INV-3a Σdébitos=Σcréditos). Por isso C-B é **reconstruível por replay** mesmo após um restore imperfeito — desde que C-C (os eventos) esteja íntegra. É a razão de C-C ter o RPO mais rígido de todos.

---

## 3. AuthN — autenticação

Materializa o modelo do [doc 04](./04-plataforma-seguranca-operacoes.md) §3 (login próprio Argon2id + 2FA), a identidade externa de **R-85** ([doc 04](./04-plataforma-seguranca-operacoes.md) §3, [doc 08](./08-frontend-cliente-e-tempo-real.md)) e a credencial efêmera de **R-95** ([doc 08](./08-frontend-cliente-e-tempo-real.md) §Tempo real) em **fluxos concretos** de emissão, renovação e revogação.

### 3.1 Provedores e fonte de verdade

- **Login próprio** (senha Argon2id) permanece como base ([doc 04](./04-plataforma-seguranca-operacoes.md) §3).
- **OIDC externo (R-85):** Google e Apple primeiro (cobrem o público mobile; *Sign in with Apple* é exigência de loja quando há outro login social). O provedor **apenas autentica** o e-mail/identidade; a **conta Grinta é a fonte de verdade** — papéis, permissões e vínculo com clube/mundo continuam calculados no servidor. SAML/corporativo fica fora de escopo até haver B2B.
- **Uma conta, um sujeito de segurança.** Vários provedores (senha + Google + Apple) podem apontar para a **mesma** `identity.users`, ligados por e-mail verificado; a fusão exige verificação para não permitir sequestro de conta.

### 3.2 Credencial efêmera — o par de tokens (R-95)

| Token | Forma | TTL (1ª passada) | Armazenamento | Revogável |
|---|---|---|---|---|
| **Access JWT** | JWT assinado (`kid`), claims mínimos: `sub` (userId), `sid` (sessionId), `scopes`, `authVersion`, `exp` | **~15 min** | Só em memória do cliente (nunca em store de UI persistente) | Por expiração curta + lista de sessões |
| **Refresh token** | Opaco, aleatório, **rotativo**; guardado **hasheado** no servidor, vinculado à `Session` e a uma *família* | **~30 dias** (deslizante) | Cliente: armazenamento seguro (Keychain/Keystore via Expo SecureStore); servidor: hash | Por revogação de sessão/família |
| **Credencial de WebSocket** | Token curtíssimo derivado da sessão HTTP, específico do tempo real | **~60 s** por handshake | Só no handshake | O socket cai quando a sessão é revogada ([doc 08](./08-frontend-cliente-e-tempo-real.md)) |

O **access JWT não carrega permissões de clube completas nem estado mutável** ([doc 04](./04-plataforma-seguranca-operacoes.md) §3): a autorização é recalculada no servidor a cada request. `authVersion` permite **invalidação em massa** (ex.: após incidente, incrementa-se a versão e todo token antigo é rejeitado).

> **Materialização no schema (em andamento).** Os elementos de AuthN deste fluxo **deixam de ser proposta e estão sendo materializados no schema** pelo agente de schema: **`UserCredential`** — a credencial de login (hash Argon2id + provedor OIDC vinculado) — e **`AuthRefreshToken`** — o refresh token rotativo guardado **hasheado**, vinculado à `Session` e à *família* que sustenta a detecção de reúso de §3.4. Este documento fixa a **semântica**; os campos concretos vivem no schema.

### 3.3 Fluxo de emissão

```
Cliente → OIDC (Google/Apple)  ─┐
                                ├─▶ id_token válido (assinatura + aud + nonce + exp verificados)
Cliente → login próprio Argon2id┘
        │
        ▼
Servidor: resolve/cria identity.users (conta = fonte de verdade, R-85)
        │  cria Session { sid, userId, device, ip, createdAt, status=ACTIVE, authVersion }
        ▼
Emite Access JWT (~15min, kid da chave corrente) + Refresh token (rotativo, hash no servidor)
        │
        ▼
WebSocket: cliente troca a sessão HTTP por credencial curta (~60s) no handshake (doc 08)
```

### 3.4 Fluxo de renovação (com detecção de reúso)

```
POST /auth/refresh  (refresh token corrente)
        │
        ├─ token desconhecido/expirado  ─▶ 401 + exige novo login
        ├─ token JÁ ROTACIONADO (reúso)  ─▶ ROUBO SUSPEITO:
        │                                    revoga a FAMÍLIA inteira, marca Session=SUSPICIOUS,
        │                                    alerta SECURITY_OPERATIONS, exige novo login
        └─ token válido e corrente
                 ▼
           Rotaciona: emite novo refresh, invalida o anterior (one-time use),
           emite novo Access JWT (~15min); estende a janela deslizante da sessão
```

A **rotação com detecção de reúso** é a proteção central contra roubo de refresh token: um token só serve uma vez; apresentar um token já rotacionado prova que houve cópia e derruba a família. Alinha com o `refresh token rotativo detectável em reutilização` já previsto no [doc 04](./04-plataforma-seguranca-operacoes.md) §3.

### 3.5 Fluxo de revogação

Gatilhos de revogação: logout, revogação administrativa, troca de senha/identidade, sessão marcada `SUSPICIOUS`, expiração, saída de MFA. A `Session` transita entre os estados do [doc 04](./04-plataforma-seguranca-operacoes.md) §2 (`ACTIVE`, `IDLE`, `REAUTHENTICATION_REQUIRED`, `RESTRICTED`, `SUSPICIOUS`, `REVOKED`, `EXPIRED`).

```
Revogar(sessionId | familyId | userId+authVersion++)
        │
        ├─ Session.status = REVOKED   (persistido no PostgreSQL — fonte de verdade)
        ├─ Access JWT: rejeitado na próxima validação (TTL curto limita a janela de exposição a ~15min)
        └─ WebSocket: realtime-gateway fecha os sockets vinculados à sessão (doc 08)
```

A janela de exposição de um access JWT vazado é limitada pelo seu TTL (~15 min); revogações que precisam ser **imediatas** (conta comprometida) usam o incremento de `authVersion` + fechamento de socket, sem esperar a expiração natural.

### 3.6 Rotação de chaves de assinatura

- As chaves de assinatura do JWT são **rotacionadas periodicamente** (1ª passada: a cada **90 dias**, ou imediatamente sob suspeita de comprometimento), reusando a disciplina de "segredos rotacionáveis" do [doc 04](./04-plataforma-seguranca-operacoes.md) §Endurecimento (nova versão → atualização de consumidores → sobreposição → revogação da antiga).
- **JWKS com `kid`:** os validadores conhecem o conjunto de chaves; cada token traz o `kid` da chave que o assinou.
- **Janela de sobreposição:** ao rotacionar, a chave antiga **ainda valida** tokens por `TTL_access + margem` (~15 min + folga) para não invalidar sessões vivas; tokens novos já usam a chave nova. Chaves ficam fora do código, em secrets do EasyPanel ([doc 00](./00-arquitetura-geral.md) §8), **nunca** em logs.

### 3.7 MFA e sessão administrativa

- **2FA obrigatório para administradores**, opcional para jogadores ([doc 04](./04-plataforma-seguranca-operacoes.md) §3). Métodos (1ª passada): **TOTP** e **WebAuthn/passkey** (preferido para operadores).
- **Conta administrativa é separada** da conta de jogo, com histórico próprio e **não é usada para jogar** ([doc 04](./04-plataforma-seguranca-operacoes.md) §2).
- **Reautenticação (step-up)** para ações críticas: a matriz da §4 marca quais `commandType` exigem reautenticação fresca (`REAUTHENTICATION_REQUIRED` → `ACTIVE` só após novo fator). Corresponde ao errorCode `REAUTHENTICATION_REQUIRED` do [doc 10](./10-catalogo-de-commands.md).
- **Break-glass** (`BREAK_GLASS`) é excepcional, com motivo, aprovação, escopo, expiração e **revisão obrigatória posterior** ([doc 04](./04-plataforma-seguranca-operacoes.md) §2). Toda ativação é auditada (§5) e notificada a `SECURITY_OPERATIONS`.

---

## 4. AuthZ/RBAC — a matriz papel→ação materializada

Materializa **R-87** ([doc 09](./09-operacao-e-admin-do-mundo.md) §5 — 6 níveis cumulativos) cruzando-o com a **matriz de ações** ([doc 04](./04-plataforma-seguranca-operacoes.md) §2: `VIEW`/`INVESTIGATE`/`PROPOSE`/`APPROVE`/`EXECUTE`/`ROLLBACK`/`EXPORT`/`DELETE`/`ANONYMIZE`/`IMPERSONATE`/`BREAK_GLASS`) e os **commands administrativos** do [doc 10](./10-catalogo-de-commands.md). O resultado é uma **tabela executável**: cada célula diz *quem pode*, *com qual reautenticação* e *se exige quatro-olhos*.

### 4.1 Os 6 níveis (R-87) e o mapa para papéis de plataforma

Os níveis são **cumulativos** (cada um herda o anterior). Um nível de mundo mapeia para um ou mais papéis técnicos do [doc 04](./04-plataforma-seguranca-operacoes.md) §2.

| Nível (R-87) | Altera estado do mundo? | Verbos da matriz | Papéis de plataforma (doc 04) |
|---|---|---|---|
| **N1 · Visualização** | Não | `VIEW` | `READ_ONLY_ANALYST`, `AUDITOR` (leitura) |
| **N2 · Suporte** | Não (ou baixo impacto) | `VIEW`, `IMPERSONATE` (só leitura) | `SUPPORT_AGENT`, `SUPPORT_SUPERVISOR` |
| **N3 · Revisão** | Não diretamente | `INVESTIGATE`, `PROPOSE`, `APPROVE` (quatro-olhos) | `COMPLIANCE_REVIEWER`, `MODERATOR`, `SECURITY_ANALYST` |
| **N4 · Correção** | Sim, no escopo | `EXECUTE` (correção/reprocesso), `EXPORT` | `WORLD_OPERATOR`, `DATABASE_OPERATOR`, `SITE_RELIABILITY_ENGINEER` |
| **N5 · Punição** | Sim | `EXECUTE` (sanção, W.O.) | `COMPETITION_OPERATOR` |
| **N6 · Reversão** | Sim, máximo privilégio | `ROLLBACK`, `DELETE`, `ANONYMIZE`, `BREAK_GLASS` | `PLATFORM_OWNER` (+ `PLATFORM_ADMIN` p/ operação de plataforma) |

> **Nota de escopo:** ações **de plataforma** (flags, kill switch, manutenção, restore, deploy) usam papéis de plataforma (`PLATFORM_ADMIN`/`PLATFORM_OWNER`/`DEPLOYMENT_OPERATOR`) e **não** se confundem com os níveis de operação de mundo. A regra fechada permanece: **operar um mundo não concede acesso global**, e **permissão em teste não concede permissão em produção** ([doc 04](./04-plataforma-seguranca-operacoes.md) §2).

> **Materialização no schema (em andamento).** A base de AuthZ desta seção **deixa de ser proposta e está sendo materializada no schema** pelo agente de schema: **`UserRole`** expandido para os **6 níveis** cumulativos de R-87 (§4.1), com **`Permission`** (permissão atômica) e **`RolePermission`** (vínculo papel→permissão) representando a matriz papel→ação de §4.2. A checagem de autorização do servidor consome essas tabelas — passa de proposta a estrutura executável.

### 4.2 Matriz executável: ação sensível → autorização

Cada linha é diretamente verificável: *dado o operador, seu nível e seu escopo (`environment`/`gameWorldId`/`entityType`/`dataClassification`), a célula autoriza ou nega*. `Reauth` = exige reautenticação fresca; `4-Eyes` = exige `FOUR_EYES_APPROVAL` de um 2º operador **distinto do autor** (SoD).

| Ação sensível | Command (doc 10) | Nível mín. | Verbo | Reauth | 4-Eyes | SoD / observação |
|---|---|---|---|:---:|:---:|---|
| **Correção de estado** | `ApplyAdministrativeCorrection` | N4 Correção | `EXECUTE` | ✅ | ✅ (alto impacto) | Quem propõe ≠ quem aprova; correção **sobre o futuro** |
| **Reprocessar partida/job** | `ReprocessMatch` / `ReprocessJob` | N4 Correção | `EXECUTE` | ✅ | — | Idempotente; divergência = incidente, não sobrescrita |
| **Reversão de operação** | `RevertOperation` | **N6 Reversão** | `ROLLBACK` | ✅ | ✅ | Máximo privilégio; cria **novo** evento (nunca apaga) |
| **Aprovar ação pendente** | `ApproveAdminAction` / `RejectAdminAction` | N3 Revisão (revisor habilitado) | `APPROVE` | ✅ | n/a | Revisor **≠ autor** (`SELF_APPROVAL_FORBIDDEN`) |
| **Declarar W.O.** | `DeclareWalkover` | N5 Punição | `EXECUTE` | ✅ | — | Competitivo, não técnico |
| **Aplicar/retirar sanção** | `ApplySanction` / `LiftSanction` | N5 Punição | `EXECUTE` | ✅ | ✅ p/ `BAN`/`RESULT_REVERSAL` | Proporcional; falso positivo não é punido |
| **Impersonação de suporte** | `StartSupportImpersonation` | N2 Suporte (leitura) / N3 p/ `ASSISTED_` | `IMPERSONATE` | ✅ | — | Verificação de identidade + **notifica o usuário**; proibições do doc 04 §6 |
| **Revelar dado sensível** | `RevealSensitiveData` | N3 Revisão | `INVESTIGATE` (+`dataClassification`) | ✅ | — | Janela **curta**; a **própria busca** é auditada |
| **Feature flag** | `SetFeatureFlag` | Plataforma (`PLATFORM_ADMIN`) | `EXECUTE` | — | — | Nunca gera vantagem competitiva seletiva (doc 04 §7) |
| **Kill switch** | `TriggerKillSwitch` / `ReleaseKillSwitch` | Plataforma (`PLATFORM_ADMIN`) | `EXECUTE` | ✅ | — | Opera **mesmo** em mundo read-only (corte de emergência) |
| **Publicar versão de regras** | `PublishRuleSetVersion` | N6 / Operação máx. | `EXECUTE` | ✅ | — | **Não retroativa** (`effectiveFrom ≥ agora`); passa pelo gate de simulação |
| **Ciclo de vida do mundo** | `PauseWorld`/`SetWorldReadOnly`/`ArchiveWorld` | Operação (`PLATFORM_ADMIN`) | `EXECUTE` | ✅ | — | `RestoreWorld`/`FinishWorld` → `PLATFORM_OWNER` + 4-Eyes |
| **Restaurar backup** | `RestoreBackup` | Operação máx. (`PLATFORM_OWNER`) | `EXECUTE` | ✅ | ✅ | Backup `VALID`; RPO/RTO respeitados; modo seguro de integrações |
| **Solicitação de titular (LGPD)** | `ProcessDataSubjectRequest` | `COMPLIANCE_REVIEWER` | `EXPORT`/`DELETE`/`ANONYMIZE` | ✅ | — | Verificação de identidade; export **mascara terceiros**; legal hold bloqueia |
| **Acesso emergencial** | (break-glass) | N6 / `SECURITY_ADMIN` | `BREAK_GLASS` | ✅ | ✅ (criar ≠ validar) | Excepcional, expira, revisão obrigatória |

Os errorCodes que essas checagens produzem já são canônicos no [doc 10](./10-catalogo-de-commands.md): `ADMIN_FORBIDDEN_ROLE`, `REAUTHENTICATION_REQUIRED`, `FOUR_EYES_APPROVAL_REQUIRED`, `SELF_APPROVAL_FORBIDDEN`, `OUT_OF_SCOPE_FOR_SESSION`, `INSUFFICIENT_PRIVILEGE`, `REASON_REQUIRED`.

### 4.3 Segregação de funções (SoD) e quatro-olhos

Regras que o sistema **bloqueia automaticamente** ([doc 04](./04-plataforma-seguranca-operacoes.md) §2):

- Quem **propõe** uma correção crítica **não** a aprova (`SELF_APPROVAL_FORBIDDEN`); quem **revisa** um caso **não** aplica a punição/reversão dele.
- Quem **cria** um acesso emergencial **não** o valida sozinho; quem **executa** uma ação **não** a audita sozinho.
- **Conflito de interesse:** bloqueio quando o operador participa do mundo afetado, controla clube nele, está denunciado no caso ou é autor da ação investigada (`AdminConflictDeclaration`).
- **Quatro-olhos (`FOUR_EYES_APPROVAL`):** a ação de alto impacto entra em `AWAITING_APPROVAL` e só efetiva após `ApproveAdminAction` de um 2º operador habilitado e distinto. Aplica-se a: restaurar mundo/backup, corrigir resultado oficial, reverter em massa, excluir grande volume, alterar economia global, ativar break-glass, modificar histórico homologado.

---

## 5. Auditoria resistente a adulteração

Materializa a auditoria imutável do [doc 04](./04-plataforma-seguranca-operacoes.md) §5 e INV-34 ([doc 05](./05-catalogo-de-regras-e-formulas.md)) com o **mecanismo** que a torna resistente: uma **cadeia de hash (hash-chain) append-only** ligada aos eventos, já prevista no schema como *"`AuditEvent` — cadeia de hash de integridade"* ([doc 02](./02-modelo-de-dados.md) §6.3.11) e como disciplina de `hashAlgorithm` reusável do replay ([doc 15](./15-ruleset-e-replay.md) §3, item 17).

### 5.1 A cadeia de hash — `prevEventHash → eventHash`

Cada evento auditável carrega o hash do evento **anterior** da mesma cadeia. Adulterar ou apagar um evento intermediário **quebra a cadeia** de todos os posteriores — o que uma verificação periódica detecta.

```
eventHash(n) = H( canonical(payload(n)) ‖ prevEventHash(n) )
prevEventHash(n) = eventHash(n-1)          (o 1º evento da cadeia usa um seed fixo do mundo)
```

- **`H`** é a `hashAlgorithm` do manifesto (ex.: `sha256`), a **mesma disciplina** já adotada para `inputHash`/`resultHash` do replay ([doc 15](./15-ruleset-e-replay.md)) — um único vocabulário de integridade no projeto.
- **Encadeamento por escopo:** a cadeia é ordenada pela sequência já existente — `DomainEventLog @@unique([gameWorldId, sequence])` e `@@unique([gameWorldId, aggregateType, aggregateId, aggregateVersion])` ([doc 02](./02-modelo-de-dados.md)). A trilha administrativa (`AuditEvent`/`GameAuditLog`) encadeia por `gameWorldId` (+ cadeia global para eventos sem mundo, ex.: login de operador).
- **Ligação ao evento de domínio:** cada `AuditEvent` que decorre de um command referencia o `DomainEventLog`/`OutboxEvent` correspondente (`commandId`, `eventId`), de modo que a trilha administrativa e o log de domínio **se corroboram** — dois encadeamentos independentes que precisariam ser adulterados juntos.

O contrato mínimo do evento de auditoria já existe ([doc 04](./04-plataforma-seguranca-operacoes.md) §5): `auditEventId · environment · actorType · actorId · sessionId · action · targetType · targetId · gameWorldId · reason · ticketReference · approvalReferences · beforeReference · afterReference · result · occurredAt · integrityHash · version`. Este documento **fixa a semântica** de dois campos que **deixam de ser proposta e estão sendo materializados no schema** pelo agente de schema, no **`GameAuditLog`**: `integrityHash` = `eventHash(n)` e `previousIntegrityHash` = `prevEventHash(n)` — os dois elos da hash-chain de integridade. Este documento especifica a semântica; os campos vivem no schema.

### 5.2 O que é auditado (cobertura obrigatória)

Reafirma a cobertura do [doc 04](./04-plataforma-seguranca-operacoes.md) §5: login administrativo e falhas de autenticação, permissões e elevação temporária, break-glass, **dados sensíveis visualizados**, exportações, **impersonação**, correções, scripts, jobs, backups, restaurações, migrações, deployments, feature flags, incidentes, alterações de mundo, anonimizações, exclusões, ações de organizadores e **tentativas bloqueadas**. Regra fechada: **eventos competitivos normais não são erros técnicos**, e **a auditoria interna não vira conteúdo narrativo** ([doc 09](./09-operacao-e-admin-do-mundo.md) §7).

### 5.3 Proteção contra adulteração e retenção

| Proteção | Mecanismo |
|---|---|
| **Append-only lógico** | Correção **nunca** sobrescreve: gera evento complementar referenciando o anterior (INV-34). `AuditEvent` sem cascade delete ([doc 02](./02-modelo-de-dados.md) §6.3.11) |
| **Detecção de adulteração** | Verificador periódico recomputa a cadeia (`eventHash` esperado vs. gravado); divergência → incidente `SEV_2`+, congela operações do escopo, alerta `SECURITY_OPERATIONS` |
| **Cópia fora do host** | `AUDIT_ARCHIVE` (tipo de backup do [doc 04](./04-plataforma-seguranca-operacoes.md) §10) exporta a trilha selada para o R2 (**bucket isolado `grinta-snapshots`, credencial própria — §8.5**), criptografada — uma adulteração no primário **não** alcança a cópia arquivada |
| **Permissão de banco** | O papel de aplicação **não tem** `DELETE`/`UPDATE` nas tabelas de auditoria; só `INSERT`. Ownership de escrita protegido por migrations revisadas ([doc 01](./01-arquitetura-de-dados.md)) |
| **Retenção** | Eventos competitivos/financeiros e a trilha administrativa são preservados **enquanto o mundo existir** (e no arquivo do mundo, `CMP-019`); logs técnicos de baixa relevância têm retenção menor e particionamento temporal ([doc 01](./01-arquitetura-de-dados.md) 19.9). **Legal hold** suspende qualquer expurgo |

---

## 6. RPO/RTO por classe de dado

Define os **alvos** e mostra **a conta** de como a estratégia (WAL contínuo + snapshots + R2, do [doc 04](./04-plataforma-seguranca-operacoes.md) §10 e [doc 01](./01-arquitetura-de-dados.md) §Backups) os atinge. **RPO** = quanto de dado se aceita perder; **RTO** = tempo-alvo para restaurar o serviço.

### 6.1 Alvos por classe (1ª passada — R-134)

| Classe | RPO alvo | RTO alvo | Justificativa |
|---|---|---|---|
| **C-A · Mundo ativo** | **≤ 5 min** | **≤ 30 min** | Perda de poucos minutos de jogo é tolerável (partidas têm checkpoint; projeções reconstroem). Reabrir em ≤30min preserva a experiência |
| **C-B · Ledger / histórico homologado** | **≈ 0** | ≤ 60 min | Dinheiro e títulos não podem "sumir". RPO≈0 por replicação síncrona; RTO maior é aceitável porque é **reconstruível por replay** (INV-3a/3b) se preciso |
| **C-C · Auditoria / eventos** | **≈ 0** | ≤ 60 min | É a **origem** de tudo; perdê-la é irrecuperável. RPO≈0 obrigatório |
| **C-D · Identidade / PII** | **≤ 5 min** | ≤ 30 min | Sessões podem re-emitir; a conta em si não pode perder vínculos. Segue C-A |
| **C-E · Efêmero (Redis)** | **n/a** (reconstruível) | ≤ 5 min | Perde-se cache/presença, **nunca** mundo ([doc 01](./01-arquitetura-de-dados.md) §Redis). Reconstrói do PostgreSQL |
| **C-F · Arquivos (R2)** | conforme durabilidade do R2 | ≤ 5 min | Binário durável no R2; só metadados no Postgres. Upload não confirmado é lixo coletável |

> Estes alvos ainda são **de 1ª passada** (R-134) e são calibrados junto da análise de capacidade/custo por mundo (passo 13 desta mesma onda). A fundação single-host (fase 1) atinge um **subconjunto** — ver §6.3.

### 6.2 A conta — como a estratégia atinge o RPO/RTO

**RPO de C-A/C-D (≤ 5 min):** o WAL-G arquiva segmentos WAL continuamente para o R2 ([doc 01](./01-arquitetura-de-dados.md) §Backups). Configurando o *timeout* de arquivamento em **≤ 300 s** (`archive_timeout`), o pior caso de perda é o último segmento não arquivado — **≤ 5 min**. Com uma **réplica em streaming** (fase 5), o RPO cai para o *lag* de replicação (~segundos).

**RPO de C-B/C-C (≈ 0):** as transações do **ledger** e a escrita do **`DomainEventLog`/Outbox** usam `synchronous_commit` contra uma **réplica síncrona** — o commit só retorna depois de o WAL estar em dois nós. Um crash do primário **não perde** transação confirmada. Onde a réplica síncrona ainda não existe (fundação), o RPO≈0 é aproximado pela reconstrução: como o ledger deriva de lançamentos append-only conservados (INV-3a), qualquer lacuna é **reconstruível por replay** dos eventos íntegros — desde que C-C tenha sido preservada (por isso C-C é a mais rígida).

**RTO de C-A (≤ 30 min):** duas rotas, a mais rápida disponível vence.
- **Failover (fase 5):** promover a réplica *hot standby* a primário — **~minutos**, sem restaurar do zero. É a rota que sustenta o alvo com folga.
- **Restore do R2 (fundação e DR regional):** baixar a base diária + reproduzir o WAL até o ponto-alvo (PITR). O tempo = `download(base) + replay(WAL desde a base)`. Mantendo **base diária** (WAL de até ~24 h para reproduzir) e o banco na faixa de dezenas de GB, o restore cabe na janela; se a análise de capacidade mostrar que não cabe, encurta-se o intervalo de base (ex.: base a cada 12 h) — **o intervalo de base é o botão de ajuste do RTO**.

**RTO de C-E (≤ 5 min):** não há restore — reconstrói-se cache/presença sob demanda a partir do PostgreSQL; o serviço entra em **degradação graciosa** enquanto o cache reaquece (§7).

### 6.3 Fundação (fase 1) × alvo HA (fase 5)

Honestidade de fase, coerente com [doc 00](./00-arquitetura-geral.md) §10: a **fundação é single-host** e **não** entrega failover. O que ela entrega e o que falta:

| Garantia | Fundação (fase 1) | Alvo HA (fase 5) |
|---|---|---|
| RPO C-A | ≤ 5 min (WAL-G → R2) | ~segundos (réplica streaming) |
| RPO C-B/C-C | reconstruível por replay | ≈ 0 (réplica síncrona) |
| RTO C-A | restore do R2 (medido no gameday §8.2) | ~minutos (promoção de standby) |
| Continuidade | degradação graciosa + backup off-host | failover + recuperação regional |

O caminho fase 1 → fase 5 **não reescreve regras** ([doc 00](./00-arquitetura-geral.md) §10); só adiciona réplicas, Sentinel, cluster e failover.

---

## 7. Alta disponibilidade (HA)

Materializa a **fase 5** ([doc 00](./00-arquitetura-geral.md) §10 — "PostgreSQL com réplica/failover, RabbitMQ em cluster, Redis com réplica/Sentinel, múltiplos hosts, balanceamento, recuperação regional") e a **degradação graciosa** ([doc 04](./04-plataforma-seguranca-operacoes.md) §Capacidade; R-86 estado operacional do mundo).

### 7.1 Topologia de HA (alvo — R-135)

| Componente | Fundação | HA (alvo) | Como sobrevive à falha de um nó |
|---|---|---|---|
| **PostgreSQL** | 1 primário | **Primário + réplica(s) streaming + failover** (ex.: Patroni/gerenciado); réplica **síncrona** para C-B/C-C | Promoção automática do standby; RPO≈0 no ledger |
| **Redis** | 1 nó (AOF) | **Réplica + Sentinel** | Sentinel promove réplica; perda = degradação, não perda de mundo |
| **Broker** | Redis+BullMQ | **RabbitMQ cluster com filas quorum** (ou NATS) | Fila quorum sobrevive à perda de nó; Outbox/Inbox garante `AT_LEAST_ONCE` + idempotência |
| **api / realtime-gateway** | 1 cada | **N réplicas** atrás de balanceador; Redis Adapter no gateway | Requests re-roteados; socket reconecta e ressincroniza sequência ([doc 08](./08-frontend-cliente-e-tempo-real.md)) |
| **simulation / async / notification worker** | 1 cada | **N réplicas**; claim por `SKIP LOCKED` + lease | Outro worker assume o lease expirado a partir do checkpoint ([doc 01](./01-arquitetura-de-dados.md) 19.10) |
| **world-scheduler** | 1 | **Coordenado por leases** — só **um** avança cada mundo por vez | Lease expira → outro scheduler assume; nunca dois avançam o mesmo mundo |

**Filas duráveis** e **Outbox transacional** são a espinha da HA de mensageria: o evento é gravado na **mesma transação** do agregado ([doc 01](./01-arquitetura-de-dados.md) 19.10), então uma falha entre "commit" e "publicar" **não** perde o evento — a Outbox publica depois. Nenhum estado de mundo depende do broker estar vivo no instante do command ([doc 00](./00-arquitetura-geral.md) §8).

### 7.2 Degradação graciosa (mundo read-only em incidente)

Quando a integridade fica em risco, o mundo **degrada em vez de corromper** — o oposto de "cair". Os estados operacionais do mundo (R-86, [doc 09](./09-operacao-e-admin-do-mundo.md)/[doc 04](./04-plataforma-seguranca-operacoes.md) §9): `HEALTHY → DEGRADED → AT_RISK → MAINTENANCE → READ_ONLY → RECOVERING → SUSPENDED → ARCHIVED`.

- **Somente-leitura automático (INV-35):** entra quando a integridade financeira falha, há duplicidade de jogadores, a sequência de eventos quebra, o banco fica inconsistente ou a segurança exige contenção. Toda escrita de jogador retorna `WORLD_READ_ONLY` ([doc 10](./10-catalogo-de-commands.md)). **Sair** exige causa resolvida, invariantes válidas, jobs conciliados, aprovação, comunicação e monitoramento reforçado.
- **Prioridade sob carga** ([doc 04](./04-plataforma-seguranca-operacoes.md) §Capacidade): segurança > comandos competitivos > partidas > processamentos obrigatórios > consultas essenciais > mercado > notificações > estatísticas > social > rebuilds. Sob pressão, desativa gráficos avançados, atrasa rankings, agrupa notificações, pausa rebuilds — **mantendo partida e mercado ativos**.
- **Falha isolada não propaga** ([doc 04](./04-plataforma-seguranca-operacoes.md) §10): falha de um mundo **não** corrompe os demais; falha de um serviço **não** derruba a plataforma (timeouts, circuit breakers, bulkheads). **Kill switches** cortam mercado/chat/integração/job defeituoso sem derrubar o resto — e operam **mesmo** em mundo read-only.

### 7.3 Health checks e prontidão

Cada serviço expõe `/health/live` e `/health/ready` ([doc 00](./00-arquitetura-geral.md) §8); a `api` só fica *ready* com configuração válida, PostgreSQL acessível e migrações compatíveis. `DEEP_HEALTH` e **synthetic checks** ([doc 04](./04-plataforma-seguranca-operacoes.md) §9) exercitam banco/fila/cache/storage e um fluxo sintético (login técnico, consulta de mundo, evento sintético) — a base para o balanceador tirar um nó doente de rotação.

---

## 8. DR e recuperação comprovada

O ponto que a auditoria marcou como o risco central — *"recuperação não comprovada"*. Um backup só vale se **já foi restaurado com sucesso e verificado**: **"um backup não testado não é válido"** e é marcado `UNVERIFIED_BACKUP` ([doc 04](./04-plataforma-seguranca-operacoes.md) §10).

### 8.1 Runbook de restauração

Reusa a máquina de estados de restauração do [doc 04](./04-plataforma-seguranca-operacoes.md) §10 e a saga de restauração do [doc 16](./16-sagas-e-workflows.md), materializando o command `RestoreBackup` do [doc 10](./10-catalogo-de-commands.md).

```
Estados: REQUESTED → PLANNING → AWAITING_APPROVAL → RESTORING_TO_ISOLATED_ENVIRONMENT
       → VALIDATING → READY_TO_APPLY → APPLYING → REPLAYING_EVENTS → VERIFYING
       → COMPLETED / FAILED / ROLLED_BACK
```

| Passo | Ação | Guarda |
|---|---|---|
| 1 | Abrir incidente; declarar escopo (`WORLD_RESTORE` ou `POINT_IN_TIME_RECOVERY`) e ponto-alvo | Backup `VALID`/verificado; **não** `UNVERIFIED_BACKUP` |
| 2 | `RestoreBackup` → `AWAITING_APPROVAL` | **Quatro-olhos + reautenticação** obrigatórios (§4.2) |
| 3 | Restaurar base + PITR **em ambiente isolado** (nunca direto em produção) | Ambiente de validação separado ([doc 04](./04-plataforma-seguranca-operacoes.md) §10) |
| 4 | **Replay** de eventos posteriores ao backup — só se íntegros, idempotentes e schema compatível | Evento suspeito **interrompe** o replay; integrações em **modo seguro** (não cobra, não envia e-mail, não republica) |
| 5 | Verificação de integridade (§8.3) | **Todas** as checagens verdes |
| 6 | Aplicar (troca para o ambiente restaurado) e sair de `READ_ONLY` | Aprovação + comunicação (`A-BROADCAST`) + monitoramento reforçado |

**Cobertura de DR** ([doc 04](./04-plataforma-seguranca-operacoes.md) §10): perda de região, banco, storage, credencial comprometida, corrupção ampla, falha de provedor, exclusão acidental. Mundos restauram **isoladamente** — falha de um não corrompe os demais. **Continuidade degradada** prioriza segurança, estado dos mundos, partidas em andamento e processamentos críticos. **Integridade tem prioridade sobre reabertura rápida.**

### 8.2 Teste de restauração periódico (gameday)

O que transforma "backup" em "recuperação comprovada": um **exercício periódico e registrado**.

- **Cadência (1ª passada — R-136):** gameday de restauração **mensal** para o cenário `WORLD_RESTORE`, e **trimestral** para o cenário de **DR regional** (perda de região inteira). Todo backup novo passa por validação automática (`VALIDATING → VALID`) antes de qualquer gameday.
- **Procedimento:** restaurar um mundo real (ou snapshot representativo) no ambiente `DISASTER_RECOVERY`, **medir o RTO real** (cronômetro do passo 1 ao 6) e o **RPO real** (defasagem entre o último dado recuperável e o instante da falha simulada), rodar a verificação de integridade (§8.3) e **registrar** ativação + resultado ([doc 04](./04-plataforma-seguranca-operacoes.md) §10: "ativações e exercícios são registrados").
- **Falha de gameday é bloqueadora:** se o RTO medido estoura o alvo (§6.1) ou a integridade falha, abre-se ação corretiva com responsável e prazo ([doc 04](./04-plataforma-seguranca-operacoes.md) §9) — e a "recuperação comprovada" **não** é considerada válida até o próximo gameday verde.

### 8.3 Verificação de integridade pós-restore

Um restore só é aceito quando **todas** estas verificações passam — os mesmos oráculos do [doc 17](./17-criterios-de-aceite-e-bandas.md), agora aplicados ao estado restaurado.

| Verificação | Oráculo | Fonte |
|---|---|---|
| **Conservação contábil** | Σdébitos = Σcréditos por transação; saldos = projeção do ledger | INV-3a/3b ([doc 13](./13-ledger-e-conservacao-economica.md)) |
| **Replay determinístico** | Re-executar partidas restauradas reproduz o `resultHash` gravado | [doc 15](./15-ruleset-e-replay.md) §replay |
| **Cadeia de auditoria** | Recomputar `eventHash` da trilha bate com o gravado (nada quebrado no intervalo) | §5.1 / INV-34 |
| **Reconciliação** | `RunReconciliation` (`LEDGER`/`POPULATION`/`STANDINGS`/`REGISTRATIONS`) retorna `CONSISTENT` | [doc 10](./10-catalogo-de-commands.md) / [doc 04](./04-plataforma-seguranca-operacoes.md) §8 |
| **Invariantes estruturais** | 1 controlador por clube, 1 data oficial ativa, 1 resultado por partida, sem contrato ativo+expirado | INV-34..37 ([doc 05](./05-catalogo-de-regras-e-formulas.md)) |
| **Sem duplicação de efeito** | Replay não reprocessa Outbox já entregue; integrações em modo seguro | [doc 01](./01-arquitetura-de-dados.md) 19.10 (Inbox) |

### 8.4 Critério de "recuperação comprovada"

O critério objetivo que o **passo 16** (nova auditoria) cobra — a condição booleana que fecha o risco *"recuperação não comprovada"*:

> **Recuperação é COMPROVADA quando, e somente quando:** existe um **gameday de restauração verde** dentro da janela de cadência (§8.2); nesse gameday o **RTO medido ≤ RTO alvo** e o **RPO medido ≤ RPO alvo** da classe (§6.1); **todas** as verificações de integridade (§8.3) passaram; a **cadeia de auditoria** foi verificada de ponta a ponta; e o resultado foi **registrado** com ativação, tempos e responsável. Um backup marcado `UNVERIFIED_BACKUP`, um gameday vencido ou uma verificação falha **invalidam** a comprovação até o próximo gameday verde.

### 8.5 Isolamento de storage no R2 — buckets, credenciais e WORM (R-154)

A "cópia fora do host" da auditoria (§5.3) é caso particular de um princípio maior que a auditoria pediu (A-07): **classes de arquivo diferentes não compartilham bucket, credencial nem domínio de falha**. Um único bucket com uma única chave transforma qualquer vazamento de credencial da aplicação — ou um bug/ataque que apaga objetos — em perda **simultânea** de arquivos de usuário, snapshots e backups. A partição abaixo garante que o comprometimento de um domínio **não alcança** os demais. Nomes de bucket e janela de retenção são de **1ª passada (BASELINE RATIFICADA / reversível)**.

| Bucket (BASELINE RATIFICADA) | Classe | Quem **escreve** | Quem **lê** | Credencial | Proteção |
|---|---|---|---|---|---|
| `grinta-user-assets` | C-F (escudos, avatares, relatórios, uploads) | `api` (upload confirmado) | público / URL assinada | **chave A** (app) — só este bucket | versionamento; lifecycle de lixo não confirmado |
| `grinta-snapshots` | C-A/C-F (snapshots grandes, arquivamento a frio de manifesto/`DomainEventLog`, `AUDIT_ARCHIVE`) | `async-worker` / arquivador | restauração / auditoria | **chave B** (arquivador) — só este bucket | versionamento; imutabilidade por lifecycle |
| `grinta-backups` | C-B/C-C (base + WAL contínuo do WAL-G, artefatos de restore) | processo de backup (WAL-G) — **identidade dedicada** | apenas o runbook de restore (§8.1) | **chave C** (backup) — **a aplicação NÃO tem esta chave** | **Object Lock / WORM** (retenção imutável) |

**Regras fechadas (least-privilege por bucket):**

- **Credenciais distintas por bucket.** Cada bucket tem seu próprio par de chaves — `R2_*` separados por classe ([doc 00](./00-arquitetura-geral.md) §8: `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` por bucket) — com política mínima: a chave da aplicação (`grinta-user-assets`) **não** lista, lê nem escreve em `grinta-snapshots`/`grinta-backups`. Uma `api` comprometida **não** alcança backup nem snapshot.
- **Backup em domínio de falha separado.** O processo de backup (WAL-G) usa **identidade dedicada** que só escreve em `grinta-backups`; **nenhum** processo de runtime (`api`/`realtime-gateway`/workers) tem credencial de escrita nesse bucket. O restore (§8.1) usa uma credencial de **leitura** própria do runbook, sob **quatro-olhos + reautenticação** (§4.2).
- **Object Lock / WORM no bucket de backups.** `grinta-backups` opera com **retenção imutável** (Object Lock, janela de retenção de 1ª passada alinhada ao RPO/RTO de C-B/C-C e à retenção legal — **BASELINE RATIFICADA**): uma vez escrito, o objeto **não pode** ser sobrescrito nem apagado antes do fim da retenção — nem por credencial comprometida, nem por operador. É a defesa contra ransomware e exclusão acidental/maliciosa de backup, e reforça o "backup não testado não é válido" (§8.2) com "backup não apagável antes da retenção".
- **Sem domínio de falha compartilhado.** Arquivos de usuário, snapshots e backups **não** compartilham bucket, credencial nem ciclo de vida: rotacionar/apagar um **não** afeta os demais. Opcionalmente, `grinta-backups` reside em **conta/região R2 distinta** para blindar contra comprometimento da conta R2 principal (reforça a DR regional, §8.2).

---

## 9. Privacidade e LGPD

Materializa a privacidade/anonimização do [doc 04](./04-plataforma-seguranca-operacoes.md) §5–6, o pipeline de exclusão do [doc 04](./04-plataforma-seguranca-operacoes.md) §6 e o command `ProcessDataSubjectRequest` do [doc 10](./10-catalogo-de-commands.md), separando **dado pessoal** de **fato esportivo**.

### 9.1 Dados pessoais e minimização

- **PII no Grinta** vive em duas camadas: **conta** (`identity.users` — e-mail, credencial, provedor OIDC, dispositivo, IP) e **identidade in-game** (`Person` — nome, nascimento, nacionalidade que dão rosto a jogadores/staff). São classe **C-D** (`RESTRICTED`; segredos são `HIGHLY_RESTRICTED`).
- **Minimização:** o access JWT carrega **claims mínimos** (§3.2); logs comuns **não** guardam senha, token completo, e-mail/telefone/documento completos, dados de cartão ([doc 04](./04-plataforma-seguranca-operacoes.md) §5). Interfaces internas **mascaram** por padrão; **revelação temporária** exige `RevealSensitiveData` (§4.2, auditado).
- **Dados de produção não vão para teste sem proteção** — preferem-se **dados sintéticos** ([doc 04](./04-plataforma-seguranca-operacoes.md) §6).

### 9.2 Direito de exclusão vs. histórico esportivo (anonimização)

O princípio que resolve a tensão entre "apagar meus dados" e "não reescrever a competição" ([doc 04](./04-plataforma-seguranca-operacoes.md) §6, [doc 09](./09-operacao-e-admin-do-mundo.md) §1):

> **Dado pessoal pode ser anonimizado; fato competitivo permanece.** Nome pessoal e identidade de conta são removidos/anonimizados; **resultados, clube, transferências, títulos e histórico (anonimizado) permanecem**, com a auditoria essencial preservada. Apagar um usuário **não** apaga a 40ª rodada da temporada 12 nem o título que o clube dele conquistou — apaga o **quem**, preserva o **o quê**.

- **Pipeline de exclusão** ([doc 04](./04-plataforma-seguranca-operacoes.md) §6): `REQUESTED → IDENTITY_VERIFICATION → UNDER_REVIEW → WAITING_RETENTION_PERIOD → ANONYMIZING → COMPLETED` (`REJECTED`/`CANCELLED`). Executado por `ProcessDataSubjectRequest` (`COMPLIANCE_REVIEWER`, verificação de identidade, reautenticação).
- **Anonimização, não deleção física** dos fatos: o registro esportivo troca a PII por um *tombstone* anônimo estável (mantém a integridade referencial e a reconstrução histórica); a auditoria da própria anonimização é registrada.
- **Solicitações cobertas:** acesso, correção, exportação, exclusão, restrição e anonimização. **Exportação** inclui só dados permitidos do próprio titular e **mascara terceiros** — nunca segredos de outros clubes, mensagens de terceiros, evidências internas, atributos ocultos ou dados de segurança.

### 9.3 Retenção de PII e legal hold

- **Retenção mínima necessária:** PII de conta é mantida enquanto a conta existe + período legal; sessões/tokens expiram por TTL (§3). PII é **classe C-D** e segue os alvos de RPO/RTO de C-D (§6.1), mas **não** é replicada para além do necessário.
- **Legal hold** ([doc 04](./04-plataforma-seguranca-operacoes.md) §6): dados sob retenção legal **não** são apagados nem anonimizados enquanto ela vigorar — bloqueia o pipeline de exclusão (`DSR_LEGAL_HOLD_ACTIVE`) e suspende qualquer expurgo de auditoria (§5.3).
- **Separação dinheiro real × economia fictícia** ([doc 04](./04-plataforma-seguranca-operacoes.md) §1): dados de pagamento real (loja) são domínio separado da economia do mundo; nenhuma operação técnica os confunde, e os dados financeiros externos completos são `HIGHLY_RESTRICTED`.

---

## 10. Recomendações consolidadas (R-131..R-137, R-154)

As recomendações abaixo **materializam** princípios já registrados; os valores são de **1ª passada** e entram na [Série R](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11) como BASELINE RATIFICADA, ratificados pelo dono do produto. Reforçam **R-85** (identidade OIDC), **R-95** (credencial efêmera), **R-87** (6 níveis), **R-86** (estado do mundo) — **não** os substituem.

> **Decisão ratificada — R-131:** fluxo concreto de credencial (materializa R-85/R-95). **Access JWT ~15 min** (claims mínimos + `kid` + `authVersion`) + **refresh rotativo ~30 dias** deslizante com **detecção de reúso** (reúso → revoga família + alerta), **credencial de WS ~60 s** por handshake; **rotação de chave de assinatura a cada 90 dias** (JWKS/`kid`, janela de sobreposição ~15 min); **revogação** por estado de `Session` no PostgreSQL + incremento de `authVersion` para invalidação em massa; **MFA obrigatório para admin** (TOTP/WebAuthn) + reautenticação step-up para ações críticas. Calibrar TTLs por telemetria de sessão.

> **Decisão ratificada — R-132:** matriz papel→ação executável (materializa R-87). Os **6 níveis cumulativos** mapeados para papéis de plataforma (§4.1) × os **commands sensíveis** (§4.2), com colunas **Reauth** e **Quatro-olhos** e **segregação de funções** automática (propor≠aprovar, revisar≠punir, criar≠validar break-glass, executar≠auditar). É a fonte da checagem que produz `ADMIN_FORBIDDEN_ROLE`/`REAUTHENTICATION_REQUIRED`/`FOUR_EYES_APPROVAL_REQUIRED`/`SELF_APPROVAL_FORBIDDEN`.

> **Decisão ratificada — R-133:** auditoria por cadeia de hash. `eventHash(n) = H(canonical(payload) ‖ prevEventHash(n))`, encadeada pela sequência já existente do `DomainEventLog` (`[gameWorldId, sequence]`) e cruzada com o log de domínio; `H` = a `hashAlgorithm` do replay (ex.: `sha256`). Fixa a semântica de `integrityHash` = `eventHash` e **materializa** `integrityHash`/`previousIntegrityHash` no **`GameAuditLog`** (via agente de schema); **verificador periódico** de cadeia + **`AUDIT_ARCHIVE` off-host no R2** + permissão de banco **INSERT-only** na auditoria. Retenção enquanto o mundo existir; legal hold suspende expurgo.

> **Decisão ratificada — R-134:** RPO/RTO por classe. **Mundo ativo (C-A:** RPO ≤ 5 min / RTO ≤ 30 min; **ledger e auditoria (C-B/C-C:** RPO ≈ 0 / RTO ≤ 60 min (reconstruível por replay); **PII (C-D:** segue C-A; **efêmero (C-E:** reconstruível; **arquivos (C-F:** durabilidade do R2. Estratégia: **WAL contínuo (`archive_timeout` ≤ 300 s → R2)** para os ≤5 min, **réplica síncrona** para o RPO≈0 do ledger, **base diária + PITR** para o RTO (o **intervalo de base é o botão de ajuste do RTO**). Calibrar com a análise de capacidade/custo (passo 13).

> **Decisão ratificada — R-135:** topologia de HA (materializa fase 5 + R-86). PostgreSQL **primário + réplica streaming + failover** (síncrona para C-B/C-C); Redis **réplica + Sentinel**; broker **RabbitMQ quorum**; **N réplicas** de api/gateway/workers com claim por `SKIP LOCKED` + lease; **world-scheduler por lease** (um por mundo). **Degradação graciosa:** mundo `READ_ONLY` automático em incidente (INV-35), prioridade sob carga, kill switches e isolamento de falha. A fundação (fase 1) é single-host e entrega o **subconjunto** de §6.3.

> **Decisão ratificada — R-136:** DR com recuperação comprovada. **Runbook** de restauração isolada + replay em modo seguro (§8.1); **gameday mensal** (`WORLD_RESTORE`) e **trimestral** (DR regional) que **medem RTO/RPO reais** e rodam a verificação de integridade (§8.3); **critério de "recuperação comprovada"** (§8.4) como gate do passo 16 — gameday verde na janela, tempos ≤ alvo, integridade e cadeia de auditoria verificadas, resultado registrado. Falha de gameday é **bloqueadora**.

> **Decisão ratificada — R-137:** privacidade/LGPD. **Minimização** (claims mínimos, mascaramento, sintéticos em teste); **anonimização preserva o fato esportivo** (apaga o *quem*, mantém o *o quê*); **pipeline DSR** (`ProcessDataSubjectRequest`, verificação de identidade, `WAITING_RETENTION_PERIOD`); **export mascara terceiros**; **legal hold** bloqueia exclusão e expurgo; **PII = classe C-D** (`RESTRICTED`), segredos `HIGHLY_RESTRICTED`, dinheiro real separado da economia do mundo.

> **Decisão — R-154 (complementar, isolamento de storage R2 — 1ª passada/BASELINE RATIFICADA):** buckets R2 **separados por classe** — `grinta-user-assets` (C-F), `grinta-snapshots` (arquivamento a frio + `AUDIT_ARCHIVE`), `grinta-backups` (WAL-G/restore) — com **credenciais distintas por bucket** (least-privilege: a aplicação **não** tem chave de backup nem de snapshot), **Object Lock/WORM** (retenção imutável) no bucket de backups e **domínios de falha separados** (comprometer/apagar um **não** alcança os outros; backup opcionalmente em conta/região distinta). Materializa o isolamento de R2 pedido pela auditoria (**A-07**) e reforça "backup não testado não é válido" (§8.2/§8.5). Nomes de bucket e janela de retenção são **reversíveis**, a calibrar.

---

## 11. Rastreabilidade e documentos relacionados

### Cobertura do passo 14 (o que a auditoria pediu → onde está)

| Item pedido pela auditoria | Onde | Materializa |
|---|---|---|
| AuthN executável (OIDC, credencial efêmera, rotação, revogação, MFA) | §3 | R-85, R-95 → R-131 |
| AuthZ/RBAC — matriz papel→ação, SoD, quatro-olhos, reauth | §4 | R-87 → R-132 |
| Auditoria resistente (append-only, hash-chain) | §5 | INV-34, §6.3.11 → R-133 |
| RPO/RTO por classe de dado | §6 | doc 04 §10 → R-134 |
| HA (Postgres/réplica/failover, workers, filas, degradação) | §7 | doc 00 §10, R-86 → R-135 |
| DR + recuperação comprovada (runbook, gameday, integridade, critério) | §8 | doc 04 §10 → R-136 |
| Isolamento de storage R2 (buckets/credenciais/WORM por classe) | §8.5 | doc 04 §10 (A-07) → R-154 |
| Privacidade/LGPD (minimização, exclusão vs. histórico, retenção PII) | §9 | doc 04 §5–6 → R-137 |

### Documentos relacionados

- **Plataforma, segurança e operações (canônico da camada):** [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) — RBAC, auditoria imutável, backups WAL-G/R2, jobs/DLQ, incidentes, deploy.
- **Operação e admin do mundo:** [`./09-operacao-e-admin-do-mundo.md`](./09-operacao-e-admin-do-mundo.md) — R-87 (6 níveis), correção sobre o futuro, painel R-86.
- **Arquitetura geral:** [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md) — topologia §7, degradação §8, fases de evolução §10.
- **Arquitetura de dados:** [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md) — WAL-G/R2, Outbox/Inbox, ledger, transações 19.10.
- **Modelo de dados:** [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md) — `DomainEventLog`, `AuditEvent` §6.3.11, `Backup`/`RestoreOperation`.
- **Frontend e tempo real:** [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md) — R-95, R-85, autenticação do WebSocket.
- **Catálogo de commands:** [`./10-catalogo-de-commands.md`](./10-catalogo-de-commands.md) — commands admin, matriz RBAC, `RestoreBackup`, `ProcessDataSubjectRequest`.
- **Ledger e conservação:** [`./13-ledger-e-conservacao-economica.md`](./13-ledger-e-conservacao-economica.md) — INV-3a/3b (base do RPO≈0 por replay).
- **Ruleset e replay:** [`./15-ruleset-e-replay.md`](./15-ruleset-e-replay.md) — `resultHash`, verificação de replay (verificação pós-restore).
- **Critérios de aceite e bandas:** [`./17-criterios-de-aceite-e-bandas.md`](./17-criterios-de-aceite-e-bandas.md) — oráculos reusados na verificação de integridade.
- **Série R e hierarquia normativa:** [`../99-decisoes/registro-de-decisoes.md`](../99-decisoes/registro-de-decisoes.md), [`../99-decisoes/hierarquia-normativa-e-ratificacao.md`](../99-decisoes/hierarquia-normativa-e-ratificacao.md).
