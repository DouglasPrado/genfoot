# Parte VI — Tática e partidas

> **Status:** CANÔNICO · **Fontes:** ../01-game-design/05-motor-de-partida.md; ../01-game-design/07-inteligencia-artificial.md; ../01-game-design/02-sistema-de-jogadores.md; ../01-game-design/08-estadio-regiao-e-clima.md · **Revisão:** 2026-07-11

Esta Parte é sobre o **jogo** propriamente dito: o que acontece do apito de preparação ao apito final. Você vai entender como preparar a partida (Cap. 22), como formação e funções moldam o time (Cap. 23), como o motor decide o resultado (Cap. 24), como intervir ao vivo (Cap. 25), como surgem os pontos de decisão (Cap. 26), o que acontece quando você está offline (Cap. 27) e como nascem os eventos da partida (Cap. 28).

A ideia central de toda a Parte é uma só: **o resultado é uma consequência, e a história é o produto**. Você nunca deve sentir que perdeu "porque o sistema quis". Deve conseguir explicar: perdi porque meu lateral estava cansado, porque subi demais a linha, porque meu time sentiu a pressão da torcida, porque o adversário explorou meu lado fraco. Essa explicabilidade é o coração da experiência.

---

## 22. Preparação da partida

### Resumo

A partida não começa no apito inicial — começa na preparação. Antes de a bola rolar, sua comissão técnica reúne um dossiê do confronto, aponta o estado do elenco e recomenda um plano. Tudo isso alimenta o estado físico, emocional e tático com que seu time entra em campo. E, como sempre em Grinta, a **precisão dessa leitura depende da qualidade do staff**.

### Regras completas

**O dossiê da partida.** A comissão reúne informações sobre o confronto: adversário, forma recente, provável escalação, padrões táticos, pontos fortes e fragilidades, situação física do elenco, clima, gramado, viagem, importância do jogo e regulamento da competição.

**Conhecimento imperfeito do adversário.** O jogo **não revela automaticamente a escalação real** do adversário. O que você recebe é uma **estimativa**, construída a partir de observação, análise, partidas públicas e do trabalho dos funcionários. Uma comissão melhor estima com mais precisão; uma comissão fraca entrega uma leitura vaga ou até equivocada. Você raramente entrará em campo sabendo exatamente o que o adversário fará.

**Estado do elenco pré-jogo.** A comissão apresenta a lista de jogadores disponíveis, em dúvida física, restritos, suspensos, fatigados e sem ritmo. É a partir dessa lista que você monta uma escalação válida — e é aqui que a profundidade do elenco (Cap. 18) e a condição física (Cap. 16) se traduzem em opções concretas.

**Viagem e logística.** A preparação considera distância, horário, hospedagem, transporte, descanso e adaptação ao clima. Isso **não é neutro**: economizar em logística ou enfrentar uma viagem longa aumenta a fadiga e reduz a preparação, sobretudo para clubes com estrutura menor. Uma sequência de jogos fora pesa mais que jogos isolados.

**Reunião pré-jogo.** Você pode definir a mensagem ao grupo, a expectativa, a abordagem emocional, as prioridades e o capitão. O efeito depende do contexto, da sua credibilidade e do perfil do elenco — cobrar forte funciona num grupo experiente e competitivo, mas piora um elenco jovem e nervoso.

**Treino específico da semana.** A preparação inclui o treino direcionado ao confronto: preparar-se para a pressão adversária, ensaiar bola parada, atacar um setor específico, adaptar-se ao gramado e ao clima ou simular cenários. É o trabalho de bastidores que aumenta a aptidão do time para o plano escolhido.

**Confirmação da escalação.** A escalação é confirmada dentro de um prazo. Se você estiver ausente, a política que você deixou definida e a comissão preparam uma escalação válida (ver Cap. 27).

> **REGRA:** A qualidade da informação que você recebe na preparação depende da comissão técnica e dos olheiros. O mesmo adversário rende um alerta genérico ("eles são fortes pelos lados") com staff fraco e uma leitura acionável ("eles concentram os ataques pela sua direita e invertem rápido para as costas do seu lateral") com staff forte.

> **ATENÇÃO:** Tratar a logística como custo dispensável cobra o preço em campo. Viagens longas mal planejadas e descanso insuficiente chegam ao jogo como fadiga extra e menor foco — e um calendário apertado amplifica esse efeito.

> **COMO O JOGO AVALIA:** A escalação provável do adversário, seus pontos fracos e sua situação física são estimados, não entregues. A margem de erro dessa estimativa diminui conforme a qualidade dos olheiros, da análise de desempenho e da comissão técnica, e conforme o tempo de preparação — mas você nunca recebe os valores exatos do adversário.

### Estratégia

Use a preparação para **transformar informação em vantagem**. Leia o dossiê, ajuste o plano ao que a comissão detectou e prepare o treino da semana para o confronto específico. Planeje a logística das viagens longas com antecedência e administre a rotação pensando na sequência de jogos, não apenas na próxima partida. Lembre-se de que, quanto melhor o staff, mais confiável é tudo o que você lê aqui.

---

## 23. Formação e funções

### Resumo

A formação (o esquema, como 4-3-3 ou 3-5-2) é apenas o **ponto de partida**. O que realmente define como o time joga é a **função** de cada jogador — o que ele faz com e sem a bola — e o quanto cada atleta se encaixa nessa função. Dois times na mesma formação podem jogar de maneiras completamente diferentes.

> **REGRA:** A formação é o ponto de partida, não a tática completa. É a função, e não apenas a posição nominal, que muda a forma como o time se comporta em campo.

### Regras completas

**Posição, função e estilo.** Um jogador tem uma **posição** (onde ele fica), uma **função** (o papel que exerce ali) e um **estilo** dentro dessa função. Não basta dizer "meia" ou "zagueiro": um ponta aberto joga diferente de um ponta invertido; um 4-4-2 com dois atacantes de área é diferente de um 4-4-2 com um segundo atacante móvel; um zagueiro construtor cumpre uma função distinta de um zagueiro marcador. É a função que dá profundidade à tática.

**Comportamento com e sem a bola.** Você define como o time se comporta através de ajustes de mentalidade (mais defensiva a mais ofensiva), intensidade, altura da linha defensiva, tipo de marcação, foco ofensivo (pelos lados, pelo centro, bola longa, cruzamentos, infiltrações, chutes de fora, bola parada) e ritmo (controlar posse, acelerar, cadenciar, jogo direto, contra-atacar). Cada ajuste tem vantagens **e** riscos — não é um bônus grátis. Pressão alta, por exemplo, gera mais roubadas no ataque, mas custa cansaço, espaço nas costas da defesa e mais faltas.

**Compatibilidade jogador-função.** Cada jogador tem uma aptidão para a posição, uma aptidão para a função pedida e uma familiaridade com a formação. Quando esses encaixes são bons, ele rende; quando você o coloca fora de posição ou numa função inadequada, o rendimento cai e o **risco de erro aumenta** — em posicionamento, cobertura e tomada de decisão. Um jogador versátil sofre menos com o improviso.

**Improvisação.** Mudanças táticas às vezes obrigam a improvisar (você muda para três zagueiros, mas só tem dois, e um lateral vira zagueiro). Isso é possível, mas cobra um preço: o improvisado erra mais e desestabiliza o setor até se ajustar.

**Equilíbrio de setores.** Um time não é só a soma dos onze: ele tem equilíbrio (ou desequilíbrio) entre defesa, meio, ataque, transição, jogo aéreo, ritmo e criatividade. Combinações geram sinergias e conflitos: um lateral muito ofensivo com um ponta que não volta abre o lado; um zagueiro lento com linha alta gera risco; dois atacantes lentos enfraquecem o contra-ataque. O encaixe entre as peças importa tanto quanto a qualidade de cada uma.

> **ATENÇÃO:** Encaixar um jogador numa função para a qual ele não tem perfil pode parecer uma solução no papel e virar um buraco em campo. Um time cansado e indisciplinado executa mal um plano exigente como "marcação forte" ou "pressão alta", entregando só parte do efeito pretendido e errando mais.

> **EXEMPLO:** O mesmo 4-3-3 rende de duas formas: com um ponta aberto e rápido contra um lateral frágil, o time cria pelos lados; com um ponta invertido que busca o meio, ele ataca por dentro e libera o lateral para a amplitude. A formação é idêntica; a função muda o jogo.

> **COMO O JOGO AVALIA:** A aptidão de cada jogador para a posição e a função, a familiaridade com a formação e a aptidão do elenco para cada estilo de jogo são calculadas a partir dos atributos, do histórico e do entrosamento — e afetam o rendimento e o risco de erro. Esses fatores existem, mas seus valores exatos não são exibidos; a comissão os traduz para você em recomendações.

### Estratégia

Pense em **funções**, não só em esquemas. Escolha a formação a partir dos jogadores que você tem e das funções que eles executam bem, e não o contrário. Cuide do equilíbrio dos setores — evite deixar um lado descoberto ou o contra-ataque exposto — e valorize os jogadores versáteis, que ampliam suas opções de ajuste sem tanto risco de improviso.

---

## 24. Motor de partida

### Resumo

O motor de partida é o coração de Grinta. Ele **não** calcula "força do time A contra força do time B e sorteia um placar". Em vez disso, simula o jogo como uma sucessão de disputas, chances, erros e decisões — e o **placar emerge desses eventos**. Um time com mais qualidade tende a jogar melhor, mas não vence automaticamente: tática, condição física, momento emocional e entrosamento decidem tanto quanto o talento.

> **REGRA:** O placar emerge dos eventos da partida. O jogo nunca define "força 80 contra força 70, logo provável 2 a 1". Ele gera volume de ataque, chances, qualidade das chances, finalizações, defesas, erros, cartões, lesões e mudanças emocionais — e o resultado surge disso.

### Regras completas

**A partida não começa no apito.** Antes de a bola rolar, o motor calcula o estado inicial físico, emocional e tático de cada time, gerando uma "temperatura inicial" do jogo. Um mandante embalado por vitórias, com torcida confiante e gramado bom, tende a começar agressivo; um visitante pressionado, com moral baixa, tende a começar cauteloso buscando a transição.

**Disputa por zonas do campo.** O jogo não é resolvido como um bloco único: é uma disputa setor a setor. Cada jogada nasce numa zona e progride ou morre ali. É isso que faz a tática importar de verdade — pontas rápidos contra laterais frágeis criam mais pelos lados; três volantes contra uma criação central geram posse sem chance clara.

**Posse de bola não é perigo.** Ter a bola não é o mesmo que criar perigo. O motor separa a posse da posse **efetivamente ofensiva**: um time pode ter menos posse e vencer por jogar melhor em transição. Isso abre espaço para estilos diferentes (posse, contra-ataque, pressão alta, jogo direto, defesa baixa, bola parada, ataque pelos lados, controle do meio), cada um com uma aptidão de execução própria.

**A força do time muda durante o jogo.** Os atributos coletivos (ataque, defesa, meio, criação, marcação, pressão, controle emocional, entrosamento) **não são fixos**: eles são recalculados ao longo da partida conforme a fadiga sobe, a moral oscila e o momentum muda de lado. Um jogador bom num time bagunçado rende menos; um mediano num time bem treinado rende acima do esperado.

**Momentum e o psicológico.** O momentum é o momento psicológico e tático da partida. Ele não garante gol, mas aumenta a chance de eventos ofensivos, e muda com gols, substituições, cartões, lesões, cansaço, torcida e mudanças táticas. A moral também muda **durante** o jogo, não só antes: um gol marcado, uma defesa difícil e o apoio da torcida elevam; um gol sofrido, um erro individual e a vaia derrubam. E os efeitos não são iguais para todos — resiliência, liderança do capitão e experiência funcionam como amortecedores; um time jovem e emocionalmente frágil sente muito mais um gol sofrido cedo.

**Entrosamento.** Duplas e setores que jogam juntos há mais tempo rendem acima de peças recém-reunidas. O entrosamento entre os jogadores é um fator real do desempenho coletivo — e é uma das razões pelas quais reunir craques que não se conhecem pode render menos que um grupo coeso.

**Contexto.** Torcida, estrutura do clube, clima, gramado e arbitragem dão vida ao jogo, sempre de forma explicável e nunca como bônus mágico:

- **torcida** — influencia a moral do mandante e a pressão sobre o adversário, mas pode jogar contra quando um time em má fase começa mal e é vaiado;
- **clima e gramado** — a chuva reduz a precisão de passe e favorece o jogo físico; o calor aumenta a fadiga e prejudica a pressão alta; um gramado ruim atrapalha os times técnicos e favorece a bola longa;
- **arbitragem** — diferentes perfis de árbitro afetam cartões, faltas, pênaltis e o controle emocional;
- **mando de campo** — é a soma de torcida, familiaridade e logística; é moderado e explicável, e **não garante vitória**.

**Aleatoriedade controlada.** O jogo precisa ter surpresa, mas não caos. Existe uma base lógica (o melhor time tende a jogar melhor), uma variação humana (jogadores erram, sentem pressão, acertam jogadas improváveis) e eventos raros (um frango, uma expulsão boba, um golaço). O azar existe, mas é **explicável** — nunca gratuito. Um time fraco pode vencer um forte, mas não sem motivo e não toda hora.

**Mudanças táticas levam tempo.** Trocar de formação ou de estilo no meio do jogo **não** rende efeito completo no mesmo minuto. Há um período de assimilação: primeiro o time se desorganiza e erra mais, depois vai se encaixando e só então a mudança entrega o efeito pretendido. Esse tempo de adaptação encurta com jogadores taticamente inteligentes, entrosados e bem orientados pela comissão, e se alonga quando você muda demais e acumula confusão tática.

> **ATENÇÃO:** Mudar de esquema o tempo todo não é sinal de controle — é uma fonte de desorganização. Cada mudança tem um custo temporário de entrosamento e posicionamento, e o abuso confunde os jogadores em vez de ajudá-los.

> **EXEMPLO:** Um time tem 62% de posse, 12 finalizações e apenas 2 chances claras; o adversário tem 38% de posse, 7 finalizações e 4 chances claras — e vence, por ser mais eficiente na transição. A posse maior não se converteu em perigo, e o placar refletiu as chances reais, não o domínio estéril.

> **COMO O JOGO AVALIA:** A força efetiva de cada time em cada momento do jogo é recalculada continuamente a partir dos atributos individuais, da tática, da condição física, do estado emocional, do entrosamento e do contexto (torcida, clima, gramado, árbitro, mando). Cada chance, defesa e evento é resolvido contra essa força efetiva com uma dose de incerteza controlada. Esses cálculos existem e sustentam a coerência do resultado — mas os pesos, as curvas e as probabilidades exatas não são exibidos, justamente para que o resultado permaneça incerto e a decisão, real.

### Estratégia

Pare de pensar no jogo como "a soma das notas" e comece a pensar em **como** seu time joga. Ajuste a tática ao adversário e ao contexto, cuide da condição física e do entrosamento do grupo e respeite o tempo de assimilação das mudanças. Quando perder, procure a causa — foi cansaço, foi um setor exposto, foi o time sentindo a pressão? — porque essa causa é real e aponta o que corrigir no próximo jogo.

---

## 25. Acompanhamento ao vivo

### Resumo

Quando você acompanha a partida online, vira o **técnico ativo** do time: faz substituições, muda o esquema e as funções, ajusta pressão, intensidade e marcação, recua ou avança, reage a lesões e expulsões, protege um resultado ou parte para buscá-lo. O jogo nunca **depende** de você estar online, mas **recompensa** quem acompanha e decide bem — desde que as decisões façam sentido e respeitem o tempo de assimilação.

### Regras completas

**Substituições são decisões reais.** Trocar um jogador não é trocar uma nota por outra: altera a fadiga do setor, a velocidade, a força, a criação, a marcação, a moral, o entrosamento e o comportamento tático. Tirar um meia criativo cansado e colocar um volante marcador reduz a criação, mas melhora a compactação e diminui o risco de contra-ataque. A substituição também mexe na moral de quem sai, conforme a personalidade: um jovem instável tirado cedo por um erro pode se irritar, enquanto um veterano profissional aceita melhor.

**Mudança de esquema e funções.** Você pode mudar a formação e as funções durante o jogo — mas lembre-se de que essas mudanças **levam tempo para assimilar** (ver Cap. 24). O efeito não é imediato: há uma fase de desorganização antes de a mudança render.

**Ajustes de comportamento.** Você regula mentalidade, intensidade, altura da linha, tipo de marcação, foco ofensivo e ritmo. Cada ajuste carrega vantagem e risco. Pressão alta sufoca o adversário, mas **não pode ser sustentada por muito tempo** sem cobrar cansaço e abrir espaços.

**Ações emocionais.** Sobretudo no intervalo, você pode escolher uma fala — motivar, cobrar, acalmar, proteger a vantagem, pedir intensidade, pedir paciência. O efeito depende do perfil do elenco: cobrar forte reage bem num grupo experiente e competitivo, mas piora um elenco jovem e nervoso; pedir calma reduz cartões de um elenco indisciplinado. O capitão e os líderes amplificam o controle emocional.

**Reagir a imprevistos.** Lesões, expulsões e cartões mudam a partida. Você reorganiza o time diante de uma expulsão, protege um pendurado reduzindo a agressividade dele, poupa um jogador em risco de lesão ou reforça um setor que está colapsando.

**Proteger ou buscar o resultado.** No fim do jogo, a postura muda: vencendo, você tende a segurar o resultado, reduzir o risco e gerir o tempo; perdendo, você aumenta a presença ofensiva e aceita a exposição. O comportamento adequado depende do perfil do time, da importância do jogo, do saldo e da moral.

**Retorno à partida.** Se você entrou no meio de um jogo em andamento (porque estava offline), não é jogado de volta às cegas: o motor entrega um **resumo estruturado** — o minuto em que você saiu e o atual, o placar, os eventos importantes do período, as ações que a IA tomou, a situação atual, os alertas, os riscos, as oportunidades e a sugestão da comissão. A qualidade e a antecipação desse resumo dependem do staff.

**Custo, limite e anti-abuso.** As ações ao vivo dão vantagem estratégica, mas não uma vantagem absurda. Uma ação só faz efeito se **fizer sentido com o elenco**, não for repetida em excesso, respeitar a fadiga e a estabilidade e tiver tempo para surtir efeito. Táticas repetidas perdem eficácia, e um adversário com boa comissão **reage** aos seus padrões: se você ataca quinze minutos sempre pelo mesmo lado, ele dobra a marcação, substitui ou explora o espaço que você deixou.

**Reputação entre partidas.** Com o tempo, você desenvolve uma **reputação tática** — um estilo percebido (ofensivo, defensivo, reativo, pragmático, intenso, arriscado, entre outros) que os adversários passam a reconhecer e para o qual se preparam **de uma partida para a outra**. Se você sempre recua após abrir vantagem, um adversário pode entrar em campo já disposto a pressionar e cruzar mais. Isso impede que qualquer estratégia seja dominante para sempre.

> **ATENÇÃO:** Repetir a mesma ação "mágica" toda hora — pressão alta o tempo todo, recuar sempre após o gol, atacar sempre o mesmo lado — não funciona. Essas jogadas perdem efeito com o uso e são lidas e neutralizadas por adversários bem assessorados. Intervir bem é escolher o momento, não apertar botões sem parar.

> **EXEMPLO:** Aos 62 minutos, vencendo por 1 a 0, seu lateral esquerdo está cansado e o adversário acaba de colocar um ponta rápido. Você desloca o volante para dar cobertura àquele lado. O resultado tem um preço claro: reduz o risco pela esquerda e a segurança defensiva melhora, mas a criação pelo meio cai e o volante se desgasta mais. Uma boa intervenção muda a dinâmica — e cobra por isso.

> **COMO O JOGO AVALIA:** O impacto de cada ação ao vivo é calculado conforme ela se encaixa no elenco, na fadiga, na estabilidade tática e no contexto do jogo, com o efeito surgindo ao longo do tempo de assimilação e decaindo quando a ação é abusada. Esses limites existem para preservar a justiça competitiva, mas suas curvas exatas não são exibidas.

### Estratégia

Acompanhe para **ler o jogo**, não para microgerenciar. Guarde as intervenções para quando fizerem diferença — um setor exposto, um jogador em risco, uma oportunidade clara — e respeite o tempo de adaptação das mudanças. Varie seus padrões ao longo das temporadas para não virar previsível, e use as ações emocionais conforme o perfil do seu elenco, não como fórmula fixa.

---

## 26. Pontos de decisão

### Resumo

Um ponto de decisão é um **momento relevante** que surge durante a partida e no qual o jogo pausa (quando você está online) para você escolher o que fazer. Eles não aparecem ao acaso: surgem quando o motor detecta uma mudança real na dinâmica. A qualidade das opções, das recomendações e do timing com que você é avisado depende diretamente da comissão técnica.

> **REGRA:** Os pontos de decisão surgem quando o motor detecta uma mudança real no jogo — um problema, um risco, uma oportunidade ou uma emergência — nunca de forma aleatória. Quanto melhor a comissão técnica, mais cedo e com mais clareza eles chegam até você.

### Regras completas

**Tipos de ponto de decisão.** Um ponto de decisão pode ser um **problema** (um setor colapsando), uma **oportunidade** (o adversário ficou vulnerável), um **risco** (um jogador prestes a se lesionar ou a ser expulso) ou uma **emergência** (uma lesão grave, o goleiro fora, uma expulsão que quebra a formação).

**Priorização.** Quando várias coisas acontecem ao mesmo tempo, o sistema prioriza o que sobe para você, para não afogar a partida em alertas. A ordem é: emergência obrigatória, depois risco alto, depois problema tático grave, depois oportunidade clara e, por fim, narrativa (torcida, confiança, jogador inspirado).

**A comissão técnica como filtro.** O motor calcula tudo internamente, mas é a comissão que determina **o quanto, quando e com que clareza** você enxerga o que ele já sabe. Numa escala de qualidade, uma comissão fraca detecta só o óbvio, sugere tarde, dá recomendações genéricas e pode até interpretar mal a causa; uma comissão de elite antecipa a tendência antes de virar crise, lê o comportamento do adversário e sugere ações de alto impacto com os trade-offs explícitos. O mesmo problema vira "o adversário está pressionando" com staff fraco e "o adversário está atraindo sua pressão para a direita e invertendo nas costas do seu lateral; se mantiver o padrão, o risco de chance clara nos próximos minutos é alto" com staff forte.

**Sugestões com trade-off e prazo de validade.** As boas sugestões não são apenas "mais fortes": trazem o trade-off explícito, a comparação de risco e o impacto estimado. E cada sugestão tem **validade**: ela expira ou é recalculada quando o contexto muda. Se a sugestão era "explore o lateral adversário cansado" e o adversário substitui esse lateral, a sugestão precisa cair.

**O adversário invisível.** Você **não enxerga tudo do adversário com precisão total**. A comissão **estima**, não entrega o valor exato — ela diz "o lateral adversário parece cansado", não "o lateral está com tal porcentagem de energia". Essa é a forma elegante de o staff importar: em vez de dar um bônus direto, ele melhora a **qualidade da informação**. E a precisão cresce com o nível: a mesma leitura de fadiga escala de "o time está cansando" para "seu lado esquerdo está cansando" e para "seu lateral perdeu velocidade nos últimos sprints e já não acompanha o ponta".

**Leitura do árbitro.** Uma comissão forte consegue detectar o perfil do árbitro durante o jogo e recomendar ajustes — por exemplo, reduzir a agressividade de um pendurado diante de um árbitro rigoroso, ou explorar mais o contato físico diante de um árbitro tolerante.

**A comissão pode errar.** A comissão **complementa** você, não o substitui: mesmo com o melhor staff, um bom técnico rende mais. E ela pode diagnosticar errado, sugerir tarde ou avaliar mal — o que dá espaço para você discordar. As recomendações são um apoio, não uma ordem.

> **ATENÇÃO:** Seguir cegamente todas as sugestões, ou ignorá-las por completo, são dois extremos ruins. A comissão pode errar, mas costuma acertar mais quanto melhor for; trate as recomendações como um segundo par de olhos e decida você, que conhece o plano do jogo.

> **EXEMPLO:** Aos 23 minutos, você está perdendo o meio-campo. Um ponto de decisão abre com opções: recuar o meia central, marcar forte o camisa 10 adversário, adiantar a linha ou manter a estratégia. Com uma comissão fraca, você recebe as opções sem contexto claro; com uma forte, cada opção vem com o risco e o impacto estimados, ajudando você a escolher com consciência.

> **COMO O JOGO AVALIA:** A detecção de um problema, o momento em que ele é sinalizado, a clareza da explicação, a precisão da causa apontada e a confiança de cada leitura são determinadas pela qualidade da comissão técnica e da análise de desempenho. Esses fatores existem e mudam o que você vê da partida, mas os cálculos internos que geram cada sinal não são exibidos.

### Estratégia

Encare a comissão técnica como um **investimento em qualidade de decisão**. Um staff melhor não move um bônus na sua nota: ele faz você enxergar antes, com mais clareza e com os riscos na mesa — dentro da partida e fora dela. Quando um ponto de decisão abrir, cruze a recomendação com o seu próprio plano e com o que você vê no jogo antes de agir.

---

## 27. Partida com o usuário offline

### Resumo

A partida **continua mesmo quando você não está online**. Nesse caso, uma IA conservadora assume o comando do seu clube e age apenas no essencial, respeitando o plano de jogo e as configurações que você deixou. Você nunca perde uma partida por não ter entrado — mas quem prepara bem o plano offline e monta uma boa comissão é recompensado.

> **REGRA:** A partida acontece esteja você online ou não. Offline, a IA do clube assume as decisões essenciais — lesão, jogador sem condição, expulsão, formação inválida, desgaste — respeitando as configurações, preferências e o planejamento que você deixou. E, como manda a regra do mundo, **você nunca pode ser demitido do próprio clube**.

### Regras completas

**Uma IA conservadora, que age no essencial.** A IA offline não tenta jogar como um técnico humano atento a cada detalhe. Ela age para **preservar a coerência**: substitui um jogador acima do limite de fadiga, reduz a marcação de um volante amarelado, recua a linha diante de um atacante veloz, reorganiza o time após uma expulsão e coloca o goleiro reserva se o titular sair. Ela detecta uma vantagem pelo lado direito, mas não faz uma mudança agressiva para explorá-la — e é por isso, e não por "burrice", que o resultado offline tende a ser um pouco pior que o de um bom usuário online.

**O plano de jogo pré-configurado.** Antes da partida, você define o plano que vira a base da IA: mentalidade, foco, gatilhos de substituição (por exemplo, "substituir acima de um limite de fadiga se houver reserva adequado") e respostas a cenários (perdendo, ganhando, com um a menos). Mesmo offline, o time segue o **seu** estilo.

**Níveis de autonomia.** Você escolhe **quanto** a IA pode decidir sozinha, do mais restrito ao mais amplo: apenas emergências; emergências mais o plano pré-jogo; o plano mais a leitura da comissão; ou autonomia quase total. Além do nível, há a **postura** — conservadora (protege o resultado), agressiva (busca a vitória e aceita risco) ou equilibrada.

**A qualidade depende da comissão.** A IA offline é tão boa quanto a comissão técnica que a sustenta. Uma comissão fraca com autonomia alta pode tomar decisões ruins — substituir tarde, não perceber a mudança do adversário, insistir num jogador cansado. Uma comissão de elite com autonomia alta age como um auxiliar confiável — substitui melhor, reorganiza após expulsão, protege o jogador importante e ajusta a marcação.

**Justiça competitiva.** Estar online dá vantagem, mas dentro de limites. A escala é clara: **usuário online rende mais que offline com bom plano, que por sua vez rende mais que offline sem plano**. Um clube com comissão melhor tem IA offline e recomendações melhores. As ações ao vivo têm teto de impacto justamente para que acompanhar seja uma vantagem estratégica, e não uma superioridade absurda sobre quem não pôde entrar.

> **ATENÇÃO:** Entrar offline **sem** um plano definido é o pior dos cenários. Sem gatilhos de substituição, resposta a cenários e uma postura escolhida, a IA age apenas nas emergências mais básicas e deixa vantagens claras passarem em branco. Deixar o plano pronto é o que separa um offline competitivo de um offline penalizado.

> **EXEMPLO:** Dois clubes de força parecida jogam com os donos offline. O primeiro deixou um plano detalhado e tem uma comissão de bom nível: a IA poupa um jogador em risco, recua diante do ponta veloz e segura o resultado. O segundo entrou sem plano e com comissão fraca: a IA mantém o jogador cansado em campo e não reage à pressão adversária. O resultado reflete a diferença de preparação, não sorte.

> **COMO O JOGO AVALIA:** As decisões da IA offline são calculadas a partir do plano que você deixou, do nível de autonomia e da postura escolhidos, da qualidade da comissão técnica e da situação da partida. A IA age de forma conservadora e limitada de propósito, para não anular o valor de acompanhar ao vivo — mas os critérios internos de cada decisão não são exibidos.

### Estratégia

Prepare o **offline como se fosse jogar**. Deixe um plano com gatilhos claros de substituição e respostas a cenários, ajuste o nível de autonomia à confiança que você tem na comissão e escolha a postura conforme a importância do jogo. Invista na comissão técnica: ela é o que transforma a IA offline de um piloto automático básico em um auxiliar confiável quando você não pode estar presente.

---

## 28. Eventos da partida

### Resumo

Tudo o que acontece em campo — gols, finalizações, faltas, cartões, expulsões, lesões, pênaltis, impedimentos, substituições, acréscimos, mudanças de domínio — são **eventos** gerados pelo motor. Nenhum deles é aleatório e gratuito: cada um nasce de fatores de risco reais. Você pode conhecer esses fatores e influenciá-los, mas **não** as probabilidades exatas por trás de cada lance.

> **REGRA:** Todo evento da partida tem uma causa. O jogo registra o motivo de cada acontecimento — o que veio antes, qual ação e qual alerta o precederam — para que o resultado seja sempre explicável. Nada acontece "porque o sistema quis".

### Regras completas

**Gols e finalizações.** Um gol é o desfecho de uma sequência: o time cria volume, gera uma chance, define o tipo de chance, finaliza e a defesa ou o goleiro reage. A conversão depende da qualidade da chance, da finalização e da frieza do jogador, da moral, do tipo de finalização, e, do outro lado, da qualidade do goleiro, da pressão da marcação, do ângulo, da fadiga e do clima. Um time pode ter muitas finalizações e poucos gols se as chances forem de baixa qualidade.

**Faltas, cartões e expulsões.** O risco de cartão cresce com a agressividade da marcação, com jogadores indisciplinados, com o perfil do árbitro e com a situação de um pendurado que segue jogando forte. A expulsão em posições críticas tem impacto especial: um goleiro expulso obriga a colocar o reserva (ou um jogador de linha no gol, se não houver substituição); a saída de um zagueiro força a reorganização defensiva; a de um atacante reduz a pressão ofensiva, mas pode manter a estrutura de trás.

**Lesões.** Uma lesão **não é um evento totalmente independente das suas decisões**. O risco depende da carga e da fadiga, do histórico e do perfil físico do jogador, da idade, da condição do gramado, do contato, do clima e da qualidade da prevenção. Forçar um jogador cansado ou já com dor eleva o risco — e, se as substituições acabaram, uma lesão pode deixar o time com um a menos ou com um jogador limitado em campo.

**Pênaltis e disputas de pênaltis.** O pênalti tem lógica própria, decidida entre batedor e goleiro: do lado do batedor pesam a cobrança, a frieza, a moral, a pressão e a fadiga; do lado do goleiro, o reflexo, a leitura e a confiança; e o contexto (se a cobrança é decisiva, a torcida, o histórico emocional) influencia tudo. Nos mata-matas, quando os 90 minutos não decidem, a sequência é prorrogação e depois disputa de pênaltis.

**Impedimentos, substituições e acréscimos.** Impedimentos anulam chances; substituições, limitadas pelas regras da competição, redesenham o time (ver Cap. 25); e os acréscimos dependem de lesões, substituições, revisões e paralisações — criando tensão no fim.

**Mudanças de domínio.** O controle do jogo passa de um time para o outro ao longo da partida, acompanhando o momentum. Uma substituição ofensiva, um cansaço acumulado e uma torcida empurrando podem inverter quem domina — sem que nada disso garanta o gol.

**Eventos raros.** Gol contra, frango do goleiro, lesão precoce, expulsão boba, pênalti polêmico, golaço e falha grotesca **existem**, mas são raros. Quando acontecem, criam narrativa — e mesmo o azar respeita o contexto: ele é explicado, nunca gratuito.

**Comportamento de fim de jogo.** Os últimos minutos têm lógica própria. Vencendo, o time tende a segurar o resultado, reduzir o risco, gerir o tempo e defender a bola aérea; perdendo, aumenta a presença ofensiva, aposta na bola longa e na pressão, e aceita a transição adversária. O comportamento depende do perfil, da importância do jogo, do saldo e da moral.

**Depois do apito.** A partida não termina em si mesma: ela altera o universo. Um time pequeno que vence um favorito ganha moral, torcida, destaque na imprensa, valorização dos jogadores e reputação; um favorito que perde em casa vê a torcida cobrar, a diretoria pressionar e a imprensa criar crise. E algumas decisões cobram o preço **depois**: forçar um jogador cansado pode ganhar o jogo e aumentar o risco de lesão na rodada seguinte; recuar demais pode irritar a torcida; substituir uma estrela cedo preserva o físico, mas pode gerar insatisfação.

> **ATENÇÃO:** Insistir num jogador desgastado ou com dor para ganhar o jogo de hoje aumenta o risco de lesão e de queda de rendimento nos próximos. A decisão pode valer a pena numa final, mas é uma aposta com consequência real — não um clique sem custo.

> **EXEMPLO:** Um time jovem sofre um gol cedo fora de casa. Com controle emocional baixo, começa a errar mais passes, reduz a agressividade e passa a arriscar cartões; um time experiente, na mesma situação, se reorganiza e reage. O mesmo gol sofrido gera desfechos diferentes conforme a maturidade do grupo — e isso é explicável, não sorteado.

> **COMO O JOGO AVALIA:** O risco de cada evento — a chance de um gol sair, de um cartão surgir, de uma lesão acontecer, de um pênalti ser convertido — é calculado a partir dos fatores de risco descritos aqui e resolvido com uma dose de incerteza controlada. Você conhece e influencia esses fatores (fadiga, agressividade, gramado, perfil do árbitro, qualidade das chances), mas as probabilidades exatas de cada lance permanecem ocultas, para preservar a tensão e a imprevisibilidade do futebol.

### Estratégia

Você não controla os eventos, mas controla os **fatores de risco** que os tornam mais ou menos prováveis. Reduza o risco de lesão administrando a carga e poupando os desgastados; reduza o risco de cartão ajustando a agressividade de um pendurado, sobretudo diante de um árbitro rigoroso; aumente a chance de gol criando chances de qualidade, não apenas volume. E aceite que o azar existe: quando um evento raro decidir contra você, procure o contexto que o explica, porque será sempre possível encontrá-lo.
