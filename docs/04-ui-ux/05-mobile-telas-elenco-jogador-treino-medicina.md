# Mobile — Elenco, Jogador, Treino e Medicina

> **Status:** Rascunho consolidado · **Fontes:** docs/01-game-design/02-sistema-de-jogadores.md, docs/01-game-design/04-estrutura-do-clube-e-staff.md, docs/01-game-design/13-relatorios-notificacoes-e-memoria.md · **Revisão:** 2026-07-11

A aba **Elenco**: lista do plantel, ficha completa do jogador (atributos, desenvolvimento, memória), papéis/liderança, promessas, treino (coletivo e individual) e departamento médico. Fluxos: [MF-05](02-mobile-fluxos.md#mf-05--ciclo-semanal-de-gestão), [MF-12](02-mobile-fluxos.md#mf-12--lesão-e-recuperação), [MF-17](02-mobile-fluxos.md#mf-17--treino-e-condição), [MF-18](02-mobile-fluxos.md#mf-18--conversa-com-atleta).

> **Nota sobre indicadores:** atributos são 0–100. Modo simples mostra faixa/cor; detalhado mostra o número. Dados imperfeitos (potencial, risco de lesão via scouting) aparecem como **estimativa com confiança**, nunca número exato. Escala canônica de scores é [pendência do GDD](../01-game-design/02-sistema-de-jogadores.md).

---

## `M-SQUAD` — Elenco (lista)

- **Objetivo:** ver e gerir o plantel; ponto de partida para escalação, treino e mercado.
- **Como se chega:** aba Elenco; atalho da Home; relatório de elenco.
- **Layout:** lista agrupável (por posição/setor) + `FilterBar` + `SortControl`; abas "Profissional" / "Base".
- **Componentes e dados:** por linha (`PlayerRow`): foto, nome, idade, **posição/função**, overall (faixa), **moral**, **forma/condição física**, **fadiga**, status (lesionado/suspenso/convocado/à venda/emprestado), contrato (tempo restante) e **indicador de insatisfação** consolidado (moral/promessas/minutos/salário) [`02 §15`]. Cabeçalho com **relatório de elenco** ([doc 13, §5.2](../01-game-design/13-relatorios-notificacoes-e-memoria.md)): profundidade por posição, idade, liderança, lacunas, excesso, jogadores em risco, jovens próximos do profissional. **Critérios de filtro/ordenação** (`FilterBar`/`SortControl`): posição, traço, potencial, papel, status de contrato/mercado, risco de saída, prontidão [`02 §15`].
- **Ações:** tocar → `M-PLAYER`; multiseleção para comparar; atalhos → `M-LINEUP`, `M-TRAINING`, `M-MARKET`; marcar à venda/observar.
- **Estados:** *skeleton*; filtros vazios; offline (cache); ordenação persistida.
- **Tempo real/notificações:** `clubSequence` atualiza moral/condição/lesões.
- **Referências:** [`02-jogadores §15`](../01-game-design/02-sistema-de-jogadores.md); [`13-relatorios §5.2`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).

## `M-PLAYER` — Ficha do jogador

- **Objetivo:** visão completa e única do atleta.
- **Como se chega:** `M-SQUAD`, `M-MARKET`, `M-SCOUTING`, feeds, negociação.
- **Layout:** cabeçalho (foto, nome, idade, posição/função, nacionalidade, overall/potencial) → abas: **Resumo · Atributos · Contrato · Desenvolvimento · Memória · Médico · Fim de carreira**.
- **Componentes e dados (Resumo):** origem, nacionalidade/região, história familiar/condição social, pé dominante, altura/peso, **personalidade e traços** (com **visibilidade**: visível / detectado por scout / oculto, e **intensidade** de cada traço) [`02 §2`], **estados** (moral, fadiga, confiança, pressão, motivação, forma, ansiedade, foco), indicador de **adaptação/integração** de recém-chegado (clube/cidade/idioma/tática/grupo) [`02 §15`], **papel no elenco** (chave/titular/rotação/reserva/desenvolvimento/liderança/mentor), badge de **elegibilidade** ("contratado / ainda não inscrito/apto") [`03 §17.5`], **valor de mercado**, valor de imagem. Bloco **"Situação atual / crise":** evento de carreira ativo com **ações de reversão** (via `M-CONVO`/`M-TRAINING-INDIV`) [`02 §9`].
- **Ações:** conversar (`M-CONVO`), renovar (`M-CONTRACT`), treinar (`M-TRAINING-INDIV`), listar/vender (`M-MARKET`), definir papel (`M-ROLES`), promessas (`M-PROMISES`); **Atribuir suporte** (psicólogo, assistente social, mentor, coordenador de transição, gestor de carreira) ao profissional em risco emocional [`02 §14`]; ao ídolo que se aposenta, **oferecer cargo** (transição jogador→funcionário) [`02 §17`].
- **Estados:** dados ocultos aparecem como "?" com dica de scouting; ao ver jogador de outro clube, campos sensíveis ficam estimados. Aba **"Fim de carreira"**: estados considerada / anunciada / adiada / confirmada / imposta médica [`02 §17`].
- **Referências:** [`02-jogadores §1–4, §9, §13, §14, §15, §17`](../01-game-design/02-sistema-de-jogadores.md); [`03-economia §17.5`](../01-game-design/03-economia.md).

## `M-PLAYER-ATTRS` — Atributos detalhados

- **Objetivo:** inspecionar atributos por eixo.
- **Como se chega:** aba "Atributos" da ficha.
- **Componentes e dados** (`AttributeBar` por atributo, agrupado — [doc §6](../01-game-design/02-sistema-de-jogadores.md)):
  - **Técnicos:** passe curto, passe longo, visão, finalização/chute, precisão, drible, controle/primeiro toque, controle sob pressão, cruzamento, criatividade, bola parada (falta, escanteio, pênalti), 1×1, bola aérea ofensiva, lançamento, chute de longe.
  - **Físicos:** força, duelos físicos, velocidade, aceleração, pique, resistência/fôlego, intensidade, impulsão, arrancada, agilidade/mudança de direção, prevenção (longevidade).
  - **Táticos:** leitura, posicionamento/ocupação de espaço, marcação, interceptação, combate, organização coletiva, reação pós-perda, passe sob pressão, tomada de decisão, velocidade mental, contra-ataque, disciplina tática.
  - **Mentais:** garra/raça, determinação, liderança, frieza, concentração, disciplina, inteligência tática, coragem, regularidade, ambição, resiliência, pressão emocional, lealdade.
  - **Potencial em camadas:** Natural / Aproveitável (Alcançado) / Funcional; `PositionFit`/`RoleFit`/`FormationFamiliarity` (aptidão à posição/função/formação).
- **Ações:** alternar modo simples/detalhado; comparar com outro jogador.
- **Estados:** valores estimados vs. conhecidos sinalizados por confiança.
- **Referências:** [`02-jogadores §6, §4, §7`](../01-game-design/02-sistema-de-jogadores.md); [`05-motor §7`](../01-game-design/05-motor-de-partida.md).

## `M-PLAYER-DEV` — Desenvolvimento / histórico de evolução

- **Objetivo:** entender como o jogador evolui e por quê.
- **Componentes e dados:** curva de evolução por **faixa etária** (14–17, 18–21, 22–25, 26–29, 30–33, 34+); bloco **"Inclinações naturais"** (aprende técnica/físico/tática rápido ou devagar; responde a pressão/crítica; corpo frágil/explosão) e `baseLearningRate` [`02 §4, §6`]; **fatores de ganho** (foco de treino, qualidade do treino, compatibilidade jogador-clube, minutos competitivos, moral, fadiga, lesão, pressão); **trade-offs** (ganha X / perde Y); `PlayerDevelopmentHistory` por passagem de clube (foco, contexto, atributos/traços ganhos, lesões). Explicabilidade: "por que estagnou/evoluiu".
- **Ações:** ver detalhe por temporada; comparar potencial restante por camada.
- **Estados:** modo simples (direção: "mais técnico/físico…") vs. detalhado (deltas).
- **Referências:** [`02-jogadores §4–8`](../01-game-design/02-sistema-de-jogadores.md); [`13-relatorios §4`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).

## `M-PLAYER-MEMORY` — Memória / trajetória

- **Objetivo:** contar a história do jogador (base do apego e da narrativa).
- **Componentes e dados:** `Timeline` de marcos — clubes por onde passou, técnicos importantes, lesões marcantes, jogos decisivos, falhas traumáticas, títulos, convocações, conflitos, mentorias, posições treinadas; cada memória com tipo, intensidade, temporada, duração (curta/média/longa/histórica) e efeitos futuros.
- **Ações:** filtrar por tipo; abrir partida/temporada referenciada (`M-HISTORY`).
- **Estados:** vazio para jovem recém-gerado.
- **Referências:** [`02-jogadores §13`](../01-game-design/02-sistema-de-jogadores.md); [`13-relatorios §6.3`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).

## `M-ROLES` — Papéis, hierarquia e liderança

- **Objetivo:** organizar o elenco como grupo social.
- **Como se chega:** `M-SQUAD` (aba) / `M-PLAYER`.
- **Componentes e dados:** estrutura de liderança (**capitão**, vice, conselho de jogadores, líderes informais, **mentores**); papel de cada jogador; grupos e relações; conflitos ativos; coerência papel × contrato × uso.
- **Ações:** nomear capitão/vice/mentores; definir papel; mediar conflito (`M-CONVO`).
- **Estados:** aviso de incoerência (papel prometido ≠ uso real).
- **Referências:** [`02-jogadores §15`](../01-game-design/02-sistema-de-jogadores.md).

## `M-PROMISES` — Promessas ao jogador

- **Objetivo:** acompanhar promessas feitas (minutos, posição, papel, renovação, reforços, competição, desenvolvimento).
- **Componentes e dados:** lista de promessas com **prazo**, **contexto** e **estado** (cumprida/em risco/quebrada); impacto na moral/relação.
- **Ações:** cumprir/renegociar via `M-CONVO`; ligar a decisões da Central.
- **Estados:** promessa em risco realça em âmbar; quebrada em vermelho.
- **Referências:** [`02-jogadores §15`](../01-game-design/02-sistema-de-jogadores.md).

## `M-TRAINING` — Treino do elenco

- **Objetivo:** definir o treino coletivo e a recuperação.
- **Como se chega:** aba Elenco; ciclo semanal; pré-jogo.
- **Componentes e dados:** foco coletivo por área (técnico/físico/tático/mental), carga/intensidade, treino específico (defensivo/ofensivo/bola parada), **eixo/plano de treino de goleiros** (específico), recuperação; efeito modulado pela **comissão** e **CT** (níveis). Alertas de sobrecarga (risco de lesão) e de baixa carga.
- **Ações:** definir foco/carga (command `SetTrainingPlan`); agendar recuperação; abrir plano individual (`M-TRAINING-INDIV`).
- **Estados:** aviso de fadiga alta; conflito com calendário apertado.
- **Referências:** [`02-jogadores §6, §10, §18`](../01-game-design/02-sistema-de-jogadores.md); [`04-estrutura §3.2, §3.3, §3.8`](../01-game-design/04-estrutura-do-clube-e-staff.md).

## `M-TRAINING-INDIV` — Plano individual de treino

- **Objetivo:** treinar um jogador específico.
- **Componentes e dados:** área/atributo alvo, treino de posição/função, **plano de treino de goleiros** (arquétipos GK), mentoria (com veterano/líder), recuperação; projeção de ganho e trade-off; risco por sobrecarga.
- **Ações:** definir plano; vincular mentor (`M-MENTORING`).
- **Estados:** aviso quando o alvo entra em conflito com a condição física.
- **Referências:** [`02-jogadores §6, §8, §10, §18`](../01-game-design/02-sistema-de-jogadores.md).

## `M-MEDICAL` — Departamento médico / lesões

- **Objetivo:** visão geral da saúde do elenco.
- **Como se chega:** aba Elenco; notificação de lesão; pré-jogo.
- **Layout:** lista de casos ativos + indicadores do departamento.
- **Componentes e dados:** por jogador: condição geral, fadiga, dor, **lesão** (tipo/gravidade), **restrição**, tratamento, **estágio de reabilitação (1–7)**, prazo estimado, risco de recaída. Indicadores do **departamento médico** (nível → menos lesões/recuperação mais rápida/diagnóstico melhor). Confidencialidade do diagnóstico (camadas).
- **Ações:** abrir caso (`M-MEDICAL-CASE`); ajustar carga (`M-TRAINING`); gerir minutos (`M-GAMEPLAN`).
- **Estados:** vazio ("elenco saudável"); incidência agregada de lesões.
- **Referências:** [`02-jogadores §16`](../01-game-design/02-sistema-de-jogadores.md); [`04-estrutura §3.4`](../01-game-design/04-estrutura-do-clube-e-staff.md).

## `M-MEDICAL-CASE` — Caso de lesão / reabilitação

- **Objetivo:** conduzir o tratamento de uma lesão específica ([MF-12](02-mobile-fluxos.md#mf-12--lesão-e-recuperação)).
- **Componentes e dados:** diagnóstico (suspeita inicial → exames → diagnóstico → gravidade → faixa de recuperação → risco de retorno); opções de **tratamento** com prazo/risco; progresso pela **reabilitação (estágios 1–7)** com restrições que diminuem; avaliação de retorno ao treino (comissão) e retorno competitivo (medicina); campo de **seguro do atleta** (cobertura/prêmio) [`03 §13, §17.3`]; variante **lesão em empréstimo** (quem trata, quem paga, onde reabilita, info à origem, retorno) [`02 §16`].
- **Ações:** solicitar exame; **escolher tratamento** (command); liberar para treino/jogo (com aviso de risco de recaída); administrar minutos; **Comunicação pública da lesão** com visualização das **4 camadas** de confidencialidade (diagnóstico real / comissão / público / outros clubes) [`02 §16`].
- **Estados:** decisão de retorno precoce usa `HighRiskConfirm` (risco real de recaída); *loading* de exame.
- **Referências:** [`02-jogadores §16`](../01-game-design/02-sistema-de-jogadores.md); [`03-economia §13, §17.3`](../01-game-design/03-economia.md); [`15-fluxos §12`](../01-game-design/15-fluxos-completos.md).
