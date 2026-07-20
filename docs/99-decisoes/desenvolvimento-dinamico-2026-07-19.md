# Desenvolvimento dinâmico e instantâneo (R-221)

**Data:** 2026-07-19 · **Status:** RATIFICADA · **Escopo:** desenvolvimento do jogador, emenda à R-113/INV-29

## Contexto

A R-220 (Fase 2) deixou aberta a tensão: o treino de sessão aplica ganho ao ser
concluído/interrompido (por sessão), mas a **R-113/INV-29** manda o atributo
estrutural mudar **uma vez por temporada**. Apresentei ao dono as duas saídas —
(a) manter seasonal, ganho vira progresso bancado; (b) emendar a R-113 para
progresso instantâneo — com o custo de cada uma. O dono escolheu **(b)** e foi
além: o atributo deve ser **vivo**.

## R-221 — O atributo do jogador é vivo: sobe e desce, na hora, dirigido por eventos

Emenda a **R-113** e a **INV-29**: o desenvolvimento **não** é mais cristalizado
na virada de temporada. O atributo/habilidade do jogador é um valor **dinâmico e
instantâneo**, que se move — **para cima OU para baixo** — em resposta a eventos:

- **Treino** (sessão): sobe conforme o jogador treina; parcial proporcional ao
  tempo cumprido se interrompido (R-220.2). Ganho, não perda, no caso normal.
- **Partidas**: o desempenho realimenta o atributo — jogo bom empurra pra cima,
  jogo ruim pra baixo.
- **Decisões**: certas decisões de gestão movem o atributo (±).

A aplicação é **na hora** (o número que a tela, a partida e o mercado leem muda
imediatamente), não bufferizada até a virada.

## Consequências aceitas (o dono sabe e quer)

- **`currentAbility`/força de partida/valor de mercado/faixa de olheiro passam a
  ser contínuos dentro da temporada** — alvo móvel, não foto estável. É o preço
  do loop curto, e é desejado.
- **A virada de temporada deixa de cristalizar desenvolvimento.** Envelhecimento
  e aposentadoria (R-217) e captação (R-218) continuam na virada; o *crescimento*
  sai de lá.
- **O genfoot, neste eixo, é jogo de PROGRESSÃO de loop curto**, não simulador
  seasonal. Decisão de identidade, tomada de propósito.

## Limites e mitigação do grind (fazem parte da decisão)

- **Teto por potencial aproveitável (R-216) continua valendo para cima**; e há um
  **piso** para baixo (a definir — o atributo não despenca a zero por um jogo
  ruim). Calibração minha (VAL-001).
- **Anti-grind:** o ganho de treino é proporcional ao **tempo real** de sessão,
  com retornos decrescentes/teto, e o jogador fica **indisponível** enquanto
  treina (custo de oportunidade). Ligar/desligar sessão não bate deixar treinar.
- **Determinismo (R-182):** todo delta é determinístico por evento
  (`SeededRandom`/id do evento); reprocessar o mesmo evento não reaplica.

## A permanência da QUEDA — RESOLVIDO: decai (forma) sobre um núcleo permanente

O dono escolheu **decai/sara**. O modelo é de **duas camadas**, e a habilidade
efetiva (o que a partida, a tela e o mercado leem) é a soma delas:

- **Núcleo permanente** — movido PRA CIMA pelo **treino**, com teto no potencial
  aproveitável (R-216). Nunca cai sozinho; um mau momento não destrói o que foi
  conquistado treinando.
- **Forma (transiente)** — movida ± por **partidas e decisões**, e **decai** de
  volta ao neutro com o tempo. Jogo bom dá pico temporário; jogo ruim dá vale
  temporário. Sara sozinha.

`abilidadeEfetiva = núcleo + forma`. Assim há progresso permanente (treino) E
reatividade instantânea (partida/decisão), sem espiral punitiva — um jogador ruim
não afunda de vez por uma sequência ruim; a forma volta. Amplitude da forma e a
velocidade de decaimento são calibração minha (VAL-001).

## Reescopo do programa

A Fase 2 deixa de ser só "treino de sessão" e vira um **motor de desenvolvimento
vivo**, fatiável: 2a treino (sessão, ± instantâneo), 2b realimentação de
partida (±), 2c decisões (±). A Fase 3 (entrosamento) segue depois.
