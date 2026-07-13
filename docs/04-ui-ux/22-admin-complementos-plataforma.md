# Admin — Complementos: Plataforma e Adendos

> **Status:** CANÔNICO · **Fontes:** auditoria de completude (2026-07-11) sobre docs/02-tecnico/04-plataforma-seguranca-operacoes.md, docs/02-tecnico/09-operacao-e-admin-do-mundo.md, docs/01-game-design/09-anti-abuso-e-onboarding.md · **Revisão:** 2026-07-11

Este documento **fecha as lacunas** da auditoria do admin (doc 21) contra a plataforma técnica. O doc 21 cobriu a **operação de mundo** (economia, competições, moderação, correções, auditoria). Aqui entram as telas de **plataforma/segurança/operação técnica** que faltavam (IAM/RBAC administrável, feature flags, jobs/DLQ, incidentes, backups, manutenção, broadcast, privacidade, report de bug) e os **adendos** a telas existentes. Segue o [template](00-visao-geral-e-design-system.md#template-de-especificação-de-tela).

> **Delimitação e escopo.** A plataforma técnica ([`../02-tecnico/04-plataforma-seguranca-operacoes.md`](../02-tecnico/04-plataforma-seguranca-operacoes.md)) é a fonte canônica de contratos (estados de job, backup, permissões). Estas telas dão a **superfície de operação** no admin. Onde a ação vive em ferramenta SRE externa (observabilidade profunda, deploy, migrações), o admin apenas **exibe resumo e aponta** — marcado abaixo. Toda escrita exige **motivo + audit log**; ações de alto impacto exigem **reautenticação** e, quando aplicável, **aprovação em quatro olhos (`FOUR_EYES_APPROVAL`)**.

## Sumário

- [A. Telas novas](#a-telas-novas): `A-IAM` · `A-FLAGS` · `A-OPS` · `A-INCIDENTS` · `A-BACKUPS` · `A-MAINTENANCE` · `A-BROADCAST` · `A-PRIVACY` · `A-BUGS`
- [B. Adendos a telas existentes](#b-adendos-a-telas-existentes)

---

## A. Telas novas

### `A-IAM` — Operadores, papéis e sessões (RBAC administrável)
- **Objetivo:** administrar quem é operador, com qual papel e escopo — sem isso, o RBAC de `AF-00` não é gerenciável.
- **Como se chega:** top bar (papel `PLATFORM_ADMIN/OWNER`); a partir de `A-LOGIN`.
- **Componentes e dados:** contas administrativas (**separadas da conta de jogo**); papéis (`PLATFORM_OWNER` … `READ_ONLY_ANALYST`); **matriz de ações** (`VIEW·INVESTIGATE·PROPOSE·APPROVE·EXECUTE·ROLLBACK·EXPORT·DELETE·ANONYMIZE·IMPERSONATE·BREAK_GLASS`) × **escopo** (environment/gameWorldId/service/entityType/operation/dataClassification/validFrom/validUntil); **sessões admin** com estados (`ACTIVE/IDLE/REAUTHENTICATION_REQUIRED/RESTRICTED/SUSPICIOUS/REVOKED/EXPIRED`); **elevação temporária** (motivo/aprovação/escopo/expiração) e **`BREAK_GLASS`**; segregação de funções / conflito de interesse (auto-bloqueio).
- **Ações:** provisionar operador; atribuir/revogar papel; editar matriz/escopo; encerrar sessão; conceder acesso temporário/emergencial (com aprovação).
- **Estados:** ação em quatro olhos aguardando 2º aprovador; break-glass gera alerta e auditoria reforçada.
- **Referências:** [`04-plataforma §2, §4`](../02-tecnico/04-plataforma-seguranca-operacoes.md); [`09-op §5`](../02-tecnico/09-operacao-e-admin-do-mundo.md).

### `A-FLAGS` — Feature flags e kill switches
- **Objetivo:** ligar/desligar funcionalidades e acionar cortes de emergência.
- **Componentes e dados:** flags com responsável/motivo/escopo/`reviewAt`/`expiresAt`/plano de remoção; escopos (`GLOBAL/ENVIRONMENT/REGION/WORLD/USER_COHORT/USER/SERVICE`); **kill switches** (mercado, chat/mensagens, notificações externas, funcionalidade nova, integração, job).
- **Ações:** alternar flag; acionar kill switch (reautenticação); agendar revisão/expiração.
- **Estados:** flag sem `reviewAt`/expiração sinalizada (dívida); kill switch ativo em destaque.
- **Referências:** [`04-plataforma §7`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

### `A-OPS` — Jobs, filas, DLQ e reconciliação
- **Objetivo:** operar a camada de processamento (drill-down do cartão "falhas de processamento" de `A-WORLD`).
- **Componentes e dados:** jobs e estados (`STALLED/PAUSED/DEAD_LETTERED`…); filas e **backpressure**; **DLQ / poison messages**; **reconciliação** (`CONSISTENT`…`CRITICAL_INCONSISTENCY/MANUAL_REVIEW_REQUIRED`).
- **Ações:** retomar job `STALLED`; cancelar (`GRACEFUL/IMMEDIATE/AFTER_CURRENT_ITEM`); reprocessar DLQ; rodar/ver conciliação.
- **Estados:** > **Escopo a decidir:** se as ações técnicas vivem neste admin ou em ferramenta SRE — nesse caso `A-OPS` fica somente-leitura (espelho). [`04-plataforma §8`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

### `A-INCIDENTS` — Incidentes
- **Objetivo:** conduzir incidentes operacionais.
- **Componentes e dados:** severidade `SEV_1…SEV_5`; estados `DETECTED→…→CLOSED`; timeline; `incidentCommanderId`/responders; **estado público** (`INVESTIGATING/IDENTIFIED/MITIGATING/MONITORING/RESOLVED`); **post-incident review** e ações corretivas (`OPEN…OVERDUE`).
- **Ações:** abrir/escalar incidente; designar comandante; **comunicar afetados** (`A-BROADCAST`); acionar mitigação (`A-FLAGS` kill switch); registrar PIR.
- **Estados:** liga a `A-MATCHES`/`A-WORLD` (detecção) e a manutenção.
- **Referências:** [`04-plataforma §9`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

### `A-BACKUPS` — Backups e recuperação
- **Objetivo:** garantir que o mundo é recuperável.
- **Componentes e dados:** estados de backup (`VALID/INVALID/UNVERIFIED_BACKUP`); **RPO/RTO**; tipos de restauração (`WORLD_RESTORE`, `POINT_IN_TIME_RECOVERY`…); estados de restore; replay seguro / modo seguro de integrações; disaster recovery.
- **Ações:** validar backup; disparar restore (**quatro olhos + reautenticação**); testar recuperação.
- **Estados:** backup atrasado (`AT_RISK`) sinalizado em `A-WORLD` com drill-down aqui.
- **Referências:** [`04-plataforma §10, §4`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

### `A-MAINTENANCE` — Janelas de manutenção
- **Objetivo:** planejar manutenção do mundo com o mínimo de dano competitivo.
- **Componentes e dados:** janela (início, duração, serviços, mundos, prazos, partidas, **modo de acesso**); **congelamento de prazo**; manutenção `EMERGENCY`; ciclo de vida operacional do mundo (`HEALTHY/DEGRADED/AT_RISK/MAINTENANCE/READ_ONLY/RECOVERING/SUSPENDED/ARCHIVED`).
- **Ações:** agendar/editar janela; congelar prazos; entrar/sair de `READ_ONLY`; **comunicar** (`A-BROADCAST`).
- **Estados:** mundo em manutenção reflete `WORLD_READ_ONLY` no cliente.
- **Referências:** [`04-plataforma §11`](../02-tecnico/04-plataforma-seguranca-operacoes.md); [`09-op §8`](../02-tecnico/09-operacao-e-admin-do-mundo.md). **Fechado:** ≥2 temporadas ociosas, aviso 30 dias e read-only reversível (R-56).

### `A-BROADCAST` — Comunicação a usuários
- **Objetivo:** compositor único de mensagens aos usuários (manutenção, incidente, pós-correção).
- **Componentes e dados:** público-alvo (todos/mundo/segmento/**afetados**); canal (in-app/push); nível; rascunho/agendamento; rastreamento de entrega (`userNotificationId`).
- **Ações:** compor/agendar/publicar; usado por `A-MAINTENANCE`, `A-INCIDENTS`, `A-CORRECTIONS`.
- **Estados:** histórico de comunicações; auditado.
- **Referências:** [`04-plataforma §9, §11`](../02-tecnico/04-plataforma-seguranca-operacoes.md); [`09-op §4, §8`](../02-tecnico/09-operacao-e-admin-do-mundo.md).

### `A-PRIVACY` — Privacidade e compliance (data-subject requests)
- **Objetivo:** atender solicitações de titular de dados.
- **Componentes e dados:** solicitações (acesso, correção, **exportação**, **exclusão**, restrição, **anonimização**); pipeline de exclusão (`REQUESTED→IDENTITY_VERIFICATION→UNDER_REVIEW→WAITING_RETENTION_PERIOD→ANONYMIZING→COMPLETED`); **legal hold**; exportação **mascarando terceiros**; separação dado pessoal × fato competitivo; papel `COMPLIANCE_REVIEWER`.
- **Ações:** `EXPORT/DELETE/ANONYMIZE` (reautenticação); aplicar/retirar legal hold.
- **Estados:** verificação de identidade obrigatória; período de retenção respeitado.
- **Referências:** [`04-plataforma §6`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

### `A-BUGS` — Report de bug e vulnerabilidades
- **Objetivo:** triar reports e conduzir vulnerabilidades.
- **Componentes e dados:** fila de reports (Dec. 1932: reconhecimento **cosmético** — badge/menção, **nunca** vantagem competitiva); ciclo de vulnerabilidade (`REPORTED→TRIAGED→CONFIRMED→MITIGATING→PATCHED→VERIFYING→RESOLVED`); divulgação responsável.
- **Ações:** triar; conceder badge cosmético; encaminhar a `A-INCIDENTS`/`A-FLAGS` (mitigação).
- **Estados:** duplicado/inválido; recompensa sempre não competitiva.
- **Referências:** [`09-anti-abuso (Dec. 1932)`](../01-game-design/09-anti-abuso-e-onboarding.md); [`04-plataforma`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

---

## B. Adendos a telas existentes

Os complementos que faltavam nas telas admin foram **dobrados no doc 21** — cada tela cita a fonte no próprio spec. Ficam abaixo os ponteiros de rastreabilidade.

> Dobrado em [21-admin-telas.md](21-admin-telas.md) — `A-LOGIN` (link `A-IAM` + sessão elevada/temporária), `A-WORLDS` (ciclo de vida operacional do mundo + sinal de backup `AT_RISK`→`A-BACKUPS`), `A-WORLD` (atalhos `A-OPS`/`A-FLAGS`/`A-INCIDENTS`), `A-CORRECTIONS` (estado `AWAITING_APPROVAL`/quatro olhos + comunicação via `A-BROADCAST`), `A-QUEUES` (inbox de aprovação em quatro olhos; bug → `A-BUGS`), `A-MODERATION` (aba Bot/Automação + estado cooldown/captcha), `A-SUPPORT` (contrato de impersonação + máquina de estados do ticket), `A-AUDIT`/`A-MODERATION`/`A-SUPPORT` (ação "revelar dado sensível").

> As **telas novas** da seção A entram no sitemap ([doc 01](01-navegacao-e-arquitetura-de-informacao.md)).
