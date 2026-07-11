# GDD Overview — Grinta

> **Status:** Rascunho consolidado · **Fontes:** chats/organizacao-de-pensamentos.md · **Revisão:** 2026-07-10

Este documento é o mapa raiz do Game Design de **Grinta**, um manager de futebol online no espírito de jogos como Brasfoot, porém mais profundo, dinâmico e persistente. Ele amarra todos os sistemas do jogo em uma visão única e serve como ponto de entrada: cada bloco resume um sistema e aponta para o documento irmão onde o detalhe é aprofundado. É panorâmico por natureza — resume, não esgota.

## Sumário

- [Princípio Central do Design](#princípio-central-do-design)
- [1. Visão do Jogo](#1-visão-do-jogo)
- [2. Mundo Online Persistente](#2-mundo-online-persistente)
- [3. Clube (Núcleo)](#3-clube-núcleo)
- [4. Estrutura Física do Clube](#4-estrutura-física-do-clube)
- [5. Comissão Técnica](#5-comissão-técnica)
- [6. Diretoria](#6-diretoria)
- [7. Jogadores Únicos](#7-jogadores-únicos)
- [8. Geração de Jogadores](#8-geração-de-jogadores)
- [9. Economia](#9-economia)
- [10. Mercado de Transferências](#10-mercado-de-transferências)
- [11. Contratos](#11-contratos)
- [12. Crescimento dos Clubes e Entrada de Novos Usuários](#12-crescimento-dos-clubes-e-entrada-de-novos-usuários)
- [13. Base e Formação](#13-base-e-formação)
- [14. Campeonatos e Temporadas](#14-campeonatos-e-temporadas)
- [15. Simulação de Partida](#15-simulação-de-partida)
- [16. Online vs Offline e Sistema de Decisão](#16-online-vs-offline-e-sistema-de-decisão)
- [17. Tática](#17-tática)
- [18. Inteligência Artificial](#18-inteligência-artificial)
- [19. Moral, Torcida e Narrativas](#19-moral-torcida-e-narrativas)
- [20. Eventos Externos](#20-eventos-externos)
- [21. Reputação](#21-reputação)
- [22. Fim de Temporada](#22-fim-de-temporada)
- [23. Notificações](#23-notificações)
- [24. Arquitetura Lógica do Core](#24-arquitetura-lógica-do-core)
- [25. Regras Transversais de Consistência](#25-regras-transversais-de-consistência)
- [Estrutura Final em Blocos](#estrutura-final-em-blocos)
- [Mapa de Documentos Irmãos](#mapa-de-documentos-irmãos)

---

## Princípio Central do Design

> **O usuário não controla apenas uma escalação. Ele constrói uma instituição de futebol ao longo do tempo.**

Vencer jogos importa, mas o verdadeiro jogo está em equilibrar dimensões que competem entre si ao longo das temporadas: resultado imediato, formação de elenco, caixa financeiro, estrutura do clube, moral do grupo, relação com a torcida, mercado, base, comissão técnica e crescimento sustentável.

Toda decisão de design deve reforçar essa ideia: profundidade institucional acima do micromanagement de partida única. O clube tem história própria, cada jogador é único e o mundo persiste mesmo quando o usuário se ausenta.

## 1. Visão do Jogo

Grinta é um manager de futebol **online, persistente e vivo**. Cada usuário assume um clube pequeno no início; todos começam relativamente equilibrados, com diferenças pontuais que geram identidade, e crescem ao longo das temporadas por meio de boas decisões esportivas, financeiras, estruturais e administrativas.

Pilares:

- Cada clube tem uma história própria.
- Cada jogador do elenco é único.
- A economia é viva e balanceada (fechada e controlada).
- As temporadas continuam mesmo com usuários entrando depois.
- O clube cresce com o tempo, mas depende da gestão.
- A IA administra clubes, comissões e decisões quando necessário.
- Usuários online podem interferir dinamicamente nas partidas.
- Usuários offline continuam participando do mundo, com decisões automatizadas.

## 2. Mundo Online Persistente

O mundo não para. Mesmo que usuários saiam, os clubes continuam existindo: a IA administra o básico, o clube segue no campeonato, jogadores treinam, partidas acontecem, eventos ocorrem e o mercado continua. Decisões estratégicas profundas, porém, dependem do usuário.

O mundo guarda **histórico e legado**: temporadas, campeões, artilheiros, maiores transferências, ídolos, jogadores lendários, rebaixamentos, recordes, títulos, rivalidades, crises e evolução financeira. Esse histórico cria identidade e apego ao mundo.

→ ver detalhe em [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md)

## 3. Clube (Núcleo)

O clube é a entidade principal do jogo. Cada clube possui: nome, escudo, país/região, caixa financeiro, elenco, comissão técnica, diretoria, estrutura física, torcida, reputação, histórico de temporadas, divisão/campeonato atual, estilo de jogo, cultura interna e nível institucional.

Todos os clubes começam pequenos e equilibrados, mas com diferenças pontuais para gerar identidade — por exemplo: torcida mais paciente, base que revela jovens melhores, diretoria mais agressiva, caixa menor com estrutura médica superior, ou maior potencial comercial.

→ ver detalhe em [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md)

## 4. Estrutura Física do Clube

A estrutura influencia diretamente o crescimento de longo prazo. Blocos possíveis, cada um com níveis: centro de treinamento, departamento médico, academia/base, estádio, departamento de análise, departamento de comunicação, departamento comercial, diretoria, rede de olheiros, estrutura psicológica, fisiologia, nutrição e recuperação física.

O nível de cada estrutura altera resultados concretos — por exemplo, um departamento médico de nível baixo gera mais lesões, recuperação lenta e diagnóstico impreciso, enquanto um nível alto reduz lesões, acelera recuperação e melhora o controle de desgaste.

→ ver detalhe em [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md)

## 5. Comissão Técnica

A comissão técnica influencia treinamento, tática, desenvolvimento de jogadores, leitura de jogo, sugestões durante a partida, substituições automáticas, gestão de elenco, controle emocional e preparação física.

Cargos: técnico, auxiliar técnico, preparador físico, médico, fisiologista, psicólogo, analista de desempenho, olheiro, coordenador da base, diretor de futebol, diretor financeiro e diretor de comunicação. Cada cargo possui atributos próprios. Quanto melhor a comissão, melhores e mais precisas são as sugestões durante os jogos e mais competente é a gestão offline conduzida pela IA.

→ ver detalhe em [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md)

## 6. Diretoria

A diretoria influencia contratos, patrocínios, objetivos, pressão sobre o técnico, capacidade de negociação, limite salarial, profissionalismo e planejamento de longo prazo. Uma diretoria de nível baixo produz contratos ruins, negociação fraca, objetivos mal definidos e pressão desorganizada; uma diretoria de nível alto traz melhores contratos, planejamento, estabilidade e captação de receita.

→ ver detalhe em [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md)

## 7. Jogadores Únicos

Cada jogador é único — não apenas um conjunto de números. Possui nome, nacionalidade, idade, posição, pé dominante, altura, peso, perfis físico/técnico/mental, personalidade, história de vida, potencial, fase atual, moral, forma física, relacionamento com o clube, ambição, histórico de lesões, histórico de clubes e eventos extracampo.

Os atributos se dividem em três eixos. A **lista canônica completa (escala 0–100), com o grid de goleiro e a distinção entre atributo, estado e traço, está em** [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md) §2 — este overview apenas a resume:

- **Técnicos:** finalização, passe (curto e longo/lançamento), cruzamento, drible, controle de bola, marcação, desarme, cabeceio, chute de longe, bola parada, visão de jogo.
- **Físicos:** velocidade, aceleração, força, resistência, impulsão, agilidade, equilíbrio, explosão, recuperação física.
- **Mentais:** inteligência tática, tomada de decisão, concentração, disciplina, frieza, determinação/garra, liderança, regularidade, coragem, resiliência.

Ambição, lealdade, profissionalismo, temperamento, ganância, ego e adaptabilidade **não são atributos**: são **traços de personalidade** (é a mesma reconciliação que unifica a lista de [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) §3.4); "pressão emocional" é um **estado**, não um atributo. O **goleiro** tem um grid próprio (reflexos, saída de gol, reposição, jogo aéreo, um-contra-um, defesa de pênalti). Todos detalhados na fonte canônica.

A **história de vida** influencia a geração inicial gerando tendências (não regras absolutas). O jogador **evolui com o tempo** conforme idade, treinamento, minutos jogados, estrutura do clube, comissão, moral, lesões, estilo tático, posição usada, eventos extracampo, qualidade dos companheiros, pressão da torcida e momento da carreira.

→ ver detalhe em [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md)

## 8. Geração de Jogadores

Jogadores são gerados pelo sistema (incluindo scouting), considerando nacionalidade, idade, contexto social, posição, perfis físico/técnico, potencial e personalidade. A geração é regulada para **equilibrar a economia** e evitar inflação de jogadores bons: leva em conta quantidade de clubes, média de jogadores por clube, jogadores livres, aposentados e lesionados, nível médio da liga, demanda por posição e dinheiro circulando. Se faltam laterais, a geração de laterais jovens aumenta; se há excesso, a criação diminui; se muitos veteranos se aposentam, entram mais jovens.

→ ver detalhe em [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md)

## 9. Economia

A economia é **fechada, controlada e balanceada**. Considera número de clubes, caixa inicial, salários, transferências, premiações, patrocínios, bilheteria, direitos de transmissão, custos operacionais, custo de estrutura, aposentadorias, entrada de novos jogadores e inflação de mercado.

Todos os clubes começam com caixa parecido, com pequenas variações de identidade (mais caixa e menos estrutura, ou menos caixa e melhor base, etc.). Jogadores melhores não só custam mais para comprar como também são mais caros para manter.

→ ver detalhe em [`./03-economia.md`](./03-economia.md)

## 10. Mercado de Transferências

Clubes podem comprar, vender, emprestar, pegar emprestado, renovar, liberar, promover da base e contratar livres. O **preço** é calculado a partir de idade, overall, potencial, posição e sua raridade, momento da carreira, moral, contrato, salário, interesse de outros clubes, reputação do clube vendedor, reputação da liga, oferta/demanda e dinheiro circulando. O **interesse** de outros clubes depende de necessidade por posição, caixa, estilo de jogo, idade desejada, potencial, valor, salário, reputação e desempenho recente.

Fórmula-guia de referência:

```
Preço = Valor Base por Qualidade
      × Potencial × Idade × Raridade da Posição
      × Demanda do Mercado × Tempo de Contrato
      × Momento do Jogador × Inflação Global
```

→ ver detalhe em [`./03-economia.md`](./03-economia.md)

## 11. Contratos

Cada contrato possui salário, tempo restante, multa, bônus, status prometido, cláusulas, luvas, empresário, chance de renovação e satisfação. O **salário** considera qualidade, reputação, idade, potencial, status no elenco, liga, ambição, propostas recebidas, empresário e situação financeira do clube. A **renovação** depende de moral, ambição, salário atual, propostas externas, status no elenco, reputação do clube, relação com o técnico, momento da carreira e tempo de contrato restante.

→ ver detalhe em [`./03-economia.md`](./03-economia.md)

## 12. Crescimento dos Clubes e Entrada de Novos Usuários

Clubes crescem com boas campanhas, promoções de divisão, títulos, desenvolvimento e venda de jogadores, investimento em estrutura, aumento de torcida, melhor reputação, boa gestão financeira e melhores patrocínios.

Um usuário que entra em temporada avançada **não pode ser esmagado** pelos gigantes. Três modelos combinados: (1) clube pequeno com proteção inicial — divisão adequada, caixa e elenco compatíveis, objetivos realistas, mercado próprio e proteção contra abuso; (2) mundo em múltiplas camadas competitivas — divisões nacionais, copas regionais, ligas de acesso, torneios por reputação/base/emergentes; (3) bônus institucional controlado — estrutura mínima proporcional ao momento do mundo (nível 3 na temporada 20, ainda distante dos grandes em nível 7-9), preservando o mérito dos antigos.

→ ver detalhe em [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md) e [`./09-anti-abuso-e-onboarding.md`](./09-anti-abuso-e-onboarding.md)

## 13. Base e Formação

O clube possui categorias de base com níveis, que influenciam quantidade e qualidade dos jovens revelados, potencial médio, perfil dos jogadores, custo de formação e identidade do clube. Jovens evoluem melhor com boa estrutura, bons treinadores, minutos em campo, empréstimos, moral alta, plano de carreira, baixa pressão e boa personalidade.

→ ver detalhe em [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md) e [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md)

## 14. Campeonatos e Temporadas

A temporada contém pré-temporada, mercado inicial, campeonato principal, copas, janela de transferências, eventos de elenco, fim de temporada, premiações, aposentadorias, geração de novos jogadores, promoções/rebaixamentos, atualização financeira e renovação de contratos.

Sendo online, os campeonatos acomodam muitos jogadores em uma hierarquia:

```
Mundo / Servidor → Temporada → Países / Regiões → Divisões → Grupos → Clubes
```

Cada grupo tem quantidade controlada de clubes; a IA completa vagas quando não há usuários suficientes (ex.: Série D, Grupo 1 com 12 usuários + 8 IA). O calendário controla rodadas, datas, descanso, janelas, treinamentos, lesões, suspensões, convocações, eventos externos e fim de temporada.

→ ver detalhe em [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md)

## 15. Simulação de Partida

A partida **não é um sorteio por overall**. O motor considera força dos times, tática, formação, estilo, moral, cansaço, entrosamento, jogadores decisivos, clima, mando de campo, pressão da torcida, arbitragem, momento da temporada, substituições, lesões, cartões e estratégia do técnico.

A simulação é dividida em blocos de tempo (0-5, 5-10, ... acréscimos). Em cada bloco calcula-se controle do jogo, posse, pressão, chance de ataque, qualidade da jogada, chance de finalização e de gol, riscos de falta/cartão/lesão, cansaço acumulado e mudanças emocionais. *(A granularidade dos blocos e a sequência de passos aqui são ilustrativas — os blocos e o número de passos do loop/resolução são apenas aproximados; a referência canônica, com a divisão real dos blocos e as etapas exatas do tick loop e da resolução de ataque, é [`./05-motor-de-partida.md`](./05-motor-de-partida.md).)* Eventos possíveis incluem gol, finalização, defesa, escanteio, falta, cartões, lesão, pênalti, impedimento, substituição, alteração tática, erro individual, jogada genial, contra-ataque, cera e acréscimos.

→ ver detalhe em [`./05-motor-de-partida.md`](./05-motor-de-partida.md)

## 16. Online vs Offline e Sistema de Decisão

**Online:** o usuário acompanha o jogo em tempo (ou semi-tempo) real, recebe notificações contextuais e age em pontos de decisão — mudar formação/estilo, substituir, recuar ou avançar linhas, marcar forte, ajustar intensidade, explorar laterais, pressão alta, segurar resultado. A qualidade das sugestões depende da comissão técnica (de "seu time parece cansado" a leituras estatísticas detalhadas).

**Offline:** o jogo continua e a IA assume o essencial de forma conservadora e baseada na comissão — substituir lesionados/exaustos, reorganizar após vermelho, evitar lesão grave, ajustes básicos — sem a profundidade estratégica de um usuário online.

O **sistema de decisão** é baseado em pesos e personalidade. Cada decisão soma pesos (ex.: substituição — jogador com amarelo +15, risco de lesão alto +30, titular decisivo −20, poucas substituições restantes −15); ao ultrapassar um limite, a IA recomenda ou executa. A personalidade do técnico/clube modula tudo (ofensivo, conservador, jovem, experiente).

→ ver detalhe em [`./05-motor-de-partida.md`](./05-motor-de-partida.md) e [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md)

## 17. Tática

Formações (4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 3-4-3, 5-3-2, 4-1-4-1) influenciam ocupação de campo, força defensiva/ofensiva, controle de meio, proteção dos lados, risco de contra-ataque e participação dos atacantes. Estilos incluem posse, contra-ataque, pressão alta, bola longa, jogo pelas laterais/meio, defesa baixa, marcação forte, linha alta e ritmo lento/acelerado. Durante o jogo o usuário ajusta mentalidade, intensidade, marcação, linha defensiva, pressão, ritmo, direção dos ataques, liberdade criativa, risco ofensivo, compactação e foco defensivo.

→ ver detalhe em [`./05-motor-de-partida.md`](./05-motor-de-partida.md)

## 18. Inteligência Artificial

O jogo tem camadas de IA: **IA de Clube** (contratações, vendas, escalação, treinamento, finanças, renovações, estrutura, objetivos), **IA de Comissão Técnica** (sugestões, substituições, mudanças táticas, leitura do adversário, desgaste), **IA de Jogador** (reclamar por titularidade, pedir aumento, aceitar proposta, perder moral, render em jogo grande), **IA de Mercado** (inflação, demanda por posição, oferta, salários médios, interesse) e **IA Narrativa** (acontecimentos e histórias).

O core é baseado em decisão por camadas (Estado do Mundo → Clube → Elenco → Partida → Motor de Regras → Sistema de Peso/Prioridade → Decisão Final), fundado em regras, pesos, probabilidades, simulação, personalidade, estado atual e histórico. IA generativa entra depois, para narrativas, notícias, explicações, comentários e sugestões mais humanas.

→ ver detalhe em [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md)

## 19. Moral, Torcida e Narrativas

A **moral do elenco** é impactada por vitórias/derrotas, sequências ruins, salários atrasados, falta de minutos, promessas quebradas, críticas públicas, relação com técnico, ambiente interno, títulos, propostas recusadas e lesões. A **torcida** (perfis: paciente, exigente, apaixonada, impaciente, fiel, modista, regional, nacional) influencia pressão, renda, moral, diretoria, ambiente, apoio em casa e crescimento. O **departamento de comunicação** controla crises e narrativas: em nível baixo uma derrota vira crise maior; em nível alto o clube reduz danos, protege o elenco e controla a narrativa.

→ ver detalhe em [`./11-torcida-imprensa-e-narrativa.md`](./11-torcida-imprensa-e-narrativa.md), [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) e [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md)

## 20. Eventos Externos

Eventos tornam o mundo vivo: convocação para seleção, lesão fora do clube, problema familiar, proposta internacional, crise financeira, briga no elenco, polêmica, prêmio, empresário forçando saída, protesto da torcida, mudança de objetivos da diretoria, chegada de investidor, reforma de estádio, perda de foco, jogador virando ídolo. Afetam moral, disponibilidade, valor de mercado, rendimento, relação com o clube, torcida e finanças.

→ ver detalhe em [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md)

## 21. Reputação

A **reputação do clube** afeta quais jogadores aceitam vir, patrocínios, torcida, preço de jogadores, interesse da mídia, convites para torneios e peso institucional. A **reputação do jogador** afeta salário, valor de mercado, propostas, pressão, moral, status no elenco e relação com a torcida.

→ ver detalhe em [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md)

## 22. Fim de Temporada

Ao encerrar a temporada o sistema executa: classificação final, premiações e pagamentos, promoções e rebaixamentos, atualização de reputação, aposentadorias, evolução/regressão por idade, geração de novos jogadores, renovação de contratos, ajuste de salários, atualização de torcida e patrocínios, criação dos campeonatos seguintes, reset parcial de moral e registro do histórico. **Aposentadorias** dependem de idade, lesões, motivação, nível técnico, propostas, tempo sem clube, situação física e personalidade.

→ ver detalhe em [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md)

## 23. Notificações

Notificações **estratégicas** (jogo começou, sofreu gol, lesão, jogador cansado, vermelho, proposta recebida, contrato vencendo, torcida insatisfeita, jogador quer sair, olheiro achou promessa, comissão recomenda mudança, crise financeira) e **de partida** (contexto do momento + ações sugeridas, ex.: "min 58, vencendo 1x0 mas o adversário aumentou a pressão; volante cansado e amarelado → substituir / recuar / manter posse / reduzir intensidade"). *(A separação em duas categorias aqui é ilustrativa; a taxonomia canônica — em 4 níveis: crítica, importante, informativa e narrativa — é [`./13-relatorios-notificacoes-e-memoria.md`](./13-relatorios-notificacoes-e-memoria.md).)*

→ ver detalhe em [`./13-relatorios-notificacoes-e-memoria.md`](./13-relatorios-notificacoes-e-memoria.md), [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) e [`./05-motor-de-partida.md`](./05-motor-de-partida.md)

## 24. Arquitetura Lógica do Core

**Entidades principais:** World, Season, Competition, Club, Squad, Player, Staff, Match, Tactic, Training, Finance, TransferMarket, Event, Notification, AIEngine, SimulationEngine.

**Módulos:** Core Game Engine, Match Simulation Engine, Economy Engine, Transfer Market Engine, Player Development Engine, Club Progression Engine, AI Decision Engine, Narrative/Event Engine, Competition Engine, Notification Engine, Season Lifecycle Engine.

**Fluxo geral:**

```
Temporada inicia → Campeonatos montados → Clubes treinam e contratam
→ Rodadas simuladas → Usuários online agem / offline assistidos pela IA
→ Eventos ocorrem → Economia atualizada → Temporada termina
→ Jogadores evoluem/envelhecem → Clubes sobem/descem/crescem → Nova temporada
```

O core é desenhado como um **simulador de ecossistema** baseado em Entidades → Componentes → Efeitos → Eventos, com memória — detalhado em [`../02-tecnico/07-arquitetura-do-core-ecs.md`](../02-tecnico/07-arquitetura-do-core-ecs.md). O modelo de dados canônico e as regras/fórmulas executáveis vivem em [`../02-tecnico/02-modelo-de-dados.md`](../02-tecnico/02-modelo-de-dados.md) e [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

> **Pendência:** fórmulas iniciais e regras de balanceamento numérico ainda dependem de calibração (ver pendências nos docs técnicos).

## 25. Regras Transversais de Consistência

Alguns princípios não pertencem a um único sistema: eles **atravessam todos os módulos** do Grinta e garantem que mercado, partida, finanças, estrutura, torcida e desenvolvimento formem um organismo coerente — e não minijogos isolados sem consequência nos demais módulos. Valem igualmente para usuários e para a IA; a diferença está na **qualidade das decisões**, não na permissão de ignorar orçamento, contrato ou regulamento.

**Fonte única por assunto.** Cada informação tem um sistema responsável (um dono), e os demais apenas o consultam ou o representam — nunca o redefinem. O **contrato** é a fonte do vínculo contratual; a **inscrição** é a fonte da elegibilidade competitiva; o **sistema médico** é a fonte das restrições de saúde; o **razão financeiro** é a fonte dos valores contábeis; a **competição** é a fonte da classificação oficial; a **notificação** apenas representa o assunto, jamais o define.

**Separação de conceitos.** Doze distinções são obrigatórias e nunca podem ser confundidas:

- Clube ≠ controlador (o clube persiste mesmo quando muda quem o gere).
- Pessoa ≠ carreira.
- Contrato ≠ inscrição (ter vínculo não é o mesmo que estar elegível para uma competição).
- Elenco ≠ propriedade esportiva.
- Caixa ≠ orçamento (dinheiro disponível não é o mesmo que dinheiro planejado).
- Resultado em campo ≠ resultado oficial (a celebração é imediata, mas o registro depende de homologação).
- Fato ≠ narrativa.
- Notificação ≠ tarefa.
- Recomendação ≠ decisão.
- Estrutura ≠ funcionário.
- Potencial ≠ desenvolvimento realizado.
- Informação real ≠ conhecimento do clube (o que existe no mundo não é o mesmo que o clube sabe sobre isso).

**Não duplicação.** O jogo impede a repetição indevida de pagamentos, transferências, premiações, títulos, aposentadorias, geração de jogadores, partidas, contratos e ações automáticas — cada evento acontece uma única vez.

**Informação incompleta nunca vira zero.** Quando um dado é desconhecido, o jogo indica **incerteza**; jamais substitui o desconhecido por zero, por certeza falsa ou por valor inventado. Dado desconhecido é sinalizado como estimativa/faixa, não como número exato.

**Consequências proporcionais.** Decisões não geram bônus ou punições desconectadas: toda consequência deriva de **contexto, intensidade, duração, repetição, reputação, capacidade do clube e regras oficiais**.

Completam esses princípios outras regras transversais do escopo, na mesma direção: **continuidade histórica** — nenhuma troca de temporada, controlador, nome ou divisão apaga dívida, lesão, contrato, suspensão, promessa, obra, relação, reputação ou histórico; **correções transparentes** — toda correção relevante preserva estado anterior, motivo, data, autoridade e efeitos recalculados; **sem vantagem oculta** — nenhum bônus secreto por ser usuário novo, estar offline ou ser clube controlado pela IA, pois a entrada tardia recebe viabilidade, não equiparação artificial; e **escopo integral** — os sistemas são interdependentes.

→ ver detalhe em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md) e [`../02-tecnico/02-modelo-de-dados.md`](../02-tecnico/02-modelo-de-dados.md)

## Estrutura Final em Blocos

O jogo pode ser separado nos ~20 blocos abaixo, que este overview cobre:

1. Mundo Online Persistente
2. Clubes
3. Jogadores Únicos
4. Comissão Técnica
5. Estrutura do Clube
6. Economia Global
7. Mercado de Transferências
8. Campeonatos e Temporadas
9. Simulação de Partidas
10. Decisões em Tempo Real
11. IA de Clubes e Comissões
12. Moral, Torcida e Narrativas
13. Eventos Externos
14. Base e Desenvolvimento
15. Contratos e Salários
16. Crescimento de Clubes
17. Entrada de Novos Usuários
18. Notificações Estratégicas
19. Histórico e Legado
20. Motor Central do Jogo

## Mapa de Documentos Irmãos

| Sistema | Documento |
| --- | --- |
| Mundo persistente, clubes, crescimento, reputação | [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md) |
| Jogadores únicos, atributos, geração, evolução, base | [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md) |
| Economia, mercado, contratos, salários | [`./03-economia.md`](./03-economia.md) |
| Estrutura física, comissão técnica, diretoria, staff | [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md) |
| Motor de partida, tática, decisões em tempo real | [`./05-motor-de-partida.md`](./05-motor-de-partida.md) |
| Temporada, competições, calendário, fim de temporada | [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md) |
| IA (clube, comissão, jogador, mercado, narrativa), eventos, moral, notificações | [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) |
| Estádio, região e clima | [`./08-estadio-regiao-e-clima.md`](./08-estadio-regiao-e-clima.md) |
| Anti-abuso e onboarding de novos usuários | [`./09-anti-abuso-e-onboarding.md`](./09-anti-abuso-e-onboarding.md) |
| Experiência do usuário e telas (fluxos de UX) | [`./10-experiencia-e-telas.md`](./10-experiencia-e-telas.md) |
| Torcida, imprensa e narrativa | [`./11-torcida-imprensa-e-narrativa.md`](./11-torcida-imprensa-e-narrativa.md) |
| Seleções e calendário internacional | [`./12-selecoes-e-calendario-internacional.md`](./12-selecoes-e-calendario-internacional.md) |
| Relatórios, notificações e memória do mundo | [`./13-relatorios-notificacoes-e-memoria.md`](./13-relatorios-notificacoes-e-memoria.md) |
| Monetização e justiça competitiva | [`./14-monetizacao.md`](./14-monetizacao.md) |
| Fluxos completos do jogo | [`./15-fluxos-completos.md`](./15-fluxos-completos.md) |
| UI/UX — design system, navegação, telas mobile e admin | [`../04-ui-ux/`](../04-ui-ux/) (índice em [`../04-ui-ux/README.md`](../04-ui-ux/README.md)) |
| Documentos técnicos — arquitetura, modelo de dados, regras/fórmulas, operação e admin do mundo | [`../02-tecnico/`](../02-tecnico/) (inclui [`../02-tecnico/09-operacao-e-admin-do-mundo.md`](../02-tecnico/09-operacao-e-admin-do-mundo.md)) |
