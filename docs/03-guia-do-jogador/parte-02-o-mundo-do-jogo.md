# Parte II — O mundo do jogo

> **Status:** CANÔNICO · **Fontes:** [`../01-game-design/01-mundo-persistente-e-clubes.md`](../01-game-design/01-mundo-persistente-e-clubes.md); [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md); [`../01-game-design/07-inteligencia-artificial.md`](../01-game-design/07-inteligencia-artificial.md); [`../01-game-design/12-selecoes-e-calendario-internacional.md`](../01-game-design/12-selecoes-e-calendario-internacional.md) · **Revisão:** 2026-07-11

O seu clube não vive isolado. Ele existe dentro de um **mundo compartilhado, contínuo e vivo**, que segue funcionando com ou sem você. Esta Parte explica como esse mundo se comporta: por que ele nunca reinicia, como o tempo passa e o calendário se organiza, e como os clubes conduzidos pela inteligência do jogo agem ao seu redor. Entender o mundo é entender o terreno onde todas as suas decisões vão repercutir.

---

## 5. Mundo persistente

O mundo do Grinta é **único e não reinicia**. Ele não para quando você fecha o jogo, não zera ao fim de uma temporada e não recomeça quando um novo usuário entra. Tudo o que acontece fica registrado e passa a fazer parte da história.

### Resumo

- O mundo **continua evoluindo** mesmo com você offline: partidas acontecem, jogadores treinam e envelhecem, o mercado se movimenta e eventos ocorrem.
- As temporadas se sucedem sem apagar o passado. Títulos, ídolos, recordes e rivalidades **permanecem**.
- Novos usuários entram a qualquer tempo, mesmo em temporadas avançadas, sem quebrar as competições em andamento.
- Clubes crescem e declinam ao longo do tempo, formando um ecossistema em constante mudança.

### Regras completas

> **REGRA:** O mundo é persistente e **nunca é reiniciado**. Não existe "recomeço geral" que apague conquistas. O universo guarda o histórico — temporadas, campeões, artilheiros, maiores transferências, ídolos, rebaixamentos, títulos, rivalidades, crises e a evolução financeira dos clubes.

Quando você está offline, o mundo cobre a **operação** do seu clube: a inteligência do jogo administra o básico, o clube segue disputando o campeonato, os jogadores treinam e evoluem, as partidas acontecem normalmente, o mercado continua ativo e eventos podem surgir. O que fica reservado a você são as **decisões estratégicas profundas** — a inteligência do clube mantém a máquina rodando, mas não substitui o seu planejamento de longo prazo.

Como o universo é contínuo, um usuário pode entrar na primeira temporada ou muito depois, quando clubes antigos já cresceram bastante. O mundo resolve isso oferecendo **caminhos reais de evolução** a quem chega tarde, sem apagar o mérito dos veteranos:

- clubes novos entram em **divisões e ligas iniciais** compatíveis com o seu tamanho, competindo contra clubes parecidos;
- a **reputação cresce em camadas**, da mais local para a mais ampla: **Local → Regional → Nacional → Continental → Mundial**. Um clube novo pode crescer rápido no plano local mesmo sendo ainda irrelevante no plano global — o que dá sensação real de progresso;
- o mundo gera **oportunidades naturais** que o clube pequeno pode aproveitar: um jovem rejeitado por um clube grande, uma crise financeira em um clube maior, um veterano que aceita reduzir salário, um patrocinador regional que apoia um emergente.

> **REGRA:** O usuário novo não recebe igualdade imediata com os clubes antigos, mas recebe um **caminho justo, protegido e divertido** para crescer. A entrada tardia dá **viabilidade, não equiparação artificial** — não há vantagem oculta por ser um clube novo.

Uma consequência central da persistência já foi antecipada na Parte I, e vale repetir aqui porque define a sua relação com o mundo:

> **REGRA:** Você **não pode ser demitido**. Mesmo em rebaixamento, crise financeira ou insolvência, você continua no clube. A pressão da diretoria e da torcida existe, mas atua sobre a sua **autonomia**, nunca sobre a sua **permanência**.

Diante de má gestão ou crise, a diretoria pode restringir suas decisões — exigir aprovação para gastos, baixar limites de orçamento, bloquear novas obrigações, cobrar vendas e impor metas de recuperação. Ou seja, você pode **perder autonomia e operar sob intervenção**, mas nunca perde o clube. Uma boa gestão faz o caminho inverso: amplia autonomia, orçamento e confiança.

> **ATENÇÃO:** Os clubes **sem usuário** (conduzidos pela inteligência do jogo) não têm a mesma proteção. Em situação extrema, eles podem falir, fundir-se, mudar de identidade ou ser substituídos — mas isso é sempre **administrativo e ocorre entre temporadas**, nunca durante a competição, e sempre preservando os registros históricos. Já o **clube de um usuário nunca desaparece**: em crise, ele entra em recuperação, não em encerramento.

> **COMO O JOGO AVALIA:** O equilíbrio do mundo é recalculado continuamente. A geração de jogadores, a circulação de dinheiro, os salários e os preços se ajustam ao número de clubes, à quantidade de jogadores ativos e livres, às aposentadorias, à demanda por posição e à idade média do universo. Isso mantém a **economia dinâmica** — evitando tanto o mercado vazio quanto a inflação destrutiva. Você percebe os efeitos (mais ou menos jogadores disponíveis, preços subindo ou caindo), mas os cálculos por trás desse balanceamento permanecem ocultos.

### Estratégia

Jogue pensando que o relógio **nunca para**. Ausências longas têm custo: decisões estratégicas ficam paradas enquanto o resto do mundo avança. Se você vai se ausentar, deixe o clube preparado — formação definida, planejamento em dia e, quando fizer sentido, automações configuradas.

Aproveite também a lógica da **reputação por faixas**. Não se compare cedo demais com os gigantes globais: mire primeiro em dominar o cenário local e regional. Cada faixa conquistada aumenta a torcida, melhora patrocínios locais e faz jogadores da região passarem a aceitar suas propostas — degraus concretos rumo ao crescimento nacional e, mais tarde, continental.

---

## 6. Tempo e calendário

O tempo do Grinta é organizado pela **temporada**, que funciona como o relógio principal do jogo. Entender as fases da temporada e o calendário é entender **quando** cada coisa pode acontecer — e quando você precisa agir.

### Resumo

- Cada temporada passa por **sete fases**, e cada fase libera tipos diferentes de acontecimentos.
- O **calendário** é montado no início da temporada e organiza rodadas, janelas de transferência, períodos de descanso, datas de seleções, entrada de jovens da base e premiações.
- As rodadas são simuladas em **horários fixos**; você atua nos intervalos entre elas.
- Ao virar, a temporada **recalcula o mundo**: não é só "passar o ano", é o mundo reagindo ao que aconteceu.

### Regras completas

A temporada avança por sete fases, nesta ordem, cada uma com o seu clima e os seus eventos típicos:

| Fase | O que acontece |
| --- | --- |
| **Pré-temporada** | Amistosos, montagem do elenco, inscrições e definição dos objetivos da diretoria. |
| **Início dos campeonatos** | Adaptação dos jogadores, primeiras cobranças e construção de entrosamento. |
| **Meio da temporada** | Lesões, convocações, crises, mercado aquecido e desgaste acumulado. |
| **Reta final** | Pressão por título, briga contra o rebaixamento e moral instável. |
| **Fim da temporada** | Premiações, aposentadorias, renovações e balanço financeiro. |
| **Pós-temporada / transição** | Férias, evolução e regressão dos jogadores, trabalho de base e olheiros, mudanças de clube. |
| **Nova temporada** | Contexto da nova temporada, com novas expectativas de diretoria e torcida. |

A transição de uma fase para a outra é guiada por **marcos do calendário** — a primeira rodada oficial abre o Início; ao cumprir o primeiro terço das rodadas, entra-se no Meio; o último terço marca a Reta final; e assim por diante. Não é um número fixo de dias, e sim o andamento real da competição.

O **calendário da temporada** é gerado no começo do ciclo e reúne tudo que tem data:

- **rodadas** (as datas das partidas);
- **janelas de transferência** (os períodos em que se pode negociar);
- **datas de seleções** (quando atletas podem ser convocados);
- **períodos de descanso**;
- **entrada de jovens da base**;
- **data das premiações**.

Cada data pode conter não só jogos, mas treinos, viagens, eventos de imprensa, eventos de diretoria e acontecimentos pessoais dos jogadores. Como cada atleta é único, o calendário não afeta só o placar: ele mexe com desgaste, moral, foco, vida pessoal e evolução.

> **REGRA:** As rodadas são simuladas em **horários fixos**. Você **não joga a partida manualmente** — gerencia nos intervalos entre as rodadas, escalando, ajustando tática, treinando, negociando e planejando. Quando a rodada chega, a partida é simulada, com ou sem você online.

> **ATENÇÃO:** As **janelas de transferência** e os **períodos de inscrição** têm começo e fim. Fora deles, o mercado e as listas ficam congelados. Contratar um jogador **não garante** que ele esteja imediatamente apto a atuar: uma negociação concluída fora do prazo pode deixá-lo sem inscrição até a próxima janela. Planeje suas contratações dentro das janelas certas.

Ao encerrar, a temporada dispara o que se pode chamar de **motor de virada**: o mundo fecha as tabelas, define campeões, rebaixados e classificados, distribui premiações, atualiza reputações, calcula a evolução e a regressão dos jogadores, processa aposentadorias e eventos pessoais, atualiza contratos e finanças, promove jovens da base, gera novos jogadores e, por fim, monta o calendário e as expectativas da temporada seguinte.

> **REGRA:** O fim de temporada é o momento em que o **mundo reage ao que aconteceu**. Ele não apaga nada: promoções, rebaixamentos, aposentadorias, evolução e novos jogadores são consequências do que foi vivido, e passam a integrar o histórico permanente.

> **COMO O JOGO AVALIA:** A evolução de cada jogador ao fim da temporada é **multidimensional** e individual — nunca um simples "+2 no geral". O jogo considera idade, minutos jogados, qualidade dos treinos, nível das competições disputadas, pressão enfrentada, lesões, moral, personalidade e história de vida. Por isso um jovem reserva pode evoluir no treino sem brilhar em campo, e um veterano pode perder físico enquanto ganha liderança. Você vê o resultado dessas mudanças, mas não os pesos que as produziram.

### Estratégia

Leia a temporada como uma **narrativa com ritmo**: a adaptação do início, o desgaste e as crises do meio, a pressão da reta final. Antecipe-se a cada fase. Use a **pré-temporada** para preparar o elenco e definir a tática antes que os pontos comecem a valer. Cuide do **desgaste** no meio da temporada, quando lesões e convocações reduzem seu elenco. E administre a **moral** na reta final, quando a pressão sobe.

> **EXEMPLO:** Você quer reforçar o elenco, mas a janela de transferências só abre no meio da temporada. Se esperar para agir apenas quando a necessidade aparecer, pode encontrar a janela fechada e ficar preso à sua opção atual por várias rodadas. Planejar as contratações em torno das datas do calendário — e não das urgências do momento — é o que separa a gestão reativa da gestão preparada.

Trate a **virada de temporada** como um marco de planejamento, não como uma pausa. É quando contratos vencem, jovens sobem da base, o orçamento é revisto e novas metas são definidas. Chegar a esse momento com um plano — quem renovar, quem vender, onde investir — vale mais do que qualquer decisão tomada às pressas no meio do ciclo.

---

## 7. Clubes controlados pela IA

Nem todos os clubes do mundo têm um usuário no comando. Muitos são conduzidos pela **inteligência do jogo** — e eles não são meros enfeites: contratam, vendem, treinam, competem e evoluem, agindo como adversários e parceiros de mercado de verdade.

### Resumo

- Clubes sem usuário completam as competições e mantêm o mundo cheio e disputado.
- Eles **tomam decisões reais**: contratações, vendas, treinos, renovações, investimento em estrutura e escolhas dentro das partidas.
- Cada um age conforme a sua **identidade** e os seus recursos — não existem dois clubes iguais.
- Eles respeitam as mesmas regras que você: orçamento, contratos e regulamento valem para todos.

### Regras completas

Os clubes conduzidos pela inteligência do jogo agem em várias frentes. No dia a dia, eles **contratam e vendem jogadores**, **renovam contratos**, **treinam e desenvolvem** o elenco, **investem na estrutura**, **definem objetivos** e **enfrentam dificuldades financeiras** como qualquer outro clube. Dentro das partidas, eles **escalam, ajustam a tática e fazem substituições**.

O comportamento de cada clube nasce da sua **identidade**. Um clube formador prioriza jovens; um clube grande e imediatista busca resultado agora e tolera mais dívida; um clube conservador protege o patrimônio. Essas diferenças de perfil fazem cada clube agir de um jeito, o que dá variedade e imprevisibilidade ao mundo.

> **REGRA:** Os clubes da inteligência do jogo **respeitam as mesmas regras** que você — orçamento, contratos, inscrições e regulamento. Eles não recebem dinheiro secreto nem vantagem escondida. A diferença entre um clube forte e um fraco está na **qualidade das decisões**, nunca na permissão de ignorar as regras.

A competência de um clube conduzido pela inteligência do jogo depende do **nível da sua estrutura e do seu staff**, exatamente como no seu clube. Uma diretoria melhor negocia melhores contratos, protege o patrimônio e identifica oportunidades; uma diretoria fraca faz contratos ruins, vende barato e contrata por impulso. Uma comissão técnica melhor prepara melhor o elenco e reage melhor dentro das partidas.

> **COMO O JOGO AVALIA:** Toda decisão desses clubes considera o **contexto** (situação de jogo, finanças, elenco), o **perfil** do clube (sua identidade e prioridades) e as **consequências** de cada opção, sempre com trade-offs reais. Clubes melhores **erram menos**; clubes piores **erram mais**. Os cálculos exatos que produzem cada escolha ficam ocultos — você observa as decisões e seus efeitos, não a conta por trás delas.

Esses clubes também são fundamentais quando você está **offline**. É a inteligência do seu próprio clube que assume as decisões essenciais na sua ausência:

> **REGRA:** Com você offline, a inteligência do clube assume o essencial de forma conservadora — substituir lesionados e jogadores exaustos, reorganizar a equipe após uma expulsão, evitar lesões graves, corrigir uma formação inválida e fazer ajustes básicos. Ela **respeita as configurações e o planejamento** que você deixou, mas não tem a profundidade estratégica de um usuário atento em tempo real.

> **ATENÇÃO:** A inteligência do clube cobre a operação, não a estratégia. Ela mantém o time competindo, mas dificilmente fará a leitura fina que você faria acompanhando o jogo ao vivo. Quanto melhor a sua **comissão técnica**, melhores serão essas decisões automáticas — mais um motivo para investir no staff. Quanto pior a comissão, mais o clube demora a reagir e mais insiste em escolhas ruins.

Na virada de temporada, quando você está ausente, a inteligência do clube pode processar efeitos automáticos, mas com **limites de autoridade**: ela **não** assume grandes dívidas, **não** vende jogadores-chave e **não** altera a identidade do clube sem a sua autorização. As decisões estruturais ficam preservadas para quando você retornar.

### Estratégia

Encare os clubes da inteligência do jogo como **adversários e parceiros legítimos**. No mercado, eles não aceitam qualquer proposta: recusam ofertas absurdas, cobram valor justo, percebem urgência e protegem os próprios jovens. Isso significa que negociar bem com eles exige leitura de contexto — um clube em crise financeira tende a aceitar vender; um clube que não precisa vender vai resistir.

> **EXEMPLO:** Você quer contratar o artilheiro jovem de um clube conduzido pela inteligência do jogo. Se esse clube está bem financeiramente e o jogador tem contrato longo, ele recusará propostas modestas — o valor percebido do atleta é alto. Meses depois, uma crise financeira nesse mesmo clube pode abrir a janela: agora ele **precisa** vender, e a sua proposta ganha força. Ler o momento do outro clube vale mais do que insistir na mesma oferta.

Por fim, use os clubes conduzidos pela inteligência do jogo para calibrar suas próprias ambições. O nível médio deles reflete a força da sua divisão: dominar com folga é sinal de que talvez seja hora de subir; sofrer demais indica que faltam ajustes no elenco ou na tática antes de mirar mais alto.
