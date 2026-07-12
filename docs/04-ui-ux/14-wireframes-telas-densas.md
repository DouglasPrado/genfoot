# Wireframes — Telas densas (mobile)

> **Status:** Rascunho consolidado · **Fontes:** [`00-visao-geral-e-design-system.md`](00-visao-geral-e-design-system.md), [`04-mobile-telas-central-home-decisoes.md`](04-mobile-telas-central-home-decisoes.md), [`06-mobile-telas-tatica-escalacao-partida.md`](06-mobile-telas-tatica-escalacao-partida.md), [`07-mobile-telas-mercado-transferencias-contratos.md`](07-mobile-telas-mercado-transferencias-contratos.md), [`09-mobile-telas-financas-estrutura-estadio.md`](09-mobile-telas-financas-estrutura-estadio.md), [`10-mobile-telas-competicoes-calendario-selecoes.md`](10-mobile-telas-competicoes-calendario-selecoes.md), [`05-mobile-telas-elenco-jogador-treino-medicina.md`](05-mobile-telas-elenco-jogador-treino-medicina.md), doc 08 (partida ao vivo) · **Revisão:** 2026-07-11

Wireframes **textuais** (ASCII/blocos) das **telas mais densas** do app do jogador — aquelas onde a hierarquia visual e o comportamento responsivo precisam ser resolvidos antes da implementação. Cada tela já tem sua **especificação** (Objetivo/Layout/Componentes/Ações/Estados) no documento indicado; aqui fixamos o **arranjo espacial** e o **fluxo de leitura** em tela pequena.

> **Recomendação (a ratificar — R-99):** os arranjos abaixo são a **1ª passada** de wireframe (baixa fidelidade, sem pixel-perfect). Complementam as specs de tela e o design system ([§4.2, R-99](00-visao-geral-e-design-system.md#42-especificações-dos-componentes-chave)); tokens de cor/tipografia/espaço vêm de [§3 (R-98)](00-visao-geral-e-design-system.md#3-design-tokens). Nada aqui é canônico — ajustável no protótipo de alta fidelidade. Componentes citados (`Header`, `Card`, `StatTile`, `TabBar`, `BottomSheet`, `ListRow`, `Badge`, `Toast`…) são os de §4.

**Convenções dos diagramas:**

- Largura de referência = **celular retrato ~360–390 pt**. Cada moldura `┌─┐` é a viewport.
- `[ Botão ]` = ação · `(•)` = badge/contador · `▸` = navega/empurra tela · `▾` = expande/`BottomSheet` · `▲▼` = tendência (`Trend`) · `███░░` = `Meter`/barra 0–100 · `«fixo»` = região fixa (não rola) · `↕` = região rolável.
- **Zona do polegar** = terço inferior; ações primárias e destrutivas ficam lá em telas de ação (partida).
- Cor citada = token semântico de §3 (ex.: *danger*, *warning*, *primary*).

---

## Índice

1. [`M-HOME` — Home / painel do clube](#m-home--home--painel-do-clube)
2. [`M-LIVE` — Partida ao vivo](#m-live--partida-ao-vivo)
3. [`M-SEASON-CLOSE` — Fim de temporada (wizard ~20 passos)](#m-season-close--fim-de-temporada-wizard-20-passos)
4. [`M-STRUCTURE` — Estrutura / instalações (árvore)](#m-structure--estrutura--instalações-árvore)
5. [`M-SQUAD` — Elenco (lista densa)](#m-squad--elenco-lista-densa)
6. [`M-NEGOTIATION` — Negociação (proposta/contra-proposta)](#m-negotiation--negociação-propostacontra-proposta)

---

## `M-HOME` — Home / painel do clube

**Objetivo:** em um olhar, situar o clube e o próximo compromisso e apontar o que exige ação. Spec: [`04 §M-HOME`](04-mobile-telas-central-home-decisoes.md).

```
┌────────────────────────────────────┐
│ «Header (club)»                    ↕│  ← fixo, elevation.2 ao rolar
│ (◈) Grêmio Fulano   🕒 D+3 12:40 (🔔3)│    escudo · nome · WorldClock · sino
├────────────────────────────────────┤
│ ⚡ FAIXA DE URGÊNCIAS               │  ← só aparece se há pendências
│ ▸ 3 decisões · a mais crítica:     │    fundo danger.subtle, texto danger
│   "Renovar zagueiro — vence em 2d" │    toque ▸ M-DECISIONS
├────────────────────────────────────┤ ↕ (corpo rolável)
│ ┌ PRÓXIMO COMPROMISSO ───────────┐ │  ← Card accent (primary), dominante
│ │ SÁB 20:00 · Série B · Rod. 12  │ │
│ │  vs  ▓ Adversário FC   (fora)  │ │
│ │  8º ▸ objetivo: acesso         │ │
│ │  ⚠ seu atacante está cansado   │ │  warning + ícone
│ │  [ Preparar ▸ ]  [ Escalar ▸ ] │ │  zona de ação do card
│ └────────────────────────────────┘ │
│                                     │
│ INDICADORES  (modo simples)         │  ← overline
│ ┌─StatTile─┐┌─StatTile─┐┌─StatTile┐ │  grid 3-col (2-col se estreito)
│ │ Moral    ││ Torcida  ││ Caixa   │ │
│ │ ███░ boa ││ ██░ atenç││ R$ 1,2M │ │  Meter+rótulo · mono p/ dinheiro
│ │  ▲       ││  ▼       ││  ▲ 4%   │ │  Trend
│ └──────────┘└──────────┘└─────────┘ │
│                                     │
│ AÇÕES RÁPIDAS                       │
│ [Elenco][Tática][Mercado][Treino]…  │  ← linha rolável horizontal de chips
│                                     │
│ ┌ ANTES/DEPOIS DA RODADA ─────────┐ │  ← NarrativeCard
│ │ "Venceu 2×1; jovem marcou o 1º  │ │
│ │  gol como profissional."        │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ «TabBar»  ⌂Início  ⚑Elenco  ⚙Tát… │  ← fixo, 5 abas, badge em Início
└────────────────────────────────────┘
```

- **Hierarquia visual:** (1) faixa de urgências (quando existe, quebra o topo em *danger*) → (2) card "próximo compromisso" (accent, maior superfície) → (3) fileira de indicadores → (4) ações → (5) narrativa. O olho cai primeiro no que **exige ação com prazo**.
- **Estado sem pendências:** a faixa de urgências some; o card de compromisso sobe. Partida em andamento troca o card por faixa **"AO VIVO — abrir ▸"** (`primary`, pulsa uma vez) que abre `M-LIVE`.
- **Responsivo (mobile):** telas ≥ 380 pt → indicadores em **3 colunas**; < 360 pt → **2 colunas** + rolagem. *Font scaling* grande: `StatTile` vira lista de 1 coluna (label sobre valor). *Landscape*: compromisso e indicadores lado a lado (2 colunas de conteúdo). *Offline*: badge no `Header` + `StatTile` em estado `stale`.

---

## `M-LIVE` — Partida ao vivo

**Objetivo:** acompanhar e intervir (ou delegar) sem que o cliente rode regra. **Modal full-screen** (fora da TabBar). Spec: [`06 §M-LIVE`](06-mobile-telas-tatica-escalacao-partida.md); doc 08.

```
┌────────────────────────────────────┐
│ «Header (live)»            [Sair ×] │  ← fixo
│  Série B · Rod.12 · AO VIVO ●       │
│        1  —  1        68'           │  ← type.display, mono, DOMINANTE
│    Grêmio F.   Advers.FC            │
├────────────────────────────────────┤
│ [ Compacto | Detalhado ]  ← Segmented (§4)  troca densidade
├────────────────────────────────────┤ ↕ corpo (rola)
│  LATERAL DE ESTADO (faixa)          │  visível nos 2 modos
│  Posse 43% ███░░  Momentum ▼        │
│  Pressão ██░░  ⚠ setor esq. cansado │  warning + ícone
│  ──────────────────────────────────│
│  ● 66' GOL Advers.FC — cruzamento   │  ← FEED (Timeline), mais recente no topo
│    pela ESQUERDA, lateral s/ cober- │    explicabilidade inline
│    tura. [por quê ▾]                │
│  ○ 61' Substituição adversária      │
│  ○ 58' Você recuou a linha →        │
│    posse 51%→43% (efeito medido)    │  feedback pós-ação
│  … (modo Detalhado: + zonas, xG,    │
│     fadiga por setor, padrões)      │
├────────────────────────────────────┤
│ «AÇÕES RÁPIDAS» (zona do polegar)   │  ← fixo, grid 4×2
│ [Recuar▾][Pressionar▾][Atacar▾]    │  cada uma abre BottomSheet
│ [Controlar][MarcarForte][Contra-a.] │  (leve/alta/máx…) → command
│ [Substituir▾]  [Poupar]  [Tática▾]  │
└────────────────────────────────────┘

  ── SOBREPÕE quando chega DECISION_POINT_CREATED ──
┌────────────────────────────────────┐
│ «BottomSheet — M-DECISION-POINT»    │  ← sobe pela base, scrim atrás
│ 🔴 EMERGÊNCIA · expira em 2' ⏳      │  cor pelo tipo (cinza/azul/amarelo/vermelho)
│ Camisa 8 no limite físico           │
│ Por quê: 3 sprints seguidos, fadiga │  as 5 perguntas
│ Opções:                             │
│  ▸ [Substituir por #16]  risco baixo│  SuggestedAction: impacto/risco/confiança
│  ▸ [Recuar e poupar]     risco médio│
│  ▸ [Ignorar (IA resolve)]           │
└────────────────────────────────────┘
```

- **Hierarquia visual:** o **placar + minuto** (`type.display`, mono) domina o topo e nunca rola. A **lateral de estado** (posse/momentum/pressão) é secundária mas sempre visível. O **feed** ocupa o corpo rolável. As **ações rápidas** ficam ancoradas na base (zona do polegar), sempre alcançáveis com uma mão.
- **Modo Compacto vs Detalhado** (`SegmentedControl`): compacto = placar + feed + decisões; detalhado revela zonas, xG, fadiga por setor, padrões e trade-offs no corpo — sem mudar a base de ações.
- **Ponto de decisão:** entra como `BottomSheet` (não modal cheio) para não tampar o placar; cor pelo tipo; `Countdown` visível; expira → resolvido pela IA.
- **Responsivo (mobile):** grid de ações 4×2 em ~360 pt; < 340 pt → rótulos encurtam para ícone+tooltip. *Landscape*: placar à esquerda, feed à direita, ações em coluna na borda do polegar dominante. **Reduce motion** (§7): pulsos/transições viram *fades*. **Desconexão:** ao voltar, um `Card` de resumo estruturado do período offline abre no topo do feed (minuto/placar/eventos/ações da IA) antes de retomar o stream.

---

## `M-SEASON-CLOSE` — Fim de temporada (wizard ~20 passos)

**Objetivo:** conduzir/acompanhar a virada de ciclo. **Wizard sequencial** espelhando o motor de virada (~20 passos), agrupado em etapas. Spec: [`10 §M-SEASON-CLOSE`](10-mobile-telas-competicoes-calendario-selecoes.md).

```
┌────────────────────────────────────┐
│ «Header (modal)»  Fim de Temporada ×│  ← fixo
│ Etapa 3 de 7 · passo 8/20           │  progresso duplo (etapa · passo)
│ ●───●───◉───○───○───○───○           │  ← Stepper de ETAPAS (fixo)
│ Homolog│Prem│AVAL│Desenv│Contr│Merc│…│
├────────────────────────────────────┤ ↕ corpo (rola) — 1 etapa por vez
│ ▌AVALIAÇÃO DA DIRETORIA             │  ← título de etapa (accent)
│ ┌ BoardEvaluation ────────────────┐ │
│ │ Esperado: acesso   Real: 8º ✗   │ │  esperado × real, ícone
│ │ Finanças        ███░ ok         │ │
│ │ Desenvolvimento ████ bom        │ │  StatTile/Meter empilhados
│ │ Satisfação      ██░░ atenção    │ │
│ │ Paciência       ███░ média      │ │
│ │ ── Nota final:  6,4 / 10        │ │  mono, destaque
│ └─────────────────────────────────┘ │
│ ┌ FanEvaluation ──────────────────┐ │
│ │ Torcida: frustrada, mas paciente│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ⓘ Etapas com DECISÃO (contrato,     │  passos que exigem input do usuário
│   renovação, aposentadoria) pedem   │  vs. passos informativos (só avança)
│   ação; as informativas só avançam. │
├────────────────────────────────────┤
│ «Barra de navegação do wizard»      │  ← fixo (zona do polegar)
│ [‹ Voltar]        [Avançar ›]       │  Avançar = primary; Voltar = ghost
│  ⓘ na ausência: processa automático │  com limites de autoridade
└────────────────────────────────────┘

  ── Passo com DECISÃO (ex.: aposentadoria) ──
│ ▌APOSENTADORIAS / REAPROVEITAMENTO  │
│ ┌ RetirementDecision — Vet. #4 ───┐ │
│ │ 36 anos · rendimento ▼          │ │
│ │ ○ Aposentar   ○ Renovar 1 ano   │ │  opções mutuamente exclusivas
│ │ ○ Reduzir salário ○ Clube menor │ │
│ │ ○ Auxiliar ○ Olheiro ○ Empresário│ │  reaproveitamento
│ └─────────────────────────────────┘ │
│ [ Confirmar decisão ]  ← trava avançar até resolver
```

- **Hierarquia visual:** o **Stepper de etapas** (fixo no topo) ancora "onde estou / quanto falta"; o **corpo** mostra **uma etapa por vez** (evita rolagem infinita das ~20 telas do motor); a **barra Voltar/Avançar** fixa na base garante progresso com o polegar. Passos que exigem decisão **travam** o "Avançar" até resposta; passos informativos (homologação, premiações, evolução) só confirmam.
- **Agrupamento:** os ~20 passos do motor colapsam em **7 etapas** navegáveis (Homologação → Premiações → Avaliação → Desenvolvimento → Contratos/Aposentadorias → Mercado/Finanças → Base/Briefing). O passo atual aparece como "8/20" para transparência.
- **Responsivo (mobile):** Stepper de etapas rola horizontalmente quando não cabem 7 rótulos; em < 360 pt mostra só "Etapa 3/7" + pontos. *Font scaling* grande: cards de avaliação empilham Meters em 1 coluna. **Ausência:** o wizard roda sozinho com **limites de autoridade** (não vende jogador-chave, não assume dívida, não muda identidade) e o retorno mostra o **resumo do que foi decidido** antes do briefing da nova temporada.

---

## `M-STRUCTURE` — Estrutura / instalações (árvore)

**Objetivo:** ver e evoluir a estrutura física do clube. **Árvore por ramos** com cards por departamento. Spec: [`09 §M-STRUCTURE`](09-mobile-telas-financas-estrutura-estadio.md).

```
┌────────────────────────────────────┐
│ «Header (back)»  ‹ Estrutura        │  ← fixo
│ Nível geral do clube: 4/10 · Amador→│    roll-up + estilo derivado
│ Estilo: Formador  ███░░░░░░░        │
├────────────────────────────────────┤ ↕ corpo (rola)
│ ⌕ Filtrar ramo  [Todos▾]            │
│                                     │
│ ▾ FUTEBOL                           │  ← ramo (colapsável), overline
│  ├┌ Comissão técnica ───── 5/10 ─┐  │  card canônico por departamento
│  │└ ██████░░░░ Semiprofissional  │  │  Meter do nível + faixa nomeada
│  │  💰 +R$ 80k · ⏱ 30d · ✓ req.  ▸│  │  custo·tempo·requisitos · ▸ M-DEPARTMENT
│  ├┌ Preparação física ──── 3/10 ─┐  │
│  │└ ███░░░░░░░ Amador           ▸│  │
│  ├┌ Equipe médica ─🏗 em obra ──┐  │  estado "em obra": contagem
│  │└ implantando… ██░ 12/40 dias  │  │  progresso da obra
│  └┌ Análise ──────────── 2/10 ──┐  │
│    └ ⚠ requisito: nível clube ≥5▸│  │  requisito não atendido bloqueia
│                                     │
│ ▸ ADMINISTRAÇÃO   (4 deptos)        │  ← ramos colapsados
│ ▸ SAÚDE           (3 deptos)        │
│ ▸ BASE            (2 deptos)        │
│ ▸ MARCA           (2 deptos)        │
│ ▸ INFRAESTRUTURA  (CT · Estádio)    │
├────────────────────────────────────┤
│ «TabBar» (aba Clube ativa)          │  ← fixo
└────────────────────────────────────┘
```

- **Hierarquia visual:** o **roll-up** (nível geral + estilo derivado) fica no topo fixo como leitura de "onde o clube está". A **árvore** organiza por **ramo** (colapsável) → **departamento** (card canônico). Cada card comunica em uma olhada: nível (Meter + faixa), custo/tempo de melhoria e se está **liberado / em obra / bloqueado por requisito** (cor: neutro / *warning* em obra / *danger*+ícone bloqueado).
- **Card de departamento (canônico):** nível 1–10 + faixa nomeada (Amador→Elite), custo de melhoria, tempo, custo mensal, benefícios, requisitos, impacto — resumidos no card, detalhe em `M-DEPARTMENT` (▸).
- **Responsivo (mobile):** por padrão **só o ramo focado fica aberto** (acordeão) para caber em tela pequena; demais colapsados com contador. Cards de departamento em 1 coluna (largura cheia) sempre. *Font scaling* grande: linha custo/tempo/requisito quebra em duas. Obra em andamento: `Meter` de progresso + dias restantes; requisito não atendido desabilita o toque de upgrade com o motivo.

---

## `M-SQUAD` — Elenco (lista densa)

**Objetivo:** ver e gerir o plantel; ponto de partida para escalação, treino e mercado. **Lista agrupável + FilterBar + SortControl**. Spec: [`05 §M-SQUAD`](05-mobile-telas-elenco-jogador-treino-medicina.md).

```
┌────────────────────────────────────┐
│ «Header (club)» ⚑ Elenco       (🔔) │  ← fixo
│ [ Profissional | Base ]  ← Segmented│
├────────────────────────────────────┤
│ «Cabeçalho: relatório de elenco»    │  ← Card, colapsável
│ Profundidade: ⚠ falta ala-esq.     │  lacunas/excesso/risco em uma linha
│ Idade média 26,3 · 2 em risco saída │
├────────────────────────────────────┤
│ ⌕ Buscar  [Pos▾][Papel▾][Status▾]…  │  ← FilterBar (chips) + [⇅ Ordenar]
│ Agrupar: ● Posição ○ Setor          │
├────────────────────────────────────┤ ↕ lista (infinite/pull-to-refresh)
│ ── GOLEIROS ────────────────────    │  ← header de grupo (sticky)
│ ┌ PlayerRow ──────────────────────┐ │  row.lg (64), avatar + 2 linhas meta
│ │ 🙂 João Silva      GK  28  🟢    │ │  foto·nome·pos·idade·status(dot)
│ │    OVR alto ███░ · Moral boa     │ │  overall(faixa)·moral
│ │    Cond █████ · Fadiga ██░ · 2a  │ │  forma·fadiga·contrato restante
│ └─────────────────────────────────┘▸│  ▸ M-PLAYER
│ ── ZAGUEIROS ───────────────────    │
│ ┌ PlayerRow ─────────── ☑ (multi) ─┐│  seleção p/ comparar
│ │ 😐 Vet. #4  ZAG 36 🔴lesão · à💲 │ ││  status múltiplo: badges
│ │    OVR médio ██░ · Moral baixa ▼ │ ││
│ └─────────────────────────────────┘ │
│ … (rola; setores VOL/MEI/ATA)       │
├────────────────────────────────────┤
│ «Barra de seleção» (aparece c/ multi)│  ← fixo quando há seleção
│ 2 selecionados  [ Comparar ▸ ] [×]  │
├────────────────────────────────────┤
│ «TabBar» (aba Elenco ativa)         │
└────────────────────────────────────┘
```

- **Hierarquia visual:** o **relatório de elenco** (topo) dá o panorama (lacunas/risco) antes da lista. A `FilterBar`/`SortControl` ficam logo abaixo, fixas ao rolar. Cada `PlayerRow` é **denso mas escaneável**: linha 1 = identidade + status (dots/badges de cor+ícone), linha 2 = indicadores em `Meter` (modo simples). Grupos por posição/setor com cabeçalho **sticky**.
- **Densidade controlada:** modo simples por padrão (faixa/cor); toque abre `M-PLAYER`. Status compostos (lesão + à venda + convocado) viram **badges** empilhados à direita, sempre cor+ícone (§7).
- **Responsivo (mobile):** `PlayerRow` usa `row.lg` (64) com 2 linhas; em < 340 pt a 2ª linha reduz a Moral+Fadiga (esconde Cond. atrás de toque). *Font scaling* grande: indicadores da linha 2 quebram para baixo. **Multiseleção**: barra de ação fixa na base (zona do polegar) com "Comparar". Filtro/ordenação **persistidos** entre sessões; estado vazio de filtro mostra `EmptyState` com "limpar filtros".

---

## `M-NEGOTIATION` — Negociação (proposta/contra-proposta)

**Objetivo:** conduzir a negociação de compra/venda. **Cabeçalho do jogador + thread + editor de proposta**. Spec: [`07 §M-NEGOTIATION`](07-mobile-telas-mercado-transferencias-contratos.md).

```
┌────────────────────────────────────┐
│ «Header (back)» ‹ Negociação        │  ← fixo
│ ▓ Camisa 10 · MEI · 24 · Advers.FC  │  jogador + clube detentor
│ Estado: ◉ Em análise                │  máquina: Rascunho→Enviada→Em análise→
│ Rasc─Env─◉Anál─Contra─Aceita─Form   │   Contraproposta→Aceita→Formalização→Registrada
├────────────────────────────────────┤
│ «Painéis de apoio» (chips ▾)        │
│ 💲 Estimado R$ 8M · pedido R$ 12M ⚠ │  valor estimado vs pedido (warning gap)
│ 👀 3 clubes interessados            │
│ 🛡 Reserva: R$ 15M livres p/ janela │  reserva de recursos (não gastar 2x)
│ 💡 Comissão sugere: ofertar +bônus  │  recomendação (confiança por nível)
├────────────────────────────────────┤ ↕ THREAD da negociação (rola)
│ ┌ você · D+1 ────────────────────┐  │  histórico em "bolhas" (Timeline)
│ │ Proposta: R$ 8M à vista        │  │
│ └────────────────────────────────┘  │
│         ┌ Advers.FC · D+2 ───────┐  │  contraproposta alinhada à direita
│         │ Contra: R$ 12M, 2x +   │  │
│         │ 10% de venda futura    │  │
│         └────────────────────────┘  │
├────────────────────────────────────┤
│ «Editor de proposta» (colapsável ▾) │  ← fixo na base (zona do polegar)
│ Valor  [ R$ 10.000.000 ] (mono)     │  Input money
│ Pagamento ● À vista ○ Parcelas: [3] │
│ Bônus condicionais  [+ adicionar]   │
│ Comissão empresário · Venda futura% │
│ Cláusulas · Contrapartida (troca)   │  (linhas expansíveis)
│ ⚠ fora da faixa plausível → revisão │  aviso anti-abuso (se aplicável)
│ [ Enviar proposta ]  ← primary      │  command idempotente
└────────────────────────────────────┘
```

- **Hierarquia visual:** três faixas fixas — **cabeçalho + estado** (onde a negociação está, via mini-stepper), **painéis de apoio** (estimado×pedido, interessados, reserva, recomendação) e **editor na base** — emolduram o **thread rolável** no centro. O usuário lê o histórico e age sem sair da tela.
- **Estado da negociação** como stepper compacto no topo: `Rascunho → Enviada → Em análise → Contraproposta → Aceita → Formalização → Registrada`. **Exame médico** entra entre *Aceita* e *Formalização* quando aplicável (5 desfechos) — ver adendo [`13`](13-mobile-complementos-social-mundo-e-adendos.md).
- **Ações críticas:** "Enviar proposta" é command idempotente (§8). **Aceitar** encadeia `M-CONTRACT` (compra) ou formaliza a saída (venda). `TRANSFER_BUDGET_UNAVAILABLE` → `Toast danger` + destaque da reserva. Proposta fora da faixa plausível → sinalização anti-abuso/quarentena (`HighRiskConfirm`/aviso).
- **Responsivo (mobile):** o **editor colapsa** para dar espaço ao thread; toque em "▾" o expande sobre a base (como `BottomSheet`) para não brigar por altura com o teclado. *Font scaling* grande: painéis de apoio viram lista de 1 coluna. **Otimista/offline:** envio reflete na thread com `ProgressToast`; reverte em `REJECTED`/`CONFLICT` recarregando o agregado (`currentVersion`).

---

## Notas de consistência

- Todas as telas herdam os **estados globais** ([design system §5](00-visao-geral-e-design-system.md#5-estados-globais-de-tela)): loading (`Skeleton` do layout), vazio (`EmptyState`), erro (`Banner`+`errorCode`), offline (badge + cache), otimista (`ProgressToast`), sem-permissão/delegado (ação desabilitada com motivo), somente-leitura do mundo.
- Os componentes citados (`Header`, `Card`, `StatTile`, `TabBar`, `BottomSheet`, `ListRow`/`PlayerRow`, `Badge`, `Toast`, `Input`, `Button`) seguem as specs de [§4.2 (R-99)](00-visao-geral-e-design-system.md#42-especificações-dos-componentes-chave) e os tokens de [§3 (R-98)](00-visao-geral-e-design-system.md#3-design-tokens).
- **Acessibilidade** ([§7](00-visao-geral-e-design-system.md#7-acessibilidade-i18n-e-tema)): status sempre **cor + ícone + texto**; alvos ≥ 44 pt; foco visível; *reduce motion* nas animações de partida/transição; relógio exibido é **o do mundo**.
