# Economia do Jogo

> **Status:** CANÔNICO · **Fontes:** chats/economics-initial.md, chats/planejamento-agrupado-do-jogo.md, chats/escopo-definitivo-simulador.md · **Revisão:** 2026-07-11

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
16. [Observação e recrutamento (scouting)](#16-observação-e-recrutamento-scouting)
17. [Transferências e contratos: nuances de processo](#17-transferências-e-contratos-nuances-de-processo)

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

> **Reconciliação:** Os **7 perfis econômicos** acima são **estados dinâmicos** — resultado da gestão, que mudam a cada temporada. Os **perfis iniciais de identidade** de [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md) (§3.2) são o **estilo de nascença**, de evolução lenta. Não são o mesmo eixo e **coexistem sem conflito**: todo clube nasce com um perfil de identidade nomeado *e*, ao mesmo tempo, no mesmo ponto econômico de largada — pequeno, caixa igual ([ECO-001](../02-tecnico/05-catalogo-de-regras-e-formulas.md)) e `financialHealth` na faixa "Estável" (ver [seção 6](#6-saúde-financeira-financialhealth)). Ao longo das temporadas a gestão desloca o clube entre os 7 perfis econômicos, enquanto a identidade persiste. Assim, um "Clube Formador" (identidade) pode estar hoje "endividado" (perfil econômico) sem contradição: a identidade descreve o **estilo**, o perfil econômico descreve a **situação financeira atual**. O modelo mantém os dois eixos como campos separados (identidade do clube × estado do `ClubEconomy`).

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

> **Decisão ratificada — R-41:** proposta de 1ª passada para os coeficientes das fórmulas **conceituais desta seção 5** (os das seções 6, 7, 9 e 14 ficam sob R-42, R-44, R-46 e R-49). Dinheiro sempre em unidade mínima (`BigInt amountMinor`, moeda-base do mundo).
>
> - **Valor de mercado (5.3):** `valorMinor = clamp(valorBase · (1 + Σδ), pisoMinor, tetoMinor)`, com `valorBase = C · (overall/100)^3.5 · fatorIdade`, `C = 2000000000` (R$ 20.000.000,00 — jogador overall 100 no pico) e `fatorIdade` (0.55 aos 17 → **1.00** no pico 21–26 → 0.35 aos 34). Cada `δ` é assinado e ∈ [−0.40, +0.60]: potencial `+`, fama `+`, escassez de posição `+`, interesse externo `+`, risco de lesão `−`, instabilidade `−`, contrato < 6 meses `−0.40`, pressão financeira do vendedor `−`. Piso `pisoMinor = 500000` (R$ 5.000,00). Escassez de posição e interesse externo vêm do estado global ([14.6](#146-preço-dos-jogadores-como-reflexo-do-universo), R-49).
> - **Público esperado (5.2):** `público = clamp(torcidaAtiva · interesse · momento · forçaAdv · fatorPreço, 0, capacidadeEstádio)`, fatores ∈ [0,1] exceto `torcidaAtiva`; `fatorPreço = clamp(1.4 − 0.5·(preço/preçoRef), 0.15, 1.0)`. Receita = `público · preçoIngressoMinor`.
> - **Receita mensal (5.1):** soma direta dos cinco blocos, sem pesos livres — cada bloco é o agregado das suas fontes.
> - **Valor de patrocínio (5.4):** `patrocínioMinor = baseMinor · f(torcida) · f(divisão) · f(reputação) · f(estrelas) · f(campanha) · f(mercadoLocal)`, cada `f ∈ [0.5, 2.0]` (neutro 1.0), `baseMinor` proporcional ao estágio da liga ([ECO-008](../02-tecnico/05-catalogo-de-regras-e-formulas.md)).
>
> Calibração final no lote de simulações econômicas (evolução do universo por múltiplas temporadas).

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

> **Nota (eixos distintos, não contradição):** os rótulos desta tabela — em especial **Estável (70–89)** e **Excelente (90–100)** — são as **faixas de efeito do índice `financialHealth`** (seis faixas, limiares 90/70/50/30/10). Não confundir com o **estágio de crise** do mapeamento R-45 (adiante nesta economia), onde o estágio **estável** cobre **70–100** (englobando *Estável* + *Excelente*). São **dois eixos diferentes** — a granularidade de efeito do índice × o estágio de crise institucional —, e não uma inconsistência: um clube com `financialHealth` 95 está, ao mesmo tempo, na faixa de efeito *Excelente* e no estágio de crise *estável*.

> **Decisão ratificada — R-42:** `financialHealth = clamp(Σ w_i · sub_i, 0, 100)` (regra [ECO-004](../02-tecnico/05-catalogo-de-regras-e-formulas.md)), cada `sub_i` normalizado 0–100. Pesos de 1ª passada (somam 1.00): **liquidez** (meses de fôlego, caixa ÷ despesa mensal) **0.22** · **endividamento** (dívida ÷ receita anual) **0.20** · **folha ÷ receita** (`wageBill/monthlyRevenue`) **0.18** · **receita recorrente/previsibilidade** **0.12** · **resultado esportivo recente** **0.10** · **compromissos futuros** (parcelas/contratos) **0.08** · **pressão da torcida** **0.05** · **confiança da diretoria** **0.05**. As **faixas de efeito** são as da tabela desta seção 6 (limiares 90/70/50/30/10), tratadas como canônicas; para evitar oscilação, a troca de faixa exige **histerese de ±3 pontos** e persistência por ≥ 1 ciclo mensal. Calibração final no lote de simulações econômicas.

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

> **Relógio único de progressão:** o ciclo pós-partida atualiza **estados** (moral, forma, fadiga, lesão) e **acumula** evidência de desenvolvimento — mas **não aplica** evolução/regressão de **atributo estrutural**. A mutação estrutural ocorre num **único ponto canônico**, no fechamento de temporada, evitando a dupla aplicação (pós-partida + fechamento) apontada no bloqueador B-04. O modelo accrual × aplicação, com o clamp de potencial, está em [`../02-tecnico/13-ledger-e-conservacao-economica.md`](../02-tecnico/13-ledger-e-conservacao-economica.md) (§5, R-113).

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

> **Decisão ratificada — R-49:** a "fórmula do universo" não é um produto literal, e sim um **vetor de indicadores com alvo + banda de tolerância**, mantido no `GameEconomyState` ([14.9](#149-ciclo-de-balanceamento-por-temporada)) e regulado por [ECO-002](../02-tecnico/05-catalogo-de-regras-e-formulas.md)/[ECO-003](../02-tecnico/05-catalogo-de-regras-e-formulas.md). Alvos de 1ª passada: **jogadores ativos ideais = clubes × 48** (23 elenco + **10** reserva de mercado, ponto médio da faixa 7–12 de [14.4](#144-dimensionamento-de-jogadores) + **15** base, ponto médio de 10–20); **`totalMoney` alvo = clubes × caixaMédioAlvo**, com `caixaMédioAlvo ≈ 1.5 × caixa inicial` (R-43) na maturidade; idade média alvo derivada da pirâmide (R-44). Cada indicador vira um **controlador dirigido por gap**: quando sai da banda (proposta: ±10% para contagens, ±15% para `totalMoney`), o balanceador de fim de temporada ([CMP-005](../02-tecnico/05-catalogo-de-regras-e-formulas.md)) age (gera safra, ajusta preços/salários). Calibração final no lote de simulações econômicas.

### 14.3 Clubes começam pequenos, mas com identidade

Do ponto de vista econômico, o **caixa inicial fixo e igual para todos** é a porta de entrada do sistema fechado: nenhum clube começa com vantagem financeira, e todo o dinheiro que passa a circular depois é gerado pelos ciclos descritos nas seções seguintes. Os clubes nascem pequenos — baixa reputação, estrutura simples, torcida pequena — e com um elenco inicial equilibrado e propositalmente **envelhecido**, o que cria o déficit de pirâmide etária que o balanceador corrige ao longo das temporadas (ver [14.5](#145-geração-baseada-em-aposentadoria-e-pirâmide-etária)).

O princípio fundador (todos nascem pequenos, com o mesmo caixa e elenco equilibrado, diferindo apenas em **identidade/estilo**), os **perfis iniciais nomeados** e os **números de referência do elenco inicial** (valor do caixa, quantidade e faixa etária dos jogadores, teto de força total e pontos de identidade) são de responsabilidade de [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md) (§3.1–3.2, o princípio fundador). Aqui interessa apenas o efeito econômico: caixa igual na largada e elenco velho como estado inicial que o sistema global rebalanceia.

> **Decisão ratificada — R-43:** números de largada canônicos (a fonte de registro permanece [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md) §3.1–3.2).
>
> - **Caixa inicial padrão** (único e idêntico para todos — [ECO-001](../02-tecnico/05-catalogo-de-regras-e-formulas.md)): **R$ 5.000.000,00 → `500000000`** (`BigInt amountMinor`, moeda-base do mundo), gravado em `worldConfig.startingCash` / `WorldConfig.initialClubCashMinor`. Racional: ~6–10 meses de fôlego da folha de um clube de Liga Inicial, sem permitir contratar estrela na largada; preserva a economia fechada ([ECO-003](../02-tecnico/05-catalogo-de-regras-e-formulas.md)) e a justiça inicial.
> - **Força total do elenco inicial:** baseline ratificada de **1.380 pontos** repartidos entre setores (GK/defesa/meio/ataque), **23 jogadores** → média-alvo **60 de overall**, com média de geração entre 58–60 e nenhum jogador acima de 62. Elenco propositalmente **envelhecido**: predomínio **26–33 anos**, com ≈70% em 29–33 e ≈30% em 26–28, potencial baixo (teto de evolução ≤ +3) e contratos curtos (1–2 temporadas) — é o déficit de pirâmide que o balanceador corrige ([14.5](#145-geração-baseada-em-aposentadoria-e-pirâmide-etária), R-44). Esta forma **reconcilia C-04** e preserva o teto R-62. Ver o [ato de ratificação](../99-decisoes/baseline-ratificada-2026-07-13.md).
> - **Pontos de identidade:** total fixo de **100 pontos** entre 6 dimensões (base, torcida, estrutura, elenco, finanças, disciplina); baseline neutro ≈ 16–17 por dimensão; cada perfil nomeado desloca ±10–15 pontos mantendo a soma 100 (ex.: "Clube Formador" = base 30 / elenco 12 / demais ~14–15).
>
> Calibração final no lote de simulações econômicas.

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

> **Reconciliação:** A escada nominal de porte descrita em [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md) (§4) tem **seis** estágios (pequeno → emergente → médio → forte → grande → dominante), enquanto o índice de Tamanho Real acima usa **cinco** faixas numéricas — não é contradição, apenas duas granularidades da mesma escala. Correspondência: **pequeno** ≈ 0–20 (pequeno); **emergente** ≈ 21–40 (em crescimento); **médio** ≈ 41–60 (médio); **forte** e **grande** ≈ 61–80 (grande), como sub-faixas de transição do topo; **dominante** ≈ 81–100 (gigante). Os seis rótulos são a leitura narrativa do crescimento; as cinco faixas são o índice canônico usado no cálculo.

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

A geração é **dinâmica**, ajustada ao déficit da pirâmide. Regra: para cada aposentado, gerar 1 reposição direta mais uma fração para o mercado, ajustando a idade conforme a necessidade.

> **Precedência (fonte canônica):** a fração "1,25 jogador por aposentado" **não** é uma fonte de geração independente somada ao controlador por déficit (§14.9) — se o fosse, a população cresceria a cada temporada. Existe um **gerador único, dirigido por gap**, no qual a "1,25" atua apenas como **teto de ritmo em regime estável**; o controlador de alvo tem precedência, com ordem de operações e clamps anti-descontrole definidos em [`../02-tecnico/13-ledger-e-conservacao-economica.md`](../02-tecnico/13-ledger-e-conservacao-economica.md) (§6, R-114/R-115). Isso resolve a ponta demográfica do bloqueador B-04. Se aposentaram 100 jogadores num universo envelhecido, gerar predominantemente jovens (ex.: 60 de 16–20, 25 de 21–24, 10 de 25–29, 5 de 30–32). Se o universo estiver jovem demais e faltarem jogadores prontos, deslocar a geração para as faixas de 21–29.

A **posição** dos gerados também é balanceada (distribuição base aproximada: goleiros 8%, zagueiros 16%, laterais 14%, volantes 12%, meias 16%, pontas 14%, atacantes 12%, versáteis 8%), ajustada conforme o déficit por posição.

A **qualidade** segue equilíbrio: como todos começam pequenos, nascem poucas estrelas (distribuição sugerida: comuns 60%, úteis 25%, promissores 10%, muito promissores 4%, joias raras 1%). O nível médio pode subir lentamente à medida que o universo amadurece.

> **Decisão ratificada — R-44:** adotar como 1ª passada canônica as porcentagens já tabeladas nesta seção (regra [PLY-002](../02-tecnico/05-catalogo-de-regras-e-formulas.md)): **pirâmide** 16–20: 25% · 21–24: 25% · 25–29: 30% · 30–34: 15% · 35+: 5%; **posição** GK 8% · ZAG 16% · LAT 14% · VOL 12% · MEI 16% · PON 14% · ATA 12% · versáteis 8%; **qualidade** comuns 60% · úteis 25% · promissores 10% · muito promissores 4% · joias raras 1%. **Regra de deslocamento por déficit:** safra por faixa ∝ `gap_faixa = max(0, alvoPirâmide − atual)`; por aposentado, **1 reposição direta + fração 0.25 para o mercado** (100 aposentados → 100 + 25); universo envelhecido concentra a geração nas faixas jovens (ex. da seção: 60% em 16–20, 25% em 21–24, 10% em 25–29, 5% em 30–32), e universo jovem demais desloca para 21–29. Posição e qualidade da safra são reponderadas pelo déficit por posição/qualidade. Calibração final no lote de simulações econômicas.

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

> **Conservação × oferta (fonte canônica):** as listas acima estão na **ótica do clube** e, por isso, contam "venda de jogadores" e "compra de jogadores" como fluxos separados. Na **ótica do mundo**, comprar/vender jogador entre dois clubes é uma **transferência que conserva** a oferta (não é entrada nem saída de dinheiro do sistema) — só as pontas **externas** (bilheteria, patrocínio, premiação como *faucets*; impostos, salários-consumo, juros externos como *sinks*) alteram a oferta. A semântica única de **ledger de partidas dobradas, contas sistêmicas nomeadas e conservação como invariante verificável** — que resolve o conflito "caixa conservado × receitas/despesas sistêmicas" (bloqueador B-04) — está em [`../02-tecnico/13-ledger-e-conservacao-economica.md`](../02-tecnico/13-ledger-e-conservacao-economica.md) (§2–4, R-109..R-112).

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

> **Semântica do ledger (fonte canônica):** a mecânica contábil concreta — **razão de partidas dobradas** (débitos = créditos), **saldo derivado** do razão (sem caixa editável), **contas sistêmicas nomeadas** (`SYS_*_FAUCET`/`SYS_*_SINK`) e a **conservação como invariante verificável** (INV-3a/3b) — é especificada em [`../02-tecnico/13-ledger-e-conservacao-economica.md`](../02-tecnico/13-ledger-e-conservacao-economica.md) (§2–4, R-109..R-112), sobre o razão já modelado em [`../02-tecnico/02-modelo-de-dados.md`](../02-tecnico/02-modelo-de-dados.md) §6.3.9. As distinções desta seção 15 (caixa × orçamento × disponível, regime de competência, reservas) são a leitura de produto daquela semântica.

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

> **Decisão ratificada — R-45:** mapeamento de 1ª passada entre estágios de crise e as faixas de `financialHealth` ([seção 6](#6-saúde-financeira-financialhealth), [ECO-004](../02-tecnico/05-catalogo-de-regras-e-formulas.md)): **estável** ↔ 70–100 · **atenção** ↔ 50–69 · **pressão** ↔ 30–49 · **crise** ↔ 10–29 · **insolvência** ↔ 0–9 · **reestruturação** = estado especial (entra a partir de insolvência com inadimplência/intervenção; sai quando `financialHealth ≥ 30` sustentado por ≥ 3 ciclos mensais). **Gatilhos:** promover/rebaixar um estágio exige cruzar o limiar de faixa com **histerese ±3** e persistência por ≥ 1 ciclo (mesma regra de R-42); além disso, **gatilhos duros** independem da faixa — atraso salarial > 2 meses força ≥ crise; dívida fiscal com bloqueio de inscrição força ≥ insolvência ([ECO-011](../02-tecnico/05-catalogo-de-regras-e-formulas.md), [CMP-017](../02-tecnico/05-catalogo-de-regras-e-formulas.md)). Calibração final no lote de simulações econômicas.

### 15.6 Índices de inflação por categoria

A inflação do mundo não é um número único. O universo mantém índices distintos por categoria, que evoluem separadamente:

- preços gerais;
- salários;
- transferências;
- construção;
- crédito;
- custos regionais.

Isso estende o `MarketInflation` conceitual ([3.7](#37-marketinflation)), que trata salários, transferências e patrocínios, e opera sob o controle global de inflação ([14.7](#147-controle-de-inflação)). Uma regra é inegociável: **mudanças futuras de índice não reescrevem contratos já assinados** — a inflação afeta novos acordos, não os vigentes.

> **Decisão ratificada — R-46:** cada índice é um multiplicador que parte de **1.00** e é reajustado por temporada dentro de uma banda (governado por [ECO-012](../02-tecnico/05-catalogo-de-regras-e-formulas.md); contratos vigentes ficam imunes por [ECO-015](../02-tecnico/05-catalogo-de-regras-e-formulas.md)). Faixas de 1ª passada — **variação por temporada** / **banda acumulada**: preços gerais ±3% / [0.90, 1.30] · salários 0%…+5% (viés de alta) / [0.95, 1.50] · transferências −5%…+8% (mais volátil) / [0.85, 1.60] · construção +1%…+4% / [1.00, 1.40] · crédito (juros) base 0.5%–3.0% a.a., passo ±0.5 p.p./temporada · regional ±5% por região / [0.80, 1.30]. **Interação com o controle global ([14.7](#147-controle-de-inflação):** se `totalMoney` desvia > ±15% do alvo (R-49), o balanceador congela salários/preços e reduz premiações até reconvergir. Calibração final no lote de simulações econômicas.

## 16. Observação e recrutamento (scouting)

O investimento em olheiros e as áreas de scouting já aparecem como decisão de gestão na [seção 9.3](#93-categorias-de-investimento) — o scouting serve não só para achar jogador bom, mas para achar jogador **subvalorizado** antes do mercado — e como o campo `scoutingInvestment` do `ClubEconomy` ([3.1](#31-clubeconomy)). Esta seção descreve a outra face do scouting: a **informação** que ele produz e o **processo de recrutamento** que ela alimenta. A premissa econômica é que informação é um ativo caro, imperfeito e perecível — e que reduzir incerteza antes de gastar em transferência e salário é, em si, uma forma de proteger o caixa.

### 16.1 Mercado de pessoas únicas e informação imperfeita

Como cada jogador é único (herança do mundo persistente estilo Brasfoot), contratar um atleta **retira uma possibilidade real dos demais clubes**: o mercado não é uma loja com cópias infinitas. E o clube **não conhece automaticamente** o que importa para decidir — valor real, potencial, interesse do jogador, personalidade, condição médica completa, exigência salarial e disponibilidade. Essas informações só se descobrem por observação, relações, consultas e negociações.

Essa assimetria é a mesma modelada no [Sistema de jogadores](./02-sistema-de-jogadores.md) (visibilidade de traços — visível, detectado por scout ou oculto — e as camadas de conhecimento sobre o estado do jogador). Aqui o efeito é econômico: o clube paga (em olheiros, tempo e risco) para estreitar a incerteza antes de comprometer dinheiro.

### 16.2 Necessidades de recrutamento

Antes de observar, o clube define **o que procura**. Uma necessidade de recrutamento pode ser expressa por posição, função, idade, qualidade, potencial, custo, prazo, situação contratual e nacionalidade ou inscrição. Isso conecta a busca à `TransferStrategy` ([3.9](#39-transferstrategy)) e ao seu `preferredAgeRange`: o scouting não é aleatório, é dirigido pela lacuna do elenco e pelo orçamento.

### 16.3 Missões de observação

A observação é organizada em **missões**, cada uma com um foco. Uma missão pode focar:

- um **jogador específico**;
- uma **competição** inteira;
- uma **região**;
- uma **faixa etária**;
- uma **função** tática;
- **contratos terminando** (oportunidades de custo baixo);
- **oportunidades de empréstimo**.

O foco define custo, cobertura e o tipo de achado: vasculhar uma região revela nomes desconhecidos e baratos; observar um jogador específico aprofunda a confiança sobre um alvo já conhecido.

### 16.4 Qualidade e conteúdo do relatório

A qualidade de um relatório depende da competência do olheiro, do tempo dedicado, do acesso, do número de observações, do contexto das partidas assistidas, da especialidade do olheiro e da sua familiaridade regional. Um bom olheiro numa região que conhece produz uma leitura estreita e confiável; um olheiro fraco, com poucas observações, produz uma faixa larga e arriscada.

O relatório pode conter avaliação atual, potencial estimado, pontos fortes e fracos, funções em que o jogador rende, personalidade percebida, adaptação provável, situação contratual conhecida, faixa de valor, uma recomendação e — crucialmente — um **nível de confiança**. O relatório nunca entrega a verdade absoluta: entrega uma **estimativa com incerteza declarada**. Um mesmo jogador pode ser lido como "83 a 88, risco emocional detectado" por um olheiro bom e como "70 a 90, risco subestimado" por um olheiro ruim.

> **Decisão ratificada — R-47:** a estrutura do `ScoutReport` e a informação assimétrica ficam em [PLY-012](../02-tecnico/05-catalogo-de-regras-e-formulas.md) / [Sistema de jogadores](./02-sistema-de-jogadores.md) (não duplicar aqui). A **dependência econômica** — custo × precisão — recebe esta 1ª passada: **custo por observação** `custoObsMinor` proporcional ao foco, de **`2000000`** (R$ 20.000,00, missão regional) a **`20000000`** (R$ 200.000,00, missão intercontinental). **Estreitamento da incerteza:** largura da faixa estimada `w = w0 · n^(−0.5) · (1.4 − 0.8·competênciaNorm)`, com `w0 = 40` pontos de overall (1 observação), `n` = nº de observações e **piso `w_min = 4`** (a verdade nunca é revelada — [PLY-012](../02-tecnico/05-catalogo-de-regras-e-formulas.md)). O ganho marginal decresce por `n^(−0.5)`: o ROI de scouting satura por volta de **6–8 observações** por alvo, ponto em que o custo tende a superar o ganho de precisão. Calibração final no lote de simulações econômicas.

### 16.5 Relatórios contraditórios

Dois olheiros podem discordar sobre o mesmo jogador, e essa divergência é intencional. Ao receber relatórios conflitantes, o clube compara **fonte, confiança, data, especialidade e número de observações** — e decide sob incerteza. Ponto inegociável: **a discordância não é resolvida revelando automaticamente a verdade**. O jogo não abre o "valor real" para desempatar; a verdade só aparece com o tempo (desempenho, evolução, negociação), coerente com o princípio de informação assimétrica do [Sistema de jogadores](./02-sistema-de-jogadores.md). Isso preserva o risco real de errar uma contratação — e o custo econômico do erro.

### 16.6 Envelhecimento da informação

Um relatório é uma foto, não um fato permanente. A informação **envelhece**: entre a observação e a decisão, o jogador pode evoluir, lesionar-se, mudar de função, assinar contrato, perder espaço no elenco ou alterar o interesse em sair. Um relatório antigo é menos confiável, mesmo que tenha sido excelente quando escrito. Isso pressiona o clube a manter observação contínua sobre alvos prioritários e a **datar cada leitura** — a data é justamente um dos critérios de comparação de [16.5](#165-relatórios-contraditórios).

### 16.7 Lista de observação

Os alvos são organizados numa **lista de observação**, que funciona como um pipeline de recrutamento. Cada item registra prioridade, motivo, responsável, próxima ação, prazo, último relatório e situação de mercado do alvo. A lista transforma o scouting de esforço avulso em processo gerenciável: mostra o que está maduro para proposta, o que precisa de nova observação (informação velha — [16.6](#166-envelhecimento-da-informação)) e o que saiu do radar.

### 16.8 Do relatório à decisão de recrutamento

Com a informação em mãos, o recrutamento **compara candidatos** por adequação esportiva, custo total, risco, idade, potencial, disponibilidade, adaptação, impacto no grupo e inscrição. **Custo total** e **inscrição** são filtros econômicos e regulatórios que podem eliminar o candidato esportivamente melhor: um alvo perfeito que não cabe no custo total (transferência + salário + comissões) ou que não pode ser inscrito não é uma boa contratação. O valor de mercado que entra nessa conta é o de [5.3](#53-valor-de-mercado) e [14.6](#146-preço-dos-jogadores-como-reflexo-do-universo) — percebido, relativo, influenciado pela economia do mundo e sem preço absoluto imutável.

### 16.9 Jogadores livres

Jogadores sem contrato são um mercado à parte, sensível ao tempo. Com o passar das semanas, um jogador livre tende a **reduzir exigências**, buscar divisões inferiores, aceitar testes, mudar de região ou considerar a aposentadoria. Para o clube, é uma fonte de **custo de transferência zero** (mas não de salário ou luvas zero), especialmente útil para os perfis econômicos pressionados descritos na [seção 2](#2-os-7-perfis-econômicos-de-clube).

### 16.10 Mercado de funcionários

Funcionários (olheiros, comissão técnica e demais cargos) também são únicos e disputados: reputação, projeto do clube, salário, função, estrutura e autonomia influenciam o interesse deles. O detalhamento de cargos e staff pertence a [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md); aqui basta registrar o efeito econômico: contratar um bom olheiro é um investimento em **qualidade de informação** e, portanto, em redução de risco financeiro nas contratações.

## 17. Transferências e contratos: nuances de processo

A [seção 8](#8-contratos-empresários-e-mente-financeira) trata o **núcleo emocional** da negociação (empresário, mente financeira, pressão) e a [seção 15.2](#152-regime-de-competência) trata o **impacto contábil** (regime de competência, parcelas, obrigações condicionadas). Esta seção trata o **processo** em si: as etapas por que uma transferência passa, as garantias que impedem que compromissos sumam e as travas que separam "assinar" de "poder jogar".

### 17.1 Transferência como processo, não como troca de campo

Uma transferência não é "mudar o clube atual do jogador". Ela é uma sequência de etapas — consulta, proposta, contraproposta, acordo entre clubes, negociação com o jogador, exame, registro, pagamento e conclusão. Cada etapa pode falhar, e cada etapa concluída gera compromissos reais. Alterar apenas o vínculo do jogador não representa a operação.

Os tipos de movimentação possíveis incluem transferência definitiva, empréstimo (ver [7.4](#74-empréstimos-como-ponte-entre-clubes-grandes-e-pequenos)), contratação de jogador livre ([16.9](#169-jogadores-livres)), pré-contrato, troca envolvendo jogadores (quando permitida), retorno de empréstimo e promoção interna da base.

### 17.2 Propostas com versões preservadas

Uma proposta pode combinar valor fixo, parcelas, bônus, percentual de venda futura, recompra, preferência, prazo e condições. Durante o vaivém da negociação, **contrapropostas não apagam as versões anteriores**: cada versão da proposta é preservada. Isso importa por coerência (nenhum lado "reescreve" o que foi oferecido) e por rastreabilidade — o histórico da negociação é auditável, alinhado ao princípio de que o histórico financeiro não é corrigido apagando valores, mas por ajustes e reversões identificadas ([15.2](#152-regime-de-competência)).

Antes de enviar ou aceitar, o clube pesa sua **capacidade financeira real**: orçamento, caixa, reserva ([15.4](#154-reservas-de-recurso)), parcelas futuras, folha, bônus, comissões e custos de registro. Uma proposta que o caixa não sustenta é irresponsável mesmo quando o valor esportivo é atraente.

### 17.3 Exame médico como etapa (não formalidade)

O exame médico é uma **etapa do processo com poder de decisão**, não um carimbo. Seu resultado pode ser:

- **aprovar** — o negócio segue;
- **aprovar com risco** — libera, mas sinaliza um passivo de saúde que afeta valor e planejamento;
- **solicitar avaliação adicional** — trava a conclusão até novo exame;
- **reprovar** — derruba o negócio;
- **alterar termos** — reabre a negociação (por exemplo, preço menor, contrato mais curto ou cláusulas de proteção) em função do achado médico.

O exame **não revela necessariamente todo o histórico médico** ao clube comprador sem as permissões aplicáveis — coerente com as camadas de informação médica assimétrica do [Sistema de jogadores](./02-sistema-de-jogadores.md). Ou seja, "aprovar com risco" pode significar que o comprador aceita uma incerteza que não conseguiu eliminar.

> **Decisão ratificada — R-48:** o exame produz um `riscoMédico` 0–100 (histórico de lesão, idade, carga, achados), e os limiares de 1ª passada mapeiam os resultados da etapa ([ECO-016](../02-tecnico/05-catalogo-de-regras-e-formulas.md)): `risco < 30` → **aprovar** · `30 ≤ risco < 55` → **aprovar com risco** · `55 ≤ risco < 75` → **solicitar avaliação adicional** (trava) · `risco ≥ 75` → **reprovar**; **alterar termos** é a saída paralela disponível em "aprovar com risco". **Efeitos:** "aprovar com risco" reduz o valor de mercado (5.3) em `−0.5%·(risco−30)` (≈ −12% a risco 54); prêmio de seguro `= base·(1 + 0.03·risco)`; "alterar termos" propõe preço −10%…−25% e/ou contrato mais curto / cláusula de proteção. O exame não revela todo o histórico sem permissão ([PLY-012](../02-tecnico/05-catalogo-de-regras-e-formulas.md)): "aprovar com risco" pode ser incerteza aceita, não risco medido. Calibração final no lote de simulações econômicas.

### 17.4 Opção vs. obrigação de compra

Em empréstimos e em algumas transferências, a compra futura pode ser estruturada de duas formas fundamentalmente diferentes:

- **Opção de compra** — um direito: depende de **exercício válido** dentro do prazo e da regra. Se o clube não exerce, não compra.
- **Obrigação de compra** — um dever: é **acionada quando as condições são cumpridas** (por exemplo, número de partidas, acesso ou permanência). Uma vez acionada, existe independentemente da vontade posterior do clube.

Regra central: **falta de caixa não apaga uma obrigação de compra já ativada**. Diferentemente de uma opção (que o clube simplesmente deixa de exercer), a obrigação acionada vira compromisso/dívida e entra na contabilidade como tal ([15.1](#151-caixa-orçamento-e-compromissos), [15.2](#152-regime-de-competência)). Por isso aceitar uma obrigação de compra é uma decisão de risco financeiro, não uma cláusula inócua. Isso especializa a regra de empréstimo de [7.4](#74-empréstimos-como-ponte-entre-clubes-grandes-e-pequenos), que já limita a "opção de compra vantajosa embutida" para evitar abuso.

### 17.5 Registro ≠ assinatura: assinar não garante poder jogar

Um acordo pode estar **assinado e, ainda assim, não habilitar o jogador a atuar**. Entre a assinatura e a elegibilidade em campo há travas administrativas: janela aberta, inscrição na competição, vaga na lista, licença do clube, documentação e limites da competição (estrangeiros, idade, tamanho de elenco).

É o mesmo princípio já formalizado no [Licenciamento e inscrição de jogadores](./06-temporada-e-competicoes.md) (seção 15 daquele documento): **contratar um jogador não garante que ele esteja imediatamente apto a atuar**, e uma contratação concluída fora do prazo pode deixá-lo sem inscrição até a próxima janela. Aqui interessa o efeito econômico: o clube pode **já ter gasto o dinheiro e ainda não dispor do jogador em campo** — o custo é imediato, o benefício esportivo pode ser adiado. A elegibilidade é validada e congelada na preparação pré-jogo, não no momento do pagamento.

### 17.6 Conclusão, falha e opções contratuais

Uma negociação pode falhar por prazo, rejeição, contrato, exame, registro, falta de recursos, mudança de interesse ou regra competitiva. Ponto inegociável: **etapas concluídas e compromissos não desaparecem silenciosamente** — devem ser tratados conforme os acordos (uma parcela já devida, uma comissão já acionada, uma reserva de recurso a liberar). Isso ecoa a disciplina contábil da [seção 15](#15-contabilidade-e-disciplina-financeira).

Os próprios contratos podem embutir **opções e gatilhos** com efeito econômico futuro: opção do clube, do jogador ou mútua; renovação automática; e gatilhos por partidas, por acesso ou por permanência. Cada opção tem prazo e uma regra para o caso de ausência de resposta. A virada de temporada processa essas expirações, opções e gatilhos de forma **escalonada** — cada vínculo vira no seu próprio marco, não todos na mesma data (ver o encerramento contratual em [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md)).

### 17.7 Rescisão e contratos de funcionários

A rescisão pode ser acordada, unilateral (quando permitida), por cláusula, por inadimplência, por aposentadoria ou por decisão disciplinar, e costuma gerar compensação e impacto financeiro — conectando-se às punições econômicas e à inadimplência da [seção 10](#10-dívidas-punições-e-loops-de-consequência). Os contratos de funcionários seguem princípios equivalentes (duração, salário, função, responsabilidade, bônus, renovação, rescisão e aposentadoria), detalhados em [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md).

---

## Rastreabilidade — regras e fórmulas (catálogo)

Os sistemas descritos neste documento têm identificadores estáveis no [Catálogo de Regras e Fórmulas](../02-tecnico/05-catalogo-de-regras-e-formulas.md), para referência em código, testes e docs:

- **Regras de economia:** `ECO-001` a `ECO-017` (caixa inicial, oferta monetária, receitas/despesas, `financialHealth`, inflação por índice, valor de mercado, crise/reestruturação).
- **Recomendações de balanceamento (ratificada):** `R-41`..`R-49` (coeficientes de 1ª passada — ver [Série R](../99-decisoes/registro-de-decisoes.md)).
- **Semântica de ledger, conservação e progressão/população (ratificada):** `R-109`..`R-115` em [`../02-tecnico/13-ledger-e-conservacao-economica.md`](../02-tecnico/13-ledger-e-conservacao-economica.md) — contas sistêmicas/faucets/sinks, ledger de partidas dobradas, `INV-3a`/`INV-3b`, relógio único de progressão (accrual × aplicação) e equação demográfica com ordem e clamps. Fonte canônica que fecha o bloqueador **B-04**.
- **Ligações:** geração de jogadores (`PLY-002`) e premiações/tetos por competição (`CMP-*`).
