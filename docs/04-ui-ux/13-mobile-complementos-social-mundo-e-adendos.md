# Mobile — Complementos: Social, Mundo e Adendos

> **Status:** Rascunho consolidado · **Fontes:** auditoria de completude (2026-07-11) sobre docs/01-game-design/* e docs/02-tecnico/03-multiplayer-e-mundos.md · **Revisão:** 2026-07-11

Este documento **fecha as lacunas** encontradas na auditoria de completude das telas mobile (docs 03–12) contra o GDD. Traz: (A) **telas novas** que faltavam — sobretudo superfícies **multiplayer/mundo** (ver outro clube/gestor, espectar partidas, múltiplos mundos) e ferramentas de gestão (comparar, entrosamento, retreinar, relatórios, produtos, sócio-torcedor, cláusulas, busca); e (B) **adendos** — campos/ações que faltavam em telas já escritas, listados por tela. Segue o [template](00-visao-geral-e-design-system.md#template-de-especificação-de-tela).

## Sumário

- [A. Telas novas](#a-telas-novas)
  - Social e mundo: `M-MY-WORLDS` · `M-CLUB-VIEW` · `M-MANAGER-PROFILE` · `M-WORLD-STRUCTURE` · `M-MESSAGES` · `M-LIVE-WORLD` · `M-SEARCH`
  - Gestão: `M-COMPARE` · `M-TEAMBALANCE` · `M-RETRAIN` · `M-REPORTS` · `M-MEMBERSHIP` · `M-PRODUCTS` · `M-CLAUSES`
- [B. Adendos a telas existentes](#b-adendos-a-telas-existentes)

---

## A. Telas novas

### `M-MY-WORLDS` — Meus mundos e clubes
- **Objetivo:** hub para alternar entre os mundos/clubes do usuário (o jogo é multiplayer e persistente; um usuário pode ter vínculo em mais de um mundo).
- **Como se chega:** `Header` (troca de contexto); `M-SETTINGS`; pós-login com múltiplos vínculos.
- **Layout:** lista de cards de vínculo + botão "entrar em novo mundo".
- **Componentes e dados:** por vínculo: mundo (nome/temporada), clube (escudo/divisão/posição), pendências (contador da Central), próximo jogo, estado (ativo/ausência). Regras anti-abuso de múltiplos vínculos.
- **Ações:** trocar de clube/mundo (recarrega contexto); **entrar em novo mundo** (`M-WORLD-PICK`); sair de um clube (`M-CLUB-LEAVE`).
- **Estados:** vínculo em ausência realçado; bloqueio de novo vínculo por cooldown/conta relacionada.
- **Referências:** [`03-multiplayer-e-mundos`](../02-tecnico/03-multiplayer-e-mundos.md); [`09-anti-abuso §1.8`](../01-game-design/09-anti-abuso-e-onboarding.md).

### `M-CLUB-VIEW` — Perfil público de outro clube
- **Objetivo:** ver qualquer clube do mundo (comandado por humano ou IA) — essencial num mundo com clubes de pessoas reais.
- **Como se chega:** tabela/competição, rankings, mercado, adversário, feed, busca.
- **Layout:** cabeçalho do clube + abas (Visão · Elenco · Histórico · Reputação).
- **Componentes e dados:** identidade (nome/escudo/cores/país/região), divisão, reputação/tamanho, torcida, **elenco público** (jogadores visíveis com dados **estimados** para quem não é o dono), estilo, histórico/legado, se é controlado por usuário ou IA, gestor responsável (link a `M-MANAGER-PROFILE`).
- **Ações:** observar jogador (`M-PLAYER` estimado); propor negócio (`M-NEGOTIATION`); enviar mensagem ao gestor (`M-MESSAGES`).
- **Estados:** dados sensíveis do elenco alheio sempre estimados; clube de IA sinalizado.
- **Referências:** [`01-mundo §2`](../01-game-design/01-mundo-persistente-e-clubes.md); [`03-multiplayer-e-mundos`](../02-tecnico/03-multiplayer-e-mundos.md).

### `M-MANAGER-PROFILE` — Perfil público de outro gestor
- **Objetivo:** ver a trajetória e reputação de outro usuário/gestor.
- **Como se chega:** `M-CLUB-VIEW`, `M-RANKINGS`, negociação, mensagens.
- **Componentes e dados:** nome/avatar do gestor; clubes atuais/passados; **reputação do gestor** (10 dimensões); títulos/legado; presença/último acesso (se exposto).
- **Ações:** enviar mensagem (`M-MESSAGES`); ver clube (`M-CLUB-VIEW`).
- **Estados:** privacidade — só o que é público.
- **Referências:** [`11-torcida §14`](../01-game-design/11-torcida-imprensa-e-narrativa.md); [`13-relatorios §6.4`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).

### `M-WORLD-STRUCTURE` — Estrutura do mundo (divisões e pirâmide)
- **Objetivo:** navegar a hierarquia competitiva do mundo (mundo → país/região → divisões → grupos → clubes).
- **Como se chega:** `M-COMPETITIONS`; `M-RANKINGS`; `M-MY-WORLDS`.
- **Componentes e dados:** pirâmide de divisões; grupos por divisão; vagas de acesso/rebaixamento entre níveis; nº de clubes usuário vs. IA por grupo; ligações regionais.
- **Ações:** abrir competição/divisão (`M-COMPETITION`); abrir clube (`M-CLUB-VIEW`).
- **Estados:** posição do próprio clube destacada.
- **Referências:** [`03-multiplayer-e-mundos`](../02-tecnico/03-multiplayer-e-mundos.md); [`06-temporada §2, §9`](../01-game-design/06-temporada-e-competicoes.md).

### `M-MESSAGES` — Mensagens entre gestores
- **Objetivo:** comunicação direta entre usuários (contexto de negociação e social).
- **Como se chega:** `M-NEGOTIATION`, `M-CLUB-VIEW`, `M-MANAGER-PROFILE`; sino.
- **Componentes e dados:** caixa de conversas; thread por gestor/negociação; anexos de proposta; controles anti-spam (cooldown de sondagem).
- **Ações:** enviar mensagem; anexar/abrir proposta; bloquear/silenciar; reportar.
- **Estados:** cooldown/limite de spam; entrega por WebSocket (presença).
- **Referências:** [`03-economia §7, §11`](../01-game-design/03-economia.md) (mercado usuário-usuário); [`09-anti-abuso §1 (Dec. 1917, 1945)`](../01-game-design/09-anti-abuso-e-onboarding.md). > **Pendência:** o GDD não detalha chat de liga/mensageria entre gestores — superfície prevista aqui; regras de moderação/escopo a definir.

### `M-LIVE-WORLD` — Rodada ao vivo / espectar partidas do mundo
- **Objetivo:** acompanhar partidas que o usuário **não** controla (rodada em andamento), em modo somente-leitura.
- **Como se chega:** `M-COMPETITION` (rodada atual), `M-CALENDAR`, `M-CLUB-VIEW`, feed.
- **Componentes e dados:** lista de jogos ao vivo da rodada com placar/minuto; ao abrir um jogo, **modo espectador resumido** — feed só de `VisibleEvent`/`NarrativeEvent`, placar, momentum simples — **sem** ações rápidas, **sem** pontos de decisão. Reaproveita o stream `matchSequence` em modo leitura.
- **Ações:** acompanhar; abrir clubes/jogadores.
- **Estados:** partidas NPC×NPC exibidas em granularidade resumida; sem comandos.
- **Referências:** [`05-motor §4, §18`](../01-game-design/05-motor-de-partida.md); [doc 08](../02-tecnico/08-frontend-cliente-e-tempo-real.md).

### `M-SEARCH` — Busca global
- **Objetivo:** encontrar jogadores, clubes e gestores em todo o mundo (fora do fluxo de mercado).
- **Como se chega:** ícone de busca no `Header`.
- **Componentes e dados:** campo de busca; resultados por tipo (jogador/clube/gestor/competição); filtros; buscas recentes. Paginação por cursor, filtros limitados/indexados (doc 08).
- **Ações:** abrir `M-PLAYER`/`M-CLUB-VIEW`/`M-MANAGER-PROFILE`/`M-COMPETITION`.
- **Estados:** vazio; *loading*; respeita o mundo (`gameWorldId`).
- **Referências:** [doc 08 — filtros/paginação](../02-tecnico/08-frontend-cliente-e-tempo-real.md).

### `M-COMPARE` — Comparar jogadores
- **Objetivo:** comparar 2+ jogadores lado a lado (destino das ações "comparar" de `M-SQUAD`/`M-PLAYER-ATTRS`/`M-PLAYER-DEV`).
- **Como se chega:** multiseleção em `M-SQUAD`, `M-MARKET`, `M-SCOUTING`; botão "comparar" na ficha.
- **Componentes e dados:** atributos por eixo lado a lado; **potencial por camada**; trajetória de desenvolvimento; valor de mercado/salário; contrato; aptidão à posição/função. Dados de jogador alheio como estimativa.
- **Ações:** adicionar/remover jogador; abrir ficha; iniciar negociação.
- **Estados:** diferença realçada (▲▼); estimativas sinalizadas.
- **Referências:** [`02-jogadores §4, §6, §8, §12`](../01-game-design/02-sistema-de-jogadores.md).

### `M-TEAMBALANCE` — Entrosamento e equilíbrio do elenco
- **Objetivo:** aprofundar sinergias/conflitos do elenco (o que em `M-LINEUP` é só um indicador).
- **Como se chega:** indicador de entrosamento em `M-LINEUP`; `M-SQUAD`.
- **Componentes e dados:** `TeamBalance` em 7 dimensões (defensivo, meio, ataque, transição, aéreo, ritmo, criatividade — radar); `PairSynergy` (pares em sinergia/conflito, ex.: "lateral ofensivo + ponta que volta pouco"); `SectorChemistry` (química por setor).
- **Ações:** simular escalação; abrir jogador; ajustar em `M-LINEUP`/`M-TACTICS`.
- **Estados:** conflitos realçados; recomputa ao mudar escalação.
- **Referências:** [`05-motor §3, §18`](../01-game-design/05-motor-de-partida.md).

### `M-RETRAIN` — Mudança de posição / arquétipo
- **Objetivo:** conduzir a reconversão de um jogador a uma nova função (fluxo plurianual).
- **Como se chega:** `M-PLAYER`, `M-TRAINING-INDIV`.
- **Componentes e dados:** arquétipo-alvo (ex.: Meia + físico + marcação → Volante moderno; Goleiro + jogo com os pés → líbero); caminho de desenvolvimento; evolução de `PositionFit`/`RoleFit`; inputs "necessidade do clube + visão do técnico"; risco/tempo.
- **Ações:** definir arquétipo-alvo (vincula treino individual); acompanhar progresso.
- **Estados:** aviso de reconversão longa/arriscada.
- **Referências:** [`02-jogadores §10`](../01-game-design/02-sistema-de-jogadores.md).

### `M-REPORTS` — Central de relatórios
- **Objetivo:** ponto único para os 7 relatórios do clube (camada intermediária da UI em camadas).
- **Como se chega:** aba Clube; Home.
- **Componentes e dados:** atalhos aos relatórios (profundidade conforme a comissão): **partida** (prévia/ao vivo/pós → `M-PREMATCH`/`M-LIVE`/`M-POSTMATCH`), **elenco** (`M-SQUAD`), **base** (`M-ACADEMY`), **financeiro** (`M-FINANCE`), **mercado** (`M-MARKET`), **profissionais** (`M-STAFF`), **fim de temporada** (`M-SEASON-CLOSE`); cada um com resumo e "por quê" (explicabilidade), sem revelar fórmulas/dados de adversário.
- **Ações:** abrir relatório; comparar histórico.
- **Estados:** profundidade limitada por nível de comissão; > **Pendência:** frequência e retenção histórica (fonte em aberto).
- **Referências:** [`13-relatorios §1, §5`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).

### `M-MEMBERSHIP` — Sócio-torcedor
- **Objetivo:** gerir o programa de associação (receita fixa recorrente).
- **Como se chega:** `M-COMMERCIAL`; `M-FINANCE`.
- **Componentes e dados:** planos/tiers, **mensalidade** (preço), base de sócios, receita recorrente projetada, benefícios, retenção/inadimplência; dependência do tamanho/satisfação da torcida.
- **Ações:** ajustar planos/preço; definir benefícios; campanhas de captação.
- **Estados:** preço alto reduz base; ligação com torcida (`M-FANS`).
- **Referências:** [`03-economia §4.1, §5.1, §9.1, §9.6`](../01-game-design/03-economia.md).

### `M-PRODUCTS` — Produtos / merchandising
- **Objetivo:** planejar produtos e estoque.
- **Como se chega:** `M-COMMERCIAL`.
- **Componentes e dados:** catálogo/coleções, produção vs. **estoque**, preço, previsão de **demanda**, **sazonalidade**, vínculo com campanhas/eventos (contratação popular, convocação geram pico), alerta de **obsolescência/encalhe**.
- **Ações:** planejar produção; ajustar preço; criar campanha.
- **Estados:** risco de encalhe realçado; pico de demanda por evento.
- **Referências:** [`03-economia §9.9, §12`](../01-game-design/03-economia.md).

### `M-CLAUSES` — Cláusulas e obrigações condicionais
- **Objetivo:** acompanhar e **exercer** instrumentos condicionais ao longo do tempo.
- **Como se chega:** `M-ACCOUNTING`; `M-CONTRACT`; fim de `M-LOAN`.
- **Componentes e dados:** portfólio de **participação em venda futura (sell-on)** a receber/pagar; **recompra** e **preferência** (janelas); **opção vs. obrigação de compra** (obrigação acionada vira dívida); **gatilhos** de contrato (por partidas/acesso/permanência; do clube/jogador/mútuos; renovação automática) com prazo; multas rescisórias ativas.
- **Ações:** exercer recompra; exercer/declinar opção; responder a gatilho; ver impacto no caixa.
- **Estados:** obrigação pendente de ativação; processamento escalonado na virada de temporada.
- **Referências:** [`03-economia §17.2, §17.4, §17.6`](../01-game-design/03-economia.md).

---

## B. Adendos a telas existentes

Campos/ações que faltavam nas telas dos docs 03–12 (adicionar ao respectivo spec). Cada item cita a fonte.

### Elenco, jogador, medicina (doc 05)
- **`M-PLAYER` (Resumo):** **intensidade** de cada traço (além da visibilidade) [`02 §2`]; indicador de **adaptação/integração** de recém-chegado (clube/cidade/idioma/tática/grupo) [`02 §15`]; bloco **"Situação atual / crise"** com evento de carreira ativo e **ações de reversão** (via `M-CONVO`/`M-TRAINING-INDIV`) [`02 §9`]; ação **"Atribuir suporte"** (psicólogo, assistente social, mentor, coordenador de transição, gestor de carreira) ao profissional em risco emocional [`02 §14`]; aba/hook **"Fim de carreira"** (estados: considerada/anunciada/adiada/confirmada/imposta médica) com opção de **oferecer cargo** a ídolo que se aposenta (transição jogador→funcionário) [`02 §17`].
- **`M-PLAYER-DEV`:** bloco **"Inclinações naturais"** (aprende técnica/físico/tática rápido ou devagar; responde a pressão/crítica; corpo frágil/explosão) e `baseLearningRate` [`02 §4, §6`].
- **`M-SQUAD`:** enumerar critérios de **filtro/ordenação** (posição, traço, potencial, papel, status de contrato/mercado, risco de saída, prontidão) e **indicador de insatisfação** consolidado [`02 §15`].
- **`M-MEDICAL-CASE`:** ação **"Comunicação pública da lesão"** com visualização das **4 camadas** de confidencialidade (diagnóstico real / comissão / público / outros clubes) [`02 §16`]; variante **lesão em empréstimo** (quem trata, quem paga, onde reabilita, info à origem, retorno) [`02 §16`]; campo de **seguro do atleta** (cobertura/prêmio) [`03 §13, §17.3`].
- **`M-TRAINING` / `M-TRAINING-INDIV`:** eixo/plano de **treino de goleiros** (e arquétipos GK) [`02 §6, §10, §18`].

### Base (doc 08)
- **`M-ACADEMY`:** **reputação formadora específica** por posição/perfil ("forma laterais", "revela goleiros", "recupera promessas") em vez de genérica [`02 §11`].
- **`M-YOUTH-PLAYER`:** bloco **"Proteção do menor"** (alojamento, educação, limites de carga, movimentação) além da confidencialidade [`02 §17`].
- **`M-LOAN`:** **comparação de destinos** (nível da liga, minutos, posição de uso, pressão, técnico, estrutura médica, estilo, distância, visibilidade) e **projeção de retorno** (melhor/igual/pior) [`02 §18`].

### Partida (doc 06)
- **`M-LINEUP`:** sub-painel **"Bola parada"** com designação de cobradores **por tipo** (pênalti / falta / escanteio E-D / lateral) e rotinas [`05 §17, §18`].
- **`M-LIVE`:** chip de **"leitura do jogo"** (tipos emergentes: truncado, aberto, físico, nervoso, domínio estéril…) [`05 §9`]; **fase reta final / últimos 10 min** com ações **"Segurar resultado" / "Ganhar tempo (cera)"** com aviso de risco [`05 §17`]; **modo prorrogação** (fase, fadiga acentuada, substituição extra) encadeando `M-PENALTIES` [`05 §17`]; estado persistente **"time com 10" / jogador limitado em campo / goleiro de linha** [`05 §17`].
- **`M-PREMATCH`:** flag **"importância: amistoso/pré-temporada"** (baixo risco: testar tática/jovens, sem punição de moral/torcida) [`05 §10`; `06 §1`].
- **`M-SCOUT-OPP`:** seção **"Como te leem"** — a **reputação tática do próprio usuário** (estilo percebido pelo adversário e como ele provavelmente se preparou) [`05 §14`].

### Mercado, contratos (doc 07)
- **`M-NEGOTIATION`:** inserir estado **"Exame médico"** entre *Aceita* e *Formalização*, com 5 desfechos (aprovar / aprovar com risco / avaliação adicional / reprovar / alterar termos) [`03 §17.3`]; **extrato de negociações passadas** com desfecho financeiro.
- **`M-CONTRACT`:** campo de **seguro** e criação de **cláusulas condicionais** que passam a ser acompanhadas em `M-CLAUSES` [`03 §17`].
- **`M-SCOUTING`:** **lista de observação como pipeline** (prioridade/motivo/responsável/próxima ação/prazo), comparação de **relatórios contraditórios** e **envelhecimento/data** do relatório [`03 §16.5–16.7`].
- **`M-PLAYER`/`PlayerRow`:** badge de **elegibilidade** ("contratado / ainda não inscrito/apto") [`03 §17.5`].

### Finanças, estrutura (doc 09)
- **`M-FINANCE`:** painel de **composição da receita** por fonte (TV, patrocínio, sócios, bilheteria, comercial/produtos, premiação, extraordinárias), com a linha de **direitos de TV** dependente de liga/divisão [`03 §4.1, §5.1, §7.2`].
- **`M-COMMERCIAL`:** entradas para **`M-MEMBERSHIP`** (sócio-torcedor) e **`M-PRODUCTS`** (merchandising); **hospitalidade** como operação (capacidade/conversão/custo) distinta da bilheteria [`03 §9.6, §9.8, §9.9`].
- **`M-STRUCTURE`/`M-CLUB-PROFILE`:** índice de **Tamanho Real do Clube** (0–100, pequeno→gigante) e **marca** como ativo que cresce [`03 §14.3, §9.10`]; **psicologia** como área de investimento distinta [`03 §9.3`]; visão comparativa de **ROI por área**.

### Competições, temporada (doc 10)
- **`M-COMPETITION`:** **sorteio/chaveamento ao vivo** (evento); ligações para `M-CLUB-VIEW` dos adversários da competição.
- **`M-SEASON-CLOSE`/`M-AWARDS`:** **contestação de resultado** pelo usuário antes da homologação (título provisório vs. oficial) [`06 §14.2`].

### Central/IA (doc 04, 11)
- **`M-AUTOMATIONS`:** **log/explicação de decisões da IA** (`ai_decision_logs`) navegável, com o trade-off de cada decisão [`07 §4.5`].
- **`M-HOME`/`M-FEED`:** **recomendações da IA fora do jogo** (assistente: "elenco envelhecido", "cria poucas chances", "preparador fraco → risco +18%") com precisão conforme nível de funcionários [`07 §3.7`].
- **`M-CONVO`/`M-FANS`:** **despedida de ídolo** como fluxo conduzido (reduz desgaste da torcida) [`11 §7`].

> **Nota de manutenção:** estes adendos podem ser dobrados nos specs originais (docs 05–11) numa próxima revisão; aqui ficam consolidados para rastreabilidade da auditoria. As **telas novas** da seção A já entram no sitemap ([doc 01](01-navegacao-e-arquitetura-de-informacao.md)).

---

## C. Telas novas — 2ª passada da auditoria

A segunda passada (multiplayer/sessão e temporada/seleções) encontrou uma lacuna estrutural: **o modelo de rodada assíncrona não tinha superfície persistente** (relógio do mundo, prazo de bloqueio da escalação, simulação em lote), além da pré-temporada como palco de gestão. Estas 3 telas fecham isso.

### `M-ROUND` — Rodada e relógio do mundo
- **Objetivo:** situar o usuário no tempo do mundo assíncrono — que dia/hora é no mundo, em que estado está a rodada e quando é a próxima simulação. Núcleo do modelo "gerenciar entre rodadas".
- **Como se chega:** faixa de status na `M-HOME`; componente `WorldClock` no `Header` (toque); `M-CALENDAR`.
- **Layout:** relógio/data do mundo no topo → estado da rodada → cronômetros → progresso da temporada.
- **Componentes e dados:** **relógio do mundo** (`currentDate`, fuso do mundo, `speed`); **estado da rodada** (`RoundStatus`: aberta / **bloqueada** (após o *lock* da escalação) / simulando (lote) / publicada); **contagem regressiva até o lock** da escalação (ex.: 19h59) — distinta do início do jogo (20h); **próxima simulação**; **progresso da temporada** (ex.: "dia 12 de 45", tempo real restante). Reaproveita `worldSequence`.
- **Ações:** abrir escalação/tática antes do lock (`M-LINEUP`/`M-TACTICS`); ver calendário (`M-CALENDAR`).
- **Estados:** **rodada bloqueada** (comandos de escalação recusados — `MATCH_COMMAND_WINDOW_CLOSED`) sinalizada proativamente **antes** do bloqueio; mundo em manutenção/`WORLD_READ_ONLY`; relógio local do aparelho não altera prazos (servidor é a verdade).
- **Tempo real/notificações:** aviso proativo "escalação fecha em X"; "rodada simulada".
- **Referências:** [`03-multiplayer-e-mundos §1, §4, §5`](../02-tecnico/03-multiplayer-e-mundos.md); [doc 08](../02-tecnico/08-frontend-cliente-e-tempo-real.md); [design system §5, §7, §9](00-visao-geral-e-design-system.md). > **A incorporar em doc 00 §9:** componentes `WorldClock` e `RoundStatus` como *chrome* persistente do `Header`.

### `M-FRIENDLIES` — Amistosos / gestão de pré-temporada
- **Objetivo:** montar a pré-temporada — agendar amistosos e turnês para testar tática/jovens sem punição.
- **Como se chega:** `M-CALENDAR` (fase pré-temporada); `M-NEXTMATCH`; briefing de temporada.
- **Componentes e dados:** agenda de amistosos; escolha de adversários; datas/turnê; mando/receita/viagem; objetivo do amistoso (testar tática/jovens/condição). Caráter de **baixo risco** (sem punição de moral/torcida). Alimenta `M-PREMATCH` (flag "importância: amistoso").
- **Ações:** agendar amistoso; escolher adversário; definir objetivo; cancelar.
- **Estados:** só na fase pré-temporada/janela; > **Pendência:** a mecânica de *arranjo* do amistoso (aceite do adversário, oferta) é pendência da fonte — a superfície existe, os parâmetros a definir.
- **Referências:** [`06-temporada §1, §2`](../01-game-design/06-temporada-e-competicoes.md); [`05-motor §10`](../01-game-design/05-motor-de-partida.md).

### `M-TUTORIAL` — Tutorial / tour guiado de primeira vez
- **Objetivo:** ensinar o loop incomum "gerenciar, não jogar", o ciclo de rodadas assíncronas e a delegação à IA — reduzindo barreira de retenção.
- **Como se chega:** após `M-ONBOARD-REVIEW` (primeira sessão); reabrível em `M-SETTINGS`.
- **Componentes e dados:** *coach-marks* sobre Home/Central/rodada/automações; tour opcional e pulável; checklist de primeiros passos (integra `M-ONBOARD-REVIEW`).
- **Ações:** avançar/pular; refazer o tour; concluir.
- **Estados:** progresso salvo; não bloqueia o uso.
- **Referências:** [design system §1](00-visao-geral-e-design-system.md); [`09-anti-abuso §2`](../01-game-design/09-anti-abuso-e-onboarding.md) (onboarding).

## D. Adendos — 2ª passada

### Mundo, sessão e rodada
- **`Header` / design system §9:** componente `WorldClock` (data/fuso do mundo) sempre visível e `RoundStatus` (estado da rodada) [`03-mp §1, §4`].
- **`M-HOME`:** faixa de status com **cronômetro da próxima simulação** e progresso da temporada; **banner de manutenção agendada** ("mundo entra em manutenção às 20h") e **recepção de comunicados do operador** (categoria de notificação "comunicado do mundo") [`03-mp §1`; `04-plataforma §11`; design system §5].
- **`M-NOTIFS` / design system §5:** categoria **"comunicado do mundo"** (broadcast do admin) e aviso proativo de manutenção com contagem regressiva.
- **`M-CONTROL-ACTIVATE` / `M-CLUB-PREVIEW`:** ao entrar em **temporada avançada**, situar na rodada assíncrona ("assume na rodada 15 de 38; próxima simulação em 2 dias; janela de escalação fecha em X; a IA já tem escalação-fallback") [`03-mp §2`].
- **`M-SETTINGS` / `M-ACCOUNT`:** *toggle* de **privacidade de presença** (mostrar/ocultar online e visto-por-último); tratamento de **sessão concorrente** em múltiplos dispositivos ("sessão iniciada em outro aparelho") [`03-mp §3`; design system §5].
- **`M-WORLD-STRUCTURE` / `M-FEED`:** evento de **transição de liga por nível estrutural** (Liga Inicial→Acesso→Intermediária→Principal→Elite) e **criação/renumeração dinâmica de divisões** quando entram mais usuários [`03-mp §7`]. > **Pendência:** limiares de expansão e interação dos dois eixos (fonte em aberto).

### Temporada, competição e seleções
- **`M-WORLD-STRUCTURE` / `M-BOARD`:** **teto da divisão** (folha, overall médio, estrangeiros, reputação, estrutura) vs. o clube, e estado **"acima do teto → obrigado a subir"** [`06 §13.1`].
- **`M-LICENSING`:** aba/seção **"Licença competitiva"** separada do estádio — checklist por padrão mínimo (segurança, financeiro, elenco, médica, base, atrasos, conformidade), **plano de adequação com prazo/marcos**, escada de sanção (plano→restrições→multas→impedimento/rebaixamento administrativo), e estado **"venceu no campo mas acesso/rebaixamento pendente de licença"** ecoado em `M-COMPETITION`/`M-SEASON-CLOSE` [`06 §15.1, §14.1`].
- **`M-CALENDAR` / `M-CLAUSES` / `M-SQUAD`:** **marcos contratuais** na timeline (expiração, gatilho por desempenho, janela de opção — cada vínculo vira no seu marco) e roll-up "situação contratual do elenco" [`06 §14.5`].
- **`M-HOME` (fase pré-temporada) / `MF-04`:** superfície do **briefing de nova temporada** (`SeasonOpeningContext`: expectativas do clube/torcida, situação financeira, jogadores-chave, necessidades de mercado, promoções da base, riscos) na entrada da temporada, não só no fim do wizard [`06 §11, §13.2`].
- **`M-BOARD`:** sinalizar **objetivos calibrados por estágio** do clube (novo revela jovens/reduz idade; médio briga por acesso; grande ganha título) [`06 §13.2`].
- **`M-NATIONAL`:** **fluxo de dispensa por recomendação médica** com estados (solicitada → em avaliação → reconhecida/negada → arbitragem clube×seleção), origem em `M-MEDICAL-CASE`; **grade prospectiva de rotação por datas FIFA** (quem está fora em cada janela + **projeção de prontidão no retorno** — viagem/clima/minutos), espelhada em `M-CALENDAR` [`12 §3, §5`].
- **`M-AWARDS` / `M-PLAYER`:** roll-up **"prêmios do meu elenco"** e **efeito psicológico** do prêmio no jogador (confiança↑ + pressão↑) no bloco de estados [`06 §7, §14.3`].
- **`M-PLAYER`:** **elegibilidade de seleção** (por qual seleção pode ser convocado; dupla nacionalidade/naturalização) [`12 §1`]. > **Pendência:** estrutura de dados de nacionalidade (fonte em aberto).

### Mercado (residual)
- **`M-PLAYER` / `M-NEGOTIATION`:** micro-bloco **"valor percebido vs. valor de tabela"** com os drivers nomeados (jovem, artilheiro, convocado, contrato longo, clube não precisa vender) [`07 §3.3`].

> **Hall da fama / cerimônias** ([`13-relatorios §6.4`](../01-game-design/13-relatorios-notificacoes-e-memoria.md)) permanece **pendência da fonte** — o acervo de dados já está em `M-HISTORY`; a cerimônia como evento aguarda decisão do GDD, não é lacuna de UI.
