# Navegação e Arquitetura de Informação

> **Status:** Rascunho consolidado · **Fontes:** docs/01-game-design/10-experiencia-e-telas.md, docs/01-game-design/15-fluxos-completos.md, docs/02-tecnico/08-frontend-cliente-e-tempo-real.md, docs/02-tecnico/09-operacao-e-admin-do-mundo.md · **Revisão:** 2026-07-11

Este documento define **como o usuário se move** pelo app do jogador (Expo) e pelo admin (Next.js), e traz o **sitemap completo** — o índice de todas as telas, com o ID e o documento onde cada uma é detalhada. É a "planta baixa" da interface; o detalhe tela-a-tela vive nos docs 03–12 (mobile) e 21 (admin).

## Sumário

1. [Modelo de navegação — mobile](#1-modelo-de-navegação--mobile)
2. [Modelo de navegação — admin](#2-modelo-de-navegação--admin)
3. [Deep links e notificações](#3-deep-links-e-notificações)
4. [Sitemap completo — mobile](#4-sitemap-completo--mobile)
5. [Sitemap completo — admin](#5-sitemap-completo--admin)

---

## 1. Modelo de navegação — mobile

**Padrão:** `Expo Router` (rotas por arquivo) com **tab bar inferior de 5 abas** como raiz autenticada, *stacks* dentro de cada aba, e **modais full-screen** para experiências imersivas (onboarding, partida ao vivo, conversas, pontos de decisão).

```
Raiz
├─ (auth)            → fora do tab bar: splash, login, cadastro, recuperação
├─ (onboarding)      → modal-fluxo: mundo → clube → região → aporte → reserva → ativação → revisão
└─ (app)  ── Tab Bar ──────────────────────────────────────────────
   ├─ 🏠 Início    stack: Home ▸ Central de decisões ▸ Notificações ▸ Automações
   ├─ 👥 Elenco    stack: Elenco ▸ Ficha do jogador ▸ Treino ▸ Medicina ▸ Base
   ├─ ⚽ Jogo      stack: Próxima partida ▸ Escalação ▸ Tática ▸ Dossiê ▸ Competições/Tabela/Calendário ▸ Seleções
   │               modal: Partida ao vivo (full-screen) ▸ Ponto de decisão ▸ Intervalo ▸ Pênaltis ▸ Pós-jogo
   ├─ 💱 Mercado   stack: Mercado ▸ Scouting ▸ Negociação ▸ Contrato ▸ Empréstimo ▸ Empresário
   └─ 🏟️ Clube     stack: Hub do clube ▸ Finanças ▸ Estrutura ▸ Estádio ▸ Diretoria ▸ Comunicação ▸ Histórico ▸ Perfil ▸ Config ▸ Loja
```

**Regras de navegação:**

- **Aba Início é o "casa".** *Deep links* e o toque em push sempre conseguem voltar para a Home. A **Central de decisões** é acessível de qualquer aba por um *badge* no `Header` (contador de pendências).
- **Header contextual.** Todas as telas do `(app)` mostram no topo escudo + nome do clube, caixa e um sino de notificações com contador. Trocar de clube (raro, entre temporadas) recarrega o contexto.
- **Partida ao vivo é modal full-screen.** Sobrepõe o tab bar; sai por gesto/botão. Pode ser reaberta pela Home enquanto a partida está `live`.
- **Submenus, não telas profundas.** Ações táticas e rápidas usam `BottomSheet` (ex.: `Pressionar →` leve/alta/máxima). Mobile-first: no máximo ~3 níveis de profundidade por aba.
- **Modo simples/detalhado** é um `SegmentedControl` persistente por área (preferência salva em estado de UI).
- **Estados de bloqueio** (mundo em manutenção, controle delegado à IA, fora de janela) desabilitam ações com o motivo, nunca escondem a tela.

## 2. Modelo de navegação — admin

**Padrão:** `Next.js` App Router, layout web com **sidebar de navegação** + **top bar** (identidade do operador, mundo selecionado, busca global). O acesso a cada seção é filtrado por **papel/permissão (RBAC)** — ver [`../02-tecnico/09-operacao-e-admin-do-mundo.md §5`](../02-tecnico/09-operacao-e-admin-do-mundo.md) e [`../02-tecnico/04-plataforma-seguranca-operacoes.md`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

```
Admin (Next.js)
├─ /login                      SSO + reautenticação para ações críticas
├─ /worlds                     seletor de mundo (escopo de tudo abaixo)
└─ /worlds/[id]/
   ├─ /overview                Painel do mundo (11 itens monitorados)
   ├─ /economy                 Saúde econômica e demografia
   ├─ /competitions            Competições, calendário, tabelas, inscrições
   ├─ /matches                 Partidas pendentes / falhas de processamento
   ├─ /clubs                   Clubes (crise, licenciamento, intervenção)
   ├─ /moderation              Anti-abuso: risk score, contas relacionadas, mercado suspeito, satélite, manipulação
   ├─ /wo-sanctions            W.O., punições, catálogo de sanções
   ├─ /queues                  Filas: revisão, recurso, quarentena, delay
   ├─ /corrections             Correções administrativas + reprocessamento/reversão
   ├─ /audit                   Audit log imutável
   ├─ /support                 Suporte ao usuário e recursos
   ├─ /balance                 Testes de equilíbrio / SimulationLab / verificações de saúde
   └─ /rules                   Versionamento de regras (anti-abuso e geração)
```

**Regras de navegação:**

- **Escopo por mundo.** Tudo abaixo de `/worlds/[id]` é lido/corrigido no contexto daquele mundo (`gameWorldId`).
- **RBAC visível.** Itens fora do papel do operador aparecem desabilitados com "sem permissão", nunca ocultos silenciosamente; ações de escrita exigem reautenticação.
- **Leitura ≫ escrita.** O admin é primariamente diagnóstico; toda ação de escrita passa por confirmação com **motivo obrigatório** e grava no audit log (estado anterior/motivo/responsável).

## 3. Deep links e notificações

Cada notificação/push carrega um destino navegável (esquema `grinta://`), para o toque abrir exatamente a tela/decisão:

| Origem | Deep link | Abre |
| --- | --- | --- |
| "Partida começa às 20h" | `grinta://match/{id}` | Partida ao vivo (ou pré-jogo se ainda não começou) |
| "Proposta pelo seu lateral" | `grinta://transfer/{id}` | Negociação |
| "Contrato vencendo" | `grinta://player/{id}/contract` | Contrato do jogador |
| "Jogador sentiu dores" | `grinta://player/{id}/medical` | Medicina |
| "Torcida insatisfeita" | `grinta://fans` | Torcida |
| "Decisão pendente" | `grinta://decisions/{id}` | Item da Central de decisões |
| "Olheiro achou promessa" | `grinta://scouting/{reportId}` | Relatório de scouting |
| "Fim de temporada" | `grinta://season/close` | Wizard de encerramento |

Push nativo (APNs/FCM via Expo Notifications) espelha as **notificações críticas e importantes** ([doc 13, §2](../01-game-design/13-relatorios-notificacoes-e-memoria.md)); informativas/narrativas ficam só no app. Ver estados e categorias em [`00-visao-geral-e-design-system.md §9`](00-visao-geral-e-design-system.md#9-tempo-real-na-ótica-da-ui).

## 4. Sitemap completo — mobile

Todas as telas do app, com ID e documento de detalhe. IDs `M-*`.

### Autenticação e onboarding → [doc 03](03-mobile-telas-onboarding-e-conta.md)
| ID | Tela |
| --- | --- |
| `M-SPLASH` | Splash / carregamento inicial |
| `M-LOGIN` | Login |
| `M-SIGNUP` | Cadastro |
| `M-RECOVER` | Recuperação de senha |
| `M-WORLD-PICK` | Seleção de mundo / tipo de liga |
| `M-CLUB-PICK` | Escolher assumir clube existente |
| `M-CLUB-CREATE` | Criar clube de expansão |
| `M-REGION-PICK` | Escolha de região/cidade |
| `M-CLUB-PREVIEW` | Estado inicial do clube (elenco, dívidas, riscos) |
| `M-SLOT-RESERVE` | Reserva de vaga / aporte inicial fixo |
| `M-CONTROL-ACTIVATE` | Ativação de controle / pré-temporada |
| `M-ONBOARD-REVIEW` | Revisão inicial (autoridade, objetivos, pendências herdadas) |
| `M-RETURN` | Retorno após ausência longa |
| `M-CLUB-LEAVE` | Abandono / troca de clube |
| `M-ACCOUNT` | Conta e sessão |

### Início, Central e decisões → [doc 04](04-mobile-telas-central-home-decisoes.md)
| ID | Tela |
| --- | --- |
| `M-HOME` | Home / painel do clube |
| `M-DECISIONS` | Central de decisões (caixa de decisões) |
| `M-DECISION-DETAIL` | Detalhe de uma decisão |
| `M-NOTIFS` | Central de notificações |
| `M-AUTOMATIONS` | Automações / delegação à IA |
| `M-AUTOMATION-EDIT` | Editor de automação/política offline |

### Elenco, jogador, treino, medicina → [doc 05](05-mobile-telas-elenco-jogador-treino-medicina.md)
| ID | Tela |
| --- | --- |
| `M-SQUAD` | Elenco (lista) |
| `M-PLAYER` | Ficha do jogador |
| `M-PLAYER-ATTRS` | Atributos detalhados |
| `M-PLAYER-DEV` | Desenvolvimento / histórico de evolução |
| `M-PLAYER-MEMORY` | Memória / trajetória do jogador |
| `M-ROLES` | Papéis, hierarquia e liderança do elenco |
| `M-PROMISES` | Promessas ao jogador |
| `M-TRAINING` | Treino do elenco |
| `M-TRAINING-INDIV` | Plano individual de treino |
| `M-MEDICAL` | Departamento médico / lesões |
| `M-MEDICAL-CASE` | Caso de lesão / reabilitação |

### Base e formação → [doc 08](08-mobile-telas-base-e-formacao.md)
| ID | Tela |
| --- | --- |
| `M-ACADEMY` | Categorias de base |
| `M-YOUTH-INTAKE` | Captação / peneira |
| `M-YOUTH-PLAYER` | Ficha do jovem |
| `M-CAREER-PLAN` | Plano de carreira |
| `M-MENTORING` | Mentoria |
| `M-PROMOTE` | Promoção ao profissional |

### Jogo: escalação, tática, partida → [doc 06](06-mobile-telas-tatica-escalacao-partida.md)
| ID | Tela |
| --- | --- |
| `M-NEXTMATCH` | Próxima partida (central do jogo) |
| `M-LINEUP` | Escalação |
| `M-TACTICS` | Tática |
| `M-GAMEPLAN` | Plano de jogo / IA offline |
| `M-SCOUT-OPP` | Dossiê do adversário |
| `M-PREMATCH` | Pré-jogo / contexto |
| `M-LIVE` | Partida ao vivo (compacta/detalhada) |
| `M-DECISION-POINT` | Ponto de decisão em partida |
| `M-HALFTIME` | Intervalo / ações emocionais |
| `M-PENALTIES` | Disputa de pênaltis |
| `M-POSTMATCH` | Relatório pós-jogo |

### Competições, calendário, seleções → [doc 10](10-mobile-telas-competicoes-calendario-selecoes.md)
| ID | Tela |
| --- | --- |
| `M-COMPETITIONS` | Lista de competições |
| `M-COMPETITION` | Competição (tabela/chaveamento/grupos/rodadas/regulamento/artilharia) |
| `M-CALENDAR` | Calendário / agenda da temporada |
| `M-CALENDAR-DAY` | Detalhe do dia |
| `M-REGISTRATION` | Inscrição de elenco / listas |
| `M-SEASON-CLOSE` | Fim de temporada (wizard) |
| `M-AWARDS` | Premiações |
| `M-NATIONAL` | Seleções / convocações |
| `M-HISTORY` | Histórico e legado do mundo |
| `M-RANKINGS` | Rankings e reputação |

### Mercado, transferências, contratos → [doc 07](07-mobile-telas-mercado-transferencias-contratos.md)
| ID | Tela |
| --- | --- |
| `M-MARKET` | Mercado de transferências |
| `M-SCOUTING` | Scouting / olheiros e relatórios |
| `M-NEGOTIATION` | Negociação (proposta/contra-proposta) |
| `M-CONTRACT` | Contrato / renovação |
| `M-LOAN` | Empréstimo |
| `M-AGENT` | Empresário |
| `M-TRANSFER-STRATEGY` | Estratégia de janela |

### Finanças, estrutura, estádio, diretoria → [doc 09](09-mobile-telas-financas-estrutura-estadio.md)
| ID | Tela |
| --- | --- |
| `M-FINANCE` | Finanças (visão) |
| `M-ACCOUNTING` | Contabilidade e orçamento |
| `M-BUDGET` | Orçamento por áreas / cenários |
| `M-COMMERCIAL` | Comercial / patrocínios |
| `M-MATCHDAY-REVENUE` | Bilheteria / matchday |
| `M-DEBT` | Dívidas / crédito |
| `M-STRUCTURE` | Estrutura / instalações (árvore) |
| `M-DEPARTMENT` | Departamento (detalhe/upgrade) |
| `M-STAFF` | Comissão técnica / staff |
| `M-STAFF-HIRE` | Contratar/demitir funcionário |
| `M-STADIUM` | Estádio |
| `M-STADIUM-WORKS` | Obras do estádio |
| `M-LICENSING` | Licenciamento / interdição |
| `M-BOARD` | Diretoria / objetivos / intervenção |

### Comunicação, torcida, moral → [doc 11](11-mobile-telas-comunicacao-torcida-moral.md)
| ID | Tela |
| --- | --- |
| `M-MORALE` | Moral do elenco |
| `M-FANS` | Torcida |
| `M-RIVALRIES` | Rivalidades e clássicos |
| `M-PRESS` | Imprensa / coletiva |
| `M-CONVO` | Conversa com atleta |
| `M-FEED` | Feed de eventos / narrativa |
| `M-PUBLIC-PROMISES` | Promessas públicas |
| `M-REPUTATION` | Reputação (clube e gestor) |
| `M-SPONSORS-IMAGE` | Imagem pública / patrocinadores |

### Perfil, configurações, loja → [doc 12](12-mobile-telas-perfil-config-loja.md)
| ID | Tela |
| --- | --- |
| `M-CLUB-PROFILE` | Perfil do clube |
| `M-IDENTITY` | Identidade / rebranding |
| `M-SETTINGS` | Configurações |
| `M-STORE` | Loja / monetização |
| `M-SEASON-PASS` | Passe de temporada |
| `M-INTEGRITY` | Regras de integridade |
| `M-BUG-REPORT` | Report de bug |
| `M-SUPPORT` | Suporte e recursos |

## 5. Sitemap completo — admin

Telas do admin (Next.js), IDs `A-*`. Detalhe em [doc 21](21-admin-telas.md).

| ID | Tela | Rota |
| --- | --- | --- |
| `A-LOGIN` | Login / RBAC / reautenticação | `/login` |
| `A-WORLDS` | Seletor de mundo | `/worlds` |
| `A-WORLD` | Painel do mundo (11 itens) | `/worlds/[id]/overview` |
| `A-ECONOMY` | Saúde econômica e demografia | `/worlds/[id]/economy` |
| `A-COMPETITIONS` | Competições, tabelas, inscrições | `/worlds/[id]/competitions` |
| `A-MATCHES` | Partidas pendentes / falhas | `/worlds/[id]/matches` |
| `A-CLUBS` | Clubes (crise, licença, intervenção) | `/worlds/[id]/clubs` |
| `A-MODERATION` | Anti-abuso (risk score, relações, mercado, satélite, manipulação) | `/worlds/[id]/moderation` |
| `A-WO-SANCTIONS` | W.O. e catálogo de punições | `/worlds/[id]/wo-sanctions` |
| `A-QUEUES` | Filas de revisão/recurso/quarentena/delay | `/worlds/[id]/queues` |
| `A-CORRECTIONS` | Correções administrativas / reprocessamento / reversão | `/worlds/[id]/corrections` |
| `A-AUDIT` | Audit log imutável | `/worlds/[id]/audit` |
| `A-SUPPORT` | Suporte e recursos | `/worlds/[id]/support` |
| `A-BALANCE` | Testes de equilíbrio / SimulationLab / health checks | `/worlds/[id]/balance` |
| `A-RULES` | Versionamento de regras | `/worlds/[id]/rules` |

> **Pendência herdada:** o layout fino, os limiares de alerta e a matriz papel↔ação do admin seguem as pendências de [`../02-tecnico/09-operacao-e-admin-do-mundo.md`](../02-tecnico/09-operacao-e-admin-do-mundo.md) e [`../02-tecnico/04-plataforma-seguranca-operacoes.md`](../02-tecnico/04-plataforma-seguranca-operacoes.md). Esta área especifica a UI; os valores finais vivem lá.
