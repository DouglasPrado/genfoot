# Arquitetura Multiplayer e Mundos

> **Status:** Rascunho consolidado · **Fontes:** chats/campeonatos-fim-de-temporadas.md · **Revisão:** 2026-07-10

Este documento consolida a arquitetura online do **Grinta**: como o jogo organiza mundos persistentes, distribui clubes entre humanos e IA, resolve o problema da assincronia entre jogadores por meio de rodadas com prazo, dimensiona divisões pela quantidade de usuários e opera o mercado de transferências online. O modelo-base é **online assíncrono**: ninguém precisa estar conectado ao mesmo tempo, e o campeonato avança sozinho em horários fixos.

## Sumário

1. [Mundos e servidores](#1-mundos-e-servidores)
2. [Clubes: humanos vs. IA](#2-clubes-humanos-vs-ia)
3. [O problema da assincronia](#3-o-problema-da-assincronia)
4. [Rodadas com prazo](#4-rodadas-com-prazo)
5. [Fluxo de rodada em ~10 passos](#5-fluxo-de-rodada-em-10-passos)
6. [Formatos de liga e competição](#6-formatos-de-liga-e-competição)
7. [Divisões dimensionadas por usuários](#7-divisões-dimensionadas-por-usuários)
8. [Quando o usuário não escala](#8-quando-o-usuário-não-escala)
9. [Mercado de transferências online](#9-mercado-de-transferências-online)
10. [Auditoria da partida online](#10-auditoria-da-partida-online)

---

## 1. Mundos e servidores

O Grinta é organizado em **mundos** (servidores) independentes. Cada mundo tem seus próprios clubes, jogadores, campeonatos, calendário e temporadas, sem qualquer compartilhamento com outros mundos.

Exemplos de mundos:

- Brasil 2027
- Europa 2027
- América do Sul 2027
- Liga Global
- Mundo privado só para amigos

Isso permite que coexistam realidades muito diferentes: um mundo com 20 usuários, outro com 200, um com clubes fictícios, outro com clubes inspirados em reais (mas com nomes próprios), outro fechado para um grupo.

Estrutura conceitual do mundo:

```
GameWorld {
  id
  name
  currentSeason
  currentDate
  status: "preseason" | "running" | "season_end"
  speed
  clubs
  championships
}
```

O mundo controla a **data corrente** e o ritmo (`speed`). O tempo é **acelerado**, não em tempo real: a recomendação é que uma temporada inteira dure 45 dias reais. Um mundo em que uma temporada durasse um ano real seria lento demais.

> Ciclo de temporada, competições e transição de fim de temporada: ver [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md).

---

## 2. Clubes: humanos vs. IA

Cada clube do mundo tem um **tipo de comando**: humano ou bot (IA). Um clube pode alternar entre os dois ao longo do tempo, sem quebrar o campeonato.

```
Club {
  id
  name
  country
  division
  reputation
  budget
  squad
  managerType: "human" | "bot"
  userId?: string
}
```

O vínculo entre usuário e clube é registrado à parte:

```
UserClub {
  userId
  clubId
  role: "manager" | "president" | "admin"
  joinedAt
  lastActiveAt
}
```

### Estados de comando

| Estado do usuário | O que acontece com o clube |
| --- | --- |
| Ativo | Controla escalação, treino, mercado e decisões |
| Inativo (temporário) | IA assume as decisões básicas |
| Saiu / liberado | Clube volta para a fila de seleção de novos usuários |

**Os bots são obrigatórios.** Sem eles o mundo trava por falta de gente. Um bot precisa, no mínimo: escalar um time válido, renovar contratos importantes, comprar/vender com lógica, treinar o elenco, evitar a falência e usar jovens quando necessário.

Bots podem ter **identidade** própria, o que deixa o mundo mais vivo:

- Bot conservador
- Bot vendedor (clube pequeno formador que vende promessas cedo)
- Bot formador (aposta em jovens)
- Bot agressivo no mercado (clube rico que compra jogador pronto)
- Bot que contrata veteranos
- Clube endividado que aceita propostas menores

### Entrada de usuários

Há dois caminhos de entrada, e o Grinta deve suportar ambos:

- **No início da temporada** — melhor para assumir clubes importantes. No fim de cada temporada, clubes sem dono ficam disponíveis; usuários se candidatam e o sistema aprova por ordem, reputação ou ranking.
- **No meio da temporada** — mantém o jogo sempre vivo. O usuário assume um clube bot a qualquer momento, mas **pega a situação atual**: não reseta elenco, finanças nem tabela. Isso gera histórias interessantes.

---

## 3. O problema da assincronia

O ponto mais crítico de um jogo online de clubes: **nem todo mundo joga ao mesmo tempo**. Fusos horários, rotinas e disponibilidade variam. Se a partida dependesse de os dois técnicos estarem online juntos, o campeonato travaria.

Dois modelos foram considerados:

### Modelo A — Rodadas com horário fixo (recomendado)

A rodada acontece num horário pré-definido; até o prazo, os usuários ajustam o time; no horário, o sistema simula todos os jogos em lote.

Vantagens:

- Não exige os dois usuários online ao mesmo tempo.
- O campeonato anda sozinho — sensação de mundo vivo.
- Permite notificações.
- Funciona bem em mobile/web.

### Modelo B — Partida só quando os dois estão prontos (não recomendado como base)

Os dois técnicos precisam clicar em "pronto" e a partida é simulada na hora. Problemas: campeonatos travam, usuários somem, uma pessoa segura a liga inteira, e exige prazo e punição de qualquer forma.

**Uso limitado:** o Modelo B pode existir apenas para amistosos, torneios rápidos ou mata-mata entre amigos.

### Recomendação

- **Campeonatos principais:** rodadas automáticas em horário fixo (Modelo A).
- **Amistosos / copas rápidas:** jogadores podem iniciar manualmente (Modelo B).

---

## 4. Rodadas com prazo

A solução para a assincronia é a **rodada com prazo**, um ciclo de quatro fases:

1. **Janela de preparação** — o sistema abre a rodada e os usuários ajustam escalação, tática e treino.
2. **Prazo fecha** — chega o horário-limite; o sistema bloqueia alterações.
3. **Simulação em lote** — todos os jogos da rodada são simulados de uma vez.
4. **Publicação** — resultados, tabela e eventos pós-jogo são divulgados; a próxima rodada abre.

Exemplo de regra concreta: usuários têm até **19h59** para ajustar a escalação; às **20h** o sistema simula todos os jogos.

O calendário precisa ser **fixo e previsível**. Ritmo recomendado para começar: 1 temporada = 45 dias reais, com rodadas principais em dias definidos da semana e o mercado aberto todos os dias, fechando antes dos jogos.

Exemplo de semana:

| Dia | Atividade |
| --- | --- |
| Segunda 20h | Liga |
| Terça | Treino, mercado, eventos |
| Quarta 20h | Liga |
| Quinta 20h | Copa |
| Sexta 20h | Liga |
| Sábado | Amistosos, base, mercado |
| Domingo 20h | Liga ou continental |

> Como o técnico intervém durante a partida (online e offline) e o papel do plano de jogo: ver [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md).

---

## 5. Fluxo de rodada em ~10 passos

O ciclo completo de uma rodada:

1. Sistema abre a preparação da rodada.
2. Usuários ajustam escalação, tática e treino.
3. Prazo fecha.
4. Sistema bloqueia alterações.
5. Jogos são simulados.
6. Resultado é publicado.
7. Tabela é atualizada.
8. Jogadores evoluem, cansam ou se lesionam.
9. Eventos pós-jogo são gerados (notícias, moral, histórias).
10. Próxima rodada abre.

Em lógica de código:

```
runMatchday(matchdayId) {
  lockLineups()
  for each match in matchday:
    simulateMatch(match)
    updatePlayers(match)
    updateClubMorale(match)
    updateCompetitionTable(match)
  generateNews()
  unlockNextMatchday()
}
```

O `lockLineups()` no passo 3/4 é o que garante que o prazo é respeitado antes de a simulação começar.

---

## 6. Formatos de liga e competição

Um **Competition Manager** decide, para cada campeonato: quantos clubes participam, o formato, o calendário, os critérios de desempate, a premiação, o rebaixamento, o acesso e a classificação para outros torneios.

```
Competition {
  id
  worldId
  seasonId
  name
  type: "league" | "cup" | "groups_knockout"
  status: "scheduled" | "running" | "finished"
  clubs
  rules
  rounds
}
```

### Liga de pontos corridos

Boa para campeonato nacional. Exemplo: 20 clubes, turno e returno (38 rodadas), 3 pontos por vitória e 1 por empate, 4 rebaixados, 6 classificados para o continental.

```
LeagueRules {
  clubs: 20
  rounds: 38
  legs: 2
  relegationSlots: 4
  promotionSlots: 4
  continentalSlots: 6
}
```

### Copa mata-mata

Boa para copa nacional. Exemplo: 32 clubes, jogo único ou ida e volta, empate decidido nos pênaltis, premiação por fase.

```
CupRules {
  clubs: 32
  legs: 1
  extraTime: false
  penalties: true
}
```

### Grupos + mata-mata

Boa para competições continentais ou globais. Exemplo: 32 clubes, 8 grupos de 4, 2 classificados por grupo, seguido de oitavas, quartas, semifinal e final.

```
GroupKnockoutRules {
  groups: 8
  clubsPerGroup: 4
  qualifiedPerGroup: 2
  knockoutLegs: 2
  finalLegs: 1
}
```

### Campeonatos oficiais e privados

Os campeonatos existem em dois níveis:

- **Oficiais** — criados pelo sistema (Liga Nacional, Copa Nacional, Continental, Mundial, Supercopa). Valem reputação, dinheiro e ranking.
- **Privados** — criados por usuários (liga entre amigos, copa relâmpago, torneio de pré-temporada, amistosos organizados). Têm impacto oficial menor ou nenhum.

```
CustomTournament {
  creatorUserId
  name
  invitedClubs
  format
  startDate
  prize
  reputationImpact: "none" | "low"
}
```

Para não bagunçar o calendário oficial, um campeonato privado **não pode conflitar com jogo oficial**: ou usa time reserva, ou só acontece em datas livres.

---

## 7. Divisões dimensionadas por usuários

Princípio central: **o mundo não depende de todos os clubes terem donos humanos.** O sistema mistura humanos e bots em cada divisão, e a proporção evolui conforme mais usuários entram.

Exemplo de composição inicial:

| Divisão | Clubes | Humanos | Bots |
| --- | --- | --- | --- |
| Série A | 20 | 8 | 12 |
| Série B | 20 | 3 | 17 |

Com o tempo, mais usuários entram, mais clubes bots viram humanos e o mundo fica mais competitivo. **Se o jogo dependesse de todos os clubes terem humanos, travaria no começo.**

### Sistema de divisões

O modelo usa divisões hierárquicas (Divisão 1, 2, 3, 4...), cada uma com clubes humanos e bots. No fim da temporada:

- Os 4 últimos de cada divisão caem.
- Os 4 primeiros da divisão de baixo sobem.
- Clubes classificados entram em copas.
- Clubes campeões ganham reputação.

Isso cria objetivo para todos — não só para quem briga por título, mas também para quem foge do rebaixamento ou busca o acesso.

### Modelo recomendado para começar

- 1 mundo, 40 clubes, 2 divisões de 20 clubes.
- Liga de pontos corridos (38 rodadas, 4 rebaixados / 4 promovidos).
- Copa nacional em mata-mata (40 clubes, jogos às quintas).
- Bots preenchendo as vagas sem dono.
- Temporada de 45 dias, com rodadas 4 vezes por semana.

Expansões posteriores: Divisão C, competição continental, mundial, categorias de base, seleções e torneios privados.

> **Pendência:** a fonte não especifica as **faixas exatas de número de usuários** que disparam a criação de uma nova divisão nem o momento em que um clube bot é convertido em vaga humana (regra de conversão automática vs. manual). Definir os limiares de dimensionamento.

---

## 8. Quando o usuário não escala

O usuário **nunca é demitido** por desempenho; o time simplesmente joga com um fallback quando ele não escala. A prioridade é proteger o campeonato de time sem jogar ou de escalações inválidas.

Escada de inatividade recomendada:

| Rodada ausente | Ação do sistema |
| --- | --- |
| 1ª ausência | Usa a última escalação |
| 2ª ausência | IA corrige lesões e suspensões (escalação válida) |
| 3ª ausência seguida | Alerta ao usuário |
| 5ª ausência seguida | Clube pode ser liberado para outro usuário |

```
ManagerInactivityRule {
  useLastLineup: true
  autoFixInvalidLineup: true
  warningAfterMissedRounds: 3
  releaseClubAfterMissedRounds: 5
}
```

Pontos-chave:

- Enquanto ausente, o clube joga com a **última escalação**; a IA só intervém para manter a escalação **válida** (remover lesionados/suspensos).
- A liberação do clube após 5 ausências seguidas é o único momento em que o usuário perde o comando — e ainda assim é por ausência prolongada, não por resultado.
- O usuário gerencia entre rodadas; ele não joga a partida manualmente. Definir tática, treinar, negociar, conversar com jogadores e planejar a próxima rodada são as atividades do dia a dia.

> **Pendência:** a "penalidade leve" por não escalar é citada como opção na fonte, mas não há definição de qual penalidade se aplica nem em que rodada. Decidir se haverá penalidade além do simples uso da última escalação.

---

## 9. Mercado de transferências online

O mercado online exige cuidado para não virar bagunça. Há **três tipos de negociação**:

1. **Jogador livre** — o usuário faz proposta; o jogador avalia salário, clube, divisão, reputação e projeto.
2. **Compra de jogador de clube bot** — o sistema avalia a proposta; o clube bot aceita, recusa ou negocia.
3. **Compra entre usuários** — o usuário A propõe; o usuário B aceita, recusa ou contrapropõe; e o **jogador ainda precisa aceitar o contrato**.

Fluxo geral:

1. Clube comprador envia proposta.
2. Clube vendedor responde.
3. Jogador / empresário avalia.
4. Transferência fica pendente.
5. Janela precisa estar aberta.
6. Sistema confirma.

### Jogadores têm vontade própria

Mesmo em negociação entre usuários, **o jogador não é um objeto morto**. Sendo único, ele tem vontade própria e pode romper o acordo:

- O clube aceitou vender, mas o jogador recusou por não querer disputar divisão inferior.
- O jogador quer sair porque perdeu espaço e tem relação ruim com o técnico.

### Leilão

Para jogadores muito disputados, o leilão pode ser melhor que a negociação direta: o jogador é listado, os clubes interessados fazem propostas até um prazo, e o jogador **escolhe o melhor projeto — não necessariamente o maior salário**. Critérios considerados: salário, luvas, divisão, reputação do clube, chance de ser titular, relação com o técnico, distância da família, ambição e personalidade.

### Proteção contra abuso

O mercado entre usuários precisa de validação anti-abuso: impedir vendas por valores absurdos entre amigos, bloquear transferência fácil de dinheiro entre clubes, aplicar valores mínimo e máximo de mercado, auditar transferências suspeitas, impedir múltiplas contas controlando clubes relacionados e limitar empréstimos e rescisões em massa.

```
TransferValidation {
  minAllowedValue
  maxAllowedValue
  suspiciousTransferScore
  sameIpCheck
  repeatedTradeCheck
  newAccountRestriction
}
```

Transferências suspeitas ficam em análise automática, podem ser bloqueadas pelo sistema e revisadas por um admin.

> Regras completas de anti-abuso, multicontas e onboarding: ver [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md).

---

## 10. Auditoria da partida online

Como o jogo é online, o usuário precisa **confiar que o resultado não foi "roubado"**. Antes de cada partida, o sistema salva um snapshot do estado, e a simulação roda sobre ele:

```
MatchSnapshot {
  matchId
  homeClubState
  awayClubState
  lineups
  tactics
  playerMorale
  fatigue
  injuries
  randomSeed
}
```

Com o `randomSeed` fixado e o estado congelado, a partida é **determinística e auditável**: se alguém reclamar, é possível reconstruir o resultado e mostrar que ele veio da escalação, dos atributos, da tática, da moral, da fadiga e da seed — e não de manipulação.

> O funcionamento interno do motor de partida está detalhado em [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md).

---

## Modelo online consolidado

O modelo recomendado para o Grinta reúne:

- Online assíncrono, com mundos persistentes.
- Clubes humanos + bots na mesma competição.
- Rodadas automáticas em horários fixos.
- Temporadas de 45 dias.
- Campeonatos oficiais criados pelo sistema; torneios privados criados por usuários.
- Mercado entre usuários com regras anti-abuso.
- Jogadores únicos com vontade própria.
- Fim de temporada transformando o mundo.

Esse conjunto une a simplicidade do estilo Brasfoot, a profundidade de um manager tático, a competição online e um mundo vivo com jogadores únicos — sem travar por ausência de jogadores.
