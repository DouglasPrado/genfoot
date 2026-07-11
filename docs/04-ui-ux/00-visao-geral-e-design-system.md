# Visão Geral e Design System

> **Status:** Rascunho consolidado · **Fontes:** docs/01-game-design/10-experiencia-e-telas.md, docs/02-tecnico/08-frontend-cliente-e-tempo-real.md, docs/02-tecnico/00-arquitetura-geral.md · **Revisão:** 2026-07-11

Este documento define os **fundamentos transversais** da interface do Grinta: os princípios de UX, a decisão de stack (Expo mobile + Next.js admin), os *design tokens*, a biblioteca de componentes, os estados globais que toda tela deve tratar, acessibilidade/i18n/tema, o **template de especificação de tela** usado em toda a área, e como a UI conversa com a API oficial (commands, idempotência, versão, erros) e com o tempo real (WebSocket).

## Sumário

1. [Princípios de UX](#1-princípios-de-ux)
2. [Decisão de stack](#decisão-de-stack)
3. [Design tokens](#3-design-tokens)
4. [Biblioteca de componentes](#4-biblioteca-de-componentes)
5. [Estados globais de tela](#5-estados-globais-de-tela)
6. [Padrão de indicadores](#6-padrão-de-indicadores)
7. [Acessibilidade, i18n e tema](#7-acessibilidade-i18n-e-tema)
8. [Contratos de command na ótica da UI](#8-contratos-de-command-na-ótica-da-ui)
9. [Tempo real na ótica da UI](#9-tempo-real-na-ótica-da-ui)
10. [Template de especificação de tela](#template-de-especificação-de-tela)

---

## 1. Princípios de UX

Herdados do GDD ([`../01-game-design/10-experiencia-e-telas.md`](../01-game-design/10-experiencia-e-telas.md)) e dos fluxos ([`../01-game-design/15-fluxos-completos.md`](../01-game-design/15-fluxos-completos.md)):

1. **Gerenciar, não jogar.** O jogo roda em tempo acelerado, com rodadas simuladas em horários fixos. O usuário atua **entre** as rodadas. Nenhuma tela exige presença em tempo real — a única exceção *opcional* é a partida ao vivo, que também pode ser delegada.
2. **Orientada por contexto.** Em cada tela o usuário deve responder rápido: *o que mudou? o que exige ação? qual o prazo? quem é o responsável? qual a recomendação? qual a consequência de não agir?* (as "6 perguntas" dos fluxos).
3. **Aprofundamento progressivo.** Modo simples por padrão (sinais claros, rótulos qualitativos), profundidade sob demanda (números, faixas, fórmulas). A partida tem **modo compacto** e **modo detalhado**; o mesmo padrão vale para elenco, mercado e finanças.
4. **Explicabilidade.** A interface mostra o *porquê*, não só o *quê* ("sofreu gol após ataques pela esquerda, onde o lateral estava cansado"). Todo evento/decisão importante é explicável e reaproveitável no pós-jogo.
5. **Mobile-first.** Alvos de toque generosos, ações rápidas na zona do polegar, submenus em vez de telas profundas, navegação por *tabs*.
6. **Delegação de confiança.** Toda decisão pode ser delegada à inteligência autorizada do clube (comissão/IA) via automações e políticas offline — o jogador escolhe o que centralizar.
7. **Sem punir a ausência.** Quem some volta a um resumo do que mudou, das decisões automáticas tomadas e dos prazos perdidos, com uma ordem de recuperação sugerida.
8. **O cliente é uma projeção.** A UI nunca é a verdade: exibe o cache do estado oficial e pode ser corrigida pelo servidor a qualquer momento (ver [§8](#8-contratos-de-command-na-ótica-da-ui)).

---

## Decisão de stack

> **Decisão (2026-07-11):** fecha a pendência de "stack nativa" do doc [08](../02-tecnico/08-frontend-cliente-e-tempo-real.md).

| Cliente | Stack | Distribuição |
| --- | --- | --- |
| **App do jogador** | **Expo / React Native** (TypeScript), **Expo Router** (navegação baseada em arquivos), **React Navigation** por baixo | App Store (iOS) e Google Play (Android), via **EAS Build/Submit**; atualizações OTA via **EAS Update** |
| **Admin do mundo** | **Next.js** (App Router, React, TypeScript), renderização web | Web interno, atrás de SSO/RBAC |

Bibliotecas compartilhadas com o que já foi decidido no doc 08 (reaproveitadas em ambos os clientes):

| Camada | Tecnologia | Observação |
| --- | --- | --- |
| Estado do servidor | **TanStack Query** | Cache/revalidação dos dados da API — igual no mobile e no admin |
| Estado de UI | **Zustand** | Apenas estado efêmero local (navegação, modais, seleções) |
| Tempo real | **Socket.IO Client** | Conexão com o `realtime-gateway` |
| Cache offline (mobile) | **Expo SQLite** / **AsyncStorage** / **MMKV** | Equivalente móvel ao IndexedDB do doc 08 para leitura offline limitada |
| Contratos | **`/packages/contracts`** | Tipos de command/query/evento compartilhados (monorepo pnpm + Turborepo) |
| Design system | **`/packages/ui`** (web) + `/packages/ui-native` (RN) | Tokens compartilhados, componentes por plataforma |

**Regras fechadas mantidas do doc 08** (valem para Expo e Next.js):

- O cliente **não** importa domínio de servidor, **não** acessa o banco, **não** executa regras. Consome só a **API oficial `/api/v1`** e o **WebSocket**.
- Separação estrita entre **estado do servidor** (TanStack Query) e **estado de UI** (Zustand/local).
- Mobile-first; o app nativo reutiliza **integralmente** commands, respostas, eventos e contratos.
- O **relógio do mundo é do servidor** — o app nunca deriva prazos do relógio local do aparelho.

> **Monorepo.** `/apps/mobile` (Expo), `/apps/admin` (Next.js), `/apps/api`, `/apps/realtime-gateway`, `/packages/*`. A antiga PWA `/apps/web` do doc 08 pode coexistir ou ser substituída pelo app Expo; esta área assume o **app nativo como cliente principal do jogador**.

---

## 3. Design tokens

Tokens neutros (placeholders a serem ajustados à identidade "Grinta" — ver [`../00-produto/02-identidade-e-nome.md`](../00-produto/02-identidade-e-nome.md)). Definidos uma vez em `/packages/ui` e espelhados em RN.

**Cor semântica** (deriva do código de cores de decisão do doc 08):

| Token | Uso | Categoria de partida |
| --- | --- | --- |
| `color.danger` (vermelho) | Emergência, erro bloqueante, crise | Emergência |
| `color.warning` (amarelo/âmbar) | Risco, atenção, prazo próximo | Risco |
| `color.info` (azul) | Oportunidade, dica, destaque neutro | Oportunidade |
| `color.neutral` (cinza) | Narrativa/informação, estados vazios | Narrativa |
| `color.success` (verde) | Confirmação, saúde boa, meta batida | — |
| `color.brand` | Identidade, ação primária | — |
| `color.surface` / `color.bg` / `color.text` | Superfícies, fundo, texto (com variantes de tema) | — |

**Tipografia:** escala `display / h1 / h2 / h3 / body / bodySmall / caption / mono` (mono para números financeiros e placares). **Espaçamento:** escala 4-pt (`space.1=4 … space.8=32`). **Raio:** `radius.sm/md/lg/pill`. **Elevação:** `elevation.0..3`. **Ícones:** um set consistente (bola, escudo, cifrão, coração/moral, sino, calendário, etc.).

## 4. Biblioteca de componentes

Componentes reutilizados em toda a área (nomeados aqui para as telas referenciarem):

- **Navegação:** `TabBar`, `Header` (com contexto do clube), `BackHeader`, `SegmentedControl` (compacto/detalhado), `BottomSheet` (submenus mobile).
- **Dado:** `StatTile` (indicador com rótulo+valor+tendência), `Meter` (barra 0–100 com faixa nomeada), `Gauge`, `Trend` (▲▼ + delta), `AttributeBar` (atributo 0–100), `KeyValueRow`, `MoneyValue` (mono, moeda do mundo), `Badge`/`Chip` (status, posição, competição), `Avatar`/`Crest` (jogador/escudo), `Sparkline`.
- **Coleção:** `List` (cursor-paginada, *pull-to-refresh*, *infinite scroll*), `PlayerRow`, `MatchRow`, `TableRow` (classificação), `FilterBar`, `SortControl`, `EmptyState`, `Skeleton`.
- **Ação:** `PrimaryButton`, `SecondaryButton`, `DangerButton`, `QuickActionButton` (partida), `Stepper`, `Slider` (instruções táticas), `Toggle`, `FormationPitch` (campo tático 2D, sem 3D), `PlayerSlot` (posição no campo).
- **Feedback:** `Toast`, `Banner` (contextual/urgência), `ConfirmDialog`, `HighRiskConfirm` (dupla confirmação para ações de alto risco), `ProgressToast` (command PENDING/ACCEPTED→COMPLETED), `NotificationCard` (as 5 perguntas), `DecisionCard` (ponto de decisão), `Countdown` (prazo).
- **Narrativa:** `NarrativeCard`, `Timeline`, `FeedItem`, `ReportSection` (relatórios explicáveis).

## 5. Estados globais de tela

**Toda** tela/lista descrita nesta área deve especificar como se comporta nestes estados (o template exige):

| Estado | Comportamento padrão |
| --- | --- |
| **Loading** | `Skeleton` do layout final (não *spinner* solto); a partir do cache da TanStack Query, mostra dado *stale* enquanto revalida. |
| **Vazio** | `EmptyState` com ícone, frase e ação primária ("nenhum alvo salvo → buscar no mercado"). |
| **Erro** | `Banner`/`EmptyState` de erro com `errorCode` legível e ação **Tentar de novo** (só se `retryable`). |
| **Offline** | *Badge* "offline"; mostra último dado em cache (IndexedDB/SQLite) marcado como possivelmente desatualizado; **bloqueia commands** com fila de reenvio quando voltar (idempotência garante segurança). |
| **Otimista** | Ação reflete localmente na hora, com `ProgressToast`; reconcilia com a resposta oficial; **reverte** se `REJECTED`/`CONFLICT`. |
| **Sem permissão / delegado** | Quando o controle está com a IA (offline/ausência) ou fora de janela, a ação aparece **desabilitada** com o motivo e, quando cabível, opção de reassumir/configurar automação. |
| **Somente leitura (mundo)** | Se o mundo está em manutenção/arquivado (`WORLD_READ_ONLY`), commands são bloqueados com aviso; leitura permanece. |

## 6. Padrão de indicadores

O GDD deixou em aberto a granularidade dos indicadores ([doc 10, §9 pendência](../01-game-design/10-experiencia-e-telas.md)). Convenção desta área:

- **Modo simples (padrão):** rótulo qualitativo + cor + `Meter`/`Gauge` (ex.: Moral "boa", Saúde financeira "atenção", faixa de fadiga por setor). As faixas nomeadas seguem as fontes (ex.: saúde financeira 0–100 em 6 faixas — [`03-economia.md §6`](../01-game-design/03-economia.md)).
- **Modo detalhado (sob demanda):** valor numérico e/ou faixa com incerteza (ex.: scouting "potencial 70–90, confiança baixa"; atributos 0–100; xG). Ativado por `SegmentedControl` ou toque no indicador.
- **Estimativas vs. fatos.** Dados imperfeitos (scouting, leitura da comissão, dossiê do adversário) são sempre mostrados como **estimativa** com nível de confiança, nunca como número exato. Fatos consolidados (placar, caixa oficial, tabela) são exatos.

## 7. Acessibilidade, i18n e tema

- **i18n:** todo texto é chave de tradução; nada de string fixa. Idioma padrão **pt-BR**. **`errorCode` é estável e independente do texto traduzido** (doc 08) — a UI traduz o código, não a mensagem do servidor.
- **Formato:** moeda, datas e números formatados pelo *locale*; o **relógio exibido é o do mundo** (servidor), com fuso do mundo, nunca o do aparelho.
- **Acessibilidade:** contraste AA, `accessibilityLabel`/`role` em todos os controles (RN) e ARIA no admin, alvos ≥ 44pt, suporte a *font scaling* do SO, foco visível, não depender só de cor (par cor+ícone+texto).
- **Tema:** claro e escuro; tokens resolvem por tema. Respeita a preferência do SO.
- **Reduce motion:** animações de partida/transição respeitam a preferência de movimento reduzido.

## 8. Contratos de command na ótica da UI

Toda ação que muda estado envia um **command** à API oficial (doc 08). A UI deve:

- Gerar **`commandId`** e **`idempotencyKey`** por intenção do usuário; **reenvio** (reconexão/timeout/repetição) reusa a chave → sem efeito duplicado. `ProgressToast` acompanha `ACCEPTED → PENDING → COMPLETED`.
- Enviar **`expectedVersion`** em commands críticos; em **`CONFLICT`**, mostrar "os dados mudaram" e recarregar o agregado com `currentVersion` antes de reenviar.
- Tratar **`REJECTED`** com o `errorCode` (ex.: `TRANSFER_BUDGET_UNAVAILABLE`, `PLAYER_ALREADY_REGISTERED`, `MATCH_COMMAND_WINDOW_CLOSED`, `CONTRACT_VERSION_CONFLICT`, `WORLD_READ_ONLY`) e `fieldErrors` (validação por campo em formulários).
- Respeitar **`warnings`** não bloqueantes (ex.: "essa venda enfraquece o setor") como confirmação suave.
- Mostrar **`generatedTaskIds`** que viram tarefas na Central e **`generatedEventIds`** que podem chegar por WebSocket.

Ações de **alto risco** (vender titular, demitir staff, aceitar dívida, rescindir, confirmar obra cara) usam `HighRiskConfirm` (dupla confirmação, resumo de consequência) — alinhado às "ações de alto risco" das automações ([doc 10, §6.3](../01-game-design/10-experiencia-e-telas.md)).

## 9. Tempo real na ótica da UI

O app abre um **WebSocket** com o `realtime-gateway` e entra nas salas do **usuário**, **clube**, **mundo** e (quando aplicável) **partida**. A UI:

- Consome eventos com `eventId`/`sequence` por stream (`userSequence`, `clubSequence`, `matchSequence`, `worldSequence`), **deduplica** por `eventId` e detecta buracos por `sequence`.
- Ao **reconectar**, envia `lastKnownSequence` e aplica **eventos perdidos**, **snapshot** ou **ressincronização completa** conforme a resposta.
- Trata o WebSocket como **acelerador**, nunca como verdade: em divergência, revalida via API (TanStack Query `invalidate`).
- Usa eventos para: **partida ao vivo** (feed `matchSequence`), **notificações**, **atualização de negociação**, **mudança de tabela**, **eventos do mundo** e **estado de jobs** relevantes.

Push nativo (APNs/FCM via Expo Notifications) espelha as **notificações estratégicas** quando o app está fechado; o toque abre a tela/decisão correspondente (deep link).

---

## Template de especificação de tela

Todas as telas desta área seguem este esqueleto (campos que não se aplicam podem ser omitidos, exceto **Estados**):

> ### `M-XXXX` — Nome da tela
> - **Objetivo:** uma frase — o que o usuário resolve aqui.
> - **Como se chega:** origem de navegação / deep link / notificação que abre.
> - **Layout:** regiões (topo, corpo, rodapé, modais) e organização mobile.
> - **Componentes e dados:** o que é exibido (campos concretos), com quais componentes.
> - **Ações:** cada ação do usuário → command/efeito e para onde leva (referência ao fluxo `MF-##`).
> - **Estados:** loading, vazio, erro, offline, otimista, sem-permissão/delegado (ver [§5](#5-estados-globais-de-tela)).
> - **Tempo real/notificações:** eventos WebSocket e notificações que atualizam a tela.
> - **Referências:** documento(s) de GDD/técnico de origem.

O mesmo template vale para o admin, com prefixo `A-XXXX`.
