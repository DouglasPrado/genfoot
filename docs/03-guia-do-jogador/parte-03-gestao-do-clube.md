# Parte III — Gestão do clube

> **Status:** Rascunho consolidado · **Fontes:** [`../01-game-design/04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md), [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md), [`../01-game-design/01-mundo-persistente-e-clubes.md`](../01-game-design/01-mundo-persistente-e-clubes.md) · **Revisão:** 2026-07-11

No **Grinta** você não comanda apenas uma escalação: você constrói uma instituição de futebol que atravessa temporadas. Um clube é a soma de sua estrutura, de seus funcionários, de sua reputação, de suas finanças, do desempenho em campo e da capacidade de formar e contratar jogadores. Dois clubes podem ter o mesmo dinheiro em caixa e, ainda assim, evoluir de formas completamente diferentes — a diferença está em **onde cada gestor decide investir**.

Esta Parte reúne os capítulos que explicam como o clube cresce (Cap. 8), do que ele é feito (Cap. 9), quem trabalha nele (Cap. 10) e como o dinheiro entra, sai e circula por todo o universo do jogo (Cap. 11). Ao longo dela, você entende a relação de causa e efeito de cada decisão de gestão — sem precisar dos cálculos internos que o motor mantém escondidos para preservar a incerteza.

**Neste guia:**

- [8. Nível e evolução do clube](#8-nível-e-evolução-do-clube)
- [9. Estrutura do clube](#9-estrutura-do-clube)
- [10. Funcionários e comissão técnica](#10-funcionários-e-comissão-técnica)
- [11. Finanças — economia dinâmica](#11-finanças--economia-dinâmica)

---

## 8. Nível e evolução do clube

### Resumo

O nível de um clube **não é um número único**. Ele nasce da combinação entre a estrutura interna (os departamentos e as áreas em que você investe), o desempenho esportivo, a saúde das finanças e a reputação junto à torcida. O tempo ajuda um clube a crescer, mas **não garante** que ele cresça: um clube pode viver uma boa fase e continuar pequeno por dentro. O crescimento é orgânico e deliberadamente lento.

### Regras completas

Todo clube nasce pequeno — baixa reputação, estrutura simples, estádio modesto, torcida reduzida e um elenco equilibrado, geralmente veterano. A partir daí, o clube cresce em camadas, atravessando estágios ao longo das temporadas: **pequeno → emergente → médio → forte → grande → dominante**. Essa subida é intencionalmente difícil. Nenhum clube deve virar gigante em duas temporadas.

Internamente, o clube tem **vários níveis** ao mesmo tempo, e não apenas um. Cada área da estrutura evolui na sua própria escala, e essas áreas se agrupam em núcleos maiores (detalhados no [Cap. 9](#9-estrutura-do-clube)). Um clube pode ter o setor físico e médico ainda básico, a comunicação e a torcida bem desenvolvidas, a gestão em nível intermediário e o mercado e a base num terceiro patamar — tudo isso convivendo. O **nível geral** que você vê é uma leitura do conjunto, com a estrutura interna pesando mais do que qualquer fase passageira.

O "tamanho real" de um clube é a soma de reputação esportiva, reputação financeira, capacidade de formar jogadores, títulos, torcida e estrutura — **nunca apenas do dinheiro em caixa**. É por isso que um clube rico, mas mal administrado, não sobe de patamar automaticamente. Ele precisa transformar recursos em organização.

A reputação, por sua vez, cresce por faixas, da mais local para a mais ampla: **local → regional → nacional → continental → mundial**. Um clube novo pode se tornar rapidamente relevante na sua região sem ainda significar nada no plano global — e essa progressão local já dá uma sensação real de avanço, atrai jogadores da região e melhora patrocínios locais.

> **REGRA:** O clube só cresce de verdade quando a estrutura interna acompanha o desempenho esportivo. Uma sequência de bons resultados não transforma sozinha um clube pequeno em grande — ela precisa ser convertida em estrutura, reputação e finanças sólidas.

> **ATENÇÃO:** Tentar crescer rápido demais é um risco real. Elevar a estrutura acima do que a receita sustenta faz os custos mensais dispararem, obriga a vender jogadores e pode empurrar o clube para uma crise. Crescer é uma escolha com consequências, não um botão de melhoria.

> **EXEMPLO:** Um clube que fez uma campanha campeã, mas negligenciou departamentos e finanças, continua estruturalmente pequeno. Ele está em boa fase e ainda assim vulnerável: quando os resultados oscilarem, terá pouca estrutura para se sustentar. O título é um marco, não uma promoção automática de patamar.

> **COMO O JOGO AVALIA:** O nível geral é uma composição da estrutura interna com desempenho, finanças e reputação, e o "tamanho real" agrega reputações e ativos de várias naturezas. Os pesos exatos de cada componente e o modo como eles se somam permanecem internos, para que o crescimento seja sentido, e não calculado de fora.

### Estratégia

Decida cedo **que tipo de clube você quer ser** e concentre o investimento nas áreas que sustentam esse projeto — é isso que dá identidade ao seu clube (ver [Cap. 9](#9-estrutura-do-clube)). Evite espalhar recursos em tudo ao mesmo tempo e evite subir de patamar antes de ter receita para bancar a manutenção. Um crescimento mais lento, mas sustentável, quase sempre vence um crescimento acelerado e frágil. E lembre-se: você nunca perde o clube por resultados ruins — mesmo em crise, a reconstrução faz parte da experiência.

---

## 9. Estrutura do clube

### Resumo

A estrutura é aquilo de que o clube é feito: departamento médico, preparação física, treinamento, análise de desempenho, olheiros, categorias de base, comunicação, diretoria, gestão financeira e as instalações físicas. Cada uma dessas áreas tem um **nível próprio**, e o nível de cada área muda o modo como o clube funciona. Investir aqui é decidir a identidade e a competência do seu clube.

### Regras completas

**A escala de nível das áreas.** Cada área evolui numa escala única, do mais simples ao mais completo:

| Nível | O que significa |
| --- | --- |
| 1 | Básico e limitado (amador) |
| 2 | Funcional (pequeno organizado) |
| 3 | Competitivo (médio) |
| 4 | Avançado (grande estruturado) |
| 5 | Elite |

Essas áreas não vivem soltas: elas são subdivisões de **seis grandes núcleos** que resumem tudo o que um clube faz. Entender os núcleos ajuda a enxergar onde cada decisão bate:

- **Técnico** — treino, evolução tática dos jogadores, leitura de jogo, plano de partida e a qualidade das sugestões durante os jogos.
- **Físico e médico** — condição física, controle de desgaste, prevenção, lesões, recuperação e longevidade dos atletas.
- **Mental e disciplinar** — moral, controle de pressão, disciplina, liderança, integração e estabilidade emocional do elenco.
- **Mercado e base** — olheiros, categorias de base, descoberta e proteção de jovens, contratos e oportunidades de mercado.
- **Gestão e diretoria** — orçamento, folha, dívida, negociação, contratação de funcionários, licenciamento e planos de recuperação.
- **Comunicação e torcida** — relação com torcida e imprensa, patrocínio, narrativa do clube, proteção de jovens e gestão de ídolos.

**O que cada área faz.** Abaixo, o efeito prático de subir o nível das principais áreas:

- **Diretoria** — melhora a qualidade e a duração dos contratos, a negociação salarial, o acesso a jogadores melhores e a organização financeira. Diretoria fraca fecha contratos curtos e paga mais caro por menos.
- **Comissão técnica** — acelera a evolução técnica e tática dos jogadores, melhora a leitura de jogo e a formação de jovens, e eleva a qualidade das decisões durante a partida.
- **Preparação física** — melhora resistência e recuperação, controla o desgaste em calendários apertados e prolonga a vida útil de alguns atletas.
- **Equipe médica** — reduz lesões evitáveis, encurta recuperações, diminui recaídas e melhora o diagnóstico.
- **Olheiros** — melhoram a precisão dos relatórios, a chance de achar bons jovens, a leitura de potencial e a identificação de riscos ocultos.
- **Comunicação** — controla narrativa: reduz o impacto de crises, protege o projeto esportivo, ampara jovens sob pressão e estabiliza a relação com a torcida.
- **Categoria de base** — aumenta a quantidade e a qualidade dos jovens formados, a chance de revelar jogadores especiais e o preparo com que eles chegam ao profissional.
- **Centro de treinamento (CT)** — melhora o desenvolvimento geral do elenco, a evolução técnica e física, a recuperação e o entrosamento.
- **Estádio** — aumenta receita, mando de campo, atratividade e satisfação da torcida.
- **Análise de desempenho** — melhora relatórios, identifica pontos fracos, antecipa quedas de rendimento e lê melhor o adversário.

**Instalações físicas são diferentes.** Estádio, centro de treinamento e academia **não seguem a mesma lógica** de "clicar e melhorar de nível". Elas são tratadas de forma granular: têm propriedade (própria, alugada, concedida, compartilhada), condição de conservação, capacidade, disponibilidade e conformidade (licenças e certificações). O clube pode até ter acesso a uma instalação de alto padrão sem ser dono dela, ou ser dono de uma estrutura que opera abaixo da própria capacidade porque está deteriorada ou sem manutenção. Uma obra de infraestrutura percorre um processo de várias etapas, do estudo de viabilidade à entrada em operação, e pode sofrer atraso, sobrecusto ou mudança de escopo pelo caminho.

**A estrutura como árvore de investimento.** Na tela de estrutura, as áreas se organizam em ramos temáticos — Administração, Futebol, Saúde, Base, Marca e Infraestrutura. Cada item exibe nível atual, custo de melhoria, tempo, custo mensal, benefícios, requisitos e impacto. É essa árvore que você percorre ao decidir o rumo do clube.

> **REGRA:** Cada área tem seu próprio nível, e melhorar qualquer uma custa dinheiro de imediato, tempo de implantação e uma manutenção mensal recorrente. Estrutura melhor é estrutura mais cara de manter — nunca é apenas um upgrade instantâneo.

> **ATENÇÃO:** Uma obra de infraestrutura **não termina só porque a temporada acabou**: ela continua pelos seus próprios prazos e atravessa a virada de temporada, afetando capacidade do estádio, treinos e receita enquanto durar. E um CT com agenda sobrecarregada — tentando treinar todas as categorias ao mesmo tempo — perde qualidade nas sessões que excedem sua capacidade, a menos que você defina prioridades.

> **EXEMPLO:** Um clube com o núcleo físico e médico ainda básico e a comunicação bem desenvolvida sente seus jogadores cansarem e se machucarem mais, mas administra crises com desenvoltura e protege o projeto na imprensa. Outro clube, com o inverso, tem atletas bem cuidados e sofre mais com pressão e narrativa negativa. São dois clubes do mesmo tamanho aparente, com pontos fortes opostos.

> **COMO O JOGO AVALIA:** O nível que você vê em cada área é o nível **nominal**. A eficiência **real** pode ficar abaixo dele quando falta orçamento, quando a área está sobrecarregada, quando há crise ou quando os profissionais não são adequados àquela função. Os fatores que rebaixam a eficiência existem, mas a conta exata permanece interna.

### Estratégia

Escolha um caminho de crescimento e invista nele de forma coerente. Quatro estilos aparecem naturalmente:

| Estilo | Investe em | O que ganha |
| --- | --- | --- |
| **Formador** | Base, olheiros, comissão técnica, CT | Revela e vende jogadores, depende menos do mercado; demora mais para ganhar títulos |
| **Comprador** | Diretoria, finanças, comunicação, estádio | Melhora receita e contratações, cresce pelo mercado; corre risco financeiro |
| **Competitivo** | Comissão técnica, preparação física, equipe médica, análise | Rende mais no presente e reduz lesões; pode sofrer no futuro se não formar jovens |
| **Popular** | Estádio, comunicação, marketing, torcida | Cresce receita e aguenta melhor as crises; precisa converter isso em futebol |

Nenhum caminho é o "certo" — cada um tem vantagens, custos e riscos. O erro mais comum é subir uma área cara antes de ter receita para mantê-la. Cresça respeitando os requisitos (dinheiro, reputação, nível mínimo do clube e estrutura compatível), que existem justamente para impedir que você pule etapas.

---

## 10. Funcionários e comissão técnica

### Resumo

Os funcionários são as pessoas que fazem o clube funcionar: técnico, auxiliares, preparadores, médicos, olheiros, analistas, coordenadores de base e diretores. Eles **não dão vantagens mágicas** — o que fazem é ajudar o clube a extrair melhor o talento que já existe. E há um efeito central que vale destacar desde já: **a qualidade do staff altera a qualidade da informação que chega até você**.

### Regras completas

**Cargos e especialidades.** Cada cargo tem atributos próprios e cuida de uma frente do clube. Entre os cargos possíveis estão técnico, auxiliar técnico, preparador físico, médico, fisiologista, psicólogo, analista de desempenho, olheiro, coordenador da base, diretor de futebol, diretor financeiro e diretor de comunicação. Um bom médico diagnostica melhor e reduz recaídas; um bom olheiro lê potencial e risco com mais precisão; um bom auxiliar sugere substituições e correções no tempo certo.

**Funcionários como multiplicadores.** O efeito de um funcionário aparece como um multiplicador de qualidade sobre a área em que ele atua. A estrutura não cria talento do nada: ela faz o talento existente render mais perto do seu teto. Um jovem com bom potencial se aproxima muito mais desse potencial num clube com comissão técnica, CT e base fortes do que num clube improvisado. O mesmo princípio vale no outro extremo da carreira: boa equipe médica, boa preparação física e boa comunicação prolongam e protegem veteranos.

**Cargo não é a mesma coisa que responsabilidade.** Um funcionário ocupa um cargo e recebe responsabilidades com limites definidos. O diretor esportivo **prepara** uma negociação, mas os compromissos acima de certo porte dependem da sua aprovação; o analista **produz recomendações**, mas não muda a tática sozinho. A delegação é graduada — do simples preparar e recomendar até executar dentro de limites e aprovar ações de baixo risco.

**Sobrecarga, ausência e evolução.** Funcionários podem ficar sobrecarregados, indisponíveis ou ausentes, e isso atrasa análises, reduz a qualidade do acompanhamento e pode exigir um substituto. Excesso de lesionados, de relatórios ou de negociações ao mesmo tempo pesa sobre a área responsável. Contratar mais gente alivia a carga, mas aumenta a folha. Com o tempo, funcionários evoluem, ganham experiência e podem ser promovidos — ou regridem por idade e desatualização, e eventualmente se aposentam.

**Perfis.** Além do nível, um funcionário tem um **perfil**, que adiciona estratégia sem depender só de número. Uma equipe médica pode ser preventiva ou focada em recuperação rápida; uma comunicação pode ser popular, institucional ou agressiva; uma comissão técnica pode ser ofensiva, defensiva, formadora de jovens ou pragmática. O perfil certo para o seu projeto vale tanto quanto o nível.

> **REGRA:** A qualidade do staff altera a qualidade da **informação** entregue a você. Uma comissão superior detecta problemas antes, apresenta recomendações melhores e interpreta melhor o adversário e o elenco; um staff inferior entrega informação incompleta ou imprecisa. Ver também a Parte VI (tática e partidas).

> **ATENÇÃO:** Delegar **não** significa perder visibilidade. Você deve sempre saber quem recebeu a tarefa, que autoridade tem, o que foi feito e qual foi o resultado. As recomendações podem ser ignoradas, mas as consequências continuam sendo suas. E deixar uma área crítica sem responsável degrada a operação — o jogo sinaliza a lacuna, mas a qualidade cai.

> **EXEMPLO:** Diante de um mesmo jogo, uma comissão fraca avisa apenas "seu time parece cansado". Uma comissão forte diz algo acionável: aponta por qual lado o adversário está concentrando os ataques, qual dos seus jogadores está com pouca energia e já pendurado, e recomenda a substituição específica. A situação é a mesma; o que muda é a nitidez da informação.

> **COMO O JOGO AVALIA:** O "multiplicador" de um funcionário não é um número fixo colado ao cargo. Ele é o efeito que **emerge** das competências, da autonomia, da carga de trabalho e da disponibilidade daquele profissional, ainda modulado por orçamento e crise. Você percebe o resultado — melhores decisões, melhor informação — sem ver a conta que o produz.

### Estratégia

Contrate pensando no seu projeto, não apenas no nível mais alto disponível. Um perfil compatível com o estilo do clube costuma render mais do que um nome caro e desalinhado. Cuide da carga de trabalho: um único médico para um elenco cheio de lesionados vira gargalo. E aproveite que a comissão técnica também comanda as decisões automáticas quando você está offline — quanto melhor ela for, mais conservadora e acertada será a IA que assume o clube na sua ausência (substituições, reorganização após expulsão, proteção do jogador importante).

---

## 11. Finanças — economia dinâmica

### Resumo

As finanças são o motor que gera as histórias do clube. Não se trata só do saldo em caixa: é um ecossistema de receitas, despesas, salários, dívidas, contratos e mercado, ligado a uma **economia dinâmica** que se ajusta ao mundo inteiro. Cada jogador é, ao mesmo tempo, um ativo esportivo, emocional e financeiro. E o maior risco de qualquer clube atende por um nome: **a folha salarial**.

### Regras completas

**Receitas.** O clube arrecada de várias fontes — bilheteria, sócio-torcedor, patrocínio, direitos de transmissão, premiações, venda de jogadores, produtos, participação em competições e formação. A bilheteria é **dinâmica**: depende do tamanho e do humor da torcida, da capacidade e conservação do estádio, do preço do ingresso, do adversário, do momento do time e da importância do jogo. Cobrar mais caro pode esvaziar o estádio; cobrar barato enche as arquibancadas, levanta a moral e rende menos por pessoa. É uma decisão de gestão a cada rodada.

**Despesas.** Saem do caixa salários de jogadores e de comissão técnica, bônus, manutenção das instalações, viagens, departamento médico, base, olheiros, comissões de empresários, impostos, dívidas, juros, multas, rescisões e as próprias contratações. A folha salarial é a maior fonte de risco: uma folha alta significa time forte agora, mas pressão financeira depois e a necessidade de ganhar títulos ou vender para se sustentar.

**Perfis econômicos.** Ao longo das temporadas, o clube assume um perfil econômico que muda conforme a gestão — gigante, médio estável, formador, endividado, emergente, tradicional decadente ou pequeno regional. Esse perfil é a **situação atual** e convive com a identidade de nascença do clube: um "clube formador" de identidade pode estar hoje "endividado" de situação, sem contradição.

**Mercado com temperatura.** O mercado tem oferta, demanda e "temperatura". Num mercado quente, os clubes disputam atletas, os salários sobem e os empresários pedem mais; num mercado frio, compra-se menos e os livres aceitam menos. Tudo isso opera por posição — se faltam bons zagueiros e muitos clubes precisam de um, o zagueiro valoriza. O valor de um jogador nunca é só o "overall": ele reúne qualidade atual, potencial, fama, escassez da posição e interesse de clubes, descontando risco de lesão, instabilidade, pouco tempo de contrato e a pressão financeira de quem vende.

**Contratos e empresários.** Um contrato é muito mais que um salário: envolve duração, bônus, luvas, multa, comissão de empresário e o interesse do jogador em renovar. As negociações são **parcialmente emocionais**: a torcida que ama o ídolo trava a venda; o jogador que brigou com o técnico sai por menos; o empresário agressivo vaza propostas e pressiona. Não olhe só a planilha.

**Dívida, punição e crise.** Dívida controlada permite crescer; dívida alta trava o orçamento, come a receita e força vendas. Quando o clube é mal gerido, o jogo reage: atraso salarial derruba a moral e aciona empresários; dívida fiscal pode gerar multa, bloqueio de inscrição e, em casos extremos, perda de pontos; folha acima do orçamento obriga cortes. A situação financeira evolui por estágios: **estável → atenção → pressão → crise → insolvência → reestruturação**. Mesmo na pior fase, você continua no clube — mas passa a trabalhar sob restrições, e **não existe resgate automático** sempre que se gasta mal.

**Disciplina contábil.** Ter dinheiro em caixa não é o mesmo que poder gastá-lo. O clube separa caixa disponível, valores restritos a uma finalidade, orçamento autorizado e compromissos já assumidos. Possuir caixa não significa ter autorização orçamentária; ter orçamento aprovado não significa que o dinheiro já esteja disponível. Receitas incertas nunca são tratadas como dinheiro garantido — o planejamento trabalha com cenários (esperado, conservador, otimista, com acesso, com permanência, com rebaixamento).

**Economia dinâmica do universo.** Este é o ponto que torna o mundo vivo: preços, salários, quantidade de jogadores e circulação de dinheiro **se ajustam** ao número de clubes, de usuários, de atletas ativos, às aposentadorias e à demanda. Nada é gerado isoladamente. Para que um clube novo não precise disputar preço com os gigantes, o mercado é segmentado em camadas (mercado geral, mercado regional/iniciante, base local e empréstimos), e as receitas, os custos e os upgrades são proporcionais ao estágio da liga em que o clube compete. O sistema controla ainda a inflação, deixando salários e preços subirem quando há dinheiro sobrando e barateando o mercado quando falta — de modo que a economia nunca esvazie nem exploda.

> **REGRA:** A economia é **dinâmica**. Preços, salários, quantidade de jogadores e dinheiro em circulação se ajustam continuamente ao tamanho e à saúde do mundo, evitando tanto o mercado vazio quanto a inflação destrutiva. O que é caro ou barato hoje é consequência do estado do universo, não um valor fixo.

> **ATENÇÃO:** A folha salarial é o seu maior risco financeiro. E cuidado com compromissos que não somem: uma **obrigação de compra** acionada (por número de partidas, acesso ou permanência) vira dívida e existe mesmo que falte caixa — diferente de uma simples opção, que você apenas deixa de exercer. Assinar não é o fim da conta.

> **EXEMPLO:** O ciclo negativo começa pequeno e se retroalimenta: má gestão gera dívida, a dívida obriga a vender jogadores, a queda técnica traz resultados ruins, a torcida esvazia o estádio, a receita cai e a dívida cresce de novo. O ciclo positivo é o espelho: boa campanha atrai torcida, que melhora bilheteria e patrocínio, que ampliam o orçamento, que permite jogadores melhores e mais chances de título.

> **COMO O JOGO AVALIA:** A saúde financeira do clube resume, num indicador, a combinação de caixa, dívida, folha, receita recorrente, resultado esportivo, compromissos futuros, pressão da torcida e confiança da diretoria. As faixas de situação (do saudável ao colapso) guiam os efeitos, mas o cálculo que posiciona o clube em cada faixa permanece interno — inclusive para os clubes controlados pelo jogo, que obedecem às mesmas regras e não podem criar dinheiro do nada.

### Estratégia

Pense no equilíbrio, não no saldo. Antes de assinar qualquer contratação, pese a **capacidade financeira real**: orçamento, caixa, parcelas futuras, folha, bônus e comissões — uma proposta que o caixa não sustenta é irresponsável mesmo quando o jogador é ótimo. Use a base e as vendas como fonte de receita se o seu projeto é formar; use a torcida e o estádio se o seu projeto é popular. E aproveite a economia dinâmica a seu favor: como clube novo, você tem acesso a um mercado compatível com o seu orçamento e a receitas proporcionais ao seu estágio — dá para financiar a evolução dentro da própria camada, sem tentar comprar como um gigante.
