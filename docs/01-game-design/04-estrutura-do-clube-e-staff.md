# Estrutura do Clube e Comissão Técnica (Staff)

> **Status:** Rascunho consolidado · **Fontes:** chats/planejamento-agrupado-do-jogo.md, chats/organizacao-de-pensamentos.md · **Revisão:** 2026-07-10

No **Grinta**, o usuário não gerencia apenas uma escalação: ele constrói uma instituição de futebol ao longo do tempo. O nível real de um clube é resultado da soma entre estrutura física, funcionários, reputação, finanças, desempenho esportivo e capacidade de formar e contratar jogadores. Dois clubes podem ter o mesmo caixa e ainda assim evoluir de formas completamente diferentes, dependendo de onde investem.

Este documento consolida a estrutura organizacional do clube (as ~10 áreas e seus níveis), o papel dos funcionários como multiplicadores de qualidade, as regras de crescimento controlado e manutenção, o modelo de "árvore de evolução" com estilos de clube, e o detalhamento da comissão técnica (cargos e atributos).

## Sumário

1. [Nível geral do clube](#1-nível-geral-do-clube)
2. [Níveis por área](#2-níveis-por-área)
3. [As áreas da estrutura e seus efeitos](#3-as-áreas-da-estrutura-e-seus-efeitos)
4. [Funcionários como multiplicadores](#4-funcionários-como-multiplicadores)
5. [Estrutura, contratação e qualidade da informação](#5-estrutura-contratação-e-qualidade-da-informação)
6. [Crescimento controlado e manutenção mensal](#6-crescimento-controlado-e-manutenção-mensal)
7. [A estrutura como árvore de evolução](#7-a-estrutura-como-árvore-de-evolução)
8. [Estilos de crescimento de clube](#8-estilos-de-crescimento-de-clube)
9. [Comissão técnica: cargos e atributos](#9-comissão-técnica-cargos-e-atributos)
10. [Perfis de funcionários](#10-perfis-de-funcionários)

---

## 1. Nível geral do clube

O clube não tem apenas um número único: ele tem **vários níveis internos**, um por área, além de um **nível geral** derivado do conjunto. Um clube pode, por exemplo, ter equipe médica nível 1, comunicação nível 5, diretoria nível 2 e base nível 3 ao mesmo tempo.

O nível geral é calculado como uma composição de estrutura física, funcionários, reputação, finanças, desempenho esportivo, torcida e qualidade do elenco, com a estrutura tendo peso alto.

**Sugestão de pesos (fatores externos):**

| Fator | Peso |
| --- | --- |
| Estrutura e funcionários | 40% |
| Desempenho esportivo | 25% |
| Finanças | 15% |
| Reputação / torcida | 10% |
| Qualidade do elenco | 10% |

Uma segunda formulação, mais detalhada, propõe separar a média ponderada das **áreas estruturais** dos demais fatores externos:

**Peso interno entre as áreas:**

| Área | Peso |
| --- | --- |
| Diretoria | 15% |
| Comissão técnica | 12% |
| Base | 12% |
| Centro de treinamento (CT) | 12% |
| Equipe médica | 10% |
| Preparação física | 10% |
| Comunicação | 8% |
| Olheiros | 8% |
| Estádio | 8% |
| Análise de desempenho | 5% |

**Composição final:**

| Componente | Peso |
| --- | --- |
| Estrutura interna | 60% |
| Reputação esportiva | 20% |
| Finanças | 10% |
| Torcida | 10% |

Consequência de design: um clube campeão, porém desorganizado, **não vira gigante automaticamente**. Ele pode estar em boa fase e ainda ser estruturalmente pequeno. O crescimento é orgânico.

> **Regra de ouro:** o clube só cresce de verdade quando sua estrutura interna acompanha seu desempenho esportivo. Isso impede crescimento artificial.

> **Pendência:** as duas formulações de pesos (a de 40/25/15/10/10 e a de 60/20/10/10 com pesos internos por área) coexistem nas fontes. Definir qual é a oficial ou como conciliá-las.

## 2. Níveis por área

Cada área evolui em uma escala de **1 a 10**:

| Faixa | Descrição |
| --- | --- |
| 1–2 | Amador / muito básico |
| 3–4 | Pequeno organizado |
| 5–6 | Médio competitivo |
| 7–8 | Grande estruturado |
| 9–10 | Elite |

Cada upgrade custa **dinheiro, tempo e manutenção**. Não deve ser apenas "clicar e melhorar".

**Exemplo — melhorar equipe médica do nível 1 para 2:**

- Custo inicial: R$ 150.000
- Tempo: 30 dias
- Custo mensal adicional: R$ 15.000

Ver [Economia](./03-economia.md) para custos, manutenção e o impacto no fluxo de caixa.

## 3. As áreas da estrutura e seus efeitos

As áreas centrais da estrutura organizacional. Todas seguem a escala 1–10; abaixo, os efeitos por área com referências de comportamento nos níveis 1, 5 e 10.

### 3.1 Diretoria

Afeta a capacidade administrativa do clube. Impacta: qualidade de contratos, duração máxima de contratos, negociação salarial, limite de contratação, reputação institucional, acesso a jogadores melhores, organização financeira, risco de decisões ruins e capacidade de manter jogadores.

| Nível | Comportamento |
| --- | --- |
| 1 | Contratos curtos, negociação ruim, jogadores melhores rejeitam mais propostas, salários mais altos, cláusulas piores, menor controle financeiro |
| 5 | Contratos equilibrados, negociação média, contrata jogadores úteis, salários mais controlados, cláusulas melhores |
| 10 | Contratos longos e bem estruturados, negociação forte, atrai jogadores de nível alto, reduz custos salariais, protege ativos do clube |

### 3.2 Comissão técnica

Afeta a evolução técnica e tática dos jogadores. Impacta: treino técnico, treino tático, desenvolvimento individual, leitura de jogo, evolução de jovens, adaptação de posição, desempenho coletivo e entrosamento.

| Nível | Comportamento |
| --- | --- |
| 1 | Jovens evoluem pouco e de forma instável |
| 5 | Jovens evoluem com regularidade |
| 10 | Jovens bem escolhidos podem atingir alto potencial |

A comissão técnica também determina a qualidade das decisões e sugestões durante a partida — ver [seção 9](#9-comissão-técnica-cargos-e-atributos) e [Motor de partida](./05-motor-de-partida.md).

### 3.3 Preparação física

Afeta condição física, desgaste e queda de rendimento. Impacta: resistência, recuperação pós-jogo, cansaço acumulado, queda física de veteranos, chance de lesão muscular, intensidade de treino e desempenho em calendário apertado.

| Nível | Comportamento |
| --- | --- |
| 1 | Jogadores cansam mais, veteranos caem mais rápido, risco muscular maior |
| 5 | Recuperação normal, queda física controlada |
| 10 | Melhor recuperação, permite treinos fortes, prolonga a vida útil de alguns atletas |

### 3.4 Equipe médica

Afeta lesões, recuperação e diagnóstico. Impacta: chance de lesão, tempo de recuperação, risco de recaída, qualidade do tratamento, diagnóstico precoce, longevidade de jogadores e aposentadoria antecipada.

| Nível | Comportamento |
| --- | --- |
| 1 | Jogadores mais propensos a se machucar, lesões duram mais, maior chance de recaída, veteranos sofrem mais |
| 5 | Lesões dentro do padrão, recuperação razoável, risco médio de recaída |
| 10 | Menos lesões evitáveis, recuperação mais rápida, menor chance de recaída, ajuda a prolongar a carreira |

### 3.5 Olheiros

Afetam descoberta e avaliação de jogadores. Impactam: qualidade dos relatórios, chance de achar jovens bons, precisão do potencial, descoberta de jogadores baratos, acesso a regiões melhores, identificação de riscos e leitura de personalidade.

| Nível | Comportamento |
| --- | --- |
| 1 | Relatórios imprecisos, potencial pode estar errado, encontra poucos jogadores |
| 5 | Relatórios razoáveis, boa chance de achar jogadores úteis |
| 10 | Relatórios precisos, encontra joias raras com mais frequência, identifica riscos ocultos |

### 3.6 Comunicação

Não é cosmética: ela **controla narrativa**. Impacta: insatisfação da torcida, pressão após derrota, crise interna, moral do elenco, imagem pública, reação da imprensa, proteção de jogadores jovens, resposta a rumores e aceitação de projetos de longo prazo.

| Nível | Comportamento |
| --- | --- |
| 1 | Torcida perde paciência rápido, crises crescem mais, rumores afetam elenco, derrotas pesam mais, jovens sofrem mais pressão |
| 5 | Controla crises médias, reduz impacto de notícias negativas, mantém a torcida mais estável |
| 10 | Narrativa forte, protege o projeto esportivo, reduz pressão em transição, transforma jovens em símbolos do clube |

**Exemplo — controle de crise após venda do melhor jogador:**

| Comunicação | Torcida | Moral do elenco | Pressão da diretoria | Narrativa |
| --- | --- | --- | --- | --- |
| Nível 1 | -25 | -10 | +15 | — |
| Nível 5 | -12 | -5 | +5 | — |
| Nível 10 | -5 | 0 | 0 | "Venda estratégica para fortalecer o futuro" |

### 3.7 Categoria de base

Afeta geração e desenvolvimento dos jovens. Impacta: quantidade de jovens, qualidade média, chance de joias, evolução antes da promoção, formação de personalidade, adaptação tática, custo de formação e identidade com o clube.

| Nível | Comportamento |
| --- | --- |
| 1 | Poucos jovens úteis, evolução lenta, maior chance de jogadores crus |
| 5 | Gera jovens razoáveis, alguns podem virar titulares |
| 10 | Fluxo constante de bons jovens, maior chance de jogadores especiais, jovens chegam mais preparados |

### 3.8 Centro de treinamento (CT)

Afeta o desenvolvimento geral do elenco. Impacta: qualidade do treino, evolução técnica, evolução física, adaptação de posição, recuperação, entrosamento e plano individual.

| Nível | Comportamento |
| --- | --- |
| 1 | Treinos simples e pouco eficientes |
| 5 | Treinos consistentes |
| 10 | Desenvolvimento de elite |

### 3.9 Estádio

Afeta receita, torcida e pressão. Impacta: bilheteria, crescimento de torcida, mando de campo, satisfação da torcida, patrocínio, reputação do clube e custo de manutenção.

| Nível | Comportamento |
| --- | --- |
| 1 | Baixa receita, pouca torcida, pouca pressão sobre o adversário |
| 5 | Receita boa, torcida participativa |
| 10 | Grande fonte de receita, forte mando de campo, clube mais atrativo |

### 3.10 Análise de desempenho

Afeta leitura estatística e decisões estratégicas. Impacta: relatórios pós-jogo, identificação de pontos fracos, recomendação de treino, avaliação de jogadores, sugestão de escalação, prevenção de queda de rendimento e leitura do adversário.

| Nível | Comportamento |
| --- | --- |
| 1 | Poucos dados, relatórios genéricos, decisões mais no escuro |
| 5 | Bons relatórios, identifica tendências |
| 10 | Relatórios precisos, ajuda a maximizar desempenho, revela problemas antes que virem crise |

> **Pendência:** as fontes citam áreas complementares na árvore de evolução (Jurídico/Contratos, Financeiro, Fisioterapia, Recuperação, Marketing, Relacionamento com torcida, Academia, Nutrição, Fisiologia, Estrutura psicológica). Definir quais são departamentos independentes com nível próprio e quais são subdivisões das dez áreas centrais.

## 4. Funcionários como multiplicadores

Funcionários **não** devem dar vantagem direta absurda. Eles atuam como **multiplicadores de qualidade**: a estrutura não cria talento do nada, ela ajuda o clube a extrair melhor o talento existente.

**Exemplo — aproveitamento do potencial de evolução técnica de um jogador:**

| Comissão técnica | Aproveitamento do potencial |
| --- | --- |
| Nível 1 | 40% |
| Nível 5 | 70% |
| Nível 10 | 95% |

Isso significa que um jogador com potencial para evoluir 10 pontos em técnica aproveita apenas 4 pontos com comissão nível 1, contra 9,5 pontos com comissão nível 10.

O mesmo princípio de multiplicador aparece no desenvolvimento de jovens: o potencial bruto só se realiza plenamente com estrutura à altura.

**Exemplo — jogador com potencial bruto 85:**

| Estrutura (base / CT / comissão) | Chance real de alcançar |
| --- | --- |
| Nível 1 / 1 / 1 | 55–65 |
| Nível 5 / 5 / 5 | 70–80 |
| Nível 10 / 10 / 10 | 80–88 |

> Potencial não é promessa garantida. **Estrutura transforma potencial em realidade.**

**Efeito da estrutura sobre veteranos.** O mesmo princípio de multiplicador vale no outro extremo da carreira: a estrutura prolonga e valoriza veteranos sem quebrar o ciclo de renovação. Equipe médica alta reduz lesões e recaídas; preparação física alta retarda a queda física; comissão técnica alta reposiciona o veterano em uma função menos desgastante; comunicação alta protege o ídolo em má fase; e diretoria alta renova seu contrato de forma inteligente.

## 5. Estrutura, contratação e qualidade da informação

O nível de contratação **não depende só do caixa**. Um clube pode ter dinheiro e ainda assim não ter estrutura para atrair ou negociar bons nomes. A diretoria e a reputação pesam tanto quanto o dinheiro disponível.

**Exemplo — capacidade de contratação por diretoria + reputação:**

| Diretoria + reputação | Alcance de contratação |
| --- | --- |
| Nível 1 + reputação baixa | Jogadores simples, veteranos ou jovens sem mercado |
| Nível 5 + reputação média | Jogadores úteis e promessas medianas |
| Nível 10 + reputação alta | Disputa jogadores melhores e faz contratos mais inteligentes |

A capacidade de contratação combina, portanto: nível da diretoria + reputação do clube + salário disponível + projeto esportivo + comunicação + divisão atual.

**Teto de contratação por nível geral.** Além da diretoria e da reputação, o **nível geral** do clube define a faixa de jogadores que ele consegue disputar:

| Nível geral do clube | Faixa de jogadores acessível |
| --- | --- |
| 1 | E / D |
| 3 | D / C |
| 5 | C / B |
| 7 | B / A |
| 10 | A / S |

Esse é apenas o teto por nível; dentro da faixa, quem o clube realmente convence depende dos demais fatores acima. Detalhes de mercado e preços em [Economia](./03-economia.md).

**Qualidade da informação.** Áreas como olheiros, análise de desempenho e comissão técnica determinam **quão boa é a informação** que o usuário recebe. Olheiros fracos entregam relatórios imprecisos e potencial possivelmente errado; olheiros fortes revelam joias e riscos ocultos. Análise fraca deixa o clube decidir "no escuro"; análise forte antecipa problemas. Em partida, a comissão técnica é o filtro entre um alerta genérico ("Seu time parece cansado") e uma leitura acionável ("O adversário concentrou 63% dos ataques pelo seu lado direito; seu lateral está com 58% de energia e já levou amarelo — recomendo substituir"). Ver [Motor de partida](./05-motor-de-partida.md).

## 6. Crescimento controlado e manutenção mensal

### Não pode subir de nível rápido demais

Para manter o equilíbrio, o jogo precisa de travas. Um clube com nível geral 1 **não pode** contratar funcionário nível 10 imediatamente. Cada contratação/upgrade exige um conjunto de requisitos:

- dinheiro;
- reputação;
- nível mínimo do clube;
- estrutura compatível;
- tempo de implantação;
- custo mensal sustentável.

**Exemplo — para contratar equipe médica nível 7:** clube nível geral 5+, CT nível 4+, orçamento mensal suficiente e reputação mínima. Isso impede que o clube pule etapas.

Cada nível de funcionário possui: custo de contratação, salário mensal, tempo de implantação, benefício principal, benefício secundário e risco.

A cada faixa de nível corresponde um "tipo" de departamento, o que dá leitura imediata do estágio. Para a equipe médica, por exemplo:

| Nível | Departamento |
| --- | --- |
| 1 | Médico local barato |
| 3 | Departamento médico básico |
| 5 | Equipe profissional |
| 7 | Centro multidisciplinar |
| 10 | Departamento de elite |

**Exemplo — equipe médica nível 5:**

- Custo inicial: R$ 600.000
- Custo mensal: R$ 80.000
- Tempo de implantação: 60 dias
- Efeitos: reduz lesões evitáveis, reduz o tempo médio de recuperação, melhora o diagnóstico e reduz a chance de recaída

### Manutenção mensal recorrente

Estrutura boa custa caro — e esse é um mecanismo central de controle da economia. Quanto maior a estrutura: maior o custo mensal, maior a folha administrativa, maior a exigência de receita e maior a pressão por resultado. **Crescer tem risco:** um clube pode falir se tentar virar grande rápido demais.

**Espiral de risco — investir em CT nível 7 cedo demais:**

```
CT nível 7 cedo demais
  ↓ custos mensais sobem
  ↓ receita não acompanha
  ↓ precisa vender jogadores
  ↓ perde competitividade
```

Detalhamento de custos de upgrade, salários e manutenção recorrente em [Economia](./03-economia.md).

## 7. A estrutura como árvore de evolução

A estrutura organizacional é modelada como uma **árvore de evolução** agrupada em ramos temáticos. O usuário escolhe onde investir e, com isso, define o estilo do seu clube.

```
Administração
├── Diretoria
├── Jurídico/Contratos
└── Financeiro

Futebol
├── Comissão técnica
├── Preparação física
├── Análise de desempenho
└── Olheiros

Saúde
├── Equipe médica
├── Fisioterapia
└── Recuperação

Base
├── Categoria de base
├── Treinadores da base
└── Alojamento

Marca
├── Comunicação
├── Marketing
└── Relacionamento com torcida

Infraestrutura
├── Centro de treinamento
├── Estádio
└── Academia
```

Cada item da árvore, na tela de estrutura, exibe: nível atual, custo de melhoria, tempo de melhoria, custo mensal, benefícios, requisitos e impacto no clube.

## 8. Estilos de crescimento de clube

Como todos começam pequenos, os clubes podem crescer por caminhos diferentes conforme o ramo da árvore em que investem.

| Estilo | Investe em | Resultado |
| --- | --- | --- |
| **Formador** | Base, Olheiros, Comissão técnica, CT | Revela mais jogadores, vende melhor, depende menos do mercado; demora mais para ganhar títulos |
| **Comprador** | Diretoria, Financeiro, Comunicação, Estádio | Melhora receitas, contrata melhor, cresce por mercado; corre risco financeiro |
| **Competitivo** | Comissão técnica, Preparação física, Equipe médica, Análise de desempenho | Melhora performance imediata, reduz lesões, maximiza o elenco atual; pode sofrer no futuro se não formar jovens |
| **Popular** | Estádio, Comunicação, Marketing, Torcida | Cresce receita, aguenta melhor as crises, atrai patrocinadores; precisa converter isso em futebol |

**Exemplos de clubes iniciais** — todos começam no nível geral 1 com R$ 1.000.000 de caixa, mas com perfis distintos definidos por pequenos ajustes de pontualidade (+/- 1 nível em áreas específicas):

- **Clube Azul (formador inicial):** comissão técnica e base nível 2, demais áreas nível 1; +1 base, +1 comissão técnica, -1 diretoria.
- **Clube Vermelho (popular inicial):** diretoria, comunicação e estádio nível 2, demais nível 1; +1 comunicação, +1 estádio, -1 base.

Ambos são equilibrados, mas seguem caminhos diferentes.

## 9. Comissão técnica: cargos e atributos

A comissão técnica influencia treinamento, tática, desenvolvimento de jogadores, leitura de jogo, sugestões durante a partida, substituições automáticas, gestão de elenco, controle emocional e preparação física. **Quanto melhor a comissão, melhores são as sugestões oferecidas ao usuário durante os jogos** — e melhores as decisões automáticas quando o usuário está offline.

### Cargos possíveis

- Técnico
- Auxiliar técnico
- Preparador físico
- Médico
- Fisiologista
- Psicólogo
- Analista de desempenho
- Olheiro
- Coordenador da base
- Diretor de futebol
- Diretor financeiro
- Diretor de comunicação

Cada cargo possui **atributos próprios**.

**Exemplo — Auxiliar técnico:**

- Leitura tática
- Capacidade de sugestão
- Gestão de substituições
- Correção defensiva
- Correção ofensiva

> **Pendência:** as fontes detalham os atributos apenas do Auxiliar técnico. Definir o conjunto de atributos dos demais cargos (Técnico, Preparador físico, Médico, Fisiologista, Psicólogo, Analista, Olheiro, Coordenador da base e diretores).

### Impacto na qualidade das decisões em partida

A comissão técnica é o que separa uma sugestão vaga de uma leitura precisa e acionável, tanto para o usuário online quanto para a IA que assume o clube quando ele está offline.

| Situação | Comissão fraca | Comissão forte |
| --- | --- | --- |
| Sugestão em jogo | "Seu time parece cansado." | Leitura detalhada com dados do adversário, energia e cartões do jogador afetado e recomendação específica |
| IA offline | Substitui tarde, não percebe mudança tática adversária, mantém jogador cansado | Substitui melhor, reorganiza após expulsão, protege jogador importante, ajusta marcação |

A IA offline age de forma **conservadora**, baseada na comissão técnica do clube. Detalhamento do impacto na simulação e nas decisões em tempo real em [Motor de partida](./05-motor-de-partida.md).

## 10. Perfis de funcionários

Além do nível, funcionários podem ter **perfil**, o que adiciona estratégia sem depender apenas de número. Exemplos:

| Área | Perfis possíveis |
| --- | --- |
| Equipe médica | Preventiva; Recuperação rápida; Especialista em jovens; Especialista em veteranos; Barata mas limitada; Cara mas eficiente |
| Comunicação | Popular; Institucional; Agressiva; Transparente; Silenciosa; Focada em torcida jovem |
| Diretoria | Conservadora; Negociadora; Ousada; Formadora; Financeira; Ambiciosa |

> **Pendência:** as fontes trazem perfis apenas para equipe médica, comunicação e diretoria. Definir se as demais áreas (comissão técnica, olheiros, preparação física, análise etc.) também terão perfis e quais seriam.
