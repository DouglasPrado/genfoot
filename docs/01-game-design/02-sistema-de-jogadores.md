# Sistema de Jogadores

> **Status:** Rascunho consolidado · **Fontes:** chats/lista-envolvidos-jogo.md · **Revisão:** 2026-07-10

## Resumo

O Sistema de Jogadores é o núcleo do **Grinta**. Ao contrário de managers clássicos como o Brasfoot, onde o atleta carrega atributos essencialmente fixos, aqui o jogador **nasce com uma tendência, não com um destino fixo**. Ele começa com uma base, um talento natural e um potencial, mas os clubes por onde passa, a metodologia de treino, os minutos jogados e os eventos de carreira empurram seus atributos para direções específicas. Dois jogadores gerados com o mesmo potencial podem terminar a carreira como atletas completamente diferentes.

Este documento consolida o modelo conceitual do jogador: a fórmula de identidade, a separação entre atributo, estado e traço, a geração inicial, o sistema de potencial em camadas, as tabelas de treino e evolução, a memória acumulativa de jogador e clube, e o papel da personalidade. Ao final, registra o backlog de vazios de design que ainda precisam ser fechados.

> As fórmulas exatas e as definições de schema (tipos, campos, ranges) vivem em `../02-tecnico/02-modelo-de-dados.md` e `../02-tecnico/05-catalogo-de-regras-e-formulas.md`. Aqui tratamos apenas do conceito de design.

## Sumário

1. [Fórmula conceitual do jogador](#1-formula-conceitual-do-jogador)
2. [Atributo, estado e traço](#2-atributo-estado-e-traco)
3. [Geração de jogadores](#3-geracao-de-jogadores)
4. [Talento e potencial em camadas](#4-talento-e-potencial-em-camadas)
5. [Curvas de evolução por idade](#5-curvas-de-evolucao-por-idade)
6. [Treino e direção da evolução](#6-treino-e-direcao-da-evolucao)
7. [Marca de formação do clube (DevelopmentSignature)](#7-marca-de-formacao-do-clube-developmentsignature)
8. [Histórico de desenvolvimento (PlayerDevelopmentHistory)](#8-historico-de-desenvolvimento-playerdevelopmenthistory)
9. [Eventos de carreira](#9-eventos-de-carreira)
10. [Mudança de posição e perfil](#10-mudanca-de-posicao-e-perfil)
11. [Reputação do clube formador](#11-reputacao-do-clube-formador)
12. [Impacto no valor de mercado](#12-impacto-no-valor-de-mercado)
13. [Memória do jogador e memória do clube](#13-memoria-do-jogador-e-memoria-do-clube)
14. [Personalidade e decisões fora de campo](#14-personalidade-e-decisoes-fora-de-campo)
15. [Backlog de gaps de design](#15-backlog-de-gaps-de-design)

---

## 1. Fórmula conceitual do jogador

A identidade de um jogador no Grinta é a soma de sua origem com tudo o que a carreira faz com ele:

```
Jogador = origem
        + talento natural
        + personalidade
        + clubes por onde passou
        + treinos recebidos
        + minutos jogados
        + eventos de carreira
```

O princípio-guia é: **o jogador nasce com tendência, não com destino fixo**. A base define o ponto de partida e o teto; a trajetória define o que ele efetivamente se torna.

Um mesmo meia de 16 anos, técnica natural alta, físico baixo, potencial 88 e personalidade criativa mas indisciplinada, evolui de formas distintas conforme o clube que o recebe:

| Tipo de clube que o recebe | O jogador tende a ganhar |
|---|---|
| Clube técnico | passe, visão, drible, tomada de decisão, criatividade |
| Clube físico | força, resistência, intensidade, marcação |
| Clube tático | posicionamento, disciplina, leitura de jogo, recomposição |
| Clube ruim | evolui pouco, pega vícios, pode desperdiçar potencial |

A regra central, na forma consolidada:

> O jogador nasce com uma base e um potencial, mas a carreira molda seus atributos. Cada clube, treino, técnico, estrutura, evento e decisão deixa marcas no jogador. Ele não é só gerado único; ele continua se transformando de forma única durante a carreira.

---

## 2. Atributo, estado e traço

O modelo separa três categorias distintas, que muitas vezes são confundidas. Essa separação é o que dá consistência ao simulador.

### Atributo

Característica **estrutural** do jogador, relativamente permanente. Muda lentamente, via desenvolvimento acumulado.

- Exemplos: finalização, passe, velocidade, força, marcação, reflexo, liderança, disciplina.

### Estado

Característica **temporária**, que muda por lance, jogo, semana ou temporada.

- Exemplos: moral atual, fadiga, confiança, pressão, motivação, forma recente, ansiedade, foco.

### Traço

Característica **profunda** de personalidade, difícil de mudar.

- Exemplos: raçudo, frio em decisão, instável emocionalmente, ambicioso, leal, líder natural, influenciável, sensível a críticas, profissional exemplar.

Cada traço carrega uma **intensidade** (o quanto ele pesa) e uma **visibilidade** — visível, detectado por scout ou oculto. Assim, dois jogadores "raçudos" reagem em graus diferentes ao mesmo evento, e nem todos os traços são conhecidos no momento da contratação: parte só se revela com o tempo (ver seção 3).

### Fluxo de interação

A ordem de causalidade entre as três categorias é o coração do modelo:

1. **Traços influenciam estados** — um traço "sensível a críticas" faz a pressão subir mais diante de uma vaia.
2. **Estados alteram o desempenho** — pressão alta e confiança baixa pioram as escolhas em campo.
3. **Desempenho, ao longo do tempo, altera atributos** — jogar bem ou mal por muitos jogos move números estruturais.
4. **Eventos alteram estados imediatamente e traços lentamente** — um evento forte muda a moral hoje e, se recorrente, pode reconfigurar um traço.

> Exemplo de cadeia: jogador com traço "sensível a críticas" + mídia criticando → pressão sobe mais → confiança cai mais → joga pior. Se houver bom suporte psicológico, ao longo do tempo ele pode evoluir estabilidade emocional (mudança lenta de traço).

---

## 3. Geração de jogadores

Cada jogador nasce com história própria. A qualidade média de uma safra é influenciada pela estrutura do clube, mas a singularidade vem da geração individual.

Fluxo de geração de um jogador individual:

1. Gerar talento natural
2. Gerar nacionalidade / região
3. Gerar história familiar
4. Gerar condição social
5. Gerar acesso inicial ao futebol (futsal, rua, base estruturada, etc.)
6. Gerar personalidade base
7. Gerar corpo / genética
8. Gerar posição provável
9. Aplicar influência cultural / regional (leve)
10. Aplicar influência da estrutura do clube
11. Aplicar influência dos olheiros
12. Gerar atributos atuais
13. Gerar potencial natural
14. Gerar potencial aproveitável
15. Gerar traços ocultos
16. Gerar riscos pessoais
17. Gerar relatório do olheiro com incerteza

### Regra de segurança da história de vida

A história de vida gera **tendência, nunca destino fixo**. Isso evita jogadores caricatos:

- passou fome ≠ automaticamente raçudo
- vida estável ≠ automaticamente menos guerreiro
- violência ≠ automaticamente forte
- nacionalidade ≠ personalidade
- pai falecido ≠ necessariamente instável

O correto: a história gera **probabilidades**; clube, suporte, treino, eventos e escolhas moldam o resultado.

### Incerteza no relatório do olheiro

Os atributos reais podem ser ocultos. O que o clube enxerga é uma estimativa com margem de erro, cuja precisão depende da qualidade do olheiro.

| Qualidade do olheiro | Estimativa de potencial |
|---|---|
| Olheiro ruim | "70 a 90" (faixa larga), risco emocional subestimado |
| Olheiro bom | "83 a 88" (faixa estreita), risco emocional detectado |

A incerteza vale para potencial, personalidade, risco de lesão, pressão familiar, disciplina, adaptação, valor real e mentalidade. A verdade aparece com o tempo.

### Exemplo completo end-to-end: Rafael Nascimento

Jogador gerado — Rafael Nascimento, 16 anos, origem no futebol de rua, família pobre com muita responsabilidade, posição inicial ponta, potencial natural 88.

| Atributo | Valor inicial |
|---|---|
| drible | 72 |
| velocidade | 68 |
| finalização | 48 |
| marcação | 32 |
| físico | 45 |
| tática | 38 |
| garra | 80 |
| pressão | 55 |

**Clube 1 — formador técnico (3 anos).** Treinos: técnica, passe curto, tomada de decisão, futsal/base integrada. Evolução: +drible, +passe, +visão, +controle, +criatividade. Novo perfil: **ponta criativo / meia aberto**.

**Clube 2 — físico/tático.** Treinos: pressão alta, resistência, recomposição, marcação. Evolução: +resistência, +marcação, +disciplina tática, +intensidade. Novo perfil: **ponta moderno, intenso, que ajuda defensivamente**.

> Resultado final: não virou só um driblador — virou um jogador completo por causa dos clubes e treinos. O mesmo atleta gerado, em clubes diferentes, teria terminado como perfis distintos.

> **Pendência:** a estrutura completa de safra (`YouthClass`) e o motor de geração por clube (`YouthGenerationEngine`) pertencem ao Sistema de Base/Clube; aqui documentamos apenas a geração individual do atleta. Verificar limite de escopo com o documento de base quando existir.

---

## 4. Talento e potencial em camadas

O potencial **não é um número único e fixo**. Ele se organiza em camadas:

- **Potencial Natural** — o teto bruto do jogador. Praticamente imutável (pode cair com lesões graves).
- **Potencial Aproveitável (Alcançado)** — quanto desse teto ainda pode ser efetivamente alcançado, dado o contexto de formação.
- **Potencial Funcional** — quanto ele rende em uma função específica; uma mudança de posição correta pode elevá-lo.

A boa formação sobe o potencial aproveitável; a má formação o desperdiça. Lesões graves derrubam o potencial físico; mentoria e psicologia podem elevar o potencial mental; a mudança de posição certa pode elevar o potencial funcional.

> Exemplo: jogador com potencial natural 82. No clube errado, rende como 68. No clube certo, atinge 82. Com mudança de posição perfeita, pode render como 86 naquela função.

### Inclinações naturais

Cada jogador nasce com inclinações que aceleram ou travam certos ganhos:

- aprende técnica rápido / devagar
- ganha físico fácil / difícil
- entende tática rápido / devagar
- evolui mentalmente com experiência
- responde bem / mal a pressão e a crítica
- corpo frágil ou explosão natural

O clube **ativa ou desperdiça** essas inclinações. Um jogador com inclinação técnica num clube técnico tem evolução técnica acelerada; o mesmo jogador num clube físico sem treino técnico desperdiça a inclinação.

> As fórmulas de ganho direcionado (`developmentGain = remainingPotential × trainingQuality × playerCompatibility × minutesFactor × ageFactor × personalityFactor × supportFactor × moraleFactor − penalidades`) estão em `../02-tecnico/05-catalogo-de-regras-e-formulas.md`.

---

## 5. Curvas de evolução por idade

O mesmo treino não tem o mesmo efeito em todas as idades. A idade define **que tipo** de evolução domina.

| Faixa etária | Evolução principal |
|---|---|
| 14–17 | técnica de base, físico inicial, formação da personalidade |
| 18–21 | explosão de potencial, adaptação profissional |
| 22–25 | consolidação técnica / tática / física |
| 26–29 | auge, regularidade, liderança |
| 30–33 | experiência, liderança, perda física gradual |
| 34+ | queda física, ganho mental / tático |

> Exemplo: treino de velocidade aos 18 pode gerar evolução alta. Aos 33, o mesmo treino serve mais para manutenção do que para ganho real.

---

## 6. Treino e direção da evolução

Cada treino empurra o jogador para um lado. As tabelas abaixo mapeiam treino → atributos evoluídos, agrupadas por área.

### Treinos técnicos

| Treino | Atributos que evoluem |
|---|---|
| Passe | passe curto, passe longo, visão |
| Finalização | chute, precisão, frieza |
| Drible | controle, agilidade, 1x1 |
| Cruzamento | bola aérea ofensiva, passe lateral |
| Bola parada | falta, escanteio, pênalti |
| Domínio | primeiro toque, controle sob pressão |

### Treinos físicos

| Treino | Atributos que evoluem |
|---|---|
| Força | força, duelos físicos |
| Velocidade | aceleração, pique |
| Resistência | fôlego, intensidade por 90 min |
| Explosão | arrancada, impulsão |
| Agilidade | mudança de direção |
| Prevenção | reduz lesão, aumenta longevidade |

### Treinos táticos

| Treino | Atributos que evoluem |
|---|---|
| Posicionamento | leitura, ocupação de espaço |
| Marcação | combate, interceptação |
| Compactação | organização coletiva |
| Pressão alta | intensidade, reação pós-perda |
| Saída de bola | passe sob pressão, tomada de decisão |
| Transição | velocidade mental, contra-ataque |

### Treinos mentais

| Treino | Atributos que evoluem |
|---|---|
| Psicologia | confiança, estabilidade, pressão |
| Liderança | comando, influência no grupo |
| Foco | concentração, regularidade |
| Disciplina | menos cartões, melhor rotina |
| Tomada de decisão | menos erros em lances críticos |
| Resiliência | reação após falha / gol sofrido |

### Trade-offs do desenvolvimento

Treino errado prejudica. O desenvolvimento tem custo de oportunidade:

- Jogador criativo em clube muito rígido: ganha disciplina tática, mas perde liberdade criativa, ousadia e drible espontâneo.
- Jogador leve com treino físico exagerado: ganha força, mas perde agilidade e aumenta risco de lesão.
- Jogador jovem em pressão extrema: ganha maturidade se resistir, mas perde confiança se sentir demais.

### Fórmula de evolução direcionada

O ganho em **cada atributo** é um produto de fatores multiplicativos menos penalidades. `baseLearningRate` (a capacidade de aprendizado do próprio jogador) e `focoDoTreino` (o quanto o treino aponta para aquele atributo específico) são **fatores distintos e próprios** — um jogador que aprende rápido num treino sem foco no atributo evolui pouco, e vice-versa.

```
Ganho em atributo =
    baseLearningRate        (capacidade de aprendizado do jogador)
  × potencialRestante
  × focoDoTreino            (foco do treino naquele atributo)
  × qualidadeDoTreino
  × compatibilidade
  × minutosCompetitivos
  × idadeFactor
  × moral
  − fadiga
  − lesão
  − pressãoNegativa
```

> Exemplo por atributo — **ganho em passe** = capacidade de aprendizado × potencial técnico restante × foco em passe × qualidade dos treinadores × compatibilidade com o estilo × minutos em função adequada.

### Compatibilidade jogador-clube

O ganho depende do encaixe. Compatibilidade = estilo do clube + função usada + personalidade + relação com técnico + suporte psicológico + adaptação cultural.

| Jogador | Clube | Resultado |
|---|---|---|
| Criativo livre | Ofensivo | evolui muito |
| Criativo livre | Rígido | pode perder ousadia |
| Jovem físico | Intenso | evolui rápido |
| Jovem físico | Técnico lento | pode estagnar |
| Ansioso | Pressionado | risco alto |
| Ansioso | Acolhedor | melhora mental |

### Tabela-resumo: o que puxa o jogador para cada direção

| Direção de evolução | Puxada por |
|---|---|
| Mais técnico | treinadores técnicos, futsal, posse, treino individual, campo bom |
| Mais físico | preparadores, nutrição, CT, liga intensa, treino de força |
| Mais tático | metodologia, técnico disciplinador, análise de desempenho |
| Mais mental | psicologia, liderança, jogos grandes, mentoria |
| Mais ofensivo | função avançada, treino de finalização, estilo atacante |
| Mais defensivo | treino de marcação, posição recuada, técnico defensivo |
| Mais criativo | liberdade, futsal, técnico ofensivo, confiança |
| Mais disciplinado | cultura forte, liderança, técnico exigente |
| Mais raçudo | jogos difíceis, torcida, história pessoal, rivalidades |
| Mais líder | experiência, capitania, mentoria, pressão superada |
| Mais instável | crise, pressão, falta de suporte, eventos traumáticos |
| Mais valorizado | seleção, títulos, clube forte, mídia, desempenho |

---

## 7. Marca de formação do clube (DevelopmentSignature)

Todo clube tem uma **identidade de desenvolvimento** que altera a evolução de todos os jogadores que passam por ele. Essa identidade é descrita por uma assinatura de desenvolvimento.

Campos conceituais da `DevelopmentSignature`:

- `technicalFocus`, `physicalFocus`, `tacticalFocus`, `mentalFocus` — foco de cada área
- `style` — estilo de jogo (ex.: posse de bola, transição rápida, pressão alta)
- `youthIntegration` — uso e integração de jovens
- `pressureLevel` — nível de pressão do ambiente
- `trainingQuality` — qualidade geral do treino
- `medicalSupport`, `nutritionSupport`, `psychologySupport` — suportes estruturais

> Exemplo: um clube com foco tático 90 faz os jogadores evoluírem mais em posicionamento, leitura de jogo, disciplina e organização. Mas, se o foco técnico for 40, drible e criatividade evoluem pouco.

Tipos de clube e a marca que deixam:

| Tipo de clube | Jogador tende a ganhar |
|---|---|
| Técnico | passe, domínio, visão, drible, criatividade |
| Físico | força, resistência, velocidade, intensidade |
| Tático | posicionamento, leitura, disciplina, organização |
| Copeiro | mentalidade, pressão, decisão, concentração |
| Formador | evolução equilibrada e profissionalismo |
| Ofensivo | finalização, movimentação, criatividade |
| Defensivo | marcação, antecipação, combate, posicionamento |
| Transição rápida | velocidade, aceleração, tomada de decisão |
| Posse de bola | passe curto, controle, paciência |
| Base forte | fundamentos e evolução sustentável |
| Instável | oscilação, pressão, possível perda de desenvolvimento |

> O schema exato da `DevelopmentSignature` (tipos e ranges) está em `../02-tecnico/02-modelo-de-dados.md`.

---

## 8. Histórico de desenvolvimento (PlayerDevelopmentHistory)

O histórico do jogador é **acumulativo**: cada passagem por um clube adiciona uma marca à carreira. O jogador carrega uma memória de desenvolvimento.

Cada entrada de `PlayerDevelopmentHistory` registra uma passagem e contém, conceitualmente:

- **Identificação da passagem**: `clubId`, número de temporadas, idade de início e fim.
- **Foco de treino recebido**: distribuição entre técnico, físico, tático, mental e (se aplicável) goleiro.
- **Contexto**: minutos jogados, ambiente de pressão, qualidade dos treinadores, qualidade das instalações, qualidade médica.
- **Efeitos de desenvolvimento**: atributos ganhos, traços ganhos, traços reduzidos, lesões sofridas, eventos psicológicos.

Esse histórico é o que permite que o jogador **mude de perfil ao longo da carreira** (ver seção 10) e é insumo direto do valor de mercado (ver seção 12).

> O schema completo de `PlayerDevelopmentHistory` está em `../02-tecnico/02-modelo-de-dados.md`.

---

## 9. Eventos de carreira

A evolução não vem só de treino. Eventos também mudam o rumo do jogador, alterando estados imediatamente e traços/atributos ao longo do tempo.

| Evento | Pode gerar |
|---|---|
| Lesão grave | perde velocidade, ganha maturidade |
| Mudança de posição | novos atributos evoluem |
| Técnico mentor | evolução acelerada |
| Temporada no banco | estagnação |
| Empréstimo bom | maturidade e minutos |
| Empréstimo ruim | queda de moral |
| Título importante | mentalidade vencedora |
| Falha traumática | instabilidade ou resiliência |
| Convocação para seleção | experiência, pressão, valor |
| Crítica da torcida | queda de confiança ou garra |
| Chegada de concorrente | motivação ou insatisfação |
| Contrato alto | estabilidade ou acomodação |
| Vida pessoal difícil | oscilação de desempenho |

Cada evento deve ter, além do fato em si: **intensidade, duração, alvo, origem, efeitos imediatos, efeitos futuros, chance de cascata e chance de reversão**. Os efeitos decaem com o tempo (curto: minutos/dias; médio: semanas; longo: temporada; histórico: vira tradição/memória).

> Exemplo: derrota em clássico com intensidade 80, duração emocional de 2 semanas, efeito imediato +pressão/-confiança, efeito futuro de aumentar a cobrança no próximo clássico. Se repetir, cria um tabu.

### Eventos de reversão

Todo evento negativo deveria ter **caminhos de recuperação**. O fluxo é: evento negativo → dano → decisão do clube → evento de recuperação ou de agravamento.

| Crise | Pode ser revertida por |
|---|---|
| Jogador vaiado | gol decisivo, apoio do técnico, torcida abraça |
| Técnico pressionado | vitória convincente, mudança tática |
| Jovem queimado | empréstimo bom, psicologia, gol importante |
| Mídia negativa | comunicação forte, sequência positiva |
| Lesão grave | bom médico, retorno planejado |
| Má fase | liderança, treino, adversário favorável |
| Torcida irritada | raça em campo, título, transparência |

---

## 10. Mudança de posição e perfil

Um jogador **não precisa permanecer igual ao que era na base**. O histórico de clubes e treinos transforma seu perfil e até sua posição.

Fórmula conceitual da nova função:

```
posição original + atributos desenvolvidos + necessidade do clube + visão do técnico = nova função possível
```

### Especialização em arquétipos

Além de evoluir números, o clube pode gerar arquétipos por caminhos de desenvolvimento:

| Caminho de desenvolvimento | Resultado provável |
|---|---|
| Meia + treino físico + marcação | Volante moderno |
| Ponta + treino de finalização | Segundo atacante |
| Lateral + treino defensivo | Lateral marcador |
| Lateral + treino ofensivo | Ala ofensivo |
| Zagueiro + saída de bola | Zagueiro construtor |
| Atacante + pressão alta | Atacante trabalhador |
| Volante + passe longo | Regista |
| Goleiro + jogo com os pés | Goleiro moderno / líbero |
| Goleiro + reflexo | Goleiro shot-stopper |
| Centroavante + pivô | Referência física |
| Centroavante + mobilidade | Atacante móvel |

> Exemplo de trajetória: um meia criativo e fraco fisicamente aos 17, após 3 anos em clube físico/tático, vira box-to-box (mais forte, marca mais, cria menos); depois de 2 anos com técnico ofensivo, vira meia avançado que finaliza e chega na área. O resultado não é só um driblador — é um jogador completo, moldado pelos clubes e treinos.

---

## 11. Reputação do clube formador

Quando jogadores passam por um clube e evoluem bem, o clube ganha **reputação específica** — não genérica.

- Clube revela muitos laterais bons → reputação de formar laterais.
- Clube melhora muitos jogadores físicos → reputação de preparação atlética.
- Clube recupera promessas perdidas → reputação de desenvolvimento.

Essa reputação é um ciclo de retroalimentação: ela **atrai mais talentos** (jovens querem ir para lá), o que dá aos olheiros mais material e valoriza o staff especializado (ex.: preparador de goleiros num clube que revela goleiros).

---

## 12. Impacto no valor de mercado

O histórico de desenvolvimento (seções 7–8) é uma das entradas do valor de mercado: um jogador formado em clube reconhecido, com metodologia forte e evolução constante, deve valer mais que outro de mesma nota atual com trajetória instável. A **contribuição específica deste sistema** ao preço são os fatores de formação e carreira:

- **reputação do clube formador** (ver seção 11);
- **histórico de evolução** — a trajetória acumulada em `PlayerDevelopmentHistory` (seção 8);
- **minutos jogados e competição disputada**;
- **seleção** e demais eventos de carreira;
- **personalidade e estabilidade** — a instabilidade derruba o valor.

> Exemplo: dois jogadores nota 70. O Jogador A foi formado em clube reconhecido, tem boa disciplina e evolução constante. O Jogador B passou por clubes instáveis, teve lesões e moral oscilante. O Jogador A vale mais, mesmo com a mesma nota atual.

> A **fórmula completa de valor de mercado** — com os fatores econômicos e de escassez (qualidade atual, potencial, fama, escassez de posição, interesse externo, risco de lesão, tempo de contrato, pressão financeira do clube) — é de responsabilidade da economia: ver [`./03-economia.md`](./03-economia.md#53-valor-de-mercado) (§5.3). Os coeficientes exatos de valuation ficam em `../02-tecnico/05-catalogo-de-regras-e-formulas.md`.

---

## 13. Memória do jogador e memória do clube

O jogo precisa de história. Isso exige que jogador e clube **lembrem** eventos importantes, e que essas memórias alterem reações futuras.

### Memória do jogador

O jogador carrega marcas da carreira que vão além dos atributos atuais:

- clubes por onde passou
- técnicos importantes
- lesões marcantes
- jogos decisivos
- falhas traumáticas
- títulos
- convocações
- conflitos
- mentorias
- posições treinadas
- pressão já enfrentada

Fluxo: evento importante → grava memória → memória altera reações futuras → reações futuras alteram a carreira.

> Exemplo: um jogador que já perdeu final nos pênaltis pode sentir mais uma nova decisão — ou pode ter desenvolvido resiliência. Um jogador maltratado pela torcida em outro clube pode ficar mais sensível a vaias.

### Memória do clube

O clube também lembra, e isso gera identidade:

- títulos conquistados e finais perdidas
- rebaixamentos e vexames
- ídolos e gerações da base
- crises políticas e rivalidades históricas
- estilo de jogo marcante e tradição por posição
- reputação formadora

> Exemplo: um clube que revelou muitos goleiros ganha reputação de formar goleiros, o que atrai jovens goleiros e valoriza o preparador de goleiros. Um clube que perdeu 3 finais seguidas acumula pressão em decisões, torcida ansiosa e narrativa de "time que pipoca".

Cada memória tem tipo, descrição, intensidade, temporada, duração (curta / média / longa / histórica) e efeitos sobre o futuro. Memórias históricas se convertem em tradição.

### As quatro variáveis institucionais

A memória do clube alimenta quatro variáveis que precisam ser **separadas**, porque mudam em velocidades diferentes:

| Variável | O que é | Muda rápido? | Exemplo |
|---|---|---|---|
| Momento | fase atual | Sim | 5 vitórias seguidas |
| Reputação | percepção atual do clube | Médio | clube respeitado nesta década |
| Tradição | peso histórico acumulado | Lento | muitos títulos antigos |
| Expectativa | o que esperam do clube agora | Médio/rápido | elenco caro precisa ganhar |

Fluxo ideal: resultado recente altera o **momento**; o momento altera **expectativa** e mídia; títulos recentes alteram a **reputação**; títulos acumulados alteram a **tradição**; investimento alto aumenta a **expectativa**, e expectativa alta aumenta a pressão.

> Exemplo: clube com tradição alta e momento ruim → torcida cobra muito, mídia compara com o passado. Clube sem tradição e momento ótimo → vira surpresa, ganha torcida e reputação. Clube rico sem tradição → tem pressão por investimento, mas pouca história.

---

## 14. Personalidade e decisões fora de campo

A personalidade (traços) e a vida fora de campo afetam diretamente o desempenho, através da cadeia traço → estado → desempenho descrita na seção 2.

Traços modificam **como** o jogador reage a um mesmo evento:

| Evento: torcida vaia | Reação por traço |
|---|---|
| "sensível a críticas" | pressão +10 |
| "raçudo" | pressão +3, garra +5 |
| "frio em decisão" | quase não sente |

### Suporte do clube ao atleta

Como a história de vida e a personalidade geram risco emocional, o clube pode reagir com estrutura de suporte: psicólogo, assistente social, mentor/veterano, diretor de base, coordenador de transição, nutricionista, médico, preparador físico, gestor de carreira e comunicação.

Fluxo: jogador tem risco emocional → clube identifica → oferece suporte → reduz instabilidade → aumenta o aproveitamento de potencial.

> Exemplo: jogador com origem difícil e pressão familiar alta, sem suporte, pode aceitar uma proposta cedo demais, oscilar e perder o foco. Com suporte, desenvolve estabilidade, melhora a carreira e pode virar líder.

### Pressão individual

Um jogador pode estar pressionado mesmo com o time indo bem — por contratação cara, estreia ruim, peso da camisa 10, ser filho de ídolo, promessa da base, convocação, falha em clássico ou pênalti perdido. A pressão individual afeta as decisões do jogador, altera o desempenho em lances e pode contaminar o time.

---

## 15. Backlog de gaps de design

Os vazios de design abaixo foram enumerados na fonte e permanecem em aberto. Cada um precisa de resolução própria antes de virar regra fechada.

> **Pendência:** Compatibilidade jogador-clube — formalizar o cálculo de encaixe (estilo do clube + posição + personalidade + pressão do ambiente + metodologia + técnico + idioma/cultura + necessidade de minutos) e como ele modula o ganho de desenvolvimento.

> **Pendência:** Empréstimos como ferramenta estratégica — tratar empréstimo como decisão de desenvolvimento, com variáveis do clube destino (nível da liga, minutos esperados, posição de uso, pressão local, qualidade do técnico, estrutura médica, estilo, distância cultural, torcida, visibilidade) e retornos "melhor/igual/pior".

> **Pendência:** Clima do vestiário — definir um índice de vestiário (moral do elenco + confiança no técnico + liderança interna + satisfação contratual + distribuição de minutos + estabilidade política − panelas − conflitos − salários atrasados − promessas quebradas) e seus efeitos coletivos.

> **Pendência:** Identidade tática do clube separada do técnico — modelar a cultura tática que sobrevive à troca de treinador e o custo de encaixe quando o clube muda de filosofia.

> **Pendência:** Estilo individual do jogador — além de posição, dar função e estilo (ex.: zagueiro construtor / marcador / cobertura / líder / físico; volante destruidor / organizador / box-to-box / regista; atacante pivô / móvel / finalizador / pressionador).

> **Pendência:** Estados por setor na partida — modelar estado ofensivo, defensivo e de meio separadamente, com contágio entre setores (ex.: goleiro falha → confiança defensiva cai → saída de bola piora).

> **Pendência:** Relações entre jogadores — entrosamento entre zagueiros, conexão lateral-ponta, dupla de volantes, meia-atacante, goleiro-defesa, liderança do capitão sobre jovens, e seus impactos em partida e vestiário.

> **Pendência:** Riscos ocultos — atributos e riscos que só aparecem depois (ego alto não percebido, risco físico oculto, pressão familiar por dinheiro, empresário agressivo, saudade, não adaptação à cidade).

> **Pendência:** Visibilidade e incerteza do scout — formalizar o `ScoutReport` com faixas estimadas, confiança, traços visíveis, riscos ocultos detectados e uma recomendação (contratar / monitorar / evitar / emprestar), e como a verdade se revela com o tempo.

> **Pendência:** Aproveitamento de potencial — consolidar as três camadas (natural, aproveitável, funcional) num único sistema de cálculo com fatores de formação, minutos, suporte e penalidades.

> **Pendência:** Empresário do jogador — influência sobre o jogador, agressividade na negociação, busca por comissão, relação com a diretoria, reputação no mercado e eventos (pressiona renovação, vaza proposta, força saída, acalma jogador, cria crise).

> **Pendência:** Contratos que impactam moral e desempenho — modelar salário, tempo, multa, promessas, bônus, status no elenco, cláusulas e promessa de titularidade/liberação, com eventos de valorização, acomodação e último ano de contrato.

> **Pendência:** Sistema de seleção como ciclo completo — convocação, decisão do clube (liberar/vetar/negociar), reação do jogador, desempenho externo, estados de retorno e a relação clube-seleção (confiança médica, histórico de liberação/lesão, prestígio, força da federação).

> **Pendência:** Eventos com duração, intensidade, decaimento e cascata — padronizar a estrutura de evento (intensidade, duração, alvo, origem, efeitos imediatos/futuros, cascata, reversão) e as curvas de decaimento.

> **Pendência:** Eventos de reversão — catálogo de caminhos de recuperação para cada tipo de crise (jogador vaiado, técnico pressionado, jovem queimado, mídia negativa, lesão grave, má fase, torcida irritada).

> **Pendência:** Rivalidade dinâmica — rivalidades que crescem com finais, disputas por título, transferências polêmicas, provocações, goleadas e brigas de torcida, elevando a pressão de jogos futuros.

> **Pendência:** Ecossistema da liga — nível técnico, premiação, visibilidade, calendário, arbitragem, regras financeiras, força comercial e exposição internacional, e seu impacto no crescimento do clube e na valorização dos jogadores.

> **Pendência:** Competição por talentos — outros clubes disputando o mesmo jovem, com decisão influenciada por chance de jogar, estrutura da base, reputação formadora, salário/ajuda, distância da família, ídolos, pressão familiar e empresário.

> **Pendência:** Custo de manutenção da grandeza e freios de bola de neve — crescimento que aumenta salários, expectativa, custo operacional, pressão e risco financeiro, para evitar snowball infinito.

> **Pendência:** Qualidade do treinamento por área — separar treino técnico, físico, tático, mental, de goleiros, de bola parada, individual, coletivo, de transição, de finalização e defensivo, com resposta individual diferente por jogador.

> **Pendência:** Especialização da base por posição — clubes que formam melhor certos perfis (goleiros, laterais, pontas, volantes, zagueiros, meias criativos) conforme preparador específico + metodologia + histórico.

> **Pendência:** Reputação, tradição, momento e expectativa como variáveis separadas — quatro eixos com velocidades de mudança distintas e seus fluxos (resultado → momento; títulos recentes → reputação; títulos acumulados → tradição; investimento → expectativa → pressão).

> **Pendência:** Qualidade da decisão da diretoria — eficiência de gestão (planejamento + scout + governança + estabilidade + conhecimento esportivo + negociação − política interna − decisões emocionais − pressão externa) modulando o retorno do investimento.

> **Pendência:** Jogadores como ativos múltiplos — modelar o atleta como ativo esportivo, financeiro, emocional, de marca, de tradição e de torcida (ex.: vender um ídolo pode melhorar o caixa mas destruir moral e identidade).

> **Pendência:** Papéis internos do clube — diretor de base, coordenador de transição, gerente de elenco, analista de mercado, responsável por contratos, psicólogo da base, head de performance, coordenador médico, diretor de metodologia, entre outros.

> **Pendência:** Linha do tempo da temporada — encaixar todos os eventos em ciclos (diário, semanal, mensal, janela, temporada, multitemporada) para que não fiquem soltos.

> **Pendência:** Narrativa gerada — transformar eventos e memórias em texto narrativo por jogador, para reforçar a imersão de "cada atleta tem uma carreira própria".
