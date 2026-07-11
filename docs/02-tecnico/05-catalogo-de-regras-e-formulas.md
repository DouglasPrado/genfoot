# Catálogo de Regras, Fórmulas, Máquinas de Estado e Invariantes

> **Status:** Rascunho consolidado · **Fontes:** chats/como-construir-jogo-regras.md · **Revisão:** 2026-07-10

Este documento consolida a especificação executável do **Grinta**: o catálogo de regras identificáveis, o catálogo de fórmulas versionadas, as máquinas de estado de partida e temporada, os eventos de domínio e as invariantes que o sistema jamais pode violar.

O objetivo é transformar as decisões de design — hoje dispersas em conversas de brainstorming — em uma fonte oficial e estável, que sirva de contrato entre o design de jogo e a implementação técnica. As regras recebem identificadores estáveis para poderem ser referenciadas em código, testes e documentação sem ambiguidade.

## Sumário

- [1. Catálogo de Regras](#1-catálogo-de-regras)
  - [1.1 Sistema de IDs estáveis](#11-sistema-de-ids-estáveis)
  - [1.2 Interface `GameRule`](#12-interface-gamerule)
  - [1.3 Regras catalogadas](#13-regras-catalogadas)
- [2. Catálogo de Fórmulas](#2-catálogo-de-fórmulas)
  - [2.1 Interface `GameFormula`](#21-interface-gameformula)
  - [2.2 Versionamento de fórmulas](#22-versionamento-de-fórmulas)
  - [2.3 Fórmulas conceituais previstas](#23-fórmulas-conceituais-previstas)
- [Fórmulas do motor de partida (transcrição)](#fórmulas-do-motor-de-partida-transcrição)
  - [F1. Atributo efetivo por lance](#f1-atributo-efetivo-por-lance)
  - [F2. Fadiga por tick](#f2-fadiga-por-tick)
  - [F3. Moral atual](#f3-moral-atual)
  - [F4. Tática efetiva (TeamTacticalState)](#f4-tática-efetiva-teamtacticalstate)
  - [F5. Controle de zona e vantagem ofensiva vs defensiva](#f5-controle-de-zona-e-vantagem-ofensiva-vs-defensiva)
  - [F6. Posse e posse perigosa](#f6-posse-e-posse-perigosa)
  - [F7. Ataques esperados por tick](#f7-ataques-esperados-por-tick)
  - [F8. Duelo](#f8-duelo)
  - [F9. Criação de chance e tiers](#f9-criação-de-chance-e-tiers)
  - [F10. Qualidade da finalização](#f10-qualidade-da-finalização)
  - [F11. Defesa efetiva e chance de gol](#f11-defesa-efetiva-e-chance-de-gol)
  - [F12. Chance de falta e de cartão](#f12-chance-de-falta-e-de-cartão)
  - [F13. Risco de lesão](#f13-risco-de-lesão)
  - [F14. Momentum](#f14-momentum)
  - [F15. xG](#f15-xg)
  - [F16. Nota do jogador](#f16-nota-do-jogador)
  - [F17. decisionScore e limiares](#f17-decisionscore-e-limiares)
  - [F18. offlineDecisionQuality](#f18-offlinedecisionquality)
  - [F19. Qualidade da leitura e impacto da sugestão](#f19-qualidade-da-leitura-e-impacto-da-sugestão)
  - [F20. Deltas internos de uma ação](#f20-deltas-internos-de-uma-ação)
  - [F21. staffLevel (média ponderada)](#f21-stafflevel-média-ponderada)
- [3. Máquinas de Estado](#3-máquinas-de-estado)
  - [3.1 Partida](#31-partida)
  - [3.2 Temporada](#32-temporada)
- [4. Eventos de Domínio](#4-eventos-de-domínio)
  - [4.1 Telemetria por evento (log de depuração)](#41-telemetria-por-evento-log-de-depuração)
- [5. Invariantes](#5-invariantes)
- [6. Interfaces TypeScript de Referência](#6-interfaces-typescript-de-referência)
- [7. Notas de Ligação](#7-notas-de-ligação)

---

## 1. Catálogo de Regras

O catálogo de regras é a lista oficial das decisões de design que governam o comportamento do universo. Cada regra é uma unidade nomeada, identificável e — quando aplicável — configurável, para permitir balanceamento sem reescrever o domínio.

### 1.1 Sistema de IDs estáveis

Cada regra recebe um identificador estável, composto por um **prefixo temático** e um **número sequencial** de três dígitos. O ID nunca muda depois de atribuído, mesmo que a descrição da regra seja refinada — isso garante que referências em código, testes e outros documentos permaneçam válidas.

| Prefixo | Domínio     | Escopo |
|---------|-------------|--------|
| `ECO-`  | Economia    | Caixa, oferta monetária, inflação, receitas, despesas, preços de mercado |
| `PLY-`  | Jogadores   | Unicidade, geração, atributos, evolução, aposentadoria, equilíbrio etário |
| `MAT-`  | Partidas    | Simulação, intervenções táticas, eventos de jogo, resultado |
| `USR-`  | Usuário     | Regras específicas do jogador humano e sua relação com o clube |

> **Pendência:** Concluir a extração de **todas** as regras a partir dos documentos de game design em `../01-game-design/`. Este catálogo lista apenas as regras já exemplificadas nas fontes e deve ser expandido até cobrir integralmente economia, jogadores, partidas, competições e usuário.

### 1.2 Interface `GameRule`

Toda regra é descrita segundo a interface abaixo. Os campos `inputs`, `outputs`, `dependencies` e `invariants` conectam a regra ao restante do sistema; `configurable` indica se a regra expõe parâmetros ajustáveis para balanceamento.

```ts
interface GameRule {
  id: string;            // Identificador estável (ex.: "ECO-001")
  name: string;          // Nome curto e legível
  description: string;   // Descrição normativa da regra
  inputs: string[];      // Dados/entidades que a regra consome
  outputs: string[];     // Efeitos/estados que a regra produz
  dependencies: string[];// Outras regras ou módulos dos quais depende
  invariants: string[];  // Invariantes que a regra ajuda a preservar
  configurable: boolean; // Se expõe parâmetros ajustáveis
}
```

### 1.3 Regras catalogadas

As regras a seguir foram extraídas diretamente das fontes de brainstorming. Descrições, entradas, saídas, dependências e invariantes marcados como pendência ainda precisam ser formalizados junto ao game design.

| ID        | Nome                                   | Descrição |
|-----------|----------------------------------------|-----------|
| `ECO-001` | Caixa inicial igual                    | Todos os clubes iniciam com o mesmo valor-base em caixa. |
| `ECO-002` | Oferta monetária por clubes ativos     | A oferta monetária do universo depende da quantidade de clubes ativos. |
| `PLY-001` | Unicidade do jogador                   | Cada jogador é único no universo. |
| `PLY-002` | Geração com equilíbrio etário          | A geração de jogadores considera o equilíbrio etário do universo. |
| `MAT-001` | Intervenção tática em tempo real       | Partidas online permitem intervenções táticas em tempo real. |
| `USR-001` | Usuário não pode ser demitido          | O usuário humano não pode ser demitido do seu clube. |

**Detalhamento inicial das regras** (campos ainda a completar marcados como pendência):

#### ECO-001 — Caixa inicial igual
- **Descrição:** Todos os clubes iniciam a existência com o mesmo valor-base em caixa, garantindo ponto de partida econômico uniforme.
- **`configurable`:** `true` (o valor-base é um parâmetro de balanceamento).
- **Invariantes relacionadas:** o dinheiro do universo é rastreável desde a criação (ver [INV-3](#5-invariantes)).

> **Pendência:** Definir `inputs`, `outputs` e `dependencies` formais, e o valor-base concreto.

#### ECO-002 — Oferta monetária por clubes ativos
- **Descrição:** A quantidade de dinheiro disponível no universo é função da quantidade de clubes ativos.
- **`configurable`:** `true`.
- **Dependências:** relaciona-se com as fórmulas de inflação e de receita de clubes.

> **Pendência:** Formalizar a relação (linear? por faixa?) entre número de clubes ativos e oferta monetária.

#### PLY-001 — Unicidade do jogador
- **Descrição:** Cada jogador é uma entidade única; não existem duplicatas nem clones no universo.
- **`configurable`:** `false`.
- **Invariantes relacionadas:** nenhum jogador aparece sem evento de geração (ver [INV-6](#5-invariantes)).

#### PLY-002 — Geração com equilíbrio etário
- **Descrição:** A geração de novos jogadores considera o equilíbrio etário do universo, evitando distorções na pirâmide de idades.
- **`configurable`:** `true`.
- **Dependências:** aposentadorias (`PLY-*` a definir), número de vagas em elencos, idade média.

> **Pendência:** Definir a faixa de equilíbrio etário e os gatilhos de geração.

#### MAT-001 — Intervenção tática em tempo real
- **Descrição:** Em partidas online, o usuário pode intervir taticamente enquanto a partida ocorre, por meio de pontos de decisão.
- **`configurable`:** parcialmente (janelas e tipos de intervenção).
- **Dependências:** máquina de estado da partida (estado `PAUSED_FOR_DECISION`).

#### USR-001 — Usuário não pode ser demitido
- **Descrição:** O usuário humano nunca é demitido do clube que controla, independentemente de desempenho.
- **`configurable`:** `false`.

---

## 2. Catálogo de Fórmulas

As **fórmulas** são separadas das regras. Enquanto uma regra descreve *o que* deve valer, uma fórmula descreve *como* um valor é calculado. Manter as fórmulas isoladas e parametrizadas permite balancear o jogo sem reescrever o domínio.

### 2.1 Interface `GameFormula`

```ts
interface GameFormula {
  id: string;                          // Identificador estável da fórmula
  version: number;                     // Versão da fórmula (ver 2.2)
  parameters: Record<string, number>;  // Parâmetros de balanceamento
  calculate(input: unknown): unknown;  // Cálculo puro a partir da entrada
}
```

O método `calculate` deve ser uma função **pura e determinística**: dada a mesma entrada e os mesmos `parameters`, produz sempre o mesmo resultado. Isso é essencial para reprodutibilidade e auditoria.

### 2.2 Versionamento de fórmulas

Cada fórmula carrega um campo `version`. Quando o cálculo de uma fórmula muda de forma que altere resultados, incrementa-se a `version` em vez de mutar silenciosamente o comportamento. O versionamento permite:

- Comparar versões do motor sobre o mesmo universo.
- Auditar resultados históricos com a fórmula vigente à época (o registro de eventos guarda `rulesetVersion`).
- Reproduzir bugs e balanceamentos anteriores.
- Evitar divergência entre servidores que rodem versões diferentes.

> **Pendência:** Definir a política de correspondência entre `GameFormula.version` e o `rulesetVersion` do universo (`GameWorld.rulesetVersion`).

### 2.3 Fórmulas conceituais previstas

As fórmulas a seguir foram identificadas nas fontes como necessárias. Suas expressões concretas vivem nos documentos de game design (ver [Notas de Ligação](#7-notas-de-ligação)) e ainda precisam ser transcritas para especificação executável.

| Fórmula                     | Domínio conceitual |
|-----------------------------|--------------------|
| Evolução técnica            | Jogadores (motor de progressão) |
| Fadiga                      | Jogadores / partidas |
| Risco de lesão              | Jogadores / partidas |
| Geração de jogadores        | Jogadores / economia |
| Inflação                    | Economia |
| Preço de mercado            | Economia / mercado |
| Receita de clubes           | Economia |
| Impacto da comissão técnica | Clubes / progressão |
| Crescimento estrutural      | Clubes |
| Probabilidade de eventos    | Partidas |
| Desempenho em partidas      | Partidas |

> **Pendência:** Atribuir IDs estáveis a cada fórmula e definir seus parâmetros e versões. As **expressões** conceituais do motor de partida do **Grinta** já foram transcritas da fonte em [Fórmulas do motor de partida (transcrição)](#fórmulas-do-motor-de-partida-transcrição); resta ligar cada uma ao seu ID estável e calibrar os coeficientes.

---

## Fórmulas do motor de partida (transcrição)

Esta seção transcreve **fielmente** as fórmulas do motor de partida do **Grinta** a partir da fonte de brainstorming (`chats/simulacao-partida.md`, a rodada de detalhamento do cálculo interno). As expressões são **conceituais**: descrevem a estrutura do cálculo (quais termos somam, quais subtraem) e, quando a fonte fornece, o exemplo numérico correspondente.

> **Importante:** A maioria das fórmulas abaixo é somatória de fatores sem coeficientes explícitos na fonte. Onde os pesos, escalas e curvas exatos ainda não existem, marca-se `> **Pendência:**` de calibração — mas a **estrutura** da fórmula é normativa e deve ser preservada na implementação.

Cada fórmula resolve-se por **tick** (bloco curto de simulação, ~1 minuto). O fluxo por tick é: atualizar fadiga → moral → momentum → controle de zonas → posse perigosa → gerar ataques → resolver duelos → criar chances → resolver finalizações → eventos secundários → detectar pontos de decisão → aplicar comandos → salvar estado.

### F1. Atributo efetivo por lance

Nenhum jogador atua com o atributo base fixo: em cada lance o motor calcula um **atributo efetivo**, somando o contexto do lance ao valor base.

```
atributoEfetivo =
    atributoBase
  + moral
  + entrosamento
  + compatibilidadeTática
  + vantagemContextual
  − fadiga
  − pressãoEmocional
  − lesãoLeve
  − climaGramado
```

**Variáveis:** `atributoBase` (nota do jogador para o atributo em jogo, ex.: finalização), `moral`, `entrosamento`, `compatibilidadeTática`, `vantagemContextual` (ex.: chance clara, estar livre de marcação), `fadiga`, `pressãoEmocional`, `lesãoLeve`, `climaGramado`.

**Exemplo (atacante finalizando, base 72 → efetiva 73):**

```
Finalização base:              72
Moral alta:                    +5
Frieza boa:                    +4
Fadiga alta:                   −7
Marcação forte:                −8
Chance clara:                 +10
Pressão de jogo decisivo:      −3
────────────────────────────────
Finalização efetiva:           73
```

O mesmo jogador com finalização 72 poderia finalizar como 80 (confiante e livre) ou 59 (cansado, pressionado e sob chuva). Um jogador de finalização 68, descansado e livre, poderia finalizar como 82 naquela chance. O contexto do lance importa tanto quanto a nota.

> **Pendência:** Calibrar a escala de cada modificador (o exemplo usa incrementos inteiros de −8 a +10, mas a fonte não fixa a faixa nem o teto/piso do atributo efetivo).

### F2. Fadiga por tick

A fadiga acumula a cada tick e degrada progressivamente velocidade, força em duelos, precisão de passe, concentração, finalização e recomposição, além de **aumentar** risco de lesão, de erro e de cartão por atraso.

```
fadigaPorTick =
    baseDaPosição
  + intensidadeDoTime
  + pressãoAplicada
  + clima
  + gramado
  + açõesIndividuais
  − resistênciaDoJogador
  − preparaçãoFísicaDoClube
```

**Variáveis:** `baseDaPosição` (custo físico da posição), `intensidadeDoTime` (mentalidade/ritmo), `pressãoAplicada` (pressing), `clima`, `gramado`, `açõesIndividuais` (sprints e duelos no tick), `resistênciaDoJogador`, `preparaçãoFísicaDoClube`.

**Exemplo (lateral sob pressão alta, +3.6 no tick):**

```
Base posição:              2.0
Intensidade alta:         +1.5
Clima quente:             +0.8
Muitos duelos:            +0.7
Resistência alta:         −1.0
Preparação física boa:    −0.4
─────────────────────────────
Fadiga no tick:           +3.6
```

Faixas de efeito citadas: ~20% de fadiga → atua quase normal; ~65% → perde intensidade e precisão; ~85% → alto risco de erro, lesão e queda brusca de rendimento.

> **Pendência:** Calibrar as constantes por posição e a curva que converte fadiga acumulada em penalidade sobre os atributos (a fonte só dá o exemplo somado e as três faixas qualitativas).

### F3. Moral atual

A moral oscila durante a partida em função de eventos (gol marcado/sofrido, defesas, chances, cartões, torcida, sequências de domínio ou de pressão) e influencia decisão, frieza, erro técnico, agressividade, disciplina e confiança para driblar/finalizar.

```
moralAtual =
    moralInicial
  + eventosPositivos
  − eventosNegativos
  + liderançaEmCampo
  + gestãoEmocionalDaComissão
  − pressãoDaTorcida
  − importânciaDoJogo
```

**Variáveis:** `moralInicial`, `eventosPositivos` (gol, boa defesa, chance criada, torcida apoiando, domínio, expulsão adversária), `eventosNegativos` (gol sofrido, erro individual, cartão, pênalti perdido, vaias, pressão), `liderançaEmCampo`, `gestãoEmocionalDaComissão`, `pressãoDaTorcida`, `importânciaDoJogo`.

Elenco experiente segura melhor a moral; elenco jovem oscila mais.

> **Pendência:** Calibrar o peso de cada evento e o fator de experiência do elenco (a fonte não fornece exemplo numérico).

### F4. Tática efetiva (TeamTacticalState)

A tática do time gera modificadores coletivos, materializados no estado `TeamTacticalState`. Cada escolha tática soma e subtrai propriedades (ex.: mentalidade ofensiva `+ presença ofensiva + volume de ataque − proteção defensiva − estabilidade em transição`; pressão alta `+ recuperação no campo adversário + chance de erro adversário − fadiga − espaço nas costas`; defesa baixa `+ proteção da área + bloqueio central − posse ofensiva − volume sofrido`).

```
TeamTacticalState {
  attackIntent
  defensiveSecurity
  pressingPower
  transitionRisk
  tempo
  compactness
  width
  centralPresence
  wingPresence
}
```

**Exemplo (4-3-3 ofensivo com pressão alta):**

```
attackIntent:        78
pressingPower:       82
defensiveSecurity:   52
transitionRisk:      71
fatigueCost:      alto
```

> **Pendência:** Formalizar o mapeamento formação × mentalidade × pressão → valores de cada campo do `TeamTacticalState` (a fonte só dá o exemplo do 4-3-3 ofensivo).

### F5. Controle de zona e vantagem ofensiva vs defensiva

O campo é dividido em 9 zonas (defesa/meio/ataque × esquerda/centro/direita). Para cada zona o motor calcula a força ofensiva do time e a compara com a força defensiva adversária.

```
zoneControl =
    playersInZoneQuality
  + tacticalSupport
  + numericalAdvantage
  + morale
  + chemistry
  − fatigue
  − opponentPressure
  − instability

vantagemDaZona =
    forçaOfensivaDoTime
  − forçaDefensivaAdversária
```

Forma expandida da força de um setor (ex.: lado direito): `ponta + lateral + meia de apoio + foco ofensivo pelo lado + moral + entrosamento − fadiga − marcação adversária`.

**Exemplo (Time A ataca a direita vs defesa esquerda do Time B, vantagem +42):**

```
Ofensiva (Time A, direita)          Defensiva (Time B, esquerda)
  Ponta direito efetivo:   78          Lateral esquerdo efetivo:  61
  Lateral direito apoio:   66          Zagueiro cobertura:        70
  Meia cobertura:          60          Volante cobertura:         55
  Foco tático no lado:     +8          Fadiga lateral:            −8
  Moral:                   +4          Cartão amarelo:            −4
  ───────────────────────────          ────────────────────────────
  Força ofensiva:         216          Força defensiva:          174

  Vantagem: 216 − 174 = +42  → boa chance de criar por aquele lado
```

A probabilidade de ataque por zona deriva dessa vantagem:

```
probabilidadeDeAtaqueNaZona =
    vantagemDaZona
  + focoTático
  + jogadoresDisponíveis
  + fraquezaAdversária
  + padrãoRecente
  − bloqueioAdversário
```

**Exemplo (lado direito):** vantagem +42, foco tático +10, ponta em boa fase +6, lateral adversário cansado +8 → alta probabilidade de ataques por ali.

> **Pendência:** Definir a função que converte `vantagemDaZona` (e a `probabilidadeDeAtaqueNaZona`) em taxa efetiva de geração de ataques por tick.

### F6. Posse e posse perigosa

O motor separa **posse total** de **posse perigosa** — um time pode ter 60% de posse e criar pouco. São duas fórmulas distintas.

```
posse =
    qualidadeDoMeio
  + passe
  + táticaDeControle
  + entrosamento
  + moral
  − pressãoAdversária
  − erroTécnico
  − gramadoRuim

possePerigosa =
    posseEmZonasOfensivas
  + vantagemDeZona
  + criatividade
  + movimentação
  + falhasAdversárias
  − compactaçãoDefensivaAdversária
```

**Estatística derivada:** posse (%) = soma dos ticks controlados por cada time.

> **Pendência:** Calibrar a normalização de `posse` para percentual e o limiar de `possePerigosa` (a fonte não dá exemplo numérico).

### F7. Ataques esperados por tick

Em cada tick o motor define quantos ataques relevantes podem ocorrer. Nem todo ataque vira chance — muitos morrem em passe errado, desarme ou cruzamento bloqueado.

```
ataquesEsperados =
    ritmoDoJogo
  + mentalidadeOfensiva
  + possePerigosa
  + desorganizaçãoAdversária
  + momentum
  − defesaAdversária
  − baixaIntensidade
```

**Exemplo (qualitativo):** Time A com ritmo alto, posse perigosa alta, adversário cansado e momentum positivo → maior chance de gerar 2 ou 3 ataques relevantes no bloco.

> **Pendência:** Definir a função que mapeia o somatório para um número esperado de ataques por tick (a fonte fornece só o exemplo qualitativo de "2 ou 3").

### F8. Duelo

Cada ataque resolve-se por duelos (ex.: ponta × lateral). A chance de vencer é uma razão entre os atributos efetivos dos dois lados.

```
chanceDeVencerDuelo =
    ataqueEfetivo / (ataqueEfetivo + defesaEfetiva)
```

**Variáveis:** `ataqueEfetivo` (drible, velocidade, técnica, imprevisibilidade, moral do atacante), `defesaEfetiva` (marcação, posicionamento, força, concentração, disciplina do defensor).

**Exemplo (ponta 82 vs lateral 64 = 56%):**

```
chance do ponta = 82 / (82 + 64) = 0,5616 ≈ 56%
```

Modificadores aplicados sobre o resultado: `+ vantagem de velocidade + lateral cansado + cartão amarelo no defensor + ajuda de cobertura − clima ruim − gramado ruim`. Com eles o resultado do exemplo poderia subir para ~63%. O duelo não é binário: pode gerar drible completo, cruzamento bloqueado, falta sofrida, perda de bola, escanteio, passe para trás, erro técnico, cartão ou lesão em disputa.

> **Pendência:** Calibrar a magnitude dos modificadores pós-razão (a fonte dá a fórmula-base exata e um exemplo ilustrativo de ajuste para 63%).

### F9. Criação de chance e tiers

Depois que o ataque progride, o motor calcula se ele vira chance e de qual qualidade.

```
chanceDeCriar =
    qualidadeDaProgressão
  + criatividade
  + movimentaçãoOfensiva
  + erroDefensivo
  + vantagemNumérica
  + zonaPerigosa
  − compactaçãoAdversária
  − pressãoNoPortador
  − fadigaOfensiva
```

**Tiers de chance:** `chance fraca` · `chance média` · `chance clara` · `chance muito clara`.

**Exemplos de mapeamento (qualitativo):** cruzamento sob pressão → fraca/média; passe infiltrado livre → clara; contra-ataque 3 contra 2 → clara/muito clara; chute de fora → chance baixa, mas pode virar golaço.

> **Pendência:** Definir os limiares numéricos que separam os quatro tiers de chance (a fonte só os nomeia e dá exemplos qualitativos).

### F10. Qualidade da finalização

Quando uma chance nasce, o motor calcula a qualidade da finalização.

```
qualidadeDaFinalização =
    finalizaçãoEfetivaDoJogador
  + frieza
  + tipoDaChance
  + péDominante
  + ângulo
  + distância
  + pressãoDoMarcador
  + fadiga
  + moral
```

> **Observação de sinal:** a fonte lista todos os termos com `+`, mas `distância`, `pressãoDoMarcador` e `fadiga` atuam como penalidades (ver exemplo — valores negativos).

**Exemplo (atacante livre na área):**

```
Tipo da chance:      +25
Distância curta:     +15
Pressão baixa:       +10
Finalização:         +72
Frieza:               +8
Fadiga:               −6
→ finalização efetiva alta
```

**Contraexemplo (chute de longe):** distância −20, pressão −5, chance base menor.

> **Pendência:** Fixar os sinais e a escala de cada termo, e a base por tipo de chance (a fonte mistura sinais no texto e só os resolve nos exemplos).

### F11. Defesa efetiva e chance de gol

O gol não depende só do atacante: o motor calcula a resposta defensiva (goleiro + cobertura) e combina com a finalização.

```
defesaEfetiva =
    goleiroPosicionamento
  + reflexo
  + confiança
  + visãoDaBola
  + coberturaDefensiva
  + dificuldadeDoChute
  − desvio
  − bolaMolhada
  − marcaçãoAtrapalhandoVisão

chanceDeGol =
    qualidadeDaFinalização
  − defesaEfetiva
  + qualidadeDaChance
  + aleatoriedadeControlada
```

A `aleatoriedadeControlada` opera em três níveis: (1) variação normal (passes/duelos/finalizações), (2) erro humano (fadiga/pressão/concentração), (3) evento raro (frango, gol contra, golaço improvável, lesão precoce, expulsão boba, pênalti polêmico) — o evento raro tem de ser raro mesmo.

**Exemplo (chance de gol 33%):**

```
Qualidade da chance:    35
Finalização efetiva:    74
Defesa/goleiro:         68
Pressão defensiva:      −8
→ chance de gol: 33%   (sorteio dentro dos 33% = gol)
```

Se não for gol: defesa do goleiro, chute para fora, bloqueio, escanteio ou rebote.

> **Pendência:** Explicitar como os termos (qualidade 35, finalização 74, defesa 68, pressão −8) se combinam nos 33% (a fonte dá as entradas e o resultado, mas não a operação de normalização).

### F12. Chance de falta e de cartão

Faltas nascem de duelos, pressão e agressividade; cartões derivam da gravidade e do contexto.

```
chanceDeFalta =
    agressividadeDoJogador
  + marcaçãoForte
  + atrasoNoDuelo
  + fadiga
  + rivalMaisRápido
  + árbitroRigoroso
  − disciplina
  − concentração

chanceDeCartão =
    gravidadeDaFalta
  + árbitroRigoroso
  + repetiçãoDeFaltas
  + jogadorNervoso
  + contextoDoLance
  − disciplina
```

**Exemplo (qualitativo):** volante cansado, com amarelo, marcando forte → alto risco de segunda falta perigosa → gera ponto de decisão ("Seu volante está pendurado e chegando atrasado. Reduzir agressividade ou substituir?").

> **Pendência:** Calibrar pesos e o limiar que converte cada score em probabilidade por duelo (a fonte não dá exemplo numérico).

### F13. Risco de lesão

A lesão não é puramente aleatória: depende de **risco acumulado**.

```
riscoDeLesão =
    históricoFísico
  + fadiga
  + intensidade
  + clima
  + gramado
  + númeroDeSprints
  + númeroDeDuelos
  + idade
  − preparaçãoFísica
  − equipeMédica
```

**Tipos de lesão:** `leve` · `moderada` · `grave` · `por pancada` · `muscular` · `recorrente`.

**Exemplo (qualitativo):** jovem, descansado, gramado bom → baixo risco; jogador velho, 85% de fadiga, chuva, pressão alta → risco alto. A equipe médica influencia detecção precoce, risco real, tempo de recuperação e chance de agravar se o jogador seguir em campo.

> **Pendência:** Calibrar os pesos e a matriz que sorteia o tipo de lesão a partir do risco (a fonte só o descreve qualitativamente).

### F14. Momentum

O momentum representa o momento psicológico/tático. Sobe com gol marcado, sequência de ataques, torcida apoiando, adversário errando, duelos vencidos e mudança tática bem-sucedida; cai com gol sofrido, chance clara perdida, erro individual, vermelho, pressão adversária e fadiga coletiva.

```
momentum =
    eventosRecentes
  + controleTerritorial
  + moralColetiva
  + apoioDaTorcida
  + domínioDeZonas
  − fadiga
  − pressãoAdversária
```

O momentum não faz gol sozinho: aumenta a chance de gerar ataques (F7) e de vencer duelos próximos (F8).

> **Pendência:** Definir a janela de "eventos recentes" e o decaimento temporal do momentum (a fonte não dá exemplo numérico).

### F15. xG

O **xG** (expected goals) é a **soma das probabilidades de gol de cada finalização** do time na partida.

```
xG_time = Σ chanceDeGol(finalização_i)
```

**Exemplo:**

```
Chute com 0.32 de chance de gol:   xG += 0.32
Chute de fora com 0.04:            xG += 0.04
Cabeçada difícil com 0.10:         xG += 0.10
...
Final →  Time A xG: 1.84   |   Time B xG: 0.92
```

O xG ajuda a explicar se o resultado foi justo. Estatísticas irmãs saem dos mesmos eventos: finalização (chance vira chute), finalização no alvo (chute exige defesa ou vira gol), chance clara (`qualidadeDaChance` passa de um limite), escanteio, falta (duelo físico).

### F16. Nota do jogador

A nota nasce das ações, com critérios **por posição**, e é ajustada por **expectativa**.

```
Atacante:  + gol  + assistência  + chance criada  + finalização no alvo
           + duelos ofensivos vencidos
           − chance clara perdida  − impedimentos  − perdas de bola

Zagueiro:  + cortes  + duelos vencidos  + bloqueios  + interceptações
           − erro que gera chance  − falha em gol  − cartão

Goleiro:   + defesas difíceis  + pênalti defendido  + saída segura
           − falha  − gol evitável sofrido

Meia:      + passes-chave  + controle de posse  + assistências
           + recuperação de bola
           − passes perigosos errados  − sumir do jogo
```

**Ajuste por expectativa:** um zagueiro sob ataque muito forte pode tirar nota alta mesmo sofrendo pressão; um atacante pode marcar gol e ainda ter nota média se perdeu muitas chances.

> **Pendência:** Fixar a nota-base, os pesos de cada ação por posição e a função de ajuste por expectativa (a fonte lista os critérios, sem valores).

### F17. decisionScore e limiares

O motor gera sinais brutos por tick (ex.: `leftSideThreat = 82`, `midfieldLoss = 67`, `injuryRiskPlayer8 = 76`, `yellowCardRiskPlayer5 = 84`, `opportunityRightWing = 79`) e decide se cada um vira **ponto de decisão**.

```
decisionScore =
    severidade
  + urgência
  + tendênciaRecente
  + impactoPotencial
  + capacidadeDeAção
  − ruído
```

**Limiares (motor bruto):**

```
decisionScore > 70     → gera ponto de decisão
decisionScore 40–70    → observação interna
decisionScore < 40     → ignora
```

**A comissão altera o limiar:**

```
Comissão nível 1 → só alerta acima de 85, e tarde
Comissão nível 5 → alerta acima de 60 se o padrão for consistente e houver ação útil
```

Complemento (§26 da fonte — chance de detectar por nível): nível 1 ≈ 35% (mensagem genérica, tarde), nível 3 ≈ 65% (quando o padrão fica claro), nível 5 ≈ 90% (antes de virar chance clara, com sugestões detalhadas).

> **Pendência:** Calibrar os pesos de `decisionScore` e a curva nível-da-comissão → limiar (a fonte fixa os dois pontos extremos: 85 no nível 1, 60 no nível 5).

### F18. offlineDecisionQuality

Quando o usuário está ausente, a qualidade da IA que decide por ele é calculada assim:

```
offlineDecisionQuality =
    nívelDaComissão
  + autonomiaPermitida
  + clarezaDoPlanoPréJogo
  + leituraTática
  + comunicação
  − pressãoDoJogo
  − complexidadeDaSituação
```

Qualidade baixa → só ações seguras (substituir lesionado, reorganizar após expulsão). Qualidade alta → ações inteligentes (ajustar bloco, explorar setor, proteger jogador pendurado, alterar ritmo). O motor offline consulta, em ordem: existe emergência? existe regra no plano pré-jogo? a comissão tem qualidade para agir? a ação é segura? o risco de não agir supera o de agir?

> **Pendência:** Calibrar pesos e o limiar entre "ações seguras" e "ações inteligentes" (a fonte não dá exemplo numérico).

### F19. Qualidade da leitura e impacto da sugestão

Duas fórmulas conceituais da comissão técnica (§26–27 da fonte).

```
qualidadeDaLeitura =
    leituraTáticaDaComissão
  + familiaridadeComElenco
  + entrosamentoDaComissão
  + dadosDisponíveis
  + nívelDeAnáliseDoClube
  − pressãoDoJogo
  − caosDaPartida
  − mudançasRecentes

impactoDaSugestão =
    adequaçãoAoProblema
  + capacidadeDosJogadoresExecutarem
  + comunicaçãoDaComissão
  + tempoDisponívelParaEncaixar
  + compatibilidadeComTáticaBase
  − fadiga
  − pressãoEmocional
  − resistênciaDoAdversário
  − instabilidadePorMudançasExcessivas
```

**Exemplo (qualitativo):** final de campeonato, estádio cheio, jogador expulso e chuva forte → mesmo uma comissão boa tem leitura menos precisa porque o jogo está caótico (mantém imprevisibilidade). Uma sugestão boa ainda depende do elenco executá-la.

> **Pendência:** Calibrar pesos das duas fórmulas (a fonte não dá exemplo numérico).

### F20. Deltas internos de uma ação

Uma decisão do usuário/IA aplica deltas diretos sobre o estado interno da simulação, que valem nos próximos ticks. Cada ação carrega benefício, custo, tempo de encaixe, risco e duração.

**Exemplo (usuário manda "dar cobertura com volante no lado esquerdo"):**

```
leftSideDefensiveStrength     += 12
centralMidfieldControl        −= 6
defensiveMidfielderFatigueRate += 0.4
leftBackDuelPenalty           −= 8
```

Efeitos qualitativos correspondentes: `+ defesa no lado esquerdo`, `+ proteção ao lateral`, `− presença no meio central`, `− saída de bola central`, `+ fadiga do volante`. Como resposta, o adversário pode insistir com menos sucesso, mudar para o centro, inverter o jogo ou perder momentum.

> **Pendência:** Catalogar os deltas de todas as ações táticas disponíveis e sua janela de tempo de encaixe (a fonte dá só o exemplo da cobertura pelo volante; menciona encaixe de 2–5 min e duração ideal de 10–15 min para "pressão alta").

### F21. staffLevel (média ponderada)

O nível geral da comissão técnica é uma média ponderada de seus atributos (§3 da fonte, rodada C).

```
staffLevel =
    tacticalReading      * 0.25
  + communication        * 0.15
  + emotionalManagement  * 0.15
  + physicalPreparation  * 0.15
  + substitutions        * 0.15
  + adaptability         * 0.15
```

**Observação:** os pesos citados somam **1.00** (0.25 + 0.15×5). A fonte ressalva que o ideal **não** é usar apenas o nível geral: cada atributo (incluindo os não ponderados no exemplo, como `offensiveTraining`, `defensiveTraining`, `setPieces`, `offlineAutonomy`) deve impactar sistemas diferentes.

> **Pendência:** Confirmar se `offlineAutonomy` e os treinos entram no `staffLevel` ou operam apenas em subsistemas dedicados (o exemplo da fonte pondera só seis atributos).

---

## 3. Máquinas de Estado

As máquinas de estado definem os ciclos de vida das entidades temporais do jogo. Transições que não aparecem no diagrama são proibidas e devem ser rejeitadas pelo domínio.

### 3.1 Partida

```
SCHEDULED
  → PRE_MATCH
    → LIVE
      → PAUSED_FOR_DECISION
        → LIVE
      → FINISHED
        → PROCESSED
```

| Estado                | Significado |
|-----------------------|-------------|
| `SCHEDULED`           | Partida agendada no calendário; ainda não iniciada. |
| `PRE_MATCH`           | Preparação: escalações e táticas iniciais confirmadas. |
| `LIVE`                | Partida em andamento, simulada em intervalos pequenos. |
| `PAUSED_FOR_DECISION` | Pausa em ponto de decisão para intervenção tática (ver `MAT-001`). Retorna a `LIVE`. |
| `FINISHED`            | Partida encerrada; resultado definido. |
| `PROCESSED`           | Consequências aplicadas: classificação, físico/mental, finanças, eventos. |

O ciclo `LIVE → PAUSED_FOR_DECISION → LIVE` pode ocorrer múltiplas vezes durante a mesma partida. Uma vez em `FINISHED`, a partida jamais retorna a `LIVE` (ver [INV-2](#5-invariantes)).

### 3.2 Temporada

```
PLANNING
  → REGISTRATION
    → IN_PROGRESS
      → FINALIZING
        → OFF_SEASON
          → COMPLETED
```

| Estado         | Significado |
|----------------|-------------|
| `PLANNING`     | Definição de competições, formatos e calendário da temporada. |
| `REGISTRATION` | Inscrição de clubes e ajustes de elenco pré-temporada. |
| `IN_PROGRESS`  | Temporada em curso; rodadas e partidas sendo disputadas. |
| `FINALIZING`   | Encerramento de competições, apuração de classificação, promoção/rebaixamento e premiação. |
| `OFF_SEASON`   | Período entre temporadas: aposentadorias, geração de jogadores, mercado. |
| `COMPLETED`    | Temporada concluída; estado consistente para iniciar a próxima. |

---

## 4. Eventos de Domínio

Os eventos de domínio formam o registro imutável do que aconteceu no universo. São a base para notificações, narrativa, histórico, partidas ao vivo, auditoria, estatísticas, replay e processamento assíncrono.

| Evento                     | Descrição |
|----------------------------|-----------|
| `WorldCreated`             | Um universo foi criado. |
| `SeasonStarted`            | Uma temporada iniciou. |
| `PlayerGenerated`          | Um jogador foi gerado (única origem válida de um jogador). |
| `PlayerRetired`            | Um jogador se aposentou. |
| `MatchScheduled`           | Uma partida foi agendada. |
| `MatchStarted`             | Uma partida entrou em `LIVE`. |
| `GoalScored`               | Um gol foi marcado. |
| `TacticalInstructionIssued`| Uma instrução tática foi emitida (intervenção em tempo real). |
| `PlayerInjured`            | Um jogador sofreu lesão. |
| `TransferCompleted`        | Uma transferência foi concluída. |
| `ClubStructureUpgraded`    | A estrutura de um clube foi aprimorada. |
| `SeasonCompleted`          | Uma temporada foi concluída. |

Cada evento é persistido de forma imutável. A estrutura de registro prevista carrega `id`, `worldId`, `aggregateType`, `aggregateId`, `eventType`, `gameDate`, `sequence`, `payload`, `rulesetVersion` e `createdAt`.

### 4.1 Telemetria por evento (log de depuração)

Além do registro imutável de eventos de domínio, o motor mantém um **log interno de telemetria** por evento, voltado a desenvolvimento, balanceamento e auditoria. Esses campos **não aparecem para o usuário comum** — são invisíveis na experiência, mas essenciais para depuração e para explicar por que um resultado aconteceu. Por evento, o log registra:

- **chance real de gol** aplicada no lance;
- **causa dos gols** (o que originou cada gol);
- **ação que influenciou** o evento (comando do usuário/IA que alterou o desfecho);
- **setor de origem** da jogada;
- **xG** da finalização;
- **probabilidade aplicada** no sorteio;
- **principais modificadores** que pesaram no cálculo;
- **cadeia causal** completa do lance.

Esse log sustenta a explicabilidade do motor (ver a pendência "Registrar causalidade dos eventos" em [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md)) e a calibração estatística em massa (gols por jogo, finalizações, cartões, lesões, empates, viradas, goleadas, vitórias de favoritos, zebras, vantagem de mando, impacto da comissão, impacto do usuário online e quantidade de alertas).

---

## 5. Invariantes

Invariantes são condições que o sistema **nunca** pode violar em nenhum estado consistente. Elas devem ser garantidas pelo domínio e verificadas por testes de invariante e de propriedade.

| ID      | Invariante |
|---------|------------|
| INV-1   | **Um contrato ativo por jogador.** Um jogador só pode possuir um contrato ativo simultaneamente. |
| INV-2   | **Partida finalizada não volta a `LIVE`.** Uma partida em `FINISHED`/`PROCESSED` jamais retorna ao estado `LIVE`. |
| INV-3   | **Conservação do dinheiro.** Em qualquer transferência de valor, o dinheiro sai de uma entidade e entra em outra; não é criado nem destruído. Nenhum dinheiro aparece sem origem. |
| INV-4   | **Aposentado não pode ser escalado.** Nenhum jogador aposentado pode ser escalado para uma partida. |
| INV-5   | **Classificação corresponde aos resultados.** A classificação sempre reflete exatamente os resultados já processados. |
| INV-6   | **Todo jogador tem origem.** Nenhum jogador existe sem um evento `PlayerGenerated` correspondente. |
| INV-7   | **Faixa de equilíbrio populacional.** O número de jogadores permanece dentro da faixa de equilíbrio do universo. |

As invariantes centrais destacadas nas fontes são INV-1, INV-2, INV-3 e INV-4; INV-5 a INV-7 completam o conjunto de condições de consistência mencionadas.

---

## 6. Interfaces TypeScript de Referência

As interfaces abaixo são as citadas nas fontes e servem de contrato para os pacotes `rules`, `simulation`, `match-engine` e `domain`.

### `GameRule`

```ts
interface GameRule {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  invariants: string[];
  configurable: boolean;
}
```

### `GameFormula`

```ts
interface GameFormula {
  id: string;
  version: number;
  parameters: Record<string, number>;
  calculate(input: unknown): unknown;
}
```

### `CompetitionFormat`

O formato de competição é configurável por dados, não por código.

```ts
interface CompetitionFormat {
  participantCount: number;
  phases: CompetitionPhaseDefinition[];
  tieBreakers: TieBreaker[];
  promotionRules: MovementRule[];
  relegationRules: MovementRule[];
}
```

### `MatchSimulationInput`

Entrada do motor de partidas. A simulação integral (sem intervenção humana) deve funcionar primeiro; os comandos táticos em tempo real são adicionados depois.

```ts
interface MatchSimulationInput {
  home: TeamSnapshot;
  away: TeamSnapshot;
  homeTactics: Tactics;
  awayTactics: Tactics;
  context: MatchContext;
  seed: string;
}
```

### `MatchSimulationResult`

Saída do motor de partidas. Reúne placar, eventos, desempenhos individuais, consequências físicas e o relatório tático da partida simulada.

```ts
interface MatchSimulationResult {
  score: Score;
  events: MatchEvent[];
  playerPerformances: PlayerPerformance[];
  physicalConsequences: PhysicalImpact[];
  tacticalReport: TacticalReport;
}
```

> **Pendência:** Especificar os tipos auxiliares referenciados (`CompetitionPhaseDefinition`, `TieBreaker`, `MovementRule`, `TeamSnapshot`, `Tactics`, `MatchContext`, `Score`, `MatchEvent`, `PlayerPerformance`, `PhysicalImpact`, `TacticalReport`) no Domain Kernel.

---

## 7. Notas de Ligação

As fórmulas conceituais deste catálogo têm sua definição matemática e de balanceamento nos documentos de game design:

- **Economia** (inflação, oferta monetária, receita de clubes, preço de mercado, `ECO-*`) → `../01-game-design/` (documento de economia).
- **Motor de partidas** (desempenho, probabilidade de eventos, fadiga, lesão, `MAT-*`) → `../01-game-design/` (documento do motor de partidas).
- **Jogadores** (evolução técnica, geração, aposentadoria, equilíbrio etário, `PLY-*`) → `../01-game-design/` (documento de jogadores).

Este catálogo é a camada técnica que referencia essas fontes; ele fixa **IDs, interfaces, estados, eventos e invariantes**, enquanto as expressões numéricas e curvas de balanceamento permanecem nos documentos de game design correspondentes.

> **Pendência:** Confirmar os nomes de arquivo exatos em `../01-game-design/` e substituir as referências genéricas por links diretos quando os documentos estiverem consolidados.
