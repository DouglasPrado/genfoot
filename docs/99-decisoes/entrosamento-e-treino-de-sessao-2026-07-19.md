# Entrosamento, treino de sessão e fundação tática (R-220)

**Data:** 2026-07-19 · **Status:** RATIFICADA (forks batidos pelo dono) · **Escopo:** entrosamento, execução do treino, formação/escalação

## Contexto

O dono pediu um sistema de treino em duas formas (coletivo → entrosamento;
individual → atributos) e um **entrosamento** que buffa o time na partida. A
investigação do código revelou que **o entrosamento já está desenhado e
ratificado** (R-07 grafo de química, R-15 modificador ±6, R-33/`TacticalConfusion`,
coluna `MatchTeamState.tacticalCohesion`, telas `M-LINEUP` e `M-TEAMBALANCE`) —
mas **sem nenhuma implementação**. E a proposta do dono **diverge** da R-07 em dois
pontos, além de depender de fundações que não existem. Três forks foram levados
ao dono; abaixo, o que ele ratificou.

## O que foi ratificado

### R-220.1 — Fonte do entrosamento: treino coletivo (por formação) **+** minutos jogados juntos

Emenda/estende a **R-07**: a química continua crescendo com minutos jogados
juntos (R-07), **e** passa a crescer com **treino coletivo numa formação** — o
conjunto que treinou naquela formação ganha entrosamento. As duas fontes somam.
O **treino individual NÃO afeta entrosamento** — só atributos do jogador.

### R-220.2 — Treino de SESSÃO substitui a execução passiva (todo o treino)

O modelo atual (accrual diário → aplica na virada, R-212..R-216) tem a **execução
substituída** pelo modelo de sessão:

- Cada tipo de treino tem uma **duração em tempo real**; enquanto treina, o
  jogador fica **indisponível** para a partida (`PlayerAvailability`).
- Pode ser tirado a qualquer momento; interrompido pela metade → **ganho
  parcial** (proporcional ao tempo cumprido).
- Tirar do treino e escalar **no mesmo dia lógico** → perda de estamina /
  cansaço (`dynamicState.fatigue`).

A **fórmula de ganho** (`development-gain.ts`) e os efeitos de atributo/baseline
(R-216) permanecem; o que muda é o AGENDAMENTO/consumo.

### R-220.3 — Formação + escalação construídas PRIMEIRO

A partida hoje é `média de currentAbility do time titular` (SQL), motor
escalar-vs-escalar, **sem formação nem escalação no domínio**. A fundação tática
(formação, titular/banco, escalação) é **pré-requisito** e vem antes do
entrosamento, para que "treinou na formação X, jogou na X" seja real.

## Reconciliações que decorrem (e decisões ratificadas que isto TOCA)

- **R-15 (±6):** o entrosamento entra como pontuação de time `tacticalCohesion
  ∈ [0,100]` (coluna já specada), mapeada ao modificador ±6 da R-15 e aplicada
  como buff **de time** (todas as estatísticas) na partida — no canal de
  modificador aditivo que o kernel já tem. "Melhora todas as estatísticas" ✓.
- **R-33 / `TacticalConfusion`:** "cai durante o jogo" ao trocar formação ou
  escalar quem não treinou = a coesão EFETIVA aplicada é reduzida pela curva da
  R-33 já ratificada. Reaproveita, não contraria.
- **R-07 (grafo de pares):** a estrutura PRIMÁRIA passa a ser a pontuação de
  time; os pares/setores da R-07 entram como enriquecimento posterior (ou são
  dobrados na pontuação). Isto é a emenda da R-220.1 — registrada, não silenciosa.
- **Transferência:** trocar de clube **zera** a contribuição de entrosamento do
  jogador. Hoje `SignPlayer` não escreve o agregado Player — será um gancho novo
  (o repo de player já está na transação).

## Tensão em aberto (a resolver na Fase 2, NÃO decidida aqui)

**R-113 / INV-29 (atributos estruturais mudam uma vez por temporada).** O treino
de sessão aplica ganho ao ser interrompido/concluído — aplicação **por sessão**,
não por virada. Isso conflita com a mudança estrutural uma-vez-por-temporada.
Duas saídas possíveis (decisão quando a Fase 2 chegar): (a) sessão aplica só
atributos não-estruturais na hora, estruturais continuam na virada; (b) emendar
R-113 para permitir mudança estrutural por sessão concluída. **Parado aqui de
propósito** — é decisão do dono, e prematura antes da Fase 1.

## Faseamento (o programa)

1. **Fase 1 — Formação + escalação (fundação tática).** Modelar formação
   (4-4-2…), titular/banco, escalação server-authoritative; a partida passa a ler
   a escalação. Destrava `M-LINEUP`/`M-TACTICS`. Sem isto, nada do resto é real.
2. **Fase 2 — Treino de sessão.** Reescreve a execução: sessão com duração,
   indisponibilidade, ganho parcial, estamina no mesmo dia. Resolve a tensão
   R-113. Individual → atributos; coletivo → entrosamento (por formação).
3. **Fase 3 — Entrosamento.** Pontuação de time (treino-formação + minutos),
   zera na transferência, buff na partida (R-15), queda in-match por formação/
   escalação divergente (R-33). Destrava `M-TEAMBALANCE`.

## Calibrações

Duração de cada tipo de treino, magnitude do ganho parcial, custo de estamina no
mesmo dia, quanto cada fonte soma ao entrosamento, e o mapa coesão→±6 são
**calibrações minhas** (candidatas a VAL-001) até o dono fixar. Determinismo
R-182 em tudo (nada de `Date.now`/`Math.random` no domínio).
