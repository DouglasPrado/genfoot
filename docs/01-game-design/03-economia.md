# Economia do Jogo

> **Status:** Rascunho consolidado · **Fontes:** chats/economics-initial.md, chats/planejamento-agrupado-do-jogo.md, chats/escopo-definitivo-simulador.md · **Revisão:** 2026-07-11

A economia de **Grinta** é o motor invisível que gera histórias. Ela não é apenas o "saldo do clube": é um ecossistema financeiro que explica por que um clube vende uma promessa, por que outro entra em crise, por que um jogador aceita ganhar menos para ficar, por que empresários inflam salários, por que uma joia de país menor sai barata ou por que um clube rico destrói o mercado.

Este documento tem dois níveis complementares. O **nível do clube** descreve como cada clube arrecada, gasta, se endivida e negocia. O **nível global** descreve como todo o universo do jogo se mantém equilibrado: uma economia fechada e regulada, onde cada temporada recalcula a saúde do ecossistema. Grinta preserva a herança de manager online estilo Brasfoot (jogadores únicos, mundo persistente), mas adiciona uma camada econômica sistêmica onde cada jogador é, ao mesmo tempo, um ativo esportivo, emocional e financeiro.

## Sumário

1. [Modelo em 4 camadas](#1-modelo-em-4-camadas)
2. [Os 7 perfis econômicos de clube](#2-os-7-perfis-econômicos-de-clube)
3. [Entidades econômicas conceituais](#3-entidades-econômicas-conceituais)
4. [Receitas e despesas do clube](#4-receitas-e-despesas-do-clube)
5. [Fórmulas conceituais](#5-fórmulas-conceituais)
6. [Saúde financeira (financialHealth)](#6-saúde-financeira-financialhealth)
7. [Mercado: oferta, demanda e temperatura](#7-mercado-oferta-demanda-e-temperatura)
8. [Contratos, empresários e mente financeira](#8-contratos-empresários-e-mente-financeira)
9. [Torcida, patrocínio e investimentos](#9-torcida-patrocínio-e-investimentos)
10. [Dívidas, punições e loops de consequência](#10-dívidas-punições-e-loops-de-consequência)
11. [Ciclos de processamento](#11-ciclos-de-processamento)
12. [Arquitetura EconomicEngine](#12-arquitetura-economicengine)
13. [Eventos econômicos](#13-eventos-econômicos)
14. [Economia global balanceada](#14-economia-global-balanceada)
15. [Contabilidade e disciplina financeira](#15-contabilidade-e-disciplina-financeira)

---

## 1. Modelo em 4 camadas

A economia é dividida em quatro camadas hierárquicas. O jogador continua sendo único, mas agora existe dentro de um ecossistema financeiro que o influencia e que ele influencia de volta.

```
Mundo / País
   ↓
Liga / Competição
   ↓
Clube
   ↓
Jogador / Família / Empresário / Carreira
```

Cada camada condiciona a seguinte. Um exemplo de propagação típica:

- Jogador nasceu pobre → tem alta ambição financeira → aceita proposta de fora mais facilmente → empresário pressiona por salário maior → clube formador precisa decidir: renovar caro ou vender cedo.

E um exemplo no nível do clube:

- Clube pequeno com boa base → gera jogadores baratos → depende de vendas → se segura o jogador por muito tempo pode quebrar o caixa; se vende cedo demais, perde competitividade.

O **nível global** (país/mundo) é detalhado na [seção 14](#14-economia-global-balanceada): ele regula quantos jogadores existem, quanto dinheiro circula e como os preços se ajustam ao tamanho do universo.

## 2. Os 7 perfis econômicos de clube

A economia não deve ser igual para todos os clubes. Cada clube tem um **perfil econômico** que determina seu comportamento e as decisões que enfrenta.

| Perfil | Comportamento econômico |
| --- | --- |
| Clube gigante | Alta receita, salários altos, pressão por títulos |
| Clube médio estável | Receita moderada, compra pouco, vende bem |
| Clube formador | Base forte, depende de vender jogadores |
| Clube endividado | Precisa vender, aceita propostas menores |
| Clube emergente | Tem investimento recente, busca crescer rápido |
| Clube tradicional decadente | Grande torcida, mas dívida e folha pesada |
| Clube pequeno regional | Baixo orçamento, depende de bilheteria e empréstimos |

O perfil cria decisões distintas. Um gigante pensa "preciso contratar um craque para ganhar a Libertadores"; um pequeno pensa "preciso vender meu atacante antes que o contrato acabe"; um endividado pensa "mesmo que o jogador seja importante, preciso fazer caixa".

> **Pendência:** Relacionar estes 7 perfis (dinâmicos, resultado da gestão) com os "perfis iniciais de identidade" da economia global (ver [seção 14.3](#143-clubes-começam-pequenos-mas-com-identidade)), que descrevem clubes recém-criados, todos equilibrados em poder mas diferentes em estilo. São eixos diferentes (situação financeira vs. identidade de estilo) e o modelo precisa definir como convivem.

## 3. Entidades econômicas conceituais

As entidades a seguir são descrições conceituais dos dados que o sistema mantém. O importante não são os números em si, mas o fato de que **cada campo influencia comportamento**.

### 3.1 ClubEconomy

O módulo financeiro central de cada clube.

```
ClubEconomy {
  cash                  // caixa disponível
  debt                  // dívida total
  monthlyRevenue        // receita mensal
  monthlyExpense        // despesa mensal
  wageBill              // folha salarial atual
  wageBudget            // teto salarial autorizado
  transferBudget        // orçamento de transferências
  financialHealth       // índice 0–100 (ver seção 6)
  riskTolerance         // tolerância a risco/dívida
  boardPressure         // pressão da diretoria
  sponsorStrength       // força dos patrocínios
  fanbaseSize           // tamanho da torcida
  stadiumRevenuePower   // poder de arrecadação do estádio
  academyInvestment     // investimento na base
  scoutingInvestment    // investimento em olheiros
}
```

Exemplo de propagação: `financialHealth` baixa → clube vende mais fácil → reduz orçamento salarial → evita jogadores caros → atrasa renovações → torcida pressiona a diretoria.

### 3.2 PlayerContract

O contrato é uma entidade forte, não apenas um salário.

```
PlayerContract {
  salary              // salário
  bonusPerGoal        // bônus por gol
  bonusPerAppearance  // bônus por partida
  signingBonus        // luvas
  releaseClause       // multa rescisória
  loyaltyBonus        // bônus de fidelidade
  contractUntil       // vigência
  agentCommission     // comissão do empresário
  imageRights         // direitos de imagem
  renewalInterest     // interesse em renovar
}
```

Isso permite situações reais: jogador aceita salário menor mas quer multa baixa; jogador quer luvas altas por vir de infância pobre; jogador leal renova com salário moderado; empresário exige comissão absurda; jogador famoso quer direito de imagem; jogador instável quer contrato curto.

### 3.3 PlayerEconomicMind

Como os jogadores são únicos, cada um tem uma "mente financeira" própria.

```
PlayerEconomicMind {
  ambition         // ambição
  loyalty          // lealdade
  greed            // ganância
  familyPressure   // pressão familiar
  agentInfluence   // influência do empresário
  lifestyleCost    // custo de vida/estilo
  careerSecurity   // desejo de segurança
  statusDesire     // desejo de status
}
```

Conecta diretamente com a história de vida do jogador. Quem passou fome na infância tende a maior desejo de estabilidade, pode aceitar sair para ganhar mais, pedir luvas maiores e sofrer pressão da família. Quem cresceu em ambiente equilibrado pode priorizar o projeto esportivo e negociar com calma. Quem tem moral instável pode oscilar sob pressão e tomar decisões emocionais.

### 3.4 Agent (empresário)

O empresário é uma peça econômica que dá vida ao mercado.

```
Agent {
  reputation
  greed
  influence
  networkStrength
  negotiationStyle: "calm" | "aggressive" | "opportunist"
}
```

Um agente agressivo pede salário alto, força transferências, vaza interesse para a imprensa e aumenta a pressão sobre o clube. Um agente leal facilita renovações, aceita o projeto esportivo e evita conflitos.

### 3.5 Fanbase (torcida)

A torcida não é só moral: é dinheiro.

```
Fanbase {
  size            // tamanho
  loyalty         // fidelidade
  expectation     // expectativa
  anger           // irritação
  engagement      // engajamento
  purchasingPower // poder de compra
}
```

Afeta bilheteria, sócio-torcedor, venda de camisas, pressão na diretoria, atratividade para jogadores, patrocínio e moral do elenco. Ver [seção 9](#9-torcida-patrocínio-e-investimentos).

### 3.6 CountryEconomy

A nacionalidade impacta minimamente atributos, mas fortemente a economia.

```
CountryEconomy {
  footballReputation
  averageSalaryLevel
  exportStrength
  leagueVisibility
  costOfLiving
  workPermitDifficulty
  scoutingDifficulty
}
```

Um jovem brasileiro é observado cedo pelo mercado internacional; um jogador de liga fraca tem salário base menor e transferência inicial mais barata, mas valorização explosiva se performar; um europeu de liga forte custa mais, mas tem menor risco de adaptação.

### 3.7 MarketInflation

Índices que fazem o mercado evoluir ao longo das temporadas, evitando previsibilidade.

```
MarketInflation {
  wageInflation      // inflação salarial
  transferInflation  // inflação de transferências
  sponsorInflation   // inflação de patrocínios
}
```

### 3.8 Debt

Dívida é recurso estratégico, mas perigoso.

```
Debt {
  principal
  interestRate
  monthlyPayment
  dueDate
  type: "bank" | "tax" | "stadium" | "salary" | "supplier"
}
```

Tipos: empréstimo bancário, dívida fiscal, atraso salarial, financiamento de estádio, dívida com empresários, parcelas de transferências. Ver [seção 10](#10-dívidas-punições-e-loops-de-consequência).

### 3.9 TransferStrategy

Durante a janela, cada clube adota uma estratégia.

```
TransferStrategy {
  priority: "buy" | "sell" | "loan" | "develop" | "cut_costs"
  maxWageIncrease
  maxTransferSpend
  mustSellValue
  preferredAgeRange: [min, max]
}
```

### 3.10 EconomicEvent

Modelo genérico de evento com impacto econômico. Ver [seção 13](#13-eventos-econômicos).

```
EconomicEvent {
  type
  actorType: "player" | "club" | "league" | "country"
  actorId
  impact: {
    cash?, marketValue?, salaryExpectation?,
    sponsorInterest?, fanEngagement?, financialHealth?, debt?
  }
  duration: "instant" | "temporary" | "permanent"
}
```

## 4. Receitas e despesas do clube

### 4.1 Receitas

As receitas vêm de várias fontes: bilheteria, sócio-torcedor, patrocínio, direitos de TV, premiação, venda de jogadores, produtos/camisa, participação em competições, investidor/mecenas e base/formação.

Conceitualmente, agrupam-se em:

```
Receita Mensal =
    Receita Fixa           (TV, patrocínio, sócios)
  + Receita de Jogos       (bilheteria)
  + Receita Comercial      (produtos, camisa)
  + Receita de Competição  (premiação, participação)
  + Receita Extraordinária (vendas, eventos)
```

### 4.2 Despesas

As despesas são tão importantes quanto as receitas: salários dos jogadores, salários da comissão técnica, bônus por vitória/gols/títulos, manutenção do estádio, viagens, departamento médico, base, olheiros, empresários, impostos, dívidas, juros, multas, rescisões, contratações e luvas.

A **folha salarial é o maior risco**. Folha muito alta significa time forte no curto prazo, risco financeiro no médio prazo e necessidade de título ou de venda.

### 4.3 Bilheteria dinâmica

A bilheteria não é um número fixo. Depende do tamanho da torcida, capacidade do estádio, preço do ingresso, fase do time, adversário, clássico, competição, horário, clima emocional da torcida, presença de ídolos e sequência de resultados.

Isso gera decisão de gestão: ingresso barato → estádio cheio → moral sobe → receita média por cabeça menor. Ingresso caro → estádio mais vazio → torcida reclama → receita por cabeça maior.

## 5. Fórmulas conceituais

As fórmulas abaixo são **conceituais**: descrevem quais fatores entram e em que direção puxam o resultado. Os pesos, coeficientes e números exatos são objeto de calibração.

> **Pendência:** Todos os coeficientes, pesos e constantes das fórmulas desta seção (e das seções 6, 7, 9 e 14) precisam ser calibrados e formalizados no catálogo de fórmulas. Ver `../02-tecnico/05-catalogo-de-regras-e-formulas.md`.

### 5.1 Receita mensal

```
Receita Mensal =
    Receita Fixa
  + Receita de Jogos
  + Receita Comercial
  + Receita de Competição
  + Receita Extraordinária
```

### 5.2 Público esperado (bilheteria)

```
Público Esperado =
    Torcida Ativa
  × Interesse no jogo
  × Momento do time
  × Força do adversário
  × Preço acessível
```

Limitado pela capacidade do estádio. A receita resultante é `Público × Preço do ingresso`, com o preço afetando negativamente a ocupação.

### 5.3 Valor de mercado

O valor não é apenas o "overall". Considera idade, atributos atuais, potencial, posição, nacionalidade, liga, histórico de lesão, personalidade, moral, fama, contrato restante, salário, empresário, interesse de clubes, necessidade do vendedor e do comprador e momento da janela.

```
Valor de Mercado =
    Qualidade Atual
  + Potencial
  + Fama
  + Escassez da Posição
  + Interesse Externo
  - Risco de Lesão
  - Instabilidade
  - Pouco Tempo de Contrato
  - Pressão Financeira do Clube
```

Um atacante de 19 anos, potencial alto, contrato longo, clube vendedor saudável e vários interessados tem preço muito elevado. Um meia de 29 anos, bom mas com contrato terminando em 6 meses num clube endividado, tem preço em queda. O componente de **escassez da posição** depende do estado global do universo (ver [seção 14.6](#146-preço-dos-jogadores-como-reflexo-do-universo)).

### 5.4 Valor de patrocínio

```
Valor do Patrocínio =
    Tamanho da torcida
  × Divisão
  × Reputação do clube
  × Presença de estrelas
  × Campanha recente
  × Mercado local
```

Um craque contratado pode aumentar o patrocínio (vende mais camisa, atrai patrocinadores, aumenta mídia), mas também aumenta a folha. Isso cria o dilema: vale contratar caro se ele paga parte do custo com exposição?

## 6. Saúde financeira (financialHealth)

Um índice central de **0 a 100** resume a situação econômica do clube.

| Faixa | Situação | Efeitos |
| --- | --- | --- |
| 90–100 | Excelente | Liberdade de investimento, poder de contratação, resistência a propostas |
| 70–89 | Estável | Operação saudável, orçamento previsível |
| 50–69 | Atenção | Cautela, orçamento mais controlado |
| 30–49 | Pressão financeira | Diretoria força venda, orçamento de transferência cai, moral pode cair |
| 10–29 | Crise | Vendas obrigatórias, jogadores cobram atrasos, empresários ficam agressivos |
| 0–9 | Colapso | Risco de punições, elenco perde confiança, possível intervenção da diretoria |

O índice é calculado a partir de: caixa, dívida, folha salarial, receita recorrente, resultado esportivo, contratos futuros, pressão da torcida e confiança da diretoria.

> **Pendência:** Definir os pesos de cada fator no cálculo de `financialHealth` e os limiares exatos que disparam cada efeito. Calibração em `../02-tecnico/05-catalogo-de-regras-e-formulas.md`.

Exemplo de efeitos encadeados com `financialHealth < 40`: diretoria força venda → orçamento de transferência cai → jogadores cobram atrasos → moral do elenco cai → empresários ficam agressivos.

## 7. Mercado: oferta, demanda e temperatura

O mercado é uma economia própria, com **temperatura**.

- **Mercado frio:** clubes compram menos → salários caem → jogadores livres aceitam menos.
- **Mercado quente:** clubes disputam atletas → salários sobem → empresários pedem luvas maiores.

A oferta e a demanda operam por posição:

- Muitos clubes precisam de zagueiro + poucos zagueiros bons disponíveis = zagueiros valorizam.
- Muitos atacantes disponíveis + poucos clubes com orçamento = atacantes aceitam salários menores.

### 7.1 Inflação salarial

Conforme o jogo avança, o mercado muda. Jogadores melhores pedem mais; clubes ricos elevam os salários médios; ligas que crescem atraem patrocínios maiores; crises econômicas estabilizam salários. Sem inflação, após algumas temporadas a economia fica previsível. Os índices de `MarketInflation` (salarial, de transferências e de patrocínios) capturam essa evolução, e são regulados globalmente para evitar descontrole (ver [seção 14.7](#147-controle-de-inflação)).

### 7.2 Reputação econômica da liga

A liga (camada 2 do [modelo em 4 camadas](#1-modelo-em-4-camadas)) também evolui economicamente e retroalimenta o mercado. Uma liga forte gera mais receita de TV, melhores patrocínios e maior retenção de talentos: os jogadores querem jogar nela, os clubes arrecadam mais e os salários sobem. Uma liga fraca perde talentos cedo, vende barato e retém pouco. Essa reputação não é estática: se os clubes de uma liga performam bem internacionalmente, a reputação da liga sobe, os valores de mercado sobem e os jogadores permanecem mais tempo — criando histórias de longo prazo (por exemplo, clubes brasileiros com boas campanhas continentais valorizam toda a liga).

### 7.3 Mercado segmentado para clubes novos (regional/iniciante)

Num universo maduro (ex.: temporada 20) o mercado geral pode estar caro demais para um clube recém-criado. Para que o novato não precise competir financeiramente com clubes ricos por todos os jogadores, o mercado é **segmentado em camadas paralelas**, cada uma com nível de jogador compatível:

| Camada | O que oferece |
| --- | --- |
| **Mercado Geral** | Jogadores caros, disputados, de nível alto |
| **Mercado Regional/Iniciante** | Jogadores acessíveis, úteis, de nível compatível com clubes pequenos |
| **Base Local** | Jovens baratos para clubes novos |
| **Empréstimos** | Jogadores de clubes maiores que precisam de minutos (ver [7.4](#74-empréstimos-como-ponte-entre-clubes-grandes-e-pequenos)) |

Assim o clube novo tem acesso a jogadores dentro do seu orçamento sem disputar preço com os gigantes. A segmentação atua junto com as divisões por nível estrutural (ver [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md)) e com o controle anti-abuso do mercado (transações fora da faixa continuam auditadas).

### 7.4 Empréstimos como ponte entre clubes grandes e pequenos

O empréstimo é um dos melhores instrumentos de equilíbrio entre clubes de portes diferentes. Clubes grandes acumulam **muitos jovens bons que não conseguem jogar**; clubes novos precisam de jogadores úteis. A ponte beneficia os dois lados:

```
Clube grande empresta jovem
   ↓
Clube pequeno usa o jogador
   ↓
Jogador ganha minutos
   ↓
Clube grande desenvolve o ativo
   ↓
Clube pequeno ganha competitividade temporária
```

Para evitar abuso (favorecimento, clube satélite, transferência disfarçada), o empréstimo respeita limites:

- **limite de empréstimos por clube**;
- **salário parcialmente pago pelo clube dono**;
- **jogador precisa cumprir minutos mínimos**;
- **o clube pequeno não pode comprar barato automaticamente** ao fim do empréstimo (sem opção de compra vantajosa embutida).

Isso conversa diretamente com as regras de empréstimo do anti-abuso (Decisão 1889, ver [`./09-anti-abuso-e-onboarding.md`](./09-anti-abuso-e-onboarding.md)).

## 8. Contratos, empresários e mente financeira

Contrato, empresário e mente financeira do jogador (entidades 3.2, 3.4 e 3.3) formam o núcleo emocional das negociações. Grinta trata a economia como **parcialmente irracional**: clubes e jogadores decidem sob influência de emoção.

- Torcida ama o jogador → diretoria evita vender.
- Jogador brigou com o técnico → aceita sair por menos.
- Clube rival faz proposta → torcida explode → diretoria bloqueia o negócio.
- Jogador quer ajudar a família → prioriza salário.
- Jogador sonha com a Europa → força a transferência.

O clube também influencia o jogador financeiramente. Um clube organizado ensina profissionalismo (jogador evolui melhor, menor risco extra-campo, maior valor). Um clube bagunçado prejudica (salário atrasado → moral cai → empresário pressiona → rendimento e valor caem). Um clube formador constrói carreiras e transforma o jovem em ativo financeiro maior.

## 9. Torcida, patrocínio e investimentos

### 9.1 Torcida como ativo

A torcida afeta bilheteria, sócio-torcedor, camisas, pressão na diretoria, atratividade para jogadores, patrocínio e moral. Um clube grande que perde 5 jogos vê a torcida irritada, o público cair e a pressão subir. Um clube pequeno que chega à semifinal vê a torcida crescer, o patrocínio melhorar e as receitas futuras subirem.

### 9.2 Patrocínio

Depende de exposição e reputação (fórmula em [5.4](#54-valor-de-patrocínio)).

### 9.3 Categorias de investimento

O clube pode investir em áreas com retornos diferentes:

| Área | Retorno |
| --- | --- |
| Base | Mais jovens gerados, melhor potencial médio, maior chance de venda futura |
| Olheiros | Encontra jogadores mais baratos e subvalorizados, reduz erro de contratação |
| Departamento médico | Menos lesões longas, recuperação melhor, preserva valor de mercado |
| Psicologia | Jogadores instáveis sofrem menos, eventos extra-campo têm menor impacto |
| Treinamento, marketing, estádio, comissão técnica, análise de desempenho | Melhoram desenvolvimento, exposição, capacidade de arrecadação e rendimento |

O **scouting** merece destaque: serve não só para achar jogador bom, mas para achar jogador **subvalorizado** antes do mercado. Pode ter áreas (regional, nacional, América do Sul, Europa, África, Ásia, mercado livre, base de outros clubes), cada uma com custo, risco, potencial, concorrência e adaptação próprios.

### 9.4 Economia da base

A base é uma fábrica de ativos únicos: como os jogadores são gerados com história, cada jovem formado é um ativo financeiro em potencial (processado pelo `AcademyEconomySystem`, ver [seção 12](#12-arquitetura-economicengine)). A geração de jogadores da base depende de investimento na base, qualidade dos treinadores, região de captação, estrutura social e olheiros.

Cada jovem carrega um perfil econômico próprio: custo de formação, potencial financeiro, risco social, apoio familiar, necessidade econômica, apego ao clube e probabilidade de sair cedo. Isso gera dilemas de proteção do ativo. Um menino pobre, muito talentoso e com família pressionando quer contrato profissional cedo e atrai empresários — o clube precisa protegê-lo (blindar com contrato e luvas) ou o perde barato. Um menino de família estável e disciplinado tem desenvolvimento mais previsível, menor pressão financeira e aceita projeto de longo prazo. Ver o ciclo de clube formador na [seção 10.3](#103-loops-de-consequência) e a economia global da base na [seção 14.4](#144-dimensionamento-de-jogadores).

### 9.5 Receitas e patrocínios proporcionais ao estágio da liga

Um clube novo precisa ganhar dinheiro suficiente para evoluir — não o mesmo dinheiro da elite, mas o bastante para crescer sem ficar travado. Por isso as receitas, os custos e os upgrades são **proporcionais ao estágio da liga** em que o clube compete (as ligas por nível estrutural em [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md)):

| Estágio da liga | Receita | Custos | Upgrades |
| --- | --- | --- | --- |
| Liga Inicial | Baixa | Baixos | Baratos |
| Liga Intermediária | Média | Médios | Médios |
| Elite | Alta | Altos | Caros |

Cada clube tem, assim, uma **economia própria proporcional ao seu estágio**: o novato não recebe a receita da elite, mas também não enfrenta os custos dela, e consegue financiar sua evolução dentro da própria camada. Os patrocínios seguem a mesma lógica da fórmula de [5.4](#54-valor-de-patrocínio), em que a divisão e a reputação do clube pesam no valor — um título de Liga Inicial melhora o patrocínio **local**, mesmo que o clube ainda seja irrelevante globalmente.

### 9.6 Sistema comercial e ativos de marca

A área comercial transforma atenção, torcida, desempenho, reputação e ativos do clube em receitas e relacionamentos. Suas atividades principais são patrocínios, fornecedores, bilheteria (ver [4.3](#43-bilheteria-dinâmica)), hospitalidade, produtos, programas de associação (sócio-torcedor), direitos de nome, campanhas e uso de imagem e conteúdo.

O clube pode oferecer **ativos comerciais específicos**, cada um negociável de forma independente:

- espaços do uniforme;
- placas e mídia do estádio;
- nome do estádio ou instalação (naming);
- conteúdo digital;
- patrocínio de treino;
- patrocínio de base;
- camarotes;
- experiências;
- campanhas temáticas.

O interesse e o valor de um patrocinador dependem de alcance, torcida, divisão, reputação, desempenho, mercado regional, compatibilidade de marca, histórico do clube e das entregas prometidas (a fórmula agregada está em [5.4](#54-valor-de-patrocínio)). Um contrato comercial pode combinar valor fixo, bônus, metas, exclusividade, direitos, obrigações, penalidades e condições de renovação.

**Exclusividade:** direitos exclusivos não podem ser vendidos simultaneamente a parceiros incompatíveis. O sistema precisa impedir a sobreposição de exclusividade entre patrocinadores concorrentes — vender a mesma exclusividade duas vezes gera conflito contratual.

### 9.7 Entregas e obrigações comerciais

Assinar um patrocínio não gera apenas receita: cria **obrigações**. O clube pode precisar exibir a marca, realizar campanha, disponibilizar espaço, produzir conteúdo, participar de evento ou entregar hospitalidade. Essas entregas são um compromisso, não um bônus.

O descumprimento tem consequência econômica direta: falhar nas entregas pode **reduzir o pagamento**, **impedir a renovação** ou **gerar conflito** com o parceiro. A receita comercial, portanto, não é garantida pelo simples fato de existir contrato — depende de o clube honrar o que prometeu.

### 9.8 Hospitalidade

Camarotes, áreas especiais e experiências têm capacidade, custo e público próprios, distintos da bilheteria comum. Dependem de estrutura, operação e mercado: um clube sem infraestrutura ou sem mercado local para hospitalidade premium não converte esse ativo em receita, por maior que seja a torcida.

### 9.9 Produtos, estoque e sazonalidade

Os produtos do clube não são receita automática: envolvem produção, estoque, custo, preço, demanda, sazonalidade, campanhas e obsolescência. Uma temporada histórica, uma contratação popular ou um novo uniforme podem aumentar a demanda; um estoque excessivo, ao contrário, gera custo e risco (produto encalhado, obsolescência de coleção). A gestão de produtos é, assim, uma decisão de planejamento, não apenas de venda.

### 9.10 Marca do clube

A marca cresce por história, torcida, identidade, resultados, jogadores marcantes, comunicação, presença regional, competição e consistência institucional. Uma marca forte melhora as oportunidades comerciais (patrocínio, produtos, hospitalidade), mas **não substitui** desempenho, infraestrutura ou capacidade de entrega — sem elas, a marca não se converte em receita sustentável.

> O sentimento, a memória e os protestos da torcida, a imprensa, as narrativas e a comunicação do clube — que também influenciam marca e receita — são tratados em [`./11-torcida-imprensa-e-narrativa.md`](./11-torcida-imprensa-e-narrativa.md). Aqui interessa apenas o efeito comercial direto.

## 10. Dívidas, punições e loops de consequência

### 10.1 Dívida como risco estratégico

Dívida controlada permite crescer. Dívida alta trava o orçamento, os juros comem a receita, força vendas e cria risco de punição.

### 10.2 Punições econômicas

Quando o clube é mal gerido, o jogo reage:

- **Atraso salarial** → moral cai → jogador aciona o empresário → risco de rescisão → elenco perde confiança.
- **Dívida fiscal alta** → multa → bloqueio de inscrição → **perda de pontos** em casos extremos.
- **Folha acima do orçamento** → diretoria exige cortes → jogadores caros entram na lista de venda.

### 10.3 Loops de consequência

A economia gera ciclos que se retroalimentam. São o coração narrativo do sistema.

- **Ciclo positivo:** boa campanha → mais torcida → mais bilheteria → melhor patrocínio → mais orçamento → melhores jogadores → mais chance de título.
- **Ciclo negativo:** má gestão → dívida → venda de jogadores → queda técnica → resultados ruins → torcida some → receita cai → mais dívida.
- **Ciclo de clube formador:** investe em base → revela jogador → vende → melhora estrutura → revela ainda melhor.
- **Ciclo de estrela:** jogador performa → fama sobe → salário pedido sobe → clubes interessados → pressão para renovar ou vender.
- **Ciclo de decadência de clube grande:** o clube cresceu muito → a folha salarial explodiu → a base parou de revelar → os veteranos aposentaram → as contratações foram ruins → a torcida pressiona → a receita cai → o clube perde nível. Esse ciclo é o contrapeso do topo: um gigante mal administrado pode cair, o que **abre espaço para clubes novos subirem** e mantém o universo em movimento, sem congelar no topo. É a face econômica do desgaste natural dos clubes grandes (custos fixos maiores, salários maiores, pressão maior, renovação de elenco mais cara), que torna o topo difícil de manter.

Esses ciclos produzem os dilemas centrais do jogo: renovar caro com a promessa ou vender agora? Contratar estrela cara ou investir na base? Encher o estádio ou cobrar mais caro? Aceitar dívida para subir de divisão? Vender para o rival ou segurar e perder dinheiro?

## 11. Ciclos de processamento

A economia é processada em três ritmos distintos para manter o jogo vivo sem pesar todos os dias.

### 11.1 Ciclo mensal

Todo mês o sistema processa a economia do clube:

1. Entram receitas fixas.
2. Entram receitas variáveis.
3. Saem salários.
4. Saem custos operacionais.
5. Dívidas são atualizadas.
6. Orçamentos são recalculados.
7. Diretoria avalia o treinador.
8. Jogadores reavaliam contratos.
9. Mercado recalcula valores.
10. Patrocinadores recalculam interesse.

### 11.2 Ciclo pós-partida

Após cada jogo, efeitos menores: bilheteria, bônus de vitória, moral da torcida, fama dos jogadores, lesões, interesse externo, prêmios individuais e pressão da diretoria. Exemplo: jogador jovem faz 2 gols em clássico → fama local sobe → torcida se apega → valor sobe → empresário pede renovação → clubes observam.

### 11.3 Ciclo de janela de transferências

Na janela o sistema fica mais agressivo: clubes calculam necessidades e orçamento, empresários oferecem jogadores, jogadores insatisfeitos pedem saída, clubes ricos inflam o mercado e clubes quebrados aceitam menos. Cada clube age segundo sua `TransferStrategy` (entidade 3.9) e os limites impostos pela diretoria (orçamento de transferências e salarial, meta esportiva e financeira, tolerância a dívida, pressão por vender ou contratar).

Há também um **ciclo de balanceamento por temporada**, no nível global, descrito na [seção 14.9](#149-ciclo-de-balanceamento-por-temporada).

## 12. Arquitetura EconomicEngine

Para manter estrutura reaproveitável com controles individuais, o motor econômico é composto por **11 subsistemas** que calculam partes distintas mas compartilham eventos.

```
EconomicEngine
  ├── ClubEconomySystem          // caixa, orçamentos, saúde financeira
  ├── PlayerMarketSystem         // valor de mercado dos jogadores
  ├── ContractSystem             // salários, luvas, bônus, renovações
  ├── SponsorshipSystem          // patrocínios e exposição
  ├── MatchdayRevenueSystem      // bilheteria e receita de jogo
  ├── DebtSystem                 // dívidas, juros, pagamentos
  ├── WageSystem                 // folha salarial e inflação salarial
  ├── TransferMarketSystem       // negociações e janela
  ├── FanEconomySystem           // torcida como ativo econômico
  ├── AcademyEconomySystem       // economia da base
  └── EventEconomicImpactSystem  // impacto econômico de eventos
```

Exemplo de colaboração via eventos — jogador convocado para a seleção:

```
EventEconomicImpactSystem
  → aumenta fama do jogador
  → PlayerMarketSystem aumenta valor
  → ContractSystem aumenta salário esperado
  → SponsorshipSystem aumenta exposição do clube
  → FanEconomySystem aumenta venda de camisa
```

## 13. Eventos econômicos

Os eventos (modelo `EconomicEvent`, entidade 3.10) conectam acontecimentos esportivos e extra-campo à economia. Exemplos de tipos:

| Evento | Impacto econômico |
| --- | --- |
| `PLAYER_CALLED_TO_NATIONAL_TEAM` | Valor sobe, moral sobe, salário pedido na renovação sobe, patrocinadores se interessam |
| `PLAYER_MAJOR_INJURY` | Valor cai, clube perde ativo, seguro pode cobrir parte, jogador fica inseguro |
| `CLUB_WINS_TITLE` | Premiação entra, torcida cresce, patrocínio melhora, jogadores valorizam, folha futura encarece |
| `CLUB_MISSES_PROMOTION` | Queda de receita e de expectativa, possível crise no ano seguinte |
| `SALARY_DELAY` | Moral cai, empresário aciona, risco de rescisão |
| `SPONSOR_WITHDRAWS` | Perda de receita comercial, torcida reage |
| `PLAYER_SCANDAL` | Escândalo extra-campo: patrocinador ameaça sair, torcida reage, moral cai, valor de mercado do jogador cai |
| `ECONOMIC_CRISIS` | Patrocínios caem, clubes reduzem gastos, jogadores aceitam menos, vendas internacionais aumentam |
| `TRANSFER_RUMOR` | Pressão sobre o clube, oscilação de moral e de valor |

Cada evento tem duração `instant`, `temporary` ou `permanent`, e propaga seu `impact` pelos subsistemas relevantes.

## 14. Economia global balanceada

Este é o terceiro pilar de Grinta: uma **economia fechada e balanceada por ciclos**. O objetivo é um ecossistema justo, onde todos os clubes começam praticamente no mesmo ponto e o tamanho do clube é consequência da gestão, não de vantagem inicial. Isso reduz o "pay to win" e cria competição justa num mundo persistente.

### 14.1 Princípio central: nada é gerado solto

O jogo funciona como uma economia controlada. **Nada é gerado isoladamente**; tudo depende do equilíbrio global:

```
Balanceamento Geral =
    Quantidade de clubes
  + Quantidade de jogadores ativos
  + Quantidade de dinheiro em circulação
  + Quantidade de jogadores aposentando
  + Quantidade de jovens entrando
  + Demanda por posições
  + Idade média do universo
```

O jogo não gera jogadores porque um clube pediu, e sim porque o ecossistema precisa.

### 14.2 Fórmula conceitual do universo

O preço dos jogadores, a geração de atletas, o dinheiro do jogo e o ciclo de aposentadoria são calculados com base na quantidade de clubes existentes.

```
Economia do Jogo =
    Clubes existentes
  × Caixa médio dos clubes
  × Quantidade de jogadores ativos
  × Quantidade de jogadores disponíveis
  × Taxa de aposentadoria
  × Taxa de geração de jovens
  × Demanda por posição
```

O sistema usa esse estado para responder perguntas como: tem jogador demais ou de menos? Tem dinheiro demais ou de menos? Tem muito veterano ou pouco jovem? Tem atacante demais ou goleiro de menos? Os preços estão altos demais? Os clubes estão acumulando caixa ou quebrando?

> **Pendência:** A "fórmula do universo" é conceitual — o produto (×) entre grandezas heterogêneas é ilustrativo, não uma equação literal. Formalizar como um conjunto de indicadores e alvos calibrados em `../02-tecnico/05-catalogo-de-regras-e-formulas.md`.

### 14.3 Clubes começam pequenos, mas com identidade

Do ponto de vista econômico, o **caixa inicial fixo e igual para todos** é a porta de entrada do sistema fechado: nenhum clube começa com vantagem financeira, e todo o dinheiro que passa a circular depois é gerado pelos ciclos descritos nas seções seguintes. Os clubes nascem pequenos — baixa reputação, estrutura simples, torcida pequena — e com um elenco inicial equilibrado e propositalmente **envelhecido**, o que cria o déficit de pirâmide etária que o balanceador corrige ao longo das temporadas (ver [14.5](#145-geração-baseada-em-aposentadoria-e-pirâmide-etária)).

O princípio fundador (todos nascem pequenos, com o mesmo caixa e elenco equilibrado, diferindo apenas em **identidade/estilo**), os **perfis iniciais nomeados** e os **números de referência do elenco inicial** (valor do caixa, quantidade e faixa etária dos jogadores, teto de força total e pontos de identidade) são de responsabilidade de [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md) (§3.1–3.2, o princípio fundador). Aqui interessa apenas o efeito econômico: caixa igual na largada e elenco velho como estado inicial que o sistema global rebalanceia.

> **Pendência:** Os valores exatos (caixa inicial padrão, força total do elenco inicial e distribuição de pontos de identidade por perfil) estão registrados em [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md) (§3.1–3.2) e serão calibrados em `../02-tecnico/05-catalogo-de-regras-e-formulas.md`.

O clube não nasce grande: fica grande. O crescimento ocorre em camadas (pequeno → emergente → médio → forte → grande → dominante) e depende de reputação, títulos, torcida, estrutura, saúde financeira, qualidade do elenco, jogadores revelados e histórico. Um clube rico mas mal administrado não vira grande automaticamente. Subir deve ser difícil.

Grinta mede esse crescimento por um índice de **tamanho real do clube**, que soma reputações e ativos — nunca apenas dinheiro:

```
Tamanho Real do Clube =
    Reputação esportiva
  + Reputação financeira
  + Reputação formadora
  + Títulos
  + Torcida
  + Estrutura
```

| Índice | Classificação |
| --- | --- |
| 0–20 | Clube pequeno |
| 21–40 | Clube em crescimento |
| 41–60 | Clube médio |
| 61–80 | Clube grande |
| 81–100 | Clube gigante |

### 14.4 Dimensionamento de jogadores

A quantidade ideal de jogadores é derivada da quantidade de clubes, porque o universo precisa de mercado, base e reposição — não apenas 23 por clube.

```
Jogadores ativos ideais =
    clubes × 23 profissionais
  + clubes × reserva de mercado (7 a 12)
  + clubes × base (10 a 20)
```

Exemplo com 100 clubes: 2.300 em elencos + 1.000 disponíveis no mercado + 1.500 na base ≈ **4.800 jogadores** no universo. Essa elasticidade é o que faz o mercado funcionar.

A **necessidade de geração** é calculada como:

```
Necessidade de jogadores =
    clubes × jogadores por clube
  + margem de mercado
  + margem de base
  - jogadores ativos existentes
  + aposentadorias previstas
```

Se o ideal é 4.800 e existem 4.300, há déficit de 500, que o sistema gera distribuídos por idade, posição e qualidade.

### 14.5 Geração baseada em aposentadoria e pirâmide etária

A aposentadoria não apenas remove jogadores: **alimenta o cálculo de reposição**. A geração precisa compensar as saídas e, ao mesmo tempo, corrigir a pirâmide etária.

Pirâmide etária ideal do universo:

| Faixa | Proporção alvo |
| --- | --- |
| 16–20 anos | 25% |
| 21–24 anos | 25% |
| 25–29 anos | 30% |
| 30–34 anos | 15% |
| 35+ anos | 5% |

Como todos os clubes começam com elenco velho, a distribuição inicial é artificialmente envelhecida. O sistema a corrige ao longo das temporadas: na temporada inicial há muitos jogadores de 30–34; nas seguintes entram jovens e jogadores de 21–24; por volta da quinta temporada o universo se equilibra.

A geração é **dinâmica**, ajustada ao déficit da pirâmide. Regra: para cada aposentado, gerar 1 reposição direta mais uma fração para o mercado, ajustando a idade conforme a necessidade. Se aposentaram 100 jogadores num universo envelhecido, gerar predominantemente jovens (ex.: 60 de 16–20, 25 de 21–24, 10 de 25–29, 5 de 30–32). Se o universo estiver jovem demais e faltarem jogadores prontos, deslocar a geração para as faixas de 21–29.

A **posição** dos gerados também é balanceada (distribuição base aproximada: goleiros 8%, zagueiros 16%, laterais 14%, volantes 12%, meias 16%, pontas 14%, atacantes 12%, versáteis 8%), ajustada conforme o déficit por posição.

A **qualidade** segue equilíbrio: como todos começam pequenos, nascem poucas estrelas (distribuição sugerida: comuns 60%, úteis 25%, promissores 10%, muito promissores 4%, joias raras 1%). O nível médio pode subir lentamente à medida que o universo amadurece.

> **Pendência:** Confirmar e calibrar todas as porcentagens desta seção (pirâmide, posição, qualidade) e as regras de deslocamento da geração por déficit. Números são sugestões de brainstorming. Ver `../02-tecnico/05-catalogo-de-regras-e-formulas.md`.

### 14.6 Preço dos jogadores como reflexo do universo

O valor dos jogadores não é fixo: depende da economia global. Além dos fatores individuais (qualidade, potencial, idade, posição, contrato, salário — ver [5.3](#53-valor-de-mercado)), o preço responde à demanda por posição, à quantidade de jogadores semelhantes, ao dinheiro total em circulação, ao número de clubes interessados e ao momento do mercado.

- Poucos atacantes bons no universo → preço dos atacantes sobe.
- Muitos goleiros disponíveis → preço dos goleiros cai.
- Clubes com muito caixa → inflação de mercado.
- Clubes sem dinheiro → preços caem ou negociações travam.

O mercado é consequência do sistema, não uma loja infinita. Os jogadores disponíveis vêm de: atletas sem contrato, dispensados, colocados à venda, jovens não aproveitados, veteranos em fim de ciclo, clubes precisando vender, jogadores insatisfeitos e novas safras geradas pelo sistema.

### 14.7 Controle de inflação

Como todos começam com caixa igual, o maior risco é a economia inflar com o tempo. Para evitar isso, o jogo controla a quantidade total de dinheiro por meio de entradas e saídas.

- **Entradas:** bilheteria, premiações, patrocínios, venda de jogadores, crescimento de torcida, competições.
- **Saídas:** salários, compra de jogadores, manutenção do estádio, treinamento, base, comissão técnica, departamento médico, taxas de transferência, renovações, melhorias estruturais.

Se o dinheiro total sobe demais, o sistema deixa salários, manutenção e valores de jogadores subirem enquanto estabiliza patrocínios e controla premiações. Se está baixo demais, o mercado fica mais barato, os salários estabilizam, as premiações ajudam mais e os custos estruturais diminuem.

### 14.8 Regra de ouro

> **O jogo nunca gera clube, jogador, dinheiro ou preço de forma isolada. Tudo é gerado considerando o equilíbrio do universo.**

Isso vale para novo clube, novo jogador, nova safra da base, preço de mercado, salário, aposentadoria, premiação, patrocínio e custo de estrutura. Ao criar um novo clube, por exemplo, o sistema recalcula a necessidade de jogadores, verifica se existem atletas suficientes no mercado (gerando os que faltarem), ajusta o dinheiro global e evita inflação — o novo clube entra com caixa fixo padrão, 23 veteranos gerados, base mínima, reputação pequena e perfil inicial balanceado.

### 14.9 Ciclo de balanceamento por temporada

O estado global é mantido numa entidade `GameEconomyState` (com campos como `totalClubs`, `totalMoney`, `averageClubCash`, `totalPlayers`, `activePlayers`, `freePlayers`, `youthPlayers`, `retiringPlayers`, `averagePlayerAge`, `ageDistribution`, `positionDistribution`, `averagePlayerPrice`, `inflationIndex`, `salaryIndex`, `generationNeed`), recalculada a cada temporada.

No fim de cada temporada, o balanceador roda:

```
Fim da temporada
  → Calcula jogadores aposentados
  → Calcula clubes existentes
  → Calcula dinheiro em circulação
  → Calcula idade média do universo
  → Calcula déficit por posição
  → Calcula déficit por faixa etária
  → Calcula necessidade de novos jogadores
  → Gera nova safra
  → Recalcula preços
  → Atualiza salários
  → Inicia nova temporada
```

Exemplo prático: com 50 clubes, ~1.150 profissionais esperados, 1.080 ativos, 120 aposentando, 200 livres e idade média de 31,8 anos, o sistema detecta falta de profissionais, muitas aposentadorias e idade alta. Gera cerca de 320 jogadores (120 por aposentadoria, 70 para o déficit, 100 jovens para renovar a pirâmide, 30 prontos para o mercado imediato), distribuídos majoritariamente nas faixas jovens. Resultado: a idade média cai, os clubes têm reposição, o mercado não fica vazio e as aposentadorias não quebram o jogo.

Esse ciclo global resolve, de uma vez, a justiça inicial, a inflação de mercado, o excesso ou a falta de jogadores, o envelhecimento do universo, os clubes ricos ou quebrados demais, o mercado artificial e os elencos eternos — criando um mundo de futebol fechado e regulado onde cada temporada recalcula a saúde do ecossistema.

## 15. Contabilidade e disciplina financeira

Ter dinheiro em caixa não é o mesmo que poder gastá-lo, e gerar receita não é o mesmo que recebê-la. Esta seção descreve as distinções contábeis que impedem o jogador de tratar todo o saldo como dinheiro livre e que dão realismo à gestão financeira de Grinta. Ela vale igualmente para os **clubes controlados pelo jogo**, que seguem as mesmas limitações — não podem criar dinheiro para contratar, ignorar dívidas nem sustentar folhas impossíveis.

### 15.1 Caixa, orçamento e compromissos

O sistema separa claramente grandezas que costumam ser confundidas:

- **Caixa disponível** — o dinheiro que o clube efetivamente tem.
- **Saldo bancário** — o saldo em conta, que pode diferir do caixa operacional.
- **Valores restritos** — recursos que existem, mas estão vinculados a uma finalidade e não podem ser usados livremente.
- **Orçamento autorizado** — o que a diretoria permitiu gastar em cada área, o que não implica que o dinheiro já esteja disponível.
- **Compromissos assumidos** — gastos já comprometidos que ainda não saíram do caixa.

Além disso, o clube acompanha contas a pagar, contas a receber, dívidas, patrimônio, resultado econômico e projeções futuras. **Possuir dinheiro em caixa não significa possuir autorização orçamentária; possuir orçamento aprovado não significa que o dinheiro já esteja disponível.**

O orçamento pode ser dividido por áreas — folha salarial, transferências, funcionários, infraestrutura, formação, operações, comercial e reserva de emergência. A diretoria pode permitir realocação entre áreas, negar alterações ou exigir aprovação.

### 15.2 Regime de competência

Receitas e despesas são reconhecidas quando são **economicamente geradas**, e os pagamentos podem ocorrer em datas diferentes. O jogador precisa distinguir:

- receita já conquistada e ainda não recebida;
- despesa já assumida e ainda não paga;
- pagamento antecipado;
- parcela futura;
- **obrigação condicionada** (só se torna devida se uma condição ocorrer).

As transferências ilustram bem essa separação: o valor esportivo acordado, o cronograma de pagamento e o impacto contábil são coisas distintas. Uma compra pode gerar pagamento imediato, parcelas, bônus condicionais, comissão, participação em venda futura e compromissos ainda não ativados; uma venda pode gerar lucro ou prejuízo econômico diferente do caixa recebido no momento.

O histórico financeiro não pode ser corrigido apagando valores anteriores: erros são tratados por ajustes e reversões identificadas.

### 15.3 Cenários orçamentários

Como parte das receitas é incerta, o planejamento trabalha com **cenários** em paralelo, e receitas incertas nunca são tratadas como dinheiro garantido:

- esperado;
- conservador;
- otimista;
- com acesso;
- com permanência;
- com rebaixamento.

Isso conversa com as receitas proporcionais ao estágio da liga (ver [9.5](#95-receitas-e-patrocínios-proporcionais-ao-estágio-da-liga)): um mesmo elenco tem orçamentos diferentes conforme o clube suba, permaneça ou caia de divisão — inclusive porque a folha pode prever reduções automáticas por rebaixamento.

### 15.4 Reservas de recurso

Ao avançar em decisões relevantes, o clube pode **reservar recursos** para impedir que o mesmo orçamento seja comprometido duas vezes (por exemplo, prometer o mesmo dinheiro a duas contratações). Uma reserva pode estar:

- consumida;
- parcialmente consumida;
- liberada;
- expirada.

A reserva é o mecanismo que garante a coerência entre o orçamento autorizado e os compromissos assumidos ([15.1](#151-caixa-orçamento-e-compromissos)).

### 15.5 Estágios de crise e insolvência

A situação financeira evolui por estágios, do saudável ao terminal:

```
estável → atenção → pressão → crise → insolvência → reestruturação
```

Em crise, o clube pode sofrer redução orçamentária, congelamento de contratações, obrigação de vender, renegociação de dívidas, intervenção financeira, perda de licença ou rebaixamento administrativo conforme o regulamento. O usuário continua no clube, mas passa a trabalhar sob restrições mais severas. A diretoria pode aportar recursos ou conceder empréstimos conforme seu perfil e capacidade — com condições, metas, limites, participação em decisões ou exigência de recuperação —, mas **não há resgate automático** sempre que o usuário gasta mal.

Esses estágios refinam, em progressão narrativa, as faixas de `financialHealth` (ver [seção 6](#6-saúde-financeira-financialhealth)) e se conectam às punições econômicas e à inadimplência descritas na [seção 10](#10-dívidas-punições-e-loops-de-consequência).

> **Pendência:** Definir o mapeamento entre os estágios de crise (estável→…→reestruturação) e as faixas de `financialHealth` da [seção 6](#6-saúde-financeira-financialhealth), além dos gatilhos que promovem ou rebaixam o clube entre estágios. Calibração em `../02-tecnico/05-catalogo-de-regras-e-formulas.md`.

### 15.6 Índices de inflação por categoria

A inflação do mundo não é um número único. O universo mantém índices distintos por categoria, que evoluem separadamente:

- preços gerais;
- salários;
- transferências;
- construção;
- crédito;
- custos regionais.

Isso estende o `MarketInflation` conceitual ([3.7](#37-marketinflation)), que trata salários, transferências e patrocínios, e opera sob o controle global de inflação ([14.7](#147-controle-de-inflação)). Uma regra é inegociável: **mudanças futuras de índice não reescrevem contratos já assinados** — a inflação afeta novos acordos, não os vigentes.

> **Pendência:** Calibrar cada índice de inflação (preços, salários, transferências, construção, crédito, regional), suas faixas de variação por temporada e a interação com o controle global de inflação ([14.7](#147-controle-de-inflação)). Ver `../02-tecnico/05-catalogo-de-regras-e-formulas.md`.
