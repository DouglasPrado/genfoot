# Estrutura do Clube e Comissão Técnica (Staff)

> **Status:** Rascunho consolidado · **Fontes:** chats/planejamento-agrupado-do-jogo.md, chats/organizacao-de-pensamentos.md · **Revisão:** 2026-07-10

No **Grinta**, o usuário não gerencia apenas uma escalação: ele constrói uma instituição de futebol ao longo do tempo. O nível real de um clube é resultado da soma entre estrutura física, funcionários, reputação, finanças, desempenho esportivo e capacidade de formar e contratar jogadores. Dois clubes podem ter o mesmo caixa e ainda assim evoluir de formas completamente diferentes, dependendo de onde investem.

Este documento consolida a estrutura organizacional do clube em um **modelo único**: seis **núcleos funcionais** são a camada oficial de modelagem, medidos numa **escala única 1–5**; as ~10 **áreas** são subdivisões qualitativas dentro desses núcleos; a **infraestrutura física** (estádio, CT, academia) sai da escala de nível e é modelada de forma **granular** (dimensões e projetos); e os **funcionários** são modelados individualmente, com o antigo "multiplicador de qualidade" reinterpretado como **eficiência emergente** do núcleo. As seções 11–13 aprofundam, respectivamente, os núcleos, a infraestrutura granular e a separação entre cargo, responsabilidade e delegação. A escolha desse modelo canônico está registrada como **Recomendação R-10 (a ratificar)**, porque afeta o schema Club.

> **Recomendação (a ratificar — R-10):** adotar como **modelo canônico único de estrutura do clube**:
> - **Escala única 1–5** em todo o sistema (núcleos, áreas, comissão em partida e [Motor de partida](./05-motor-de-partida.md)), aposentando a escala 1–10 das fontes antigas. A tabela de faixas é a do núcleo: 1 Básico · 2 Funcional · 3 Competitivo · 4 Avançado · 5 Elite.
> - **Seis núcleos funcionais como camada oficial de modelagem** (nível, eficiência, moral, orçamento, especialização, adaptação). As **~10 áreas** passam a ser **subdivisões** com nível próprio 1–5; o nível do núcleo é a **agregação** dos níveis das suas áreas, e a **eficiência real** modula esse nível nominal por orçamento, sobrecarga, crise e adequação dos profissionais.
> - **Infraestrutura física fora da escala de nível:** estádio, CT e academia são modelados por **dimensões granulares** (propriedade/acesso, condição, capacidades, conformidade) e por **projetos de 9 etapas** (seção 12). Onde o texto ainda fala em "nível" de infraestrutura, trata-se de **leitura derivada** da dimensão de serviço/operacional que alimenta os núcleos.
> - **Funcionários modelados individualmente** (competências, autonomia, sobrecarga, contrato); o "multiplicador de qualidade" (seção 4) é o **efeito agregado emergente** dessas variáveis, não um parâmetro fixo por nível.
>
> **Racional:** é o recorte dos documentos definitivos (escopo → 6 núcleos 1–5; simulador → infraestrutura granular e funcionários que "não são apenas bônus percentuais") e o único que alinha com a escala 1–5 do Motor de partida. Elimina de uma só vez as três contradições estruturais do documento (escala, recorte, infraestrutura/multiplicador). **Impacto no schema Club:** define Núcleo (6) como raiz, Área como subdivisão, Infraestrutura como entidade separada e Funcionário como entidade individual — por isso aguarda ratificação no ADR.

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
11. [Modelo de 6 núcleos (consolidação)](#11-modelo-de-6-núcleos-consolidação)
12. [Infraestrutura granular](#12-infraestrutura-granular)
13. [Cargo, responsabilidade e delegação (funcionários)](#13-cargo-responsabilidade-e-delegação-funcionários)

---

## 1. Nível geral do clube

O clube não tem apenas um número único: ele tem **vários níveis internos** — um por área, agregados em seis núcleos — além de um **nível geral** derivado do conjunto. Um clube pode, por exemplo, ter o núcleo físico e médico nível 1, o de comunicação e torcida nível 4, o de gestão nível 2 e o de mercado e base nível 3 ao mesmo tempo — e, dentro de cada núcleo, áreas em níveis distintos.

O nível geral é calculado como uma composição da **estrutura interna** (a média ponderada dos seis núcleos) com **desempenho esportivo, finanças e reputação/torcida**, com a estrutura tendo peso alto.

> **Recomendação (a ratificar — R-11):** adotar **uma única fórmula** de nível geral, substituindo as duas formulações das fontes (40/25/15/10/10 e 60/20/10/10). Proposta: **composição externa 60/20/10/10** com a estrutura interna calculada pela **média ponderada dos seis núcleos**.
>
> **Composição externa (final):**
>
> | Componente | Peso |
> | --- | --- |
> | Estrutura interna (núcleos) | 60% |
> | Desempenho esportivo | 20% |
> | Finanças | 10% |
> | Reputação / torcida | 10% |
>
> **Peso interno entre os seis núcleos:**
>
> | Núcleo | Peso |
> | --- | --- |
> | 1. Técnico | 22% |
> | 2. Físico e médico | 18% |
> | 3. Mental e disciplinar | 12% |
> | 4. Mercado e base | 18% |
> | 5. Gestão e diretoria | 18% |
> | 6. Comunicação e torcida | 12% |
>
> **Racional:** a formulação 60/20/10/10 separa explicitamente a estrutura interna dos fatores externos, o que casa com o modelo de núcleos como camada oficial (R-10); os pesos por núcleo herdam a ênfase das antigas áreas (diretoria, técnico e base pesavam mais) e reservam espaço para o novo núcleo mental e disciplinar. Os pesos somam 100% e são valores de balanceamento sujeitos a ajuste.

Consequência de design: um clube campeão, porém desorganizado, **não vira gigante automaticamente**. Ele pode estar em boa fase e ainda ser estruturalmente pequeno. O crescimento é orgânico.

> **Regra de ouro:** o clube só cresce de verdade quando sua estrutura interna acompanha seu desempenho esportivo. Isso impede crescimento artificial.

## 2. Níveis por área

Cada área evolui na **escala única 1–5** (a mesma dos núcleos e do [Motor de partida](./05-motor-de-partida.md) — ver R-10):

| Nível | Descrição |
| --- | --- |
| 1 | Básico e limitado (amador) |
| 2 | Funcional (pequeno organizado) |
| 3 | Competitivo (médio) |
| 4 | Avançado (grande estruturado) |
| 5 | Elite |

O nível de cada área compõe o **nível nominal do seu núcleo** (seção 11). Cada upgrade custa **dinheiro, tempo e manutenção**. Não deve ser apenas "clicar e melhorar".

**Exemplo — melhorar equipe médica do nível 1 para 2:**

- Custo inicial: R$ 150.000
- Tempo: 30 dias
- Custo mensal adicional: R$ 15.000

Ver [Economia](./03-economia.md) para custos, manutenção e o impacto no fluxo de caixa.

## 3. As áreas da estrutura e seus efeitos

As áreas centrais da estrutura organizacional — **subdivisões dos seis núcleos** (seção 11). Todas seguem a **escala única 1–5**; abaixo, os efeitos por área com referências de comportamento nos níveis **1, 3 e 5**.

### 3.1 Diretoria

Afeta a capacidade administrativa do clube. Impacta: qualidade de contratos, duração máxima de contratos, negociação salarial, limite de contratação, reputação institucional, acesso a jogadores melhores, organização financeira, risco de decisões ruins e capacidade de manter jogadores.

| Nível | Comportamento |
| --- | --- |
| 1 | Contratos curtos, negociação ruim, jogadores melhores rejeitam mais propostas, salários mais altos, cláusulas piores, menor controle financeiro |
| 3 | Contratos equilibrados, negociação média, contrata jogadores úteis, salários mais controlados, cláusulas melhores |
| 5 | Contratos longos e bem estruturados, negociação forte, atrai jogadores de nível alto, reduz custos salariais, protege ativos do clube |

### 3.2 Comissão técnica

Afeta a evolução técnica e tática dos jogadores. Impacta: treino técnico, treino tático, desenvolvimento individual, leitura de jogo, evolução de jovens, adaptação de posição, desempenho coletivo e entrosamento.

| Nível | Comportamento |
| --- | --- |
| 1 | Jovens evoluem pouco e de forma instável |
| 3 | Jovens evoluem com regularidade |
| 5 | Jovens bem escolhidos podem atingir alto potencial |

A comissão técnica também determina a qualidade das decisões e sugestões durante a partida — ver [seção 9](#9-comissão-técnica-cargos-e-atributos) e [Motor de partida](./05-motor-de-partida.md). Ambos usam agora a **mesma escala 1–5** (R-10), eliminando a antiga divergência de granularidade (1–10 aqui × 1–5 no Motor de partida).

### 3.3 Preparação física

Afeta condição física, desgaste e queda de rendimento. Impacta: resistência, recuperação pós-jogo, cansaço acumulado, queda física de veteranos, chance de lesão muscular, intensidade de treino e desempenho em calendário apertado.

| Nível | Comportamento |
| --- | --- |
| 1 | Jogadores cansam mais, veteranos caem mais rápido, risco muscular maior |
| 3 | Recuperação normal, queda física controlada |
| 5 | Melhor recuperação, permite treinos fortes, prolonga a vida útil de alguns atletas |

### 3.4 Equipe médica

Afeta lesões, recuperação e diagnóstico. Impacta: chance de lesão, tempo de recuperação, risco de recaída, qualidade do tratamento, diagnóstico precoce, longevidade de jogadores e aposentadoria antecipada.

| Nível | Comportamento |
| --- | --- |
| 1 | Jogadores mais propensos a se machucar, lesões duram mais, maior chance de recaída, veteranos sofrem mais |
| 3 | Lesões dentro do padrão, recuperação razoável, risco médio de recaída |
| 5 | Menos lesões evitáveis, recuperação mais rápida, menor chance de recaída, ajuda a prolongar a carreira |

### 3.5 Olheiros

Afetam descoberta e avaliação de jogadores. Impactam: qualidade dos relatórios, chance de achar jovens bons, precisão do potencial, descoberta de jogadores baratos, acesso a regiões melhores, identificação de riscos e leitura de personalidade.

| Nível | Comportamento |
| --- | --- |
| 1 | Relatórios imprecisos, potencial pode estar errado, encontra poucos jogadores |
| 3 | Relatórios razoáveis, boa chance de achar jogadores úteis |
| 5 | Relatórios precisos, encontra joias raras com mais frequência, identifica riscos ocultos |

### 3.6 Comunicação

Não é cosmética: ela **controla narrativa**. Impacta: insatisfação da torcida, pressão após derrota, crise interna, moral do elenco, imagem pública, reação da imprensa, proteção de jogadores jovens, resposta a rumores e aceitação de projetos de longo prazo.

| Nível | Comportamento |
| --- | --- |
| 1 | Torcida perde paciência rápido, crises crescem mais, rumores afetam elenco, derrotas pesam mais, jovens sofrem mais pressão |
| 3 | Controla crises médias, reduz impacto de notícias negativas, mantém a torcida mais estável |
| 5 | Narrativa forte, protege o projeto esportivo, reduz pressão em transição, transforma jovens em símbolos do clube |

**Exemplo — controle de crise após venda do melhor jogador:**

| Comunicação | Torcida | Moral do elenco | Pressão da diretoria | Narrativa |
| --- | --- | --- | --- | --- |
| Nível 1 | -25 | -10 | +15 | — |
| Nível 3 | -12 | -5 | +5 | — |
| Nível 5 | -5 | 0 | 0 | "Venda estratégica para fortalecer o futuro" |

### 3.7 Categoria de base

Afeta geração e desenvolvimento dos jovens. Impacta: quantidade de jovens, qualidade média, chance de joias, evolução antes da promoção, formação de personalidade, adaptação tática, custo de formação e identidade com o clube.

| Nível | Comportamento |
| --- | --- |
| 1 | Poucos jovens úteis, evolução lenta, maior chance de jogadores crus |
| 3 | Gera jovens razoáveis, alguns podem virar titulares |
| 5 | Fluxo constante de bons jovens, maior chance de jogadores especiais, jovens chegam mais preparados |

### 3.8 Centro de treinamento (CT)

Afeta o desenvolvimento geral do elenco. Impacta: qualidade do treino, evolução técnica, evolução física, adaptação de posição, recuperação, entrosamento e plano individual.

| Nível | Comportamento |
| --- | --- |
| 1 | Treinos simples e pouco eficientes |
| 3 | Treinos consistentes |
| 5 | Desenvolvimento de elite |

O CT físico é **infraestrutura granular** (seção 12): o "nível 1–5" acima é a **leitura derivada** do serviço de treino que alimenta o núcleo técnico. Além do nível, o CT tem **capacidade operacional** própria (def-simulador §7.5): **disponibilidade de campos**, **capacidade de treinar categorias diferentes simultaneamente** (profissional + base) e **integração de grupos**. **Conflitos de agenda e indisponibilidade de áreas** do CT devem ser possíveis — treinar todas as categorias ao mesmo tempo pode competir por campos/horários, exigindo priorização.

> **Recomendação (a ratificar — R-13):** fixar a **capacidade operacional do CT por nível de serviço (1–5)**:
>
> | Nível do CT | Campos | Sessões simultâneas | Categorias em paralelo |
> | --- | --- | --- | --- |
> | 1 | 1 | 1 | só profissional OU base |
> | 2 | 2 | 1 | profissional + base alternados |
> | 3 | 2 | 2 | profissional + base |
> | 4 | 3 | 2 | profissional + base + sub-20 |
> | 5 | 4 | 3 | todas as categorias |
>
> **Resolução do conflito de agenda:** por **prioridade explícita definida pelo usuário** (fila por prioridade). Sessões que excedem a capacidade entram na fila; se forçadas, sofrem **perda de qualidade** (eficiência reduzida) em vez de bloqueio total. **Racional:** dá leitura clara de progressão e cria o trade-off de priorização citado na fonte sem travar o jogo; campos e sessões são a dimensão de capacidade da infraestrutura granular (seção 12). Valores de balanceamento a ajustar.

### 3.9 Estádio

Afeta receita, torcida e pressão. Impacta: bilheteria, crescimento de torcida, mando de campo, satisfação da torcida, patrocínio, reputação do clube e custo de manutenção.

| Nível | Comportamento |
| --- | --- |
| 1 | Baixa receita, pouca torcida, pouca pressão sobre o adversário |
| 3 | Receita boa, torcida participativa |
| 5 | Grande fonte de receita, forte mando de campo, clube mais atrativo |

A dimensão física do estádio (capacidade, condição, conformidade) é **infraestrutura granular** (seção 12); o "nível 1–5" acima é a **leitura derivada** de serviço/receita que alimenta o núcleo de comunicação e torcida.

### 3.10 Análise de desempenho

Afeta leitura estatística e decisões estratégicas. Impacta: relatórios pós-jogo, identificação de pontos fracos, recomendação de treino, avaliação de jogadores, sugestão de escalação, prevenção de queda de rendimento e leitura do adversário.

| Nível | Comportamento |
| --- | --- |
| 1 | Poucos dados, relatórios genéricos, decisões mais no escuro |
| 3 | Bons relatórios, identifica tendências |
| 5 | Relatórios precisos, ajuda a maximizar desempenho, revela problemas antes que virem crise |

**Resolução (áreas complementares).** As áreas que as fontes citam na árvore de evolução (seção 7) **não** são departamentos independentes com nível próprio: cada uma é **subdivisão de um dos seis núcleos** — ou **infraestrutura física**. Mapeamento:

| Área complementar | Classificação |
| --- | --- |
| Jurídico/Contratos | Subdivisão do núcleo 5 (Gestão e diretoria) |
| Financeiro | Subdivisão do núcleo 5 (Gestão e diretoria) |
| Fisioterapia | Subdivisão do núcleo 2 (Físico e médico) |
| Recuperação | Subdivisão do núcleo 2 (Físico e médico) |
| Nutrição | Subdivisão do núcleo 2 (Físico e médico) |
| Fisiologia | Subdivisão do núcleo 2 (Físico e médico) |
| Estrutura psicológica | Subdivisão do núcleo 3 (Mental e disciplinar) |
| Marketing | Subdivisão do núcleo 6 (Comunicação e torcida) |
| Relacionamento com torcida | Subdivisão do núcleo 6 (Comunicação e torcida) |
| Academia | Infraestrutura física (seção 12), não é núcleo nem área |

Isso mantém seis núcleos como camada oficial (R-10) e evita multiplicar departamentos com nível próprio.

## 4. Funcionários como multiplicadores

Funcionários **não** dão vantagem direta absurda. Seu efeito agregado é o de **multiplicadores de qualidade**: a estrutura não cria talento do nada, ela ajuda o clube a extrair melhor o talento existente. No modelo canônico (R-10), esse multiplicador **não é um parâmetro fixo por nível**: é a **eficiência emergente** do núcleo, resultado das competências, autonomia e carga de trabalho dos profissionais (seção 13). As curvas abaixo são a **leitura agregada** desse efeito.

> **Recomendação (a ratificar — R-12):** fixar a **curva de aproveitamento (eficiência) por nível de núcleo (1–5)**, substituindo os pontos 40/70/95% da escala 1–10:
>
> | Nível do núcleo | Aproveitamento do potencial |
> | --- | --- |
> | 1 | 40% |
> | 2 | 55% |
> | 3 | 70% |
> | 4 | 85% |
> | 5 | 95% |
>
> **Racional:** preserva as âncoras das fontes (base 40%, elite 95%) e interpola para os níveis intermediários da escala 1–5. Representa a eficiência **nominal**, ainda modulada para baixo por orçamento/sobrecarga (seções 11 e 13). Valores de balanceamento a ajustar.

Isso significa que um jogador com potencial para evoluir 10 pontos em técnica aproveita apenas 4 pontos com comissão nível 1, contra 9,5 pontos com comissão nível 5.

O mesmo princípio de multiplicador aparece no desenvolvimento de jovens: o potencial bruto só se realiza plenamente com estrutura à altura.

**Exemplo — jogador com potencial bruto 85:**

| Estrutura (base / CT / comissão) | Chance real de alcançar |
| --- | --- |
| Nível 1 / 1 / 1 | 55–65 |
| Nível 3 / 3 / 3 | 70–80 |
| Nível 5 / 5 / 5 | 80–88 |

> Potencial não é promessa garantida. **Estrutura transforma potencial em realidade.**

**Efeito da estrutura sobre veteranos.** O mesmo princípio de multiplicador vale no outro extremo da carreira: a estrutura prolonga e valoriza veteranos sem quebrar o ciclo de renovação. Equipe médica alta reduz lesões e recaídas; preparação física alta retarda a queda física; comissão técnica alta reposiciona o veterano em uma função menos desgastante; comunicação alta protege o ídolo em má fase; e diretoria alta renova seu contrato de forma inteligente.

## 5. Estrutura, contratação e qualidade da informação

O nível de contratação **não depende só do caixa**. Um clube pode ter dinheiro e ainda assim não ter estrutura para atrair ou negociar bons nomes. A diretoria e a reputação pesam tanto quanto o dinheiro disponível.

**Exemplo — capacidade de contratação por diretoria + reputação:**

| Diretoria + reputação | Alcance de contratação |
| --- | --- |
| Nível 1 + reputação baixa | Jogadores simples, veteranos ou jovens sem mercado |
| Nível 3 + reputação média | Jogadores úteis e promessas medianas |
| Nível 5 + reputação alta | Disputa jogadores melhores e faz contratos mais inteligentes |

A capacidade de contratação combina, portanto: nível da diretoria + reputação do clube + salário disponível + projeto esportivo + comunicação + divisão atual.

**Teto de contratação por nível geral.** Além da diretoria e da reputação, o **nível geral** do clube define a faixa de jogadores que ele consegue disputar:

> **Recomendação (a ratificar — R-14):** fixar o **teto de contratação por nível geral (1–5)**, remapeando a tabela antiga (que usava 1/3/5/7/10):
>
> | Nível geral do clube | Faixa de jogadores acessível |
> | --- | --- |
> | 1 | E / D |
> | 2 | D / C |
> | 3 | C / B |
> | 4 | B / A |
> | 5 | A / S |
>
> **Racional:** mantém o alcance elite→amador em cinco degraus alinhados à escala única (R-10); é apenas o teto por nível — quem o clube realmente convence depende dos demais fatores. Faixas de balanceamento a ajustar.

Esse é apenas o teto por nível; dentro da faixa, quem o clube realmente convence depende dos demais fatores acima. Detalhes de mercado e preços em [Economia](./03-economia.md).

**Qualidade da informação.** Áreas como olheiros, análise de desempenho e comissão técnica determinam **quão boa é a informação** que o usuário recebe. Olheiros fracos entregam relatórios imprecisos e potencial possivelmente errado; olheiros fortes revelam joias e riscos ocultos. Análise fraca deixa o clube decidir "no escuro"; análise forte antecipa problemas. Em partida, a comissão técnica é o filtro entre um alerta genérico ("Seu time parece cansado") e uma leitura acionável ("O adversário concentrou 63% dos ataques pelo seu lado direito; seu lateral está com 58% de energia e já levou amarelo — recomendo substituir"). Ver [Motor de partida](./05-motor-de-partida.md).

## 6. Crescimento controlado e manutenção mensal

### Não pode subir de nível rápido demais

Para manter o equilíbrio, o jogo precisa de travas. Um clube com nível geral 1 **não pode** contratar funcionário nível 5 imediatamente. Cada contratação/upgrade exige um conjunto de requisitos:

- dinheiro;
- reputação;
- nível mínimo do clube;
- estrutura compatível;
- tempo de implantação;
- custo mensal sustentável.

**Exemplo — para contratar equipe médica nível 4:** clube nível geral 3+, CT nível 3+, orçamento mensal suficiente e reputação mínima. Isso impede que o clube pule etapas.

Cada nível de funcionário possui: custo de contratação, salário mensal, tempo de implantação, benefício principal, benefício secundário e risco. O "tempo de implantação" curto e fixo vale para **departamentos/núcleos**; a **infraestrutura física** (estádio, CT, academia) segue o fluxo de **projetos de 9 etapas** com prazos reais (seção 12), não este tempo fixo.

A cada faixa de nível corresponde um "tipo" de departamento, o que dá leitura imediata do estágio. Para a equipe médica, por exemplo:

| Nível | Departamento |
| --- | --- |
| 1 | Médico local barato |
| 2 | Departamento médico básico |
| 3 | Equipe profissional |
| 4 | Centro multidisciplinar |
| 5 | Departamento de elite |

**Exemplo — equipe médica nível 3 (equipe profissional):**

- Custo inicial: R$ 600.000
- Custo mensal: R$ 80.000
- Tempo de implantação: 60 dias
- Efeitos: reduz lesões evitáveis, reduz o tempo médio de recuperação, melhora o diagnóstico e reduz a chance de recaída

### Manutenção mensal recorrente

Estrutura boa custa caro — e esse é um mecanismo central de controle da economia. Quanto maior a estrutura: maior o custo mensal, maior a folha administrativa, maior a exigência de receita e maior a pressão por resultado. **Crescer tem risco:** um clube pode falir se tentar virar grande rápido demais.

**Espiral de risco — investir em CT nível 4 cedo demais:**

```
CT nível 4 cedo demais
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

Os ramos (Administração, Futebol, Saúde, Base, Marca, Infraestrutura) são o **agrupamento visual da tela**, não uma camada de modelagem: cada folha corresponde a uma **subdivisão de um dos seis núcleos** (mapeamento em 3.10) ou à **infraestrutura física** (Centro de treinamento, Estádio, Academia), que segue o modelo granular da seção 12.

Cada item da árvore, na tela de estrutura, exibe: nível atual, custo de melhoria, tempo de melhoria, custo mensal, benefícios, requisitos e impacto no clube.

## 8. Estilos de crescimento de clube

Como todos começam pequenos, os clubes podem crescer por caminhos diferentes conforme o ramo da árvore em que investem.

| Estilo | Investe em | Resultado |
| --- | --- | --- |
| **Formador** | Base, Olheiros, Comissão técnica, CT | Revela mais jogadores, vende melhor, depende menos do mercado; demora mais para ganhar títulos |
| **Comprador** | Diretoria, Financeiro, Comunicação, Estádio | Melhora receitas, contrata melhor, cresce por mercado; corre risco financeiro |
| **Competitivo** | Comissão técnica, Preparação física, Equipe médica, Análise de desempenho | Melhora performance imediata, reduz lesões, maximiza o elenco atual; pode sofrer no futuro se não formar jovens |
| **Popular** | Estádio, Comunicação, Marketing, Torcida | Cresce receita, aguenta melhor as crises, atrai patrocinadores; precisa converter isso em futebol |

**Exemplos de clubes iniciais** — todos começam no nível geral 1 com o mesmo caixa inicial (**R$ 5.000.000**, ver [R-43](../99-decisoes/registro-de-decisoes.md)), mas com perfis distintos definidos por pequenos ajustes de pontualidade (+/- 1 nível em áreas específicas):

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

Cada cargo possui **atributos próprios**. O conjunto abaixo estende, para todos os cargos, o padrão detalhado nas fontes apenas para o Auxiliar técnico (mantido como exemplo trabalhado); os atributos são coerentes com os efeitos das áreas/núcleos das seções 3 e 11.

| Cargo | Atributos |
| --- | --- |
| Técnico | Definição tática; Gestão de vestiário; Desenvolvimento de jogadores; Leitura de jogo; Preparação de partida; Ajuste em tempo real |
| Auxiliar técnico | Leitura tática; Capacidade de sugestão; Gestão de substituições; Correção defensiva; Correção ofensiva |
| Preparador físico | Condicionamento; Controle de carga; Prevenção de lesão muscular; Recuperação pós-jogo; Periodização |
| Médico | Diagnóstico; Tratamento; Prevenção; Gestão de recaída; Avaliação de aptidão |
| Fisiologista | Avaliação fisiológica; Monitoramento de carga interna; Nutrição e suplementação; Longevidade do atleta veterano; Retorno pós-lesão |
| Psicólogo | Controle emocional; Gestão de pressão; Integração e coesão; Resolução de conflito; Confiança e foco |
| Analista de desempenho | Análise do adversário; Análise do próprio time; Estatística e dados; Recomendação de treino; Relatório pós-jogo |
| Olheiro | Precisão de avaliação; Leitura de potencial; Cobertura regional; Identificação de risco; Leitura de personalidade |
| Coordenador da base | Formação de jovens; Transição base→profissional; Identidade de jogo; Avaliação de promoção; Gestão de rotina/alojamento |
| Diretor de futebol | Negociação; Rede de contatos; Planejamento de elenco; Gestão de contratos; Visão de projeto |
| Diretor financeiro | Orçamento; Controle de folha; Gestão de dívida; Previsão de caixa; Conformidade financeira |
| Diretor de comunicação | Gestão de imprensa; Controle de crise; Relação com torcida; Patrocínio e marketing; Proteção de imagem de jovens |

**Exemplo trabalhado — Auxiliar técnico:** Leitura tática · Capacidade de sugestão · Gestão de substituições · Correção defensiva · Correção ofensiva.

### Impacto na qualidade das decisões em partida

A comissão técnica é o que separa uma sugestão vaga de uma leitura precisa e acionável, tanto para o usuário online quanto para a IA que assume o clube quando ele está offline.

| Situação | Comissão fraca | Comissão forte |
| --- | --- | --- |
| Sugestão em jogo | "Seu time parece cansado." | Leitura detalhada com dados do adversário, energia e cartões do jogador afetado e recomendação específica |
| IA offline | Substitui tarde, não percebe mudança tática adversária, mantém jogador cansado | Substitui melhor, reorganiza após expulsão, protege jogador importante, ajusta marcação |

A IA offline age de forma **conservadora**, baseada na comissão técnica do clube. Detalhamento do impacto na simulação e nas decisões em tempo real em [Motor de partida](./05-motor-de-partida.md).

## 10. Perfis de funcionários

Além do nível, funcionários podem ter **perfil**, o que adiciona estratégia sem depender apenas de número. Exemplos:

Todas as áreas (e, por extensão, os seis núcleos) têm perfis. O conjunto abaixo estende os exemplos das fontes (equipe médica, comunicação e diretoria) às demais áreas de forma coerente; são qualitativos, sem número de balanceamento.

| Área | Perfis possíveis |
| --- | --- |
| Equipe médica | Preventiva; Recuperação rápida; Especialista em jovens; Especialista em veteranos; Barata mas limitada; Cara mas eficiente |
| Comunicação | Popular; Institucional; Agressiva; Transparente; Silenciosa; Focada em torcida jovem |
| Diretoria | Conservadora; Negociadora; Ousada; Formadora; Financeira; Ambiciosa |
| Comissão técnica | Ofensiva; Defensiva; Formadora de jovens; Motivadora; Tática/estudiosa; Pragmática |
| Olheiros | Regional; Internacional; Especialista em jovens; Caçadora de oportunidades (livres/baratos); Analítica (dados); Tradicional (campo) |
| Preparação física | Intensa; Preventiva; Especialista em recuperação; Especialista em veteranos; Conservadora |
| Análise de desempenho | Estatística/dados; Vídeo/tática; Focada no adversário; Focada no próprio time |
| Categoria de base | Formadora agressiva; Paciente; Focada em identidade; Vendedora (revela para vender) |
| Mental e disciplinar (psicólogo) | Disciplinadora; Acolhedora; Focada em liderança; Especialista em jovens |

## 11. Modelo de 6 núcleos (consolidação)

O documento definitivo de escopo consolida a estrutura do **Grinta** em **seis núcleos funcionais**, cada um combinando estrutura, profissionais, orçamento, processos, moral, adaptação e especializações. Estes seis núcleos são a **camada oficial de modelagem** do clube (R-10): as ~10 áreas das seções 2–3 são **subdivisões** destes núcleos, e todo o sistema usa a **escala única 1–5**.

**Escala de nível do núcleo:**

| Nível | Significado |
| --- | --- |
| 1 | Básico e limitado |
| 2 | Funcional |
| 3 | Competitivo |
| 4 | Avançado |
| 5 | Elite |

O nível não representa apenas instalações: inclui capacidade, equipe, ferramentas e processos. A **eficiência real** pode ficar abaixo do nível nominal se houver orçamento insuficiente, sobrecarga, crise, profissionais inadequados ou baixa adaptação. Cada núcleo possui uma **especialização principal** e uma **secundária**; trocar de especialização exige investimento, tempo e adaptação, e pode reduzir a eficiência temporariamente.

**Composição dos seis núcleos a partir das áreas (subdivisões), na escala única 1–5:**

| Núcleo | Áreas atuais mapeadas | Especializações (principal/secundária) | Principais efeitos |
| --- | --- | --- | --- |
| 1. Técnico | Comissão técnica; Centro de treinamento (qualidade do treino); Análise de desempenho (leitura de jogo) | posse, pressão, transição, jogo direto, bloco baixo, bola parada, jovens, análise de adversário | escalação e substituição automática, plano de jogo, leitura do adversário, repertório tático, sugestões em partida, adaptação, plano para jogos sem o usuário |
| 2. Físico e médico | Preparação física; Equipe médica | prevenção, recuperação, performance, jovens, veteranos, retorno pós-lesão, diagnóstico | risco de lesão, controle de carga, recuperação, diagnóstico, prevenção, cuidado com jovens/veteranos, recomendação de escalação e substituição |
| 3. Mental e disciplinar | (sem área direta hoje; diluído em comissão técnica e comunicação) | pressão, liderança, disciplina, integração, crise, confiança, adaptação | moral, pressão, disciplina, reação a erros, liderança, integração, conflitos, estabilidade de jovens, recuperação emocional |
| 4. Mercado e base | Olheiros; Categoria de base | captação regional, scouting, jovens, livres, contratos, empréstimos, análise de dados | precisão do scouting, avaliação de potencial, descoberta e proteção de jovens, contratos, oportunidades de mercado, empréstimos, reputação formadora |
| 5. Gestão e diretoria | Diretoria (+ Jurídico/Contratos e Financeiro da árvore) | folha, dívida, orçamento, contratos, infraestrutura, conformidade, crise | orçamento, previsão de caixa, controle de folha, dívida, negociação, infraestrutura, licenciamento, contratação de profissionais, planos de recuperação |
| 6. Comunicação e torcida | Comunicação; Estádio (dimensão torcida/receita, não a física) | imprensa, torcida, marketing, sócios, patrocínio, proteção de jovens, gestão de ídolos | reação a resultados e decisões, crise de imagem, imprensa, patrocínios, sócios, vazamentos, proteção de jovens, venda de ídolos, narrativa do projeto |

Notas de mapeamento:

- O **núcleo mental e disciplinar** não tem equivalente direto nas 10 áreas atuais; hoje suas funções aparecem diluídas na comissão técnica (controle emocional) e na comunicação (moral e pressão). É a principal novidade estrutural do modelo de 6 núcleos.
- A **dimensão física** do Estádio, do CT e da Academia pertence à infraestrutura granular (ver [seção 12](#12-infraestrutura-granular)), não ao núcleo. Só a leitura de "torcida/receita" do estádio entra no núcleo de comunicação e torcida.
- **Análise de desempenho** alimenta tanto o núcleo técnico (leitura de jogo) quanto o núcleo de mercado e base (análise de dados de scouting).

> **Resolução (R-10).** Escala e recorte ficam unificados: **escala única 1–5** em núcleos, áreas, comissão em partida e Motor de partida (resolve a divergência 1–10 × 1–5 antes apontada aqui e em 3.2); e os **seis núcleos são a camada oficial**, com as áreas como subdivisões e o **núcleo mental e disciplinar** como nova entidade de primeira classe (dá casa à antiga "estrutura psicológica"). O nível do núcleo é a agregação dos níveis das suas áreas; a **eficiência real** o modula por orçamento, sobrecarga, crise e adequação dos profissionais.

## 12. Infraestrutura granular

O documento definitivo do simulador **rejeita explicitamente representar a infraestrutura como uma lista genérica de níveis**. A infraestrutura é composta por instalações, módulos, equipamentos, capacidades e condições reais. Isso **substitui** o antigo tratamento por "nível" de Estádio, CT e Academia nas seções 2–3 (ver resolução ao fim da seção).

**Áreas físicas:** Estádio; Centro de treinamento; Medicina e reabilitação; Desempenho e análise; Academia e formação; Administração; Tecnologia e dados; Comercial e hospitalidade; Transporte e logística.

### 12.1 Propriedade vs. acesso vs. capacidade operacional

Uma instalação não é só "boa" ou "ruim". **Propriedade, direito de uso e capacidade operacional são tratados separadamente.** Uma instalação pode ser:

- **Própria**
- **Alugada**
- **Concedida**
- **Compartilhada**
- **Utilizada por acordo temporário**

Ou seja: o clube pode ter acesso a um estádio de alto padrão sem ser dono dele, ou ser dono de uma estrutura que opera abaixo da sua capacidade nominal.

### 12.2 Dimensões distintas de cada estrutura

Cada estrutura carrega dimensões independentes — um único "nível" não as resume:

- **Qualidade funcional**
- **Condição física** (estado de conservação)
- **Capacidade nominal**
- **Capacidade operacional**
- **Disponibilidade**
- **Conformidade** (licenças e certificações)

Uma instalação de alta qualidade pode operar mal se estiver deteriorada, sem manutenção ou sem funcionários suficientes. No estádio, a **capacidade licenciada pode ser menor que a capacidade física**.

### 12.3 Manutenção, deterioração e conformidade

Instalações se deterioram com uso, tempo, clima, falta de manutenção, incidentes e sobrecarga. A manutenção preventiva reduz risco, mas tem custo e ocupa recursos. Instalações podem exigir inspeção, certificação, licença, capacidade mínima e plano de adequação; falhas geram restrição de uso, redução de capacidade, necessidade de estádio alternativo, impedimento de acesso a divisão superior ou multa/prazo de correção. Ver licenciamento em [Economia](./03-economia.md) e nas regras de competição.

### 12.4 Projetos de infraestrutura (processo de 9 etapas)

Uma obra não é "clicar e melhorar": é um **projeto que percorre nove etapas**.

```
1. Estudo de viabilidade
2. Aprovação
3. Financiamento
4. Contratação
5. Preparação
6. Execução
7. Inspeção
8. Entrega
9. Entrada em operação
```

**Riscos de projeto** (podem ocorrer em qualquer etapa): atraso; aumento de custo (sobrecusto); mudança de escopo; falha de fornecedor; entrega parcial; problemas de licença.

### 12.5 Obras que atravessam a temporada

Obras em andamento afetam capacidade do estádio, treinos, rotina médica, amistosos, receita e disponibilidade de instalações. **O fim de uma temporada não conclui automaticamente uma obra:** ela continua conforme seus prazos reais, atravessando a virada de temporada. Isso contrasta com o "tempo de implantação" curto e fixo dos upgrades por nível (seção 6).

### 12.6 Patrimônio e sustentabilidade

A infraestrutura tem valor, custo de manutenção, vida útil e impacto operacional. O clube pode comprar, vender, alugar, ampliar, substituir ou desativar ativos, respeitando contratos e aprovações. Medidas de eficiência, consumo e adaptação climática reduzem custos e riscos, sem gerar vantagens mágicas.

> **Resolução (R-10).** A infraestrutura física **sai do modelo de níveis**: estádio, CT e academia são modelados pelas dimensões granulares acima (propriedade/acesso, condição, capacidades, conformidade) e por projetos de 9 etapas com prazos reais. Onde os departamentos/núcleos ainda exibem um "nível 1–5" ligado a essas instalações, ele é **leitura derivada** da dimensão de serviço/operacional (ex.: a capacidade do CT em R-13 alimenta o nível de serviço do CT que abastece o núcleo técnico), nunca a modelagem primária da obra. Os departamentos e núcleos mantêm o modelo de nível 1–5; a infraestrutura física, não.

## 13. Cargo, responsabilidade e delegação (funcionários)

Esta seção refina o papel dos funcionários descrito na seção 4. O documento definitivo do simulador é explícito: **funcionários não serão apenas bônus percentuais.** Cada profissional possui identidade, carreira, função, competências, especialidades, reputação, contrato, relações, disponibilidade, carga de trabalho e responsabilidades. O "multiplicador de qualidade" (seção 4) é o efeito agregado, não a definição completa do funcionário.

### 13.1 Cargo ≠ responsabilidade

**Cargo e responsabilidade são separados.** Um funcionário ocupa um cargo e recebe responsabilidades específicas, com **limites definidos**. Exemplos:

- O diretor esportivo **prepara** negociações; o usuário **aprova** compromissos acima de determinado valor.
- O analista **produz recomendações**, mas não altera a tática sozinho.

### 13.2 Delegação graduada (mantendo visibilidade)

A delegação é graduada por nível de autoridade:

- **Preparar**
- **Recomendar**
- **Monitorar**
- **Executar dentro de limites**
- **Aprovar ações de baixo risco**

**Delegar não significa perder visibilidade.** O usuário sempre deve saber: quem recebeu a tarefa, qual autoridade possui, o que foi realizado, qual regra foi usada e qual resultado ocorreu. Alinha-se à delegação por área da governança do clube — recomendações podem ser ignoradas, mas as consequências permanecem com o gestor.

### 13.3 Sobrecarga, ausência e escalonamento

Funcionários podem ficar **sobrecarregados, indisponíveis ou ausentes**. Isso pode causar: atraso; menor qualidade de análise; falta de acompanhamento; necessidade de substituto; **escalonamento ao usuário**. Excesso de lesionados, relatórios, categorias de base, negociações ou crises reduz a eficiência do núcleo responsável; contratar mais profissionais alivia a sobrecarga, mas aumenta a folha.

**Áreas críticas não podem permanecer sem responsável sem que o jogo sinalize a lacuna.** O clube mantém sempre uma operação mínima (execução básica e fraca), e saídas repentinas podem ser cobertas por interinos por período curto.

### 13.4 Desenvolvimento de funcionários

Funcionários evoluem (ganham experiência, melhoram competências, obtêm qualificações, mudam de função, são promovidos) ou regridem (perdem desempenho por idade, contexto ou desatualização) e podem se aposentar. O desenvolvimento depende de trabalho, formação, ambiente e oportunidade, não de progressão automática idêntica. Complementa o efeito da estrutura sobre veteranos e o ciclo de renovação já descrito na seção 4.

> **Resolução (R-10).** O multiplicador agregado da seção 4 é **efeito emergente**, não parâmetro fixo: a **eficiência do núcleo** — e portanto a curva de aproveitamento de R-12 — resulta das competências, autonomia, carga de trabalho e disponibilidade dos profissionais descritas nesta seção, modulada por orçamento e crise (seção 11). "Multiplicador" e "modelagem individual" são a mesma coisa vista em dois níveis de detalhe: o número é a **leitura agregada** da simulação individual.
