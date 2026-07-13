# Mobile — Tática, Escalação e Partida

> **Status:** CANÔNICO · **Fontes:** docs/01-game-design/05-motor-de-partida.md, docs/02-tecnico/08-frontend-cliente-e-tempo-real.md, docs/01-game-design/07-inteligencia-artificial.md · **Revisão:** 2026-07-11

A aba **Jogo**: preparar (escalação, tática, plano de jogo, dossiê, pré-jogo), acompanhar **a partida ao vivo** (a tela mais densa do app) e ler o pós-jogo. Fluxo principal: [MF-07](02-mobile-fluxos.md#mf-07--preparação-e-partida). A partida ao vivo consome o feed do `matchSequence`; o cliente **nunca** executa regras — o motor roda no servidor.

---

## `M-NEXTMATCH` — Próxima partida (central do jogo)

- **Objetivo:** hub de preparação do próximo confronto.
- **Como se chega:** Home; aba Jogo; agenda.
- **Layout:** cabeçalho do confronto (mando, competição, data/hora do mundo) → cartões de preparação → botão principal.
- **Componentes e dados:** adversário e posição na tabela; **contexto** (clima previsto, gramado, importância, sequência recente); estado do próprio elenco (condição/suspensos/lesionados); checklist de preparação (escalação, tática, plano offline, dossiê).
- **Ações:** → `M-SCOUT-OPP`, `M-PREMATCH`, `M-LINEUP`, `M-TACTICS`, `M-GAMEPLAN`; quando `live` → **Assistir** (`M-LIVE`).
- **Estados:** validação pendente (escalação incompleta) destacada; countdown até o kickoff.
- **Referências:** [`15-fluxos §7`](../01-game-design/15-fluxos-completos.md); [`05-motor §2`](../01-game-design/05-motor-de-partida.md).

## `M-LINEUP` — Escalação

- **Objetivo:** montar titulares, banco e funções.
- **Layout:** `FormationPitch` (campo 2D) no topo + banco + validações embaixo.
- **Componentes e dados:** **titulares** e **banco/reservas**; posição **e função** por `PlayerSlot` (meia armador/box-to-box/atacante, volante marcador/construtor, lateral ofensivo/defensivo, ponta aberto/invertido, centroavante pivô/profundidade); **capitão** e líderes; **goleiro reserva** (obrigatório); sub-painel **"Bola parada"** com designação de cobradores **por tipo** (pênalti / falta / escanteio E-D / lateral) e rotinas [`05 §17, §18`]; indicadores por jogador (condição, moral, cartões pendurados); `PositionFit`/`RoleFit`/`FormationFamiliarity`; **entrosamento/sinergias** (`PairSynergy`, `SectorChemistry`, `TeamBalance`); substituições restantes.
- **Ações:** arrastar para posição; trocar titular↔banco; designar capitão/cobrador; auto-escalar (sugestão da comissão); salvar (valida elegibilidade).
- **Estados:** **bloqueios de elegibilidade** (suspenso, não inscrito, contrato inativo, transferido, limite de estrangeiros, categoria inválida, sem GK) impedem salvar com motivo; aviso de jogador fora de posição (risco de erro); tenta escalação automática antes de W.O.
- **Referências:** [`05-motor §7, §11, §15, §17, §18`](../01-game-design/05-motor-de-partida.md); [`06-temporada §15.2`](../01-game-design/06-temporada-e-competicoes.md).

## `M-TACTICS` — Tática

- **Objetivo:** definir formação, estilo e instruções.
- **Layout:** seletor de formação → estilo → sliders/segmentos de instruções.
- **Componentes e dados:**
  - **Formações:** 4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 3-4-3, 5-3-2, 4-1-4-1 (e variações de 3 zagueiros).
  - **Estilos:** posse, contra-ataque, pressão alta, jogo direto/bola longa, defesa baixa, bola parada, ataque pelos lados, controle do meio — cada um com **aptidão de execução** do elenco (`StyleExecutionScore`).
  - **Instruções (sliders/segmentos):** mentalidade (muito defensiva↔muito ofensiva), intensidade (baixa↔máxima), linha defensiva (baixa/média/alta), marcação (leve↔muito forte; individual/zona), foco ofensivo (lados/centro/bola longa/cruzamentos/infiltrações/chutes de fora/bola parada), ritmo (controlar posse/acelerar/cadenciar/jogo direto/contra-atacar), pressão alta, compactação.
  - Indicadores coletivos derivados (ataque/defesa/meio/criação/compactação/pressão…) e aviso de **estabilidade tática** (mudar demais penaliza) + **curva de adaptação** (0–2 desorganização, 3–6 encaixe, 7+ efeito completo).
- **Ações:** aplicar formação/estilo/instruções (command `SetTactics`); salvar variações (ex.: plano B para 3-5-2).
- **Estados:** aviso quando o elenco tem baixa aptidão para o estilo; custo/cooldown de mudança.
- **Referências:** [`05-motor §3, §5, §7, §11, §18`](../01-game-design/05-motor-de-partida.md).

## `M-GAMEPLAN` — Plano de jogo / IA offline

- **Objetivo:** definir como a IA conduz a partida quando o usuário não está online.
- **Componentes e dados:** mentalidade e foco padrão; **gatilhos de substituição** ("substituir >85% fadiga se houver reserva adequado"); **respostas a cenários** (perdendo/ganhando/expulsão/lesão); **nível de autonomia** (Baixa/Média/Alta/Total) e **postura** (conservador/agressivo/equilibrado, ligada ao perfil do técnico); qualidade esperada conforme nível da comissão.
- **Ações:** configurar gatilhos e respostas; herdar de `M-AUTOMATIONS`; testar (dry-run).
- **Estados:** aviso de que autonomia total ainda respeita limites de segurança; conflito com automações globais.
- **Referências:** [`05-motor §12`](../01-game-design/05-motor-de-partida.md); [`07-ia §7`](../01-game-design/07-inteligencia-artificial.md); [MF-22](02-mobile-fluxos.md#mf-22--configurar-automações--delegar).

## `M-SCOUT-OPP` — Dossiê do adversário

- **Objetivo:** entrar em campo sabendo o que a comissão conseguiu ler.
- **Componentes e dados:** informação **estimada** (não exata), com precisão conforme nível da comissão: forças/fraquezas por setor, estilo provável, jogadores-chave, e **leitura do árbitro** (rigor, caseirismo, tolerância a contato, propensão a pênalti). Ex.: "o time está cansando" (baixa) → "seu lateral esquerdo perdeu velocidade…" (alta). Seção **"Como te leem"** — a **reputação tática do próprio usuário** (estilo percebido pelo adversário e como ele provavelmente se preparou) [`05 §14`].
- **Ações:** salvar leitura; ajustar tática com base nela.
- **Estados:** confiança explícita; áreas sem dado ("não foi possível ler").
- **Referências:** [`05-motor §12, §13, §14, §18`](../01-game-design/05-motor-de-partida.md).

## `M-PREMATCH` — Pré-jogo / contexto

- **Objetivo:** confirmar o contexto e a preparação antes do apito.
- **Componentes e dados:** clima (normal/calor/frio/chuva/vento/extremo) e efeito; gramado/dimensão; torcida e **mando de campo** (moderado, explicável); arbitragem; importância/momento da temporada, incluindo flag **"importância: amistoso/pré-temporada"** (baixo risco: testar tática/jovens, sem punição de moral/torcida) [`05 §10`; `06 §1`]; parâmetros da competição (nº de substituições, prorrogação, pênaltis, VAR, desempate); estado médico/logística/viagem; treino específico.
- **Ações:** ajustar escalação/tática/plano; confirmar preparação.
- **Estados:** alerta de elegibilidade; clima extremo pode indicar risco de adiamento (raro).
- **Referências:** [`05-motor §2, §10, §12, §17`](../01-game-design/05-motor-de-partida.md); [`06-temporada §1`](../01-game-design/06-temporada-e-competicoes.md); [`08-estadio §9, §11, §12`](../01-game-design/08-estadio-regiao-e-clima.md).

## `M-LIVE` — Partida ao vivo

- **Objetivo:** acompanhar e intervir (ou deixar a IA conduzir) sem que o cliente rode regra alguma.
- **Como se chega:** `M-NEXTMATCH` quando `live`; faixa "AO VIVO" na Home; push de início.
- **Layout (do [doc 08](../02-tecnico/08-frontend-cliente-e-tempo-real.md))** — modal full-screen:
  - **Topo:** placar, minuto, competição.
  - **Centro:** linha do tempo **ou** campo tático simplificado (2D, sem 3D).
  - **Lateral:** momentum, posse, pressão, alertas ativos.
  - **Inferior:** **ações rápidas** (zona do polegar).
  - **Modal:** pontos de decisão no momento certo (`M-DECISION-POINT`).
- **Componentes e dados:** placar/minuto; **feed de eventos** (`MATCH_TICK`, `MATCH_EVENT`, `DECISION_POINT_CREATED/RESOLVED`, `TACTIC_CHANGED`, `SUBSTITUTION_MADE`, `MOMENTUM_CHANGED`, `MATCH_FINISHED`); **momentum**, **posse**, **pressão**; chip de **"leitura do jogo"** (tipos emergentes: truncado, aberto, físico, nervoso, domínio estéril…) [`05 §9`]; **fadiga por setor** (`SectorState`); controle de zonas; **sugestões da comissão** (qualidade 1–5); substituições disponíveis; **explicabilidade** de cada evento ("sofreu gol após ataques pela esquerda, lateral cansado sem cobertura").
  - **Modo compacto** (placar/eventos/decisões) e **modo detalhado** (zonas, momentum, xG, fadiga, padrões, trade-offs) via `SegmentedControl`.
- **Ações rápidas (botões com submenu `BottomSheet`):** `Recuar`, `Pressionar` (leve/alta/máxima/pressionar a saída), `Atacar`, `Controlar`, `Substituir` (sugestões **contextuais**: "substituir camisa 8, cansado"; "colocar atacante para buscar gol"), `Marcar forte`, `Contra-atacar`, `Poupar`; **mudar formação/tática**. Na **fase reta final / últimos 10 min**, ações **"Segurar resultado"** / **"Ganhar tempo (cera)"** com aviso de risco [`05 §17`]. Cada opção vira um **command** validado pelo servidor (janela pode expirar → `MATCH_COMMAND_WINDOW_CLOSED`).
- **Feedback pós-ação:** a tela mede e mostra o efeito ("recuou a linha aos 68'; posse caiu de 51%→43%, menos bolas nas costas, mais cruzamentos"). Ações repetidas perdem efeito (anti-exploit).
- **Modo prorrogação:** fase adicional com fadiga acentuada e substituição extra, encadeando `M-PENALTIES` quando o regulamento exige [`05 §17`].
- **Estados:** **desconexão** → ao voltar, resumo estruturado do período offline (minuto que saiu/atual, placar, eventos, ações da IA, alertas, sugestão atual); **delegado à IA** (offline) mostra as decisões que a IA tomou; partida terminou desconectado → estado oficial ao retornar; estado persistente **"time com 10"** / jogador limitado em campo / **goleiro de linha** [`05 §17`].
- **Tempo real/notificações:** stream `matchSequence` com `sequence`/`eventId` (dedup); reconexão via `lastKnownSequence`.
- **Referências:** [doc 08 — tela de partida ao vivo](../02-tecnico/08-frontend-cliente-e-tempo-real.md); [`05-motor §4, §9, §11, §13, §15, §17`](../01-game-design/05-motor-de-partida.md).

## `M-DECISION-POINT` — Ponto de decisão em partida

- **Objetivo:** decidir num momento crítico, com trade-off claro.
- **Como se chega:** evento `DECISION_POINT_CREATED` durante `M-LIVE`.
- **Componentes e dados** (`DecisionPoint`): **tipo** (problem/opportunity/risk/emergency) com **cor** (cinza/azul/amarelo/vermelho), **severity**, **urgency**, **confidence**, título, descrição, **causa detectada**, **ações sugeridas** (`SuggestedAction`: label, impacto esperado, risco, confiança, validade), prazo (`expiresAtMinute`). Responde às 5 perguntas (o quê / por quê / opções / risco / até quando).
- **Ações:** escolher ação sugerida (command) ou ação livre; **ignorar** (a IA/ação padrão resolve). Sugestões **expiram/recalculam** se o alvo é substituído ou o placar/clima muda.
- **Estados:** expirado → resolvido pela IA (`DECISION_POINT_RESOLVED`); anti-spam prioriza emergência > risco > tático > oportunidade > narrativa.
- **Referências:** [`05-motor §12, §13, §15`](../01-game-design/05-motor-de-partida.md); [doc 08 — código de cores](../02-tecnico/08-frontend-cliente-e-tempo-real.md).

## `M-HALFTIME` — Intervalo / ações emocionais

- **Objetivo:** ajustar e mexer no emocional do grupo no intervalo.
- **Componentes e dados:** resumo do 1º tempo (estatísticas-chave, fadiga por setor, momentum); **ações emocionais** (motivar, cobrar, acalmar, proteger vantagem, pedir intensidade, pedir paciência) — efeito depende do perfil do elenco; ajustes táticos.
- **Ações:** aplicar fala emocional (command); mudar tática/escalação; preparar substituições.
- **Estados:** aviso de que a fala pode sair pela culatra conforme personalidades.
- **Referências:** [`05-motor §11`](../01-game-design/05-motor-de-partida.md).

## `M-PENALTIES` — Disputa de pênaltis

- **Objetivo:** conduzir/assistir a disputa quando o regulamento exige.
- **Componentes e dados:** ordem dos batedores (pênalti/frieza/moral/pressão/fadiga); goleiro (reflexo/leitura/altura/confiança); placar da disputa; contexto/pressão.
- **Ações:** definir/reordenar batedores; assistir cobrança a cobrança.
- **Estados:** tensão crescente; resultado consolidado ao fim.
- **Referências:** [`05-motor §17`](../01-game-design/05-motor-de-partida.md).

## `M-POSTMATCH` — Relatório pós-jogo

- **Objetivo:** explicar o resultado e alimentar os sistemas seguintes.
- **Layout:** placar + `ReportSection`s (estatísticas, notas, fatores, consequências).
- **Componentes e dados:** estatísticas (posse, finalizações, chances claras, escanteios, faltas, cartões, impedimentos, passes certos, desarmes, defesas, **xG**); **melhor/pior jogador**, notas por jogador; **mapa de pressão**, **zonas exploradas**; **fatores explicativos** (causa primária/secundária/terciária, ação anterior, alerta anterior) — separando **resultado, desempenho, execução, contexto**; **consequências** (moral, torcida, imprensa, evolução/valorização, reputação, finanças, mercado, suspensões, lesões).
- **Ações:** abrir jogador/decisão referenciada; ir a `M-FEED`/`M-MORALE`/`M-MEDICAL`; salvar aprendizado.
- **Estados:** *loading* do processamento; consequências chegam por eventos.
- **Referências:** [`05-motor §16, §18`](../01-game-design/05-motor-de-partida.md); [`13-relatorios §5.1`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).
