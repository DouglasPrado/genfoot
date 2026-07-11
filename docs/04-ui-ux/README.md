# UI/UX — Interface do Grinta

> **Status:** Rascunho consolidado · **Fontes:** docs/01-game-design/*, docs/02-tecnico/08-frontend-cliente-e-tempo-real.md, docs/02-tecnico/09-operacao-e-admin-do-mundo.md, decisão de stack 2026-07-11 · **Revisão:** 2026-07-11

Esta área especifica **toda a interface** do **Grinta** — o manager de futebol online, persistente e com jogadores únicos. Ela transforma os sistemas descritos no GDD (`../01-game-design/`) e nos documentos técnicos (`../02-tecnico/`) em **fluxos de navegação** e **telas descritas uma a uma**, cobrindo dois clientes:

- **App do jogador (mobile)** — Android e iOS, construído com **Expo / React Native**.
- **Admin do mundo (web)** — painel de operação, construído com **Next.js**.

O princípio herdado do frontend técnico atravessa toda a área: **o servidor é autoritativo e o cliente é não-autoritativo** — a UI projeta, navega, sincroniza e envia *commands*, mas nunca decide regras (ver [`../02-tecnico/08-frontend-cliente-e-tempo-real.md`](../02-tecnico/08-frontend-cliente-e-tempo-real.md)). A meta de produto é: **o jogador gerencia, não joga partida manualmente**; a interface é **mobile-first**, **orientada por contexto** e **de aprofundamento progressivo** (modo simples por padrão, profundidade sob demanda).

> **Nota de stack:** o documento técnico [08](../02-tecnico/08-frontend-cliente-e-tempo-real.md) descreveu a 1ª versão como **PWA** e deixou a stack nativa como pendência. Esta área **fecha essa pendência**: o cliente do jogador é um **app nativo Expo (Android/iOS)** e o admin é **Next.js**. Ambos consomem exclusivamente a **API oficial `/api/v1`** e o **WebSocket** já contratados no doc 08 — nenhum contrato de backend muda. Ver a decisão registrada em [`00-visao-geral-e-design-system.md`](00-visao-geral-e-design-system.md#decisão-de-stack).

## Como navegar esta área

| # | Documento | O que contém |
| --- | --- | --- |
| 00 | [Visão geral e Design System](00-visao-geral-e-design-system.md) | Princípios de UX, decisão de stack, design tokens, biblioteca de componentes, estados globais (loading/vazio/erro/offline/otimista), acessibilidade, i18n, tema, contratos de command na ótica da UI. |
| 01 | [Navegação e Arquitetura de Informação](01-navegacao-e-arquitetura-de-informacao.md) | Modelo de navegação do app (tab bar + stacks + modais), navegação do admin, deep links, e o **sitemap completo** (índice de todas as telas). |
| 02 | [Mobile — Fluxos](02-mobile-fluxos.md) | **Todos os fluxos** do app do jogador, ponta a ponta: onboarding/conta, sessão, os 16 golden paths do jogo mapeados a telas, e micro-fluxos. |
| 03 | [Mobile — Onboarding e Conta](03-mobile-telas-onboarding-e-conta.md) | Telas de conta, seleção de mundo, escolha/criação de clube, revisão inicial, retorno após ausência, troca de clube. |
| 04 | [Mobile — Central, Home e Decisões](04-mobile-telas-central-home-decisoes.md) | Home (painel do clube), Central de decisões/agenda, notificações, automações/delegação à IA. |
| 05 | [Mobile — Elenco, Jogador, Treino e Medicina](05-mobile-telas-elenco-jogador-treino-medicina.md) | Lista de elenco, ficha do jogador, treino, condição física, medicina/lesões. |
| 06 | [Mobile — Tática, Escalação e Partida](06-mobile-telas-tatica-escalacao-partida.md) | Escalação, tática, dossiê do adversário, partida ao vivo (compacta/detalhada), relatório pós-jogo. |
| 07 | [Mobile — Mercado, Transferências e Contratos](07-mobile-telas-mercado-transferencias-contratos.md) | Mercado, scouting, negociação, contratos, renovações, empréstimos, empresários. |
| 08 | [Mobile — Base e Formação](08-mobile-telas-base-e-formacao.md) | Categorias de base, captação, teste, plano de carreira, mentoria, promoção. |
| 09 | [Mobile — Finanças, Estrutura e Estádio](09-mobile-telas-financas-estrutura-estadio.md) | Finanças/contabilidade/comercial, estrutura/instalações e obras, estádio/bilheteria, diretoria/objetivos. |
| 10 | [Mobile — Competições, Calendário e Seleções](10-mobile-telas-competicoes-calendario-selecoes.md) | Tabela, calendário/agenda, competição/regulamento, artilharia, fim de temporada, seleções, histórico e legado. |
| 11 | [Mobile — Comunicação, Torcida e Moral](11-mobile-telas-comunicacao-torcida-moral.md) | Moral do elenco, torcida, imprensa/coletiva, conversas com atletas, feed de eventos/narrativa, reputação. |
| 12 | [Mobile — Perfil, Configurações e Loja](12-mobile-telas-perfil-config-loja.md) | Perfil do clube/usuário, configurações, monetização/loja, suporte. |
| 20 | [Admin — Fluxos](20-admin-fluxos.md) | Todos os fluxos de operação do mundo. |
| 21 | [Admin — Telas](21-admin-telas.md) | Login/RBAC, painel do mundo, saúde econômica/demográfica, competições, correções, moderação/anti-abuso, W.O./punições, suporte/recurso, testes de equilíbrio. |

## Convenções desta área

- **Template de tela.** Cada tela é descrita com o mesmo esqueleto: **Objetivo · Como se chega · Layout · Componentes e dados · Ações · Estados · Tempo real/notificações · Referências**. O template completo está em [`00-visao-geral-e-design-system.md`](00-visao-geral-e-design-system.md#template-de-especificação-de-tela).
- **IDs de tela.** Telas mobile usam prefixo `M-` (ex.: `M-HOME`), telas admin usam `A-` (ex.: `A-WORLD`). Fluxos usam `MF-##` (mobile) e `AF-##` (admin).
- **Rastreabilidade.** Cada tela e fluxo referencia o(s) documento(s) de GDD/técnico de origem. Nada é inventado: onde a fonte é omissa, marca-se `> **Pendência:**`.
- **Nome do produto:** **Grinta** (o diretório `genfoot` é codinome antigo).
- **Não duplicar regras.** A UI descreve **apresentação e interação**; regras, fórmulas e máquinas de estado permanecem nos docs de origem, apenas referenciados.

## Relação com os outros documentos

Esta área **consome** e **não redefine**:

- **Experiência e telas de indicadores** — [`../01-game-design/10-experiencia-e-telas.md`](../01-game-design/10-experiencia-e-telas.md) (ciclo do dia a dia, painel, telas financeira/mercado/jogador). Esta área expande as pendências de "desenho tela-a-tela" listadas lá.
- **Fluxos completos (golden paths)** — [`../01-game-design/15-fluxos-completos.md`](../01-game-design/15-fluxos-completos.md). Os 16 fluxos de negócio são a espinha dorsal do doc [02](02-mobile-fluxos.md).
- **Frontend, cliente e tempo real** — [`../02-tecnico/08-frontend-cliente-e-tempo-real.md`](../02-tecnico/08-frontend-cliente-e-tempo-real.md) (contratos de command/evento, partida ao vivo, recuperação/idempotência).
- **Operação e admin do mundo** — [`../02-tecnico/09-operacao-e-admin-do-mundo.md`](../02-tecnico/09-operacao-e-admin-do-mundo.md) e [`../02-tecnico/04-plataforma-seguranca-operacoes.md`](../02-tecnico/04-plataforma-seguranca-operacoes.md) (RBAC, auditoria, correções) — base do admin.
