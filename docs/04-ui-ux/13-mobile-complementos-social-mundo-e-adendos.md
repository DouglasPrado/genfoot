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

Os campos/ações que faltavam nas telas dos docs 03–12 foram **dobrados nos specs originais** — cada tela cita a fonte no próprio spec. Ficam abaixo os ponteiros de rastreabilidade da auditoria.

### Elenco, jogador, medicina (doc 05)
> Dobrado em [05-mobile-telas-elenco-jogador-treino-medicina.md](05-mobile-telas-elenco-jogador-treino-medicina.md) — `M-PLAYER` (intensidade de traço, adaptação/integração, bloco "Situação atual / crise", "Atribuir suporte", aba "Fim de carreira"/oferecer cargo), `M-PLAYER-DEV` ("Inclinações naturais" + `baseLearningRate`), `M-SQUAD` (critérios de filtro/ordenação + indicador de insatisfação), `M-MEDICAL-CASE` ("Comunicação pública da lesão"/4 camadas, lesão em empréstimo, seguro do atleta), `M-TRAINING`/`M-TRAINING-INDIV` (treino de goleiros/arquétipos GK).

### Base (doc 08)
> Dobrado em [08-mobile-telas-base-e-formacao.md](08-mobile-telas-base-e-formacao.md) — `M-ACADEMY` (reputação formadora específica), `M-YOUTH-PLAYER` (bloco "Proteção do menor"); e em [07-mobile-telas-mercado-transferencias-contratos.md](07-mobile-telas-mercado-transferencias-contratos.md) — `M-LOAN` (comparação de destinos + projeção de retorno).

### Partida (doc 06)
> Dobrado em [06-mobile-telas-tatica-escalacao-partida.md](06-mobile-telas-tatica-escalacao-partida.md) — `M-LINEUP` (sub-painel "Bola parada" por tipo), `M-LIVE` (chip "leitura do jogo", fase reta final/"Segurar resultado"/"Ganhar tempo", modo prorrogação, estado "time com 10"/goleiro de linha), `M-PREMATCH` (flag "importância: amistoso/pré-temporada"), `M-SCOUT-OPP` (seção "Como te leem").

### Mercado, contratos (doc 07)
> Dobrado em [07-mobile-telas-mercado-transferencias-contratos.md](07-mobile-telas-mercado-transferencias-contratos.md) — `M-NEGOTIATION` (estado "Exame médico"/5 desfechos + extrato de negociações), `M-CONTRACT` (seguro + cláusulas condicionais → `M-CLAUSES`), `M-SCOUTING` (lista de observação como pipeline, relatórios contraditórios, envelhecimento); e em [05-mobile-telas-elenco-jogador-treino-medicina.md](05-mobile-telas-elenco-jogador-treino-medicina.md) — badge de elegibilidade em `M-PLAYER`/`PlayerRow`.

### Finanças, estrutura (doc 09)
> Dobrado em [09-mobile-telas-financas-estrutura-estadio.md](09-mobile-telas-financas-estrutura-estadio.md) — `M-FINANCE` (composição da receita + direitos de TV por divisão), `M-COMMERCIAL` (entradas `M-MEMBERSHIP`/`M-PRODUCTS` + hospitalidade), `M-STRUCTURE` (marca, psicologia, ROI por área); e em [12-mobile-telas-perfil-config-loja.md](12-mobile-telas-perfil-config-loja.md) — `M-CLUB-PROFILE` (índice Tamanho Real do Clube).

### Competições, temporada (doc 10)
> Dobrado em [10-mobile-telas-competicoes-calendario-selecoes.md](10-mobile-telas-competicoes-calendario-selecoes.md) — `M-COMPETITION` (sorteio/chaveamento ao vivo + ligações `M-CLUB-VIEW`), `M-SEASON-CLOSE`/`M-AWARDS` (contestação de resultado antes da homologação).

### Central/IA (doc 04, 11)
> Dobrado em [04-mobile-telas-central-home-decisoes.md](04-mobile-telas-central-home-decisoes.md) — `M-AUTOMATIONS` (log/explicação navegável de `ai_decision_logs` + trade-off), `M-HOME` (recomendações da IA fora do jogo); e em [11-mobile-telas-comunicacao-torcida-moral.md](11-mobile-telas-comunicacao-torcida-moral.md) — `M-CONVO`/`M-FANS` (despedida de ídolo como fluxo conduzido).

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
