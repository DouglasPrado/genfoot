# Referência: Brasfoot e o ponto de partida do design

> **Status:** REFERÊNCIA HISTÓRICA · **Fontes:** chats/funcionamento-brasfoot.md · **Revisão:** 2026-07-10

> **Documento de REFERÊNCIA / contexto.** Este texto registra a inspiração histórica (o Brasfoot) e as primeiras ideias de design que surgiram no brainstorming do **Grinta**. Ele **não é a especificação canônica**. Sempre que houver conflito, valem o documento de modelo de dados e o documento do motor de partida, que são as fontes canônicas para jogador e simulação.

## Resumo

O **Grinta** é um manager de futebol online inspirado no Brasfoot: gestão por decisões, partidas simuladas em texto e um ciclo rápido e viciante de "pegar time pequeno e virar potência". Este documento descreve como o Brasfoot original funcionava, o que o Grinta herda e onde ele aprofunda — com destaque para o diferencial central: **cada jogador é único**. Também preserva, como esboço histórico, o primeiro modelo conceitual de jogador e de motor de partida por eventos que apareceu no brainstorming, além da arquitetura MVP e do roadmap em três versões propostos inicialmente.

## Sumário

1. [Como o Brasfoot original funcionava](#1-como-o-brasfoot-original-funcionava)
2. [O meio de jogo no Brasfoot](#2-o-meio-de-jogo-no-brasfoot)
3. [O que o Grinta herda e o que aprofunda](#3-o-que-o-grinta-herda-e-o-que-aprofunda)
4. [Esboço inicial: modelo de jogador](#4-esboço-inicial-modelo-de-jogador)
5. [Esboço inicial: motor de partida por eventos](#5-esboço-inicial-motor-de-partida-por-eventos)
6. [Arquitetura MVP proposta (visão inicial)](#6-arquitetura-mvp-proposta-visão-inicial)
7. [Roadmap em 3 versões (visão inicial)](#7-roadmap-em-3-versões-visão-inicial)
8. [O diferencial: histórias emergentes](#8-o-diferencial-histórias-emergentes)

---

## 1. Como o Brasfoot original funcionava

O Brasfoot foi lançado em 2003, inspirado em jogos como o Elifoot, e ficou popular no Brasil por ser leve, rápido e simples. Era um **manager textual**: sem partida 3D, sem controle direto dos jogadores. O usuário atuava como técnico/presidente e tomava decisões **antes** dos jogos.

O ciclo do jogo era composto por sete blocos:

### 1.1 Elenco

Cada jogador tinha: posição, idade, força/nível, salário, valor de mercado e características (finalização, velocidade, marcação, cabeceio etc.). A **força** era um dos fatores principais; jogadores mais velhos perdiam desempenho com o tempo. Era possível escalar titulares, reservas e improvisar atletas em outras posições.

### 1.2 Tática

Antes da partida definia-se: formação (4-4-2, 3-5-2, 4-3-3 etc.), estilo de jogo, escalação, substituições, capitão, batedores e postura (mais ofensiva ou defensiva, conforme a versão). O jogo não era visual: simulava o resultado com base em força do time, tática, mando de campo, condição dos jogadores, características e um fator aleatório.

### 1.3 Partidas

A partida era simulada rapidamente, com lances em texto (gols, cartões, lesões, substituições). Dava para acompanhar lance a lance ou acelerar. O foco estava na gestão, não no controle dos jogadores.

### 1.4 Competições

Campeonatos nacionais, estaduais, copas, competições internacionais e seleções, conforme a versão. No Brasil: estadual, Copa do Brasil, Brasileirão, Libertadores etc.

### 1.5 Mercado de transferências

Comprar e vender jogadores, renovar contratos, contratar atletas livres, procurar promessas e montar elenco com jogadores reais ou editados. Um dos pontos mais divertidos: garimpar jogador barato, subir de divisão e vender caro.

### 1.6 Finanças

Administração do dinheiro do clube: salários, compra e venda de jogadores, bilheteria, preço do ingresso, estádio, premiações e, em versões mais novas, patrocínio/sócio torcedor. Gestão ruim quebrava o clube; gestão boa permitia crescer estádio, melhorar elenco e enfrentar times maiores.

### 1.7 Carreira do técnico

O técnico não ficava preso a um clube: indo bem, recebia propostas de times maiores; indo mal, podia ser demitido.

### 1.8 O coração do jogo

> pegar time pequeno → montar elenco barato → ganhar jogos → subir divisão → ganhar dinheiro → contratar melhor → virar potência.

O apelo vinha da **velocidade e simplicidade**: em poucos minutos era possível jogar várias rodadas ou uma temporada inteira, com sensação constante de evolução — "gestão com cara de planilha, mas com emoção de futebol".

---

## 2. O meio de jogo no Brasfoot

Durante a partida o jogo era limitado, mas oferecia decisões importantes:

- **Acompanhar os lances em texto** (ataques, gols, cartões, lesões, chances perdidas, substituições), sem gráficos.
- **Pausar / abrir a tela de substituições** (Enter ou Espaço em algumas versões) e mudar a velocidade da simulação (teclas F1–F5, conforme a versão).
- **Fazer substituições** — trocar jogador cansado, machucado, com cartão ou mal posicionado; energia/condição física influenciavam o desempenho.
- **Ajustar formação/tática** — mexer na formação, mudar posições e alterar a postura (equilibrado, ofensivo, defensivo).
- **Reagir ao placar:**
  - perdendo: mais atacantes, subir meias, jogar ofensivo;
  - ganhando: reforçar defesa, colocar volante/zagueiro, poupar jogador;
  - empate fora de casa: manter equilibrado;
  - jogador expulso: recompor o setor afetado.

O usuário **não** controlava passe, chute, drible ou marcação individual em tempo real. Interferia como técnico: escalação, substituição, postura e organização.

---

## 3. O que o Grinta herda e o que aprofunda

### 3.1 Herança direta do Brasfoot

- Manager textual, sem controle em tempo real dos jogadores.
- Ciclo elenco → tática → partida simulada → competições → mercado → finanças → carreira.
- Partida rápida em texto, com opção de acelerar.
- Sensação de evolução constante e progressão "time pequeno → potência".

### 3.2 Onde o Grinta aprofunda — "cada jogador é único"

O diferencial central do Grinta em relação ao Brasfoot é que **cada jogador não é apenas "força 80"**: possui identidade própria, com **personalidade, atributos ocultos, histórico e evolução**. Dois atacantes com a mesma força podem ser completamente diferentes:

- um é decisivo, ambicioso, mas indisciplinado;
- outro é regular, leal, mas sente pressão em jogo grande;
- outro evolui rápido, mas se machuca muito;
- outro joga bem só em casa ou contra times fracos.

Enquanto o Brasfoot era viciante pela velocidade, o Grinta busca ser viciante pelas **histórias emergentes** geradas por jogadores únicos (ver seção 8).

---

## 4. Esboço inicial: modelo de jogador

> **Esboço histórico.** O trecho abaixo é o **primeiro rascunho conceitual** de jogador que surgiu no brainstorming. Está preservado como registro da origem do design. A versão **canônica** de atributos, personalidade, campos ocultos e histórico está no **documento de modelo de dados** — consulte-o para a estrutura oficial.

Ideia central: separar o jogador em blocos, sendo `personality`, `hidden` e `history` os responsáveis por dar a sensação de unicidade.

```ts
type Player = {
  id: string
  name: string
  nationality: string
  age: number
  position: 'GK' | 'CB' | 'LB' | 'RB' | 'DM' | 'CM' | 'AM' | 'LW' | 'RW' | 'ST'

  attributes: {
    finishing: number
    passing: number
    marking: number
    tackling: number
    pace: number
    stamina: number
    strength: number
    heading: number
    technique: number
    vision: number
    goalkeeper?: number
  }

  personality: {
    ambition: number
    loyalty: number
    discipline: number
    pressure: number
    professionalism: number
    temperament: number
  }

  hidden: {
    potential: number
    consistency: number
    injuryProneness: number
    growthRate: number
  }

  condition: {
    fitness: number
    morale: number
    fatigue: number
    injured: boolean
    suspended: boolean
  }

  contract: {
    clubId: string
    salary: number
    value: number
    expiresAt: Date
  }

  history: PlayerSeasonHistory[]
}
```

### 4.1 Força por contexto

Em vez de força fixa, a força do jogador é calculada conforme a situação (condição física, moral, importância do jogo, consistência, idade, aleatoriedade controlada). Assim, um atacante com 90 de finalização pode render mal se estiver cansado e com moral baixa.

```ts
function calculatePlayerMatchRating(player: Player, match: MatchContext) {
  let rating = getBaseRatingByPosition(player)

  rating *= player.condition.fitness / 100
  rating *= player.condition.morale / 100

  if (match.isFinal) {
    rating *= 0.9 + player.personality.pressure / 1000
  }

  if (player.hidden.consistency < 50) {
    rating *= randomBetween(0.85, 1.10)
  }

  if (player.age > 34) {
    rating *= 0.95
  }

  return rating
}
```

### 4.2 Traits (assinatura do jogador)

Cada jogador poderia ter uma "assinatura" via traits que alteram seu comportamento:

`decisive`, `injury_prone`, `leader`, `hot_head`, `big_game_player`, `inconsistent`, `loyal`, `mercenary`, `late_bloomer`, `wonderkid`, `clutch_finisher`, `free_kick_specialist`.

Exemplos de efeito: jogador decisivo ganha bônus após os 75'; jogador que sente pressão perde rendimento em finais; jogador indisciplinado aumenta chance de cartão; jogador leal aceita renovação mais facilmente. Multiplicadores conceituais esboçados:

```ts
// decisivo no fim do jogo
if (player.traits.includes('decisive') && match.minute > 75) playerRating *= 1.08

// sente pressão em final
if (match.isFinal && player.personality.pressure < 40) playerRating *= 0.92

// indisciplinado (temperamento baixo)
if (player.personality.temperament < 35) {
  yellowCardChance *= 1.4
  redCardChance *= 1.2
}

// leal aceita renovar mais fácil
if (player.personality.loyalty > 80) chanceToAcceptRenewal *= 1.3
```

### 4.3 Evolução e carreira

Ao final de cada partida os jogadores são atualizados (fadiga, moral, chance de evolução conforme `growthRate` × profissionalismo × minutos jogados). Jovens evoluem mais; veteranos perdem atributos físicos. Fases previstas: `wonderkid`, `developing`, `prime`, `declining`, `veteran`.

```ts
function updatePlayerAfterMatch(player: Player, performance: MatchPerformance) {
  player.condition.fatigue += performance.minutesPlayed * 0.4

  if (performance.rating > 7.5) player.condition.morale += 3
  if (performance.rating < 5.5) player.condition.morale -= 2

  const growthChance =
    player.hidden.growthRate *
    player.personality.professionalism *
    performance.minutesPlayed

  if (growthChance > randomBetween(0, 10000)) improveRandomAttribute(player)
}
```

A idade modula a evolução: jovens têm multiplicador de crescimento maior e veteranos sofrem declínio físico acelerado.

```ts
if (player.age < 24) {
  growthMultiplier = 1.3
} else if (player.age > 32) {
  physicalDeclineMultiplier = 1.2
}
```

---

## 5. Esboço inicial: motor de partida por eventos

> **Esboço histórico.** Primeiro rascunho do motor de simulação surgido no brainstorming. A especificação **canônica** do motor de partida (fluxo, cálculos, tipos de evento e retorno) está no **documento do motor de partida** — este bloco serve apenas de contexto.

Ideia: começar simples, com um motor **por eventos**. A partida tem 90 minutos e, a cada minuto, o sistema decide se algo acontece.

```ts
for (let minute = 1; minute <= 90; minute++) {
  const eventChance = calculateEventChance(homeTeam, awayTeam, minute)

  if (Math.random() < eventChance) {
    const event = generateMatchEvent(homeTeam, awayTeam, minute)
    match.events.push(event)
  }
}
```

Eventos possíveis:

```ts
type MatchEvent =
  | { type: 'shot'; teamId: string; playerId: string; minute: number }
  | { type: 'goal'; teamId: string; playerId: string; assistId?: string; minute: number }
  | { type: 'yellow_card'; playerId: string; minute: number }
  | { type: 'red_card'; playerId: string; minute: number }
  | { type: 'injury'; playerId: string; minute: number }
  | { type: 'substitution'; teamId: string; playerOutId: string; playerInId: string; minute: number }
```

Fórmula conceitual dos eventos:

> Força do time + formação + moral + mando de campo + cansaço + estilo tático + atributos individuais + aleatoriedade controlada = eventos da partida

Forças de ataque e defesa são calculadas por setor e comparadas (ataque de um time contra defesa do outro):

```ts
function calculateTeamAttackStrength(team: TeamLineup) {
  return (
    team.attackersAverage * 0.45 +
    team.midfieldAverage * 0.35 +
    team.fullbacksSupport * 0.10 +
    team.morale * 0.10
  )
}

function calculateTeamDefenseStrength(team: TeamLineup) {
  return (
    team.defendersAverage * 0.50 +
    team.defensiveMidfieldAverage * 0.25 +
    team.goalkeeperRating * 0.20 +
    team.tacticalBalance * 0.05
  )
}
```

### 5.1 Assinatura de simulação (esboço)

O motor foi imaginado como um pacote isolado (`packages/match-engine`), testável sem depender da tela:

```ts
const result = simulateMatch({
  homeTeam, awayTeam, homeLineup, awayLineup,
  tactics, competition, weather, importance: 'final'
})
```

Retorno esperado (esboço): `score`, `events`, `stats` (posse, chutes, chutes no gol, faltas, escanteios) e `playerRatings`.

### 5.2 Exemplo de partida em texto

```
12' - João Prado arriscou de fora da área, mas o goleiro defendeu.
28' - Cartão amarelo para Marcos Rocha por falta dura.
41' - GOL! Pedro Lima recebeu lançamento e bateu cruzado.
Intervalo: Monte Alto FC 1 x 0 União Central

63' - União Central pressiona mais depois da substituição.
76' - GOL! Rafael Torres aproveitou rebote na área.
88' - Incrível! João Prado perdeu chance clara no fim.
Fim de jogo: Monte Alto FC 1 x 1 União Central
```

Por trás de cada lance há um cálculo: quem ataca, qual setor criou a jogada, qual jogador participa, qual atributo foi usado, qual a chance de virar gol e qual goleiro defende.

---

## 6. Arquitetura MVP proposta (visão inicial)

> **Visão inicial / não canônica.** Sugestão de arquitetura levantada no brainstorming. A stack e a estrutura definitivas devem ser confirmadas nos documentos de arquitetura.

Estrutura de pastas sugerida:

```
apps/
  web/    → Next.js (telas: elenco, escalação, partida, mercado, competições)
  api/    → Node.js / NestJS ou AdonisJS
           (Match Engine, Player Engine, Transfer Engine, Finance Engine, Competition Engine)

packages/
  core/       → regras do jogo, cálculos, simulação
  database/   → Prisma, models
  shared/     → types, DTOs
```

Tabelas de banco previstas:

| Tabela | Conteúdo |
| --- | --- |
| `clubs` | Clubes |
| `players` | Jogadores únicos |
| `contracts` | Contratos |
| `matches` | Partidas |
| `match_events` | Eventos de partida |
| `competitions` | Competições |
| `seasons` | Temporadas |
| `transfers` | Transferências |
| `lineups` | Escalações |
| `player_histories` | Histórico dos jogadores |
| `team_finances` | Finanças dos clubes |

Sugestão técnica levantada: Next.js 15, NestJS ou AdonisJS, PostgreSQL, Prisma e Redis/BullMQ para simulações longas — com o match engine em pacote separado (`packages/match-engine`) para permitir teste isolado.

> **Resolvido (Série R — R-77):** stack canônica definida — **NestJS + TypeScript** (ver [`../02-tecnico/00-arquitetura-geral.md`](../02-tecnico/00-arquitetura-geral.md), [modelo de dados](../02-tecnico/02-modelo-de-dados.md), [motor de partida](../01-game-design/05-motor-de-partida.md)). AdonisJS descartado.

---

## 7. Roadmap em 3 versões (visão inicial)

> **Visão inicial.** Sequência de entregas sugerida no brainstorming ("não começar complexo demais"). Priorização definitiva a validar no planejamento de produto.

| Versão | Escopo |
| --- | --- |
| **V1** | Criar clubes; criar jogadores únicos; montar escalação; simular partida; gerar eventos em texto; salvar estatísticas; campeonato de pontos corridos. |
| **V2** | Transferências; contratos; salários; moral; lesões; cartões; evolução dos jogadores. |
| **V3** | Personalidade; traits; categorias de base; olheiros; propostas de outros clubes; mídia/notícias; rivalidade; finais e jogos grandes. |

Princípio orientador do MVP:

> jogador → time → escalação → simular partida → gerar texto → salvar estatísticas.

E, depois, "adicionar alma": personalidade, evolução, moral, imprensa, mercado e história.

---

## 8. O diferencial: histórias emergentes

O Brasfoot era viciante pela velocidade. O Grinta pretende ser viciante por outro motivo: **histórias geradas por jogadores únicos**. Exemplos de arcos que o sistema deveria fazer emergir:

- promessa que vira ídolo;
- atacante caro que não rende;
- goleiro que cresce em mata-mata;
- jogador que força saída;
- veterano que lidera o elenco;
- lateral comum que vira capitão;
- jogador indisciplinado que decide e é expulso;
- garoto da base vendido por milhões.

Mecânica principal:

> Jogador único + personalidade + evolução + decisões do técnico + partidas simuladas = histórias emergentes

O jogador passa a ser lembrado não só pela força, mas pelo comportamento: "esse é bom, mas pipoca em final"; "esse volante toma muito cartão"; "esse meia é velho, mas decide jogo grande"; "esse garoto começou fraco, mas evolui rápido". É isso que dá **alma** ao Grinta.
