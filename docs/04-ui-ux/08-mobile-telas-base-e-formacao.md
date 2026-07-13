# Mobile — Base e Formação

> **Status:** CANÔNICO · **Fontes:** docs/01-game-design/02-sistema-de-jogadores.md, docs/01-game-design/04-estrutura-do-clube-e-staff.md, docs/01-game-design/13-relatorios-notificacoes-e-memoria.md · **Revisão:** 2026-07-11

Telas de categorias de base, captação, ficha do jovem, plano de carreira, mentoria e promoção ao profissional. Fluxo: [MF-11](02-mobile-fluxos.md#mf-11--jornada-de-um-jovem). Acessível pela aba **Elenco** (aba "Base") e por atalhos.

---

## `M-ACADEMY` — Categorias de base

- **Objetivo:** gerir as categorias e o funil de formação.
- **Como se chega:** aba Elenco → Base; relatório da base.
- **Layout:** lista de jovens por categoria + indicadores da base.
- **Componentes e dados:** por categoria: jovens em formação (foto, idade, posição, potencial estimado, prontidão, moral, risco de saída, contrato/empréstimo); **relatório da base** ([doc 13, §5.3](../01-game-design/13-relatorios-notificacoes-e-memoria.md)): capacidade, desenvolvimento, planos, prontidão, risco de saída, contratos, empréstimos, **reputação formadora específica** por posição/perfil ("forma laterais", "revela goleiros", "recupera promessas") em vez de genérica [`02 §11`]. Indicadores do **departamento de base/CT** (nível → quantidade/qualidade/chance de joias).
- **Ações:** abrir jovem (`M-YOUTH-PLAYER`); captar (`M-YOUTH-INTAKE`); definir mentoria (`M-MENTORING`); promover (`M-PROMOTE`).
- **Estados:** vazio (base fraca/nível baixo); jovem em risco de saída realçado.
- **Referências:** [`02-jogadores §11, §15, §17`](../01-game-design/02-sistema-de-jogadores.md); [`04-estrutura §3.7`](../01-game-design/04-estrutura-do-clube-e-staff.md).

## `M-YOUTH-INTAKE` — Captação / peneira

- **Objetivo:** encontrar e trazer jovens.
- **Como se chega:** `M-ACADEMY`; data de captação no calendário (`youthIntakeDate`); notificação.
- **Componentes e dados:** canais de captação (regional/rede de olheiros); candidatos com **relatório de scout** (faixa de potencial, confiança, riscos ocultos, recomendação); disputa por um mesmo jovem (chance de jogar, estrutura da base, reputação formadora, salário/ajuda, distância da família, ídolos, empresário).
- **Ações:** observar / chamar para **teste**; oferecer **vínculo/proteção** (contrato de formação).
- **Estados:** concorrência com outros clubes; jovem recusa por fatores da disputa.
- **Referências:** [`02-jogadores §3, §11, §18`](../01-game-design/02-sistema-de-jogadores.md); [`06-temporada §4`](../01-game-design/06-temporada-e-competicoes.md) (`youthIntakeDate`).

## `M-YOUTH-PLAYER` — Ficha do jovem

- **Objetivo:** acompanhar e desenvolver o jovem (reusa a ficha de jogador com foco em formação).
- **Componentes e dados:** dados pessoais, atributos e **potencial em camadas** (com incerteza), traços (com visibilidade), inclinações naturais (aprende técnica/físico/tática rápido/devagar; responde a pressão/crítica; corpo frágil/explosão), estados, contrato de formação, plano de carreira, mentor vinculado, prontidão para o profissional; bloco **"Proteção do menor"** (alojamento, educação, limites de carga, movimentação) além da confidencialidade [`02 §17`].
- **Ações:** definir plano (`M-CAREER-PLAN`); vincular mentor (`M-MENTORING`); treinar com profissional; emprestar/promover/vender/liberar.
- **Estados:** proteção de menores (confidencialidade); estimativas com confiança.
- **Referências:** [`02-jogadores §4, §14, §15, §17`](../01-game-design/02-sistema-de-jogadores.md).

## `M-CAREER-PLAN` — Plano de carreira

- **Objetivo:** definir a trajetória de desenvolvimento do jovem.
- **Componentes e dados:** metas por atributo/posição; janela de promoção; empréstimo previsto para minutos; suporte (psicólogo, nutricionista, coordenador de transição); promessas de plano (minutos/posição/competição).
- **Ações:** definir/editar plano; ligar a promessas (`M-PROMISES`).
- **Estados:** aviso "geração ≠ promoção" (jovem sem jogar estagna).
- **Referências:** [`02-jogadores §14, §15`](../01-game-design/02-sistema-de-jogadores.md).

## `M-MENTORING` — Mentoria

- **Objetivo:** acelerar o desenvolvimento com veteranos/líderes.
- **Componentes e dados:** mentores disponíveis (traço líder natural / experiência); par mentor↔jovem; efeito esperado (evolução acelerada, formação de personalidade); treino de liderança.
- **Ações:** vincular/desvincular mentor.
- **Estados:** incompatibilidade de personalidade sinalizada.
- **Referências:** [`02-jogadores §6, §9, §15`](../01-game-design/02-sistema-de-jogadores.md).

## `M-PROMOTE` — Promoção ao profissional

- **Objetivo:** profissionalizar o jovem.
- **Componentes e dados:** prontidão; impacto no elenco (papel, hierarquia); **novo contrato** e expectativas; alternativas (emprestar/vender/liberar).
- **Ações:** **Promover** (command; encadeia `M-CONTRACT`); emprestar (`M-LOAN`); vender (`M-MARKET`); liberar (`HighRiskConfirm`).
- **Estados:** aviso quando a promoção é precoce (risco de estagnação/pressão).
- **Referências:** [`02-jogadores §15, §17`](../01-game-design/02-sistema-de-jogadores.md); [MF-11](02-mobile-fluxos.md#mf-11--jornada-de-um-jovem).
