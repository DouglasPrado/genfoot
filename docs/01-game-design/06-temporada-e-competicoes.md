# Temporada e Competições

> **Status:** Rascunho consolidado · **Fontes:** chats/campeonatos-fim-de-temporadas.md, chats/escopo-definitivo-simulador.md, chats/documento-definitivo-escopo.md · **Revisão:** 2026-07-11

A temporada é o **relógio principal** do core do **Grinta**. Ela organiza calendário, evolução dos jogadores, finanças, reputação, mercado, torcida e diretoria, e — ao virar — **recalcula o mundo do jogo**. Não serve apenas para "passar o ano": é um ciclo de causa e consequência em que o mundo reage ao que aconteceu.

Este documento define a temporada e suas fases, os campeonatos como entidades independentes sobre uma base comum, o modelo de arquitetura em 3 camadas e o motor de virada de temporada (checklist de ~20 passos), além de premiações, histórico, promoção/rebaixamento e aposentadorias.

> **Nota de ligação:** a arquitetura multiplayer/online (mundos, servidores, divisões por número de usuários, clubes com dono, IA/bots e rodadas assíncronas) é tratada em [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md). Este documento cobre apenas o core de temporada e competições.

## Sumário

1. [A temporada como ciclo principal](#1-a-temporada-como-ciclo-principal)
2. [Campeonatos como entidades independentes](#2-campeonatos-como-entidades-independentes)
3. [Modelo em 3 camadas](#3-modelo-em-3-camadas)
4. [Calendário da temporada](#4-calendário-da-temporada)
5. [Impacto dos campeonatos no jogador](#5-impacto-dos-campeonatos-no-jogador)
6. [Fim de temporada: o motor de virada (checklist de ~20 passos)](#6-fim-de-temporada-o-motor-de-virada-checklist-de-20-passos)
7. [Sistema de premiações](#7-sistema-de-premiações)
8. [Histórico permanente](#8-histórico-permanente)
9. [Promoção, rebaixamento e reputação dos clubes](#9-promoção-rebaixamento-e-reputação-dos-clubes)
10. [Aposentadorias e reaproveitamento de personagens](#10-aposentadorias-e-reaproveitamento-de-personagens)
11. [Nova temporada: objetivos e narrativa](#11-nova-temporada-objetivos-e-narrativa)
12. [Exemplos práticos](#12-exemplos-práticos)
13. [Equilíbrio competitivo para clubes novos](#13-equilíbrio-competitivo-para-clubes-novos)
14. [Homologação e transição entre temporadas](#14-homologação-e-transição-entre-temporadas)
15. [Licenciamento e inscrição de jogadores](#15-licenciamento-e-inscrição-de-jogadores)

---

## 1. A temporada como ciclo principal

A temporada é dividida em **7 fases**. Cada fase destrava tipos diferentes de eventos.

```
Pré-temporada
   ↓
Início dos campeonatos
   ↓
Meio da temporada
   ↓
Reta final
   ↓
Fim da temporada
   ↓
Pós-temporada / transição
   ↓
Nova temporada
```

### Fase × tipos de evento destravados

| Fase | O que acontece / eventos destravados |
| --- | --- |
| **Pré-temporada** | Amistosos, montagem do elenco, inscrições, objetivos da diretoria |
| **Início** | Adaptação dos jogadores, primeiras pressões, entrosamento |
| **Meio** | Lesões, convocações, crise, mercado, desgaste |
| **Reta final** | Pressão por título, briga contra rebaixamento, moral instável |
| **Fim** | Premiações, aposentadorias, renovações, balanço financeiro |
| **Pós-temporada** | Férias, evolução, regressão, base, olheiros, mudanças de clubes |
| **Nova temporada** | Briefing/contexto da temporada, novas expectativas de diretoria e torcida |

Princípios do ciclo:

- **Temporada** = ciclo de causa e consequência.
- **Campeonatos** = palco dos acontecimentos.
- **Jogadores** = personagens vivos.
- **Clubes** = instituições com memória.
- **Fim de temporada** = julgamento e transformação do mundo.

A transição entre fases é **dirigida por marcos do calendário** (§4), não por número fixo de dias. Cada fase é um estado (`SeasonPhase`) com gatilhos de entrada e saída ancorados em datas do `SeasonCalendar`:

```
SeasonPhase {
  phase: "preseason" | "start" | "mid" | "runIn" | "end" | "postseason" | "newSeason"
  startTrigger    // marco que abre a fase
  endTrigger      // marco que encerra a fase
  unlockedEvents  // tipos de evento destravados (tabela acima)
}
```

Critérios de transição (estrutura): **Pré-temporada → Início** na 1ª rodada oficial; **Início → Meio** ao completar o 1º terço das rodadas; **Meio → Reta final** ao entrar no último terço; **Reta final → Fim** na última rodada; **Fim → Pós-temporada** quando o motor de virada (§6) conclui o encerramento esportivo; **Pós-temporada → Nova temporada** ao gerar o calendário seguinte (passo 18 do checklist).

> **Recomendação (a ratificar — R-58):** parametrizar a **duração de cada fase** por frações da temporada, não por número absoluto de datas (para acomodar ligas de tamanhos diferentes). Proposta de 1ª passada: pré-temporada ≈ 3–5 datas; **Início** = primeiros ~33% das rodadas; **Meio** = ~34–66%; **Reta final** = últimos ~33%; **Fim** = da última rodada até a homologação (§14.1); **Pós-temporada** = janela fixa de ~2–4 semanas virtuais de férias/evolução. Racional: frações mantêm o ritmo narrativo (adaptação → crise → decisão) em ligas de 12 a 24 clubes sem recalibrar por competição; os limites exatos são valor de balanceamento a calibrar em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

---

## 2. Campeonatos como entidades independentes

Cada campeonato tem sua própria lógica, mas usa uma **estrutura comum**. Assim é possível criar campeonatos diferentes sem reescrever o sistema inteiro.

```
Championship {
  id
  name
  country
  type
  seasonId
  teams
  rules
  calendar
  table
  awards
  reputationWeight
  financialWeight
}
```

### Tipos de campeonato

| Tipo | Exemplo (referência histórica) |
| --- | --- |
| Liga nacional | Brasileirão, Premier League |
| Copa eliminatória | Copa do Brasil |
| Estadual / regional | Paulistão, Carioca |
| Continental | Libertadores, Champions |
| Mundial | Mundial de Clubes |
| Seleções | Copa do Mundo, Copa América |
| Base | Sub-20, Sub-17 |
| Amistosos | Pré-temporada |

O importante é que **todos usem a mesma base**, com regras diferentes.

### Regras individuais por campeonato

Cada campeonato tem um objeto de regras próprio:

```
ChampionshipRules {
  format: "league" | "knockout" | "groups_knockout" | "mixed"
  pointsWin
  pointsDraw
  legs
  awayGoalRule
  extraTime
  penalties
  promotionSlots
  relegationSlots
  continentalQualificationSlots
  squadRegistrationLimit
  foreignPlayerLimit
  ageLimit
  prizeRules
}
```

**Exemplo — Liga nacional (formato Brasileirão):**

```
{
  format: "league",
  pointsWin: 3,
  pointsDraw: 1,
  relegationSlots: 4,
  continentalQualificationSlots: 6
}
```

**Exemplo — Copa nacional eliminatória (formato Copa do Brasil):**

```
{
  format: "knockout",
  legs: 2,
  extraTime: false,
  penalties: true,
  prizeRules: "per_round"
}
```

Os **critérios de desempate** são parte da estrutura de regras de cada campeonato: `ChampionshipRules` (§2) ganha um campo ordenado `tiebreakers` — lista aplicada em sequência até desempatar, com o conjunto de referência **pontos → nº de vitórias → saldo de gols → gols marcados → confronto direto → cartões (fair play) → sorteio**. Cada campeonato pode reordenar ou omitir critérios no seu regulamento; a ordem declarada é o que a homologação (§14.1) usa para fechar a tabela.

> **Recomendação (a ratificar — R-59):** fixar `reputationWeight` e `financialWeight` (0–1) por tipo de campeonato, definindo quanto cada competição move a reputação (clube/jogador) e a receita ao virar a temporada. Proposta de 1ª passada: Mundial `rep 1,00 / fin 0,90`; Continental `0,85 / 0,85`; Liga nacional (elite) `0,70 / 1,00`; Copa nacional `0,55 / 0,70`; Estadual/regional `0,30 / 0,35`; Base `0,20 / 0,10`; Amistosos `0,05 / 0,15`. Racional: a liga nacional domina a **receita** recorrente, enquanto continental/mundial dominam o **prestígio**; os valores são de balanceamento e devem ser calibrados em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

### Geração das competições no início da temporada

Ao abrir uma temporada, o mundo monta suas competições de forma sistemática:

```
generateSeason(worldId) {
  createLeagues()
  assignClubsToDivisions()
  createNationalCup()
  createContinentalCups()
  generateCalendar()
  generateBoardExpectations()
  openPreSeason()
}
```

Cada formato tem sua própria rotina de montagem:

- **Liga** — turno e returno (round-robin com mando ida/volta), rodadas distribuídas evitando muitos jogos em casa seguidos e, quando necessário, evitando clássicos no mesmo dia.
- **Copa** — clubes semeados por reputação (cabeças de chave), sorteio de confrontos e criação das rodadas eliminatórias.
- **Continental** — grupos formados por sorteio em potes, jogos de grupo e depois o mata-mata.

### Regras de qualificação entre competições

Quem entra em cada campeonato é decidido por rankings e classificações, não por lista fixa:

- **Liga** — depende da divisão atual do clube.
- **Copa Nacional** — todos os clubes do país.
- **Continental** — os melhores da divisão principal.
- **Mundial** — campeões continentais.
- **Base** — clubes com categoria de base ativa.

A ligação entre uma competição e outra é modelada por uma regra de qualificação:

```
QualificationRule {
  competitionId
  sourceCompetitionId
  criteria: "top_positions" | "champion" | "cup_winner"
  slots
}
```

**Exemplo prático:** os 6 primeiros da Série A vão para a Libertadores; do 7º ao 12º vão para a Sul-Americana; o campeão da Copa Nacional também garante vaga na Libertadores; os 4 últimos caem para a Série B.

---

## 3. Modelo em 3 camadas

O sistema é organizado em três camadas. A Camada 1 mantém o jogo organizado, a Camada 2 dá variedade e a Camada 3 torna cada save único.

### Camada 1 — Sistema universal

Serve para qualquer campeonato:

- Calendário
- Tabela
- Partidas
- Regras (motor genérico)
- Pontuação
- Premiações
- Histórico

### Camada 2 — Regras específicas

Cada competição altera o comportamento da Camada 1:

- Pontos corridos
- Mata-mata
- Grupos
- Ida e volta
- Rebaixamento
- Classificação (continental / promoção)
- Limite de estrangeiros
- Inscrição de elenco

### Camada 3 — Impacto narrativo

Aqui entra a "alma" do jogo — o que diferencia cada partida e cada save:

- Pressão
- Torcida
- Diretoria
- Moral
- Vida pessoal
- Traumas
- Ambição
- Rivalidade
- Ídolos
- Imprensa
- Mercado

---

## 4. Calendário da temporada

O calendário é **gerado no início da temporada**, mas pode sofrer mudanças durante o ciclo.

```
SeasonCalendar {
  seasonId
  year
  startDate
  endDate
  matchdays
  transferWindows
  nationalTeamDates
  restPeriods
  youthIntakeDate
  awardsDate
}
```

Cada data do calendário pode conter eventos:

```
CalendarDay {
  date
  matches
  training
  travel
  pressEvents
  boardEvents
  playerEvents
}
```

Como cada jogador do **Grinta** é único, o calendário não é só jogo: ele afeta vida, moral, desgaste, família, foco e evolução.

---

## 5. Impacto dos campeonatos no jogador

Cada campeonato impacta o jogador de forma diferente. Um jovem no estadual pode ganhar confiança; um veterano na Libertadores pode sentir pressão; um jogador de origem pobre que chegou ao profissional pode sentir muito o peso de um clássico; um jogador emocionalmente instável pode cair de rendimento na reta final.

```
PlayerChampionshipImpact {
  pressure
  visibility
  fatigue
  confidenceGain
  reputationGain
  marketValueMultiplier
  nationalTeamVisibility
}
```

| Competição | Pressão | Visibilidade | Evolução |
| --- | --- | --- | --- |
| Estadual | Média | Baixa / Média | Boa para jovens |
| Liga nacional | Alta | Alta | Evolução consistente |
| Copa nacional | Alta | Média | Impacto por mata-mata |
| Libertadores (continental) | Muito alta | Muito alta | Aumenta reputação |
| Mundial | Extrema | Extrema | Muda a carreira |
| Base | Baixa / Média | Média | Formação técnica |

---

## 6. Fim de temporada: o motor de virada (checklist de ~20 passos)

O fim de temporada é um dos momentos mais importantes do jogo — o **"motor de virada de temporada"**. Não deve ser apenas avançar ano, atualizar idade e gerar tabela nova; deve fazer o **mundo reagir ao que aconteceu**.

### Checklist de execução

| # | Passo | Grupo |
| --- | --- | --- |
| 1 | Encerrar partidas pendentes | Encerramento esportivo |
| 2 | Fechar tabelas dos campeonatos | Encerramento esportivo |
| 3 | Definir campeões, rebaixados e classificados | Encerramento esportivo |
| 4 | Distribuir premiações | Premiações |
| 5 | Atualizar reputação de clubes | Reputações |
| 6 | Atualizar reputação de jogadores | Reputações |
| 7 | Calcular evolução / regressão dos jogadores | Evolução |
| 8 | Processar eventos pessoais | Vida extra-campo |
| 9 | Processar lesões de longo prazo | Vida extra-campo |
| 10 | Processar aposentadorias | Transição de carreira |
| 11 | Atualizar contratos | Contratos |
| 12 | Atualizar mercado da bola | Mercado |
| 13 | Gerar interesse de clubes | Mercado |
| 14 | Atualizar finanças dos clubes | Finanças |
| 15 | Atualizar objetivos da diretoria | Diretoria |
| 16 | Promover jogadores da base | Base |
| 17 | Gerar novos jogadores por olheiros / base | Base |
| 18 | Montar calendário da nova temporada | Nova temporada |
| 19 | Definir expectativas da nova temporada | Nova temporada |
| 20 | Iniciar nova temporada | Nova temporada |

### 6.1. Encerrar campeonatos

O jogo calcula campeões, vice-campeões, rebaixados, promovidos, classificados para torneios continentais, artilheiros, melhores jogadores, melhores jovens, melhores técnicos e maiores decepções. Isso alimenta reputação, torcida, imprensa, mercado e moral.

```
SeasonResult {
  champion
  runnerUp
  relegatedTeams
  promotedTeams
  qualifiedTeams
  topScorer
  bestPlayer
  bestYoungPlayer
  bestCoach
}
```

### 6.2. Avaliação da diretoria

A diretoria avalia o técnico com base nos objetivos (posição esperada vs. real, fase de copa esperada vs. real, saúde financeira, desenvolvimento do elenco, satisfação da torcida).

```
BoardEvaluation {
  expectedLeaguePosition
  actualLeaguePosition
  expectedCupRound
  actualCupRound
  financialHealth
  squadDevelopment
  fanSatisfaction
  boardPatience
  finalGrade
}
```

| Situação | Efeito |
| --- | --- |
| Ganhou título inesperado | Aumenta moral, orçamento e reputação |
| Ficou abaixo do esperado | Pressão e risco de demissão |
| Revelou jovens | Diretoria valoriza o projeto |
| Estourou orçamento | Diretoria reduz verba |
| Foi rebaixado | Demissão quase certa |
| Salvou time fraco | Aumenta reputação do técnico |

A avaliação pode gerar decisões narrativas mistas (ex.: *"A diretoria ficou satisfeita com o desempenho esportivo, mas preocupada com a folha salarial"*).

### 6.3. Avaliação da torcida

A torcida **não** avalia igual à diretoria: a diretoria olha finanças e metas; a torcida olha emoção, rivalidade, títulos e ídolos.

```
FanEvaluation {
  titleExpectation
  derbyResults
  idolPerformance
  attackingStyle
  relegationFear
  finalMood
}
```

| Evento | Impacto na torcida |
| --- | --- |
| Ganhou clássico | Sobe moral |
| Perdeu clássico decisivo | Revolta |
| Vendeu ídolo | Queda de confiança |
| Revelou promessa | Esperança |
| Jogou feio mas ganhou | Torcida dividida |
| Caiu de divisão | Crise |

Pode gerar eventos: torcida protesta no CT, torcida faz festa para o elenco, ídolo é vaiado, promessa vira xodó.

### 6.4. Evolução e regressão dos jogadores

No fim da temporada, cada jogador passa por uma avaliação individual — **não** deve ser apenas "+2 de overall". Fatores considerados: idade, minutos jogados, qualidade dos treinos, nível dos campeonatos, pressão enfrentada, lesões, moral, personalidade, história de vida, relação com técnico, ambiente familiar, disciplina, foco e potencial.

```
PlayerSeasonDevelopment {
  technicalGrowth
  physicalGrowth
  mentalGrowth
  tacticalGrowth
  reputationGrowth
  personalityChange
  injuryPenalty
  ageDecline
}
```

A evolução é **multidimensional** e pode ser mista:

- Jogador que jogou muito mas sofreu pressão demais: `+Finalização +Posicionamento +Experiência −Controle emocional`.
- Jovem reserva: pode não evoluir em campo, mas evoluir em treino: `+Técnica +Disciplina −Ritmo de jogo`.
- Veterano: perde físico, ganha liderança: `−Velocidade −Resistência +Liderança +Leitura de jogo`.

> **Recomendação (a ratificar — R-60):** calcular a variação de cada dimensão de `PlayerSeasonDevelopment` como `Δdimensão = base(idade) + Σ(fator_i · peso_i)`, aplicada por dimensão (técnica, física, mental, tática). **Base etária** (curva de maturação/declínio): `≤ 21` → `+2`; `22–28` → `+0,5`; `29–31` → `0`; `32–34` → `−1,5`; `≥ 35` → `−3` (o físico declina antes do mental). **Fatores e pesos de 1ª passada** (cada fator normalizado 0–1, somado à base e arredondado): minutos jogados ×2,0 · qualidade de treino ×1,5 · nível dos campeonatos ×1,2 · potencial restante ×1,5 · moral/foco ×0,8 · pressão suportada ×0,6 (negativa se excedeu o limite mental) · disciplina/personalidade ×0,7 · penalidade por lesão `−(diasParado/30)` · relação com o técnico ×0,5. O ganho por dimensão é saturado em `[−4, +4]` por temporada, e a evolução permanece **multidimensional** (uma dimensão sobe enquanto outra cai). Racional: reproduz os três exemplos mistos da seção (jovem que evolui no treino, titular pressionado, veterano em declínio físico com ganho mental) sem virar "+2 de overall"; os pesos e a curva etária são valor de balanceamento a calibrar em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

### 6.5. Vida extra-campo no fim da temporada

No fim da temporada, a vida do jogador avança. Exemplos: casa, separa, nasce filho, problema familiar, mudança de cidade, problemas financeiros, melhora de condição social, perde familiar, envolve-se em polêmica, muda de empresário, começa projeto social, volta para a cidade natal nas férias.

```
OffFieldSeasonEvent {
  playerId
  eventType
  emotionalImpact
  disciplineImpact
  ambitionImpact
  moraleImpact
  duration
}
```

Esses eventos alteram moral, foco, ambição, disciplina, lealdade ao clube, vontade de sair, estabilidade emocional e relação com a torcida. O histórico de vida do jogador modula a intensidade (ex.: jogador de infância difícil que compra casa para a mãe ganha moral e foco; jogador criado sem pai e com moral instável sente mais uma crítica pública; jogador muito ambicioso pode querer sair após uma boa temporada).

### 6.6. Mercado da bola

O fim de temporada recalcula valor e interesse nos jogadores.

```
TransferMarketUpdate {
  playerId
  oldMarketValue
  newMarketValue
  interestedClubs
  agentPressure
  playerDesire
  contractSituation
}
```

Fatores: desempenho, idade, potencial, títulos, convocações, gols/assistências, nível do campeonato, personalidade, contrato perto do fim, clube em crise, relação com técnico e salário. Isso cria profundidade sem escrever histórias manualmente (ex.: boa Libertadores → clubes europeus observam → empresário quer transferência → jogador dividido pela ligação com o clube).

---

## 7. Sistema de premiações

No fim da temporada são gerados prêmios. Eles **afetam reputação e mercado** e encaixam no sistema psicológico (ex.: eleito "revelação" ganha confiança, mas passa a sofrer mais pressão).

Prêmios previstos:

- Melhor jogador do campeonato
- Craque da torcida
- Artilheiro
- Garçom (líder de assistências)
- Revelação
- Melhor goleiro
- Melhor zagueiro
- Melhor técnico
- Seleção do campeonato
- Jogador mais evoluído
- Jogador decepção

> **Recomendação (a ratificar — R-61):** separar os prêmios em **objetivos** (contagem direta: artilheiro = mais gols; garçom = mais assistências; melhor goleiro por saldo de gols sofridos/defesas) e **subjetivos** (melhor jogador, revelação, seleção do campeonato, jogador mais evoluído, decepção), estes eleitos por `AwardScore = 0,5·médiaDeNotas (F15) + 0,3·contribuição para títulos/campanha + 0,2·impacto de reputação`, filtrado por elegibilidade (revelação: idade ≤ 21; decepção: alta expectativa/valor vs. baixo `AwardScore`). **Magnitude do efeito:** cada prêmio aplica `+reputationGain` e `marketValueMultiplier` proporcionais ao peso da competição (R-59) — 1ª passada: prêmio principal ×1,10 no valor de mercado e `+8` de reputação; secundários ×1,05 e `+4`; "decepção" inverte o sinal. Racional: dá regra auditável reutilizando a nota de partida (F15) e os pesos de campeonato (R-59); os coeficientes são de balanceamento e ficam para [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

---

## 8. Histórico permanente

Tudo que é importante deve ser salvo. O histórico é o que "dá alma" ao jogo, permitindo contar histórias depois (ex.: *"revelado em 2027, campeão nacional em 2029, vendido para a Europa em 2030, voltou ao clube em 2036"*).

```
PlayerHistory {
  season
  club
  competitions
  matches
  goals
  assists
  averageRating
  titles
  awards
  injuries
  majorEvents
}

ClubHistory {
  season
  leaguePosition
  titles
  relegated
  promoted
  topScorer
  bestPlayer
  financialResult
}

ChampionshipHistory {
  season
  champion
  runnerUp
  topScorer
  bestPlayer
  table
}
```

---

## 9. Promoção, rebaixamento e reputação dos clubes

No fim da temporada, clubes mudam de status. Isso é essencial para o mundo não ficar estático.

```
ClubSeasonUpdate {
  reputationChange
  budgetChange
  fanBaseChange
  boardExpectationChange
  squadMoraleChange
  sponsorChange
}
```

| Evento | Efeito |
| --- | --- |
| Subiu de divisão | Aumenta orçamento e reputação |
| Caiu de divisão | Perde jogadores e receita |
| Ganhou título | Atrai patrocínio |
| Fez campanha ruim | Reduz moral e verba |
| Revelou jogador vendido caro | Melhora finanças |
| Teve crise salarial | Jogadores querem sair |

---

## 10. Aposentadorias e reaproveitamento de personagens

No fim da temporada, jogadores mais velhos decidem o futuro.

```
RetirementDecision {
  playerId
  age
  physicalCondition
  motivation
  contractStatus
  familySituation
  clubRole
  reputation
}
```

Resultados possíveis: aposenta, renova por mais um ano, aceita reduzir salário, vai para clube menor, vira auxiliar técnico, vira olheiro, vira empresário, sai do futebol.

Isso permite **reaproveitar personagens**: um ex-jogador pode virar técnico, auxiliar ou olheiro, mantendo o mundo vivo.

---

## 11. Nova temporada: objetivos e narrativa

Depois do fechamento, a nova temporada começa **com contexto** — um briefing gerado a partir do que aconteceu.

```
SeasonOpeningContext {
  clubExpectations
  fanExpectations
  financialSituation
  keyPlayers
  transferNeeds
  youthPromotions
  riskFactors
}
```

Exemplo de briefing: *"O clube terminou em 8º. A diretoria espera classificação continental. A torcida quer pelo menos vencer o rival. O orçamento aumentou 12%. Dois jogadores querem sair. Três jovens subiram da base."*

---

## 12. Exemplos práticos

O **mesmo sistema** gera histórias totalmente diferentes conforme o desfecho da temporada.

### Clube em ascensão

- **Clube:** Atlético Ribeirão · **Resultado:** 6º lugar na Série A · Copa nacional: semifinal · Libertadores: não disputou · Financeiro: positivo · Torcida: satisfeita · Diretoria: muito satisfeita.
- **Consequências:** orçamento aumenta; técnico ganha reputação; artilheiro recebe propostas; zagueiro veterano pensa em aposentar; meia jovem vira promessa nacional; torcida espera vaga na Libertadores; diretoria aumenta a meta; reservas querem mais minutos.

### Clube em crise

- **Clube:** Nacional FC · **Resultado:** rebaixado · Financeiro: negativo · Torcida: revoltada · Diretoria: pressionada.
- **Consequências:** corte de salários; jogadores pedem saída; patrocínio reduz; técnico pode ser demitido; jovens ganham espaço por necessidade; torcida protesta; alguns jogadores ficam mais fortes mentalmente, outros desmoronam emocionalmente.

---

## 13. Equilíbrio competitivo para clubes novos

Num mundo persistente, clubes de temporadas diferentes convivem na mesma competição. Para que um clube forte não esmague uma divisão pequena e para que o clube novo sinta progresso mesmo longe do topo global, a temporada aplica três ajustes: **teto por divisão**, **objetivos calibrados por estágio do clube** e **copas com chance de zebra**. A moldura de divisões por nível estrutural do clube está em [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md).

### 13.1 Teto por divisão

Cada divisão tem um **limite natural de força**, para impedir que um clube muito forte fique esmagando divisões pequenas. Exemplo:

| Divisão | Limites |
| --- | --- |
| Liga Inicial | limite de folha salarial, limite de overall médio, limite de estrangeiros, limite de reputação, estrutura máxima recomendada, premiação menor |
| Liga Intermediária | limites maiores |
| Elite | sem grandes limites |

Se um clube passa do teto da sua divisão, ele é **obrigado a subir** (ou a competir numa liga superior) — não pode continuar dominando uma camada que já superou.

> **Recomendação (a ratificar — R-62):** expressar cada teto de divisão como **múltiplo da linha-base da divisão** (não valores absolutos, para escalar entre mundos). Proposta de 1ª passada: Liga Inicial → folha ≤ 1,0× base, overall médio ≤ 62, ≤ 3 estrangeiros, reputação ≤ 40, estrutura ≤ nível 2, premiação 1,0× base; Liga Intermediária → folha ≤ 3,0×, overall ≤ 74, ≤ 5 estrangeiros, reputação ≤ 70, estrutura ≤ nível 4, premiação ~3×; Elite → sem teto de força, premiação ~8×. Gatilho de "obrigado a subir": clube que excede **2 dos tetos** por 2 temporadas seguidas. Racional: múltiplos preservam o equilíbrio quando o valor absoluto do dinheiro varia por mundo; os números são de balanceamento e devem ser calibrados em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md). Os limites de estrangeiros aqui herdam a cota geral de **R-63** (§15.2).

### 13.2 Objetivos diferentes por estágio do clube

Um clube novo não deve ter o mesmo objetivo de um clube grande — assim o usuário novo sente sucesso mesmo sem estar no topo global. A diretoria calibra as metas conforme o estágio do clube:

| Estágio | Objetivos da temporada |
| --- | --- |
| Clube novo | reduzir a idade média do elenco; subir de divisão; revelar 2 jovens; melhorar a base para o nível 2; equilibrar as finanças |
| Clube médio | brigar por acesso; manter os bons jogadores; melhorar o estádio; chegar à semifinal da copa |
| Clube grande | ganhar título; manter as estrelas; disputar competições maiores; sustentar a alta folha salarial |

Essa matriz complementa a **avaliação da diretoria** (seção 6.2) e o **briefing de nova temporada** (seção 11): as expectativas registradas em `BoardEvaluation` e `SeasonOpeningContext` passam a depender do estágio do clube, não de uma meta única para todos.

### 13.3 Copas com chance de zebra

Além das ligas por nível, existe **copa aberta a todos os clubes** — mas com formato que permite a zebra, dando ao clube pequeno um momento especial contra um grande. O formato favorece a surpresa:

- **jogo único** nas primeiras fases;
- **mando de campo ao clube de menor porte** (o menor joga em casa);
- **premiação boa por fase** (`prizeRules: "per_round"`);
- **chance de exposição** para o clube pequeno.

O clube menor provavelmente não vence sempre, mas pode surpreender — e ganhar reputação, torcida e receita ao avançar. Isso especializa o formato de copa nacional eliminatória já descrito na [seção 2](#2-campeonatos-como-entidades-independentes) para o cenário de portes desiguais.

---

## 14. Homologação e transição entre temporadas

O motor de virada (seção 6) descreve **o que** o mundo recalcula ao virar. Esta seção detalha as **nuances de encerramento**: uma competição pode acabar antes da temporada administrativa, e a temporada só fecha quando todos os processos obrigatórios estão prontos. Enquanto isso, o registro histórico distingue o que já é oficial do que ainda é provisório.

### 14.1 Homologação de competições

Uma competição só é **homologada** quando um conjunto de condições está satisfeito:

- partidas obrigatórias concluídas;
- resultados pendentes resolvidos;
- recursos relevantes tratados;
- punições aplicadas;
- critérios de desempate calculados;
- classificação consistente.

A posição esportiva final (inclusive **acessos e rebaixamentos**) pode ainda depender de **licença, recursos e decisões administrativas** antes da confirmação — ver [seção 15](#15-licenciamento-e-inscrição-de-jogadores) e o encerramento esportivo da [seção 6](#6-fim-de-temporada-o-motor-de-virada-checklist-de-20-passos). A temporada só é concluída depois de todas as competições relevantes estarem homologadas.

### 14.2 Título provisório vs. oficial

O jogo pode **celebrar um campeão em campo** (título provisório), mas o **registro histórico oficial aguarda a homologação**. Enquanto a competição não é homologada, uma **correção** pode alterar tabela, prêmio e classificação livremente.

Depois da homologação, mudar um resultado é **excepcional** e obedece a um rito:

- reabrir formalmente o processo necessário;
- criar uma **nova versão** do registro;
- **preservar a versão anterior** (a memória do mundo não é apagada);
- recalcular as consequências;
- comunicar os afetados.

Essa separação entre **fato provisório** e **fato oficial** é o que permite exibir o troféu no gramado sem comprometer a integridade do histórico permanente (seção 8).

### 14.3 Prêmios individuais da temporada

Além dos prêmios de campeonato já catalogados na [seção 7](#7-sistema-de-premiações), o fechamento da temporada consolida distinções em nível de temporada. O conjunto de referência inclui: **campeão e vice, artilheiro, líder de assistências, melhor jogador, melhor goleiro, melhor jovem, melhor técnico, seleção da temporada e fair play**.

- Prêmios **objetivos** (artilheiro, líder de assistências) seguem contagem direta.
- Prêmios **subjetivos** (melhor jogador, melhor jovem, seleção da temporada) têm critérios próprios de eleição.
- O **fair play** e a **seleção da temporada** são distinções de temporada que complementam — sem substituir — os prêmios por campeonato da seção 7.

Os critérios de eleição destes prêmios de temporada seguem o mesmo modelo objetivo/subjetivo proposto para os prêmios de campeonato em **R-61** ([seção 7](#7-sistema-de-premiações)), aplicado agora à temporada inteira: **melhor jovem** = maior `AwardScore` entre elegíveis por idade; **seleção da temporada** = maior `AwardScore` por posição; **fair play** = prêmio objetivo pelo menor índice disciplinar (cartões ponderados) do clube/jogador na temporada. A magnitude do efeito em reputação/mercado também segue R-61, com **peso de temporada ligeiramente acima** do prêmio equivalente de um único campeonato.

### 14.4 Premiações financeiras

A premiação de uma competição **não** é sempre um pagamento único e imediato. O fechamento pode gerar:

- **recebimentos imediatos**;
- **parcelas** (valores distribuídos ao longo do tempo);
- **valores retidos** (liberados sob condição);
- **compensações de dívida** (abatidos de pendências do clube);
- **bônus contratuais** disparados pela campanha.

Isso conecta o resultado esportivo ao orçamento da temporada seguinte, que considera divisão, competições, receita prevista, contratos, folha, dívidas, obras, reservas e cenários de acesso ou rebaixamento.

### 14.5 Transição contratual escalonada

A virada de temporada processa **expirações, renovações, opções, gatilhos, aumentos, reduções, retornos de empréstimo e transferências futuras**. Ponto central: **a virada da temporada não encerra todos os contratos na mesma data**. Cada vínculo vira no seu próprio marco (data de expiração, gatilho por desempenho, janela de opção), de modo que a transição contratual é um processo escalonado, não um evento único. Ver o passo *Atualizar contratos* na [seção 6](#6-fim-de-temporada-o-motor-de-virada-checklist-de-20-passos).

### 14.6 Ausência do usuário durante a transição

Se o usuário está ausente durante a transição, a **inteligência do clube** pode processar efeitos automáticos, mas com **limites de autoridade**: não deve assumir grandes dívidas, vender jogadores-chave nem alterar a identidade do clube sem autoridade. A transição roda de forma segura na ausência, preservando as decisões estruturais para quando o usuário retornar.

> **Nota de ligação:** o comportamento do clube offline em partidas (escalação automática, plano offline) é tratado em [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md). Aqui trata-se apenas do processamento automático **na virada de temporada**.

---

## 15. Licenciamento e inscrição de jogadores

Duas travas administrativas condicionam a participação competitiva: o **licenciamento** (o clube está apto a disputar a competição?) e a **inscrição** (este jogador está apto a atuar por este clube nesta competição?). Ambas rodam **entre temporadas** e nas **janelas** definidas pelo calendário (seção 4), e alimentam a validação de escalação antes de cada partida.

### 15.1 Licenciamento competitivo

Divisões e competições podem exigir **padrões mínimos** do clube para conceder a licença de participação:

- **estádio** (o licenciamento de estádio em si está detalhado em [`./08-estadio-regiao-e-clima.md`](./08-estadio-regiao-e-clima.md));
- **segurança**;
- **situação financeira**;
- **elenco**;
- **estrutura médica**;
- **base**;
- **ausência de atrasos graves**;
- **conformidade administrativa**.

O descumprimento normalmente gera, em ordem de severidade:

| Consequência | Quando se aplica |
| --- | --- |
| **Plano de adequação** | Descumprimento tratável dentro de um prazo |
| **Restrições** | Limitações competitivas ou de mercado enquanto pendente |
| **Multas** | Sanção financeira pelo descumprimento |
| **Impedimento de acesso / rebaixamento administrativo** | Medidas **extremas**, reservadas a casos graves |

Por isso a confirmação de **acesso e rebaixamento** (seção 14.1) pode depender da licença, e não só da posição na tabela: um clube pode conquistar a vaga no campo e ainda assim não ser confirmado se não atender aos padrões mínimos da divisão de destino.

### 15.2 Inscrição e elegibilidade por competição

Cada competição possui **regras próprias de inscrição**, expressas nos campos `squadRegistrationLimit`, `foreignPlayerLimit` e `ageLimit` de `ChampionshipRules` (seção 2). O regulamento define:

- **lista principal** de inscritos (com tratamento próprio para goleiros e categorias);
- **limites regionais ou de estrangeiros**;
- **jovens formados no clube** — podem ter regras especiais, desde que o regulamento estabeleça **idade, quantidade e elegibilidade**;
- **períodos de alteração** da lista (fora deles, a lista fica congelada).

Princípio central: **contratar um jogador não garante que ele esteja imediatamente apto a atuar.** Uma contratação concluída fora do prazo pode deixar o jogador **sem inscrição até a próxima janela**. Um jogador não pode pertencer a dois clubes nem participar de dois estados oficiais conflitantes.

A elegibilidade é validada e **congelada** na preparação pré-jogo. O sistema **impede** de entrar em campo:

- jogador suspenso;
- atleta não inscrito;
- contrato inativo;
- jogador já transferido;
- limite de estrangeiros ultrapassado;
- jogador inelegível pela categoria;
- número insuficiente de atletas;
- ausência de goleiro quando houver alternativa válida.

Se houver problema, o sistema tenta escalação automática e alternativas **antes** de declarar W.O. — o clube precisa manter um **elenco mínimo** apto e inscrito.

> **Recomendação (a ratificar — R-63):** fixar os limites de inscrição por competição. Proposta de 1ª passada: `squadRegistrationLimit` = 26 (lista principal), com goleiros/base em cota própria; `foreignPlayerLimit` = 5 estrangeiros inscritos por partida (7 no elenco) na elite, mais restritivo nas divisões inferiores (herdado por R-62); `ageLimit` só em competições de base; cota de **jovens formados no clube** = mínimo de 2 na lista principal. A **nacionalidade** que alimenta `foreignPlayerLimit` é a `primaryNationality` do jogador (modelo em [`./12-selecoes-e-calendario-internacional.md`](./12-selecoes-e-calendario-internacional.md) §1). Racional: números plausíveis e implementáveis que dão contorno à validação de escalação (§15.2) sem congelar o balanceamento; valores finais e variação por mundo/divisão a calibrar em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

---

> **Ponto central:** no **Grinta**, o fim de temporada é o **julgamento e a transformação do mundo** — o mundo reage ao que aconteceu, e cada jogador, clube e temporada carrega história própria. É isso que dá a simplicidade de avanço de um manager clássico com muito mais profundidade.
