# Glossário Conceitual de Entidades

> **Status:** Rascunho consolidado · **Fontes:** chats/documento-definitivo-escopo.md (Seção 22) · **Revisão:** 2026-07-11

## Resumo

Este documento é o **glossário conceitual de entidades** do **Grinta** — o manager de futebol online persistente. Ele descreve, em **linguagem de produto**, os objetos funcionais que compõem o jogo: o que cada entidade *representa* para o usuário e para a experiência, não como ela é armazenada ou implementada. Cada verbete traz uma definição curta (1-2 linhas) e está organizado nos **11 grupos** da fonte (Seção 22 de `chats/documento-definitivo-escopo.md`).

Trata-se de uma **visão de produto**, propositalmente independente de banco de dados, tabelas, chaves e formatos. Serve como vocabulário comum entre game design, produto, engenharia e conteúdo: quando alguém diz "moral", "vínculo de gestão" ou "decisão pendente", este é o significado canônico.

Este glossário se articula com dois outros artefatos, que **não** devem ser confundidos com ele:

- **Mapeamento técnico** — a tradução destas entidades para o schema real (tabelas, campos, relações, tipos) vive em [`../02-tecnico/02-modelo-de-dados.md`](../02-tecnico/02-modelo-de-dados.md). Se você procura como uma entidade é *persistida*, é lá.
- **Glossário do jogador** — os termos de *gameplay* voltados a quem joga (como cada conceito é nomeado e explicado na interface e nos tutoriais) ficam no [guia do jogador](../03-guia-do-jogador/). Se você procura como o jogador *ouve falar* de um conceito, é lá.

> **Como ler:** cada grupo reúne entidades de um mesmo domínio funcional. As definições são deliberadamente enxutas; regras, fórmulas e comportamentos detalhados vivem nos documentos de sistema de `01-game-design/` e no [catálogo de regras](../02-tecnico/05-catalogo-de-regras-e-formulas.md). Onde a fonte é vaga ou deixa uma decisão em aberto, há uma marcação `> **Pendência:**`.

## Sumário

1. [Mundo e tempo](#1-mundo-e-tempo)
2. [Usuário e clube](#2-usuário-e-clube)
3. [Infraestrutura e profissionais](#3-infraestrutura-e-profissionais)
4. [Jogador e carreira](#4-jogador-e-carreira)
5. [Base](#5-base)
6. [Competições e partidas](#6-competições-e-partidas)
7. [Treinamento](#7-treinamento)
8. [Mercado](#8-mercado)
9. [Finanças](#9-finanças)
10. [Torcida e narrativa](#10-torcida-e-narrativa)
11. [Integridade e operação](#11-integridade-e-operação)

---

## 1. Mundo e tempo

O contexto persistente em que tudo acontece: o ecossistema, seu ciclo anual, o espaço geográfico e o tempo oficial.

**Mundo** — Ecossistema persistente e autossuficiente, com regras, economia, clubes, jogadores e história próprios. É o "universo" em que o usuário entra; múltiplos mundos coexistem de forma independente.

**Temporada** — Ciclo anual do mundo que reúne o calendário, as competições, as janelas de mercado e o fechamento contábil e esportivo. É a unidade de tempo em que metas e resultados são medidos.

**Região** — Contexto geográfico de um clube, que define clima, custos, perfil de torcida, captação de talentos e viagens. Influencia gestão e desempenho sem ser um sistema jogável em si.

**Calendário** — Conjunto oficial de datas do mundo: partidas, janelas de transferência, períodos administrativos e prazos. É a linha do tempo canônica que todos os clubes seguem.

## 2. Usuário e clube

Quem joga, o vínculo que o conecta a um clube e o clube em si, com suas metas.

**Usuário** — Pessoa que administra um clube dentro de um mundo. Representa o gestor humano por trás das decisões; um usuário pode ter histórico em vários clubes ao longo do tempo.

**Vínculo de gestão** — Período em que um usuário controla determinado clube, com início, fim e histórico próprios. Separa a *pessoa* (usuário) da *passagem* por um clube, permitindo trocas, saídas e retornos.

**Clube** — Organização esportiva permanente, com identidade, história, elenco, finanças e estrutura próprias. Existe independentemente de quem o gerencia — permanece no mundo mesmo sem usuário.

**Objetivo** — Meta esportiva, financeira ou estrutural definida para a temporada. Serve de referência para avaliar a gestão e alimenta cobrança de diretoria e torcida.

**Plano de recuperação** — Conjunto obrigatório de restrições e metas imposto a um clube em crise (tipicamente financeira). Enquanto ativo, limita ações e condiciona a saída da situação de risco.

## 3. Infraestrutura e profissionais

O patrimônio físico do clube e as pessoas contratadas para operá-lo.

**Estádio** — Local de mando de jogo do clube, fonte de receita e palco das partidas. Reúne gramado, obras, capacidade e licenciamento, todos com impacto esportivo e financeiro.

**Departamento** — Núcleo estrutural de competência do clube (por exemplo: técnico, médico, scouting, base, administração). Agrupa profissionais e capacidades por área de atuação.

**Profissional** — Membro de staff contratado pelo clube: técnico, médico, olheiro, gestor ou integrante de outro núcleo. É a pessoa que executa e sustenta as competências de um departamento.

**Contrato de profissional** — Vínculo entre clube e profissional, definindo salário, cargo, autonomia (nível de delegação) e compensações. Rege a relação de trabalho do staff.

## 4. Jogador e carreira

O atleta como entidade central, com suas capacidades visíveis, sua natureza oculta, sua condição momentânea e seu vínculo com o clube.

**Jogador** — Atleta único e permanente do mundo. Persiste ao longo das temporadas com sua própria trajetória, evolução e história — não é gerado descartavelmente por partida.

**Perfil de atributos** — Conjunto de capacidades técnicas, físicas, mentais e táticas que descrevem o que o jogador sabe fazer. É a face "visível" e mensurável da qualidade do atleta.

**Perfil oculto** — Dimensões não totalmente conhecidas do jogador: potencial, consistência, personalidade e tendências. Só se revela parcialmente, com scouting, convivência e tempo.

**História de origem** — Contexto narrativo e tendências iniciais do jogador (de onde veio, sua formação, traços de partida). Dá identidade e ponto de partida à carreira.

**Estado físico** — Condição corporal atual do jogador: energia, fadiga, ritmo de jogo e risco de lesão. Varia com carga, partidas e recuperação, e afeta desempenho e escalação.

**Estado de moral** — Estado psicológico e emocional do jogador: satisfação, confiança, pressão e expectativas. Influencia rendimento, relação com o clube e disposição em negociações.

**Lesão** — Problema físico do jogador, com gravidade, diagnóstico, tratamento e previsão de retorno. Afasta o atleta e cria decisões de gestão médica e de elenco.

**Contrato de jogador** — Vínculo esportivo e financeiro entre clube e atleta: duração, salário, cláusulas e condições. Define o que o clube possui e por quanto tempo.

**Participação no elenco** — Papel do jogador dentro do grupo: sua categoria, posição na hierarquia e função esperada. Traduz "que peça ele é" no plantel — titular, reserva, promessa, etc.

> **Reconciliação:** "Categoria" tem **dois eixos distintos** — (a) *categoria de participação* no elenco (profissional/base/transição) e (b) *categoria de base* (sub-15/17/20). Termos canônicos: `SquadCategory` e `YouthAgeCategory`.

## 5. Base

As categorias de formação, os jovens em desenvolvimento e a reputação do clube como formador.

**Proteção de jovem** — Estágio do vínculo de um jovem com o clube: observação, teste, vínculo, proteção ou profissionalização. Determina o nível de compromisso e a blindagem contra abordagens externas.

**Plano de carreira** — Direção planejada de desenvolvimento e uso de um jovem: como ele deve evoluir e qual papel se pretende para ele. Orienta treino, empréstimos e promoção.

**Categoria** — Nível etário e competitivo em que um jovem atua (as "divisões" da base). Define contra quem joga e em que etapa da formação se encontra.

**Mentoria** — Relação de desenvolvimento entre um jovem e um veterano ou profissional. Acelera ou molda a evolução do jovem por convivência e orientação.

**Reputação formadora** — Histórico e prestígio do clube na formação de atletas. Afeta a atração de talentos da base e a percepção do clube como celeiro.

## 6. Competições e partidas

As disputas oficiais, suas edições anuais e tudo o que cerca o jogo em campo.

**Competição** — Regulamento permanente de uma liga, copa ou torneio. É a "identidade" da disputa, que se repete a cada temporada com regras estáveis.

**Edição da competição** — A disputa concreta de uma competição em uma temporada específica, com seus participantes e resultados. Uma competição tem muitas edições ao longo do tempo.

**Participante** — Clube inscrito em uma edição da competição. Representa a presença efetiva de um clube naquela disputa daquele ano.

**Classificação** — Posição dos participantes e os critérios que a determinam em uma edição. Traduz o andamento e o desfecho esportivo da competição.

**Partida** — Confronto entre dois clubes, oficial ou amistoso. É o evento central do jogo em campo, do qual derivam resultados, estatísticas e consequências.

**Escalação oficial** — Conjunto de jogadores titulares e do banco válidos para uma partida. É o recorte do elenco efetivamente disponível e registrado para aquele jogo.

**Plano tático** — Definição de como o clube joga uma partida: formação, postura, funções e instruções. É a expressão da estratégia do usuário (ou da inteligência) em campo.

**Plano automático** — Comportamento padrão do clube quando o usuário não intervém — em partidas e em decisões de rotina. Garante que o clube continue operando de forma coerente na ausência do gestor.

**Evento de partida** — Acontecimento relevante durante o jogo: gol, chance, cartão, lesão, substituição ou outro fato. Compõe a narrativa e o registro do que se passou em campo.

**Comando** — Decisão enviada pelo usuário durante a partida (substituição, mudança de postura, instrução). É a interação em tempo (ou quase tempo) real com o jogo em andamento.

**Estatística** — Resultado acumulado de equipe ou jogador ao longo de partidas, edições e temporadas. Consolida desempenho em números para análise e história.

## 7. Treinamento

O trabalho de desenvolvimento e preparação do elenco entre as partidas.

**Plano coletivo** — Definição de foco, intensidade e preparação do elenco como um todo. Orienta o desenvolvimento do grupo e a prontidão física para o calendário.

**Plano individual** — Trabalho dirigido a um jogador específico, para desenvolvimento ou recuperação. Permite tratar necessidades particulares fora do plano do grupo.

**Sessão e carga** — Execução concreta de um treino e o impacto físico que ela gera. Liga a intenção (plano) ao efeito real sobre energia, fadiga e evolução dos jogadores.

## 8. Mercado

A movimentação de jogadores entre clubes e o conhecimento que sustenta essas decisões.

**Negociação** — Processo de propostas e contrapropostas entre partes para viabilizar uma transferência ou empréstimo. É o "fluxo" de barganha até o acordo ou a ruptura.

**Oferta** — Proposta concreta em uma negociação: combinação de valor, parcelas, bônus e cláusulas. É a unidade que as partes trocam e avaliam.

**Transferência** — Mudança definitiva de um jogador de um clube para outro. Encerra um vínculo e inicia outro, com efeitos em elenco, finanças e moral.

**Empréstimo** — Cessão temporária de um jogador a outro clube, com regras de uso e, eventualmente, opção ou obrigação de compra. Mantém o vínculo original enquanto o atleta joga em outro lugar.

**Representante** — Agente ou influência familiar que atua nas negociações de um jogador. Introduz condições, exigências e atrito às tratativas do lado do atleta.

**Relatório de scouting** — Conhecimento acumulado sobre um jogador observado, incluindo o grau de incerteza dessas informações. Reduz (mas não elimina) o desconhecido antes de contratar.

**Lista de observação** — Conjunto de jogadores que o clube acompanha de perto. Organiza alvos e prioridades de mercado e concentra o esforço de scouting.

## 9. Finanças

O registro do dinheiro que entra, sai, é devido e é planejado.

**Movimentação financeira** — Receita ou despesa efetivamente registrada no clube. É o lançamento que forma o histórico e o saldo financeiro.

**Obrigação** — Pagamento futuro já assumido pelo clube (parcelas, bônus contratados, compromissos). Compromete caixa que ainda não foi desembolsado.

**Dívida** — Compromisso financeiro em atraso ou sob financiamento. Sinaliza pressão sobre o caixa e pode disparar restrições e planos de recuperação.

**Orçamento** — Limite planejado de gasto por área (folha, mercado, estrutura, base). Serve de guia e de trava para as decisões de investimento do clube.

**Premiação** — Receita ligada a competição ou contrato (cotas, bônus por desempenho, prêmios). Recompensa resultados esportivos e cumprimento de metas.

## 10. Torcida e narrativa

Os torcedores, o clima que eles formam e a leitura pública dos acontecimentos do clube.

**Base de torcida** — Quantidade, distribuição e comportamento dos torcedores do clube. É o "público" que sustenta receita, pressão e identidade.

**Segmento** — Grupo de torcedores com prioridades próprias dentro da base (por exemplo, mais fiéis, mais exigentes, mais focados em resultado). Reage de forma distinta às decisões do clube.

**Satisfação** — Clima atual da torcida em relação ao clube e à gestão. Sobe e desce com resultados, promessas e narrativa, e realimenta pressão e receita.

**Narrativa** — Interpretação pública dos fatos reais do clube — como acontecimentos são lidos e contados por imprensa e torcida. Transforma eventos objetivos em percepção e clima.

**Promessa** — Compromisso registrado do clube ou gestor com um jogador, o elenco ou o público. Cria expectativa e é cobrada; cumprir ou quebrar afeta moral, satisfação e reputação.

**Reputação** — Percepção histórica acumulada sobre o clube ou o gestor. É o "cartão de visitas" de longo prazo que influencia mercado, torcida e credibilidade.

**Rivalidade** — Relação competitiva com outro clube, com intensidade e memória próprias. Carrega peso extra a confrontos e amplifica o impacto emocional de resultados.

**Ídolo** — Status histórico de forte identificação entre um jogador e a torcida de um clube. Confere valor simbólico que ultrapassa o desempenho corrente e afeta decisões de gestão.

> **Reconciliação:** "Reputação" (do clube) e "Reputação formadora" (grupo Base) são **eixos distintos**: a primeira é a reputação geral do clube; a segunda mede a capacidade de formar/lançar jovens. Não são a mesma entidade.

## 11. Integridade e operação

Os mecanismos que mantêm o mundo justo, auditável e navegável para o usuário.

**Avaliação de risco** — Análise de uma ação potencialmente abusiva antes de permiti-la (por exemplo, movimentações suspeitas entre clubes). Protege a integridade competitiva e econômica do mundo.

**Registro de auditoria** — Memória administrativa imutável de uma decisão crítica. Guarda o "quem fez o quê e quando" para transparência e apuração posterior.

**Punição** — Consequência esportiva, financeira ou de acesso aplicada por descumprimento de regra. É o desfecho concreto de uma violação detectada.

**Notificação** — Comunicação priorizada ao usuário sobre algo que exige atenção ou ciência. Organiza o que chega ao gestor por relevância e urgência.

**Decisão pendente** — Ação atribuída ao usuário com prazo e uma consequência padrão caso não seja tomada. Garante que o jogo avance mesmo sem resposta, aplicando o comportamento automático no vencimento do prazo.

**Registro histórico** — Marco perene do mundo: troféu, conquista, recorde ou feito. Preserva a história de clubes, jogadores e gestores ao longo das temporadas.

---

> **Nota de escopo:** este glossário reproduz as entidades conceituais da Seção 22 da fonte em linguagem de produto. Ele **não** é especificação técnica nem estrutura de banco de dados — para isso, consulte o [modelo de dados](../02-tecnico/02-modelo-de-dados.md). Para os termos como o **jogador** os encontra na interface, consulte o [guia do jogador](../03-guia-do-jogador/).
