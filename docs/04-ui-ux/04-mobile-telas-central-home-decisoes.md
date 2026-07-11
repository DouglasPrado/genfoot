# Mobile — Central, Home e Decisões

> **Status:** Rascunho consolidado · **Fontes:** docs/01-game-design/10-experiencia-e-telas.md, docs/01-game-design/13-relatorios-notificacoes-e-memoria.md, docs/01-game-design/07-inteligencia-artificial.md · **Revisão:** 2026-07-11

A aba **Início** — o "casa" do app. Reúne o painel do clube (Home), a **Central de decisões** (caixa de decisões com prazo/impacto/recomendação/ação padrão), a central de **notificações** e as **automações** (delegação à IA). Fluxos: [MF-05](02-mobile-fluxos.md#mf-05--ciclo-semanal-de-gestão), [MF-0B](02-mobile-fluxos.md#mf-0b--notificações-e-navegação-por-contexto), [MF-22](02-mobile-fluxos.md#mf-22--configurar-automações--delegar).

---

## `M-HOME` — Home / painel do clube

- **Objetivo:** em um olhar, situar o clube e o próximo compromisso, e apontar o que exige ação.
- **Como se chega:** raiz da aba Início; retorno de qualquer *deep link*; pós-onboarding.
- **Layout:** cabeçalho do clube (fixo) → cartão "próximo compromisso" → faixa de urgências (Central) → cartões de indicadores → atalhos de ação → resumo antes/depois da rodada.
- **Componentes e dados** (campos exatos do [doc 10, §2](../01-game-design/10-experiencia-e-telas.md)):
  - **Clube** (nome/escudo), **Próximo jogo** (data/hora do mundo), **Adversário**, **Competição**, **Status/posição**, **Objetivo**, **Moral do elenco**, **Pressão da torcida**, **Caixa**.
  - **Faixa de urgências:** contador de decisões pendentes (abre `M-DECISIONS`), com a mais crítica em destaque.
  - **Contexto antes/depois da rodada** (`NarrativeCard`): ex. "enfrenta o líder amanhã 20h; seu atacante está cansado" / "venceu 2×1; jovem marcou o 1º gol como profissional".
  - Indicadores em `StatTile`/`Meter` (modo simples por padrão).
- **Ações:** atalhos → `M-LINEUP`, `M-TACTICS`, `M-SCOUT-OPP`, `M-TRAINING`, `M-MARKET`, `M-CONVO`, `M-FEED`, `M-COMPETITION`, `M-CALENDAR` (as "ações disponíveis" do [doc 10, §3](../01-game-design/10-experiencia-e-telas.md)); tocar próximo jogo → `M-NEXTMATCH`.
- **Estados:** *skeleton* dos cartões; dado *stale* enquanto revalida; offline com *badge*; partida em andamento mostra faixa "AO VIVO — abrir" (`M-LIVE`).
- **Tempo real/notificações:** `clubSequence` atualiza indicadores; `worldSequence` atualiza tabela/posição; notificações críticas elevam a faixa de urgências.
- **Referências:** [`10-experiencia §1–4`](../01-game-design/10-experiencia-e-telas.md); [MF-05](02-mobile-fluxos.md#mf-05--ciclo-semanal-de-gestão).

## `M-DECISIONS` — Central de decisões (caixa de decisões)

- **Objetivo:** reunir tudo que **não deve ser perdido**, com prazo e recomendação.
- **Como se chega:** faixa de urgências da Home; sino/`Header`; *deep link* `grinta://decisions`.
- **Layout:** lista priorizada de cards; filtro por urgência/área; separador "com prazo" vs "sugestões".
- **Componentes e dados:** cada `DecisionCard` traz os **4 elementos** ([doc 13, §3](../01-game-design/13-relatorios-notificacoes-e-memoria.md)): **Prazo** (`Countdown`), **Impacto** (o que está em jogo em cada caminho), **Recomendação** (do jogo/comissão), **Ação padrão** (aplicada se não responder). Cor por nível (Crítica/Importante/Informativa/Narrativa). Ordena por urgência × importância.
- **Ações:** tocar → `M-DECISION-DETAIL`; ação rápida inline (aceitar recomendação); *swipe* para adiar/lembrete.
- **Estados:** vazio ("tudo em dia"); prazo expirado → item some e a **ação padrão** é registrada no `M-FEED`; offline enfileira a resposta.
- **Tempo real/notificações:** novas decisões chegam por `userSequence`/`clubSequence`; push para críticas.
- **Referências:** [`13-relatorios §1–3`](../01-game-design/13-relatorios-notificacoes-e-memoria.md); [`10-experiencia §5`](../01-game-design/10-experiencia-e-telas.md). > **Pendência:** dependências/bloqueios e lembretes de agenda não estão especificados no GDD (sinalizados como lacuna na fonte); a tela prevê *swipe*-lembrete sem regra fina.

## `M-DECISION-DETAIL` — Detalhe de uma decisão

- **Objetivo:** decidir com contexto completo.
- **Como se chega:** `M-DECISIONS`; push de decisão.
- **Componentes e dados:** título e **explicação do "por quê"** (sem revelar fórmulas/atributos ocultos); opções com **impacto e risco** de cada uma; recomendação da comissão (confiança conforme nível); prazo; ação padrão.
- **Ações:** escolher opção → command correspondente (ex.: aceitar proposta, renovar, escalar); **abrir tela relacionada** (ex.: `M-NEGOTIATION`, `M-CONTRACT`); **delegar** à IA.
- **Estados:** ação de alto risco → `HighRiskConfirm`; `warnings` não bloqueantes; conflito → recarrega.
- **Referências:** [`13-relatorios §3–4`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).

## `M-NOTIFS` — Central de notificações

- **Objetivo:** reunir o fluxo de avisos (o que não é decisão acionável fica aqui).
- **Como se chega:** sino no `Header`.
- **Layout:** lista cronológica com seções por nível; toque abre destino.
- **Componentes e dados:** `NotificationCard` respondendo às **5 perguntas** ([doc 08](../02-tecnico/08-frontend-cliente-e-tempo-real.md)): o quê / por que importa / quais opções / qual risco / até quando. Nível (Crítica/Importante/Informativa/Narrativa) por cor+ícone. Exemplos: "jogo às 20h", "atacante sentiu dores", "proposta pelo lateral", "diretoria satisfeita", "convocação sub-20".
- **Ações:** tocar → *deep link*; marcar lida; silenciar categoria; ir a `M-SETTINGS` (preferências de push).
- **Estados:** vazio; agrupamento por dia; offline mostra cache.
- **Tempo real/notificações:** entrega por WebSocket + push espelhado (críticas/importantes).
- **Referências:** [`13-relatorios §2`](../01-game-design/13-relatorios-notificacoes-e-memoria.md); [`10-experiencia §4`](../01-game-design/10-experiencia-e-telas.md). > **Pendência:** paleta de cores e regras de agrupamento não fechadas na fonte (só os 4 níveis).

## `M-AUTOMATIONS` — Automações / delegação à IA

- **Objetivo:** escolher o que a inteligência autorizada decide na ausência (política offline).
- **Como se chega:** `M-HOME`/`M-SETTINGS`; `M-ONBOARD-REVIEW`.
- **Layout:** lista de políticas por área + histórico de execução.
- **Componentes e dados:** políticas por domínio — **escalação offline**, **substituições** (gatilhos), **mercado**, **treino**, **respostas de crise/imprensa**; nível de automação por política (sugerir / executar); **histórico de execução** (o que a IA fez e por quê — log auditável); indicação de que **ações de alto risco** não são totalmente delegáveis.
- **Ações:** ativar/desativar; editar → `M-AUTOMATION-EDIT`; ver histórico.
- **Estados:** política desativada automaticamente na troca de controlador; conflito de precedência sinalizado.
- **Referências:** [`10-experiencia §6`](../01-game-design/10-experiencia-e-telas.md); [`07-ia §7, §4.5`](../01-game-design/07-inteligencia-artificial.md).

## `M-AUTOMATION-EDIT` — Editor de automação / política offline

- **Objetivo:** configurar uma automação específica.
- **Como se chega:** `M-AUTOMATIONS`.
- **Componentes e dados** (anatomia da automação, [doc 10, §6.1](../01-game-design/10-experiencia-e-telas.md)): **gatilho**, **condição**, **ação**, **nível** (sugerir/executar), **limites** (teto de gasto, faixa de valor), validação no momento da execução, idempotência/precedência. Para partida: mentalidade, foco, **gatilhos de substituição** ("acima de 85% de fadiga se houver reserva"), respostas a cenários (perdendo/ganhando/expulsão), **nível de autonomia** (Baixa/Média/Alta/Total) e **postura** (conservador/agressivo/equilibrado).
- **Ações:** **Salvar** → valida e ativa; **Testar** (dry-run explicativo).
- **Estados:** ações de alto risco marcadas como "requer confirmação"; conflito com outra política → aviso de precedência.
- **Referências:** [`10-experiencia §6.1–6.8`](../01-game-design/10-experiencia-e-telas.md); [`05-motor §12`](../01-game-design/05-motor-de-partida.md) (plano offline).
