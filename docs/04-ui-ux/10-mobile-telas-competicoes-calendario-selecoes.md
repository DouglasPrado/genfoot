# Mobile — Competições, Calendário e Seleções

> **Status:** CANÔNICO · **Fontes:** docs/01-game-design/06-temporada-e-competicoes.md, docs/01-game-design/12-selecoes-e-calendario-internacional.md, docs/01-game-design/13-relatorios-notificacoes-e-memoria.md, docs/01-game-design/01-mundo-persistente-e-clubes.md · **Revisão:** 2026-07-11

Telas de competições (tabela, chaveamento, regulamento, artilharia), calendário/agenda, inscrições, fim de temporada/premiação, seleções e histórico/legado do mundo. Fluxos: [MF-04](02-mobile-fluxos.md#mf-04--início-de-temporada--pré-temporada), [MF-06](02-mobile-fluxos.md#mf-06--encerramento-de-temporada), [MF-21](02-mobile-fluxos.md#mf-21--convocação-para-seleção). Vive na aba **Jogo**.

---

## `M-COMPETITIONS` — Lista de competições

- **Objetivo:** navegar entre as competições do clube e do mundo.
- **Como se chega:** aba Jogo; Home; calendário.
- **Componentes e dados:** competições em que o clube joga (liga, copa, estadual/regional, continental, mundial, base, amistosos) + do mundo; por item: tipo, país/região, fase atual, posição/rodada.
- **Ações:** abrir `M-COMPETITION`; ir ao calendário.
- **Estados:** vazio (fora de copas); *loading*.
- **Referências:** [`06-temporada §2, §5`](../01-game-design/06-temporada-e-competicoes.md).

## `M-COMPETITION` — Competição

- **Objetivo:** tudo de uma competição.
- **Layout:** header + abas.
- **Componentes e dados (abas):**
  - **Tabela/Classificação** (liga; com critérios de desempate, pontuação, zona de acesso/rebaixamento/continental).
  - **Chaveamento** (mata-mata: pernas, gol fora, prorrogação, pênaltis).
  - **Grupos** (continental: potes → grupos → mata-mata).
  - **Rodadas/Jogos** (resultados e próximos).
  - **Regulamento** (`ChampionshipRules`: promoção/rebaixamento, vagas continentais, limite de inscrição, limite de estrangeiros, idade, prêmios).
  - **Artilharia/Estatísticas/Prêmios** (top scorer, best player, garçom, revelação, etc.).
  - **Qualificação** (regras de vaga entre competições).
- **Ações:** abrir clube/jogo/jogador; **ligações para `M-CLUB-VIEW`** dos adversários da competição; seguir competição.
- **Estados:** dados provisórios antes da homologação; *loading* por aba.
- **Tempo real/notificações:** `worldSequence` atualiza tabela (evento "mudança de tabela"); **sorteio/chaveamento ao vivo** (evento).
- **Referências:** [`06-temporada §2, §3, §7`](../01-game-design/06-temporada-e-competicoes.md).

## `M-CALENDAR` — Calendário / agenda da temporada

- **Objetivo:** ver o cronograma e planejar.
- **Layout:** timeline por **7 fases** (pré-temporada, início, meio, reta final, fim, transição, nova temporada) + lista por dia.
- **Componentes e dados** (`SeasonCalendar`): rodadas (`matchdays`), **janelas de transferência**, **datas de seleção/FIFA**, **descanso**, **captação de base** (`youthIntakeDate`), **data de premiação** (`awardsDate`); marcadores de janela de **inscrição** (aberta/congelada).
- **Ações:** abrir dia (`M-CALENDAR-DAY`); ir a competição/partida.
- **Estados:** fase atual destacada; janelas abertas/fechadas sinalizadas.
- **Referências:** [`06-temporada §1, §4`](../01-game-design/06-temporada-e-competicoes.md).

## `M-CALENDAR-DAY` — Detalhe do dia

- **Objetivo:** ver e agir sobre um dia específico.
- **Componentes e dados** (`CalendarDay`): jogos, treino, viagem, eventos de imprensa, eventos da diretoria, eventos de jogador.
- **Ações:** abrir a partida/treino/evento correspondente.
- **Estados:** dia com jogo destacado; viagem/descanso indicados.
- **Referências:** [`06-temporada §4`](../01-game-design/06-temporada-e-competicoes.md).

## `M-REGISTRATION` — Inscrição de elenco / listas

- **Objetivo:** inscrever e ajustar a lista dentro das janelas.
- **Como se chega:** MF-04; calendário (janela aberta); notificação.
- **Componentes e dados:** **lista principal** de inscritos (tratamento de goleiros/categorias); **limite de estrangeiros**; **cota de jovens formados**; limite de idade; status (aberto/congelado). Princípio: contratar não garante inscrição imediata; fora do prazo, sem inscrição até a próxima janela.
- **Ações:** inscrever/remover jogador (command); ajustar lista.
- **Estados:** janela fechada (somente leitura); violação de limite bloqueia com motivo (`PLAYER_ALREADY_REGISTERED`, limite de estrangeiros, etc.).
- **Referências:** [`06-temporada §15.2`](../01-game-design/06-temporada-e-competicoes.md). **Fechado:** elenco 26, até 5 estrangeiros e mínimo 2 formados no clube (R-63).

## `M-SEASON-CLOSE` — Fim de temporada (wizard)

- **Objetivo:** conduzir/acompanhar a virada de ciclo ([MF-06](02-mobile-fluxos.md#mf-06--encerramento-de-temporada)).
- **Layout:** *wizard* sequencial espelhando o motor de virada (~20 passos), agrupado em etapas.
- **Componentes e dados por etapa:** **homologação** (título provisório→oficial; **contestação de resultado pelo usuário antes da homologação**; correção antes vs. versão nova depois) [`06 §14.2`]; **títulos/acessos/rebaixamentos**; **premiações** (`M-AWARDS`); **avaliação da diretoria** (`BoardEvaluation`: esperado×real, finanças, desenvolvimento, satisfação, paciência, nota final) e **da torcida** (`FanEvaluation`); **evolução/regressão** (`PlayerSeasonDevelopment`: deltas técnico/físico/mental/tático/reputação, declínio por idade, penalidade por lesão); **eventos extra-campo**; **aposentadorias/reaproveitamento** (`RetirementDecision`: aposenta/renova/reduz salário/clube menor/auxiliar/olheiro/empresário); **contratos** (transição escalonada); **mercado**; **finanças** (premiações financeiras: imediato/parcelas/retidos/compensações/bônus); **base** (promoções + novos talentos); **realocação de divisões**; **briefing** da nova temporada (`SeasonOpeningContext`).
- **Ações:** avançar etapas; tomar decisões de contrato/renovação/aposentadoria; encadear [MF-04](02-mobile-fluxos.md#mf-04--início-de-temporada--pré-temporada).
- **Estados:** na ausência, processado automaticamente com **limites de autoridade** (não vende jogador-chave, não assume grande dívida, não muda identidade).
- **Referências:** [`06-temporada §6, §7, §10, §14`](../01-game-design/06-temporada-e-competicoes.md).

## `M-AWARDS` — Premiações

- **Objetivo:** celebrar os prêmios da temporada/competição.
- **Componentes e dados:** `SeasonResult` (campeão, vice, rebaixados, promovidos, classificados, artilheiro, melhor jogador, melhor jovem, melhor técnico); prêmios de campeonato e de temporada (craque, garçom, revelação, melhor goleiro/zagueiro, seleção da temporada, mais evoluído, decepção, fair play).
- **Ações:** ver detalhe; compartilhar conquista.
- **Estados:** prêmios objetivos (contagem) vs. subjetivos (eleição).
- **Referências:** [`06-temporada §6.1, §7, §14.3`](../01-game-design/06-temporada-e-competicoes.md).

## `M-NATIONAL` — Seleções / convocações

- **Objetivo:** gerir o impacto das convocações no clube.
- **Como se chega:** data de seleção; notificação de convocação; MF-21.
- **Componentes e dados:** jogadores convocados; **período de ausência** (inclui viagem); **fadiga** que retorna; **moral** (sobe/cai); **valorização/exposição** internacional; risco de retorno lesionado; conflito de datas (prioridade por regulamento); **recomendação médica** como única exceção — **fluxo de dispensa** com estados (solicitada → em avaliação → reconhecida/negada → **arbitragem clube×seleção**), com origem em `M-MEDICAL-CASE`; **grade prospectiva de rotação por datas FIFA** (quem fica fora em cada janela + **projeção de prontidão no retorno** — viagem/clima/minutos), espelhada em `M-CALENDAR`; compensação parcial (quando a regra do mundo prevê).
- **Ações:** planejar rotação (`M-LINEUP`/`M-GAMEPLAN`); solicitar/acompanhar dispensa por recomendação médica (até a arbitragem).
- **Estados:** clube **não pode impedir** convocação oficial; retorno pode não vir pronto.
- **Referências:** [`12-selecoes §2, §3, §5, §6`](../01-game-design/12-selecoes-e-calendario-internacional.md). **Fechado:** controle por gestor ≥85, curvas R-64, compensação R-66 e escopo completo R-150.

## `M-HISTORY` — Histórico e legado do mundo

- **Objetivo:** dar identidade e apego pela memória do mundo.
- **Layout:** abas: **Mundo (record book) · Clube · Jogador**.
- **Componentes e dados:** **record book do mundo** (campeões, acessos/rebaixamentos, maiores vendas, artilheiros, assistências, goleiros, público, sequências, revelados, ídolos, crises, punições, rivalidades, partidas marcantes); **linha do tempo do clube** (`ClubHistory`: temporadas, dirigentes/usuários, títulos, obras, contratações, vendas, ídolos, acessos, quedas); **linha do tempo do jogador** (`PlayerHistory`). Identidade preservada por época (partidas antigas exibem a identidade da época).
- **Ações:** navegar por temporada; abrir clube/jogador/partida.
- **Estados:** cerimônias/hall da fama apresentam dados homologados do acervo histórico, sem efeito mecânico, conforme o GDD de relatórios §6.4.
- **Referências:** [`06-temporada §8`](../01-game-design/06-temporada-e-competicoes.md); [`13-relatorios §6`](../01-game-design/13-relatorios-notificacoes-e-memoria.md); [`01-mundo §1.6`](../01-game-design/01-mundo-persistente-e-clubes.md).

## `M-RANKINGS` — Rankings e reputação

- **Objetivo:** situar clube e gestor no mundo.
- **Componentes e dados:** **ranking de clubes** e **de gestores** (atualizados por desempenho, contexto, estrutura, finanças, base, história); reputação por **faixa** (Local→Regional→Nacional→Continental→Mundial); estágios de tamanho (pequeno→gigante). Regra: ranking é **reputação/trajetória, não bônus oculto de força**.
- **Ações:** filtrar por divisão/região; abrir perfil.
- **Estados:** avanço local visível mesmo sem relevância global.
- **Referências:** [`13-relatorios §6.4`](../01-game-design/13-relatorios-notificacoes-e-memoria.md); [`01-mundo §4.3`](../01-game-design/01-mundo-persistente-e-clubes.md).
