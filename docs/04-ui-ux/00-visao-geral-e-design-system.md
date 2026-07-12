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

> **Recomendação (a ratificar — R-98):** os valores concretos abaixo (hex, tamanhos, pesos, raios, sombras) são uma **1ª passada** para destravar a implementação do design system. **Não são canônicos.** Serão ajustados quando a identidade de marca "Grinta" fechar ([`../00-produto/02-identidade-e-nome.md`](../00-produto/02-identidade-e-nome.md)) — em especial `color.primary`, que é o candidato a **cor de marca provisória**. O *mapa semântico* (§3.1) e a escala 4-pt já eram convenção da área e permanecem; o que R-98 acrescenta são os **valores**. Meta de acessibilidade: todos os pares texto/fundo aqui satisfazem **WCAG AA** (≥ 4.5:1 texto normal, ≥ 3:1 texto grande e componentes de UI) — ver §3.2. Registrado na Série R (R-98/R-99) do ADR ([`../99-decisoes/registro-de-decisoes.md`](../99-decisoes/registro-de-decisoes.md)).

Tokens definidos uma vez em `/packages/ui` (web) e espelhados em `/packages/ui-native` (RN). Cada token resolve por **tema** (claro/escuro). Nomes semânticos — nenhuma tela referencia hex direto.

### 3.1 Cor — mapa semântico (mantido)

Deriva do **código de cores de decisão** do doc 08 (partida, decisões, notificações):

| Token | Uso | Categoria de partida/decisão |
| --- | --- | --- |
| `color.danger` (vermelho) | Emergência, erro bloqueante, crise | Emergência |
| `color.warning` (âmbar) | Risco, atenção, prazo próximo | Risco |
| `color.info` (azul) | Oportunidade, dica, destaque neutro | Oportunidade |
| `color.neutral` (cinza) | Narrativa/informação, estados vazios | Narrativa |
| `color.success` (verde) | Confirmação, saúde boa, meta batida | — |
| `color.primary` | Identidade, ação primária (= `color.brand`) | — |
| `color.bg` / `color.surface` / `color.text` | Fundo, superfícies, texto (variam por tema) | — |

> **Nota de separação (a ratificar):** `color.primary` (verde-grama, matiz ~142°) e `color.success` (esmeralda, matiz ~160°) são **famílias de verde próximas de propósito**. Para não confundir "ação de marca" com "resultado positivo", `success` **sempre** aparece pareado a ícone/rótulo (regra de acessibilidade §7: nunca só cor) e nunca como preenchimento de botão de ação. Se a marca final adotar verde, `success` migra para teal; se a marca adotar outra matiz, essa restrição cai.

### 3.2 Cor — valores concretos (light / dark)

**Neutros** (fundo, superfícies, borda, texto):

| Token | Light | Dark | Uso |
| --- | --- | --- | --- |
| `color.bg` | `#F7F9FB` | `#0B0F14` | Fundo raiz do app |
| `color.surface` | `#FFFFFF` | `#151B23` | Cartões, cabeçalho, tab bar |
| `color.surfaceAlt` | `#EEF2F6` | `#1E2732` | Superfície elevada (sheet, linha ativa, input) |
| `color.border` | `#DCE3EB` | `#2A3542` | Hairline, divisórias |
| `color.borderStrong` | `#C2CCD6` | `#3A4757` | Borda de input, contorno de foco base |
| `color.text` | `#0F172A` | `#F1F5F9` | Texto primário (AA: 16:1 light / 15.8:1 dark) |
| `color.textMuted` | `#556575` | `#94A3B8` | Texto secundário/rótulos (AA: 6.0:1 / 6.75:1) |
| `color.textInverse` | `#FFFFFF` | `#0B0F14` | Texto sobre preenchimento colorido |

**Semânticos** (base para ícone/texto/preenchimento) + **subtle** (fundo de chip/banner):

| Token | Light base | Light subtle | Dark base | Dark subtle | `on*` (texto sobre base) |
| --- | --- | --- | --- | --- | --- |
| `color.primary` | `#047857` | `#ECFDF5` | `#22C55E` | `#0C2A1C` | light `#FFFFFF` · dark `#04150B` |
| `color.success` | `#15803D` | `#F0FDF4` | `#34D399` | `#0B2A20` | light `#FFFFFF` · dark `#04150B` |
| `color.warning` | `#B45309` | `#FEF3C7` | `#FBBF24` | `#2A2109` | light `#FFFFFF` · dark `#231A00` |
| `color.danger` | `#C81E1E` | `#FEF2F2` | `#F87171` | `#2A1414` | light `#FFFFFF` · dark `#2A0A0A` |
| `color.info` | `#1D4ED8` | `#EFF6FF` | `#60A5FA` | `#0E1F3A` | light `#FFFFFF` · dark `#04122A` |
| `color.neutral` | `#556575` | `#F1F5F9` | `#94A3B8` | `#1E2732` | light `#FFFFFF` · dark `#0B0F14` |

- **Uso das variantes:** `base` = ícone, texto de status, preenchimento de botão/badge sólido; `subtle` = fundo de `Badge`/`Banner`/`Toast`/faixa; `on*` = rótulo sobre o `base`. Ex.: badge de crise = fundo `danger.subtle` + texto `danger.base` + ícone.
- **AA verificado** (contraste mínimo): `text`/`textMuted` sobre `bg`/`surface`, e `onColor` sobre cada `base` sólido, todos ≥ 4.5:1. Preenchimentos de status usados como *fill* (sem texto) satisfazem ≥ 3:1 contra a superfície.
- **Elevação no dark:** o tema escuro **não** usa sombra preta; separa camadas por `surface` → `surfaceAlt` (tinta mais clara) + borda. As sombras de §3.5 valem sobretudo no light.

### 3.3 Tipografia

- **Família (a ratificar):** **Inter** (variável) para toda a UI, com **`font-variant-numeric: tabular-nums`** ligado em números (placar, tabela, dinheiro) para alinhamento em colunas. `mono` = **JetBrains Mono** (ou Roboto Mono) reservado a **placar ao vivo, extratos financeiros e IDs**. Respeita *font scaling* do SO (§7); tamanhos abaixo em `pt`/`sp` na escala padrão (100%).
- **Pesos:** `regular 400 · medium 500 · semibold 600 · bold 700`.

| Token | Tamanho / line-height | Peso | Tracking | Uso |
| --- | --- | --- | --- | --- |
| `type.display` | 34 / 40 | 700 | −0.5 | Placar ao vivo, número-herói (caixa, patrimônio) |
| `type.h1` | 28 / 34 | 700 | −0.3 | Título de tela |
| `type.h2` | 22 / 28 | 700 | −0.2 | Título de seção |
| `type.h3` | 18 / 24 | 600 | 0 | Subtítulo, cabeçalho de card |
| `type.body` | 16 / 24 | 400 | 0 | Texto corrido, valor de linha |
| `type.bodySm` | 14 / 20 | 400 | 0 | Texto secundário, descrição de item |
| `type.caption` | 12 / 16 | 500 | +0.2 | Rótulos, metadados, timestamps |
| `type.overline` | 11 / 14 | 600 | +0.8 (maiúsculas) | Rótulo de grupo/seção |
| `type.mono` | 16 / 24 | 500 (tabular) | 0 | Dinheiro, placar, valores-chave |
| `type.monoSm` | 13 / 18 | 500 (tabular) | 0 | Dinheiro em linha de lista/extrato |

### 3.4 Espaçamento — escala 4-pt (confirmada)

Base **4 pt**. Confirmada a escala existente e estendida para telas densas:

`space.0=0 · space.1=4 · space.2=8 · space.3=12 · space.4=16 · space.5=20 · space.6=24 · space.7=28 · space.8=32 · space.10=40 · space.12=48 · space.16=64`

- **Gutter padrão de tela:** `space.4` (16). **Gap entre cards:** `space.3` (12). **Padding interno de card:** `space.4` (16). **Gap intra-linha (label↔valor):** `space.2` (8).

### 3.5 Raio, elevação e sombra

| Raio | Valor | Uso |
| --- | --- | --- |
| `radius.sm` | 6 | Chip, badge, input pequeno |
| `radius.md` | 10 | Botão, input, card padrão |
| `radius.lg` | 14 | Card grande, bottom sheet (topo) |
| `radius.xl` | 20 | Modal, folha destacada |
| `radius.pill` | 999 | Segmented, tab de filtro, avatar-frame |

| Elevação | Sombra (light) | Uso |
| --- | --- | --- |
| `elevation.0` | nenhuma | Fundo/superfície plana |
| `elevation.1` | `0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.10)` | Card, list row destacada |
| `elevation.2` | `0 4px 8px rgba(15,23,42,.08), 0 2px 4px rgba(15,23,42,.06)` | Header fixo com scroll, popover |
| `elevation.3` | `0 12px 24px rgba(15,23,42,.14), 0 4px 8px rgba(15,23,42,.08)` | Bottom sheet, modal, dialog |

No **dark**, `elevation.1..3` reduzem a sombra a ~40% da opacidade e reforçam a separação por `surfaceAlt` + `border` (ver §3.2).

### 3.6 Toque, foco e dimensões

- **Alvo de toque mínimo:** **44 × 44 pt** (iOS/Android/WCAG). `hitSlop` de `space.2` (8) quando o visual é menor.
- **Alturas de controle:** `control.sm = 36` · `control.md = 44` (padrão) · `control.lg = 52`.
- **Linha de lista:** `row.sm = 48` · `row.md = 56` (padrão) · `row.lg = 64` (com avatar + 2 linhas de meta).
- **Tab bar:** altura 56 + *safe area* inferior. **Header:** altura 56 + *safe area* superior.
- **Ícone-botão:** área 44, glifo 24. **Foco visível:** anel de 2 pt em `color.info` (ou `borderStrong`), offset 2 pt — nunca depende só de cor (§7).

### 3.7 Ícones

Um set consistente (bola, escudo, cifrão, coração/moral, sino, calendário, etc.), grade 24, traço 1.5–2 pt, alinhado ao par **cor + ícone + texto** exigido em §7.

## 4. Biblioteca de componentes

Componentes reutilizados em toda a área (nomeados aqui para as telas referenciarem). O **inventário** (§4.1) lista todos; as **especificações** (§4.2) detalham os componentes-chave com variantes, estados e props.

### 4.1 Inventário

- **Navegação:** `TabBar`, `Header` (com contexto do clube), `BackHeader`, `SegmentedControl` (compacto/detalhado), `BottomSheet` (submenus mobile).
- **Dado:** `StatTile` (indicador com rótulo+valor+tendência), `Meter` (barra 0–100 com faixa nomeada), `Gauge`, `Trend` (▲▼ + delta), `AttributeBar` (atributo 0–100), `KeyValueRow`, `MoneyValue` (mono, moeda do mundo), `Badge`/`Chip` (status, posição, competição), `Avatar`/`Crest` (jogador/escudo), `Sparkline`.
- **Coleção:** `List` (cursor-paginada, *pull-to-refresh*, *infinite scroll*), `PlayerRow`, `MatchRow`, `TableRow` (classificação), `FilterBar`, `SortControl`, `EmptyState`, `Skeleton`.
- **Ação:** `PrimaryButton`, `SecondaryButton`, `DangerButton`, `QuickActionButton` (partida), `Stepper`, `Slider` (instruções táticas), `Toggle`, `FormationPitch` (campo tático 2D, sem 3D), `PlayerSlot` (posição no campo).
- **Feedback:** `Toast`, `Banner` (contextual/urgência), `ConfirmDialog`, `HighRiskConfirm` (dupla confirmação para ações de alto risco), `ProgressToast` (command PENDING/ACCEPTED→COMPLETED), `NotificationCard` (as 5 perguntas), `DecisionCard` (ponto de decisão), `Countdown` (prazo).
- **Narrativa:** `NarrativeCard`, `Timeline`, `FeedItem`, `ReportSection` (relatórios explicáveis).

### 4.2 Especificações dos componentes-chave

> **Recomendação (a ratificar — R-99):** variantes, estados e props abaixo são a **1ª passada** de contrato de API dos 10 componentes mais usados. Complementam (não substituem) o inventário. Ajustáveis na implementação de `/packages/ui`/`/packages/ui-native`. Tokens referenciados vêm de §3 (R-98). Os demais componentes do inventário ficam como **inventário** até serem demandados por uma tela.
>
> Os **wireframes de baixa fidelidade** das telas densas (arranjo espacial destes componentes em `M-HOME`, `M-LIVE`, `M-SEASON-CLOSE`, `M-STRUCTURE`, `M-SQUAD`, `M-NEGOTIATION`) estão em [`14-wireframes-telas-densas.md`](14-wireframes-telas-densas.md).

Convenções: todo componente herda os **estados globais** de [§5](#5-estados-globais-de-tela) quando exibe dado do servidor; todo controle acionável respeita **toque ≥ 44 pt** (§3.6) e o par **cor+ícone+texto** (§7). Props marcadas `*` são obrigatórias.

**`Button`**
- **Variantes:** `primary` (fill `color.primary` + `onPrimary`), `secondary` (fill `surfaceAlt`, borda `borderStrong`, texto `text`), `ghost` (sem fundo, texto `primary`), `danger` (fill `color.danger` + `onDanger`), `dangerGhost` (texto `danger`, sem fill).
- **Tamanhos:** `sm` (h36, `type.bodySm`), `md` (h44, `type.body`, padrão), `lg` (h52, `type.h3`). `fullWidth` estica ao container.
- **Estados:** `default` · `pressed` (overlay −8% luminância / opacidade 0.9) · `disabled` (opacidade 0.4, sem toque) · `loading` (spinner substitui o label, largura travada, toque bloqueado) · `focus` (anel §3.6).
- **Props:** `variant`, `size`, `label*` (ou `children`), `leadingIcon`, `trailingIcon`, `loading`, `disabled`, `fullWidth`, `onPress*`, `accessibilityLabel`.
- **Notas:** ação de alto risco usa `HighRiskConfirm`, não só `danger`. Radius `radius.md`.

**`Card`**
- **Variantes:** `flat` (borda, `elevation.0`), `elevated` (`elevation.1`), `interactive` (toque no card inteiro → `pressed`), `accent` (barra/borda esquerda em cor semântica para prioridade).
- **Estados:** `default` · `pressed` (se `interactive`) · `loading` (`Skeleton` do layout) · `selected` (borda `primary`).
- **Props:** `variant`, `padding` (token de §3.4, default `space.4`), `accentColor` (semântico), `header` (título + ação opcional), `footer`, `onPress`, `children*`.
- **Notas:** raio `radius.md`/`lg`; container base de `StatTile`, `DecisionCard`, `NarrativeCard`.

**`Header`**
- **Variantes:** `club` (escudo + nome do clube + `WorldClock` + sino), `back` (`BackHeader`: seta + título + ação à direita), `modal` (título + fechar `×`), `live` (compacto, placar+minuto — usado em `M-LIVE`).
- **Estados:** `default` · `scrolled` (ganha `elevation.2` + borda inferior) · `offline` (badge "offline" ao lado do relógio) · `readOnly` (faixa "mundo em manutenção").
- **Props:** `variant`, `title`, `subtitle`, `leading` (voltar/escudo), `actions[]` (máx 2 ícones-botão), `showClock`, `notificationCount`, `onBack`.
- **Notas:** altura 56 + safe-area (§3.6); o relógio exibido é **o do mundo** (§7), nunca o do aparelho.

**`TabBar`**
- **Variantes:** `bottom` (5 abas máx: Início · Elenco · Tática · Mercado · Clube). Item = ícone + label `type.caption`.
- **Estados por item:** `default` (ícone `textMuted`) · `active` (ícone+label `primary`, ver §7 não-só-cor: peso/ícone preenchido) · `badge` (ponto/contador de pendências) · `disabled`.
- **Props:** `items[]` (`{ key, icon, label, badgeCount }`), `activeKey*`, `onChange*`.
- **Notas:** altura 56 + safe-area; alvo por aba ≥ 44; some/dá lugar a ações rápidas em `M-LIVE` (modal full-screen).

**`Input`** (texto / numérico / moeda)
- **Variantes:** `text`, `number`, `money` (usa `type.mono`, moeda do mundo), `search` (ícone lupa + limpar), `textarea`. Acessórios: `prefix`/`suffix`, `leadingIcon`.
- **Estados:** `default` · `focus` (borda `primary`/`info`, anel) · `filled` · `disabled` (opacidade 0.4) · `error` (borda `danger` + mensagem `fieldErrors`) · `readOnly`.
- **Props:** `value*`, `onChangeText*`, `label`, `placeholder`, `helperText`, `errorText`, `keyboardType`, `maxLength`, `prefix`, `suffix`, `disabled`, `secure`.
- **Notas:** altura `control.md` (44); erros vêm de `fieldErrors` do command (§8), traduzidos por `errorCode`.

**`Badge` / `Chip`**
- **Variantes:** `status` (fill `*.subtle` + texto `*.base`: crise/atenção/oportunidade/ok), `count` (número, pill), `filter` (`Chip` selecionável em `FilterBar`), `role` (posição/papel do jogador), `dot` (indicador mínimo).
- **Tamanhos:** `sm` (h20, `type.caption`), `md` (h24, `type.bodySm`).
- **Estados:** `default` · `selected` (só `filter`: fill `primary.subtle`, borda `primary`) · `disabled`.
- **Props:** `variant`, `tone` (`primary|success|warning|danger|info|neutral`), `label*`, `icon`, `selected`, `onPress` (se `filter`).
- **Notas:** status **sempre** com ícone (§7); raio `radius.pill`/`sm`.

**`Sheet` / `Modal`** (`BottomSheet`, `ConfirmDialog`, `HighRiskConfirm`)
- **Variantes:** `bottomSheet` (submenu/ações, arrasta para fechar), `dialog` (centralizado, confirmação curta), `fullScreen` (fluxo denso: `M-LIVE`, wizard), `highRisk` (`HighRiskConfirm`: resumo de consequência + dupla confirmação).
- **Estados:** `entering`/`visible`/`exiting` (respeita *reduce motion* §7) · `loading` (ação em voo) · `dismissible`/`non-dismissible` (highRisk não fecha por toque fora).
- **Props:** `variant`, `title`, `children*`, `primaryAction` (`{label, tone, onPress, loading}`), `secondaryAction`, `onDismiss`, `snapPoints` (bottomSheet), `dismissible`.
- **Notas:** `elevation.3` + `radius.xl`; *scrim* sobre o fundo; foco preso dentro (a11y).

**`ListRow`** (`PlayerRow`, `MatchRow`, `TableRow`, `KeyValueRow`)
- **Variantes:** `nav` (chevron → empurra tela), `value` (label↔valor, `KeyValueRow`), `player` (avatar + nome + meta + status), `selectable` (checkbox/multiseleção), `swipeable` (ações em *swipe*: adiar/lembrete).
- **Estados:** `default` · `pressed` · `selected` · `disabled` · `loading` (`Skeleton`) · `dragging` (reordenação, ex. batedores de pênalti).
- **Props:** `leading` (avatar/ícone), `title*`, `subtitle`, `trailing` (valor/badge/chevron), `onPress`, `swipeActions[]`, `selected`, `accentColor`.
- **Notas:** altura `row.md` (56) / `row.lg` (64 com 2 linhas); toque no row inteiro.

**`StatTile`** (indicador rótulo+valor+tendência)
- **Variantes:** `simple` (rótulo qualitativo + cor + `Meter`, padrão — §6), `detailed` (valor numérico + `Trend`), `estimate` (faixa + confiança, para dado imperfeito), `mono` (número financeiro grande).
- **Estados:** `default` · `loading` (`Skeleton`) · `stale` (dado em cache, marca discreta) · `empty` (traço "—") · `pressable` (toque alterna simple↔detailed, §6).
- **Props:** `label*`, `value*`, `unit`, `tone` (semântico), `trend` (`{dir: up|down|flat, delta}`), `meter` (`{value, band}`), `confidence` (para `estimate`), `onPress`.
- **Notas:** `estimate` **nunca** mostra número exato de scouting/leitura (§6); usa `type.mono` para dinheiro/placar.

**`Toast`** (`Toast`, `ProgressToast`)
- **Variantes:** `info` · `success` · `warning` · `danger` (fundo `*.subtle`, ícone `*.base`) · `progress` (`ProgressToast`: acompanha command `ACCEPTED→PENDING→COMPLETED`, §8).
- **Estados:** `entering`/`visible`/`exiting` · `progress` mostra `pending` (spinner) → `completed` (check) → `failed` (retry se `retryable`).
- **Props:** `tone`, `message*`, `icon`, `action` (`{label, onPress}` ex. "Desfazer"/"Tentar de novo"), `duration` (auto-dismiss; `progress` fica até resolver), `commandId` (correlaciona com §8).
- **Notas:** não bloqueia a UI; ação otimista revertida em `REJECTED`/`CONFLICT` dispara `danger` com motivo (§5, §8).

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
- Mantém no `Header` o *chrome* persistente do mundo — `WorldClock` (data/fuso do mundo, §4.2) e **`RoundStatus`** (estado da rodada: **aberta** / **bloqueada** após o *lock* da escalação / **simulando** em lote / **publicada**) — alimentado pelo `worldSequence`. O *lock* recusa commands de escalação com `MATCH_COMMAND_WINDOW_CLOSED` (§8) e é sinalizado proativamente **antes** do bloqueio; em manutenção, o `Header` entra em `readOnly` (`WORLD_READ_ONLY`, §5).

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
