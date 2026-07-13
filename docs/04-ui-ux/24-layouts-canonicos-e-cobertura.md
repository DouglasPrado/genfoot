# Layouts canônicos e cobertura das 138 telas

> **Status:** CANÔNICO · **Decisões:** R-94, R-98, R-99 · **Revisão:** 2026-07-13 · **Escopo:** 114 telas mobile + 24 telas admin

## 1. Regra de completude

Uma tela está especificada quando possui objetivo, entrada, arquétipo de layout, dados/query, ações/command quando houver mutação, estados globais, erros de domínio, retorno de sucesso, atualização em tempo real e critério de aceitação. Os documentos 03–13 e 21–22 descrevem conteúdo e ação; este documento fixa o layout herdado de cada ID. A rastreabilidade ação→query→command→evento está em [`23-rastreabilidade-ux-api.md`](23-rastreabilidade-ux-api.md). Telas somente de leitura não precisam inventar command.

## 2. Arquétipos mobile

| ID | Estrutura espacial | Uso | Critério essencial |
|---|---|---|---|
| L-M01 | header compacto → título/contexto → formulário em etapas → CTA fixo inferior | autenticação/onboarding/wizard | valida inline, preserva progresso e impede envio duplicado |
| L-M02 | header → resumo/KPIs → filtros → lista virtualizada → ações contextuais | listas e centrais | filtro persiste; vazio explica próximo passo |
| L-M03 | hero/resumo → tabs → seções/cards → ação contextual fixa | perfil/detalhe | origem e atualização visíveis; deep link restaura a tab |
| L-M04 | header → contexto → canvas/editor → validação → CTA salvar | escalação, tática e editores | mudanças sujas visíveis; conflito de versão recuperável |
| L-M05 | status/contador → feed/canvas → controles → modal time-boxed | partida/tempo real | resync por sequência; timeout nunca trava o mundo |
| L-M06 | stepper → antes/depois → riscos/custos → confirmação → recibo | negociação, contrato e alto risco | consequência, prazo e irreversibilidade antes do CTA |
| L-M07 | período/filtros → KPIs → gráfico/tabela → drill-down | finanças, rankings e relatórios | unidade, período, fonte e stale identificáveis |
| L-M08 | timeline/feed → filtros → item expansível → referência ao fato | história, notificações e narrativa | fato oficial e narrativa diferenciados |
| L-M09 | menu agrupado → preferência → ajuda → ações da conta | configuração, suporte e loja | local versus server-side explícito; destrutiva confirmada |

## 3. Mapeamento das 114 telas mobile

| Arquétipo | IDs de tela |
|---|---|
| L-M01 | `M-SPLASH`, `M-LOGIN`, `M-SIGNUP`, `M-RECOVER`, `M-WORLD-PICK`, `M-CLUB-PICK`, `M-CLUB-CREATE`, `M-REGION-PICK`, `M-CLUB-PREVIEW`, `M-SLOT-RESERVE`, `M-CONTROL-ACTIVATE`, `M-ONBOARD-REVIEW`, `M-RETURN`, `M-TUTORIAL` |
| L-M02 | `M-DECISIONS`, `M-SQUAD`, `M-MEDICAL`, `M-ACADEMY`, `M-COMPETITIONS`, `M-CALENDAR`, `M-MARKET`, `M-SCOUTING`, `M-STAFF`, `M-NOTIFS`, `M-MY-WORLDS`, `M-SEARCH`, `M-MESSAGES`, `M-REPORTS` |
| L-M03 | `M-HOME`, `M-DECISION-DETAIL`, `M-PLAYER`, `M-PLAYER-ATTRS`, `M-PLAYER-DEV`, `M-ROLES`, `M-TRAINING`, `M-MEDICAL-CASE`, `M-YOUTH-PLAYER`, `M-NEXTMATCH`, `M-SCOUT-OPP`, `M-PREMATCH`, `M-POSTMATCH`, `M-COMPETITION`, `M-CALENDAR-DAY`, `M-NATIONAL`, `M-AGENT`, `M-FINANCE`, `M-COMMERCIAL`, `M-DEPARTMENT`, `M-STAFF-HIRE`, `M-STADIUM`, `M-BOARD`, `M-MORALE`, `M-FANS`, `M-RIVALRIES`, `M-REPUTATION`, `M-SPONSORS-IMAGE`, `M-CLUB-PROFILE`, `M-CLUB-VIEW`, `M-MANAGER-PROFILE`, `M-WORLD-STRUCTURE`, `M-TEAMBALANCE`, `M-MEMBERSHIP`, `M-PRODUCTS`, `M-ROUND` |
| L-M04 | `M-AUTOMATIONS`, `M-AUTOMATION-EDIT`, `M-LINEUP`, `M-TACTICS`, `M-GAMEPLAN`, `M-TRAINING-INDIV`, `M-CAREER-PLAN`, `M-MENTORING`, `M-REGISTRATION`, `M-TRANSFER-STRATEGY`, `M-BUDGET`, `M-STRUCTURE`, `M-RETRAIN`, `M-COMPARE` |
| L-M05 | `M-LIVE`, `M-DECISION-POINT`, `M-HALFTIME`, `M-PENALTIES`, `M-LIVE-WORLD` |
| L-M06 | `M-CLUB-LEAVE`, `M-PROMISES`, `M-YOUTH-INTAKE`, `M-PROMOTE`, `M-SEASON-CLOSE`, `M-NEGOTIATION`, `M-CONTRACT`, `M-LOAN`, `M-DEBT`, `M-MATCHDAY-REVENUE`, `M-STADIUM-WORKS`, `M-LICENSING`, `M-PRESS`, `M-CONVO`, `M-PUBLIC-PROMISES`, `M-IDENTITY`, `M-CLAUSES`, `M-FRIENDLIES` |
| L-M07 | `M-AWARDS`, `M-HISTORY`, `M-RANKINGS`, `M-ACCOUNTING` |
| L-M08 | `M-PLAYER-MEMORY`, `M-FEED` |
| L-M09 | `M-ACCOUNT`, `M-SETTINGS`, `M-STORE`, `M-SEASON-PASS`, `M-INTEGRITY`, `M-BUG-REPORT`, `M-SUPPORT` |

Quando uma tela combina padrões, prevalece o arquétipo acima e subseções podem usar componentes secundários. `M-HOME`, por exemplo, é L-M03 com cards L-M02; `M-SEASON-CLOSE` é L-M06 com stepper L-M01.

## 4. Arquétipos e mapeamento admin

| ID | Estrutura espacial | Telas |
|---|---|---|
| L-A01 | shell RBAC → título/escopo → filtros → tabela → drawer | `A-WORLDS`, `A-COMPETITIONS`, `A-MATCHES`, `A-CLUBS`, `A-AUDIT`, `A-IAM`, `A-BUGS` |
| L-A02 | shell → KPIs/SLOs → gráficos → alertas → drill-down | `A-WORLD`, `A-ECONOMY`, `A-BALANCE`, `A-OPS` |
| L-A03 | shell → fila → evidências → quatro-olhos → recibo | `A-MODERATION`, `A-WO-SANCTIONS`, `A-QUEUES`, `A-CORRECTIONS`, `A-SUPPORT`, `A-PRIVACY` |
| L-A04 | shell → versão/config → diff → validação → rollout/rollback | `A-RULES`, `A-FLAGS`, `A-BROADCAST` |
| L-A05 | shell → stepper destrutivo → impacto → reauth → confirmação dupla | `A-LOGIN`, `A-INCIDENTS`, `A-BACKUPS`, `A-MAINTENANCE` |

## 5. Estados obrigatórios em todas as telas

Toda tela implementa: `initial-loading`, `empty`, `partial/stale`, `offline`, `processing`, `success`, `domain-error`, `technical-error`, `forbidden/read-only`, `conflict`, `expired` e `maintenance/unavailable`. Cada estado informa causa, efeito, timestamp quando aplicável e ação recuperável. Mutation offline só existe na whitelist com TTL e reconfirmação; caso contrário a tela é leitura.

Partida, temporada, mercado, inscrição e jogador adicionam estados específicos das máquinas canônicas. A UI nunca sintetiza estado inexistente no backend.

## 6. Confirmação proporcional ao risco

| Risco | Padrão |
|---|---|
| baixo/reversível | feedback otimista + undo quando suportado |
| médio | resumo do efeito antes de enviar |
| alto financeiro/esportivo | `HighRiskConfirm`, custo/prazo/alternativas e revalidação server-side |
| irreversível/admin | reautenticação, confirmação nominal, quatro-olhos e recibo auditável |

## 7. Critérios de aceitação

- Todo ID do sitemap aparece exatamente uma vez no mapeamento.
- Toda mutação possui command, idempotência quando aplicável e estados processing/success/failure.
- Operação multiagregado só mostra sucesso após confirmação autoritativa.
- Deep link restaura mundo, entidade e subestado autorizados sem revelar informação oculta.
- Leitor de tela, foco, contraste AA, dynamic type e alvo ≥44 pt são verificados nos golden paths.
- Fluxos críticos testam erro, timeout, offline, conflito e reentrada além do happy path.

## 8. Situação da lacuna de UI

A ausência de 138 wireframes exclusivos não é lacuna de especificação: cada tela tem conteúdo próprio nos documentos de tela e layout explícito por arquétipo neste catálogo. Os seis wireframes densos são referências canônicas detalhadas. Variações visuais futuras não podem alterar hierarquia, consequência, estados ou contratos definidos aqui.

