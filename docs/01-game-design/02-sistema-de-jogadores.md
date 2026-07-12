# Sistema de Jogadores

> **Status:** Rascunho consolidado · **Fontes:** chats/lista-envolvidos-jogo.md, chats/escopo-definitivo-simulador.md · **Revisão:** 2026-07-11

## Resumo

O Sistema de Jogadores é o núcleo do **Grinta**. Ao contrário de managers clássicos como o Brasfoot, onde o atleta carrega atributos essencialmente fixos, aqui o jogador **nasce com uma tendência, não com um destino fixo**. Ele começa com uma base, um talento natural e um potencial, mas os clubes por onde passa, a metodologia de treino, os minutos jogados e os eventos de carreira empurram seus atributos para direções específicas. Dois jogadores gerados com o mesmo potencial podem terminar a carreira como atletas completamente diferentes.

Este documento consolida o modelo conceitual do jogador: a fórmula de identidade, a separação entre atributo, estado e traço (com a **lista canônica de atributos** na §2), a geração inicial, o sistema de potencial em camadas, as tabelas de treino e evolução, a memória acumulativa de jogador e clube, e o papel da personalidade. Ao final, a §18 fecha os vazios de design que a fonte enumerava — consolidando-os em seções existentes, especificando-os como subsistemas, deferindo-os ao documento dono ou promovendo-os a recomendações a ratificar.

> As fórmulas exatas e as definições de schema (tipos, campos, ranges) vivem em `../02-tecnico/02-modelo-de-dados.md` e `../02-tecnico/05-catalogo-de-regras-e-formulas.md`. Aqui tratamos apenas do conceito de design.

## Sumário

1. [Fórmula conceitual do jogador](#1-fórmula-conceitual-do-jogador)
2. [Atributo, estado e traço](#2-atributo-estado-e-traço)
3. [Geração de jogadores](#3-geração-de-jogadores)
4. [Talento e potencial em camadas](#4-talento-e-potencial-em-camadas)
5. [Curvas de evolução por idade](#5-curvas-de-evolução-por-idade)
6. [Treino e direção da evolução](#6-treino-e-direção-da-evolução)
7. [Marca de formação do clube (DevelopmentSignature)](#7-marca-de-formação-do-clube-developmentsignature)
8. [Histórico de desenvolvimento (PlayerDevelopmentHistory)](#8-histórico-de-desenvolvimento-playerdevelopmenthistory)
9. [Eventos de carreira](#9-eventos-de-carreira)
10. [Mudança de posição e perfil](#10-mudança-de-posição-e-perfil)
11. [Reputação do clube formador](#11-reputação-do-clube-formador)
12. [Impacto no valor de mercado](#12-impacto-no-valor-de-mercado)
13. [Memória do jogador e memória do clube](#13-memória-do-jogador-e-memória-do-clube)
14. [Personalidade e decisões fora de campo](#14-personalidade-e-decisões-fora-de-campo)
15. [Elenco como grupo social](#15-elenco-como-grupo-social)
16. [Medicina, saúde e recuperação](#16-medicina-saúde-e-recuperação)
17. [Ciclo de vida do jogador: aposentadoria, funcionário e proteção de menores](#17-ciclo-de-vida-do-jogador-aposentadoria-funcionário-e-proteção-de-menores)
18. [Subsistemas complementares e recomendações a ratificar](#18-subsistemas-complementares-e-recomendações-a-ratificar)

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

### Lista canônica de atributos, estados e traços

Esta subseção é a **fonte única** da lista de atributos do jogador. O overview [`00-gdd-overview.md`](./00-gdd-overview.md) (§7) e a IA de comportamento [`07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) (§3.4) apenas **referenciam** esta lista — não mantêm listas próprias. Ela unifica as três listas que antes divergiam.

> **Escala canônica: 0–100** para todo atributo, estado, traço e score de jogador no Grinta. É a escala já dominante no corpus (exemplos de geração nesta seção e na §3, pesos e scores da IA em [`07-inteligencia-artificial.md`](./07-inteligencia-artificial.md), telas de [`../04-ui-ux/`](../04-ui-ux/)) e vale para todos os módulos. Quando um módulo usa outra faixa por conveniência (ex.: energia/fadiga em %), ele **converte** a partir de 0–100, nunca redefine a escala. Os tipos e ranges de schema ficam em [`../02-tecnico/02-modelo-de-dados.md`](../02-tecnico/02-modelo-de-dados.md).

**Atributos técnicos (0–100)** — estruturais; evoluem pelos treinos técnicos da §6:
finalização, chute de longe, passe curto, passe longo (lançamento), cruzamento, drible, controle de bola (domínio / primeiro toque), marcação, desarme, cabeceio, bola parada (falta / escanteio / pênalti), visão de jogo.

**Atributos físicos (0–100)** — evoluem pelos treinos físicos da §6:
velocidade, aceleração, força, resistência, impulsão, agilidade, equilíbrio, explosão, recuperação física.

**Atributos mentais (0–100)** — características mentais **estruturais** (mudam devagar), evoluídas pelos treinos mentais e táticos da §6:
inteligência tática (leitura de jogo / posicionamento), tomada de decisão, concentração / foco, disciplina, frieza, determinação / garra, liderança, regularidade, coragem, resiliência.

**Atributos de goleiro (0–100)** — grid próprio do goleiro, somado aos atributos físicos e mentais comuns:
reflexos, posicionamento de gol, saída de gol (domínio de área / cruzamentos), reposição com os pés, jogo aéreo, um-contra-um, defesa de pênalti, comando de área / comunicação.

**Overall / média** é **derivado**, não armazenado como atributo: é a média ponderada do grid conforme a posição e a função (§10). Os pesos de agregação por posição são decisão de balanceamento — ver **R-09** (§18.3).

#### Atributos mentais ≠ traços de personalidade

Esta é a reconciliação central das três listas. O que [`07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) §3.4 chamava de "atributos mentais" (ambição, lealdade, profissionalismo, temperamento, ganância, ego, adaptação) **não** integra o grid 0–100: são **traços de personalidade** (categoria "Traço" acima), que carregam intensidade e visibilidade e alimentam a IA de comportamento — não são notas que sobem com treino. Da mesma forma, "pressão emocional", que [`00-gdd-overview.md`](./00-gdd-overview.md) §7 listava entre os mentais, é um **estado**, não um atributo.

- **Traços canônicos de personalidade** (cada um com intensidade 0–100 + visibilidade `visível` / `detectado por scout` / `oculto`): ambição, lealdade, profissionalismo, temperamento, ganância, ego, adaptabilidade — mais os traços comportamentais da §14 (raçudo, frio em decisão, instável emocionalmente, influenciável, sensível a críticas, profissional exemplar). `disciplina`, `liderança` e `resiliência` existem **como atributo mental** (nota que evolui com treino) e podem ter um **traço correlato** de tendência estável (ex.: "líder nato", "indisciplinado", "resiliente") — são planos distintos, não duplicação.
- **Estados canônicos** (temporários, 0–100; §2, categoria "Estado"): moral, fadiga, confiança, pressão (emocional), motivação, forma recente, ansiedade, foco do jogo.

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

> **Fronteira de escopo:** a estrutura completa de safra (`YouthClass`) e o motor de geração por clube (`YouthGenerationEngine`) pertencem ao Sistema de Base/Clube; este documento é dono apenas da **geração individual** do atleta descrita acima. A competição por um mesmo jovem entre clubes (ver §18.4) e a especialização da base por posição (§11) também são resolvidas no documento de base, consumindo os fatores definidos aqui.

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

## 15. Elenco como grupo social

O elenco não é uma lista de jogadores — é um **grupo social** com estrutura própria. Ele possui hierarquia, lideranças, grupos, relações, papéis, expectativas, conflitos, mentorias e cultura. Essas dinâmicas afetam moral, integração e desempenho tanto quanto os atributos individuais das seções anteriores.

### Papel no elenco

Cada jogador tem um papel esperado dentro do grupo:

- jogador-chave
- titular
- rotação
- reserva
- desenvolvimento
- liderança
- mentor

O papel deve ser **coerente com contrato, comunicação e utilização real**. Um jogador tratado como reserva mas remunerado e comunicado como estrela gera incoerência e tensão.

### Promessas

Promessas feitas ao jogador podem envolver: minutos, posição, papel, renovação, transferência, reforços, competição e desenvolvimento.

Cada promessa carrega **prazo, contexto e estado**. Ponto central do modelo: uma promessa que se tornou impossível por **evento externo** (uma lesão de outro atleta, uma janela frustrada, uma mudança de calendário) pode ser **renegociada** e **não é tratada automaticamente como quebra deliberada** — a intenção e o contexto importam, não apenas o resultado.

### Liderança formal e informal

O clube pode definir uma estrutura de liderança:

- capitão
- vice-capitão
- conselho de jogadores
- líderes informais
- mentores

A liderança depende de personalidade, tempo de casa, reputação, relação e comportamento — **não apenas de atributo técnico**. Ela dialoga com o traço "líder natural" (seção 2) e com o treino de liderança e mentoria (seção 6).

### Grupos e relações

Jogadores podem formar grupos por: idioma, nacionalidade, idade, formação, tempo de clube, amizade e função.

Grupos podem **ajudar a integração ou gerar divisão**. O sistema **não trata toda afinidade como problema**: um grupo por idioma pode acolher um estrangeiro recém-chegado tanto quanto isolar-se do resto do elenco.

### Conflitos

Conflitos podem surgir por: disputa de posição, promessa quebrada, declaração pública, diferença salarial percebida, liderança, transferência, conduta e falta de minutos.

Diante de um conflito, o usuário pode **conversar, mediar, alterar papéis ou aceitar as consequências**.

### Jogadores insatisfeitos

A insatisfação pode produzir: queda de moral, pedido de conversa, pedido de saída, menor disposição para renovar, influência sobre o grupo e reação pública.

Regra: a insatisfação **não causa perda técnica instantânea obrigatória**, mas afeta comportamento e ambiente ao longo do tempo.

### Integração de novos jogadores

Um recém-chegado precisa se adaptar a: clube, cidade, idioma, tática, grupo, treino e expectativa. Pré-temporada, líderes, compatriotas e funcionários podem acelerar essa adaptação.

### Jovens no elenco principal

A promoção de um jovem ao elenco principal deve considerar: nível atual, potencial, minutos disponíveis, ambiente, treino, proteção física, papel e pressão.

Regra dupla: **promover não garante desenvolvimento**, e **manter um jovem sem jogar pode prejudicar sua trajetória** (ver seção 9 — temporada no banco tende à estagnação).

> A moral coletiva do elenco emerge das morais individuais e do ambiente. O **índice de clima de vestiário** (`LockerRoomClimate`) e o **sistema de relações/química entre jogadores** (`PlayerChemistry`) estão especificados na §18.2, com seus valores propostos em R-03 e R-07.

---

## 16. Medicina, saúde e recuperação

A saúde do jogador é um subsistema próprio: existe um **estado médico real**, gerido pela comissão médica, que interage com carga, fadiga e decisões de uso ao longo da carreira.

### Estado médico

Cada jogador pode possuir: condição geral, fadiga, dor, lesão, restrição, tratamento, reabilitação e processo de retorno.

### Risco de lesão

O risco de lesão depende de: carga, fadiga, histórico, perfil físico, idade, condição do gramado, contato, clima, qualidade preventiva e decisões de uso.

Regra: uma lesão **não é um evento totalmente independente das decisões anteriores**. Sobrecarga e uso de jogador fatigado elevam a probabilidade — o que conecta a medicina ao treino de prevenção (seção 6).

### Diagnóstico

A equipe médica trabalha com: suspeita inicial, exames, diagnóstico, gravidade, faixa de recuperação e risco de retorno. A estimativa **pode mudar com novas informações**.

### Confidencialidade médica

O conhecimento sobre o estado do jogador se distribui em **quatro camadas distintas**, que não coincidem — o mesmo princípio de informação assimétrica da seção 3:

| Camada | O que enxerga |
|---|---|
| Diagnóstico real | a verdade clínica do estado do jogador |
| Comissão técnica | o que a equipe médica reporta internamente |
| Comunicação pública | o que é oficialmente divulgado |
| Outros clubes | o que o mercado consegue inferir |

### Tratamento

Cada tratamento possui: objetivo, duração, custo, responsável, risco, alternativas e impacto na carreira.

### Reabilitação progressiva (7 estágios)

A reabilitação é progressiva e ordenada, do controle da dor até a volta à competição:

1. Controle da dor
2. Recuperação de movimento
3. Fortalecimento
4. Treino individual
5. Treino parcial
6. Treino completo
7. Liberação competitiva

### Retorno ao jogo ≠ liberação médica

A liberação médica **não garante ritmo nem confiança**. O retorno considera: risco, condição, carga, minutos previstos, importância da partida, recomendação médica e decisão esportiva.

O usuário pode **assumir risco dentro de seus limites**, mas a **consequência é real** — forçar um retorno precoce pode gerar recaída (ver seção 9, cadeia de eventos e reversão).

### Dor e fadiga sem lesão

Um jogador pode estar disponível e ainda assim apresentar: dor leve, fadiga acumulada, risco aumentado e necessidade de limite de minutos — mesmo sem uma lesão diagnosticada.

### Responsabilidade médica em empréstimo

Lesões durante um empréstimo exigem definir: **quem trata**, **quem paga**, **onde ocorre a reabilitação**, **como o clube de origem recebe informações** e **o que acontece no retorno**. Esse ponto se articula com o tratamento de empréstimo como ferramenta estratégica (ver seção 18).

### Continuidade sazonal

Lesões e tratamentos **não desaparecem na virada de temporada**. Um jogador lesionado continua o mesmo processo normalmente na temporada seguinte.

---

## 17. Ciclo de vida do jogador: aposentadoria, funcionário e proteção de menores

O jogador é uma **pessoa persistente** dentro do mundo, com início, meio e fim de carreira. Esta seção fecha o ciclo de vida: a passagem de atleta a funcionário, o encerramento da carreira e as regras específicas para menores.

### Pessoa e carreira: o jogador vira funcionário

O jogador é uma pessoa persistente. Após encerrar a carreira, ele pode futuramente **tornar-se funcionário** (técnico, olheiro, dirigente, etc.), **mantendo a mesma identidade e história**. Ele não é descartado nem substituído por um novo registro: carrega a sua memória de jogador (seção 13) para o novo papel.

### Aposentadoria contextual

A aposentadoria **não é definida apenas por idade**. Ela é **contextual** e considera: idade, condição física, lesões, motivação, contrato, papel, família, propostas e objetivos pessoais.

Jogadores da mesma idade podem decidir de forma diferente. A aposentadoria pode estar em um destes estados:

- considerada
- anunciada
- adiada
- confirmada
- imposta por decisão médica excepcional

### Aposentadoria médica

Uma lesão grave **não encerra automaticamente** a carreira. A aposentadoria médica exige **avaliação, diagnóstico, risco e confirmação** (articula-se com o subsistema de medicina, seção 16).

### Proteção de menores

O jogo trata menores com regras próprias:

- regras de movimentação
- responsabilidade institucional
- alojamento adequado quando necessário
- educação abstrata
- privacidade
- limites de carga

Essas proteções dialogam com a promoção de jovens ao elenco principal (seção 15) e com a proteção física no desenvolvimento.

### Geração ≠ promoção

Geração e promoção são **processos diferentes**. Surgir no mundo (geração) não é o mesmo que ser promovido ao elenco principal — um jogador pode existir na base por anos antes de chegar ao profissional.

Um jovem não promovido pode: permanecer na base, ser emprestado, mudar de clube, ser liberado, ou encerrar a busca por uma carreira profissional.

> **Fronteira de escopo:** a transição de jogador para funcionário (técnico, olheiro, dirigente) e o schema de papéis de staff pertencem ao Sistema de Clube/Funcionários ([`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md)). Este documento é dono apenas da **regra de persistência de identidade**: a pessoa e sua memória de jogador (§13) sobrevivem à mudança de papel (pessoa ≠ carreira, conforme as regras transversais do overview).

---

## 18. Subsistemas complementares e recomendações a ratificar

Os vazios de design enumerados na fonte são fechados aqui por quatro caminhos: **(18.1)** consolidados quando já cobertos por outra seção; **(18.2)** especificados como subsistema (entidade/estado) próprio do jogador; **(18.3)** promovidos a **Recomendação (a ratificar — R-XX)** quando dependiam de um valor de balanceamento ou de uma decisão de produto; **(18.4)** deferidos ao documento dono quando o assunto não é do sistema de jogadores. Nenhum permanece como pendência aberta.

### 18.1. Gaps já cobertos por outras seções

- **Aproveitamento de potencial (camada única de cálculo).** O sistema único já existe: as três camadas da §4 (natural → aproveitável → funcional) alimentam a fórmula de `developmentGain` da §6, com fatores de formação, minutos, suporte e penalidades; os coeficientes numéricos vivem em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).
- **Eventos de reversão.** O catálogo de caminhos de recuperação por tipo de crise já está na §9 ("Eventos de reversão", tabela Crise → revertida por).
- **Reputação, tradição, momento e expectativa como variáveis separadas.** Já separadas na §13 ("As quatro variáveis institucionais"), com velocidades de mudança e fluxos.
- **Especialização da base por posição.** É o lado-clube da §11 (reputação específica por posição) somado à `DevelopmentSignature` da §7; o motor de safra que a produz pertence ao documento de base (fronteira de escopo na §3).
- **Qualidade do treinamento por área.** A taxonomia de treino está na §6 (técnico / físico / tático / mental), à qual se soma o **treino de goleiro** (reflexos, saída, reposição, jogo aéreo, um-contra-um, defesa de pênalti). A "resposta individual diferente por jogador" é o `baseLearningRate` já definido na fórmula da §6.

### 18.2. Subsistemas especificados (entidades e estados)

**Função e estilo individual do jogador.** Além da posição, o jogador tem uma **função** e um **estilo** — os arquétipos da §10 elevados a atributo estrutural. Enumeração canônica por linha: goleiro (`clássico` / `líbero` / `shot-stopper`); zagueiro (`construtor` / `marcador` / `cobertura` / `líder` / `físico`); lateral (`marcador` / `ala ofensivo` / `construtor`); volante (`destruidor` / `organizador` / `box-to-box` / `regista`); meia (`criativo` / `avançado` / `chegador`); ponta (`driblador` / `finalizador` / `trabalhador`); atacante (`pivô` / `móvel` / `finalizador` / `pressionador`). A função é resultado do histórico de desenvolvimento (§8, §10), não fixa no nascimento.

**`ScoutReport` (visibilidade e incerteza).** O que o clube enxerga de um alvo é um relatório, não a verdade (§3). Campos conceituais: `targetPlayerId`, `scoutId` e `scoutQuality`; `estimatedAttributes` como **faixas** (mín–máx, não valor exato); `estimatedPotential` como faixa; `confidence` (0–100); `visibleTraits` e `detectedHiddenRisks`; `recommendation` ∈ {`CONTRATAR`, `MONITORAR`, `EVITAR`, `EMPRESTAR`}. A largura das faixas cai com a qualidade do olheiro e a verdade converge com o tempo de observação — valores em **R-04**. Coerente com a regra transversal "informação incompleta nunca vira zero" do overview.

**Riscos ocultos.** Não são uma categoria nova: são **traços e riscos com visibilidade `oculto`** (§2), gerados na §3 (passos 15–16) e só revelados com o tempo ou por bom scout — ego alto não percebido, risco físico oculto, pressão familiar por dinheiro, empresário agressivo, saudade, não adaptação à cidade. Entram no `ScoutReport` como `detectedHiddenRisks` apenas quando o olheiro é bom o bastante.

**Empréstimo (`LoanSpell`) como ferramenta de desenvolvimento.** Empréstimo é decisão de desenvolvimento, não só de mercado. Campos do destino: `leagueLevel`, `expectedMinutes`, `usePosition`, `localPressure`, `coachQuality`, `medicalStructure`, `style`, `culturalDistance`, `fanbase`, `visibility`. O retorno é classificado como **melhor / igual / pior** que a saída, conforme minutos reais × qualidade da formação recebida — limiares em **R-05**. A responsabilidade médica durante o empréstimo segue a §16 (quem trata, quem paga, onde reabilita, como o clube de origem é informado).

**Empresário (`Agent`).** Entidade que influencia o jogador e a negociação. Campos: `influenceOverPlayer` (0–100), `aggressiveness` (0–100), `commissionDrive` (0–100), `boardRelationship`, `marketReputation`. Gatilhos de evento (§9): `PRESSIONA_RENOVACAO`, `VAZA_PROPOSTA`, `FORCA_SAIDA`, `ACALMA_JOGADOR`, `CRIA_CRISE`. A matemática de comissão e de contrato é da economia ([`./03-economia.md`](./03-economia.md)); aqui trata-se do **efeito do empresário sobre o jogador**. Parâmetros de influência e limiares de gatilho em **R-08**.

**Clima de vestiário (`LockerRoomClimate`) — estado coletivo.** Estado do elenco (§15), 0–100, derivado de: moral do elenco, confiança no técnico (`CoachTrust`), liderança interna, satisfação contratual, distribuição de minutos e estabilidade política, **menos** panelas, conflitos, salários atrasados e promessas quebradas. Modula moral individual, integração e desempenho coletivo. Pesos do índice em **R-03**.

**Química / entrosamento (`PlayerChemistry`) — relações entre jogadores.** Grafo de relações entre pares do elenco (§15), cada aresta com `type` (dupla de zagueiros, lateral-ponta, dupla de volantes, meia-atacante, goleiro-defesa, mentoria capitão→jovem) e `strength` (0–100). Cresce com minutos jogados juntos, idioma/afinidade e mentoria; afeta partida (entrosamento setorial) e vestiário. Magnitude dos efeitos em **R-07**.

**Contratos — lado do jogador.** A entidade `Contract` (salário, tempo, multa, bônus, cláusulas, status prometido, empresário) é da economia ([`./03-economia.md`](./03-economia.md); overview §11). Este documento é dono do **efeito do contrato sobre o jogador**: a `satisfação contratual` (estado), o cumprimento/quebra de promessa de titularidade/liberação que altera moral (§15), e os eventos de carreira de valorização, acomodação e "último ano de contrato" (§9).

**Ciclo de seleção — lado do jogador.** O ciclo completo (convocação, relação clube-seleção, prestígio, força da federação, calendário) é de [`./12-selecoes-e-calendario-internacional.md`](./12-selecoes-e-calendario-internacional.md). Aqui ficam os **estados do jogador**: `convocado`, a decisão do clube (`liberado` / `vetado` / `negociado`), a reação do jogador, o desempenho externo e o `estado de retorno` (cansaço, moral, lesão), que alimentam a memória do jogador (§13) e a confiança médica clube-seleção.

**Jogador como ativo múltiplo.** Princípio de design: o atleta tem valor em **seis dimensões** — esportivo, financeiro, emocional, de marca, de tradição e de torcida. Vender um ídolo pode melhorar o caixa e destruir moral e identidade ao mesmo tempo. Conecta o valor de mercado (§12), a memória do clube (§13, ídolos) e a economia; nenhuma decisão sobre o jogador deve olhar só a dimensão financeira.

### 18.3. Recomendações a ratificar (Série R)

> **Recomendação (a ratificar — [R-02](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)):** modelar a **compatibilidade jogador-clube** como fator multiplicativo `playerCompatibility` (0–1) da fórmula de desenvolvimento (§6), média ponderada proposta de: estilo do clube ×0,25, função/posição usada ×0,20, personalidade/traços ×0,15, pressão do ambiente ×0,10, metodologia/qualidade de treino ×0,15, relação com o técnico ×0,10, idioma/cultura ×0,05. Racional: consolida os fatores qualitativos já listados na §6 num único multiplicador auditável, com o encaixe de estilo e de função dominando o ganho.

> **Recomendação (a ratificar — [R-03](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)):** fixar o índice `LockerRoomClimate` (0–100) como `0,30·moral + 0,20·CoachTrust + 0,15·liderança interna + 0,15·satisfação contratual + 0,10·distribuição de minutos + 0,10·estabilidade política − penalidades (panelas, conflitos, salários atrasados, promessas quebradas, até −40 somadas)`. Racional: moral e confiança no técnico devem dominar, e as penalidades precisam de teto para não zerar o clima com um único evento.

> **Recomendação (a ratificar — [R-04](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)):** definir as bandas de incerteza do `ScoutReport` por qualidade do olheiro: olheiro ruim → faixa de ±10 sobre o atributo real e `confidence ≤ 40`; olheiro bom → faixa de ±3 e `confidence ≥ 80`; a faixa estreita ~30% a cada ciclo de observação continuada. Racional: reproduz o exemplo "70–90" vs "83–88" da §3 como regra, mantendo a informação sempre como faixa, nunca como zero.

> **Recomendação (a ratificar — [R-05](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)):** classificar o retorno de um `LoanSpell` por `scoreEmprestimo = minutosReais% × qualidadeFormaçãoRecebida (compatibilidade R-02)`: **melhor** se `≥ 0,60`, **igual** se `0,30–0,60`, **pior** se `< 0,30` (ou lesão grave / moral despencada). Racional: liga o resultado do empréstimo aos mesmos fatores de desenvolvimento do resto do sistema, evitando um modelo paralelo.

> **Recomendação (a ratificar — [R-06](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)):** padronizar o `CareerEvent` com os campos já listados na §9 (intensidade, duração, alvo, origem, efeitos imediatos/futuros, chance de cascata, chance de reversão) e curvas de decaimento por faixa: curto (meia-vida ~3 dias), médio (~3 semanas), longo (~1 temporada), histórico (não decai — vira tradição, §13). Racional: fixa uma única estrutura de evento reutilizável e dá meias-vidas concretas às quatro durações que a §9 já nomeia.

> **Recomendação (a ratificar — [R-07](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)):** dimensionar a `PlayerChemistry`: cada aresta soma até **±8** ao desempenho setorial em partida (dupla entrosada vs. recém-formada) e cresce ~2/temporada de minutos juntos, com bônus de mentoria capitão→jovem acelerando a evolução mental do jovem. Racional: efeito perceptível mas não dominante frente aos atributos individuais, coerente com "relações afetam moral e desempenho tanto quanto atributos" (§15) sem sobrepujá-los.

> **Recomendação (a ratificar — [R-08](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)):** parametrizar o `Agent`: gatilho de evento dispara quando `aggressiveness + commissionDrive − boardRelationship > 120` diante de proposta externa ou último ano de contrato; `influenceOverPlayer` pondera o quanto o empresário desloca a decisão do jogador (0 = ignora, 100 = decide por ele). Racional: torna o empresário um ator com peso calibrável nos eventos de renovação/saída sem reescrever a economia de contratos.

> **Recomendação (a ratificar — [R-09](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)):** definir os **pesos de agregação do `overall` por posição** sobre o grid canônico da §2 (ex.: atacante = 0,45 técnico + 0,20 físico + 0,20 mental + 0,15 finalização-específica; goleiro = 0,60 grid de goleiro + 0,25 mental + 0,15 físico). Racional: o corpus usa "overall/nota" (overview §10, IA) sem definir a fórmula; ancorar os pesos na posição impede que um atributo irrelevante para a função infle a nota.

### 18.4. Gaps que pertencem a outros documentos (fronteira de escopo)

Estes assuntos não são do sistema de jogadores; ficam registrados com o dono e o gancho do lado-jogador.

- **Identidade tática do clube separada do técnico** → [`./05-motor-de-partida.md`](./05-motor-de-partida.md) e o documento de clube/tática. O lado-jogador é o **custo de encaixe** quando o clube muda de filosofia — a compatibilidade de R-02.
- **Estados por setor na partida** (ofensivo / defensivo / meio, com contágio "goleiro falha → confiança defensiva cai") → estado de partida do [`./05-motor-de-partida.md`](./05-motor-de-partida.md); o insumo deste documento é a `confiança` individual (§2) e a `PlayerChemistry` setorial (§18.2).
- **Rivalidade dinâmica** → [`./11-torcida-imprensa-e-narrativa.md`](./11-torcida-imprensa-e-narrativa.md) e mundo persistente; o lado-jogador é a pressão elevada de clássicos, via memória de jogador e clube (§9, §13).
- **Ecossistema da liga** (nível técnico, premiação, arbitragem, exposição) → [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md) + [`./03-economia.md`](./03-economia.md) + [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md); impacta a valorização dos jogadores (§12) como entrada externa.
- **Competição por talentos** (vários clubes disputando o mesmo jovem) → documento de base/clube (fronteira de escopo na §3); os fatores de decisão cruzam o `ScoutReport` (R-04) e o empresário (R-08).
- **Custo de manutenção da grandeza e freios de bola de neve** → [`./03-economia.md`](./03-economia.md) e [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md) (anti-snowball).
- **Qualidade da decisão da diretoria** (índice de eficiência de gestão) → [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md); o `BoardProfile` já aparece em [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) §2.3.
- **Papéis internos do clube** (diretor de base, coordenador de transição, head de performance, etc.) → [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md); a estrutura de **suporte ao atleta** já está na §14.
- **Linha do tempo da temporada** (ciclos diário → multitemporada) → [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md); os eventos de carreira (§9, R-06) são encaixados nesses ciclos.
- **Narrativa gerada por jogador** → [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) §3.8 (IA narrativa) + [`./13-relatorios-notificacoes-e-memoria.md`](./13-relatorios-notificacoes-e-memoria.md); o insumo é a memória do jogador (§13).
