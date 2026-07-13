# Motor de Simulação de Partida

> **Status:** CANÔNICO · **Fontes:** chats/simulacao-partida.md · **Revisão:** 2026-07-10

A partida é o coração do **Grinta**. Não é um "sorteio de placar", e sim um motor vivo onde o resultado nasce do confronto entre vários sistemas do jogo: elenco, tática, moral, preparo físico, estrutura do clube, torcida, clima, gramado, arbitragem, eventos e decisões tomadas durante o jogo. O placar **emerge** desses eventos — ele nunca é calculado direto a partir de "força do time A vs força do time B".

Este documento descreve a filosofia, as etapas, a resolução de lances, os sistemas de contexto, o modelo online/offline, a comissão técnica como filtro de qualidade, a arquitetura conceitual do engine e os pontos ainda em aberto.

## Sumário

1. [Filosofia do motor](#1-filosofia-do-motor)
2. [As cinco etapas e as entradas/saídas da partida](#2-as-cinco-etapas-e-as-entradassaídas-da-partida)
3. [Atributos coletivos dinâmicos](#3-atributos-coletivos-dinâmicos)
4. [Simulação por zonas e por blocos de tempo](#4-simulação-por-zonas-e-por-blocos-de-tempo)
5. [Posse perigosa (threat) vs posse de bola](#5-posse-perigosa-threat-vs-posse-de-bola)
6. [Resolução de ataque em 9 passos](#6-resolução-de-ataque-em-9-passos)
7. [Microduelos individuais](#7-microduelos-individuais)
8. [Aleatoriedade controlada em 3 camadas](#8-aleatoriedade-controlada-em-3-camadas)
9. [Momentum, moral e o psicológico mutável](#9-momentum-moral-e-o-psicológico-mutável)
10. [Contexto: torcida, estrutura, clima, gramado e arbitragem](#10-contexto-torcida-estrutura-clima-gramado-e-arbitragem)
11. [Ações táticas e substituições com custo e cooldown](#11-ações-táticas-e-substituições-com-custo-e-cooldown)
12. [Sistema online vs offline](#12-sistema-online-vs-offline)
13. [Comissão técnica como gate de qualidade](#13-comissão-técnica-como-gate-de-qualidade)
14. [Reputação tática do usuário (cross-match)](#14-reputação-tática-do-usuário-cross-match)
15. [Arquitetura conceitual do engine](#15-arquitetura-conceitual-do-engine)
16. [Pós-jogo e consequências](#16-pós-jogo-e-consequências)
17. [Fases finais e situações críticas](#17-fases-finais-e-situações-críticas)
18. [Pontos críticos a resolver](#18-pontos-críticos-a-resolver)

---

## 1. Filosofia do motor

Quatro princípios orientam toda a simulação:

- **A partida não começa no apito inicial.** Antes de bola rolar, o motor calcula o estado inicial emocional, físico e tático de cada clube, gerando uma "temperatura inicial" do jogo. Um mandante vindo de três vitórias, com torcida confiante e gramado bom, tende a começar mais agressivo; um visitante pressionado, com moral baixa e defesa forte, tende a começar cauteloso buscando transição.
- **Simulação por zonas do campo.** O jogo não é "time A vs time B"; é uma disputa setor a setor. Cada jogada nasce em uma zona, progride ou morre, o que faz a tática importar de verdade.
- **Posse perigosa (threat), não só posse de bola.** Ter a bola não é criar perigo. O motor separa posse de posse ofensiva efetiva, permitindo que um time com menos posse vença por jogar melhor em transição.
- **O placar emerge dos eventos.** Nunca se define "força 80 vs força 70 → provável 2×1". O motor gera volume, chances, qualidade das chances, finalizações, defesas, erros, cartões, lesões, substituições e mudanças emocionais — e o placar surge disso.

A regra de ouro do produto: **resultado é consequência, história é o produto.** O usuário nunca deve sentir que perdeu "porque o sistema quis". Ele precisa conseguir explicar: perdi porque meu lateral estava cansado, porque subi demais a linha, porque meu time sentiu a pressão, porque o adversário explorou meu lado fraco. Essa **explicabilidade** é o que torna o simulador viciante — e por isso o motor precisa registrar causalidade (ver [seção 18](#18-pontos-críticos-a-resolver)).

## 2. As cinco etapas e as entradas/saídas da partida

A partida se divide em cinco grandes etapas:

```
Pré-jogo → Cálculo de contexto → Simulação tick-a-tick/blocos → Eventos → Pós-jogo e consequências
```

| Etapa | O que faz |
| --- | --- |
| **1. Pré-jogo** | Carrega clubes, jogadores, táticas, plano de jogo e comissão técnica; monta a escalação. |
| **2. Cálculo de contexto** | Calcula estado inicial físico, emocional e tático; aplica clima, gramado, torcida, arbitragem e importância; define a "temperatura inicial". |
| **3. Simulação (ticks ou blocos)** | Avança o jogo, atualizando fadiga, moral, momentum, controle de zonas, posse e pressão; gera ataques e duelos. |
| **4. Eventos** | Resolve chances, gols, faltas, cartões, lesões, substituições; detecta pontos de decisão. |
| **5. Pós-jogo** | Fecha estatísticas e aplica consequências no restante do universo do jogo. |

**Entradas da partida:** Clube A e B, escalações, táticas, jogadores, moral, fadiga, lesões, clima, estádio, torcida, arbitragem, importância do jogo, momento da temporada e histórico recente.

**Saídas da partida:** placar, estatísticas, gols, assistências, cartões, lesões, notas dos jogadores, evolução de atributos, moral pós-jogo, reação da torcida, narrativas da imprensa, impacto financeiro e impacto na reputação.

O fluxo lógico completo do funcionamento ideal:

1. Monta contexto pré-jogo.
2. Calcula estado inicial dos times.
3. Avalia táticas e encaixes.
4. Simula controle por zonas.
5. Gera posses e ataques.
6. Resolve duelos individuais.
7. Cria chances.
8. Resolve finalizações.
9. Atualiza moral, fadiga e momentum.
10. Aplica eventos especiais.
11. Permite ajustes táticos/substituições.
12. Fecha estatísticas.
13. Atualiza jogadores, clube, torcida e narrativa.

### Preparação para a partida

A etapa de **pré-jogo** não é só carregar escalação: é toda a preparação que antecede o apito. Ela alimenta o estado inicial físico, emocional e tático e a leitura da comissão técnica.

- **Dossiê da partida.** A comissão reúne um dossiê do confronto: adversário, forma recente, provável escalação, padrões táticos, pontos fortes, fragilidades, situação física do elenco, clima, gramado, viagem, importância e regulamento.
- **Conhecimento imperfeito do adversário.** O jogo **não revela automaticamente a escalação real** do adversário. O conhecimento depende de observação, análise, partidas públicas, funcionários e tempo de preparação — a comissão **estima**, não entrega a verdade (coerente com o "adversário invisível" da [seção 13](#13-comissão-técnica-como-gate-de-qualidade)).
- **Estado do elenco pré-jogo.** Antes da partida, a comissão apresenta a lista de disponíveis, em dúvida, restritos, suspensos, fatigados, sem ritmo e inscritos.
- **Viagem e logística.** A preparação considera distância, horário, hospedagem, transporte, descanso, clima e adaptação. **Economizar em logística pode aumentar a fadiga e reduzir a preparação** — não é um custo neutro.
- **Reunião pré-jogo.** O usuário pode definir mensagem, expectativa, abordagem emocional, prioridades e capitão. O efeito depende do contexto, da credibilidade e do perfil do grupo (conecta-se às ações emocionais da [seção 11](#11-ações-táticas-e-substituições-com-custo-e-cooldown)).

Há ainda o **treino específico** da semana (preparar-se para a pressão adversária, defesa de bola parada, ataque a um setor, adaptação a gramado/clima, simulação de cenários), cujo sistema completo é detalhado em outro escopo. A escalação é confirmada dentro do prazo; se o usuário estiver ausente, a política definida e a comissão preparam uma escalação válida.

## 3. Atributos coletivos dinâmicos

A força do time durante a partida **não é fixa** — ela muda conforme o jogo anda. Cada clube tem atributos coletivos derivados dos jogadores e da estrutura do clube: ataque, defesa, meio-campo, criação, finalização, marcação, compactação, pressão, velocidade, bola parada, controle emocional, resistência física, entrosamento, disciplina e moral.

Esses atributos são compostos, não somados de forma ingênua. Exemplo conceitual:

```
Ataque coletivo =
  qualidade dos atacantes
  + criação dos meias
  + entrosamento
  + tática ofensiva
  + moral
  - fadiga
  - pressão psicológica
  - força defensiva adversária
```

Consequência: um jogador bom em um time bagunçado rende menos, e um jogador mediano em um time bem treinado rende acima do esperado. Os atributos efetivos são recalculados ao longo do jogo (fadiga, moral e momentum mudam o valor efetivo tick a tick).

> As fórmulas exatas de composição de atributos efetivos ficam em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

## 4. Simulação por zonas e por blocos de tempo

**Zonas do campo.** O campo é dividido em nove zonas (defesa esquerda/central/direita, meio esquerdo/central/direito, ataque esquerdo/central/direito). Cada jogada nasce, progride ou morre nessas zonas. O simulador não precisa narrar tudo ao usuário, mas internamente calcula essas disputas — é o que faz a tática ter efeito real (pontas rápidos contra laterais fracos criam mais pelos lados; três volantes contra criação central geram posse sem chance clara).

**Blocos de tempo.** Para performance, o motor pode simular por blocos em vez de minuto a minuto, ainda que eventos importantes apareçam em minutos específicos:

- 0–15 min: fase inicial
- 16–30 min: consolidação
- 31–45 min: fechamento do 1º tempo
- 46–60 min: ajuste pós-intervalo
- 61–75 min: desgaste e substituições
- 76–90+ min: pressão final

Dentro de cada bloco, o motor calcula quem controla mais o jogo, quem cria mais, quem erra mais, quem cansa mais, quem se expõe mais e quem tem maior risco emocional, de lesão ou de cartão.

**Granularidade variável (ver também [seção 18](#18-pontos-críticos-a-resolver)):**

| Tipo de partida | Nível de simulação |
| --- | --- |
| Com usuário online | Detalhada, em ticks |
| Sem usuário online | Por blocos, mesmo motor |
| NPC contra NPC | Resumida, menor granularidade |

Importante: qualquer que seja a granularidade, o resultado precisa parecer gerado pelo mesmo universo.

## 5. Posse perigosa (threat) vs posse de bola

Um erro comum seria "time mais forte = mais posse = mais gols", o que tornaria o jogo previsível. O motor separa métricas distintas:

- Posse de bola
- Posse no campo ofensivo
- Volume de ataque
- Chances criadas
- Chances claras
- Qualidade da finalização
- Qualidade da defesa
- Qualidade do goleiro

Exemplo: o Time A tem 62% de posse, 12 finalizações e 2 chances claras; o Time B tem 38% de posse, 7 finalizações e 4 chances claras — e o Time B pode vencer por jogar melhor em transição. Isso abre espaço para estilos diferentes (posse, contra-ataque, pressão alta, jogo direto, defesa baixa, bola parada, ataque pelos lados, controle do meio), cada um com aptidão de execução própria (ver [seção 18](#18-pontos-críticos-a-resolver)).

## 6. Resolução de ataque em 9 passos

Cada ataque passa por uma sequência de testes ponderados:

1. Time recupera ou mantém posse.
2. Escolhe zona de ataque.
3. Vence disputa no meio.
4. Cria vantagem.
5. Gera chance.
6. Define tipo da chance.
7. Finaliza.
8. Defesa/goleiro reage.
9. Resultado: gol, defesa, fora, bloqueio, escanteio ou falta.

### Fórmula conceitual de chance de gol

O evento de finalização segue uma fórmula conceitual (valores ilustrativos, não normativos):

```
Chance de gol =
  qualidade da chance
  + finalização do jogador
  + frieza
  + moral
  + tipo da finalização
  - qualidade do goleiro
  - pressão da marcação
  - dificuldade do ângulo
  - fadiga
  - clima/gramado
```

Depois entra a aleatoriedade controlada (ver [seção 8](#8-aleatoriedade-controlada-em-3-camadas)). O resultado é **sorteado** contra essa probabilidade — nunca fixado. Um time fraco pode ganhar de um forte, mas não sem explicação e não toda hora.

> As fórmulas numéricas exatas (pesos, curvas, calibração) ficam em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

## 7. Microduelos individuais

Cada evento importante é decidido por microduelos entre atributos individuais, o que faz o mesmo jogador se comportar diferente conforme o contexto (fadiga, cartão, moral):

| Duelo | Atacante | Defensor |
| --- | --- | --- |
| Ponta × lateral | drible + velocidade + imprevisibilidade + moral | marcação + posicionamento + força + disciplina |
| Atacante × zagueiro | finalização + posicionamento + força + frieza | marcação + antecipação + impulsão + concentração |
| Meia criador × volante | passe + visão + técnica + criatividade | desarme + leitura + pressão + resistência |
| Goleiro × finalizador | reflexo + posicionamento + altura + confiança | finalização + frieza + ângulo + qualidade da chance |

Assim, o jogador deixa de ser apenas uma nota geral: ele tem comportamentos diferentes dependendo do contexto. Um lateral já amarelado marca com menos agressividade ou corre risco de expulsão; um ponta com vantagem alta gera mais cruzamento, falta sofrida ou infiltração.

### Função, não só posição

Não basta dizer "meia" ou "zagueiro": a tática depende da **função**, não apenas da posição. O motor distingue funções como meia armador, meia box-to-box, meia atacante, volante marcador, volante construtor, lateral ofensivo, lateral defensivo, ponta aberto, ponta invertido, centroavante pivô e centroavante de profundidade. É a função que muda a simulação: um 4-3-3 com **ponta aberto** joga diferente de um 4-3-3 com **ponta invertido**, e um 4-4-2 com dois atacantes de área é diferente de um 4-4-2 com segundo atacante móvel. Sem função, a simulação fica rasa.

**Jogadores fora de posição.** Mudanças táticas podem colocar um jogador em função inadequada (ex.: o usuário muda para três zagueiros, mas só tem dois — um lateral vira zagueiro). Para isso o motor calcula três medidas:

- **PositionFit** — aptidão do jogador para a posição.
- **RoleFit** — aptidão do jogador para a função pedida.
- **FormationFamiliarity** — familiaridade com a formação.

Os efeitos recaem sobre posicionamento, tomada de decisão, cobertura e rendimento técnico, com **aumento do risco de erro**. Um jogador versátil sofre menos com o improviso.

## 8. Aleatoriedade controlada em 3 camadas

O simulador precisa ter surpresa, mas não caos. Trabalha em três camadas:

1. **Base lógica** — o melhor time tende a jogar melhor.
2. **Variação humana** — jogadores erram, sentem pressão, acertam jogadas improváveis.
3. **Eventos raros** — gol contra, frango do goleiro, lesão precoce, expulsão boba, pênalti polêmico, golaço, falha grotesca. Devem ser raros, mas quando acontecem criam narrativa.

A aleatoriedade respeita o contexto: azar deve ser explicado, nunca gratuito.

## 9. Momentum, moral e o psicológico mutável

**Momentum** é o momento psicológico/tático da partida. Não garante gol, mas aumenta a chance de eventos ofensivos. Muda com gols, substituições, cartões, lesões, cansaço, torcida, mudança tática, sequência de ataques e erros importantes. Exemplo: aos 65', o Time B fez substituição ofensiva, o Time A está cansado e a torcida empurra — momentum Time B +18, Time A −8.

**Moral e psicológico mudam durante o jogo**, não são só pré-jogo:

- **Aumentam moral:** gol marcado, defesa difícil do goleiro, torcida apoiando, boa sequência de ataques, adversário expulso, virada no placar.
- **Reduzem moral:** gol sofrido, erro individual, pênalti perdido, cartão vermelho, pressão da torcida, sequência de derrotas, jogador vaiado.

Um time jovem que sofre gol cedo fora de casa, com controle emocional baixo, passa a errar mais passes, reduz agressividade ofensiva e aumenta o risco de cartão; um time experiente reage melhor. Os efeitos do gol sofrido **não** devem ser iguais para todos: resiliência, liderança do capitão e experiência funcionam como amortecedores contra o efeito bola de neve (ver [seção 18](#18-pontos-críticos-a-resolver)).

**Curvas não-lineares e efeitos de contexto.** Fadiga e moral não escalam de forma linear:

- **Curva de fadiga:** impacto pequeno até ~40%, queda gradual entre 40–65%, queda relevante entre 65–80%, risco alto de erro/lesão acima de 80% e possível colapso físico acima de 90% — o que cria momentos naturais de decisão (substituir, recuar, poupar).
- **Curva de moral:** moral muito baixa gera medo, hesitação e erro; moral boa dá execução estável; moral muito alta pode gerar excesso de risco em jogadores arrogantes. A personalidade decide o efeito.
- **Risco de complacência:** um favorito vencendo fácil (ex.: 2×0 cedo) tende a relaxar naturalmente — reduz intensidade, tenta jogadas individuais e a torcida relaxa —, abrindo espaço para o adversário crescer; uma boa comissão alerta para "manter a concentração".
- **Estado de crise:** um time em má fase (pressão da torcida, notícias negativas, diretoria cobrando, jogador insatisfeito) entra com o emocional mais frágil, e cada gol sofrido pesa mais — isso já é calculado no pré-jogo.

**Jogadores têm personalidade em campo** (decisivo, nervoso, raçudo, frio, irregular, líder, indisciplinado, criativo, egoísta, obediente taticamente, some/cresce em jogo grande). Esses traços entram em momentos específicos, evitando jogadores genéricos.

### Tipos de partida emergentes

Nem todo jogo deve ter a mesma dinâmica. O motor reconhece tipos de partida — jogo aberto, truncado, físico, técnico, nervoso, de domínio estéril, de transição e de bola parada. O tipo **não é escolhido**: ele **emerge** do contexto (táticas, clima, árbitro, qualidade dos times, pressão e importância). Servem para manter a coerência narrativa da partida, ajudando a traduzir para o usuário o que está acontecendo mesmo sem gols ("o jogo está truncado no meio", "o adversário baixou as linhas").

## 10. Contexto: torcida, estrutura, clima, gramado e arbitragem

**Torcida.** Influencia moral do mandante, pressão sobre a arbitragem, nervosismo do adversário, reação após gols sofridos e narrativas pós-jogo. Também pode jogar contra: time grande em má fase que começa mal é vaiado, os jogadores sentem pressão e o erro técnico aumenta. Como os clubes crescem no jogo, a torcida evolui junto (pequena: impacto menor, mais tolerante; grande: gera receita, pressão e narrativa).

**Estrutura do clube** influencia a partida de forma **indireta**, nunca como "bônus mágico": equipe médica (risco/recuperação de lesão), comissão técnica (leitura e ajustes — ver [seção 13](#13-comissão-técnica-como-gate-de-qualidade)), psicologia/comunicação (estabilidade emocional) e diretoria (coerência do elenco e ambiente).

**Clima, gramado e arbitragem** dão vida ao jogo:

| Fator | Efeito |
| --- | --- |
| Chuva | Reduz precisão de passe, aumenta erro de domínio e escorregões, favorece jogo físico |
| Calor | Aumenta fadiga, reduz intensidade, prejudica pressão alta |
| Frio | Menor desgaste, pode favorecer intensidade |
| Gramado ruim | Prejudica times técnicos, aumenta lesões, favorece bola longa e força |
| Gramado excelente | Favorece passe, velocidade e técnica |
| Árbitro (rigoroso, caseiro, permissivo, instável, controlador) | Afeta cartões, faltas, pênaltis, vantagem ao mandante e controle emocional |

## 11. Ações táticas e substituições com custo e cooldown

**Ações táticas** mudam o comportamento do time, não apenas dão bônus (ex.: "ofensivo = +10 ataque" é proibido). Cada ajuste tem vantagens e riscos: mentalidade (muito defensiva → muito ofensiva), intensidade (baixa → máxima), linha defensiva (baixa/média/alta), marcação (leve → muito forte, individual ou por zona), foco ofensivo (lados, centro, bola longa, cruzamentos, infiltrações, chutes de fora, bola parada) e ritmo (controlar posse, acelerar, cadenciar, jogo direto, contra-atacar). Pressão alta, por exemplo, gera mais roubadas no ataque e sufoco, mas custa cansaço, espaço nas costas, lesões musculares e cartões.

**Substituições são decisões reais**, não troca de nota por nota — alteram fadiga do setor, velocidade, altura, força, criação, marcação, moral, entrosamento e comportamento tático. Trocar um meia criativo cansado por um volante marcador reduz criação mas melhora compactação e reduz risco de contra-ataque. A substituição também mexe na **moral individual** de quem sai, conforme a personalidade: um jovem instável tirado cedo por erro pode se irritar, enquanto um veterano líder ou um profissional aceita melhor.

**Ações emocionais** são um tipo de intervenção à parte das táticas — sobretudo no intervalo, o usuário pode escolher uma fala (motivar, cobrar, acalmar, proteger vantagem, pedir intensidade, pedir paciência). O efeito depende do perfil do elenco: cobrar forte reage bem num elenco experiente e competitivo mas piora um elenco jovem e nervoso; motivar recupera um elenco desmotivado mas é neutro num elenco acomodado; pedir calma reduz cartões de um elenco indisciplinado. O **capitão e os líderes** amplificam o controle emocional (reduzem queda de moral após gol sofrido, ajudam a manter concentração, controlam jogadores nervosos).

**Custo e cooldown para evitar abuso:**

- Mudar formação demora alguns minutos para encaixar.
- Pressão máxima não pode ser sustentada por muito tempo.
- Substituições são limitadas pelas regras da competição.
- Um atributo de **estabilidade tática** penaliza quem muda demais: jogadores ficam confusos, o entrosamento cai temporariamente e aumenta o erro de posicionamento.

> Os limites, custos e curvas de estabilidade tática ficam em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

## 12. Sistema online vs offline

A partida é um **jogo ao vivo assíncrono**. A chave: o jogo **nunca depende** de o usuário estar online, mas **recompensa** quem acompanha e decide bem.

- **Usuário online:** vira técnico ativo — partida interativa, com leitura de jogo, pontos de decisão e alertas estratégicos, agindo com custo-benefício.
- **Usuário offline:** o clube segue com uma IA conservadora, que age apenas no essencial (expulsão, lesão, fadiga com risco alto) respeitando o plano de jogo pré-configurado.

### Modelo híbrido (recomendado)

A partida roda automaticamente; quando surge algo relevante, o motor abre um **ponto de decisão** e o usuário pode intervir sem precisar controlar tudo. Alternativas descartadas ou secundárias: tempo real curto (8–12 min reais) e blocos com pausa estratégica.

Regras de design consolidadas:

1. O jogo sempre roda, online ou offline.
2. O usuário online recebe alertas estratégicos.
3. Toda ação tem custo e benefício.
4. A IA offline age apenas para preservar coerência.
5. A comissão técnica melhora recomendações e a IA automática.
6. O plano pré-jogo define o comportamento offline.
7. O pós-jogo explica por que o resultado aconteceu.

### IA offline vs usuário online

A IA offline não pode ser tão agressiva quanto um bom usuário (senão acompanhar não teria valor), nem burra demais (senão o offline seria punido excessivamente). Ela detecta uma vantagem pelo lado direito mas não faz mudança agressiva; faz ajustes leves (reduzir marcação de volante amarelado, recuar a linha diante de atacante veloz, substituir por fadiga acima do limite). O resultado offline tende a ser um pouco pior não porque a IA foi burra, mas porque não explorou as vantagens ofensivas tão bem quanto um usuário atento.

### Retorno do usuário à partida

Quando o usuário volta online no meio de uma partida em andamento, ele não é jogado de volta no jogo às cegas: o motor entrega um **resumo estruturado** do que aconteceu enquanto ele esteve offline, para que retome o controle com contexto. O resumo deve conter:

- **minuto em que saiu** e **minuto atual**;
- **placar**;
- **eventos importantes** do período offline;
- **ações tomadas pela IA** enquanto o usuário esteve ausente;
- **situação atual** da partida;
- **alertas ativos**;
- **riscos**;
- **oportunidades**;
- **sugestão atual da comissão**.

Exemplo funcional: "Você voltou aos 64 minutos. Enquanto esteve offline, seu volante recebeu amarelo, o adversário aumentou a pressão e sua comissão reduziu a agressividade dele. O jogo está empatado, seu lateral esquerdo está cansado e o adversário domina o meio."

A qualidade e a antecipação desse resumo dependem da comissão técnica (ver [seção 13](#13-comissão-técnica-como-gate-de-qualidade)).

### Plano de jogo pré-configurado

Antes da partida, o usuário define o plano que vira a base da IA offline: mentalidade, foco, gatilhos de substituição (ex.: "substituir acima de 85% de fadiga se houver reserva adequado"), respostas a cenários (perdendo, ganhando, expulsão). Mesmo offline, o time segue o estilo do usuário. A **autonomia** concedida à IA é configurável.

### Níveis de autonomia da IA

O usuário escolhe **quanto** o auxiliar pode decidir sozinho. Os níveis são nomeados por escopo de atuação:

| Nível | O que o auxiliar faz |
| --- | --- |
| **Baixa** | Só emergências. |
| **Média** | Emergências + plano pré-jogo. |
| **Alta** | Plano pré-jogo + leitura da comissão. |
| **Total** | O auxiliar decide quase tudo quando o usuário está offline. |

Além do nível, há a **postura** do auxiliar, que pode depender do perfil do técnico contratado: **conservador** protege o resultado e evita risco; **agressivo** busca a vitória e aceita exposição; **equilibrado** faz ajustes moderados.

Mas a qualidade sempre depende da comissão (ver [seção 13](#13-comissão-técnica-como-gate-de-qualidade)): comissão nível 1 com autonomia alta pode tomar decisões ruins; comissão nível 5 com autonomia alta age como um auxiliar confiável.

### Priorização de decisões concorrentes

Quando várias coisas acontecem ao mesmo tempo, o sistema precisa priorizar o que sobe para o usuário (ou o que a IA resolve primeiro), evitando excesso de alerta. A ordem é:

1. **Emergência obrigatória** — lesão grave, goleiro fora, expulsão que quebra a formação.
2. **Risco alto** — jogador prestes a lesionar, pendurado muito agressivo.
3. **Problema tático grave** — setor colapsando, domínio adversário intenso.
4. **Oportunidade clara** — adversário vulnerável, jogador rival cansado.
5. **Narrativa** — torcida, confiança, jogador inspirado.

### Justiça competitiva e anti-exploit

Estar online dá vantagem estratégica, mas não pode ser uma vantagem absurda. Três camadas equilibram:

1. Plano pré-jogo obrigatório ou recomendado.
2. IA offline baseada na comissão técnica.
3. Limite de impacto das ações ao vivo (fazem efeito só se fizerem sentido com o elenco, não forem repetidas demais, respeitarem fadiga e estabilidade, e tiverem tempo para surtir efeito).

Escala de justiça: usuário online > offline com bom plano > offline sem plano. Clube com comissão melhor tem IA offline e recomendações melhores.

**Meta anti-exploit:** ações que poderiam virar "apelo" (pressão alta sempre, marcação forte sempre, atacar lateral cansado sempre, recuar após o gol sempre, chuveirinho no fim, substituir só aos 60) precisam ter custo real e perder efeito quando usadas em excesso. O **contra-ajuste da IA adversária** também impede estratégia dominante: se o usuário ataca 15 minutos pelo mesmo lado, um adversário com comissão nível 4 detecta e reage (dobra a marcação, substitui, explora o espaço deixado).

### Persistência, snapshot e seed

Como há usuários offline e a partida pode durar, o estado precisa ser persistido (`MatchState` com momentum, placar, eventos, decisões etc.). Diretrizes:

- **Servidor autoritativo:** o cliente nunca calcula resultado — só envia comando; o servidor valida (usuário controla o clube? partida ativa? ação válida? substituição permitida? jogador disponível? janela não expirou?), processa e emite o novo estado.
- **Fairness em PvP ao vivo:** em partidas entre dois usuários online, os comandos devem ser processados em ordem válida e aplicados no próximo ciclo apropriado da simulação, evitando que a latência de conexão vire vantagem competitiva — nenhum dos dois jogadores ganha por ter enviado o comando alguns milissegundos antes.
- **Determinismo controlado por seed** (`matchSeed`, `tickSeed`, `eventSeed`): permite reproduzir a partida para debug, balanceamento, investigação de bug e — sobretudo — evitar acusação de "roubo". Comandos do usuário mudam o caminho da simulação.
- **Snapshot e rollback:** salvar no início, no intervalo, a cada X ticks, antes de decisão crítica e no fim. Se um worker cair, outro continua do último snapshot. Para performance, manter o estado atual em memória rápida (ex.: Redis) e persistir snapshots no banco.
- **Versão do motor** (`simulationVersion`, `tuningVersion`, `rulesVersion`): partidas antigas continuam auditáveis mesmo após mudanças de regra.
- **Parâmetros por competição:** número de substituições, prorrogação, pênaltis, VAR, critério de desempate, mando.

> **Especificação canônica de timestep e replay:** a formalização técnica do **kernel único** (um só motor determinístico), do **timestep canônico**, do **protocolo de commands por tick**, do **`SimulationManifest` imutável** (seeds, snapshots, commands e hashes), do **RNG por streams** e da **retenção** vive em [`../02-tecnico/15-ruleset-e-replay.md`](../02-tecnico/15-ruleset-e-replay.md) — que **fecha o bloqueador B-05** e prova a equivalência online↔offline (mesmo kernel; muda apenas quem preenche as janelas de decisão).

> O sistema anti-exploit, o comportamento da IA e a autonomia offline se conectam a [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md).

## 13. Comissão técnica como gate de qualidade

O motor calcula tudo internamente, mas **a comissão técnica é o filtro da realidade**: ela determina o quanto, quando e com que clareza o usuário enxerga o que o motor já sabe. O problema é o mesmo — a qualidade da leitura muda.

O que a comissão influencia: se o problema será detectado; quando; como será explicado; quais ações serão sugeridas; a precisão da sugestão; o impacto estimado; como a IA offline reage; e como o pós-jogo explica a partida.

### Níveis (escala 1–5)

| Nível | Leitura |
| --- | --- |
| 1 | Básica, reativa, atrasada; detecta só o óbvio; poucas sugestões genéricas; pode interpretar mal a causa; IA offline age só no essencial. |
| 2 | Funcional mas limitada; detecta setor vulnerável, fadiga e cartões; sugere mudanças simples; ainda não entende bem causa e consequência. |
| 3 | Intermediária e útil; identifica padrão tático; relaciona jogador, setor e adversário; sugere 2–3 caminhos; IA offline faz ajustes moderados. |
| 4 | Avançada; antecipa tendência antes de virar crise; entende encaixe tático; compara riscos; IA offline protege melhor o plano do usuário. |
| 5 | Elite, preditiva e personalizada; lê o comportamento do adversário; sugere ações de alto impacto com trade-offs; IA offline age quase como um bom auxiliar. |

Exemplo do mesmo problema em dois níveis:

- **Nível 1:** "O adversário está pressionando."
- **Nível 5:** "O adversário está atraindo sua pressão para o lado direito e invertendo rápido nas costas do seu lateral esquerdo. Seu volante está atrasando a cobertura. Se mantiver esse padrão, o risco de chance clara nos próximos 10 minutos é alto."

O nível determina o **número de pontos de decisão**, a **qualidade/clareza** de cada um, o **timing** (antecipação) e a **confiança da leitura**.

### Leitura (detecção) vs execução

A comissão tem atributos separados, permitindo que seja boa em uma coisa e ruim em outra (ótima leitura tática mas fraca gestão emocional, por exemplo): leitura tática, comunicação, treino defensivo/ofensivo, gestão emocional, preparação física, bola parada, substituições, adaptação, disciplina. Assim distingue-se **detectar** o problema de **executar** bem a solução.

### Sugestões com trade-off e prazo de validade

Sugestões melhores não são apenas "mais fortes": trazem trade-offs explícitos, comparação de risco e impacto estimado. Cada sugestão tem **validade contextual** e expira ou é recalculada quando o contexto muda:

- `validUntilMinute`, `conditions`, `invalidatedBy`.
- Invalida se: o jogador-alvo for substituído, o placar mudar, um jogador necessário sair, o adversário mudar de formação ou o clima/contexto mudar.

Exemplo: aos 60' a sugestão é "explorar o lateral adversário cansado"; aos 63' o adversário substitui esse lateral — a sugestão precisa expirar.

### Adversário invisível e economia de informação

O usuário **não deve enxergar tudo do adversário com precisão total**. A comissão **estima**, não entrega o valor exato — e essa é a forma elegante de a comissão importar: em vez de dar bônus direto, ela **melhora a qualidade da informação**. Assim:

- **Estimativa, não dado exato:** a comissão diz "o lateral adversário parece cansado", e não "o lateral adversário está com 78% de fadiga" — a menos que o jogo permita análise avançada. Isso evita informação perfeita demais.
- **Precisão cresce com o nível:** uma comissão alta dá estimativas melhores. A mesma leitura de fadiga escala de "o time está cansando" (baixa) para "seu lado esquerdo está cansando" (média) e para "seu lateral esquerdo perdeu velocidade nos últimos sprints e já não acompanha o ponta adversário" (alta).

### Leitura do perfil do árbitro

Uma comissão alta consegue **detectar o perfil do árbitro durante o jogo** e recomendar ajustes de acordo. O árbitro tem características funcionais — rigor, caseirismo, tolerância a contato, propensão a pênalti e critério disciplinar (ver [seção 10](#10-contexto-torcida-estrutura-clima-gramado-e-arbitragem)) — que afetam marcação forte, faltas, cartões, pênaltis, pressão da torcida e o comportamento de jogadores indisciplinados. Ao ler esse perfil, a comissão pode sugerir, por exemplo, reduzir a agressividade de um pendurado diante de um árbitro rigoroso, ou explorar mais o contato físico diante de um árbitro tolerante.

### A comissão pode errar

O auxiliar **complementa** o usuário, não o substitui: mesmo com comissão nível 5, um bom usuário deve render mais. E a comissão pode diagnosticar errado (erro de diagnóstico), sugerir tarde ou avaliar mal — o que dá espaço para o usuário discordar. É preciso, ainda, calcular a confiança do usuário na comissão e ter fallback para comissão ruim.

> O detalhamento da inteligência da comissão e da IA fica em [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md).

## 14. Reputação tática do usuário (cross-match)

Com o tempo, o usuário desenvolve uma **reputação tática**: um estilo percebido que os adversários passam a reconhecer e para o qual podem se preparar **entre partidas**. Os estilos percebidos previstos são:

- **ofensivo**
- **defensivo**
- **reativo**
- **pragmático**
- **intenso**
- **arriscado**
- **desenvolvedor**
- **analítico**

Adversários se preparam contra **padrões recorrentes** do usuário ao longo de várias partidas. Se o usuário sempre pressiona alto, um adversário pode preparar bolas longas nas costas da linha; se sempre recua após abrir vantagem, pode antecipar isso e chegar ao jogo disposto a aumentar a pressão e os cruzamentos. Isso impede que uma estratégia seja dominante para sempre.

Este mecanismo é **distinto do contra-ajuste intra-partida** (ver [seção 12](#12-sistema-online-vs-offline) e o contra-ajuste de IA adversária na [seção 18](#18-pontos-críticos-a-resolver)): o contra-ajuste reage a padrões repetidos **dentro do mesmo jogo** (o usuário ataca 15 minutos pelo mesmo lado e a comissão adversária dobra a marcação); a reputação tática atua **de uma partida para outra**, fazendo o adversário já entrar em campo preparado contra o estilo histórico do usuário.

## 15. Arquitetura conceitual do engine

O motor separa quatro responsabilidades: (1) o que está acontecendo no jogo; (2) como o jogo calcula os eventos; (3) como o usuário/IA pode interferir; (4) como o resultado afeta o mundo depois.

```
MatchEngine
├── MatchSetup              (prepara contexto antes do jogo)
├── SimulationEngine        (tick loop: fadiga, moral, zonas, posse, duelos, chances)
├── TacticalEngine          (ações táticas viram impacto, com estabilidade e adaptação)
├── DecisionPointEngine
│   ├── ProblemDetector     (gera sinal bruto de problema/oportunidade/risco)
│   ├── StaffIntelligenceEngine  (comissão interpreta o sinal conforme o nível)
│   └── SuggestionGenerator (cria ações sugeridas com trade-off e validade)
├── UserInteractionLayer    (usuário online envia comandos)
├── OfflineAILayer          (IA age conforme plano pré-jogo)
├── NotificationLayer       (avisa o usuário sem gerar spam)
├── EventTimeline           (registra tudo: internos, visíveis, narrativos, decisões)
└── PostMatchProcessor      (aplica consequências)
```

### Tick loop

A cada tick, o `SimulationEngine`: (1) atualiza fadiga; (2) atualiza moral; (3) calcula controle de zonas; (4) calcula posse e pressão; (5) gera possíveis eventos; (6) resolve duelos; (7) resolve chances/finalizações; (8) atualiza momentum; (9) detecta alertas e pontos de decisão; (10) aplica ações do usuário ou IA; (11) salva estado.

O fluxo de um tick com decisão: detecta lado vulnerável → `ProblemDetector` gera sinal bruto → `StaffIntelligenceEngine` interpreta conforme o nível da comissão → `SuggestionGenerator` cria as ações → `NotificationLayer` envia alerta → usuário/IA escolhe → `TacticalEngine` aplica o ajuste (com tempo de adaptação) → estado salvo → `EventTimeline` registra → ticks seguintes refletem a mudança.

### MatchState persistível

O estado da partida é serializável e persistido (modelos completos em [`../02-tecnico/02-modelo-de-dados.md`](../02-tecnico/02-modelo-de-dados.md)):

```
MatchState {
  id; minute; status: 'scheduled' | 'live' | 'paused_decision' | 'finished'
  home: TeamMatchState; away: TeamMatchState
  score { home; away }
  momentum { home; away }
  context: MatchContext
  events: MatchEvent[]
  activeDecisionPoints: DecisionPoint[]
}

TeamMatchState {
  clubId; tactic; players[]; bench[]; substitutionsRemaining
  morale; fatigueAverage; possession
  zoneControl; attackingThreat; defensiveStability; midfieldControl
  tacticalStability
}

DecisionPoint {
  id; matchId; teamId; minute
  type: 'problem' | 'opportunity' | 'risk' | 'emergency'; category
  severity; urgency; confidence
  title; description; detectedCause?
  suggestedActions: SuggestedAction[]
  requiresResponse; expiresAtMinute?
  staffQuality { level; reading; accuracy; communication }
}
```

Cada `SuggestedAction` carrega `actionType`, `label`, `description`, `expectedImpact`, `risk`, `confidence` e `effects`.

### Hierarquia de eventos

O motor separa o que é interno do que é visível para performance e UX:

- **InternalEvent** — passe lateral errado, duelo aéreo perdido, cobertura atrasada (alimenta o padrão, não aparece).
- **VisibleEvent** — gol, chance clara, cartão, lesão, mudança tática, pressão forte.
- **NarrativeEvent** — textos da imprensa e acontecimentos relevantes.
- **DecisionEvent** — pontos de decisão.

> Os modelos `MatchSimulation`, `Tick`, `MatchEvent` e `DecisionPoint` são definidos em [`../02-tecnico/02-modelo-de-dados.md`](../02-tecnico/02-modelo-de-dados.md).

## 16. Pós-jogo e consequências

Depois do apito final, a partida **não termina nela mesma — ela altera o universo do jogo**. Um time pequeno que vence favorito ganha moral, torcida, destaque na mídia, valorização de jogadores e reputação para o técnico; um favorito que perde em casa vê a torcida cobrar, a diretoria pressionar, a moral cair e a imprensa criar crise, tornando os próximos jogos mais tensos.

O `PostMatchProcessor` gera estatísticas (posse, finalizações, chances claras, escanteios, faltas, cartões, impedimentos, passes certos, desarmes, defesas, xG aproximado, melhor/pior jogador, mapa de pressão, zonas exploradas), notas dos jogadores por ação e alimenta: relatórios, imprensa, evolução de jogadores, análise do técnico, satisfação da torcida, mercado de transferências e reputação.

Isso encaixa no crescimento dos clubes numa cadeia — boa estrutura → melhor desenvolvimento → melhor elenco → melhores partidas → mais resultados → mais torcida → mais receita → mais estrutura — sempre com risco de crise, lesões, contratações ruins e insatisfação.

### Efeitos de longo prazo das decisões

Algumas decisões tomadas dentro da partida têm consequência **depois**, conectando a partida à temporada:

- **Forçar um jogador cansado** pode ganhar o jogo, mas aumenta o risco de lesão/queda física no próximo jogo.
- **Recuar demais** pode irritar a torcida se o time for favorito.
- **Substituir uma estrela cedo** preserva o físico, mas pode gerar insatisfação.

## 17. Fases finais e situações críticas

As competições de mata-mata exigem fases além dos 90 minutos, e o fim de jogo, as lesões e as expulsões tardias têm lógica própria — não são exceções, e sim parte da simulação. O motor precisa **receber as regras da competição** (número de substituições, prorrogação, pênaltis, VAR, critério de desempate — ver os parâmetros por competição na [seção 12](#12-sistema-online-vs-offline)).

### Prorrogação

Em mata-matas, quando os 90 minutos não decidem, a sequência é: **90 minutos → prorrogação → pênaltis**. Na prorrogação, a dinâmica muda:

- a fadiga pesa mais;
- as lesões aumentam;
- os times ficam mais conservadores **ou** mais desesperados;
- os jogadores decisivos aparecem mais.

### Disputa de pênaltis

A disputa de pênaltis precisa de **motor próprio**, com atributos e contexto específicos:

- **Batedor:** pênalti, frieza, moral, pressão, fadiga.
- **Goleiro:** reflexo, leitura, altura, confiança.
- **Contexto:** se a cobrança é decisiva ou não, torcida e histórico emocional.

### Lesão após esgotar as substituições

Caso comum: o time já usou todas as substituições e um jogador se lesiona. As regras:

- **Se não pode continuar:** o time fica com um a menos.
- **Se pode continuar limitado:** o rendimento cai muito e o risco de agravar a lesão aumenta.

Isso gera drama real.

### Expulsão em posição crítica

A expulsão de goleiro, zagueiro ou volante **não tem o mesmo impacto** de outras. O motor trata caso a caso:

- **Goleiro expulso:** é obrigatório colocar o goleiro reserva se houver substituição disponível; se não houver, um jogador de linha vai para o gol.
- **Zagueiro expulso:** reorganização defensiva.
- **Atacante expulso:** menos pressão ofensiva, mas a estrutura defensiva pode permanecer.

A IA offline precisa saber **priorizar por posição** ao reorganizar o time.

### Comportamento de fim de jogo

Os **últimos 10 minutos** têm lógica própria:

- **Se vencendo:** segurar o resultado, reduzir o risco, ganhar tempo, substituir por cansaço, defender a bola aérea.
- **Se perdendo:** aumentar a presença ofensiva, bola longa, pressão, aceitar a transição adversária.

Mas o comportamento depende de: perfil do técnico, importância do jogo, saldo de gols, critério da competição, moral e qualidade da comissão.

### Tempo de acréscimo e ações de cera

Os acréscimos podem depender de lesões, substituições, VAR, cera, cartões e confusão — o que cria tensão. As **ações de cera**, se existirem, precisam ter risco embutido: ganhar tempo, mas irritar o adversário, com risco de cartão e pressão da arbitragem.

> **Decisão ratificada — R-32:** **não** criar um comando explícito e repetível de "fazer cera". A gestão de tempo **emerge** da postura de fim de jogo "segurar o resultado" (esta seção) e do timing das substituições; caso um gatilho pontual de "ganhar tempo" seja adicionado, ele carrega risco real embutido (cartão por retardamento, irritação do adversário, pressão da arbitragem) e perde efeito com o uso repetido. Racional: um botão dedicado de cera viraria tática dominante e contradiz a filosofia de resultado emergente e o anti-exploit da [seção 12](#12-sistema-online-vs-offline).

**Papel do usuário (resolvido — [ADR R-01](../99-decisoes/registro-de-decisoes.md#r-01--papel-do-usuário-gestor--técnico--ratificada)).** O usuário é **gestor do clube e também o técnico**: comanda as decisões táticas ao vivo (leitura de jogo, pontos de decisão, substituições, mudança tática). A **comissão técnica assessora** — quanto melhor a comissão, melhores as sugestões — e a **IA cobre o período offline** com limites de autoridade (ver [seção 12](#12-sistema-online-vs-offline)). Não há técnico-NPC que retire do usuário o comando tático; a `CoachTrust` (confiança do elenco no técnico) refere-se ao próprio usuário.

## 18. Pontos críticos a resolver

Os itens abaixo consolidam o "Veredito": a base é forte e as brechas de execução foram fechadas nesta passada de consolidação. A maioria virou **especificação afirmativa** — estruturas e princípios reconciliados com o [catálogo técnico](../02-tecnico/05-catalogo-de-regras-e-formulas.md); os pontos que dependem de decisão de design ou de valor de balanceamento estão marcados como **Recomendação (ratificada)** e replicados na [Série R do registro de decisões](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11). Os coeficientes numéricos das fórmulas `F1`–`F21` não são duplicados aqui: vivem no catálogo (série `R-15`–`R-24`).

- **Evitar abuso do usuário online.** Estar online dá vantagem estratégica sem virar microgerenciamento infinito: o teto de impacto das ações ao vivo já está definido na [seção 12 (Justiça competitiva e anti-exploit)](#12-sistema-online-vs-offline) — uma ação só faz efeito se fizer sentido com o elenco, não for repetida em excesso, respeitar fadiga e estabilidade e tiver tempo para surtir efeito, perdendo eficácia quando abusada. As curvas de decaimento por repetição e os cooldowns numéricos ficam no [catálogo](../02-tecnico/05-catalogo-de-regras-e-formulas.md) (`MAT-008`, séries F/R).

> **Decisão ratificada — R-33:** **tempo de adaptação para mudanças táticas** em três fases — **0–2 min de desorganização** (efeito parcial e risco de erro elevado), **3–6 min de encaixe** (efeito crescente) e **7+ min de efeito completo**. A duração de cada fase encurta com inteligência tática, entrosamento, `FormationFamiliarity` e comunicação da comissão, e alonga com `TacticalConfusion` acumulada. Racional: uma troca (ex.: 4-3-3 → 3-5-2 aos 70') não pode render 100% no mesmo minuto, senão a troca vira bônus instantâneo. Os multiplicadores por fase são calibrados no [catálogo](../02-tecnico/05-catalogo-de-regras-e-formulas.md) (`F4`/`F20`, série `R-18`).

- **Limite de mudanças táticas (`TacticalConfusion`).** Como comandos táticos não têm limite natural (ao contrário das substituições), o abuso é contido por um estado de instabilidade `TacticalConfusion`, alimentado por mudanças recentes + complexidade da mudança + baixa comunicação da comissão + baixa inteligência tática do elenco + pressão do jogo. Seus efeitos são queda temporária de entrosamento, erro de posicionamento e prolongamento da fase de desorganização de R-33 (tempo de adaptação, nesta seção) — coerente com a estabilidade tática da [seção 11](#11-ações-táticas-e-substituições-com-custo-e-cooldown). A fórmula e os coeficientes ficam no [catálogo](../02-tecnico/05-catalogo-de-regras-e-formulas.md) (`MAT-008`, `F4`/`R-18`).

- **Separar comando de execução (`StyleExecutionScore`).** O comando percorre uma cadeia — dado → compreendido → executado → resultado em campo — e um time cansado e indisciplinado executa mal "marcar forte". A `StyleExecutionScore` mede a **aptidão do elenco para cada estilo** (pressão alta, controle de posse, contra-ataque, defesa baixa, jogo direto, bola parada), pois cada um exige atributos diferentes; um estilo mal-executado entrega só parte do efeito pretendido e eleva o erro. Conecta-se a `PositionFit`/`RoleFit`/`FormationFamiliarity` ([seção 7](#7-microduelos-individuais)) e à aptidão de execução citada na [seção 5](#5-posse-perigosa-threat-vs-posse-de-bola). Coeficientes no [catálogo](../02-tecnico/05-catalogo-de-regras-e-formulas.md) (`MAT-020`, séries F/R).

- **Memória de padrões dentro da partida (`MatchPatternMemory`).** O motor não calcula cada tick isolado: mantém uma memória rolante da partida com **ataques por zona**, **duelos vencidos/perdidos**, **erros recentes**, **pressão acumulada** e **resposta às mudanças recentes**. Essa memória alimenta a detecção de padrões (base do contra-ajuste e dos pontos de decisão) e evita que a partida vire sequência de sorteios desconectados. Estrutura conceitual:
  - por zona (3×3): volume de ataque, chances, duelos, erros e pressão nos últimos N ticks;
  - por jogador/setor: sequência de duelos e desgaste recente;
  - por mudança tática: minuto aplicado e resposta observada.

  As janelas de decaimento (N ticks) e pesos são numéricos e ficam no [catálogo](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

- **Sinergia e balanceamento do elenco (`PairSynergy`, `SectorChemistry`, `TeamBalance`).** Além da soma de atributos, o motor calcula sinergias e conflitos entre jogadores (`PairSynergy` entre pares, `SectorChemistry` por setor) e o equilíbrio coletivo `TeamBalance` em sete dimensões — defensivo, meio, ataque, transição, aéreo, ritmo e criatividade. Casos típicos: lateral ofensivo + ponta que volta pouco abre o lado; zagueiro lento + linha alta gera risco; dois atacantes lentos enfraquecem o contra-ataque. Isso alimenta a chance de sofrer contra-ataque, de controlar o meio e de defender cruzamentos. Pesos e limiares de sinergia ficam no [catálogo](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

- **Estado de setor (`SectorState`).** Cada um dos nove setores (defesa/meio/ataque × esquerda/centro/direita) tem um estado persistente entre ticks — **força**, **fadiga**, **pressão sofrida**, **duelos e erros recentes**, **risco** e **confiança** — em vez de recalcular tudo do zero a cada tick. Esse estado é a base da detecção de pontos de decisão ("seu lado esquerdo está colapsando") e conversa diretamente com o `zoneControl` do `MatchState` ([seção 15](#15-arquitetura-conceitual-do-engine)) e com a `MatchPatternMemory`. Os limiares de risco/confiança são numéricos e ficam no [catálogo](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

- **Confiança do elenco no técnico (`CoachTrust`).** Decisões coerentes ao longo do tempo aumentam a `CoachTrust`; mudanças caóticas, exposição pública e jogadores sacrificados injustamente a reduzem. Elenco que confia adapta-se mais rápido às mudanças táticas (encurta as fases de R-33) e absorve melhor as instruções; elenco que não confia tem moral mais oscilante e execução com menos efeito. Como o usuário é o técnico ([ADR R-01](../99-decisoes/registro-de-decisoes.md#r-01--papel-do-usuário-gestor--técnico--ratificada)), a `CoachTrust` é a confiança do grupo **no próprio usuário**. Já catalogada em `MAT-008`; os coeficientes de ganho/perda ficam no [catálogo](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

- **Registrar causalidade dos eventos.** Cada evento guarda não só o que aconteceu, mas o **motivo** — causa primária, secundária e terciária, ação anterior e alerta anterior —, sustentando a explicabilidade que é a regra de ouro do produto ([seção 1](#1-filosofia-do-motor)), a imprensa, a avaliação da comissão e a percepção de justiça. É registrado pela `EventTimeline` ([seção 15](#15-arquitetura-conceitual-do-engine)) e já catalogado como regra `MAT-019` no [catálogo](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

- **IA adversária que reage (contra-ajuste intra-partida).** NPC e IA offline reagem a padrões repetidos **dentro do jogo** conforme a própria comissão, cada um com nível de leitura, estilo do técnico, coragem e conservadorismo próprios (se o usuário ataca 15 min pelo mesmo lado, uma comissão adversária forte dobra a marcação, substitui ou explora o espaço deixado). Isso impede estratégia dominante e é distinto da reputação tática entre partidas ([seção 14](#14-reputação-tática-do-usuário-cross-match)). Alimenta-se da `MatchPatternMemory`; o detalhamento do comportamento fica em [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md).

- **Diferentes níveis de simulação para performance.** Partidas simultâneas usam a granularidade variável já definida na [seção 4](#4-simulação-por-zonas-e-por-blocos-de-tempo) — online em ticks, offline por blocos, NPC×NPC resumida —, sempre com a regra de que o resultado precisa parecer gerado pelo mesmo universo. O **servidor autoritativo** e a persistência estão especificados na [seção 12 (Persistência, snapshot e seed)](#12-sistema-online-vs-offline); a compatibilidade de jogadores e a especialização de bola parada seguem os mesmos atributos coletivos e microduelos das seções [3](#3-atributos-coletivos-dinâmicos) e [7](#7-microduelos-individuais). (Jogadores fora de posição, prorrogação/pênaltis, tempo de acréscimo e comportamento de fim de jogo estão especificados na [seção 17](#17-fases-finais-e-situações-críticas).)

> **Decisão ratificada — R-34:** **suíte de calibração estatística** de ~10.000 partidas por cenário — equilibradas, favorito×azarão, com chuva, pressão alta, comissão nível 1 vs 5, online e offline — validando **critérios de aceite**: distribuição de placar realista (média de gols e frequência de 0×0/goleadas dentro de faixas do futebol real), consistência entre ligas de níveis diferentes e ausência de bola de neve exagerada (um gol cedo não deve prever o resultado além de um limiar). Racional: sem lote estatístico com metas explícitas, os coeficientes `F1`–`F21` não têm como ser calibrados nem auditados. É a fonte de calibração final já citada no [catálogo §2.4](../02-tecnico/05-catalogo-de-regras-e-formulas.md) (série `R-15`–`R-24`).

- **Seed/snapshot para auditoria e reprodutibilidade.** O determinismo por seed (`matchSeed`/`tickSeed`/`eventSeed`), os snapshots em pontos-chave, o rollback por queda de worker e o versionamento do motor (`simulationVersion`/`tuningVersion`/`rulesVersion`) estão especificados na [seção 12 (Persistência, snapshot e seed)](#12-sistema-online-vs-offline), garantindo que qualquer partida possa ser reproduzida e auditada — inclusive para afastar acusação de "roubo". A **especificação canônica** de kernel único, timestep, `SimulationManifest` imutável, RNG por streams e retenção — que **fecha o bloqueador B-05** — está em [`../02-tecnico/15-ruleset-e-replay.md`](../02-tecnico/15-ruleset-e-replay.md). A política de versionamento de ruleset é a recomendação `R-24`/`R-30` no [catálogo](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

- **Sugestões que expiram quando o contexto muda.** Toda `SuggestedAction` carrega `validUntilMinute`, `conditions` e `invalidatedBy`, sendo recalculada ou descartada quando o jogador-alvo é substituído, o placar muda, um jogador necessário sai, a formação adversária muda ou o clima/contexto se altera — conforme já especificado na [seção 13 (Sugestões com trade-off e prazo de validade)](#13-comissão-técnica-como-gate-de-qualidade).

Itens adicionais levantados na discussão e a incorporar na especificação técnica: balanceamento coletivo, arbitragem detalhada, importância do jogo e estado do campeonato, risco de lesão agravada, modelo de confiança da informação, ritmo narrativo, scouting pré-jogo, integração com o treino semanal, reputação tática do usuário e ocultação de complexidade para jogadores iniciantes.

---

## Rastreabilidade — regras e fórmulas (catálogo)

O motor descrito aqui é formalizado no [Catálogo de Regras e Fórmulas](../02-tecnico/05-catalogo-de-regras-e-formulas.md):

- **Regras de partida:** `MAT-001` a `MAT-025` (simulação por zonas, intervenções táticas, eventos, resultado, homologação).
- **Fórmulas do motor:** `F1`–`F21` (atributo efetivo, fadiga, moral, tática, controle de zona, posse, ataques, duelo, chance, finalização, **chance de gol F11**, cartão/lesão, momentum, xG, nota, decisionScore, offline, leitura da comissão, `staffLevel`).
- **Coeficientes de 1ª passada (ratificada):** `R-15`..`R-24` (ver [Série R](../99-decisoes/registro-de-decisoes.md)); calibração final via lote de ~10.000 partidas (`R-34`).
- **Papel do usuário:** Gestor+Técnico (`R-01`, ratificada).
