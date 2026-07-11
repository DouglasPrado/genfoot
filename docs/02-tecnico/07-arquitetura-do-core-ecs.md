# Arquitetura do Core (Entity–Component–Effect–Event)

> **Status:** Rascunho consolidado · **Fontes:** chats/lista-envolvidos-jogo.md (2ª metade) · **Revisão:** 2026-07-10

## Resumo

Este documento formaliza a arquitetura do **core** do Grinta — o motor que sustenta o simulador de futebol online de mundo persistente. A ideia central é que o core não é um conjunto de tabelas com números fixos, e sim um **simulador de ecossistema futebolístico**: entidades possuem componentes, eventos disparam efeitos, efeitos alteram estados, estados mudam decisões e partidas, e tudo deixa memória para moldar o futuro.

O modelo se apoia em quatro pilares — **Entity → Component → Effect → Event** — e em uma regra única de projeto: *nada no jogo é apenas número; todo número tem origem, contexto, consequência e memória*. A partir desses pilares, o core se organiza em ~14 sistemas cooperantes que reaproveitam a mesma lógica para jogadores, clubes, torcidas, estádios, staff e competições.

## Sumário

- [Filosofia: um simulador de ecossistema](#filosofia-um-simulador-de-ecossistema)
- [Entity System](#entity-system)
  - [Entidade completa: Jogador](#entidade-completa-jogador)
  - [Entidade completa: Clube](#entidade-completa-clube)
- [Component System](#component-system)
  - [Attributes](#component-attributes)
  - [State](#component-state)
  - [Traits / Personality](#component-traits--personality)
  - [Memory](#component-memory)
  - [Relationship / Relations](#component-relationship--relations)
  - [InvestmentPiece](#component-investmentpiece)
- [Effect System (o coração do core)](#effect-system-o-coração-do-core)
- [Event System e cascatas](#event-system-e-cascatas)
- [Influence System](#influence-system)
- [Peças investíveis do clube (InvestmentPiece / ClubPiece)](#peças-investíveis-do-clube-investmentpiece--clubpiece)
- [Development System](#development-system)
- [Youth System: safra por soma de peças](#youth-system-safra-por-soma-de-peças)
- [Match System](#match-system)
- [Ciclos: temporada e crescimento do clube](#ciclos-temporada-e-crescimento-do-clube)
- [Matriz Central de Impacto](#matriz-central-de-impacto)
- [Estrutura Final do Core (~14 sistemas)](#estrutura-final-do-core-14-sistemas)
- [Regra de Ouro do projeto](#regra-de-ouro-do-projeto)
- [Benefícios e resultado final](#benefícios-e-resultado-final)
- [Documentos relacionados](#documentos-relacionados)

---

## Filosofia: um simulador de ecossistema

O core do Grinta deve ser um **simulador de ecossistema futebolístico**, não um agregado de fórmulas isoladas. A regra principal que guia o motor é:

> Tudo que existe no jogo pode influenciar alguma coisa.
> Mas nada influencia diretamente de forma fixa.
> Tudo passa pelo sistema de efeitos.

Ou seja: não existem regras cravadas ligando causa a consequência. Toda interação nasce de um evento, vira um efeito, altera um estado e, quando relevante, deixa uma memória. Isso permite cascatas emergentes em vez de reações codificadas manualmente.

**Exemplo de cascata (curto prazo, dentro da partida):**

```
Torcida vaia
→ gera efeito de pressão
→ pressão afeta jogadores sensíveis
→ jogadores afetados erram mais
→ erro muda a partida
→ partida muda moral, mídia e reputação
```

**Exemplo de cascata (longo prazo, estrutural):**

```
Clube investe em nutrição
→ melhora estrutura de desenvolvimento físico
→ elenco atual recupera melhor
→ jogadores jovens evoluem melhor
→ próximas safras nascem com melhor maturidade física
→ clube passa a formar atletas mais completos
```

A mesma mecânica cobre desde um lance de segundos até a evolução de um clube ao longo de temporadas.

---

## Entity System

Em vez de uma classe gigante `Jogador` com centenas de campos fixos, o core usa **entidades compostas por componentes**. Tudo é entidade: jogador, clube, staff, torcida, estádio, competição.

```ts
Entity {
  id: string
  type: "player" | "club" | "staff" | "fanbase" | "stadium" | "competition"
  components: Component[]
}
```

Com isso, um jogador, um clube, uma torcida e um estádio reaproveitam estruturas parecidas (atributos, estado, traços, memória, relações), mas cada instância recebe valores próprios. O comportamento de uma entidade emerge da combinação dos seus componentes, não de uma hierarquia rígida de tipos.

As entidades típicas do mundo são: **clube, jogador, staff, torcida, mídia, diretoria, estádio, competição, seleção** e **liga**.

### Entidade completa: Jogador

O jogador é a composição de vários componentes em um único agregado. Não é uma classe monolítica, mas um conjunto de blocos coordenados:

```
Player
├── Identity
│   ├── nome
│   ├── idade
│   ├── nacionalidade
│   ├── região
│   └── posição
│
├── LifeStory
│   ├── infância
│   ├── família
│   ├── condição social
│   ├── acesso ao futebol
│   ├── traumas
│   └── motivações
│
├── Attributes
│   ├── técnico
│   ├── físico
│   ├── mental
│   ├── tático
│   └── goleiro, se aplicável
│
├── State
│   ├── moral
│   ├── confiança
│   ├── pressão
│   ├── fadiga
│   └── foco
│
├── Traits
│   ├── ambicioso
│   ├── leal
│   ├── raçudo
│   ├── sensível
│   └── frio em decisão
│
├── Development
│   ├── potencial natural
│   ├── potencial aproveitável
│   ├── curva de evolução
│   ├── compatibilidade de treino
│   └── histórico de desenvolvimento
│
├── Career
│   ├── clubes
│   ├── técnicos
│   ├── lesões
│   ├── títulos
│   ├── convocações
│   └── memórias
│
├── Contract
│   ├── salário
│   ├── tempo
│   ├── multa
│   ├── promessas
│   └── satisfação
│
└── Relationships
    ├── técnico
    ├── torcida
    ├── diretoria
    ├── empresário
    └── colegas
```

A **LifeStory** é o que dá singularidade: a história de vida gera traços, riscos e motivações que nenhum outro jogador terá igual (ver [Youth System](#youth-system-safra-por-soma-de-peças)).

### Entidade completa: Clube

O clube segue a mesma lógica de composição, agregando seus próprios componentes — incluindo o conjunto de peças investíveis:

```
Club
├── Identity
│   ├── nome
│   ├── cidade
│   ├── país
│   └── fundação
│
├── InstitutionalState
│   ├── reputação
│   ├── tradição
│   ├── momento
│   ├── expectativa
│   ├── estabilidade
│   └── crise
│
├── Squad
│   ├── elenco profissional
│   ├── base
│   ├── emprestados
│   └── jogadores observados
│
├── InvestmentPieces
│   ├── elenco
│   ├── base
│   ├── olheiros
│   ├── comissão
│   ├── médico
│   ├── nutrição
│   ├── psicologia
│   ├── preparador físico
│   ├── preparador de goleiros
│   ├── estádio
│   ├── tecnologia
│   ├── marketing
│   ├── comunicação
│   ├── diretoria
│   ├── logística
│   └── jurídico
│
├── Fanbase
│   ├── tamanho
│   ├── presença
│   ├── paciência
│   ├── exigência
│   ├── fidelidade
│   └── sócio-torcedor
│
├── Finance
│   ├── receita
│   ├── despesas
│   ├── salários
│   ├── patrocínio
│   ├── bilheteria
│   └── dívida
│
├── Memory
│   ├── títulos
│   ├── rebaixamentos
│   ├── ídolos
│   ├── rivalidades
│   ├── vexames
│   └── gerações históricas
│
└── Philosophy
    ├── estilo de jogo
    ├── uso da base
    ├── compra/venda
    ├── pressão por resultado
    └── identidade tática
```

O bloco **InvestmentPieces** conecta a entidade clube às [peças investíveis](#peças-investíveis-do-clube-investmentpiece--clubpiece): a força de um clube é a soma das suas peças, não uma categoria fixa.

---

## Component System

Componentes são blocos reutilizáveis que qualquer entidade pode conter. Os principais componentes do core são: **Attributes, State, Traits, Memory, Relationship** e **InvestmentPiece**.

### Component: Attributes

Guarda os atributos mais **estruturais / permanentes** da entidade, organizados por dimensão. As dimensões variam conforme o tipo de entidade.

```ts
AttributesComponent {
  technical?: Record<string, number>
  physical?: Record<string, number>
  mental?: Record<string, number>
  tactical?: Record<string, number>
  institutional?: Record<string, number>
  financial?: Record<string, number>
}
```

Exemplos por entidade:

| Entidade | Dimensão | Atributos |
| --- | --- | --- |
| Jogador | technical | passe, finalização, drible, domínio |
| Jogador | physical | velocidade, força, resistência |
| Jogador | mental | confiança, liderança, disciplina |
| Clube | institutional | estrutura, estabilidade, reputação, tradição, gestão |
| Estádio | infrastructure | gramado, iluminação, acústica, capacidade, conforto |

A mesma lógica de atributos serve para várias entidades.

### Component: State

Guarda o que é **temporário**: sobe e desce ao longo de partidas, semanas e temporadas.

```ts
StateComponent {
  morale: number
  pressure: number
  confidence: number
  fatigue: number
  focus: number
  crisis: number
  form: number
  satisfaction: number
}
```

Aplicações típicas:

- **Jogador:** moral, confiança, fadiga, pressão individual.
- **Time:** pressão coletiva, organização, clima do vestiário.
- **Clube:** crise, estabilidade, momento.

> **Atributo é mais permanente. Estado é temporário.** Essa separação é o que permite que a mesma entidade "boa no papel" jogue mal sob pressão.

### Component: Traits / Personality

Traços são características profundas que **modificam como a entidade reage aos eventos**.

```ts
TraitComponent {
  traits: Array<{
    key: string
    intensity: number
    visibility: "visible" | "hidden" | "scouted"
  }>
}
```

Exemplos de traços:

- **Jogador:** raçudo, sensível a críticas, ambicioso, leal, frio em decisão, instável emocionalmente, profissional exemplar.
- **Clube:** copeiro, formador, pressionado, instável politicamente, vendedor, tradicional.
- **Torcida:** exigente, fiel, impaciente, apaixonada, hostil.

Os traços fazem o mesmo evento gerar reações diferentes. Diante do evento *torcida vaia*:

| Traço do jogador | Reação |
| --- | --- |
| Sensível a críticas | pressão +10 |
| Raçudo | pressão +3, garra +5 |
| Frio em decisão | quase não sente |

O campo `visibility` (`visible` / `hidden` / `scouted`) é o que sustenta a incerteza dos relatórios de olheiro (ver [Youth System](#youth-system-safra-por-soma-de-peças)).

### Component: Memory

Memória é essencial para o jogo ter **história**. Registra eventos marcantes e, crucialmente, seus efeitos sobre o futuro.

```ts
MemoryComponent {
  memories: Array<{
    type: string
    description: string
    intensity: number
    season: number
    duration: "short" | "medium" | "long" | "historical"
    effectsOnFuture: Effect[]
  }>
}
```

Exemplos:

- **Memória do jogador:** perdeu pênalti em final; foi convocado para seleção; sofreu lesão grave; foi vaiado pela torcida; virou capitão; foi rejeitado em peneiras; ganhou título importante.
- **Memória do clube:** rebaixamento traumático; geração da base campeã; título continental; goleada sofrida para rival; estádio inaugurado; crise financeira histórica.

O efeito prático é: **evento passado → influencia reação futura**.

### Component: Relationship / Relations

Relacionamentos existem no core para evitar regras fixas de reação. Cada relação carrega confiança, tensão, lealdade e influência.

```ts
RelationshipComponent {
  relations: Array<{
    targetId: string
    type: "player_coach" | "player_fans" | "player_board"
        | "club_media" | "club_federation" | "player_agent"
    trust: number
    tension: number
    loyalty: number
    influence: number
  }>
}
```

Relações típicas: jogador ↔ técnico, jogador ↔ torcida, jogador ↔ empresário, jogador ↔ clube, clube ↔ mídia, clube ↔ federação, clube ↔ patrocinador, torcida ↔ diretoria.

Isso torna a consequência **contextual**. Diante de *clube veta convocação*:

- Se a relação jogador–clube é boa → moral cai pouco.
- Se a relação é ruim → jogador se revolta, empresário pressiona, mídia cria crise.

### Component: InvestmentPiece

Componente genérico para **qualquer peça investível do clube** (ver seção dedicada [Peças investíveis do clube](#peças-investíveis-do-clube-investmentpiece--clubpiece)).

```ts
InvestmentPieceComponent {
  key: string

  level: number
  investment: number
  quality: number
  efficiency: number
  maintenanceCost: number

  impacts: {
    match?: Effect[]
    playerDevelopment?: Effect[]
    youthGeneration?: Effect[]
    clubGrowth?: Effect[]
    finance?: Effect[]
    reputation?: Effect[]
  }
}
```

---

## Effect System (o coração do core)

**Tudo no jogo termina em um `Effect`.** Nenhum evento altera valores diretamente — ele produz efeitos, e o Effect System os aplica.

```ts
Effect {
  target: TargetSelector
  attribute: string
  operation: "add" | "subtract" | "multiply" | "set"
  value: number

  duration: "instant" | "minutes" | "match" | "days" | "weeks" | "season" | "permanent"
  decay?: number

  conditions?: Condition[]
  multipliers?: Multiplier[]
  memory?: boolean
}
```

Campos-chave:

- **`target`** — seletor que descreve *quem* é afetado (pode ser uma query sobre entidades).
- **`attribute` / `operation` / `value`** — o que muda e como.
- **`duration`** — janela de vida do efeito, de instantâneo a permanente.
- **`decay`** — taxa com que o efeito se dissipa ao longo do tempo.
- **`conditions` / `multipliers`** — condicionam ou amplificam o efeito conforme o contexto (traços, estado, relação).
- **`memory`** — se `true`, o efeito gera uma entrada no MemoryComponent do alvo.

**Exemplo — torcida vaiou:**

```ts
{
  target: "homeTeam.players.where(mental.sensitivity > 70)",
  attribute: "state.pressure",
  operation: "add",
  value: 8,
  duration: "match",
  decay: 0.15
}
```

Leitura: jogadores sensíveis do mandante ganham +8 de pressão durante a partida, e o efeito vai diminuindo com o tempo.

> **Pendência:** a gramática exata do `TargetSelector` (sintaxe de query `.where(...)`), o formato de `Condition` e `Multiplier`, e a ordem de resolução quando múltiplos efeitos incidem sobre o mesmo atributo não estão especificados no material de origem e precisam ser definidos.

---

## Event System e cascatas

Evento **não altera nada diretamente** — evento dispara efeitos. Além disso, um evento pode desencadear outros eventos (cascatas), o que é a base da simulação emergente.

```ts
GameEvent {
  id: string
  name: string
  category: string

  timing: "pre_match" | "in_match" | "post_match" | "weekly" | "seasonal"
  trigger: Condition[]
  probability: number
  intensity: number

  choices?: Choice[]
  effects: Effect[]
  cascades?: GameEvent[]
}
```

- **`trigger` / `probability`** — quando e com que chance o evento pode ocorrer.
- **`choices`** — decisões do jogador (técnico/gestor), cada uma com seu próprio conjunto de efeitos.
- **`cascades`** — eventos subsequentes que o próprio evento pode gerar.

### Exemplo prático: convocação para seleção

**Evento:** *Jogador convocado para seleção.* Escolhas possíveis: **liberar**, **vetar** ou **negociar limite de minutos**.

**Escolha: liberar**

```
jogador.moral        +8
jogador.reputation   +5
jogador.marketValue  + variável
clube.reputation     +2
jogador.fatigue      + risco
jogador.injuryRisk   + risco
```

**Escolha: vetar**

```
jogador.moral                     -10
jogador.satisfaction              -12
relação jogador-clube             -8
chance empresário pressionar      +10
jogador disponível para o clube
risco físico reduzido
```

Depois vêm **eventos em cascata**, todos reaproveitando a mesma estrutura. O jogador retorna da seleção em um de **8 estados**, cada um gerando seus próprios efeitos:

> voltou confiante · voltou cansado · voltou lesionado · voltou frustrado · voltou valorizado · voltou pressionado · voltou querendo sair · voltou mais maduro

O estado de retorno alimenta ainda a relação clube-seleção (confiança médica, histórico de liberação/lesão, prestígio do jogador, força da federação, importância do torneio).

---

## Influence System

A influência é **genérica**: qualquer fonte (torcida, mídia, diretoria, estádio, seleção, staff) usa a mesma estrutura para projetar poder positivo e negativo sobre alvos.

```ts
InfluenceSource {
  sourceId: string
  sourceType: "fans" | "media" | "board" | "staff" | "stadium" | "national_team"

  influencePower: number
  positivePower: number
  negativePower: number

  affects: string[]
}
```

Exemplos de fontes e efeitos:

| Fonte | Pode gerar |
| --- | --- |
| Torcida | apoio, pressão, hostilidade, aumento de receita, alteração de moral |
| Mídia | reputação, crise, pressão individual, valorização de jogador |
| Diretoria | estabilidade, cobrança, premiação, crise |

Todas as fontes usam a mesma lógica de influência, e cada uma resolve seu impacto através do [Effect System](#effect-system-o-coração-do-core).

---

## Peças investíveis do clube (InvestmentPiece / ClubPiece)

Toda estrutura do clube é modelada como uma **peça investível** com controle individual, mas seguindo o mesmo modelo (`InvestmentPieceComponent`, materializado como `ClubPiece`). Isso substitui categorias fixas por uma soma de peças, cada uma com seu nível, investimento, qualidade, eficiência e custo de manutenção.

Peças previstas:

> estádio · base · olheiros · médico · fisioterapia · nutrição · psicologia · preparador físico · preparador de goleiros · tecnologia · comunicação · marketing · diretoria · logística · segurança · torcida/sócio · comercial · jurídico

**Exemplo — Nutrição:**

```ts
ClubPiece {
  key: "nutrition"

  level: 64
  investment: 70
  quality: 62
  efficiency: 58
  staffQuality: 66
  maintenanceCost: 120000

  impacts: {
    currentSquad: {
      recovery: +6
      fatigueResistance: +4
      injuryRisk: -3
    }
    youthGeneration: {
      physicalMaturity: +5
      injuryRisk: -4
      developmentConsistency: +3
    }
    clubGrowth: {
      structure: +2
      attractiveness: +1
    }
  }
}
```

**Exemplo — Preparação de goleiros:**

```ts
ClubPiece {
  key: "goalkeeper_coaching"

  level: 82
  investment: 76
  quality: 84

  impacts: {
    currentSquad: {
      goalkeeperReflex: +5
      goalkeeperPositioning: +6
      goalkeeperPenaltySave: +3
    }
    youthGeneration: {
      goalkeeperPotential: +8
      chanceOfGoodGoalkeeper: +10
    }
    reputation: {
      goalkeeperFormation: +4
    }
  }
}
```

O mesmo princípio vale para o **staff**, modelado com estrutura comum e efeitos próprios por função:

```ts
StaffMember {
  role: string
  level: number
  specialty: string[]
  personality: Trait[]
  salary: number
  influence: InfluenceProfile
  developmentImpact: Effect[]
}
```

| Função | Áreas de efeito |
| --- | --- |
| Médico | lesão, recuperação, preservação de potencial |
| Nutricionista | maturação física, fadiga, recuperação |
| Psicólogo | pressão, estabilidade, resiliência |
| Preparador físico | resistência, força, velocidade, lesão |
| Preparador de goleiros | reflexo, posicionamento, saída de bola, safra de goleiros |

> **Princípio:** reaproveitar estrutura, individualizar valores. Mesma estrutura, controles individuais.

### Expectativa por peça

Investir numa peça **não é só positivo**: cada peça investida gera um tipo próprio de expectativa — e, portanto, de pressão. O princípio é **investimento cria pressão proporcional**.

| Peça investida | Tipo de expectativa gerada |
|---|---|
| Elenco caro | expectativa esportiva alta |
| Estádio novo | expectativa de público alto |
| Técnico famoso | expectativa tática alta |
| Base cara | expectativa de revelar jogadores |
| Patrocínio grande | expectativa comercial e de resultado |

Fluxo: investimento → melhora a peça → aumenta a expectativa → se o resultado vem, a reputação cresce; se não vem, a pressão cresce.

> Exemplo: um clube investe muito em jogadores. Se ganha, vira potência; se perde, mídia e torcida cobram mais do que cobrariam antes. Por isso a expectativa por peça conecta o [Club Growth System](#ciclos-temporada-e-crescimento-do-clube) ao `InstitutionalState` (expectativa, pressão).

Ver também: [`../01-game-design/04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md).

---

## Development System

A evolução de um jogador é calculada como um produto de fatores positivos menos penalidades, sempre limitada pelo potencial restante.

Forma conceitual:

```
Evolução =
  potencial disponível
  × qualidade do treino
  × compatibilidade jogador-clube
  × minutos jogados
  × idade
  × personalidade
  × suporte do clube
  × moral
  - lesões
  - fadiga
  - pressão negativa
  - má adaptação
```

Forma lógica:

```
developmentGain =
    baseLearningRate        // capacidade de aprendizado do jogador (fator próprio)
  * remainingPotential
  * trainingFocus           // foco do treino no atributo (fator próprio, distinto de trainingQuality)
  * trainingQuality
  * playerCompatibility
  * minutesFactor
  * ageFactor
  * personalityFactor
  * supportFactor
  * moraleFactor
  - injuryPenalty
  - pressurePenalty
  - fatiguePenalty
```

`baseLearningRate` (o quão rápido o jogador aprende) e `trainingFocus` (o quanto o treino aponta para aquele atributo) são fatores **distintos**: aprender rápido sem foco, ou focar muito num jogador que não aprende, resultam em ganho baixo. O cálculo roda **por atributo** — ex.: o ganho em passe usa o `trainingFocus` de passe e o `remainingPotential` técnico.

> **Pendência:** os intervalos numéricos, a normalização de cada fator e os pesos relativos devem ser definidos e centralizados no catálogo de fórmulas ([`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md)).

---

## Youth System: safra por soma de peças

Uma safra não é gerada por um "nível de base" único, e sim pela **soma das peças do clube**. História individual gera singularidade; estrutura do clube gera qualidade média; olheiros geram descoberta; staff gera desenvolvimento.

Fontes que compõem a safra:

```
Safra =
  olheiros + rede de captação + base + treinadores da base
  + preparador físico + preparador de goleiros + médico + fisioterapia
  + nutrição + psicologia + metodologia + CT + tecnologia
  + reputação formadora + atratividade do clube
```

Motor e produto:

```ts
YouthGenerationEngine {
  generateYouthClass(club: Club): YouthClass
}

YouthClass {
  season: number
  clubId: string

  quantity: number
  averageCurrentQuality: number
  averagePotential: number
  rareTalentChance: number

  physicalMaturity: number
  mentalMaturity: number
  tacticalMaturity: number
  technicalFoundation: number
  injuryRisk: number

  players: Player[]
}
```

### Geração individual do jogador

Cada jovem nasce com história própria. Fluxo de geração:

1. Gerar talento natural
2. Gerar nacionalidade/região
3. Gerar história familiar
4. Gerar condição social
5. Gerar acesso inicial ao futebol
6. Gerar personalidade base
7. Gerar corpo/genética
8. Gerar posição provável
9. Aplicar influência cultural/regional leve
10. Aplicar influência da estrutura do clube
11. Aplicar influência dos olheiros
12. Gerar atributos atuais
13. Gerar potencial natural
14. Gerar potencial aproveitável
15. Gerar traços ocultos
16. Gerar riscos
17. Gerar relatório do olheiro com incerteza

### Relatório de olheiro com incerteza

O jogador real tem dados ocultos; o olheiro só enxerga estimativas com intervalo de confiança que depende da qualidade da peça de scouting.

| Dado real | Olheiro ruim vê | Olheiro bom vê |
| --- | --- | --- |
| potencial 86 | 70–90 | 83–88 |
| disciplina 42 | desconhecida | preocupante |
| risco emocional 70 | baixo | moderado |

```ts
ScoutReport {
  playerId: string
  scoutId: string

  estimatedAttributes: Record<string, Range>
  estimatedPotential: Range
  confidence: number

  visibleTraits: string[]
  hiddenRisksDetected: string[]

  recommendation: "sign" | "monitor" | "avoid" | "loan"
}
```

Ver também: [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md).

---

## Match System

O motor de partida **não usa força geral única** — usa estados por **setor**. Cada time é representado por um `MatchTeamState`:

```
MatchTeamState
├── força ofensiva efetiva
├── força defensiva efetiva
├── força de meio-campo
├── força física
├── força mental
├── organização tática
├── pressão
├── confiança
├── fadiga
├── disciplina
└── apoio externo
```

Força efetiva de cada setor:

```
Força efetiva do setor =
    qualidade dos jogadores do setor
  + tática
  + moral
  + confiança
  + entrosamento
  + apoio
  - pressão
  - fadiga
  - desorganização
  - eventos negativos
```

Cascata típica dentro da partida:

```
Goleiro falhou
→ confiança defensiva cai
→ zagueiros ficam nervosos
→ saída de bola piora
→ adversário cria mais chances
```

### Fluxo completo da partida

1. **Pré-jogo** — calcula expectativa, pressão inicial, torcida, mídia, logística, condição física, escalação.
2. **Início** — força efetiva inicial por setor.
3. **Durante** — eventos acontecem; efeitos alteram estados; estados alteram probabilidades; placar altera pressão; torcida/mídia/diretoria reagem.
4. **Intervalo** — técnico ajusta; liderança atua; físico/médico avalia; moral muda.
5. **Segundo tempo** — fadiga pesa mais; pressão aumenta; substituições alteram setores.
6. **Pós-jogo** — resultado gera consequências; mídia e torcida reagem; reputação e moral mudam; **memórias são gravadas**.

Ver também: [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md).

---

## Ciclos: temporada e crescimento do clube

### Core loop da temporada

```
Temporada
├── Pré-temporada    → orçamento, investimentos, contratações, base, staff, expectativa
├── Ciclo semanal    → treino, recuperação, eventos externos, mídia, mercado, partida, pós-jogo
├── Janelas de mercado → compras, vendas, empréstimos, contratos, empresários
├── Datas FIFA       → convocações, vetos, fadiga, valorização, lesões
└── Fim da temporada → títulos, reputação, tradição, finanças, torcida, safras, evolução, planejamento
```

### Ciclo de crescimento do clube (com freios)

```
Investimento
→ melhora peças
→ melhora elenco/base/estrutura
→ melhora desempenho
→ gera resultados
→ aumenta reputação/torcida/receita
→ aumenta expectativa
→ aumenta pressão
→ exige melhor gestão
→ reinvestimento
```

O ciclo é permanente, mas possui **freios** para não virar bola de neve infinita: crescimento aumenta custo; sucesso aumenta pressão; jogadores valorizam e querem sair; seleções convocam mais; mídia cobra mais; torcida exige mais; salários sobem.

---

## Matriz Central de Impacto

Esta matriz deve existir no core como referência de quais **origens** afetam quais **alvos** (jogador, time, clube e futuro). Ela orienta a criação de eventos e efeitos.

| Origem | Jogador | Time | Clube | Futuro |
| --- | --- | --- | --- | --- |
| História de vida | traços, riscos, motivação | reação emocional | narrativa | carreira |
| Treino | atributos | força efetiva | reputação técnica | evolução |
| Staff | saúde, físico, mental | disponibilidade | estrutura | safras |
| Torcida | moral, pressão | mando de campo | receita | crescimento |
| Mídia | pressão, valor | crise/confiança | reputação | mercado |
| Diretoria | satisfação, contrato | estabilidade | investimento | crescimento |
| Estádio | lesão, ambiente | vantagem casa | receita | torcida |
| Seleção | valor, fadiga | desfalque | reputação | mercado |
| Mercado | moral, foco | elenco | finanças | planejamento |
| Títulos | confiança | moral | reputação/tradição | torcida |

---

## Estrutura Final do Core (~14 sistemas)

O core se organiza em sistemas cooperantes que reaproveitam a mesma base Entity–Component–Effect–Event.

```
Core do Jogo
├── Entity System       → tudo é entidade
├── Component System    → atributos, estados, traços, memória, relações
├── Effect System       → toda mudança passa por efeito
├── Event System        → eventos disparam efeitos e cascatas
├── Influence System    → torcida, mídia, diretoria, estádio, seleção, staff
├── Match System        → simulação da partida por estados e setores
├── Development System   → evolução de jogador, treino, potencial e carreira
├── Youth System        → safras, olheiros, base, história de vida
├── Club Growth System  → investimento, estrutura, torcida, reputação, tradição
├── Market System       → contratos, empresários, propostas, valor
├── Finance System      → receitas, despesas, orçamento, dívida
├── Memory System       → jogador e clube lembram eventos importantes
└── Narrative System    → transforma eventos e memórias em história
```

| # | Sistema | Responsabilidade |
| --- | --- | --- |
| 1 | Entity System | Tudo é entidade |
| 2 | Component System | Atributos, estados, traços, memória, relações |
| 3 | Effect System | Toda mudança passa por efeito |
| 4 | Event System | Eventos disparam efeitos e cascatas |
| 5 | Influence System | Torcida, mídia, diretoria, estádio, seleção, staff |
| 6 | Match System | Simulação da partida por estados e setores |
| 7 | Development System | Evolução de jogador, treino, potencial e carreira |
| 8 | Youth System | Safras, olheiros, base, história de vida |
| 9 | Club Growth System | Investimento, estrutura, torcida, reputação, tradição |
| 10 | Market System | Contratos, empresários, propostas, valor |
| 11 | Finance System | Receitas, despesas, orçamento, dívida |
| 12 | Memory System | Jogador e clube lembram eventos importantes |
| 13 | Narrative System | Transforma eventos e memórias em história |

> **Nota:** o material de origem lista 13 sistemas nomeados sob "Estrutura final do core". A referência a "~14 sistemas" inclui, de forma implícita, o **Reputação/Tradição** (citado entre os motores na abertura do desenho e absorvido pelo Club Growth System). O agrupamento pode ser refinado na consolidação técnica.

### Narrative System: exemplo de narrativa gerada

Como o Grinta quer jogadores únicos, cada evento e memória deveria alimentar uma **narrativa gerada** em texto — o `Narrative System` consome o `MemoryComponent` e a linha de eventos do jogador e produz prosa por atleta, aumentando a imersão.

> "Caio Andrade, criado pela mãe e revelado no futsal, chegou ao profissional como meia criativo, mas sentiu a pressão inicial. Após apoio do capitão e trabalho psicológico, virou titular e decidiu o clássico."

Cada frase da narrativa acima mapeia diretamente para memórias e eventos do core: origem/`LifeStory`, estado inicial de pressão, evento de apoio do capitão (`Relationship`) + suporte psicológico, e a memória de "decidiu o clássico".

---

## Regra de Ouro do projeto

> **Nada no jogo deve ser apenas número.**
> **Todo número deve ter origem, contexto, consequência e memória.**

Exemplo — moral baixa não é só `-10`. Ela **veio de**: derrota, vaia, pressão da mídia, contrato travado, convocação vetada, falha individual. E pode **gerar**: queda de desempenho, pedido de saída, crise no vestiário, necessidade de suporte psicológico, reação da torcida.

Essa regra é o teste que todo novo número/atributo/evento deve passar antes de entrar no core.

---

## Benefícios e resultado final

1. **Reaproveitamento lógico** — eventos, efeitos, componentes e estados servem para tudo.
2. **Controle individual** — cada jogador, staff, clube, torcida e peça tem valores próprios.
3. **Profundidade** — vida extra-campo, história, pressão, clube e carreira importam.
4. **Escalabilidade** — novos eventos entram sem quebrar o core.
5. **Simulação viva** — resultados geram consequências, consequências viram memória.
6. **Jogadores únicos** — cada atleta nasce diferente e evolui diferente.
7. **Clubes únicos** — cada clube cresce pela soma das peças, não por categoria fixa.

> Em uma frase: o core do jogo deve ser um **simulador de ecossistema futebolístico**, onde entidades possuem componentes, eventos geram efeitos, efeitos mudam estados, estados alteram decisões e partidas, e tudo deixa memória para moldar o futuro.

---

## Documentos relacionados

- Sistema de jogadores — [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md)
- Motor de partida — [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md)
- Estrutura do clube e staff — [`../01-game-design/04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md)
- Modelo de dados — [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md)
- Catálogo de regras e fórmulas — [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md)

> **Nota de contexto histórico:** o Grinta se inspira em managers de futebol online no estilo Brasfoot, mas amplia o modelo para jogadores únicos, mundo persistente e simulação de ecossistema. "Brasfoot" aparece aqui apenas como referência histórica.
